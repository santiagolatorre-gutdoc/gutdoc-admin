/**
 * Triggers.gs — Jobs automáticos programados
 *
 * Apps Script ejecuta funciones según triggers de tiempo (no instantáneos).
 * Estos triggers procesan las tareas que el sistema necesita hacer "en el fondo".
 *
 * Ejecutar setupTriggers() UNA SOLA VEZ desde el editor para registrar todos los triggers.
 */

/**
 * Registra todos los triggers automáticos del sistema.
 * Ejecutar una sola vez al desplegar.
 */
function setupTriggers() {
  // Eliminar triggers existentes para no duplicar
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Trigger diario a las 7 AM: cola de mensajes y revisión de tareas vencidas
  ScriptApp.newTrigger('dailyJobs')
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .inTimezone(TZ)
    .create();

  // Trigger horario: revisión de incidencias automáticas
  ScriptApp.newTrigger('hourlyJobs')
    .timeBased()
    .everyHours(1)
    .create();

  // Trigger semanal (lunes 6 AM): backup del sheet
  ScriptApp.newTrigger('weeklyBackup')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(6)
    .inTimezone(TZ)
    .create();

  // Trigger semanal (domingos): generar metricas snapshot
  ScriptApp.newTrigger('generateMetricsSnapshot')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(23)
    .inTimezone(TZ)
    .create();

  Logger.log('Triggers registrados correctamente.');
}

/**
 * Jobs diarios — se ejecuta cada día a las 7 AM
 */
function dailyJobs() {
  Logger.log('=== Daily jobs starting ===');

  try {
    refreshMessageQueue();
    detectVencidaTasks();
    detectExpiringRecetas();
    notifyUpcomingLPFollowups();
  } catch (e) {
    Logger.log('Daily jobs error: ' + e.message + '\n' + e.stack);
  }

  Logger.log('=== Daily jobs done ===');
}

/**
 * Jobs horarios — cada hora
 */
function hourlyJobs() {
  try {
    detectStuckSolicitudes();
    detectMessagesNoResponse();
  } catch (e) {
    Logger.log('Hourly jobs error: ' + e.message);
  }
}

// ============================================================
// FUNCIONES DE LOS JOBS
// ============================================================

/**
 * Refresca la cola de mensajes — agrega los que corresponden a hoy.
 */
function refreshMessageQueue() {
  const today = new Date();
  const todayStr = Utilities.formatDate(today, TZ, 'yyyy-MM-dd');

  // Pasar a "listo_para_envio" los que tienen fecha_sugerida <= hoy y aún están "pendiente"
  const pendientes = Sheets.findMany(TABS.COLA_MENSAJES, { estado: 'pendiente' });
  let actualizados = 0;

  pendientes.forEach(msg => {
    const fechaSugerida = Utilities.formatDate(new Date(msg.fecha_sugerida_envio), TZ, 'yyyy-MM-dd');
    if (fechaSugerida <= todayStr) {
      Sheets.update(TABS.COLA_MENSAJES, { id_cola_mensaje: msg.id_cola_mensaje }, {
        estado: 'listo_para_envio'
      });
      actualizados++;
    }
  });

  Logger.log(`Cola de mensajes refrescada: ${actualizados} pasaron a listo_para_envio.`);
}

/**
 * Detecta tareas vencidas y crea incidencias automáticas si es necesario.
 */
function detectVencidaTasks() {
  const today = new Date();
  const todayStr = Utilities.formatDate(today, TZ, 'yyyy-MM-dd');

  const tareas = Sheets.findMany(TABS.TAREAS, {
    estado_tarea: ['programada', 'en_proceso']
  });

  let venciendo = 0;
  tareas.forEach(t => {
    const fechaProg = Utilities.formatDate(new Date(t.fecha_programada), TZ, 'yyyy-MM-dd');
    if (fechaProg < todayStr) {
      Sheets.update(TABS.TAREAS, { id_tarea: t.id_tarea }, { estado_tarea: 'vencida' });
      venciendo++;

      // Crear incidencia automática si es una tarea crítica (aplicación, consulta médica)
      if (['aplicacion', 'consulta_medica', 'consulta_resultados'].includes(t.tipo_hito)) {
        Sheets.insert(TABS.INCIDENCIAS, {
          id_paciente: t.id_paciente,
          id_ciclo: t.id_ciclo,
          tipo_incidencia: 'tarea_vencida',
          prioridad: t.tipo_hito === 'aplicacion' ? 'alta' : 'media',
          titulo: `Tarea vencida: ${t.nombre_tarea}`,
          descripcion: `La tarea ${t.nombre_tarea} estaba programada para ${fechaProg} y no fue completada.`,
          fecha_creacion: new Date(),
          estado: 'abierta',
          es_automatica: true
        });
      }
    }
  });

  Logger.log(`${venciendo} tareas marcadas como vencidas.`);
}

/**
 * Detecta recetas que vencen pronto.
 */
function detectExpiringRecetas() {
  // TODO: implementar cuando el modelo de recetas esté en su lugar
  Logger.log('Skip: detectExpiringRecetas — pendiente de implementar tabla de recetas');
}

/**
 * Notifica seguimientos LP que se acercan en los próximos 3 días.
 */
