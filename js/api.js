/**
 * api.js — Cliente API para GutDoc Admin
 *
 * FASE 5 (Ruta A — modo mock): cada función devuelve datos del objeto MOCK.
 * FASE 6 (cuando esté el Apps Script desplegado): se cambia USE_BACKEND a true
 * y todas las funciones pasan a hacer fetch real al endpoint.
 *
 * La interfaz es idéntica entre ambos modos — el resto del código
 * (app.js y screens) NO se entera del cambio.
 */

const API_CONFIG = {
  // Cambia a true cuando el backend Apps Script esté desplegado
  USE_BACKEND: true,

  // URL del Web App de Apps Script (reemplazar al desplegar)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwttrJjY1B6DqTtq8-dZxLhRHGgcN_KlOOL0fckYX0vZhlOAj5Jdp6DBg-Us6bifcZUJw/exec',

  // Latencia simulada del mock (ms) para que se sienta "real"
  MOCK_LATENCY_MS: 200
};

/**
 * Helper: simular latencia de red
 */
function mockDelay() {
  return new Promise(resolve => setTimeout(resolve, API_CONFIG.MOCK_LATENCY_MS));
}

/**
 * Helper: hacer petición real al backend Apps Script
 */
async function callBackend(action, params = {}) {
  const response = await fetch(API_CONFIG.APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action, params })
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const json = await response.json();
  if (json.error) throw new Error(json.error);

  return json.data;
}

// ============================================================
// API PÚBLICA — usada por app.js y screens
// ============================================================

const api = {

  // ===== AUTH =====

  async checkSession() {
    if (API_CONFIG.USE_BACKEND) return callBackend('auth.checkSession');
    await mockDelay();
    return { authenticated: true, user: MOCK.currentUser };
  },

  // ===== PACIENTES =====

  async getPatients() {
    if (API_CONFIG.USE_BACKEND) return callBackend('patients.list');
    await mockDelay();
    return MOCK.pacientes;
  },

  async getPatient(id) {
    if (API_CONFIG.USE_BACKEND) return callBackend('patients.get', { id });
    await mockDelay();
    return MOCK.pacientes.find(p => p.id_paciente === id) || null;
  },

  async createPatient(data) {
    if (API_CONFIG.USE_BACKEND) return callBackend('patients.create', { data });
    await mockDelay();
    const id = `PAC-${String(MOCK.pacientes.length + 1).padStart(5, '0')}`;
    const patient = { id_paciente: id, ...data, fecha_creacion: new Date(), estado_paciente: 'prospecto' };
    MOCK.pacientes.push(patient);
    return patient;
  },

  // ===== TAREAS =====

  async getTasksToday() {
    if (API_CONFIG.USE_BACKEND) return callBackend('tasks.today');
    await mockDelay();
    return [];  // Los datos están hardcoded en el HTML del v5
  },

  async completeTask(idTarea, observaciones) {
    if (API_CONFIG.USE_BACKEND) return callBackend('tasks.complete', { idTarea, observaciones });
    await mockDelay();
    return { success: true };
  },

  async rescheduleTask(idTarea, nuevaFecha, motivo) {
    if (API_CONFIG.USE_BACKEND) return callBackend('tasks.reschedule', { idTarea, nuevaFecha, motivo });
    await mockDelay();
    return { success: true };
  },

  // ===== MENSAJES =====

  async getMessageQueue() {
    if (API_CONFIG.USE_BACKEND) return callBackend('messages.queue');
    await mockDelay();
    return [];
  },

  async markMessageSent(idCola) {
    if (API_CONFIG.USE_BACKEND) return callBackend('messages.markSent', { idCola });
    await mockDelay();
    return { success: true };
  },

  // ===== SOLICITUDES MÉDICAS =====

  async getSolicitudesMedicas() {
    if (API_CONFIG.USE_BACKEND) return callBackend('solicitudes.list');
    await mockDelay();
    return [];
  },

  async createSolicitudMedica(data) {
    if (API_CONFIG.USE_BACKEND) return callBackend('solicitudes.create', { data });
    await mockDelay();
    const prefix = data.tipo_solicitud === 'programa' ? 'SPG' : 'SOL';
    const id = `${prefix}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
    return { id_solicitud_medica: id, ...data, fecha_solicitud: new Date(), estado: 'pendiente' };
  },

  async generateSolicitudPDF(idSolicitud) {
    if (API_CONFIG.USE_BACKEND) return callBackend('solicitudes.generatePDF', { idSolicitud });
    await mockDelay();
    // En modo mock, devuelve URL ficticia
    return { pdf_url: `https://drive.google.com/file/d/MOCK_${idSolicitud}/view` };
  },

  // ===== COMERCIAL =====

  async getKanban() {
    if (API_CONFIG.USE_BACKEND) return callBackend('commercial.kanban');
    await mockDelay();
    return [];
  },

  async updateKanbanStage(idSeguimiento, nuevoEstado, observaciones) {
    if (API_CONFIG.USE_BACKEND) return callBackend('commercial.updateStage', { idSeguimiento, nuevoEstado, observaciones });
    await mockDelay();
    return { success: true };
  },

  // ===== PAGOS =====

  async confirmPayment(idPago) {
    if (API_CONFIG.USE_BACKEND) return callBackend('payments.confirm', { idPago });
    await mockDelay();
    return { success: true, ciclo_activado: true };
  },

  // ===== INCIDENCIAS =====

  async getIncidents() {
    if (API_CONFIG.USE_BACKEND) return callBackend('incidents.list');
    await mockDelay();
    return [];
  },

  async createIncident(data) {
    if (API_CONFIG.USE_BACKEND) return callBackend('incidents.create', { data });
    await mockDelay();
    return { id_incidencia: `INC-${Date.now()}`, ...data };
  },

  async resolveIncident(idIncidencia, resolucion) {
    if (API_CONFIG.USE_BACKEND) return callBackend('incidents.resolve', { idIncidencia, resolucion });
    await mockDelay();
    return { success: true };
  },

  // ===== MASTER DATA =====

  async getLabsMaster() {
    if (API_CONFIG.USE_BACKEND) return callBackend('master.labs');
    await mockDelay();
    return MOCK.master_labs;
  },

  async getProgramsMaster() {
    if (API_CONFIG.USE_BACKEND) return callBackend('master.programs');
    await mockDelay();
    return MOCK.programas;
  },

  async getServicesMaster() {
    if (API_CONFIG.USE_BACKEND) return callBackend('master.services');
    await mockDelay();
    return MOCK.servicios;
  },

  // ===== DASHBOARD =====

  async getDashboardMetrics() {
    if (API_CONFIG.USE_BACKEND) return callBackend('dashboard.metrics');
    await mockDelay();
    return {
      pacientes_activos: MOCK.pacientes.filter(p => p.estado_paciente === 'en_programa').length,
      tareas_hoy: 8,
      mensajes_pendientes: 9,
      incidencias_criticas: 2,
      ciclos_decision_pendiente: 1
    };
  }
};

// Exponer global
window.api = api;
