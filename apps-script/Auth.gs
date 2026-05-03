/**
 * Auth.gs — Autenticación y autorización por rol
 *
 * Apps Script ejecuta como el usuario activo (configurado en el deploy).
 * Esto significa que Session.getActiveUser().getEmail() devuelve el correo
 * de quien está usando la app, y Apps Script accede al Sheet con SUS permisos.
 *
 * Para que esto funcione, el Sheet debe estar compartido como mínimo en
 * "lectura" con todos los usuarios autorizados. La capa de permisos por rol
 * la implementamos nosotros aquí.
 */

const Auth = {

  /**
   * Devuelve los datos del usuario activo, o null si no es válido.
   */
  getCurrentUser() {
    const email = Session.getActiveUser().getEmail();
    if (!email) return null;

    // Validar dominio
    const allowedDomain = getConfig('ALLOWED_DOMAIN', ALLOWED_DOMAIN);
    if (allowedDomain && !email.endsWith('@' + allowedDomain) && !ADMIN_EMAILS.includes(email)) {
      return null;
    }

    // Buscar al usuario en 03_Profesionales
    const profile = Sheets.findOne(TABS.PROFESIONALES, { email_workspace: email });
    if (!profile || profile.estado_activo !== true) return null;

    return {
      email: email,
      id_profesional: profile.id_profesional,
      nombre: profile.nombre_completo,
      rol: profile.rol_sistema,
      especialidad: profile.especialidad,
      cmp: profile.cmp || null
    };
  },

  /**
   * Lanza error si el usuario no tiene el permiso solicitado.
   */
  requirePermission(user, action) {
    if (!user) throw new Error('Unauthorized');
    if (user.rol === 'admin') return; // Admin tiene acceso a todo
    if (!this.hasPermission(user.rol, action)) {
      throw new Error(`Permiso denegado: ${user.rol} no puede ejecutar ${action}`);
    }
  },

  /**
   * Verifica si un rol tiene un permiso específico.
   */
  hasPermission(rol, action) {
    return PERMISSIONS[action]?.includes(rol) || false;
  },

  /**
   * Filtra campos sensibles de un objeto según el rol del usuario.
   */
  stripFields(record, fieldsToRemove) {
    const copy = Object.assign({}, record);
    fieldsToRemove.forEach(f => delete copy[f]);
    return copy;
  },

  /**
   * Filtra una lista de registros de pacientes según el rol.
   */
  filterPatientsByRole(patients, user) {
    switch (user.rol) {
      case 'admin':
        return patients;
      case 'medico':
        return patients.filter(p => p.id_medico_responsable === user.id_profesional);
      case 'program_specialist':
        return patients.filter(p => p.id_program_specialist === user.id_profesional);
      case 'recepcion':
        // Recepción ve todos pero sin observaciones internas
        return patients.map(p => this.stripFields(p, ['observaciones_internas', 'datos_clinicos_link']));
      case 'ventas':
        // Ventas ve los que están en embudo o en programa activo
        return patients.filter(p => ['prospecto', 'en_seguimiento_comercial', 'en_programa', 'completado'].includes(p.estado_paciente));
      case 'finanzas':
        // Finanzas ve los que tienen actividad financiera
        return patients;
      default:
        return [];
    }
  }
};

/**
 * Matriz de permisos por rol.
 * Cada acción mapea a la lista de roles que pueden ejecutarla.
 * (Admin siempre tiene acceso, no se incluye explícitamente.)
 */
const PERMISSIONS = {
  // Pacientes
  'patients.read':           ['medico', 'program_specialist', 'recepcion', 'ventas', 'finanzas'],
  'patients.create':         ['recepcion'],
  'patients.update':         ['medico', 'recepcion'],

  // Solicitudes médicas
  'solicitudes_medicas.read':   ['medico', 'program_specialist', 'ventas', 'finanzas'],
  'solicitudes_medicas.create': ['medico'],
  'solicitudes_medicas.update': ['medico'],

  // Tareas
  'tasks.read':              ['medico', 'program_specialist', 'recepcion'],
  'tasks.complete':          ['medico', 'program_specialist', 'recepcion'],
  'tasks.reschedule':        ['medico', 'program_specialist', 'recepcion'],

  // Mensajes
  'messages.read':           ['medico', 'program_specialist'],
  'messages.send':           ['program_specialist'],

  // Comercial
  'commercial.read':         ['ventas', 'finanzas', 'medico'],
  'commercial.update_stage': ['ventas'],
  'commercial.create_quote': ['ventas'],

  // Pagos
  'payments.read':           ['ventas', 'finanzas'],
  'payments.confirm':        ['finanzas'],

  // Márgenes (solo admin y finanzas)
  'financial.margins':       ['finanzas'],

  // Ciclos
  'cycles.read':             ['medico', 'program_specialist'],
  'cycles.close':            ['medico'],

  // Incidencias
  'incidents.read':          ['medico', 'program_specialist', 'recepcion', 'ventas', 'finanzas'],
  'incidents.create':        ['medico', 'program_specialist', 'recepcion', 'ventas', 'finanzas'],
  'incidents.resolve':       ['medico', 'program_specialist', 'recepcion', 'ventas', 'finanzas'],

  // PDF
  'pdf.generate':            ['medico'],

  // Configuración
  'config.read':             [],  // Solo admin
  'config.update':           []   // Solo admin
};
