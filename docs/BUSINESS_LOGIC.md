# Lógica de Negocio — GutDoc Admin

Este documento describe las reglas automáticas que el sistema ejecuta sin intervención manual. Cada regla está implementada en `apps-script/Logic.gs`.

---

## 1. Activación automática de ciclo

**Disparador:** `Pago.confirmado_por_finanzas = TRUE` AND `Pago.dispara_activacion_programa = TRUE`

**Acciones automáticas:**
1. Crear registro en `10_Ciclos_Paciente` con estado = `activo`, `fecha_inicio_ciclo` = hoy.
2. Crear registros en `11_Componentes_Paciente` según el paquete elegido (completo / individual / personalizado).
3. Generar **todas** las tareas del protocolo en `13_Tareas_Paciente` con sus fechas calculadas (ver regla 3).
4. Crear las tareas protocolizadas adicionales:
   - Foto Inicial → fecha = primer día
   - Foto Resultados → fecha = último día del ciclo
5. Generar el calendario de mensajes educativos en `26_Cola_Mensajes` con sus fechas de envío sugerido.
6. Asignar Program Specialist según disponibilidad o configuración del programa.
7. Notificar al paciente vía WhatsApp con mensaje de bienvenida (en cola manual).

```javascript
// Logic.gs
function activateCycle(pagoRow) {
  const programa = Sheets.findOne('04_Programas', { id_programa: pagoRow.id_programa });
  const ciclo = Sheets.insert('10_Ciclos_Paciente', {
    id_paciente: pagoRow.id_paciente,
    id_programa: pagoRow.id_programa,
    fecha_inicio_ciclo: new Date(),
    estado_ciclo: 'activo',
    ronda_numero: getNextRoundNumber(pagoRow.id_paciente),
    program_specialist_asignado: assignProgramSpecialist()
  });

  generateComponents(ciclo, programa);
  generateTasks(ciclo, programa);
  generatePhotoTasks(ciclo);
  generateMessageQueue(ciclo, programa);
  enqueueWelcomeMessage(ciclo);

  Logs.audit('cycle_activated', ciclo.id_ciclo, Session.getActiveUser().getEmail());
}
```

---

## 2. Generación de tareas desde protocolo

**Disparador:** Activación del ciclo (regla 1).

**Lógica:**
- Lee el protocolo del programa en `12_Protocolo_Tareas` (ej: para GLP-1 10 sem, hay ~30 tareas predefinidas).
- Cada tarea tiene `dias_desde_inicio` (ej: aplicación 1 → día 0, aplicación 2 → día 7, etc.).
- Calcula la fecha de cada tarea como `fecha_inicio_ciclo + dias_desde_inicio`.
- Crea registros en `13_Tareas_Paciente`.

---

## 3. Cálculo de Consulta de Resultados

**Regla crítica:** `fecha_consulta_resultados = fecha_ultima_aplicacion + 7 días`

```javascript
// Logic.gs
function calculateConsultaResultados(idCiclo) {
  const aplicaciones = Sheets.findAll('13_Tareas_Paciente', {
    id_ciclo: idCiclo,
    tipo_hito: 'aplicacion',
    estado_tarea: ['programada', 'completada']
  });

  if (aplicaciones.length === 0) return null;

  const fechaUltima = aplicaciones
    .map(a => new Date(a.fecha_programada))
    .reduce((max, d) => d > max ? d : max, new Date(0));

  const fechaConsulta = new Date(fechaUltima);
  fechaConsulta.setDate(fechaConsulta.getDate() + 7);

  return fechaConsulta;
}
```

**Recálculo automático:** Si una aplicación se reprograma (vía `16_Reprogramaciones`), el sistema:
1. Detecta el cambio (trigger en `Sheets.update`).
2. Recalcula la fecha de la última aplicación.
3. Actualiza la tarea de Consulta de Resultados con la nueva fecha.
4. Notifica al paciente del nuevo agendamiento (cola de mensajes).

---

## 4. Cierre de ciclo y decisión post-programa

**Disparador:** Usuario (médico o admin) confirma cierre desde la UI.

**Pre-condiciones:**
- Todas las tareas obligatorias del ciclo deben estar en estado `completada`, `no_aplica` o `desistida_paciente`.
- El médico debe seleccionar una de las 11 decisiones del ENUM en `14_Decisiones_Post_Programa`.

**Acciones según la decisión:**

