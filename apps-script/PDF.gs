/**
 * PDF.gs — Generación de PDFs de Solicitudes Médicas
 *
 * Flujo:
 * 1. Selecciona la plantilla Google Doc según el tipo de solicitud
 * 2. Hace una copia temporal
 * 3. Reemplaza marcadores {{...}} con datos reales
 * 4. Convierte a PDF
 * 5. Guarda en /GutDoc_Solicitudes/{año}/{mes}/{ID}.pdf
 * 6. Genera link compartible
 * 7. Borra el doc temporal
 */

const PDF = {

  generateSolicitudPDF(idSolicitud) {
    const sol = Sheets.findOne(TABS.SOL_MEDICAS, { id_solicitud_medica: idSolicitud });
    if (!sol) throw new Error('Solicitud no encontrada: ' + idSolicitud);

    const paciente = Sheets.findOne(TABS.PACIENTES, { id_paciente: sol.id_paciente });
    const medico = Sheets.findOne(TABS.PROFESIONALES, { id_profesional: sol.id_medico_solicitante });

    if (!paciente || !medico) throw new Error('Datos de paciente o médico incompletos');

    // Seleccionar plantilla según tipo
    const templateId = PDF_TEMPLATES[sol.tipo_solicitud] || PDF_TEMPLATES.otro;
    if (!templateId || templateId.startsWith('REEMPLAZAR')) {
      throw new Error('Plantilla no configurada para tipo: ' + sol.tipo_solicitud);
    }

    // Copiar plantilla a carpeta temporal
    const tempFolderId = getConfig('DRIVE_FOLDER_TEMP', DRIVE_FOLDER_TEMP);
    const tempFolder = DriveApp.getFolderById(tempFolderId);
    const template = DriveApp.getFileById(templateId);
    const tempCopy = template.makeCopy(`temp_${idSolicitud}`, tempFolder);

    // Abrir el Doc y reemplazar marcadores
    const doc = DocumentApp.openById(tempCopy.getId());
    const body = doc.getBody();

    this.replaceCommonMarkers(body, sol, paciente, medico);
    this.replaceTypeSpecificMarkers(body, sol);

    doc.saveAndClose();

    // Convertir a PDF
    const pdfBlob = tempCopy.getAs('application/pdf');

    // Guardar en la carpeta del mes correspondiente
    const targetFolder = this.ensureMonthFolder(new Date());
    const pdfFile = targetFolder.createFile(pdfBlob).setName(`${idSolicitud}.pdf`);

    // Hacer compartible
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Borrar el doc temporal
    tempCopy.setTrashed(true);

    // Actualizar el registro
    Sheets.update(TABS.SOL_MEDICAS, { id_solicitud_medica: idSolicitud }, {
      pdf_url: pdfFile.getUrl(),
      pdf_drive_id: pdfFile.getId(),
      pdf_generado_at: new Date()
    });

    Logs.audit('pdf_generated', TABS.SOL_MEDICAS, idSolicitud);
    return pdfFile.getUrl();
  },

  /**
   * Reemplaza marcadores comunes a todos los tipos de solicitud.
   */
  replaceCommonMarkers(body, sol, paciente, medico) {
    body.replaceText('{{id_solicitud}}', sol.id_solicitud_medica);
    body.replaceText('{{fecha_solicitud}}', this.formatDate(sol.fecha_solicitud));

    // Paciente
    body.replaceText('{{nombre_paciente}}', `${paciente.nombres} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim());
    body.replaceText('{{dni_paciente}}', paciente.dni || '');
    body.replaceText('{{edad_paciente}}', this.calculateAge(paciente.fecha_nacimiento));
    body.replaceText('{{genero_paciente}}', paciente.genero || '');
    body.replaceText('{{telefono_paciente}}', paciente.telefono || paciente.whatsapp || '');

    // Médico
    body.replaceText('{{nombre_medico}}', medico.nombre_completo);
    body.replaceText('{{cmp_medico}}', medico.cmp || '-');
    body.replaceText('{{especialidad_medico}}', medico.especialidad || 'Medicina General');

    // Detalle e instrucciones
    body.replaceText('{{detalle_solicitud}}', sol.detalle_solicitud || '');
    body.replaceText('{{instrucciones_paciente}}', sol.instrucciones_paciente || '');
    body.replaceText('{{prioridad}}', sol.prioridad || 'Media');
  },

  /**
   * Reemplaza marcadores específicos del tipo de solicitud.
   */
  replaceTypeSpecificMarkers(body, sol) {
    if (sol.tipo_solicitud === 'laboratorio') {
      // Cargar pruebas seleccionadas
      const idsPruebas = (sol.pruebas_laboratorio_seleccionadas || '').split(',').map(s => s.trim()).filter(Boolean);
      const pruebas = idsPruebas.map(id => Sheets.findOne(TABS.MASTER_LABS, { id_prueba: id })).filter(Boolean);

      const lista = pruebas.map(p => `• ${p.nombre_prueba}${p.requiere_ayuno ? ' (ayuno ' + (p.horas_ayuno || 8) + 'h)' : ''}`).join('\n');
      body.replaceText('{{lista_pruebas}}', lista);
      body.replaceText('{{numero_pruebas}}', String(pruebas.length));
    }

    if (sol.tipo_solicitud === 'imagen') {
      body.replaceText('{{tipo_estudio}}', sol.subtipo || '');
      body.replaceText('{{requiere_contraste}}', sol.requiere_contraste || 'No');
      body.replaceText('{{ayuno_requerido}}', sol.ayuno_requerido || 'Sin ayuno');
    }

    if (sol.tipo_solicitud === 'programa') {
      const programa = Sheets.findOne(TABS.PROGRAMAS, { id_programa: sol.programa_recomendado });
      body.replaceText('{{nombre_programa}}', programa?.nombre_programa || '');
      body.replaceText('{{duracion_semanas}}', String(programa?.duracion_semanas || ''));
      body.replaceText('{{paquete_servicios}}', sol.paquete_servicios || '');
      body.replaceText('{{tipo_protocolo}}', sol.tipo_protocolo || '');
      body.replaceText('{{precio_referencial}}', `S/ ${sol.precio_referencial || 0}`);
    }

    if (['interconsulta', 'nutricion', 'psicologia', 'psiquiatria'].includes(sol.tipo_solicitud)) {
      body.replaceText('{{especialidad_destino}}', sol.subtipo || '');
      body.replaceText('{{medico_destino}}', sol.medico_destino_externo || 'A determinar');
    }

    // Limpiar marcadores no usados (para que no queden visibles en el PDF)
    body.replaceText('\\{\\{[a-z_]+\\}\\}', '—');
  },

  /**
   * Asegura que existe la carpeta del mes y la devuelve.
   * Estructura: /Solicitudes/{año}/{mes}/
   */
  ensureMonthFolder(fecha) {
    const rootId = getConfig('DRIVE_FOLDER_PDF_SOLICITUDES', DRIVE_FOLDER_PDF_SOLICITUDES);
    const root = DriveApp.getFolderById(rootId);

    const year = String(fecha.getFullYear());
    const month = String(fecha.getMonth() + 1).padStart(2, '0');

    const yearFolder = this.getOrCreateFolder(root, year);
    const monthFolder = this.getOrCreateFolder(yearFolder, month);
    return monthFolder;
  },

  getOrCreateFolder(parent, name) {
    const folders = parent.getFoldersByName(name);
    if (folders.hasNext()) return folders.next();
    return parent.createFolder(name);
  },

  formatDate(d) {
    if (!d) return '';
    const date = (d instanceof Date) ? d : new Date(d);
    return Utilities.formatDate(date, TZ, 'd MMMM yyyy');
  },

  calculateAge(birthDate) {
    if (!birthDate) return '-';
    const birth = (birthDate instanceof Date) ? birthDate : new Date(birthDate);
    const ageMs = Date.now() - birth.getTime();
    const ageDate = new Date(ageMs);
    return String(Math.abs(ageDate.getUTCFullYear() - 1970));
  }
};
