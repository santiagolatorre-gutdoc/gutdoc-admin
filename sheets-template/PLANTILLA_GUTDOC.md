# Plantilla Google Sheet — GutDoc Admin

Esta guía describe las **34 pestañas + 1 pestaña de auditoría** que conforman la base de datos del sistema. Crea el Sheet manualmente siguiendo este documento.

> ⚠️ **Importante:** Los nombres de pestaña y columnas deben coincidir EXACTAMENTE con lo aquí descrito. Apps Script los referencia por nombre (`TABS.PACIENTES = '05_Pacientes'`).

---

## Convenciones generales

- **IDs:** primera columna de cada pestaña, formato `PREFIJO-NNNNN` (ej: `PAC-00042`). Apps Script los genera automáticamente al insertar.
- **Timestamps:** columnas `created_at`, `updated_at`, `deleted_at` se llenan automáticamente.
- **Booleanos:** Sheets los maneja como `TRUE` / `FALSE`. Apps Script los lee como `true` / `false`.
- **Fechas:** formato ISO recomendado `yyyy-MM-dd`. Las generadas por Apps Script vienen como Date objects.
- **Listas (arrays):** se almacenan como strings separados por comas. Apps Script las parsea con `.split(',')`.
- **Validaciones de datos:** configurar como Data Validation en Google Sheets para los ENUMs.

---

## Pestañas

### `01_Catalogos`

Catálogos generales del sistema (estados, tipos, listas reutilizables).

| Columna | Tipo | Notas |
|---|---|---|
| id_catalogo | Text | CAT-NNNN |
| nombre_catalogo | Text | Ej: "estados_paciente", "tipos_incidencia" |
| valor | Text | El valor del catálogo |
| etiqueta_visible | Text | Lo que ve el usuario |
| orden | Number | Para ordenar dropdowns |
| color_hex | Text | Color asociado al estado, opcional |
| estado | ENUM | activo / inactivo |

---

### `02_Servicios`

Los 20 servicios definidos: Consulta Médica, Médico Especialista, Nutrición, Psicología, etc.

| Columna | Tipo |
|---|---|
| id_servicio | Text (SERV-NNN) |
| nombre_servicio | Text |
| categoria | ENUM: Clínica / Admin / Comercial / Soporte |
| descripcion | LongText |
| duracion_estimada_min | Number |
| precio_publico | Number |
| costo_interno | Number (sensible — solo Admin/Finanzas) |
| estado | ENUM: activo / inactivo |

**Datos semilla:** ver `js/mock-data.js` → `MOCK.servicios` (los 20 ya listados).

---

### `03_Profesionales`

Usuarios del sistema. Apps Script lee esta tabla para autenticar.

| Columna | Tipo | Notas |
|---|---|---|
| id_profesional | Text (PROF-NNNNN) | |
| email_workspace | Text | EL CRITERIO DE AUTH — debe ser el mismo email con que entra a Google |
| nombre_completo | Text | |
| rol_sistema | ENUM | admin / medico / program_specialist / recepcion / ventas / finanzas |
| especialidad | Text | |
| cmp | Text | Solo médicos |
| telefono | Text | |
| sede_default | Text | GutClinic / GutDoc / Externa |
| estado_activo | Boolean | TRUE para acceder al sistema |
| fecha_alta | Date | |
| fecha_baja | Date | Si dado de baja |

---

### `04_Programas`

Las 14+ variantes de programas. Datos semilla en `mock-data.js`.

| Columna | Tipo |
|---|---|
| id_programa | Text |
| nombre_programa | Text |
| categoria | ENUM: GLP-1 / Combinado / Bariátrica / Microdosificación / Alta / Membership |
| duracion_semanas | Number |
| fase | ENUM: inicio / continuacion / mantenimiento / post-cirugia / alta / membership |
| medicamento_default | Text |
| precio_referencial | Number |
| descripcion | LongText |
| estado | ENUM: activo / inactivo |

---

### `05_Pacientes`

Datos personales del paciente. **NO incluye datos clínicos** (peso, IMC, presión, etc.) — esos viven en DocToCliq.