| Decisión | Acciones automáticas |
|---|---|
| `continuar_microdosificacion` | Crear nuevo ciclo de Microdosificación (Tipo A o B) en estado `pendiente_inicio`. |
| `iniciar_nuevo_programa_completo` | Crear Solicitud de Programa nueva en `18_Solicitudes_Medicas` → embudo comercial. |
| `volver_escalar_dosis` | Reabrir ciclo en estado `escalando_dosis`, regenerar tareas siguientes. |
| `cambiar_estrategia_terapeutica` | Cerrar ciclo, crear nueva Solicitud de Programa con cambio de medicamento. |
| `pasar_alta_medica` | Programar tareas de Alta Médica (3 semanas) + activar Seguimiento LP automático. |
| `pasar_seguimiento_largo_plazo` | Crear registros en `19_Seguimientos_LP`: 6m, 12m, anual indefinido. |
| `pausar_temporalmente` | Marcar ciclo como `pausado` con motivo. Las tareas pendientes quedan en pausa. |
| `derivar_externo` | Cerrar ciclo, crear incidencia tipo `derivacion`. |
| `no_continua_por_decision_paciente` | Cerrar ciclo + activar Seguimiento LP igualmente (ronda crónica). |
| `no_continua_por_motivo_economico` | Cerrar ciclo + activar Seguimiento LP + crear oportunidad comercial futura. |
| `pendiente_decision` | Mantener ciclo abierto, crear tarea de seguimiento para el médico en 3 días. |

---

## 5. Seguimientos de Largo Plazo (LP)

**Disparador:** Cierre de ciclo con decisiones que activan seguimiento (10 de las 11 lo activan).

**Lógica:**
- Crea registros en `19_Seguimientos_LP` con fechas:
  - 6 meses post-alta
  - 12 meses post-alta
  - Aniversarios anuales (año 2, 3, 4... indefinido)
- Cada seguimiento tiene un mensaje pre-asignado en `26_Cola_Mensajes`.
- El sistema envía recordatorios al Program Specialist 3 días antes de cada seguimiento.
- Si el paciente responde "LISTO" al mensaje → marca el seguimiento como completado.
- Si no responde en 7 días → crea incidencia de tipo "sin_respuesta_lp".

```javascript
// Logic.gs
function createLPFollowups(idCiclo, fechaAlta) {
  const milestones = [
    { meses: 6, tipo: 'seguimiento_6_meses' },
    { meses: 12, tipo: 'seguimiento_12_meses' }
  ];

  // Aniversarios anuales (año 2 a año 10, después se generan dinámicamente)
  for (let year = 2; year <= 10; year++) {
    milestones.push({ meses: year * 12, tipo: `aniversario_${year}` });
  }

  milestones.forEach(m => {
    const fecha = new Date(fechaAlta);
    fecha.setMonth(fecha.getMonth() + m.meses);

    Sheets.insert('19_Seguimientos_LP', {
      id_ciclo: idCiclo,
      tipo_seguimiento: m.tipo,
      fecha_programada: fecha,
      estado: 'programado'
    });
  });
}
```

---

## 6. Cola de mensajes — generación diaria

**Trigger:** todos los días a las 7:00 AM.

**Lógica:**
- Recorre todos los ciclos activos.
- Para cada ciclo, calcula qué mensaje educativo corresponde según:
  - Semana actual del ciclo
  - Fase del programa (adaptación / optimización / consolidación)
  - Día de la semana sugerido (lunes para mensaje principal)
- Recorre todos los pacientes en seguimiento LP cuya fecha programada esté en los próximos 7 días.
- Inserta los mensajes pendientes en `26_Cola_Mensajes` con estado = `pendiente`.

El frontend lee esta tabla al abrir la pantalla "Mensajes pendientes".

---

## 7. Incidencias automáticas

El sistema crea incidencias en `17_Incidencias` automáticamente cuando:

| Condición | Tipo de incidencia | Prioridad |
|---|---|---|
| Una tarea pasa su fecha programada sin completarse | `tarea_vencida` | media (alta si es aplicación) |
| Un paciente no responde "LISTO" a un mensaje educativo en 48h | `sin_respuesta_paciente` | media |
| Una receta vence en menos de 3 días | `receta_por_vencer` | alta |
| Un seguimiento LP no obtiene respuesta en 7 días | `sin_respuesta_lp` | media |
| Un pago no se confirma en 5 días tras emisión de boleta | `pago_no_confirmado` | media |
| Una solicitud médica está en `pendiente` por más de 3 días | `solicitud_estancada` | media |

