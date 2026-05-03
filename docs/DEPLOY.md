# Guía de Despliegue — GutDoc Admin

Sigue estos pasos en orden. Tiempo estimado total: 60-90 minutos la primera vez.

---

## 1. Crear el Google Sheet (10 min)

1. Crea un Google Sheet nuevo en la cuenta del workspace de GutClinic (ej: `sistema@gutclinic.com`).
2. Renómbralo a `GutDoc_Sistema_Maestro`.
3. Anota el **ID del Sheet** (lo encuentras en la URL: `https://docs.google.com/spreadsheets/d/{ESTE_ES_EL_ID}/edit`).
4. Sigue la plantilla en `sheets-template/PLANTILLA_GUTDOC.md` para crear las 33 pestañas con sus columnas.
5. **Comparte el Sheet** solo con cuentas de tu equipo. Permisos: solo "Editor" para Admin; los demás roles no necesitan acceso directo al Sheet (todo va vía la app).

---

## 2. Configurar Apps Script (20 min)

1. Desde el Sheet abierto: `Extensiones → Apps Script`.
2. Renombra el proyecto a `GutDoc Admin Backend`.
3. Crea los archivos `.gs` que están en la carpeta `/apps-script/` de este repo:
   - `Code.gs`
   - `Auth.gs`
   - `API.gs`
   - `Sheets.gs`
   - `PDF.gs`
   - `Logic.gs`
   - `Triggers.gs`
   - `Constants.gs`
4. **Configura las constantes** en `Constants.gs`:
   - `SHEET_ID` → el ID que anotaste en el paso 1
   - `DRIVE_FOLDER_PDF_SOLICITUDES` → ID de la carpeta de Drive donde se guardarán los PDFs (créala manualmente: `/GutDoc_Solicitudes/`)
   - `ADMIN_EMAILS` → lista de correos con rol "admin"
5. **Despliega como Web App**:
   - `Implementar → Nueva implementación → Tipo: aplicación web`
   - Ejecutar como: **el usuario que accede a la aplicación web**
   - Quién tiene acceso: **cualquier usuario en mi organización** (si tienes Workspace) o **cualquier usuario** (si no)
   - Copia la URL del Web App (la usarás en el paso 5)
6. **Configura los Triggers** (jobs automáticos):
   - Ejecuta una sola vez la función `setupTriggers()` desde el editor de Apps Script
   - Esto crea: trigger diario a las 7am (cola de mensajes), trigger horario (vencimiento de tareas), trigger semanal (resumen de KPIs)

---

## 3. Configurar permisos por rol (15 min)

1. Abre el Sheet, pestaña `03_Profesionales`.
2. Para cada miembro del equipo, agrega una fila con:
   - `email_workspace` (el correo de Google que usarán para entrar)
   - `nombre_completo`
   - `rol_sistema`: uno de `admin`, `medico`, `program_specialist`, `recepcion`, `ventas`, `finanzas`
   - `estado_activo`: `TRUE`
3. La matriz completa de permisos por rol está en `docs/ROLES.md`. Apps Script lee esta tabla cada vez que un usuario accede a un endpoint.

---

## 4. Crear las carpetas de Drive (5 min)

Crea esta estructura en Drive (en la cuenta del workspace):

```
GutDoc_Sistema/
├── Solicitudes/
│   └── 2026/
│       └── 05/         (carpetas se crean automáticamente por mes)
├── Plantillas/
│   ├── Plantilla_Solicitud_Programa.gdoc
│   ├── Plantilla_Solicitud_Laboratorio.gdoc
│   ├── Plantilla_Solicitud_Imagen.gdoc
│   └── Plantilla_Solicitud_Generica.gdoc
└── Backups/
    └── (Apps Script guarda aquí copias semanales del Sheet)
```

Anota los IDs de cada carpeta y plantilla y agrégalos a `Constants.gs`.

**Importante:** las plantillas son Google Docs con marcadores especiales que Apps Script reemplaza con datos del paciente. Ejemplo de marcador: `{{nombre_paciente}}`, `{{fecha_solicitud}}`, `{{lista_pruebas}}`, `{{firma_medico}}`.

---

## 5. Subir el frontend a GitHub Pages (15 min)

1. Crea un repositorio nuevo en GitHub: `gutdoc-admin`.
2. Sube el contenido de la carpeta del proyecto (sin la carpeta `apps-script/` ni `sheets-template/`).
3. Edita `js/api.js` y reemplaza `APPS_SCRIPT_URL` con la URL del Web App (paso 2.5).
4. Activa GitHub Pages: `Settings → Pages → Source: main → /` (root).
5. La app estará disponible en `https://{tu-usuario}.github.io/gutdoc-admin/`.

**Recomendado:** configura un dominio personalizado (ej: `admin.gutclinic.com`) para que el equipo no tenga que recordar la URL larga.

---

## 6. Pruebas iniciales (15 min)

1. Abre la app en tu navegador, inicia sesión con tu cuenta del workspace.
2. Verifica que veas el dashboard con tu nombre y rol.
3. Crea un paciente de prueba en Admisión.
4. Crea una Solicitud de Programa para ese paciente.
5. Verifica que aparezca en el Embudo Comercial.
6. Avanza la solicitud a "Pagado" → debe activarse el ciclo automáticamente con sus tareas.
7. Verifica que las tareas aparezcan en `Tareas de hoy` (las del primer día).
8. Crea una Solicitud de Laboratorio → verifica que se genere el PDF en Drive.

Si algo falla, revisa los logs en Apps Script: `Ver → Registros`.

---

## 7. Próximos pasos (no urgentes)

- **Configurar Make + WhatsApp Business API** para automatizar envío de mensajes (ahora son manuales).
- **Crear datos semilla**: cargar las 15 variantes de programas, los 20 servicios, el master de laboratorios completo, las plantillas de mensajes educativos por semana y fase.
- **Backup automático**: la función `weeklyBackup()` ya está en `Triggers.gs`, solo verifica que esté activa.
- **Custom domain**: redirigir `admin.gutclinic.com` a GitHub Pages.

---

## Solución de problemas comunes

**"Authorization required"** al ejecutar Apps Script por primera vez → es normal. Aprueba los permisos. Apps Script necesita acceso a Sheets, Drive, Documents, Triggers.

**El frontend muestra "Network error"** → revisa que la URL en `api.js` esté correcta y que el Web App de Apps Script esté desplegado.

**Un usuario no puede entrar** → verifica que su email esté en `03_Profesionales` con `estado_activo = TRUE`.

**El PDF se genera pero está vacío** → verifica los IDs de las plantillas en `Constants.gs`. Las plantillas deben ser Google Docs (no PDFs ni Word).