| Columna | Tipo |
|---|---|
| id_paciente | Text (PAC-NNNNN) |
| nombres | Text |
| apellido_paterno | Text |
| apellido_materno | Text |
| dni | Text |
| tipo_documento | ENUM: DNI / CE / Pasaporte |
| fecha_nacimiento | Date |
| genero | ENUM: F / M / Otro / Prefiere no decir |
| email | Text |
| telefono | Text |
| whatsapp | Text |
| distrito | Text |
| direccion | Text |
| fuente_captacion | ENUM (Instagram, Facebook, YouTube, Substack, Referido paciente, Referido médico, Web, Recepción, Campaña) |
| consentimiento_datos | Boolean |
| consentimiento_whatsapp | Boolean |
| consentimiento_lp | Boolean |
| estado_paciente | ENUM: prospecto / en_seguimiento_comercial / en_programa / completado / post_alta / pausado / inactivo |
| id_medico_responsable | Text (FK) |
| id_program_specialist | Text (FK) |
| historia_clinica_link | Text (URL al EHR externo) |
| observaciones_internas | LongText |
| fecha_creacion | Date |

---

### `06_Consentimiento_WA`

Registros explícitos de consentimiento WhatsApp (cumplimiento LGPD).

| Columna | Tipo |
|---|---|
| id_consentimiento | Text |
| id_paciente | Text (FK) |
| tipo_consentimiento | ENUM (programa, lp, marketing) |
| canal | ENUM (escrito, verbal_grabado, formulario_digital) |
| fecha_otorgamiento | Date |
| evidencia_link | Text |
| revocado | Boolean |
| fecha_revocacion | Date |

---

### `07_Solicitudes_Programa`

Cuando el médico crea una "Solicitud de Programa" desde Solicitudes Médicas, además de generar el registro en `18_Solicitudes_Medicas`, se crea aquí el detalle comercial.

| Columna | Tipo |
|---|---|
| id_solicitud_programa | Text (SPG-NNNNN) |
| id_solicitud_medica | Text (FK) |
| id_paciente | Text (FK) |
| id_medico_solicitante | Text (FK) |
| id_programa | Text (FK) |
| paquete_servicios | ENUM: completo / individual / personalizado |
| servicios_incluidos | Text (lista de IDs) |
| medicamento | Text |
| tipo_protocolo | ENUM: A / B / C / Personalizado |
| tipo_inicio | ENUM: Sin antecedentes / Con antecedentes / Otro |
| urgencia | ENUM: Sin apuro / Este mes / Esta semana / Inmediata |
| precio_referencial | Number |
| observaciones_medico | LongText |
| fecha_creacion | Date |

---

### `08_Seguimiento_Comercial`

Embudo Kanban de Ventas. Cada solicitud de programa pasa por aquí.

| Columna | Tipo |
|---|---|
| id_seguimiento | Text |
| id_solicitud_programa | Text (FK) |
| id_paciente | Text (FK) |
| estado_comercial | ENUM: nueva / en_contacto / presupuesto_enviado / negociando / pagado / no_avanza / perdida |
| presupuesto_enviado | Number |
| precio_final | Number |
| margen_estimado | Number (sensible — Admin/Finanzas) |
| fecha_ingreso_kanban | Date |
| fecha_ultima_actualizacion | Date |
| fecha_cierre | Date |
| motivo_no_avanza | Text |
| observaciones | LongText |

---

### `09_Pagos`

Pagos confirmados que disparan activación de ciclo.

| Columna | Tipo |
|---|---|
| id_pago | Text (PAG-NNNNN) |
| id_solicitud_programa | Text (FK) |
| id_paciente | Text (FK) |
| id_programa | Text (FK) |
| monto | Number |
| moneda | ENUM: PEN / USD |
| metodo_pago | ENUM: transferencia / tarjeta / efectivo / yape_plin |
| comprobante_link | Text |
| numero_comprobante | Text |
| fecha_pago | Date |
| confirmado_por_finanzas | Boolean |
| fecha_confirmacion | Date |
| id_confirmado_por | Text (FK) |
| dispara_activacion_programa | Boolean |
| ciclo_creado | Text (FK al ciclo creado, después de activación) |

---

### `10_Ciclos_Paciente`

Cada vez que un paciente inicia un programa = un ciclo.

| Columna | Tipo |
|---|---|
| id_ciclo | Text (CIC-NNNNN) |
| id_paciente | Text (FK) |
| id_programa | Text (FK) |
| id_pago_disparador | Text (FK) |
| ronda_numero | Number (1, 2, 3... para el mismo paciente) |
| fecha_inicio_ciclo | Date |
| fecha_fin_estimada | Date |
| fecha_fin_real | Date |
| estado_ciclo | ENUM: activo / pausado / completado / abandonado / finalizado_decision_pendiente |
| id_medico_responsable | Text (FK) |
| id_program_specialist | Text (FK) |
| cumplimiento_porcentual | Number (0-100) |
| observaciones | LongText |