function notifyUpcomingLPFollowups() {
  const today = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + 3);

  const seguimientos = Sheets.findMany(TABS.SEG_LP, { estado: 'programado' });

  let notificados = 0;
  seguimientos.forEach(s => {
    const fecha = new Date(s.fecha_programada);
    if (fecha >= today && fecha <= limite) {
      // Crear/asegurar entrada en cola de mensajes
      const yaExiste = Sheets.findOne(TABS.COLA_MENSAJES, { id_seguimiento_lp: s.id_seguimiento });
      if (!yaExiste) {
        Sheets.insert(TABS.COLA_MENSAJES, {
          id_paciente: s.id_paciente,
          id_seguimiento_lp: s.id_seguimiento,
          tipo_mensaje: 'seguimiento_lp',
          fecha_sugerida_envio: fecha,
          estado: 'pendiente'
        });
        notificados++;
      }
    }
  });

  Logger.log(`${notificados} seguimientos LP encolados para envío.`);
}

/**
 * Detecta solicitudes médicas estancadas (sin avanzar > 3 días).
 */
function detectStuckSolicitudes() {
  const limite = new Date();
  limite.setDate(limite.getDate() - 3);

  const solicitudes = Sheets.findMany(TABS.SOL_MEDICAS, { estado: 'pendiente' });
  let creadas = 0;

  solicitudes.forEach(s => {
    if (new Date(s.fecha_solicitud) < limite) {
      // Verificar si ya hay una incidencia abierta para esta solicitud
      const incExistente = Sheets.findOne(TABS.INCIDENCIAS, {
        id_solicitud_medica: s.id_solicitud_medica,
        estado: ['abierta', 'en_proceso']
      });
      if (!incExistente) {
        Sheets.insert(TABS.INCIDENCIAS, {
          id_paciente: s.id_paciente,
          id_solicitud_medica: s.id_solicitud_medica,
          tipo_incidencia: 'solicitud_estancada',
          prioridad: 'media',
          titulo: `Solicitud médica estancada: ${s.id_solicitud_medica}`,
          descripcion: `La solicitud no ha avanzado desde el ${Utilities.formatDate(new Date(s.fecha_solicitud), TZ, 'd MMM yyyy')}.`,
          fecha_creacion: new Date(),
          estado: 'abierta',
          es_automatica: true
        });
        creadas++;
      }
    }
  });

  if (creadas > 0) Logger.log(`${creadas} incidencias por solicitudes estancadas.`);
}

/**
 * Detecta mensajes enviados sin respuesta del paciente en > 48h.
 */
function detectMessagesNoResponse() {
  const limite = new Date();
  limite.setHours(limite.getHours() - 48);

  const enviados = Sheets.findMany(TABS.HIST_ENVIOS, {});

  enviados.forEach(env => {
    if (new Date(env.fecha_envio) >= limite) return;
    // Buscar respuesta del paciente
    const respuesta = Sheets.findOne(TABS.RESPUESTAS, {
      id_historial_envio: env.id_historial_envio
    });
    if (!respuesta) {
      // Verificar incidencia existente
      const yaExiste = Sheets.findOne(TABS.INCIDENCIAS, {
        id_historial_envio: env.id_historial_envio,
        estado: ['abierta', 'en_proceso']
      });
      if (!yaExiste) {
        Sheets.insert(TABS.INCIDENCIAS, {
          id_paciente: env.id_paciente,
          id_historial_envio: env.id_historial_envio,
          tipo_incidencia: 'sin_respuesta_paciente',
          prioridad: 'media',
          titulo: 'Paciente no respondió mensaje educativo',
          descripcion: `Mensaje enviado el ${Utilities.formatDate(new Date(env.fecha_envio), TZ, 'd MMM yyyy HH:mm')} sin respuesta.`,
          fecha_creacion: new Date(),
          estado: 'abierta',
          es_automatica: true
        });
      }
    }
  });
}

/**
 * Backup semanal del Sheet completo a la carpeta de backups en Drive.
 */
function weeklyBackup() {
  const sheetId = getConfig('SHEET_ID', SHEET_ID);
  const sheet = DriveApp.getFileById(sheetId);
  const backupFolderId = getConfig('DRIVE_FOLDER_BACKUPS', DRIVE_FOLDER_BACKUPS);
  const folder = DriveApp.getFolderById(backupFolderId);

  const fechaStr = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd_HH-mm');
  sheet.makeCopy(`Backup_GutDoc_${fechaStr}`, folder);
  Logger.log('Backup semanal creado: ' + fechaStr);
}

/**
 * Snapshot semanal de KPIs para el dashboard.
 */
function generateMetricsSnapshot() {
  const snapshot = {
    fecha: new Date(),
    pacientes_activos: Sheets.findMany(TABS.PACIENTES, { estado_paciente: 'en_programa' }).length,
    nuevos_pacientes_semana: 0,  // TODO calcular
    tareas_completadas_semana: 0,  // TODO calcular
    cumplimiento_promedio: 0,  // TODO calcular
    conversion_ventas: 0  // TODO calcular
  };

  Sheets.insert(TABS.METRICAS, snapshot);
  Logger.log('Snapshot de métricas generado.');
}
