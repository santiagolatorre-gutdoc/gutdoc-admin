/**
 * api.js — Cliente API para GutDoc Admin
 *
 * FASE 6 A1: Autenticación por email manual
 * El usuario ingresa su email la primera vez (se guarda en localStorage)
 * Cada request envía el email para que el backend valide.
 */

const API_CONFIG = {
  USE_BACKEND: true,
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbziGqEaJISUiK1b2MCeNSA5O57mqKx1cuTA60YW2TVNl0BlVrd17qC5VwrSFJUD0L2f-w/exec',
  ALLOWED_DOMAIN: 'clinicagutdoc.com',
  STORAGE_KEY: 'gutdoc_user_email'
};

/**
 * Obtiene el email del usuario.
 * Si no está guardado, lo pide y valida el dominio.
 */
function getUserEmail() {
  let email = localStorage.getItem(API_CONFIG.STORAGE_KEY);

  if (!email) {
    email = promptForEmail();
    if (email) {
      localStorage.setItem(API_CONFIG.STORAGE_KEY, email);
    }
  }

  return email;
}

/**
 * Pide el email al usuario y valida el dominio.
 */
function promptForEmail() {
  let email = '';
  let valid = false;

  while (!valid) {
    email = prompt(
      '🔐 Inicio de sesión GutDoc Admin\n\n' +
      'Ingresa tu correo de Google Workspace:\n' +
      '(debe terminar en @' + API_CONFIG.ALLOWED_DOMAIN + ')'
    );

    if (email === null) {
      // Usuario canceló
      alert('No puedes usar el sistema sin autenticarte.');
      return null;
    }

    email = email.toLowerCase().trim();

    if (!email.endsWith('@' + API_CONFIG.ALLOWED_DOMAIN)) {
      alert('❌ Email inválido.\n\nDebe terminar en @' + API_CONFIG.ALLOWED_DOMAIN);
      continue;
    }

    valid = true;
  }

  return email;
}

/**
 * Cierra la sesión (borra el email guardado).
 */
function logout() {
  localStorage.removeItem(API_CONFIG.STORAGE_KEY);
  location.reload();
}

/**
 * Hace una llamada al backend Apps Script.
 */
async function callBackend(action, params = {}) {
  const userEmail = getUserEmail();
  if (!userEmail) {
    throw new Error('No hay usuario autenticado');
  }

  try {
    const response = await fetch(API_CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: action,
        params: params,
        userEmail: userEmail
      })
    });

    // Con mode:'no-cors' no podemos leer la respuesta
    // Por eso usamos mode normal abajo
    return null;

  } catch (err) {
    console.error('Backend error:', err);
    throw err;
  }
}

/**
 * Versión que SÍ lee la respuesta (sin no-cors).
 * Apps Script Web Apps de Google permiten esto desde cualquier dominio
 * cuando se despliegan como "Cualquier usuario".
 */
async function callBackendReal(action, params = {}) {
  const userEmail = getUserEmail();
  if (!userEmail) {
    throw new Error('No hay usuario autenticado');
  }

  try {
    const response = await fetch(API_CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: action,
        params: params,
        userEmail: userEmail
      }),
      redirect: 'follow'
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.data;

  } catch (err) {
    console.error('Backend error (' + action + '):', err);
    throw err;
  }
}

// ============================================================
// API Pública — todas las funciones que el frontend usa
// ============================================================

const API = {

  // ==================== AUTH ====================

  async checkSession() {
    return callBackendReal('auth.checkSession', {});
  },

  // ==================== PACIENTES ====================

  async getPatients() {
    return callBackendReal('patients.list', {});
  },

  async getPatient(id) {
    return callBackendReal('patients.get', { id: id });
  },

  async createPatient(data) {
    return callBackendReal('patients.create', { data: data });
  },

  async updatePatient(id, updates) {
    return callBackendReal('patients.update', { id: id, updates: updates });
  },

  // ==================== CICLOS ====================

  async getCycle(id) {
    return callBackendReal('cycles.get', { id: id });
  },

  async closeCycle(idCiclo, decision, observaciones) {
    return callBackendReal('cycles.close', {
      idCiclo: idCiclo,
      decision: decision,
      observaciones: observaciones
    });
  },

  // ==================== TAREAS ====================

  async getTodayTasks() {
    return callBackendReal('tasks.today', {});
  },

  async completeTask(idTarea, observaciones) {
    return callBackendReal('tasks.complete', {
      idTarea: idTarea,
      observaciones: observaciones
    });
  },

  async markTaskDesistida(idTarea, motivo) {
    return callBackendReal('tasks.markDesistida', {
      idTarea: idTarea,
      motivo: motivo
    });
  },

  async rescheduleTask(idTarea, nuevaFecha, motivo) {
    return callBackendReal('tasks.reschedule', {
      idTarea: idTarea,
      nuevaFecha: nuevaFecha,
      motivo: motivo
    });
  },

  // ==================== MENSAJES ====================

  async getMessageQueue() {
    return callBackendReal('messages.queue', {});
  },

  async markMessageSent(idCola) {
    return callBackendReal('messages.markSent', { idCola: idCola });
  },

  // ==================== SOLICITUDES MÉDICAS ====================

  async getSolicitudes() {
    return callBackendReal('solicitudes.list', {});
  },

  async createSolicitud(data) {
    return callBackendReal('solicitudes.create', { data: data });
  },

  async generateSolicitudPDF(idSolicitud) {
    return callBackendReal('solicitudes.generatePDF', { idSolicitud: idSolicitud });
  },

  // ==================== COMERCIAL ====================

  async getKanban() {
    return callBackendReal('commercial.kanban', {});
  },

  async updateStage(idSeguimiento, nuevoEstado, observaciones) {
    return callBackendReal('commercial.updateStage', {
      idSeguimiento: idSeguimiento,
      nuevoEstado: nuevoEstado,
      observaciones: observaciones
    });
  },

  // ==================== PAGOS ====================

  async confirmPayment(idPago) {
    return callBackendReal('payments.confirm', { idPago: idPago });
  },

  // ==================== INCIDENCIAS ====================

  async getIncidents() {
    return callBackendReal('incidents.list', {});
  },

  async createIncident(data) {
    return callBackendReal('incidents.create', { data: data });
  },

  async resolveIncident(idIncidencia, resolucion) {
    return callBackendReal('incidents.resolve', {
      idIncidencia: idIncidencia,
      resolucion: resolucion
    });
  },

  // ==================== MASTER DATA ====================

  async getMasterLabs() {
    return callBackendReal('master.labs', {});
  },

  async getMasterPrograms() {
    return callBackendReal('master.programs', {});
  },

  async getMasterServices() {
    return callBackendReal('master.services', {});
  },

  async getMasterProfesionales() {
    return callBackendReal('master.profesionales', {});
  },

  // ==================== DASHBOARD ====================

  async getDashboardMetrics() {
    return callBackendReal('dashboard.metrics', {});
  }
};

console.log('GutDoc API v2 (FASE 6 A1) — Auth por email');