---

### `11_Componentes_Paciente`

Por cada ciclo, qué componentes están activos (Nutrición, Psicología, Deporte, etc.).

| Columna | Tipo |
|---|---|
| id_componente | Text |
| id_ciclo | Text (FK) |
| tipo_componente | ENUM: nutricion / psicologia / deporte / aplicaciones / inbody / cardiologia / endocrinologia / etc. |
| estado | ENUM: activo / no_aplica / pausado |
| sesiones_planificadas | Number |
| sesiones_completadas | Number |
| motivo_no_aplica | Text |

---

### `12_Protocolo_Tareas`

Definición del protocolo: qué tareas deben generarse para cada programa, en qué semana.

| Columna | Tipo |
|---|---|
| id_tarea_protocolo | Text |
| id_programa | Text (FK) |
| nombre_tarea | Text |
| tipo_hito | ENUM: aplicacion / consulta_medica / consulta_resultados / nutricion / psicologia / deporte / inbody / laboratorio / foto_protocolizada / alta_medica / etc. |
| semana_programa | Number |
| dias_desde_inicio | Number (offset desde fecha_inicio_ciclo) |
| fase_programa | ENUM: adaptacion / optimizacion / consolidacion / mantenimiento / alta |
| id_servicio_responsable | Text (FK) |
| sede_default | ENUM: GutClinic / GutDoc / Domicilio / Externa |
| es_obligatoria | Boolean |
| requiere_evidencia | Boolean |
| permite_desistir | Boolean |
| orden_secuencia | Number |

---

### `13_Tareas_Paciente`

Tareas reales generadas para cada paciente al activarse un ciclo.

| Columna | Tipo |
|---|---|
| id_tarea | Text (TAR-NNNNN) |
| id_ciclo | Text (FK) |
| id_paciente | Text (FK) |
| id_tarea_protocolo | Text (FK, opcional) |
| nombre_tarea | Text |
| tipo_hito | ENUM (igual que en protocolo) |
| semana_programa | Number |
| fase_programa | ENUM |
| fecha_programada | Date |
| fecha_completada | Date |
| estado_tarea | ENUM: programada / en_proceso / completada / vencida / reprogramada / no_aplica / desistida_paciente |
| id_responsable_ejecucion | Text (FK) |
| id_completada_por | Text (FK) |
| sede | Text |
| es_obligatoria | Boolean |
| requiere_evidencia | Boolean |
| evidencia_link | Text |
| motivo_desistimiento | Text |
| observaciones_completion | LongText |
| notas_recalculo | Text |

---

### `14_Decisiones_Post_Programa`

Cada decisión que el médico toma al cerrar un ciclo.

| Columna | Tipo |
|---|---|
| id_decision | Text |
| id_ciclo | Text (FK) |
| id_paciente | Text (FK) |
| tipo_decision | ENUM (los 11 tipos documentados en BUSINESS_LOGIC.md) |
| observaciones | LongText |
| fecha_decision | Date |
| id_medico_decisor | Text (FK) |

**Los 11 tipos:** `continuar_microdosificacion`, `volver_escalar_dosis`, `iniciar_nuevo_programa_completo`, `cambiar_estrategia_terapeutica`, `pasar_alta_medica`, `pasar_seguimiento_largo_plazo`, `pausar_temporalmente`, `derivar_externo`, `no_continua_por_decision_paciente`, `no_continua_por_motivo_economico`, `pendiente_decision`.

---

### `15_Microdosificacion`

Detalle de pacientes en programa de microdosificación.

| Columna | Tipo |
|---|---|
| id_microdosificacion | Text |
| id_ciclo_origen | Text (FK al ciclo desde el que se inició) |
| id_paciente | Text (FK) |
| tipo_microdosificacion | ENUM: A / B |
| fase_actual | Text |
| fecha_inicio | Date |
| fecha_fin_estimada | Date |
| dosis_actual | Text |
| estado | ENUM: activa / pausada / completada |

---

### `16_Reprogramaciones`

Historial de reprogramaciones de tareas.

| Columna | Tipo |
|---|---|
| id_reprogramacion | Text |
| id_tarea | Text (FK) |
| id_ciclo | Text (FK) |
| fecha_anterior | Date |
| fecha_nueva | Date |
| motivo | Text |
| id_solicitante | Text (FK al profesional) |
| fecha_reprogramacion | Date |

---

### `17_Incidencias`

