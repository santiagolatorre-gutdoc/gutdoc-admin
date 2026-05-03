# Arquitectura — GutDoc Admin

Cómo está construido el sistema, cómo fluyen los datos, y por qué se decidió así.

---

## Vista general

```
┌─────────────────────────────────────────────────────────────────┐
│                     EQUIPO GUTCLINIC / GUTDOC                    │
│   (médicos, program specialists, recepción, ventas, finanzas)    │
└─────────────────────────────┬───────────────────────────────────┘
                              │ navegador
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (GitHub Pages)                       │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │index.html│ │ css/*.css     │  │ js/                       │ │
│  │         │  │ - variables   │  │ - mock-data.js (FASE 5)   │ │
│  │         │  │ - components  │  │ - api.js (cliente REST)   │ │
│  │         │  │ - mobile      │  │ - app.js (lógica UI)      │ │
│  └─────────┘  └──────────────┘  └────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │ fetch() POST con action + params
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND (Google Apps Script Web App)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Code.gs  │→ │  Auth.gs │→ │  API.gs  │→ │ Logic.gs │       │
│  │ (router) │  │ (perms)  │  │ (handlers)│  │ (rules)  │       │
│  └──────────┘  └──────────┘  └────┬─────┘  └────┬─────┘       │
│                                    │             │              │
│                              ┌─────▼─────┐  ┌───▼─────┐       │
│                              │ Sheets.gs │  │ PDF.gs  │       │
│                              │  (CRUD)   │  │(Drive)  │       │
│                              └─────┬─────┘  └───┬─────┘       │
│  ┌──────────────────────────────────┼────────────┼───┐         │
│  │  Triggers.gs (jobs automáticos)  │            │   │         │
│  └──────────────────────────────────┼────────────┼───┘         │
└──────────────────────────────────────┼────────────┼─────────────┘
                                       │            │
                          ┌────────────▼─┐    ┌────▼──────────┐
                          │ Google Sheet │    │ Google Drive  │
                          │ (33 pestañas)│    │  (PDFs)       │
                          └──────────────┘    └───────────────┘
```

---

## Stack y decisiones

### Por qué Google Sheets como base de datos

- **Costo cero** durante toda la fase de validación.
- **Visibilidad para no-técnicos** — el equipo puede revisar datos sin pedir queries.
- **Integraciones nativas** con Apps Script, Drive, Gmail, Calendar.
- **Suficiente para 100-500 pacientes activos** — más allá de eso, conviene migrar a Postgres / Supabase.

### Por qué Apps Script como backend

- **Conexión nativa** con Sheets, Drive, Docs, Gmail, Calendar.
- **Sin servidor que mantener** — Google ejecuta todo.
- **OAuth integrado** — no hay que manejar passwords.
- **Triggers de tiempo** — para los jobs automáticos.
- **Limitaciones aceptables**: ~6 min de ejecución por trigger, ~20k tareas/día de quota → más que suficiente para nuestro volumen.

### Por qué frontend modular sin framework

- **Sin build step** — subes los archivos a GitHub Pages y listo.
- **Curva de aprendizaje cero** para quien quiera mantenerlo.
- **Sin dependencias** que se rompan en 6 meses.
- **El v5 ya tiene la UX completa** — meterle React sería over-engineering.

---

## Flujos clave

### 1. Flujo de autenticación

```
Usuario abre la app
    │
    ▼
api.checkSession() → Apps Script doPost('auth.checkSession')
    │
    ▼
Auth.gs verifica:
    - Email del Session.getActiveUser() (Google Workspace)
    - Está en 03_Profesionales con estado_activo=true
    - El dominio del email coincide con ALLOWED_DOMAIN
    │
    ▼
Devuelve { user: { email, nombre, rol, especialidad } }
    │
    ▼
Frontend guarda en window.currentUser y aplica permissions.js
para ocultar elementos prohibidos en UI según el rol.
```

### 2. Flujo de creación de Solicitud Médica con PDF

