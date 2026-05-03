/**
 * API.gs — Endpoints REST que el frontend consume
 *
 * Convención: API.modulo_accion(params)
 * Cada acción valida permisos antes de ejecutar.
 *
 * El frontend llama así:
 *   fetch(APPS_SCRIPT_URL, {
 *     method: 'POST',
 *     body: JSON.stringify({ action: 'patients.list', params: {} })
 *   })
 */

const API = {

  // ============================================================
  // AUTH
  // ============================================================

  'auth.checkSession': function(params) {
    const user = Auth.getCurrentUser();
    if (!user) return { authenticated: false };
    return {
      authenticated: true,
      user: {
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        especialidad: user.especialidad
      }
    };
  },

  // ============================================================
  // PACIENTES
  // ============================================================

  'patients.list': function(params) {
    Auth.requirePermission(params._user, 'patients.read');
    const all = Sheets.getAll(TABS.PACIENTES);
    return Auth.filterPatientsByRole(all, params._user);
  },

  'patients.get': function(params) {
    Auth.requirePermission(params._user, 'patients.read');
    const patient = Sheets.findOne(TABS.PACIENTES, { id_paciente: params.id });
    if (!patient) throw new Error('Paciente no encontrado');
    // Aplica filtros según rol
    return Auth.filterPatientsByRole([patient], params._user)[0];
  },

  'patients.create': function(params) {
    Auth.requirePermission(params._user, 'patients.create');
    const data = params.data;
    data.id_profesional_creador = params._user.id_profesional;
    data.fecha_creacion = new Date();
    data.estado_paciente = 'prospecto';
    return Sheets.insert(TABS.PACIENTES, data);
  },

  'patients.update': function(params) {
    Auth.requirePermission(params._user, 'patients.update');
    return Sheets.update(TABS.PACIENTES, { id_paciente: params.id }, params.updates);
  },

  // ============================================================
  // CICLOS DE PACIENTE
  // ============================================================

  'cycles.get': function(params) {
    Auth.requirePermission(params._user, 'cycles.read');
    const ciclo = Sheets.findOne(TABS.CICLOS, { id_ciclo: params.id });
    if (!ciclo) throw new Error('Ciclo no encontrado');

    // Enriquecer con datos relacionados
    return {
      ciclo: ciclo,
      paciente: Sheets.findOne(TABS.PACIENTES, { id_paciente: ciclo.id_paciente }),
      programa: Sheets.findOne(TABS.PROGRAMAS, { id_programa: ciclo.id_programa }),
      componentes: Sheets.findMany(TABS.COMPONENTES, { id_ciclo: ciclo.id_ciclo }),
      tareas: Sheets.findMany(TABS.TAREAS, { id_ciclo: ciclo.id_ciclo })
    };
  },

  'cycles.close': function(params) {
    Auth.requirePermission(params._user, 'cycles.close');
    return Logic.closeCycle(params.idCiclo, params.decision, params.observaciones, params._user);
  },

  // ============================================================
  // TAREAS
  // ============================================================

  'tasks.today': function(params) {
    Auth.requirePermission(params._user, 'tasks.read');
    const today = new Date();
    const todayStr = Utilities.formatDate(today, TZ, 'yyyy-MM-dd');

    let tasks = Sheets.findMany(TABS.TAREAS, {
      estado_tarea: ['programada', 'en_proceso', 'vencida']
    });

    tasks = tasks.filter(t => {
      const tFecha = Utilities.formatDate(new Date(t.fecha_programada), TZ, 'yyyy-MM-dd');
      return tFecha <= todayStr;
    });

    // Filtrar por usuario si no es admin
    if (params._user.rol !== 'admin') {
      tasks = tasks.filter(t =>
        t.id_responsable_ejecucion === params._user.id_profesional ||
        t.id_program_specialist === params._user.id_profesional
      );
    }

    return tasks;
  },

  'tasks.complete': function(params) {
    Auth.requirePermission(params._user, 'tasks.complete');
    const updates = {
      estado_tarea: 'completada',
      fecha_completada: new Date(),
      id_completada_por: params._user.id_profesional,
      observaciones_completion: params.observaciones || ''
    };
    const result = Sheets.update(TABS.TAREAS, { id_tarea: params.idTarea }, updates);

    // Si era una aplicación, recalcular Consulta de Resultados
    if (result?.tipo_hito === 'aplicacion') {
      Logic.recalculateConsultaResultados(result.id_ciclo);
    }

    return result;
  },

  'tasks.markDesistida': function(params) {
    Auth.requirePermission(params._user, 'tasks.complete');
    return Sheets.update(TABS.TAREAS, { id_tarea: params.idTarea }, {
      estado_tarea: 'desistida_paciente',
      motivo_desistimiento: params.motivo,
      fecha_completada: new Date(),
      id_completada_por: params._user.id_profesional
    });
  },

  'tasks.reschedule': function(params) {
    Auth.requirePermission(params._user, 'tasks.reschedule');
    return Logic.rescheduleTask(params.idTarea, params.nuevaFecha, params.motivo, params._user);
  },

  // ============================================================
  // MENSAJES
  // ============================================================

  'messages.queue': function(params) {
    Auth.requirePermission(params._user, 'messages.read');
    return Sheets.findMany(TABS.COLA_MENSAJES, { estado: 'pendiente' });
  },

  'messages.markSent': function(params) {
    Auth.requirePermission(params._user, 'messages.send');
    Sheets.update(TABS.COLA_MENSAJES, { id_cola_mensaje: params.idCola }, {
      estado: 'enviado',
      fecha_envio_real: new Date(),
      id_enviado_por: params._user.id_profesional
    });
    return Sheets.insert(TABS.HIST_ENVIOS, {
      id_cola_mensaje: params.idCola,
      fecha_envio: new Date(),
      enviado_por: params._user.id_profesional,
      canal: 'whatsapp_manual'
    });
  },

  // ============================================================
  // SOLICITUDES MÉDICAS
  // ============================================================

  'solicitudes.list': function(params) {
    Auth.requirePermission(params._user, 'solicitudes_medicas.read');
    let all = Sheets.getAll(TABS.SOL_MEDICAS);
    if (params._user.rol === 'medico') {
      all = all.filter(s => s.id_medico_solicitante === params._user.id_profesional);
    }
    return all;
  },

  'solicitudes.create': function(params) {
    Auth.requirePermission(params._user, 'solicitudes_medicas.create');
    const data = params.data;
    data.id_medico_solicitante = params._user.id_profesional;
    data.fecha_solicitud = new Date();
    data.estado = 'pendiente';

    const sol = Sheets.insert(TABS.SOL_MEDICAS, data);

    // Si es solicitud de programa, crear también en 07_Solicitudes_Programa y 08_Seguimiento_Comercial
    if (data.tipo_solicitud === 'programa') {
      Logic.createCommercialFunnelEntry(sol, params._user);
    }

    // Generar PDF si se solicitó
    if (data.requiere_pdf) {
      const pdfUrl = PDF.generateSolicitudPDF(sol.id_solicitud_medica);
      sol.pdf_url = pdfUrl;
    }

    return sol;
  },

  'solicitudes.generatePDF': function(params) {
    Auth.requirePermission(params._user, 'pdf.generate');
    const url = PDF.generateSolicitudPDF(params.idSolicitud);
    return { pdf_url: url };
  },

  // ============================================================
  // COMERCIAL
  // ============================================================

  'commercial.kanban': function(params) {
    Auth.requirePermission(params._user, 'commercial.read');
    const seguimientos = Sheets.getAll(TABS.SEG_COMERCIAL);
    // Filtrar márgenes si el rol no los puede ver
    if (!Auth.hasPermission(params._user.rol, 'financial.margins')) {
      return seguimientos.map(s => Auth.stripFields(s, ['margen_estimado', 'costo_interno']));
    }
    return seguimientos;
  },

  'commercial.updateStage': function(params) {
    Auth.requirePermission(params._user, 'commercial.update_stage');
    const updates = {
      estado_comercial: params.nuevoEstado,
      fecha_ultima_actualizacion: new Date(),
      id_actualizado_por: params._user.id_profesional
    };
    if (params.observaciones) updates.observaciones = params.observaciones;

    const result = Sheets.update(TABS.SEG_COMERCIAL, { id_seguimiento: params.idSeguimiento }, updates);

    // Si pasa a "pagado", podría disparar activación de ciclo (depende de Pagos)
    if (params.nuevoEstado === 'pagado') {
      Logic.tryActivateCycle(result);
    }

    return result;
  },

  // ============================================================
  // PAGOS
  // ============================================================

  'payments.confirm': function(params) {
    Auth.requirePermission(params._user, 'payments.confirm');
    const pago = Sheets.update(TABS.PAGOS, { id_pago: params.idPago }, {
      confirmado_por_finanzas: true,
      fecha_confirmacion: new Date(),
      id_confirmado_por: params._user.id_profesional
    });

    // Si dispara activación, lanzar ciclo
    if (pago.dispara_activacion_programa) {
      Logic.activateCycle(pago);
    }

    return pago;
  },

  // ============================================================
  // INCIDENCIAS
  // ============================================================

  'incidents.list': function(params) {
    Auth.requirePermission(params._user, 'incidents.read');
    return Sheets.findMany(TABS.INCIDENCIAS, { estado: ['abierta', 'en_proceso', 'en_espera_paciente'] });
  },

  'incidents.create': function(params) {
    Auth.requirePermission(params._user, 'incidents.create');
    const data = params.data;
    data.id_creador = params._user.id_profesional;
    data.fecha_creacion = new Date();
    data.estado = 'abierta';
    return Sheets.insert(TABS.INCIDENCIAS, data);
  },

  'incidents.resolve': function(params) {
    Auth.requirePermission(params._user, 'incidents.resolve');
    return Sheets.update(TABS.INCIDENCIAS, { id_incidencia: params.idIncidencia }, {
      estado: 'resuelta',
      fecha_resolucion: new Date(),
      id_resolutor: params._user.id_profesional,
      resolucion: params.resolucion || ''
    });
  },

  // ============================================================
  // MASTER DATA
  // ============================================================

  'master.labs': function(params) {
    return Sheets.findMany(TABS.MASTER_LABS, { estado: 'activo' });
  },

  'master.programs': function(params) {
    return Sheets.findMany(TABS.PROGRAMAS, { estado: 'activo' });
  },

  'master.services': function(params) {
    return Sheets.findMany(TABS.SERVICIOS, { estado: 'activo' });
  },

  // ============================================================
  // DASHBOARD
  // ============================================================

  'dashboard.metrics': function(params) {
    Auth.requirePermission(params._user, 'patients.read');
    return {
      pacientes_activos: Sheets.findMany(TABS.PACIENTES, { estado_paciente: 'en_programa' }).length,
      tareas_hoy: API['tasks.today'](params).length,
      mensajes_pendientes: Sheets.findMany(TABS.COLA_MENSAJES, { estado: 'pendiente' }).length,
      incidencias_criticas: Sheets.findMany(TABS.INCIDENCIAS, { prioridad: 'alta', estado: ['abierta', 'en_proceso'] }).length,
      ciclos_decision_pendiente: Sheets.findMany(TABS.CICLOS, { estado_ciclo: 'finalizado_decision_pendiente' }).length
    };
  }
};
