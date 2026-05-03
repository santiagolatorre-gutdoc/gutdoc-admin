/**
 * mock-data.js — Datos mock para FASE 5 (Ruta A — sin backend conectado)
 *
 * Estos datos simulan lo que en producción vendrá del Apps Script.
 * Cuando se conecte al backend real (FASE 6), este archivo se elimina y
 * api.js cambia las funciones de "devolver mock" a "hacer fetch" al endpoint.
 *
 * Mantén la estructura de cada objeto idéntica al esquema del Sheet
 * (ver docs/sheets-template/PLANTILLA_GUTDOC.md) para que la transición
 * a backend real sea transparente.
 */

const MOCK = {

  // ============================================================
  // SESIÓN ACTUAL (simula auth.checkSession)
  // ============================================================
  currentUser: {
    email: 'santiago@gutclinic.com',
    id_profesional: 'PROF-00001',
    nombre: 'Dr. Santiago La Torre',
    rol: 'admin',  // Cambia a 'medico', 'program_specialist', 'recepcion', 'ventas', 'finanzas' para probar permisos
    especialidad: 'Medicina Interna · Salud Metabólica',
    cmp: '54321'
  },

  // ============================================================
  // PROFESIONALES (03_Profesionales)
  // ============================================================
  profesionales: [
    { id_profesional: 'PROF-00001', email_workspace: 'santiago@gutclinic.com', nombre_completo: 'Dr. Santiago La Torre', rol_sistema: 'admin', especialidad: 'Medicina Interna', cmp: '54321', estado_activo: true },
    { id_profesional: 'PROF-00002', email_workspace: 'maria.guerra@gutclinic.com', nombre_completo: 'Lic. María Guerra', rol_sistema: 'program_specialist', especialidad: 'Coordinación clínica', estado_activo: true },
    { id_profesional: 'PROF-00003', email_workspace: 'recepcion@gutclinic.com', nombre_completo: 'Carla Mendoza', rol_sistema: 'recepcion', especialidad: 'Front office', estado_activo: true },
    { id_profesional: 'PROF-00004', email_workspace: 'ventas@gutclinic.com', nombre_completo: 'Andrea Salas', rol_sistema: 'ventas', especialidad: 'Comercial', estado_activo: true },
    { id_profesional: 'PROF-00005', email_workspace: 'finanzas@gutclinic.com', nombre_completo: 'Roberto Quispe', rol_sistema: 'finanzas', especialidad: 'Finanzas', estado_activo: true }
  ],

  // ============================================================
  // PROGRAMAS (04_Programas) — datos semilla
  // ============================================================
  programas: [
    { id_programa: 'PROG-GLP1-INI-10', nombre_programa: 'GLP-1 Inicio · 10 semanas', categoria: 'GLP-1', duracion_semanas: 10, fase: 'inicio', medicamento_default: 'Semaglutide', estado: 'activo' },
    { id_programa: 'PROG-GLP1-INI-5',  nombre_programa: 'GLP-1 Inicio · 5 semanas',  categoria: 'GLP-1', duracion_semanas: 5,  fase: 'inicio', medicamento_default: 'Semaglutide', estado: 'activo' },
    { id_programa: 'PROG-GLP1-INI-4',  nombre_programa: 'GLP-1 Inicio · 4 semanas',  categoria: 'GLP-1', duracion_semanas: 4,  fase: 'inicio', medicamento_default: 'Tirzepatide', estado: 'activo' },
    { id_programa: 'PROG-GLP1-CON-10', nombre_programa: 'GLP-1 Continuación · 10 semanas', categoria: 'GLP-1', duracion_semanas: 10, fase: 'continuacion', medicamento_default: 'Semaglutide', estado: 'activo' },
    { id_programa: 'PROG-COMB-16',     nombre_programa: 'Combinado Balón + GLP-1 · 16 semanas', categoria: 'Combinado', duracion_semanas: 16, fase: 'inicio', medicamento_default: 'Semaglutide', estado: 'activo' },
    { id_programa: 'PROG-MANGA-16',    nombre_programa: 'Manga Gástrica · 16 semanas', categoria: 'Bariátrica', duracion_semanas: 16, fase: 'post-cirugia', medicamento_default: 'N/A', estado: 'activo' },
    { id_programa: 'PROG-MICRO-A',     nombre_programa: 'Microdosificación Tipo A', categoria: 'Microdosificación', duracion_semanas: 16, fase: 'mantenimiento', medicamento_default: 'Semaglutide', estado: 'activo' },
    { id_programa: 'PROG-MICRO-B',     nombre_programa: 'Microdosificación Tipo B', categoria: 'Microdosificación', duracion_semanas: 24, fase: 'mantenimiento', medicamento_default: 'Tirzepatide', estado: 'activo' },
    { id_programa: 'PROG-ALTA-3',      nombre_programa: 'Alta Médica · 3 semanas', categoria: 'Alta', duracion_semanas: 3, fase: 'alta', medicamento_default: 'N/A', estado: 'activo' },
    { id_programa: 'PROG-MEM-DE',      nombre_programa: 'Membership Dieta y Ejercicio', categoria: 'Membership', duracion_semanas: 12, fase: 'membership', medicamento_default: 'N/A', estado: 'activo' },
    { id_programa: 'PROG-MEM-PG',      nombre_programa: 'Membership Pérdida de Grasa', categoria: 'Membership', duracion_semanas: 12, fase: 'membership', medicamento_default: 'N/A', estado: 'activo' },
    { id_programa: 'PROG-MEM-HM',      nombre_programa: 'Membership Hipertrofia Muscular', categoria: 'Membership', duracion_semanas: 12, fase: 'membership', medicamento_default: 'N/A', estado: 'activo' },
    { id_programa: 'PROG-MEM-RC',      nombre_programa: 'Membership Recomposición Corporal', categoria: 'Membership', duracion_semanas: 16, fase: 'membership', medicamento_default: 'N/A', estado: 'activo' },
    { id_programa: 'PROG-MEM-GB',      nombre_programa: 'Membership GLP-1 Boost', categoria: 'Membership', duracion_semanas: 12, fase: 'membership', medicamento_default: 'Semaglutide', estado: 'activo' }
  ],

  // ============================================================
  // SERVICIOS (02_Servicios)
  // ============================================================
  servicios: [
    { id_servicio: 'SERV-001', nombre_servicio: 'Consulta Médica', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-002', nombre_servicio: 'Médico Especialista', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-003', nombre_servicio: 'Seguimiento Médico', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-004', nombre_servicio: 'Nutrición', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-005', nombre_servicio: 'Psicología', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-006', nombre_servicio: 'Aplicaciones', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-007', nombre_servicio: 'Evaluación Física', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-008', nombre_servicio: 'Enfermería', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-009', nombre_servicio: 'Laboratorio', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-010', nombre_servicio: 'Cardiología', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-011', nombre_servicio: 'Neumología', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-012', nombre_servicio: 'Gastroenterología', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-013', nombre_servicio: 'Cirugía Bariátrica', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-014', nombre_servicio: 'Anestesiología', categoria: 'Clínica', estado: 'activo' },
    { id_servicio: 'SERV-015', nombre_servicio: 'Recepción', categoria: 'Admin', estado: 'activo' },
    { id_servicio: 'SERV-016', nombre_servicio: 'Program Specialist', categoria: 'Admin', estado: 'activo' },
    { id_servicio: 'SERV-017', nombre_servicio: 'Equipo Biomédico', categoria: 'Admin', estado: 'activo' },
    { id_servicio: 'SERV-018', nombre_servicio: 'Logística', categoria: 'Admin', estado: 'activo' },
    { id_servicio: 'SERV-019', nombre_servicio: 'Ventas', categoria: 'Comercial', estado: 'activo' },
    { id_servicio: 'SERV-020', nombre_servicio: 'Finanzas', categoria: 'Soporte', estado: 'activo' }
  ],

  // ============================================================
  // MASTER DE LABORATORIOS (33_Master_Laboratorios)
  // 50+ pruebas comunes en programas metabólicos
  // ============================================================
  master_labs: [
    // Lípidos / cardiovascular
    { id_prueba: 'LAB-001', nombre_prueba: 'Perfil lipídico completo', categoria: 'Lípidos', requiere_ayuno: true, horas_ayuno: 12, palabras_clave: 'perfil lipidico colesterol ldl hdl trigliceridos cardiovascular', estado: 'activo' },
    { id_prueba: 'LAB-002', nombre_prueba: 'Colesterol total', categoria: 'Lípidos', requiere_ayuno: true, horas_ayuno: 12, palabras_clave: 'colesterol total', estado: 'activo' },
    { id_prueba: 'LAB-003', nombre_prueba: 'Apolipoproteína B', categoria: 'Riesgo cardiovascular', requiere_ayuno: true, horas_ayuno: 12, palabras_clave: 'apo b apolipoproteina cardiovascular', estado: 'activo' },
    { id_prueba: 'LAB-004', nombre_prueba: 'Lipoproteína (a)', categoria: 'Riesgo cardiovascular', requiere_ayuno: false, palabras_clave: 'lipoproteina lp a cardiovascular', estado: 'activo' },

    // Glucosa / metabolismo
    { id_prueba: 'LAB-010', nombre_prueba: 'Glucosa basal en ayunas', categoria: 'Glucosa metabólico', requiere_ayuno: true, horas_ayuno: 8, palabras_clave: 'glucosa azucar diabetes basal ayunas metabolismo', estado: 'activo' },
    { id_prueba: 'LAB-011', nombre_prueba: 'Insulina basal', categoria: 'Resistencia a la insulina', requiere_ayuno: true, horas_ayuno: 8, palabras_clave: 'insulina basal homa resistencia', estado: 'activo' },
    { id_prueba: 'LAB-012', nombre_prueba: 'HOMA-IR (índice resistencia insulina)', categoria: 'Resistencia a la insulina', requiere_ayuno: true, horas_ayuno: 8, palabras_clave: 'homa ir resistencia insulina indice metabolismo', estado: 'activo' },
    { id_prueba: 'LAB-013', nombre_prueba: 'Hemoglobina glicosilada (HbA1c)', categoria: 'Glucosa metabólico', requiere_ayuno: false, palabras_clave: 'hba1c hemoglobina glicosilada diabetes promedio glucosa', estado: 'activo' },
    { id_prueba: 'LAB-014', nombre_prueba: 'Test de tolerancia oral a la glucosa (TTOG)', categoria: 'Glucosa metabólico', requiere_ayuno: true, horas_ayuno: 8, palabras_clave: 'ttog tolerancia oral glucosa curva glicemica diabetes gestacional', estado: 'activo' },
    { id_prueba: 'LAB-015', nombre_prueba: 'Test de tolerancia con insulina', categoria: 'Resistencia a la insulina', requiere_ayuno: true, horas_ayuno: 8, palabras_clave: 'tolerancia insulina curva resistencia metabolismo', estado: 'activo' },
    { id_prueba: 'LAB-016', nombre_prueba: 'Péptido C', categoria: 'Glucosa metabólico', requiere_ayuno: true, horas_ayuno: 8, palabras_clave: 'peptido c funcion pancreatica diabetes', estado: 'activo' },

    // Inflamación
    { id_prueba: 'LAB-020', nombre_prueba: 'PCR ultrasensible', categoria: 'Marcadores inflamación', requiere_ayuno: false, palabras_clave: 'pcr proteina c reactiva inflamacion ultrasensible cardiovascular', estado: 'activo' },
    { id_prueba: 'LAB-021', nombre_prueba: 'Velocidad de sedimentación (VSG)', categoria: 'Marcadores inflamación', requiere_ayuno: false, palabras_clave: 'vsg sedimentacion eritrosedimentacion inflamacion', estado: 'activo' },
    { id_prueba: 'LAB-022', nombre_prueba: 'Ferritina', categoria: 'Marcadores inflamación', requiere_ayuno: false, palabras_clave: 'ferritina hierro inflamacion deposito', estado: 'activo' },

    // Tiroides
    { id_prueba: 'LAB-030', nombre_prueba: 'TSH (hormona estimulante de tiroides)', categoria: 'Tiroides', requiere_ayuno: false, palabras_clave: 'tsh tiroides hormona estimulante hipotiroidismo perfil tiroideo', estado: 'activo' },
    { id_prueba: 'LAB-031', nombre_prueba: 'T4 libre', categoria: 'Tiroides', requiere_ayuno: false, palabras_clave: 't4 libre tiroides hormona perfil tiroideo', estado: 'activo' },
    { id_prueba: 'LAB-032', nombre_prueba: 'T3 libre', categoria: 'Tiroides', requiere_ayuno: false, palabras_clave: 't3 libre tiroides hormona perfil tiroideo', estado: 'activo' },
    { id_prueba: 'LAB-033', nombre_prueba: 'Anticuerpos anti-TPO', categoria: 'Tiroides', requiere_ayuno: false, palabras_clave: 'anti tpo anticuerpos tiroides hashimoto autoinmune', estado: 'activo' },
    { id_prueba: 'LAB-034', nombre_prueba: 'Tiroglobulina', categoria: 'Tiroides', requiere_ayuno: false, palabras_clave: 'tiroglobulina tiroides', estado: 'activo' },

    // Hormonal
    { id_prueba: 'LAB-040', nombre_prueba: 'Cortisol matutino', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'cortisol matutino estres suprarrenal', estado: 'activo' },
    { id_prueba: 'LAB-041', nombre_prueba: 'Cortisol vespertino', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'cortisol vespertino tarde estres', estado: 'activo' },
    { id_prueba: 'LAB-042', nombre_prueba: 'Testosterona total', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'testosterona total perfil hormonal', estado: 'activo' },
    { id_prueba: 'LAB-043', nombre_prueba: 'Testosterona libre', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'testosterona libre perfil hormonal', estado: 'activo' },
    { id_prueba: 'LAB-044', nombre_prueba: 'Estradiol', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'estradiol estrogeno perfil hormonal', estado: 'activo' },
    { id_prueba: 'LAB-045', nombre_prueba: 'Progesterona', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'progesterona perfil hormonal', estado: 'activo' },
    { id_prueba: 'LAB-046', nombre_prueba: 'FSH', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'fsh foliculo estimulante perfil hormonal', estado: 'activo' },
    { id_prueba: 'LAB-047', nombre_prueba: 'LH', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'lh luteinizante perfil hormonal', estado: 'activo' },
    { id_prueba: 'LAB-048', nombre_prueba: 'Prolactina', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'prolactina perfil hormonal', estado: 'activo' },
    { id_prueba: 'LAB-049', nombre_prueba: 'DHEA-S', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'dhea s sulfato suprarrenal perfil hormonal', estado: 'activo' },
    { id_prueba: 'LAB-050', nombre_prueba: 'SHBG (globulina fijadora de hormonas)', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'shbg globulina fijadora perfil hormonal', estado: 'activo' },

    // Vitaminas
    { id_prueba: 'LAB-060', nombre_prueba: 'Vitamina D (25-OH)', categoria: 'Vitaminas', requiere_ayuno: false, palabras_clave: 'vitamina d 25 oh deficit hueso', estado: 'activo' },
    { id_prueba: 'LAB-061', nombre_prueba: 'Vitamina B12', categoria: 'Vitaminas', requiere_ayuno: false, palabras_clave: 'vitamina b12 cobalamina', estado: 'activo' },
    { id_prueba: 'LAB-062', nombre_prueba: 'Ácido fólico', categoria: 'Vitaminas', requiere_ayuno: false, palabras_clave: 'acido folico folato vitamina b9', estado: 'activo' },

    // Hematología
    { id_prueba: 'LAB-070', nombre_prueba: 'Hemograma completo', categoria: 'Hematología', requiere_ayuno: false, palabras_clave: 'hemograma completo sangre globulos hemoglobina hematocrito', estado: 'activo' },

    // Función renal
    { id_prueba: 'LAB-080', nombre_prueba: 'Creatinina sérica', categoria: 'Función renal', requiere_ayuno: false, palabras_clave: 'creatinina rinon renal funcion perfil renal', estado: 'activo' },
    { id_prueba: 'LAB-081', nombre_prueba: 'Urea', categoria: 'Función renal', requiere_ayuno: false, palabras_clave: 'urea bun rinon renal perfil renal', estado: 'activo' },
    { id_prueba: 'LAB-082', nombre_prueba: 'Ácido úrico', categoria: 'Función renal', requiere_ayuno: false, palabras_clave: 'acido urico gota perfil renal', estado: 'activo' },
    { id_prueba: 'LAB-083', nombre_prueba: 'Microalbuminuria', categoria: 'Función renal', requiere_ayuno: false, palabras_clave: 'microalbuminuria orina rinon renal', estado: 'activo' },
    { id_prueba: 'LAB-084', nombre_prueba: 'Tasa de filtración glomerular (TFG)', categoria: 'Función renal', requiere_ayuno: false, palabras_clave: 'tfg filtracion glomerular rinon perfil renal', estado: 'activo' },

    // Función hepática
    { id_prueba: 'LAB-090', nombre_prueba: 'AST / TGO', categoria: 'Función hepática', requiere_ayuno: false, palabras_clave: 'tgo ast aspartato hepatico higado perfil hepatico', estado: 'activo' },
    { id_prueba: 'LAB-091', nombre_prueba: 'ALT / TGP', categoria: 'Función hepática', requiere_ayuno: false, palabras_clave: 'tgp alt alanina hepatico higado perfil hepatico', estado: 'activo' },
    { id_prueba: 'LAB-092', nombre_prueba: 'GGT (Gamma-glutamil transferasa)', categoria: 'Función hepática', requiere_ayuno: false, palabras_clave: 'ggt gamma glutamil hepatico higado perfil hepatico', estado: 'activo' },
    { id_prueba: 'LAB-093', nombre_prueba: 'Fosfatasa alcalina', categoria: 'Función hepática', requiere_ayuno: false, palabras_clave: 'fosfatasa alcalina hepatico higado perfil hepatico', estado: 'activo' },
    { id_prueba: 'LAB-094', nombre_prueba: 'Bilirrubina total y fraccionada', categoria: 'Función hepática', requiere_ayuno: false, palabras_clave: 'bilirrubina total directa indirecta hepatico higado perfil hepatico', estado: 'activo' },
    { id_prueba: 'LAB-095', nombre_prueba: 'Albúmina sérica', categoria: 'Función hepática', requiere_ayuno: false, palabras_clave: 'albumina hepatico higado proteina', estado: 'activo' },

    // Perfiles agrupados
    { id_prueba: 'LAB-200', nombre_prueba: 'Perfil hepático completo', categoria: 'Función hepática', requiere_ayuno: true, horas_ayuno: 8, palabras_clave: 'perfil hepatico tgo tgp ggt fosfatasa bilirrubina higado', estado: 'activo' },
    { id_prueba: 'LAB-201', nombre_prueba: 'Perfil renal completo', categoria: 'Función renal', requiere_ayuno: false, palabras_clave: 'perfil renal creatinina urea acido urico tfg rinon', estado: 'activo' },
    { id_prueba: 'LAB-202', nombre_prueba: 'Perfil tiroideo completo', categoria: 'Tiroides', requiere_ayuno: false, palabras_clave: 'perfil tiroideo tsh t4 t3 anticuerpos tiroides', estado: 'activo' },
    { id_prueba: 'LAB-203', nombre_prueba: 'Perfil hormonal femenino', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'perfil hormonal femenino estradiol fsh lh progesterona prolactina', estado: 'activo' },
    { id_prueba: 'LAB-204', nombre_prueba: 'Perfil hormonal masculino', categoria: 'Hormonal', requiere_ayuno: false, palabras_clave: 'perfil hormonal masculino testosterona total libre shbg', estado: 'activo' },
    { id_prueba: 'LAB-205', nombre_prueba: 'Parámetros cardiovasculares/metabólicos', categoria: 'Riesgo cardiovascular', requiere_ayuno: true, horas_ayuno: 12, palabras_clave: 'cardiovascular metabolico lipidos glucosa pcr apolipoproteina', estado: 'activo' }
  ],

  // ============================================================
  // OPCIONES DE IMÁGENES (no es buscable, solo lista)
  // ============================================================
  master_imagenes: [
    'Ecografía abdominal completa',
    'Ecografía hepática',
    'Ecografía de vesícula biliar',
    'Ecografía pancreática',
    'Tomografía de abdomen',
    'Tomografía de abdomen con contraste',
    'Resonancia de abdomen',
    'Resonancia de abdomen con contraste',
    'Otro estudio (detallar abajo)'
  ],

  // ============================================================
  // PACIENTES (mock — los reales vendrán del Sheet)
  // El HTML del v5 ya tiene los pacientes hardcoded en las tablas
  // de la pantalla. Cuando se conecte al backend, esas tablas se
  // generarán dinámicamente desde aquí.
  // ============================================================
  pacientes: [
    { id_paciente: 'PAC-00001', nombres: 'Camila',  apellido_paterno: 'Reyes',     dni: '70123456', estado_paciente: 'en_programa', id_medico_responsable: 'PROF-00001' },
    { id_paciente: 'PAC-00042', nombres: 'María',   apellido_paterno: 'González',  dni: '70234567', estado_paciente: 'en_programa', id_medico_responsable: 'PROF-00001' },
    { id_paciente: 'PAC-00089', nombres: 'Roberto', apellido_paterno: 'Silva',     dni: '70345678', estado_paciente: 'en_programa', id_medico_responsable: 'PROF-00001' },
    { id_paciente: 'PAC-00112', nombres: 'Diana',   apellido_paterno: 'Castro',    dni: '70456789', estado_paciente: 'prospecto',   id_medico_responsable: 'PROF-00001' },
    { id_paciente: 'PAC-00133', nombres: 'Elena',   apellido_paterno: 'Moreno',    dni: '70567890', estado_paciente: 'post_alta',   id_medico_responsable: 'PROF-00001' }
  ]
};

// Exponer en window para acceso global
window.MOCK = MOCK;
window.currentUser = MOCK.currentUser;