```
Médico abre modal "Nueva solicitud médica"
    │
    ▼
Selecciona tipo (programa / lab / imagen / etc.)
    │
    ▼ (UI cambia secciones según tipo)
Llena los campos
    │
    ▼
Click "Crear solicitud y generar PDF"
    │
    ▼
api.createSolicitudMedica(data)
    ↓ POST a Apps Script
API['solicitudes.create']
    │
    ├─→ Sheets.insert('18_Solicitudes_Medicas', data)
    │       └─ ID generado: SOL-NNNNN o SPG-NNNNN según tipo
    │
    ├─→ Si tipo=programa: Logic.createCommercialFunnelEntry()
    │       ├─ Sheets.insert('07_Solicitudes_Programa')
    │       └─ Sheets.insert('08_Seguimiento_Comercial')
    │           (aparece en kanban Ventas)
    │
    └─→ Si requiere_pdf: PDF.generateSolicitudPDF()
            ├─ Carga plantilla Doc desde Drive según tipo
            ├─ Hace copia temporal
            ├─ Reemplaza marcadores {{nombre_paciente}}, etc.
            ├─ Convierte a PDF
            ├─ Guarda en /Solicitudes/2026/05/SOL-NNNNN.pdf
            ├─ Genera link compartible
            ├─ Borra Doc temporal
            └─ Actualiza pdf_url en la solicitud
    │
    ▼
Devuelve solicitud + pdf_url
    │
    ▼
Frontend muestra toasts, redirige (si es programa) a Comercial
```

### 3. Flujo de activación automática de ciclo

```
Ventas mueve tarjeta del kanban a "Pagado"
    │
    ▼
api.updateKanbanStage(idSeguimiento, 'pagado')
    │
    ▼
Finanzas confirma el pago en pantalla de Pagos
    │
    ▼
api.confirmPayment(idPago)
    ↓
API['payments.confirm']
    ├─ Sheets.update('09_Pagos', { confirmado_por_finanzas: true })
    │
    └─ Si dispara_activacion_programa: Logic.activateCycle(pago)
            │
            ├─ Sheets.insert('10_Ciclos_Paciente', { estado: 'activo' })
            ├─ Logic.generateComponents()        → 11_Componentes_Paciente
            ├─ Logic.generateTasksFromProtocol() → 13_Tareas_Paciente
            ├─ Logic.generatePhotoTasks()        → Foto Inicial + Resultados
            ├─ Logic.generateMessageQueue()      → 26_Cola_Mensajes
            └─ Sheets.update('05_Pacientes',
                  { estado_paciente: 'en_programa' })
    │
    ▼
Auditoría: _AUDIT_LOG registra "cycle_activated"
    │
    ▼
Devuelve éxito al frontend
```

### 4. Flujo del cálculo de Consulta de Resultados

```
EVENTO: una tarea de tipo "aplicacion" se completa o reprograma
    │
    ▼
API['tasks.complete'] o API['tasks.reschedule']
    │
    ▼
Logic.recalculateConsultaResultados(idCiclo)
    │
    ├─ Sheets.findMany('13_Tareas_Paciente', {
    │       id_ciclo, tipo_hito: 'aplicacion'
    │     })
    │
    ├─ Filtra por estado_tarea ∈ ['programada', 'completada']
    │
    ├─ Encuentra fecha_ultima = MAX(fecha_programada)
    │
    ├─ Calcula fecha_consulta = fecha_ultima + 7 días
    │
    ├─ Busca la tarea de Consulta de Resultados existente
    │     │
    │     ├─ Si existe: Sheets.update con la nueva fecha
    │     │     y notas_recalculo
    │     │
    │     └─ Si no existe: Sheets.insert una nueva tarea con
    │           tipo_hito='consulta_resultados'
    │
    └─ _AUDIT_LOG registra "consulta_resultados_recalculated"
```

**Esta regla se ejecuta automáticamente** cada vez que una aplicación cambia de fecha o se completa. El equipo nunca calcula manualmente.

### 5. Flujo de cierre de ciclo + decisión post-programa

```
Médico abre paciente en pantalla de Ciclo
    │
    ▼
Click "Cerrar ciclo"
    │
    ▼
Modal con:
    - Resumen del ciclo (X/Y tareas completadas, cumplimiento %)
    - Selector de las 11 decisiones post-programa
    - Campo de observaciones
    │
    ▼
Confirmar
    │
    ▼
api.closeCycle(idCiclo, decision, observaciones)
    │
    ▼
API['cycles.close'] → Logic.closeCycle()
    │
    ├─ Validar que todas las tareas obligatorias estén
    │   en estado completada / no_aplica / desistida
    │   (si no: ERROR, no se puede cerrar)
    │
    ├─ Calcular cumplimiento_porcentual
    │
    ├─ Sheets.update('10_Ciclos_Paciente', { estado: 'completado' })
    │
    ├─ Sheets.insert('14_Decisiones_Post_Programa', { tipo_decision })
    │
    └─ Logic.executeDecisionActions(ciclo, decision)
        │
        switch (decision):
            ├─ 'continuar_microdosificacion'
            │     → Logic.startMicrodosification(ciclo)
            │
            ├─ 'pasar_alta_medica'
            │     → Logic.scheduleAltaMedica() (3 tareas semanales)
            │     → Logic.createLPFollowups() (6m, 12m, anuales)
            │
            ├─ 'pasar_seguimiento_largo_plazo'
            │     → Logic.createLPFollowups()
            │
            ├─ 'iniciar_nuevo_programa_completo'
            │     → Crear nueva solicitud de programa
            │
            ├─ 'pausar_temporalmente'
            │     → Sheets.update ciclo a 'pausado'
            │
            ├─ 'no_continua_por_decision_paciente'
            │ 'no_continua_por_motivo_economico'
            │     → Aún así: Logic.createLPFollowups()
            │       (la obesidad es crónica, mantenemos contacto)
            │
            └─ 'pendiente_decision'
                  → Tarea para el médico en 3 días
```