---

## 8. Generación de PDF de Solicitud Médica

**Disparador:** Usuario crea/edita una Solicitud Médica con `requiere_pdf = TRUE`.

**Pasos:**
1. `PDF.gs` selecciona la plantilla correcta según el tipo de solicitud:
   - `Plantilla_Solicitud_Programa.gdoc` (programas)
   - `Plantilla_Solicitud_Laboratorio.gdoc` (lab)
   - `Plantilla_Solicitud_Imagen.gdoc` (imágenes)
   - `Plantilla_Solicitud_Generica.gdoc` (interconsulta, nutrición, psicología, psiquiatría, otro)
2. Hace una copia de la plantilla en una carpeta temporal.
3. Reemplaza los marcadores con los datos reales del paciente y la solicitud.
4. Convierte el Doc a PDF.
5. Guarda el PDF en `/GutDoc_Solicitudes/{año}/{mes}/{ID_SOLICITUD}.pdf`.
6. Borra el Doc temporal.
7. Genera link compartible (`anyone with link can view`).
8. Escribe el link en `Solicitudes_Medicas.pdf_url`.
9. Devuelve el link al frontend.

```javascript
// PDF.gs
function generateSolicitudPDF(idSolicitud) {
  const sol = Sheets.findOne('18_Solicitudes_Medicas', { id_solicitud_medica: idSolicitud });
  const paciente = Sheets.findOne('05_Pacientes', { id_paciente: sol.id_paciente });
  const medico = Sheets.findOne('03_Profesionales', { id_profesional: sol.id_medico_solicitante });

  const templateId = TEMPLATES[sol.tipo_solicitud] || TEMPLATES.generic;
  const tempCopy = DriveApp.getFileById(templateId).makeCopy(`temp_${idSolicitud}`, getTempFolder());
  const doc = DocumentApp.openById(tempCopy.getId());
  const body = doc.getBody();

  body.replaceText('{{nombre_paciente}}', `${paciente.nombres} ${paciente.apellido_paterno}`);
  body.replaceText('{{dni_paciente}}', paciente.dni);
  body.replaceText('{{fecha_solicitud}}', formatDate(sol.fecha_solicitud));
  body.replaceText('{{nombre_medico}}', medico.nombre_completo);
  body.replaceText('{{cmp_medico}}', medico.cmp || '-');

  if (sol.tipo_solicitud === 'laboratorio') {
    const pruebas = Sheets.findMany('33_Master_Laboratorios',
      { id_prueba: sol.pruebas_laboratorio_seleccionadas });
    body.replaceText('{{lista_pruebas}}', pruebas.map(p => `• ${p.nombre_prueba}`).join('\n'));
  }

  body.replaceText('{{detalle_solicitud}}', sol.detalle_solicitud);
  body.replaceText('{{instrucciones_paciente}}', sol.instrucciones_paciente);

  doc.saveAndClose();

  const pdfBlob = tempCopy.getAs('application/pdf');
  const targetFolder = ensureMonthFolder(new Date());
  const pdfFile = targetFolder.createFile(pdfBlob).setName(`${idSolicitud}.pdf`);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  tempCopy.setTrashed(true);  // borrar el doc temporal

  Sheets.update('18_Solicitudes_Medicas',
    { id_solicitud_medica: idSolicitud },
    { pdf_url: pdfFile.getUrl(), pdf_generado_at: new Date() });

  return pdfFile.getUrl();
}
```

---

## 9. Activación automática del Embudo Comercial

**Disparador:** Médico crea Solicitud Médica con `tipo_solicitud = "programa"`.

**Acciones:**
1. Genera ID `SPG-XXXXX` (Solicitud de Programa).
2. Crea registro paralelo en `07_Solicitudes_Programa` (con datos comerciales separados).
3. Crea registro en `08_Seguimiento_Comercial` con estado = `nueva`.
4. Genera PDF de la propuesta.
5. Notifica al equipo de Ventas (correo + entrada en su dashboard).
6. La solicitud aparece en la columna "Nuevas" del Kanban en Seguimiento Comercial.

Cuando Ventas mueve la tarjeta a "Pagado" Y Finanzas confirma el pago → se dispara la regla 1 (activación de ciclo).