Cualquier evento que requiera atención: tareas vencidas, sin respuesta, errores, problemas.

| Columna | Tipo |
|---|---|
| id_incidencia | Text (INC-NNNNN) |
| id_paciente | Text (FK) |
| id_ciclo | Text (FK, opcional) |
| id_tarea | Text (FK, opcional) |
| id_solicitud_medica | Text (FK, opcional) |
| id_historial_envio | Text (FK, opcional) |
| tipo_incidencia | ENUM: tarea_vencida / sin_respuesta_paciente / receta_por_vencer / sin_respuesta_lp / pago_no_confirmado / solicitud_estancada / error_sistema / queja_paciente / otra |
| prioridad | ENUM: baja / media / alta / urgente |
| titulo | Text |
| descripcion | LongText |
| estado | ENUM: abierta / en_proceso / resuelta / cerrada |
| fecha_creacion | Date |
| id_creador | Text (FK) |
| es_automatica | Boolean |
| fecha_resolucion | Date |
| id_resolutor | Text (FK) |
| resolucion | LongText |

---

### `18_Solicitudes_Medicas`

**El módulo nuevo de FASE 5.** Cubre todos los tipos de solicitud incluyendo Solicitud de Programa.

| Columna | Tipo |
|---|---|
| id_solicitud_medica | Text (SOL- o SPG- según tipo) |
| id_paciente | Text (FK) |
| id_ciclo | Text (FK, opcional) |
| id_medico_solicitante | Text (FK) |
| fecha_solicitud | Date |
| tipo_solicitud | ENUM: programa / laboratorio / imagen_diagnostica / interconsulta / nutricion / psicologia / psiquiatria / receta / autorizacion / certificado_medico / derivacion_externa / insumo / otro |
| subtipo | Text (especialidad o tipo específico) |
| detalle_solicitud | LongText |
| instrucciones_paciente | LongText |
| id_especialidad_destino | Text (FK a Servicios) |
| medico_destino_externo | Text |
| pruebas_laboratorio_seleccionadas | Text (lista IDs separados por coma) |
| programa_recomendado | Text (FK a Programas, si tipo=programa) |
| paquete_servicios | Text |
| tipo_protocolo | Text |
| tipo_inicio | Text |
| precio_referencial | Number |
| urgencia | Text |
| requiere_contraste | ENUM (si tipo=imagen) |
| ayuno_requerido | Text |
| prioridad | ENUM: baja / media / alta / urgente |
| estado | ENUM: pendiente / enviada / agendada / completada / cancelada / rechazada |
| fecha_envio | Date |
| fecha_agendada | Date |
| fecha_completada | Date |
| id_responsable_administrativo | Text (FK) |
| observaciones | LongText |
| requiere_pdf | Boolean |
| pdf_url | Text |
| pdf_drive_id | Text |
| pdf_generado_at | Date |

---

### `19_Seguimientos_LP`

Seguimientos de Largo Plazo (6m, 12m, aniversarios anuales).

| Columna | Tipo |
|---|---|
| id_seguimiento | Text (LP-NNNNN) |
| id_ciclo | Text (FK) |
| id_paciente | Text (FK) |
| tipo_seguimiento | ENUM: seguimiento_6_meses / seguimiento_12_meses / aniversario_2 / aniversario_3 / ... |
| meses_post_alta | Number |
| fecha_programada | Date |
| fecha_real | Date |
| estado | ENUM: programado / enviado / respondido / no_respondido / cancelado |
| respuesta_paciente | Text |
| observaciones | LongText |

---

### `20_Biblioteca_Videos`

Catálogo de videos educativos (YouTube principalmente) por programa, semana y fase.

| Columna | Tipo |
|---|---|
| id_video | Text |
| titulo | Text |
| url_video | Text |
| plataforma | ENUM: youtube / vimeo / propio |
| id_programa | Text (FK, opcional) |
| semana_aplicable | Number |
| fase | ENUM: adaptacion / optimizacion / consolidacion |
| tema | Text |
| duracion_minutos | Number |
| estado | ENUM: activo / archivado |

---

### `21_Substack_Links`

Artículos de Substack categorizados.

| Columna | Tipo |
|---|---|
| id_articulo | Text |
| titulo | Text |
| url | Text |
| tema | Text |
| id_programa | Text (FK, opcional) |
| semana_aplicable | Number |
| fase | Text |
| fecha_publicacion | Date |
| estado | ENUM: activo / archivado |

---

### `22_Constantes_Comunicacion`

Configuración de mensajería (firmas, encabezados, horas de envío default, etc.).