---

## Capas de seguridad

### Nivel 1 — Dominio del email

`Auth.getCurrentUser()` valida que el email pertenezca al dominio `gutclinic.com` (configurado en `Constants.gs`). Cualquier otro email es rechazado.

### Nivel 2 — Estado del usuario

El usuario debe existir en `03_Profesionales` con `estado_activo = TRUE`. Si renuncia o se da de baja, simplemente cambias ese campo a `FALSE` y pierde acceso.

### Nivel 3 — Permisos por endpoint

Cada endpoint en `API.gs` empieza con:
```javascript
Auth.requirePermission(params._user, 'patients.create');
```
Si el rol no tiene ese permiso, lanza error y no ejecuta la acción.

### Nivel 4 — Filtrado de datos por rol

Aún si tienes permiso de leer pacientes, el filtro adicional asegura que veas solo los tuyos:
```javascript
return Auth.filterPatientsByRole(allPatients, user);
// medico → solo sus pacientes
// recepcion → todos pero sin observaciones internas
// ventas → solo los del embudo
```

### Nivel 5 — UI hide

`permissions.js` (en frontend) oculta elementos con `data-requires="..."` que el rol no debe ver. Esto es **solo cosmético** — la verdadera seguridad está en backend.

### Nivel 6 — Auditoría

Toda escritura queda en `_AUDIT_LOG` con email + acción + timestamp. Si pasa algo raro, hay rastro.

---

## Triggers automáticos

`Triggers.gs` registra estos jobs:

| Frecuencia | Función | Qué hace |
|---|---|---|
| Diario 7am | `dailyJobs` | Refresca cola de mensajes, detecta tareas vencidas, detecta recetas por vencer, notifica seguimientos LP próximos |
| Cada hora | `hourlyJobs` | Detecta solicitudes médicas estancadas, detecta mensajes sin respuesta |
| Lunes 6am | `weeklyBackup` | Copia el Sheet completo a `/Backups/` |
| Domingos 23h | `generateMetricsSnapshot` | Snapshot de KPIs en `32_Metricas_Snapshot` |

Las **incidencias automáticas** se crean en estos jobs cuando se detectan condiciones críticas (tarea vencida = incidencia auto, etc.).

---

## Cómo escala

| Volumen | Stack actual basta | Migrar a |
|---|---|---|
| 100 pacientes | ✅ Sí, sin problema | — |
| 500 pacientes | ✅ Aún es viable | — |
| 1,000 pacientes | ⚠️ Se nota lento al cargar | Cachear con PropertiesService o pasar a Supabase |
| 2,000+ pacientes | ❌ Lento | Migrar a Postgres + Node/Deno backend |
| Multi-clínica (varios GutDoc) | ❌ No escala | Multi-tenant con Postgres |

**La migración no requiere reescribir el frontend.** Solo se cambia `js/api.js` para apuntar a otra URL. Esa es la mayor ventaja de la arquitectura propuesta.

---

## De FASE 5 (mock) a FASE 6 (backend real)

```
FASE 5 actual                       FASE 6 (futuro)

api.js:                            api.js:
USE_BACKEND = false      ────►     USE_BACKEND = true
                                   APPS_SCRIPT_URL = 'https://script.google...'

mock-data.js:                      mock-data.js:
window.MOCK = {...}      ────►     (eliminar archivo)

index.html:                        index.html:
<script src="js/mock-data.js">  ─► (quitar esta línea)
```

El resto del código no cambia. Cada función de `api.js` ya tiene la rama `if (USE_BACKEND) return callBackend(...)` lista para activarse.
