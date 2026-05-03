# Matriz de Permisos por Rol

Cada endpoint de `API.gs` valida permisos llamando a `Auth.checkPermission(userEmail, action)`. La tabla `03_Profesionales` define el rol de cada usuario.

---

## Roles disponibles

| ID | Rol | Descripción |
|---|---|---|
| `admin` | Administrador | Acceso total. Configura el sistema. |
| `medico` | Médico | Crea solicitudes médicas, decide tratamientos, evalúa cierre de ciclo. |
| `program_specialist` | Program Specialist | Operación diaria: tareas, mensajes, incidencias, contacto con paciente. |
| `recepcion` | Recepción | Registra pacientes nuevos, gestiona agenda básica. |
| `ventas` | Ventas / Comercial | Maneja embudo, presupuestos, seguimiento de no convertidos. |
| `finanzas` | Finanzas | Confirma pagos, conciliaciones, ve márgenes. |

---

## Tabla de permisos

`R` = Lectura · `W` = Escritura · `—` = Sin acceso

### Pantallas

| Pantalla | Admin | Médico | P. Specialist | Recepción | Ventas | Finanzas |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Dashboard | RW | RW (filtrado) | RW (sin KPIs comerciales) | R (limitado) | R (sus métricas) | R (financieras) |
| Pacientes — lista | RW | R (asignados) | R (asignados) | RW (datos básicos) | R (en embudo) | R (con pagos) |
| Pacientes — datos clínicos | — | — | — | — | — | — |
| Ciclo de paciente | RW | RW | RW | — | R (sin tareas) | R (solo financiero) |
| Tareas de hoy | RW | R (sus pacientes) | RW | R (asignadas) | — | — |
| Mensajes pendientes | RW | R | RW | — | — | — |
| Solicitudes Médicas | RW | RW | R | — | R (sol. programa) | R (sol. programa) |
| Seguimiento Comercial | RW | R (sus pacientes, sin márgenes) | — | — | RW | R (sin márgenes) |
| Incidencias | RW | RW | RW | RW (crear) | RW (crear) | RW (crear) |
| Admisión | RW | — | — | RW | — | — |

### KPIs del dashboard según rol

El dashboard general muestra **solo KPIs operativos**. Las métricas comerciales (Conversión ventas, Presupuestos pendientes, Cierres del mes, Facturado) viven exclusivamente en la pantalla de Seguimiento Comercial — nunca en el dashboard, porque la Program Specialist y Recepción no deben verlas.

| KPI | Admin | Médico | P. Specialist | Recepción | Ventas | Finanzas |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Pacientes activos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tareas de hoy | ✓ | ✓ (suyas) | ✓ (suyas) | ✓ (suyas) | — | — |
| Tareas vencidas | ✓ | ✓ | ✓ | — | — | — |
| Mensajes pendientes | ✓ | ✓ | ✓ | — | — | — |
| Tasa respuesta paciente | ✓ | ✓ | ✓ | — | — | — |
| Métricas comerciales | ✓ (en pantalla Comercial) | ✓ (en pantalla Comercial) | — | — | ✓ (en pantalla Comercial) | ✓ (en pantalla Comercial, sin márgenes) |

### Datos sensibles

| Dato | Admin | Médico | P. Specialist | Recepción | Ventas | Finanzas |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Datos personales del paciente | RW | R | R | RW | R | R |
| Programa y ciclo | RW | RW | RW | R | R | R |
| Medicamento prescrito | RW | RW | R | — | — | — |
| Precios al paciente | RW | R | — | — | RW | R |
| **Márgenes / costos internos** | RW | — | — | — | — | RW |
| Pagos del paciente | RW | — | — | — | R | RW |
| Comprobantes / boletas | RW | — | — | — | R | RW |
| Mensajes WhatsApp | RW | R | RW | — | — | — |
| Solicitudes médicas | RW | RW (las que crea) | R | — | R (programa) | R (programa) |
| Historia clínica externa (link) | RW | RW | — | — | — | — |
| Configuración del sistema | RW | — | — | — | — | — |

### Acciones específicas

| Acción | Admin | Médico | P. Specialist | Recepción | Ventas | Finanzas |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Crear paciente | ✓ | — | — | ✓ | — | — |
| Crear Solicitud de Programa | ✓ | ✓ | — | — | — | — |
| Crear Solicitud Laboratorio/Imagen/Otra | ✓ | ✓ | — | — | — | — |
| Generar PDF de solicitud | ✓ | ✓ | — | — | — | — |
| Avanzar etapa kanban comercial | ✓ | — | — | — | ✓ | — |
| Confirmar pago | ✓ | — | — | — | — | ✓ |
| Activar ciclo | ✓ (auto) | — | — | — | — | (al confirmar pago, automático) |
| Marcar tarea como completada | ✓ | ✓ (las de sus pacientes) | ✓ | ✓ (las que ejecuta) | — | — |
| Reprogramar tarea | ✓ | ✓ | ✓ | ✓ | — | — |
| Marcar mensaje como enviado | ✓ | — | ✓ | — | — | — |
| Cerrar ciclo + decisión post-programa | ✓ | ✓ | — | — | — | — |
| Crear incidencia | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Resolver incidencia | ✓ | ✓ (médicas) | ✓ (operativas) | ✓ (recepción) | ✓ (comerciales) | ✓ (financieras) |

---

## Implementación en Apps Script

Cada endpoint de `API.gs` empieza con:

```javascript
function endpoint_getPatients() {
  const user = Auth.getCurrentUser();
  Auth.requirePermission(user, 'patients.read');

  let patients = Sheets.getAll('05_Pacientes');

  // Filtrado por rol
  if (user.rol === 'medico') {
    patients = patients.filter(p => p.medico_responsable === user.email);
  }
  if (user.rol === 'recepcion') {
    patients = patients.map(p => Auth.stripFields(p, ['medico_responsable', 'observaciones_internas']));
  }

  return patients;
}
```

`Auth.checkPermission()` consulta una matriz interna que es la misma de este documento.

---

## Filtrado de UI en frontend

El frontend además **oculta** elementos que el usuario no debe ver. Esto es solo cosmético — la verdadera seguridad está en el backend.

```javascript
// js/permissions.js
function canSee(action) {
  const role = window.currentUser.rol;
  return PERMISSION_MATRIX[action]?.includes(role);
}

// Uso en UI
if (!canSee('financial.margins')) {
  document.querySelectorAll('[data-requires="margins"]').forEach(el => el.style.display = 'none');
}
```

Toda etiqueta HTML con `data-requires="..."` se filtra al cargar la app según el rol.