| Columna | Tipo |
|---|---|
| id_constante | Text |
| nombre | Text |
| valor | Text |
| descripcion | Text |

---

### `23_Plantilla_Composicion`

Plantillas de mensajes educativos compuestos a partir de Videos + Substack + Texto.

| Columna | Tipo |
|---|---|
| id_plantilla | Text |
| nombre | Text |
| id_programa | Text (FK) |
| semana | Number |
| fase | Text |
| dia_envio_sugerido | ENUM: lunes / martes / miercoles / jueves / viernes / sabado / domingo |
| hora_envio_sugerida | Text |
| id_video | Text (FK, opcional) |
| id_articulo_substack | Text (FK, opcional) |
| texto_base | LongText |
| estado | ENUM: activo / inactivo |

---

### `24_Mensajes`

Catálogo de plantillas de mensajes individuales (no compuestos).

| Columna | Tipo |
|---|---|
| id_mensaje | Text |
| nombre | Text |
| categoria | ENUM: bienvenida / recordatorio_aplicacion / felicitacion / lp_6m / lp_12m / aniversario / etc. |
| contenido | LongText |
| variables_usadas | Text (lista de placeholders como {nombre_paciente}) |

---

### `25_Plantillas_WhatsApp`

Plantillas pre-aprobadas por WhatsApp Business API (cuando se conecte en fase 2).

| Columna | Tipo |
|---|---|
| id_plantilla_wa | Text |
| nombre_template | Text |
| categoria_wa | ENUM (según WA Business: utility / authentication / marketing) |
| idioma | Text (es_PE) |
| body_text | LongText |
| estado_aprobacion | ENUM: pendiente / aprobada / rechazada |

---

### `26_Cola_Mensajes`

Lo que va a enviarse hoy / próximos días.

| Columna | Tipo |
|---|---|
| id_cola_mensaje | Text |
| id_paciente | Text (FK) |
| id_ciclo | Text (FK, opcional) |
| id_seguimiento_lp | Text (FK, opcional) |
| id_plantilla | Text (FK) |
| tipo_mensaje | ENUM: educativo_semanal / recordatorio / felicitacion / seguimiento_lp / etc. |
| semana_programa | Number |
| fase_programa | Text |
| contenido_renderizado | LongText (con variables ya sustituidas) |
| fecha_sugerida_envio | Date |
| fecha_envio_real | Date |
| estado | ENUM: pendiente / listo_para_envio / enviado / fallido / cancelado |
| id_enviado_por | Text (FK) |
| canal | ENUM: whatsapp_manual / whatsapp_api / email / sms |

---

### `27_Historial_Envios`

Cada envío real queda registrado aquí.

| Columna | Tipo |
|---|---|
| id_historial_envio | Text |
| id_cola_mensaje | Text (FK) |
| id_paciente | Text (FK) |
| canal | Text |
| fecha_envio | Date |
| enviado_por | Text (FK) |
| status_envio | ENUM: enviado / entregado / leido / fallido |
| metadata | Text (JSON con info del proveedor) |

---

### `28_Respuestas_Pacientes`

Respuestas del paciente a mensajes (LISTO, dudas, etc.).

| Columna | Tipo |
|---|---|
| id_respuesta | Text |
| id_historial_envio | Text (FK) |
| id_paciente | Text (FK) |
| fecha_respuesta | Date |
| contenido | LongText |
| tipo_respuesta | ENUM: confirmacion_listo / pregunta / inconveniente / otro |
| atendida | Boolean |
| atendida_por | Text (FK) |

---

### `29_Recordatorios`

Recordatorios programados (a paciente, a personal interno).

| Columna | Tipo |
|---|---|
| id_recordatorio | Text |
| destinatario_tipo | ENUM: paciente / interno |
| id_destinatario | Text (FK) |
| asunto | Text |
| contenido | LongText |
| fecha_programada | Date |
| estado | ENUM: programado / enviado / cancelado |

---

### `30_Errores_Envio`

Bitácora de fallos de envío para diagnóstico.

| Columna | Tipo |
|---|---|
| id_error | Text |
| id_cola_mensaje | Text (FK) |
| fecha_error | Date |
| tipo_error | Text |
| detalle_error | LongText |
| reintento_numero | Number |
| resuelto | Boolean |

---

### `31_KPIs_Definicion`

Catálogo de KPIs que el dashboard muestra.

