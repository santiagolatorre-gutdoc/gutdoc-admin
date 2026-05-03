/**
 * Constants.gs — Configuración central del sistema GutDoc Admin
 *
 * IMPORTANTE: Estos valores deben configurarse antes del primer despliegue.
 * No commitear con valores reales — usar PropertiesService para producción.
 */

// ============================================================
// IDs DE GOOGLE
// ============================================================

const SHEET_ID = 'REEMPLAZAR_CON_ID_DEL_SHEET';
const DRIVE_FOLDER_PDF_SOLICITUDES = 'REEMPLAZAR_CON_ID_CARPETA_PDFS';
const DRIVE_FOLDER_TEMP = 'REEMPLAZAR_CON_ID_CARPETA_TEMP';
const DRIVE_FOLDER_BACKUPS = 'REEMPLAZAR_CON_ID_CARPETA_BACKUPS';

// IDs de las plantillas de Google Docs para PDFs
const PDF_TEMPLATES = {
  programa:     'REEMPLAZAR_PLANTILLA_PROGRAMA',
  laboratorio:  'REEMPLAZAR_PLANTILLA_LABORATORIO',
  imagen:       'REEMPLAZAR_PLANTILLA_IMAGEN',
  interconsulta:'REEMPLAZAR_PLANTILLA_GENERICA',
  nutricion:    'REEMPLAZAR_PLANTILLA_GENERICA',
  psicologia:   'REEMPLAZAR_PLANTILLA_GENERICA',
  psiquiatria:  'REEMPLAZAR_PLANTILLA_GENERICA',
  otro:         'REEMPLAZAR_PLANTILLA_GENERICA'
};

// ============================================================
// CUENTAS Y SEGURIDAD
// ============================================================

const ADMIN_EMAILS = [
  'admin@gutclinic.com',
  'santiago@gutclinic.com'
];

// Dominio del workspace — solo emails con este dominio pueden acceder
const ALLOWED_DOMAIN = 'gutclinic.com';

// ============================================================
// NOMBRES DE PESTAÑAS DEL SHEET
// ============================================================

const TABS = {
  CATALOGOS:        '01_Catalogos',
  SERVICIOS:        '02_Servicios',
  PROFESIONALES:    '03_Profesionales',
  PROGRAMAS:        '04_Programas',
  PACIENTES:        '05_Pacientes',
  CONSENTIMIENTO:   '06_Consentimiento_WA',
  SOL_PROGRAMA:     '07_Solicitudes_Programa',
  SEG_COMERCIAL:    '08_Seguimiento_Comercial',
  PAGOS:            '09_Pagos',
  CICLOS:           '10_Ciclos_Paciente',
  COMPONENTES:      '11_Componentes_Paciente',
  PROTOCOLO_TAREAS: '12_Protocolo_Tareas',
  TAREAS:           '13_Tareas_Paciente',
  DECISIONES:       '14_Decisiones_Post_Programa',
  MICRODOSIF:       '15_Microdosificacion',
  REPROG:           '16_Reprogramaciones',
  INCIDENCIAS:      '17_Incidencias',
  SOL_MEDICAS:      '18_Solicitudes_Medicas',
  SEG_LP:           '19_Seguimientos_LP',
  BIBLIO_VIDEOS:    '20_Biblioteca_Videos',
  SUBSTACK:         '21_Substack_Links',
  CONST_COMUN:      '22_Constantes_Comunicacion',
  PLANTILLA_COMP:   '23_Plantilla_Composicion',
  MENSAJES:         '24_Mensajes',
  PLANT_WA:         '25_Plantillas_WhatsApp',
  COLA_MENSAJES:    '26_Cola_Mensajes',
  HIST_ENVIOS:      '27_Historial_Envios',
  RESPUESTAS:       '28_Respuestas_Pacientes',
  RECORDATORIOS:    '29_Recordatorios',
  ERRORES_ENVIO:    '30_Errores_Envio',
  KPIS_DEF:         '31_KPIs_Definicion',
  METRICAS:         '32_Metricas_Snapshot',
  MASTER_LABS:      '33_Master_Laboratorios',
  CAMPANAS:         '34_Campanas',
  AUDIT_LOG:        '_AUDIT_LOG'
};

// ============================================================
// TIMEZONE
// ============================================================

const TZ = 'America/Lima';

// ============================================================
// HELPER: obtener configuración de PropertiesService (producción)
// ============================================================

function getConfig(key, fallback) {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty(key) || fallback;
}

/**
 * setupConfig() — Ejecutar UNA SOLA VEZ desde el editor de Apps Script
 * para guardar las constantes en el almacén de propiedades del proyecto
 * en lugar de tenerlas hardcoded.
 */
function setupConfig() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    SHEET_ID: SHEET_ID,
    DRIVE_FOLDER_PDF_SOLICITUDES: DRIVE_FOLDER_PDF_SOLICITUDES,
    DRIVE_FOLDER_TEMP: DRIVE_FOLDER_TEMP,
    ALLOWED_DOMAIN: ALLOWED_DOMAIN
  });
  Logger.log('Configuración guardada correctamente.');
}
