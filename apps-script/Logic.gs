/**
 * Logic.gs — Lógica de negocio
 *
 * Aquí vive la "inteligencia" del sistema:
 * - Activación de ciclos
 * - Generación de tareas desde protocolo
 * - Cálculo de Consulta de Resultados (última aplicación + 7 días)
 * - Cierre de ciclos y decisiones post-programa
 * - Creación de seguimientos LP
 */

const Logic = {

  // ============================================================
  // ACTIVACIÓN DE CICLO
  // ============================================================

  /**
   * Activa un ciclo cuando un pago se confirma y dispara_activacion_programa = TRUE.
   */
  activateCycle(pago) {
    Logger.log('Activando ciclo para pago: ' + pago.id_pago);

    const programa = Sheets.findOne(TABS.PROGRAMAS, { id_programa: pago.id_programa });
    if (!programa) throw new Error('Programa no encontrado: ' + pago.id_programa);

    const paciente = Sheets.findOne(TABS.PACIENTES, { id_paciente: pago.id_paciente });
    if (!paciente) throw new Error('Paciente no encontrado');

    // Crear ciclo
    const ciclo = Sheets.insert(TABS.CICLOS, {
      id_paciente: pago.id_paciente,
      id_programa: pago.id_programa,
      id_pago_disparador: pago.id_pago,
      ronda_numero: this.getNextRoundNumber(pago.id_paciente),
      fecha_inicio_ciclo: new Date(),
      fecha_fin_estimada: this.calculateEstimatedEnd(programa),
      estado_ciclo: 'activo',
      id_medico_responsable: paciente.id_medico_responsable,
      id_program_specialist: this.assignProgramSpecialist()
    });

    // Crear componentes
    this.generateComponents(ciclo, programa);

    // Generar tareas desde el protocolo
    this.generateTasksFromProtocol(ciclo, programa);

    // Generar tareas protocolizadas adicionales (Foto Inicial, Foto Resultados)
    this.generatePhotoTasks(ciclo, programa);

    // Generar cola de mensajes educativos
    this.generateMessageQueue(ciclo, programa);

    // Actualizar estado del paciente
    Sheets.update(TABS.PACIENTES, { id_paciente: pago.id_paciente }, {
      estado_paciente: 'en_programa'
    });

    Logs.audit('cycle_activated', TABS.CICLOS, ciclo.id_ciclo);
    return ciclo;
  },

  getNextRoundNumber(idPaciente) {
    const ciclos = Sheets.findMany(TABS.CICLOS, { id_paciente: idPaciente });
    return ciclos.length + 1;
  },

  calculateEstimatedEnd(programa) {
    const fin = new Date();
    fin.setDate(fin.getDate() + (programa.duracion_semanas * 7));
    return fin;
  },

  assignProgramSpecialist() {
    // TODO: lógica de asignación por carga de trabajo o turno
    const specialists = Sheets.findMany(TABS.PROFESIONALES, {
      rol_sistema: 'program_specialist',
      estado_activo: true
    });
    if (specialists.length === 0) return null;
    return specialists[0].id_profesional;
  },

  generateComponents(ciclo, programa) {
    // Por ahora: crear componentes según paquete del programa
    const componentes = ['nutricion', 'psicologia', 'deporte', 'aplicaciones', 'inbody'];
    componentes.forEach(comp => {
      Sheets.insert(TABS.COMPONENTES, {
        id_ciclo: ciclo.id_ciclo,
        tipo_componente: comp,
        estado: 'activo',
        sesiones_planificadas: programa.sesiones_por_componente?.[comp] || 0,
        sesiones_completadas: 0
      });
    });
  },

  generateTasksFromProtocol(ciclo, programa) {
    const protocolo = Sheets.findMany(TABS.PROTOCOLO_TAREAS, {
      id_programa: programa.id_programa
    });

    const fechaInicio = new Date(ciclo.fecha_inicio_ciclo);

    protocolo.forEach(tareaProto => {
      const fechaProgramada = new Date(fechaInicio);
      fechaProgramada.setDate(fechaProgramada.getDate() + (tareaProto.dias_desde_inicio || 0));

      Sheets.insert(TABS.TAREAS, {
        id_ciclo: ciclo.id_ciclo,
        id_paciente: ciclo.id_paciente,
        nombre_tarea: tareaProto.nombre_tarea,
        tipo_hito: tareaProto.tipo_hito,
        semana_programa: tareaProto.semana_programa,
        fase_programa: tareaProto.fase_programa,
        fecha_programada: fechaProgramada,
        estado_tarea: 'programada',
        id_responsable_ejecucion: tareaProto.id_servicio_responsable,
        sede: tareaProto.sede_default || 'GutClinic',
        es_obligatoria: tareaProto.es_obligatoria,
        requiere_evidencia: tareaProto.requiere_evidencia
      });
    });
  },

  generatePhotoTasks(ciclo, programa) {
    const fechaInicio = new Date(ciclo.fecha_inicio_ciclo);
    const fechaFin = new Date(ciclo.fecha_fin_estimada);

    Sheets.insert(TABS.TAREAS, {
      id_ciclo: ciclo.id_ciclo,
      id_paciente: ciclo.id_paciente,
      nombre_tarea: 'Foto Inicial',
      tipo_hito: 'foto_protocolizada',
      semana_programa: 1,
      fase_programa: 'adaptacion',
      fecha_programada: fechaInicio,
      estado_tarea: 'programada',
      es_obligatoria: true,
      requiere_evidencia: true,
      permite_desistir: true
    });

    Sheets.insert(TABS.TAREAS, {
      id_ciclo: ciclo.id_ciclo,
      id_paciente: ciclo.id_paciente,
      nombre_tarea: 'Foto de Resultados',
      tipo_hito: 'foto_protocolizada',
      semana_programa: programa.duracion_semanas,
      fase_programa: 'consolidacion',
      fecha_programada: fechaFin,
      estado_tarea: 'programada',
      es_obligatoria: true,
      requiere_evidencia: true,
      permite_desistir: true
    });
  },

  generateMessageQueue(ciclo, programa) {
    // Cargar plantillas de mensajes para este programa
    const plantillas = Sheets.findMany(TABS.PLANTILLA_COMP, {
      id_programa: programa.id_programa
    });

    const fechaInicio = new Date(ciclo.fecha_inicio_ciclo);

    plantillas.forEach(plantilla => {
      const fechaSugerida = new Date(fechaInicio);
      // Lunes de cada semana programada
      fechaSugerida.setDate(fechaSugerida.getDate() + ((plantilla.semana - 1) * 7));

      Sheets.insert(TABS.COLA_MENSAJES, {
        id_ciclo: ciclo.id_ciclo,
        id_paciente: ciclo.id_paciente,
        id_plantilla: plantilla.id_plantilla,
        semana_programa: plantilla.semana,
        fase_programa: plantilla.fase,
        fecha_sugerida_envio: fechaSugerida,
        estado: 'pendiente'
      });
    });
  },

  // ============================================================
  // CÁLCULO DE CONSULTA DE RESULTADOS
  // (REGLA CRÍTICA: última aplicación + 7 días)
  // ============================================================

  /**
   * Calcula y actualiza la fecha de Consulta de Resultados de un ciclo.
   * Se llama automáticamente cuando una aplicación se completa o reprograma.
   */
  recalculateConsultaResultados(idCiclo) {
    const aplicaciones = Sheets.findMany(TABS.TAREAS, {
      id_ciclo: idCiclo,
      tipo_hito: 'aplicacion'
    });

    if (aplicaciones.length === 0) return;

    // Encontrar la fecha de la última aplicación (la más tardía)
    const fechaUltima = aplicaciones
      .filter(a => ['programada', 'completada'].includes(a.estado_tarea))
      .map(a => new Date(a.fecha_programada))
      .reduce((max, d) => d > max ? d : max, new Date(0));

    if (fechaUltima.getTime() === 0) return;

    // Consulta de Resultados = última aplicación + 7 días
    const fechaConsulta = new Date(fechaUltima);
    fechaConsulta.setDate(fechaConsulta.getDate() + 7);

    // Buscar la tarea de Consulta de Resultados existente
    const consultaTarea = Sheets.findOne(TABS.TAREAS, {
      id_ciclo: idCiclo,
      tipo_hito: 'consulta_resultados'
    });

    if (consultaTarea) {
      // Actualizar fecha
      Sheets.update(TABS.TAREAS, { id_tarea: consultaTarea.id_tarea }, {
        fecha_programada: fechaConsulta,
        notas_recalculo: `Recalculado automáticamente: última aplicación = ${fechaUltima.toISOString()}`
      });
      Logger.log(`Consulta de Resultados actualizada para ciclo ${idCiclo}: ${fechaConsulta}`);
    } else {
      // No existe, crearla
      const ciclo = Sheets.findOne(TABS.CICLOS, { id_ciclo: idCiclo });
      Sheets.insert(TABS.TAREAS, {
        id_ciclo: idCiclo,
        id_paciente: ciclo.id_paciente,
        nombre_tarea: 'Consulta de Resultados',
        tipo_hito: 'consulta_resultados',
        fecha_programada: fechaConsulta,
        estado_tarea: 'programada',
        es_obligatoria: true,
        notas: 'Generada automáticamente: última aplicación + 7 días'
      });
    }
  },

  // ============================================================
  // REPROGRAMACIÓN DE TAREAS
  // ============================================================

  rescheduleTask(idTarea, nuevaFecha, motivo, user) {
    const tarea = Sheets.findOne(TABS.TAREAS, { id_tarea: idTarea });
    if (!tarea) throw new Error('Tarea no encontrada');

    // Registrar la reprogramación
    Sheets.insert(TABS.REPROG, {
      id_tarea: idTarea,
      id_ciclo: tarea.id_ciclo,
      fecha_anterior: tarea.fecha_programada,
      fecha_nueva: new Date(nuevaFecha),
      motivo: motivo,
      id_solicitante: user.id_profesional,
      fecha_reprogramacion: new Date()
    });

    // Actualizar la tarea
    Sheets.update(TABS.TAREAS, { id_tarea: idTarea }, {
      fecha_programada: new Date(nuevaFecha),
      estado_tarea: 'reprogramada'
    });

    // Si era una aplicación, recalcular Consulta de Resultados
    if (tarea.tipo_hito === 'aplicacion') {
      this.recalculateConsultaResultados(tarea.id_ciclo);
    }

    return tarea;
  },

  // ============================================================
  // CIERRE DE CICLO Y DECISIONES POST-PROGRAMA
  // ============================================================

  closeCycle(idCiclo, decision, observaciones, user) {
    const ciclo = Sheets.findOne(TABS.CICLOS, { id_ciclo: idCiclo });
    if (!ciclo) throw new Error('Ciclo no encontrado');

    // Verificar que todas las tareas obligatorias estén resueltas
    const tareasPendientes = Sheets.findMany(TABS.TAREAS, {
      id_ciclo: idCiclo,
      es_obligatoria: true,
      estado_tarea: ['programada', 'en_proceso', 'vencida']
    });

    if (tareasPendientes.length > 0) {
      throw new Error(`No se puede cerrar: ${tareasPendientes.length} tareas obligatorias pendientes.`);
    }

    // Calcular cumplimiento total
    const todas = Sheets.findMany(TABS.TAREAS, { id_ciclo: idCiclo });
    const completadas = todas.filter(t => t.estado_tarea === 'completada').length;
    const cumplimiento = todas.length > 0 ? Math.round((completadas / todas.length) * 100) : 0;

    // Cerrar el ciclo
    Sheets.update(TABS.CICLOS, { id_ciclo: idCiclo }, {
      estado_ciclo: 'completado',
      fecha_cierre: new Date(),
      cumplimiento_porcentual: cumplimiento,
      id_cerrado_por: user.id_profesional
    });

    // Registrar la decisión
    Sheets.insert(TABS.DECISIONES, {
      id_ciclo: idCiclo,
      id_paciente: ciclo.id_paciente,
      tipo_decision: decision,
      observaciones: observaciones,
      fecha_decision: new Date(),
      id_medico_decisor: user.id_profesional
    });

    // Ejecutar acciones según la decisión
    this.executeDecisionActions(ciclo, decision);

    return { ciclo, cumplimiento, decision };
  },

  executeDecisionActions(ciclo, decision) {
    switch (decision) {
      case 'continuar_microdosificacion':
        this.startMicrodosification(ciclo);
        break;

      case 'iniciar_nuevo_programa_completo':
        // Crear solicitud de programa para que pase por embudo
        Logger.log('TODO: crear nueva solicitud de programa');
        break;

      case 'pasar_alta_medica':
        this.scheduleAltaMedica(ciclo);
        this.createLPFollowups(ciclo);
        break;

      case 'pasar_seguimiento_largo_plazo':
        this.createLPFollowups(ciclo);
        break;

      case 'pausar_temporalmente':
        Sheets.update(TABS.CICLOS, { id_ciclo: ciclo.id_ciclo }, {
          estado_ciclo: 'pausado'
        });
        break;

      case 'no_continua_por_decision_paciente':
      case 'no_continua_por_motivo_economico':
        // Aún así crear seguimientos LP — la obesidad es crónica
        this.createLPFollowups(ciclo);
        break;

      case 'pendiente_decision':
        // Crear tarea de seguimiento al médico en 3 días
        const fechaRecord = new Date();
        fechaRecord.setDate(fechaRecord.getDate() + 3);
        Sheets.insert(TABS.TAREAS, {
          id_ciclo: ciclo.id_ciclo,
          id_paciente: ciclo.id_paciente,
          nombre_tarea: 'Decidir tratamiento post-programa',
          tipo_hito: 'decision_pendiente',
          fecha_programada: fechaRecord,
          estado_tarea: 'programada',
          id_responsable_ejecucion: ciclo.id_medico_responsable,
          es_obligatoria: true
        });
        break;
    }

    // Actualizar estado del paciente
    const nuevoEstado = ['pasar_alta_medica', 'pasar_seguimiento_largo_plazo'].includes(decision)
      ? 'post_alta'
      : (decision === 'pausar_temporalmente' ? 'pausado' : 'completado');

    Sheets.update(TABS.PACIENTES, { id_paciente: ciclo.id_paciente }, {
      estado_paciente: nuevoEstado
    });
  },

  // ============================================================
  // SEGUIMIENTOS DE LARGO PLAZO
  // ============================================================

  createLPFollowups(ciclo) {
    const fechaAlta = new Date();
    const milestones = [
      { meses: 6,  tipo: 'seguimiento_6_meses' },
      { meses: 12, tipo: 'seguimiento_12_meses' }
    ];

    // Aniversarios anuales del año 2 al año 10
    for (let year = 2; year <= 10; year++) {
      milestones.push({ meses: year * 12, tipo: `aniversario_${year}` });
    }

    milestones.forEach(m => {
      const fecha = new Date(fechaAlta);
      fecha.setMonth(fecha.getMonth() + m.meses);

      Sheets.insert(TABS.SEG_LP, {
        id_ciclo: ciclo.id_ciclo,
        id_paciente: ciclo.id_paciente,
        tipo_seguimiento: m.tipo,
        fecha_programada: fecha,
        estado: 'programado',
        meses_post_alta: m.meses
      });
    });
  },

  scheduleAltaMedica(ciclo) {
    // Crear 3 tareas semanales de Alta Médica
    const fechaBase = new Date();
    for (let semana = 1; semana <= 3; semana++) {
      const fecha = new Date(fechaBase);
      fecha.setDate(fecha.getDate() + (semana * 7));

      Sheets.insert(TABS.TAREAS, {
        id_ciclo: ciclo.id_ciclo,
        id_paciente: ciclo.id_paciente,
        nombre_tarea: `Consulta Alta Médica - Sem ${semana}`,
        tipo_hito: 'alta_medica',
        semana_programa: semana,
        fase_programa: 'alta',
        fecha_programada: fecha,
        estado_tarea: 'programada',
        id_responsable_ejecucion: ciclo.id_medico_responsable,
        es_obligatoria: true
      });
    }
  },

  startMicrodosification(ciclo) {
    Sheets.insert(TABS.MICRODOSIF, {
      id_ciclo_origen: ciclo.id_ciclo,
      id_paciente: ciclo.id_paciente,
      tipo_microdosificacion: 'A',  // Por defecto Tipo A (configurable)
      fecha_inicio: new Date(),
      estado: 'activa',
      fase_actual: 'fase_4_semanas_50_porciento'
    });
    // TODO: generar tareas de microdosificación según tipo
  },

  // ============================================================
  // EMBUDO COMERCIAL — Solicitud de Programa
  // ============================================================

  createCommercialFunnelEntry(solicitudMedica, user) {
    // Crear registro paralelo en 07_Solicitudes_Programa
    const solPrograma = Sheets.insert(TABS.SOL_PROGRAMA, {
      id_paciente: solicitudMedica.id_paciente,
      id_solicitud_medica: solicitudMedica.id_solicitud_medica,
      id_medico_solicitante: user.id_profesional,
      id_programa: solicitudMedica.programa_recomendado,
      paquete_servicios: solicitudMedica.paquete_servicios,
      tipo_protocolo: solicitudMedica.tipo_protocolo,
      tipo_inicio: solicitudMedica.tipo_inicio,
      precio_referencial: solicitudMedica.precio_referencial,
      urgencia: solicitudMedica.urgencia,
      fecha_creacion: new Date()
    });

    // Crear entrada en kanban comercial
    Sheets.insert(TABS.SEG_COMERCIAL, {
      id_solicitud_programa: solPrograma.id_solicitud_programa,
      id_paciente: solicitudMedica.id_paciente,
      estado_comercial: 'nueva',
      fecha_ingreso_kanban: new Date()
    });

    return solPrograma;
  },

  tryActivateCycle(seguimientoComercial) {
    // Solo activa si hay un Pago confirmado asociado
    const pago = Sheets.findOne(TABS.PAGOS, {
      id_solicitud_programa: seguimientoComercial.id_solicitud_programa,
      confirmado_por_finanzas: true,
      dispara_activacion_programa: true
    });
    if (pago) {
      return this.activateCycle(pago);
    }
    return null;
  }
};