| Columna | Tipo |
|---|---|
| id_kpi | Text |
| nombre_kpi | Text |
| categoria | ENUM: pacientes / tareas / mensajes / comercial / financiero / clinico |
| formula_calculo | Text (descripción) |
| unidad | Text |
| objetivo_valor | Number |
| visible_para_roles | Text (lista de roles) |

---

### `32_Metricas_Snapshot`

Snapshot semanal de KPIs (genera el job `generateMetricsSnapshot`).

| Columna | Tipo |
|---|---|
| id_snapshot | Text |
| fecha | Date |
| pacientes_activos | Number |
| nuevos_pacientes_semana | Number |
| tareas_completadas_semana | Number |
| cumplimiento_promedio | Number |
| conversion_ventas | Number |
| ingresos_semana | Number (sensible) |

---

### `33_Master_Laboratorios`

**Master de pruebas para el buscador de Solicitudes Médicas.**

Datos semilla (50+ pruebas): ver `js/mock-data.js` → `MOCK.master_labs`.

| Columna | Tipo |
|---|---|
| id_prueba | Text (LAB-NNN) |
| codigo_interno | Text |
| nombre_prueba | Text |
| nombre_corto | Text |
| categoria | ENUM (Lípidos, Glucosa metabólico, Resistencia a la insulina, Marcadores inflamación, Tiroides, Hormonal, Vitaminas, Hematología, Función renal, Función hepática, Riesgo cardiovascular, etc.) |
| subcategoria | Text |
| palabras_clave | Text (separadas por espacios — para autocompletar) |
| requiere_ayuno | Boolean |
| horas_ayuno | Number |
| tipo_muestra | ENUM: sangre / orina / heces / saliva / otro |
| tiempo_resultado_estimado | Text |
| indicaciones_paciente | LongText |
| precio_referencial | Number |
| laboratorio_recomendado | Text |
| estado | ENUM: activo / inactivo |
| notas_internas | Text |

---

### `34_Campanas`

Campañas de marketing/captación con tracking.

| Columna | Tipo |
|---|---|
| id_campana | Text |
| nombre_campana | Text |
| canal | ENUM: instagram / facebook / google_ads / email / whatsapp / referidos |
| fecha_inicio | Date |
| fecha_fin | Date |
| presupuesto | Number (sensible) |
| leads_generados | Number |
| conversiones | Number |
| cac | Number (Customer Acquisition Cost — sensible) |
| estado | ENUM: activa / pausada / finalizada |

---

### `_AUDIT_LOG`

Auditoría de todas las operaciones de escritura (insert, update, delete).

| Columna | Tipo |
|---|---|
| timestamp | Date |
| email_usuario | Text |
| accion | ENUM: insert / update / delete / login / cycle_activated / pdf_generated / etc. |
| pestana | Text |
| record_id | Text |
| detalles | Text (JSON con cambios) |

> ⚠️ **Esta pestaña es solo lectura para todos los roles excepto admin** y no debe nunca borrarse manualmente.

---

## Datos semilla iniciales

Al crear el Sheet, carga manualmente estos datos:

1. **`02_Servicios`** → 20 servicios (ver `MOCK.servicios` en `mock-data.js`)
2. **`03_Profesionales`** → tu equipo (al menos 1 admin)
3. **`04_Programas`** → 14 programas (ver `MOCK.programas`)
4. **`12_Protocolo_Tareas`** → al menos las tareas del programa GLP-1 10 sem para empezar (~30 tareas)
5. **`33_Master_Laboratorios`** → las 50+ pruebas (ver `MOCK.master_labs`)
6. **`23_Plantilla_Composicion`** → al menos las 10 plantillas semanales para GLP-1
7. **`20_Biblioteca_Videos`** y **`21_Substack_Links`** → cuando tengas los enlaces reales
8. **`31_KPIs_Definicion`** → los KPIs que quieras que aparezcan en el dashboard

---

## Validaciones de datos recomendadas

Para evitar errores de captura, configura **Data Validation** en estas columnas:

- Todas las columnas tipo ENUM → dropdown con los valores del ENUM
- Columnas de fecha → date validator
- Columnas booleanas → checkbox
- IDs (FK) → buscar valores en la pestaña destino mediante `INDIRECT` o named ranges

---

## Nombres con prefijos numéricos

El prefijo `01_`, `02_`, etc. en cada pestaña ayuda a:
- Mantener un orden lógico al navegar el Sheet
- Indicar la jerarquía conceptual (catálogos → datos maestros → operación → comunicación → métricas)

**No cambies estos nombres** sin actualizar `Constants.gs` en Apps Script.
