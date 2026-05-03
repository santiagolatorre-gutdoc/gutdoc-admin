# GutDoc Admin

Sistema administrativo para GutClinic / GutDoc — gestión operativa de pacientes en programas metabólicos (GLP-1, microdosificación, bariatría, memberships).

**No incluye historia clínica.** Los datos clínicos viven en DocToCliq u otra plataforma EHR. Esta app maneja: programas, ciclos, tareas, mensajes, incidencias, embudo comercial y solicitudes médicas.

---

## Stack técnico

| Capa | Tecnología | Costo |
|---|---|---|
| Frontend | HTML + CSS + Vanilla JS (sin framework) | Gratis |
| Hosting | GitHub Pages | Gratis |
| Backend | Google Apps Script (REST endpoints) | Gratis |
| Base de datos | Google Sheets (33 pestañas) | Gratis |
| Auth | Google OAuth (cuentas Google Workspace) | Gratis con Workspace |
| PDFs | Apps Script + DocumentApp + Drive | Gratis |
| WhatsApp | Manual asistido (fase 1) → Make + WA Business API (fase 2) | $5–20/mes (fase 2) |

---

## Estructura del repositorio

```
gutdoc-admin/
├── index.html                  # entrada principal
├── css/
│   ├── variables.css           # design tokens (colores, tipografía, spacing)
│   ├── components.css          # botones, tarjetas, tablas, badges, formularios
│   ├── screens.css             # estilos específicos por pantalla
│   └── mobile.css              # responsive < 768px + bottom nav
├── js/
│   ├── app.js                  # bootstrap, navegación entre pantallas
│   ├── api.js                  # cliente REST hacia Apps Script
│   ├── auth.js                 # login Google OAuth, sesión, rol activo
│   ├── permissions.js          # filtro de UI según rol del usuario
│   ├── ui.js                   # toasts, modales, sonidos, animaciones
│   ├── screens/
│   │   ├── dashboard.js
│   │   ├── pacientes.js
│   │   ├── ciclo.js
│   │   ├── tareas.js
│   │   ├── mensajes.js
│   │   ├── solicitudes-medicas.js
│   │   ├── comercial.js
│   │   ├── incidencias.js
│   │   └── admision.js
│   └── services/
│       ├── labs-search.js      # buscador master_laboratorios
│       ├── kanban-dnd.js       # drag & drop comercial
│       └── whatsapp.js         # construcción de URL wa.me
├── apps-script/
│   ├── Code.gs                 # entrada / router
│   ├── Auth.gs                 # OAuth + matriz de permisos
│   ├── API.gs                  # endpoints REST
│   ├── Sheets.gs               # capa de acceso al Sheet
│   ├── PDF.gs                  # generación de PDFs en Drive
│   ├── Logic.gs                # lógica de negocio (ciclos, tareas, fechas)
│   ├── Triggers.gs             # jobs programados (diarios, horarios)
│   └── Constants.gs            # IDs del Sheet, carpetas Drive, etc.
├── sheets-template/
│   └── PLANTILLA_GUTDOC.md     # guía de creación del Sheet inicial
└── docs/
    ├── DEPLOY.md               # despliegue paso a paso
    ├── ARCHITECTURE.md         # arquitectura de datos y flujos
    ├── ROLES.md                # matriz de permisos por rol
    └── BUSINESS_LOGIC.md       # reglas de negocio (cálculos automáticos)
```

---

## Despliegue rápido

1. **Crear el Google Sheet** desde la plantilla (`sheets-template/PLANTILLA_GUTDOC.md`)
2. **Desplegar Apps Script** vinculado al Sheet (`docs/DEPLOY.md` → paso 2)
3. **Configurar OAuth** y dar acceso al equipo
4. **Subir frontend a GitHub Pages**
5. **Conectar frontend ↔ Apps Script** vía URL del web app

Detalle completo en `docs/DEPLOY.md`.

---

## Filosofía

- **La app HTML es la única puerta de entrada al sistema.** El equipo nunca toca el Sheet directamente.
- **Apps Script es el cartero** entre la app y el Sheet — valida permisos, filtra datos por rol, escribe con auditoría.
- **Cada acción del usuario pasa por un endpoint** que conoce el rol y aplica los filtros correspondientes.
- **Los datos clínicos están fuera** — esta app no almacena peso, IMC, masa grasa, presión arterial, ni medicamentos. Todo eso vive en la EHR externa.
- **Funciona ahora, escala después.** Sheets es suficiente para 100-500 pacientes activos. Cuando se necesite migrar a Postgres / Supabase, el frontend se mantiene; solo cambia la capa de servicios.

---

## Roles del sistema

| Rol | Ve | Edita | No ve / no puede |
|---|---|---|---|
| **Admin** | Todo | Todo | — |
| **Médico** | Pacientes asignados, ciclos, tareas, solicitudes médicas, mensajes, comercial (solo lectura de sus pacientes) | Solicitudes médicas, decisión post-programa, observaciones | Márgenes financieros, datos de otros médicos |
| **Program Specialist** | Tareas, mensajes, incidencias, ciclos asignados | Tareas, mensajes, incidencias | Pagos, márgenes, datos comerciales sensibles |
| **Recepción** | Pacientes (datos básicos), agenda, admisión | Datos personales del paciente, agenda | Pagos, márgenes, datos clínicos, comercial |
| **Ventas** | Embudo comercial, solicitudes de programa, precios | Estado del embudo, observaciones, presupuesto | Márgenes de utilidad, datos clínicos detallados |
| **Finanzas** | Pagos, presupuestos, conciliaciones, márgenes | Confirmar pagos, registrar comprobantes | Datos clínicos, mensajes WhatsApp |

Detalle en `docs/ROLES.md`.
