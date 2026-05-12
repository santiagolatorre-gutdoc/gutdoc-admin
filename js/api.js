/**
 * api.js — Cliente API para GutDoc Admin
 *
 * FASE 5 (Ruta A — modo mock): cada función devuelve datos del objeto MOCK.
 * FASE 6 (cuando esté el Apps Script desplegado): se cambia USE_BACKEND a true
 *   y todas las funciones pasan a hacer fetch real al endpoint.
 *
 * La interfaz es idéntica entre ambos modos — el resto del código
 * (app.js y screens) NO se entera del cambio.
 */

const API_CONFIG = {
  // Cambia a true cuando el backend Apps Script esté desplegado
  USE_BACKEND: false,

  // URL del Web App de Apps Script (reemplazar al desplegar)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/REEMPLAZAR_CON_TU_URL_DEL_WEB_APP/exec',

  // Latencia simulada del mock (ms) para que se sienta "real"
  MOCK_LATENCY_MS: 200
};

/**
 * Helper: simular delay de red en modo mock
 */
function mockDelay() {
  return new Promise(resolve => setTimeout(resolve, API_CONFIG.MOCK_LATENCY_MS));
}

/**
 * Helper: hacer fetch al backend de Apps Script
 */
async function callBackend(action, params) {
  if (params === undefined) params = {};
  try {
    const response = await fetch(API_CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, params: params })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.data;
  } catch (err) {
    console.error('Backend error (' + action + '):', err);
    throw err;
  }
}

// ============================================================
// API Pública
// ============================================================

const API = {

  // ==================== AUTH ====================

  async checkSession() {
    if (API_CONFIG.USE_BACKEND) return callBackend('auth.checkSession');
    await mockDelay();
    return {
      authenticated: true,
      user: MOCK.usuario_activo
    };
  },

  // ==================== PACIENTES ====================

  async getPatients() {
    if (API_CONFIG.USE_BACKEND) return callBackend('patients.list');
    await mockDelay();
    return MOCK.pacientes;
  },

  async getPatient(id) {
    if (API_CONFIG.USE_BACKEND) return callBackend('patients.get', { id: id });
    await mockDelay();
    return MOCK.pacientes.find(function(p) { return p.id_paciente === id; });
  },

  async createPatient(data) {
    if (API_CONFIG.USE_BACKEND) return callBackend('patients.create', { data: data });
    await mockDelay();
    return Object.assign({}, data, { id_paciente: 'PAC-NEW' });
  },

  async updatePatient(id, updates) {
    if (API_CONFIG.USE_BACKEND) return callBackend('patients.update', { id: id, updates: updates });
    await mockDelay();
    return Object.assign({ id_paciente: id }, updates);
  },

  // ==================== TAREAS ====================

  async getTodayTasks() {
    if (API_CONFIG.USE_BACKEND) return callBackend('tasks.today');
    await mockDelay();
    return MOCK.tareas_hoy || [];
  },

  async completeTask(idTarea, observaciones) {
    if (API_CONFIG.USE_BACKEND) return callBackend('tasks.complete', { idTarea: idTarea, observaciones: observaciones });
    await mockDelay();
    return { id_tarea: idTarea, estado: 'completada' };
  },

  async rescheduleTask(idTarea, nuevaFecha, motivo) {
    if (API_CONFIG.USE_BACKEND) return callBackend('tasks.reschedule', { idTarea: idTarea, nuevaFecha: nuevaFecha, motivo: motivo });
    await mockDelay();
    return { id_tarea: idTarea, fecha_programada: nuevaFecha };
  },

  // ==================== MENSAJES ====================

  async getMessageQueue() {
    if (API_CONFIG.USE_BACKEND) return callBackend('messages.queue');
    await mockDelay();
    return MOCK.mensajes_pendientes || [];
  },

  async markMessageSent(idCola) {
    if (API_CONFIG.USE_BACKEND) return callBackend('messages.markSent', { idCola: idCola });
    await mockDelay();
    return { id_cola_mensaje: idCola, estado: 'enviado' };
  },

  // ==================== SOLICITUDES MÉDICAS ====================

  async getSolicitudes() {
    if (API_CONFIG.USE_BACKEND) return callBackend('solicitudes.list');
    await mockDelay();
    return MOCK.solicitudes_medicas || [];
  },

  async createSolicitud(data) {
    if (API_CONFIG.USE_BACKEND) return callBackend('solicitudes.create', { data: data });
    await mockDelay();
    return Object.assign({}, data, { id_solicitud_medica: 'SOL-NEW' });
  },

  // ==================== COMERCIAL ====================

  async getKanban() {
    if (API_CONFIG.USE_BACKEND) return callBackend('commercial.kanban');
    await mockDelay();
    return MOCK.kanban || [];
  },

  async updateStage(idSeguimiento, nuevoEstado, observaciones) {
    if (API_CONFIG.USE_BACKEND) return callBackend('commercial.updateStage', { idSeguimiento: idSeguimiento, nuevoEstado: nuevoEstado, observaciones: observaciones });
    await mockDelay();
    return { id_seguimiento: idSeguimiento, estado_comercial: nuevoEstado };
  },

  // ==================== INCIDENCIAS ====================

  async getIncidents() {
    if (API_CONFIG.USE_BACKEND) return callBackend('incidents.list');
    await mockDelay();
    return MOCK.incidencias || [];
  },

  // ==================== MASTER DATA ====================

  async getMasterLabs() {
    if (API_CONFIG.USE_BACKEND) return callBackend('master.labs');
    await mockDelay();
    return MOCK.master_labs || [];
  },

  async getMasterPrograms() {
    if (API_CONFIG.USE_BACKEND) return callBackend('master.programs');
    await mockDelay();
    return MOCK.programas || [];
  },

  // ==================== DASHBOARD ====================

  async getDashboardMetrics() {
    if (API_CONFIG.USE_BACKEND) return callBackend('dashboard.metrics');
    await mockDelay();
    return MOCK.dashboard_metrics || {
      pacientes_activos: 0,
      tareas_hoy: 0,
      mensajes_pendientes: 0,
      incidencias_criticas: 0
    };
  }
};

console.log('GutDoc API v1 — Modo:', API_CONFIG.USE_BACKEND ? 'BACKEND' : 'MOCK');
