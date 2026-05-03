/**
 * app.js — Bootstrap y lógica de la app GutDoc Admin
 *
 * Este archivo contiene:
 * - Inicialización (iconos, tema, navegación)
 * - Manejo de pantallas y navegación
 * - Gestión de modales (cierre, decisión post-programa, solicitud médica)
 * - Toasts, sonidos, animaciones
 * - Lógica del modal de Solicitud Médica con buscador de laboratorios
 * - Lógica del Kanban comercial (drag & drop)
 *
 * En FASE 6, las acciones que hoy son simuladas (toasts/console)
 * pasarán a llamar funciones de api.js que harán las peticiones reales.
 *
 * El usuario actual está disponible globalmente como window.currentUser.
 * El cliente API está disponible globalmente como window.api.
 */

// =========================================================
// INICIALIZACIÓN BÁSICA
// =========================================================

// Iconos Lucide
lucide.createIcons();

// Saludo opcional según rol — útil para debugging
console.log('%cGutDoc Admin v5', 'color:#0E9FCA; font-weight:bold; font-size:14px');
console.log('Usuario activo:', window.currentUser);
console.log('Modo backend:', API_CONFIG.USE_BACKEND ? 'CONECTADO (FASE 6)' : 'MOCK (FASE 5)');

// Inicializar Lucide
lucide.createIcons();

// =========================================================
// NAVEGACIÓN ENTRE PANTALLAS
// =========================================================
const screens = document.querySelectorAll('.screen');
const navItems = document.querySelectorAll('.sidebar-item');
const breadcrumb = document.getElementById('breadcrumb');

const screenLabels = {
  dashboard:   'Dashboard',
  pacientes:   'Pacientes',
  admision:    'Admisión <strong>· Nueva solicitud o paciente</strong>',
  ciclo:       'Pacientes <strong>· María González</strong>',
  postalta:    'Pacientes <strong>· Elena Moreno · Post-alta</strong>',
  tareas:      'Operación <strong>· Tareas de hoy</strong>',
  mensajes:    'Comunicación <strong>· Mensajes pendientes</strong>',
  comercial:   'Comercial <strong>· Embudo de ventas</strong>',
  incidencias: 'Soporte <strong>· Incidencias</strong>'
};

function navigateTo(screenName) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + screenName).classList.add('active');

  navItems.forEach(i => i.classList.remove('active'));
  const navItem = document.querySelector(`.sidebar-item[data-screen="${screenName}"]`);
  if (navItem) navItem.classList.add('active');

  breadcrumb.innerHTML = `<strong>${screenLabels[screenName] || screenName}</strong>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Re-inicializar iconos por si la pantalla tiene nuevos
  setTimeout(() => lucide.createIcons(), 50);
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const screen = item.dataset.screen;
    if (screen) navigateTo(screen);
  });
});

// Click en filas de pacientes → ir a ciclo
document.querySelectorAll('[data-screen]').forEach(el => {
  el.addEventListener('click', (e) => {
    if (e.target.closest('button') && !el.classList.contains('sidebar-item')) return;
    const screen = el.dataset.screen;
    if (screen) navigateTo(screen);
  });
});

// =========================================================
// SISTEMA DE SONIDOS SUTILES (WebAudio API)
// =========================================================
let soundOn = true;  // Activado por default
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, duration = 0.12, volume = 0.05, type = 'sine') {
  if (!soundOn) return;
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function soundComplete() { playTone(880, 0.08, 0.04); setTimeout(() => playTone(1320, 0.10, 0.04), 80); }
function soundAlert()    { playTone(660, 0.18, 0.06, 'triangle'); }
function soundError()    { playTone(220, 0.20, 0.05, 'sawtooth'); }

// Toggle de sonido
const soundToggle = document.getElementById('sound-toggle');
const soundState = document.getElementById('sound-state');
soundToggle.addEventListener('click', () => {
  soundOn = !soundOn;
  soundState.textContent = 'Sonidos ' + (soundOn ? 'ON' : 'OFF');
  soundToggle.style.color = soundOn ? 'var(--c-cian)' : '';
  if (soundOn) {
    ensureAudio();
    playTone(660, 0.08, 0.04);
    setTimeout(() => playTone(990, 0.10, 0.04), 80);
  }
});

// =========================================================
// TOAST NOTIFICATIONS
// =========================================================
const toastHost = document.getElementById('toast-host');

function toast({ type = 'info', title = '', message = '', duration = 4000 } = {}) {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const iconName = { success: 'check-circle-2', error: 'x-circle', warning: 'alert-triangle', info: 'info' }[type] || 'info';
  el.innerHTML = `<i data-lucide="${iconName}" class="icon"></i><div><strong>${title}</strong><span>${message}</span></div>`;
  toastHost.appendChild(el);
  lucide.createIcons();
  setTimeout(() => {
    el.classList.add('exit');
    setTimeout(() => el.remove(), 200);
  }, duration);
}

// =========================================================
// INTERACCIONES: marcar tarea / mensaje
// =========================================================
document.addEventListener('click', (e) => {
  const completeBtn = e.target.closest('[data-complete]');
  if (completeBtn) {
    e.stopPropagation();
    const row = completeBtn.closest('tr, .agenda-row');
    if (row) {
      // Animar el cambio
      const tagSpan = row.querySelector('.tag');
      if (tagSpan) {
        tagSpan.className = 'tag tag-completa';
        tagSpan.textContent = 'Completada';
      }
      const bar = row.querySelector('.agenda-bar');
      if (bar) bar.className = 'agenda-bar done';
      completeBtn.outerHTML = '<span class="check-anim">✓</span>';
      soundComplete();
      toast({ type: 'success', title: 'Tarea completada', message: 'Se actualizó el cumplimiento del paciente.' });
    }
    return;
  }

  const action = e.target.closest('[data-action]');
  if (action) {
    e.stopPropagation();
    const type = action.dataset.action;
    if (type === 'copy') {
      toast({ type: 'success', title: 'Texto copiado', message: 'Pega el mensaje en WhatsApp del paciente.' });
      playTone(880, 0.06, 0.03);
    } else if (type === 'open-wa') {
      toast({ type: 'info', title: 'Abriendo WhatsApp', message: 'Se abrió wa.me con texto pre-cargado.' });
    } else if (type === 'mark-sent') {
      const card = action.closest('.message-card');
      if (card) {
        card.classList.add('sent');
        const tag = card.querySelector('.tag-pendiente');
        if (tag) { tag.className = 'tag tag-completa'; tag.textContent = 'Enviado'; }
        action.parentElement.innerHTML = '<button class="btn btn-ghost btn-sm"><i data-lucide="eye" class="icon"></i>Ver detalle</button>';
        lucide.createIcons();
        soundComplete();
        toast({ type: 'success', title: 'Mensaje registrado', message: 'Se guardó en historial de envíos. Esperando respuesta del paciente.' });
      }
    }
    return;
  }
});

// Filtros chips
document.querySelectorAll('.filters').forEach(group => {
  group.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
});

// Toggle de componentes (paciente)
document.querySelectorAll('.component').forEach(comp => {
  const toggle = comp.querySelector('.component-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      comp.classList.toggle('active');
      comp.classList.toggle('inactive');
      const state = comp.querySelector('.component-state');
      if (comp.classList.contains('active')) {
        state.textContent = 'Activo';
        toast({ type: 'success', title: 'Componente activado', message: 'Se generarán las tareas correspondientes.' });
        soundComplete();
      } else {
        state.textContent = 'No aplica';
        toast({ type: 'warning', title: 'Componente desactivado', message: 'Las tareas asociadas no se instanciarán.' });
        soundAlert();
      }
    });
  }
});

// =========================================================
// MENÚ MÓVIL Y BOTTOM NAV
// =========================================================

// Demo automático: mostrar un toast al inicio
setTimeout(() => {
  toast({ type: 'info', title: 'Sistema cargado', message: 'Maqueta visual lista para validación.' });
}, 600);

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileOverlay = document.getElementById('mobile-overlay');
const sidebar = document.querySelector('.sidebar');

mobileMenuBtn.addEventListener('click', () => {
  sidebar.classList.add('mobile-open');
  mobileOverlay.classList.add('active');
});

mobileOverlay.addEventListener('click', () => {
  sidebar.classList.remove('mobile-open');
  mobileOverlay.classList.remove('active');
});

// Bottom nav (móvil)
document.querySelectorAll('.bottom-nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const screen = item.dataset.screen;
    if (screen) navigateTo(screen);
  });
});

// Cerrar sidebar móvil al navegar
const originalNavigateTo = navigateTo;
navigateTo = function(screenName) {
  originalNavigateTo(screenName);
  sidebar.classList.remove('mobile-open');
  mobileOverlay.classList.remove('active');
  // Sincronizar bottom nav
  document.querySelectorAll('.bottom-nav-item').forEach(i => {
    i.classList.toggle('active', i.dataset.screen === screenName);
  });
};

// =========================================================
// ADMISIÓN: tabs entre Solicitud y Paciente nuevo
// =========================================================
document.querySelectorAll('[data-tab]').forEach(tabBtn => {
  tabBtn.addEventListener('click', () => {
    const target = tabBtn.dataset.tab;
    document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
    tabBtn.classList.add('active');
    document.getElementById('tab-solicitud-programa').style.display = (target === 'solicitud-programa') ? 'block' : 'none';
    document.getElementById('tab-paciente-nuevo').style.display = (target === 'paciente-nuevo') ? 'block' : 'none';
    setTimeout(() => lucide.createIcons(), 30);
  });
});

document.querySelectorAll('[data-tab-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tabTarget;
    const chip = document.querySelector(`[data-tab="${target}"]`);
    if (chip) chip.click();
  });
});

// Submit de formularios de admisión
document.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]');
  if (!action) return;
  const type = action.dataset.action;

  if (type === 'submit-solicitud') {
    soundComplete();
    toast({
      type: 'success',
      title: 'Solicitud enviada a Ventas',
      message: 'SPG-00019 creada. El equipo comercial fue notificado.',
      duration: 5000
    });
    setTimeout(() => navigateTo('comercial'), 800);
  } else if (type === 'submit-paciente') {
    soundComplete();
    toast({
      type: 'success',
      title: 'Paciente registrado',
      message: 'PAC-00130 creado. Listo para crear solicitud de programa.'
    });
  }
});

// =========================================================
// MODAL SOLICITUD MÉDICA + BUSCADOR DE PRUEBAS DE LABORATORIO
// =========================================================

// Master de laboratorios (mock — en producción vendrá del Sheet `33_Master_Laboratorios`)
// Incluye pruebas comunes en programas metabólicos según especificación de Dr. La Torre
const MASTER_LABS = [
  // Lípidos / cardiovascular
  { id: 'LAB-001', nombre: 'Perfil lipídico completo', categoria: 'Lípidos', ayuno: '12h', keywords: 'perfil lipidico colesterol ldl hdl trigliceridos cardiovascular' },
  { id: 'LAB-002', nombre: 'Colesterol total', categoria: 'Lípidos', ayuno: '12h', keywords: 'colesterol total' },
  { id: 'LAB-003', nombre: 'Apolipoproteína B', categoria: 'Riesgo cardiovascular', ayuno: '12h', keywords: 'apo b apolipoproteina cardiovascular' },
  { id: 'LAB-004', nombre: 'Lipoproteína (a)', categoria: 'Riesgo cardiovascular', ayuno: 'Sin ayuno', keywords: 'lipoproteina lp a cardiovascular' },

  // Glucosa / metabolismo / resistencia insulina
  { id: 'LAB-010', nombre: 'Glucosa basal en ayunas', categoria: 'Glucosa metabólico', ayuno: '8h', keywords: 'glucosa azucar diabetes basal ayunas metabolismo' },
  { id: 'LAB-011', nombre: 'Insulina basal', categoria: 'Resistencia a la insulina', ayuno: '8h', keywords: 'insulina basal homa resistencia' },
  { id: 'LAB-012', nombre: 'HOMA-IR (índice resistencia insulina)', categoria: 'Resistencia a la insulina', ayuno: '8h', keywords: 'homa ir resistencia insulina indice metabolismo' },
  { id: 'LAB-013', nombre: 'Hemoglobina glicosilada (HbA1c)', categoria: 'Glucosa metabólico', ayuno: 'Sin ayuno', keywords: 'hba1c hemoglobina glicosilada diabetes promedio glucosa' },
  { id: 'LAB-014', nombre: 'Test de tolerancia oral a la glucosa (TTOG)', categoria: 'Glucosa metabólico', ayuno: '8h', keywords: 'ttog tolerancia oral glucosa curva glicemica diabetes gestacional' },
  { id: 'LAB-015', nombre: 'Test de tolerancia con insulina', categoria: 'Resistencia a la insulina', ayuno: '8h', keywords: 'tolerancia insulina curva resistencia metabolismo' },
  { id: 'LAB-016', nombre: 'Péptido C', categoria: 'Glucosa metabólico', ayuno: '8h', keywords: 'peptido c funcion pancreatica diabetes' },

  // Inflamación
  { id: 'LAB-020', nombre: 'PCR ultrasensible', categoria: 'Marcadores inflamación', ayuno: 'Sin ayuno', keywords: 'pcr proteina c reactiva inflamacion ultrasensible cardiovascular' },
  { id: 'LAB-021', nombre: 'Velocidad de sedimentación (VSG)', categoria: 'Marcadores inflamación', ayuno: 'Sin ayuno', keywords: 'vsg sedimentacion eritrosedimentacion inflamacion' },
  { id: 'LAB-022', nombre: 'Ferritina', categoria: 'Marcadores inflamación', ayuno: 'Sin ayuno', keywords: 'ferritina hierro inflamacion deposito' },

  // Tiroides
  { id: 'LAB-030', nombre: 'TSH (hormona estimulante de tiroides)', categoria: 'Tiroides', ayuno: 'Sin ayuno', keywords: 'tsh tiroides hormona estimulante hipotiroidismo perfil tiroideo' },
  { id: 'LAB-031', nombre: 'T4 libre', categoria: 'Tiroides', ayuno: 'Sin ayuno', keywords: 't4 libre tiroides hormona perfil tiroideo' },
  { id: 'LAB-032', nombre: 'T3 libre', categoria: 'Tiroides', ayuno: 'Sin ayuno', keywords: 't3 libre tiroides hormona perfil tiroideo' },
  { id: 'LAB-033', nombre: 'Anticuerpos anti-TPO', categoria: 'Tiroides', ayuno: 'Sin ayuno', keywords: 'anti tpo anticuerpos tiroides hashimoto autoinmune' },
  { id: 'LAB-034', nombre: 'Tiroglobulina', categoria: 'Tiroides', ayuno: 'Sin ayuno', keywords: 'tiroglobulina tiroides' },

  // Hormonal
  { id: 'LAB-040', nombre: 'Cortisol matutino', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'cortisol matutino estres suprarrenal' },
  { id: 'LAB-041', nombre: 'Cortisol vespertino', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'cortisol vespertino tarde estres' },
  { id: 'LAB-042', nombre: 'Testosterona total', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'testosterona total perfil hormonal' },
  { id: 'LAB-043', nombre: 'Testosterona libre', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'testosterona libre perfil hormonal' },
  { id: 'LAB-044', nombre: 'Estradiol', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'estradiol estrogeno perfil hormonal' },
  { id: 'LAB-045', nombre: 'Progesterona', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'progesterona perfil hormonal' },
  { id: 'LAB-046', nombre: 'FSH', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'fsh foliculo estimulante perfil hormonal' },
  { id: 'LAB-047', nombre: 'LH', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'lh luteinizante perfil hormonal' },
  { id: 'LAB-048', nombre: 'Prolactina', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'prolactina perfil hormonal' },
  { id: 'LAB-049', nombre: 'DHEA-S', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'dhea s sulfato suprarrenal perfil hormonal' },
  { id: 'LAB-050', nombre: 'SHBG (globulina fijadora de hormonas)', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'shbg globulina fijadora perfil hormonal' },

  // Vitaminas
  { id: 'LAB-060', nombre: 'Vitamina D (25-OH)', categoria: 'Vitaminas', ayuno: 'Sin ayuno', keywords: 'vitamina d 25 oh deficit hueso' },
  { id: 'LAB-061', nombre: 'Vitamina B12', categoria: 'Vitaminas', ayuno: 'Sin ayuno', keywords: 'vitamina b12 cobalamina' },
  { id: 'LAB-062', nombre: 'Ácido fólico', categoria: 'Vitaminas', ayuno: 'Sin ayuno', keywords: 'acido folico folato vitamina b9' },

  // Hematología
  { id: 'LAB-070', nombre: 'Hemograma completo', categoria: 'Hematología', ayuno: 'Sin ayuno', keywords: 'hemograma completo sangre globulos hemoglobina hematocrito' },

  // Función renal
  { id: 'LAB-080', nombre: 'Creatinina sérica', categoria: 'Función renal', ayuno: 'Sin ayuno', keywords: 'creatinina rinon renal funcion perfil renal' },
  { id: 'LAB-081', nombre: 'Urea', categoria: 'Función renal', ayuno: 'Sin ayuno', keywords: 'urea bun rinon renal perfil renal' },
  { id: 'LAB-082', nombre: 'Ácido úrico', categoria: 'Función renal', ayuno: 'Sin ayuno', keywords: 'acido urico gota perfil renal' },
  { id: 'LAB-083', nombre: 'Microalbuminuria', categoria: 'Función renal', ayuno: 'Sin ayuno', keywords: 'microalbuminuria orina rinon renal' },
  { id: 'LAB-084', nombre: 'Tasa de filtración glomerular (TFG)', categoria: 'Función renal', ayuno: 'Sin ayuno', keywords: 'tfg filtracion glomerular rinon perfil renal' },

  // Función hepática
  { id: 'LAB-090', nombre: 'AST / TGO', categoria: 'Función hepática', ayuno: 'Sin ayuno', keywords: 'tgo ast aspartato hepatico higado perfil hepatico' },
  { id: 'LAB-091', nombre: 'ALT / TGP', categoria: 'Función hepática', ayuno: 'Sin ayuno', keywords: 'tgp alt alanina hepatico higado perfil hepatico' },
  { id: 'LAB-092', nombre: 'GGT (Gamma-glutamil transferasa)', categoria: 'Función hepática', ayuno: 'Sin ayuno', keywords: 'ggt gamma glutamil hepatico higado perfil hepatico' },
  { id: 'LAB-093', nombre: 'Fosfatasa alcalina', categoria: 'Función hepática', ayuno: 'Sin ayuno', keywords: 'fosfatasa alcalina hepatico higado perfil hepatico' },
  { id: 'LAB-094', nombre: 'Bilirrubina total y fraccionada', categoria: 'Función hepática', ayuno: 'Sin ayuno', keywords: 'bilirrubina total directa indirecta hepatico higado perfil hepatico' },
  { id: 'LAB-095', nombre: 'Albúmina sérica', categoria: 'Función hepática', ayuno: 'Sin ayuno', keywords: 'albumina hepatico higado proteina' },

  // Perfiles agrupados (atajos)
  { id: 'LAB-200', nombre: 'Perfil hepático completo', categoria: 'Función hepática', ayuno: '8h', keywords: 'perfil hepatico tgo tgp ggt fosfatasa bilirrubina higado' },
  { id: 'LAB-201', nombre: 'Perfil renal completo', categoria: 'Función renal', ayuno: 'Sin ayuno', keywords: 'perfil renal creatinina urea acido urico tfg rinon' },
  { id: 'LAB-202', nombre: 'Perfil tiroideo completo', categoria: 'Tiroides', ayuno: 'Sin ayuno', keywords: 'perfil tiroideo tsh t4 t3 anticuerpos tiroides' },
  { id: 'LAB-203', nombre: 'Perfil hormonal femenino', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'perfil hormonal femenino estradiol fsh lh progesterona prolactina' },
  { id: 'LAB-204', nombre: 'Perfil hormonal masculino', categoria: 'Hormonal', ayuno: 'Sin ayuno', keywords: 'perfil hormonal masculino testosterona total libre shbg' },
  { id: 'LAB-205', nombre: 'Parámetros cardiovasculares/metabólicos', categoria: 'Riesgo cardiovascular', ayuno: '12h', keywords: 'cardiovascular metabolico lipidos glucosa pcr apolipoproteina' },
];

const modalNewSolicitud = document.getElementById('modal-new-solicitud');
const labSearchInput = document.getElementById('lab-search-input');
const labSuggestions = document.getElementById('lab-suggestions');
const labSelected = document.getElementById('lab-selected');

// Abrir modal
document.querySelectorAll('[data-action="open-new-solicitud-medica"]').forEach(btn => {
  btn.addEventListener('click', () => {
    modalNewSolicitud.classList.add('active');
    setTimeout(() => lucide.createIcons(), 30);
  });
});

// Cambio de tipo de solicitud → muestra/oculta secciones condicionales
function applyTipoSolicitud(tipo) {
  const sections = modalNewSolicitud.querySelectorAll('.sol-type-section');
  const hideOnPrograma = modalNewSolicitud.querySelectorAll('[data-only-not="programa"]');
  const submitBtn = modalNewSolicitud.querySelector('[data-action="submit-solicitud-medica"]');

  // Mapeo de tipo → sección a mostrar
  const sectionMap = {
    programa: 'programa',
    laboratorio: 'laboratorio',
    imagen: 'imagen',
    interconsulta: 'generic',
    nutricion: 'generic',
    psicologia: 'generic',
    psiquiatria: 'generic',
    otro: 'generic'
  };
  const target = sectionMap[tipo] || 'generic';

  sections.forEach(s => {
    s.style.display = (s.dataset.section === target) ? 'block' : 'none';
  });

  // Si es Solicitud de Programa → ocultar la sección "6 · Detalle e instrucciones"
  // (porque ya tiene sus propios campos comerciales) y cambiar el texto del submit
  hideOnPrograma.forEach(el => {
    el.style.display = (tipo === 'programa') ? 'none' : '';
  });

  // Cambiar el label del botón según el tipo
  if (submitBtn) {
    if (tipo === 'programa') {
      submitBtn.innerHTML = '<i data-lucide="send" class="icon"></i>Enviar a Ventas y generar PDF';
    } else {
      submitBtn.innerHTML = '<i data-lucide="send" class="icon"></i>Crear solicitud y generar PDF';
    }
    setTimeout(() => lucide.createIcons(), 30);
  }
}

// Listener en los radios del tipo
modalNewSolicitud.querySelectorAll('input[name="sol-type"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    applyTipoSolicitud(e.target.value);
    playTone(880, 0.05, 0.025);
  });
});

// Inicializar con el tipo seleccionado por default (programa)
applyTipoSolicitud('programa');

// Cerrar modal solicitud médica
document.querySelectorAll('[data-modal-close-sm]').forEach(btn => {
  btn.addEventListener('click', () => modalNewSolicitud.classList.remove('active'));
});
modalNewSolicitud.addEventListener('click', (e) => {
  if (e.target === modalNewSolicitud) modalNewSolicitud.classList.remove('active');
});

// Buscador autocomplete
function filterLabs(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  // Filtrar pruebas que no estén ya seleccionadas
  const selectedNames = Array.from(labSelected.querySelectorAll('.lab-chip'))
    .map(c => c.childNodes[1]?.textContent.trim().toLowerCase());
  return MASTER_LABS.filter(lab => {
    if (selectedNames.includes(lab.nombre.toLowerCase())) return false;
    return lab.nombre.toLowerCase().includes(q) || lab.keywords.toLowerCase().includes(q) || lab.categoria.toLowerCase().includes(q);
  }).slice(0, 6);
}

function renderSuggestions(labs) {
  if (labs.length === 0) {
    labSuggestions.style.display = 'none';
    return;
  }
  labSuggestions.innerHTML = labs.map(lab => `
    <div class="lab-suggestion-item" data-lab-id="${lab.id}" data-lab-nombre="${lab.nombre}" data-lab-ayuno="${lab.ayuno}">
      <div class="lab-icon"><i data-lucide="flask-conical" style="width:14px; height:14px;"></i></div>
      <div class="lab-suggestion-info">
        <div class="lab-suggestion-name">${lab.nombre}</div>
        <div class="lab-suggestion-meta">${lab.categoria} · ${lab.ayuno}</div>
      </div>
    </div>
  `).join('');
  labSuggestions.style.display = 'block';
  lucide.createIcons();
}

labSearchInput.addEventListener('input', (e) => {
  const results = filterLabs(e.target.value);
  renderSuggestions(results);
});

labSearchInput.addEventListener('focus', (e) => {
  if (e.target.value.length >= 2) {
    renderSuggestions(filterLabs(e.target.value));
  }
});

// Click fuera del buscador cierra sugerencias
document.addEventListener('click', (e) => {
  if (!e.target.closest('.lab-search-container')) {
    labSuggestions.style.display = 'none';
  }
});

// Click en sugerencia añade chip
labSuggestions.addEventListener('click', (e) => {
  const item = e.target.closest('.lab-suggestion-item');
  if (!item) return;
  const nombre = item.dataset.labNombre;
  const ayuno = item.dataset.labAyuno;
  const chip = document.createElement('div');
  chip.className = 'lab-chip';
  chip.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.58 16.5h12.85"/></svg>
    ${nombre}
    <span class="lab-chip-meta">${ayuno}</span>
    <button class="lab-chip-remove" data-remove-lab>×</button>
  `;
  labSelected.appendChild(chip);
  labSearchInput.value = '';
  labSuggestions.style.display = 'none';
  playTone(880, 0.06, 0.03);
});

// Quitar chip
labSelected.addEventListener('click', (e) => {
  if (e.target.matches('[data-remove-lab]')) {
    e.target.closest('.lab-chip').remove();
    playTone(660, 0.06, 0.03);
  }
});

// Submit solicitud médica
document.querySelector('[data-action="submit-solicitud-medica"]').addEventListener('click', () => {
  const generaPdf = document.getElementById('generate-pdf-check').checked;
  const tipoSeleccionado = modalNewSolicitud.querySelector('input[name="sol-type"]:checked')?.value || 'otro';
  const numLabs = labSelected.querySelectorAll('.lab-chip').length;
  modalNewSolicitud.classList.remove('active');
  soundComplete();

  // Caso especial: Solicitud de Programa → flujo distinto
  if (tipoSeleccionado === 'programa') {
    toast({
      type: 'success',
      title: 'Solicitud de Programa creada · SPG-00019',
      message: 'Enviada al Embudo de Seguimiento Comercial. Ventas fue notificado.',
      duration: 4500
    });
    if (generaPdf) {
      setTimeout(() => {
        toast({
          type: 'info',
          title: 'PDF de propuesta generado',
          message: 'SPG-00019.pdf en Drive · Listo para que Ventas lo envíe al paciente.',
          duration: 5000
        });
      }, 1500);
    }
    setTimeout(() => navigateTo('comercial'), 3000);
    return;
  }

  // Caso general: Laboratorio, Imagen, Interconsulta, etc.
  const detalleMsg = (tipoSeleccionado === 'laboratorio' && numLabs > 0)
    ? `${numLabs} pruebas seleccionadas. ${generaPdf ? 'Generando PDF en Drive...' : 'Sin PDF.'}`
    : 'Solicitud guardada.';

  toast({
    type: 'success',
    title: 'Solicitud creada · SOL-00085',
    message: detalleMsg,
    duration: 3500
  });

  if (generaPdf) {
    setTimeout(() => {
      toast({
        type: 'success',
        title: 'PDF generado en Google Drive',
        message: 'SOL-00085.pdf · Listo para enviar al paciente o destinatario.',
        duration: 5000
      });
    }, 1800);
  }
});

// Generar PDF desde tabla (botón en fila)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="generate-pdf"]');
  if (btn) {
    e.stopPropagation();
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="icon" style="animation: spin 1s linear infinite;"></i>Generando...';
    lucide.createIcons();
    setTimeout(() => {
      const row = btn.closest('tr');
      const id = row?.querySelector('td:first-child span')?.textContent.trim() || 'SOL-00085';
      btn.outerHTML = `<a href="#" class="content-link" style="cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>${id}.pdf</a>`;
      soundComplete();
      toast({
        type: 'success',
        title: 'PDF generado',
        message: `${id}.pdf guardado en Google Drive · /GutDoc_Solicitudes/2026/05/`,
        duration: 4500
      });
    }, 1500);
  }
});

// Agregar al breadcrumb
const originalScreenLabels2 = screenLabels;
Object.assign(screenLabels, {
  'solicitudes-medicas': 'Operación <strong>· Solicitudes Médicas GutDoc</strong>'
});

// Spin keyframe (para loader)
const styleSpin = document.createElement('style');
styleSpin.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
document.head.appendChild(styleSpin);

// Atajo: filas de pacientes → ciclo o post-alta según el caso
document.querySelectorAll('#screen-pacientes tbody tr').forEach((row) => {
  row.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    const isPostAlta = row.querySelector('.cell-name')?.textContent.trim() === 'Elena Moreno';
    if (isPostAlta) {
      navigateTo('postalta');
    } else {
      navigateTo('ciclo');
    }
  });
});

// =========================================================
// MODAL DE CIERRE DE CICLO
// =========================================================
const modalCloseCycle = document.getElementById('modal-close-cycle');
const decisionGrid = document.getElementById('decision-grid');
let selectedDecision = null;

document.querySelectorAll('[data-action="close-cycle"]').forEach(btn => {
  btn.addEventListener('click', () => {
    modalCloseCycle.classList.add('active');
    soundAlert();
    setTimeout(() => lucide.createIcons(), 30);
  });
});

document.querySelectorAll('[data-modal-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    modalCloseCycle.classList.remove('active');
    selectedDecision = null;
    decisionGrid.querySelectorAll('.decision-option').forEach(o => o.classList.remove('selected'));
  });
});

modalCloseCycle.addEventListener('click', (e) => {
  if (e.target === modalCloseCycle) {
    modalCloseCycle.classList.remove('active');
  }
});

// Selección de decisión clínica
decisionGrid.querySelectorAll('.decision-option').forEach(option => {
  option.addEventListener('click', () => {
    decisionGrid.querySelectorAll('.decision-option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    selectedDecision = option.dataset.decision;
    playTone(880, 0.06, 0.03);
  });
});

// Confirmar cierre de ciclo
document.querySelector('[data-action="confirm-close-cycle"]').addEventListener('click', () => {
  if (!selectedDecision) {
    toast({ type: 'warning', title: 'Decisión requerida', message: 'Selecciona una decisión clínica antes de cerrar el ciclo.' });
    soundError();
    return;
  }
  modalCloseCycle.classList.remove('active');
  soundComplete();

  const decisionLabels = {
    'continuar_microdosificacion': 'Microdosificación',
    'iniciar_nuevo_programa_completo': 'Nueva ronda completa',
    'volver_escalar_dosis': 'Escalar dosis',
    'cambiar_estrategia_terapeutica': 'Cambio de estrategia',
    'pasar_alta_medica': 'Alta médica',
    'pasar_seguimiento_largo_plazo': 'Seguimiento largo plazo',
    'pausar_temporalmente': 'Pausa temporal',
    'no_continua_economico': 'No continúa (económico) + Seg LP',
    'no_continua_paciente': 'No continúa (paciente) + Seg LP',
    'pendiente_decision': 'Pendiente'
  };

  toast({
    type: 'success',
    title: 'Ciclo cerrado correctamente',
    message: `Decisión: ${decisionLabels[selectedDecision]}. Se generaron las tareas siguientes y los seguimientos LP.`,
    duration: 6000
  });

  // Animar el header del paciente con un banner de cierre
  setTimeout(() => {
    const patientHeader = document.querySelector('#screen-ciclo .patient-name-block h2');
    if (patientHeader) {
      patientHeader.innerHTML = 'Ronda 2 · <span style="color: var(--c-cian-soft);">✓ Completada</span>';
    }
  }, 400);

  selectedDecision = null;
  decisionGrid.querySelectorAll('.decision-option').forEach(o => o.classList.remove('selected'));
});

// =========================================================
// PANEL LATERAL KANBAN
// =========================================================
const kanbanPanel = document.getElementById('kanban-panel');
const panelTitle = document.getElementById('panel-title');

document.querySelectorAll('.kanban-card').forEach(card => {
  card.addEventListener('click', (e) => {
    if (card.classList.contains('dragging')) return;
    const name = card.querySelector('.kanban-card-name').textContent;
    panelTitle.textContent = name;
    kanbanPanel.classList.add('active');
    setTimeout(() => lucide.createIcons(), 30);
  });
});

document.querySelectorAll('[data-panel-close]').forEach(btn => {
  btn.addEventListener('click', () => kanbanPanel.classList.remove('active'));
});

document.querySelectorAll('.panel-stage-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.panel-stage-option').forEach(o => o.classList.remove('current'));
    opt.classList.add('current');
    playTone(880, 0.06, 0.03);
  });
});

document.querySelector('[data-action="save-panel"]').addEventListener('click', () => {
  kanbanPanel.classList.remove('active');
  soundComplete();
  toast({
    type: 'success',
    title: 'Cambios guardados',
    message: 'Solicitud actualizada en el embudo. Histórico registrado.'
  });
});

// =========================================================
// DRAG & DROP DEL KANBAN
// =========================================================
let draggedCard = null;

document.querySelectorAll('.kanban-card').forEach(card => {
  card.setAttribute('draggable', 'true');

  card.addEventListener('dragstart', (e) => {
    draggedCard = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.kanban-col').forEach(col => col.classList.remove('drag-over'));
    draggedCard = null;
  });
});

document.querySelectorAll('.kanban-col').forEach(col => {
  col.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    col.classList.add('drag-over');
  });

  col.addEventListener('dragleave', (e) => {
    if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
  });

  col.addEventListener('drop', (e) => {
    e.preventDefault();
    col.classList.remove('drag-over');

    if (!draggedCard) return;

    const stageName = col.dataset.state;
    const stageLabels = {
      'nuevo': 'Nuevas',
      'presupuesto': 'Presupuesto enviado',
      'seguimiento': 'En seguimiento',
      'pagado': 'Pagado · Activo',
      'no-pago': 'No convirtió'
    };

    // Mover la tarjeta al final de la columna
    col.appendChild(draggedCard);

    // Actualizar el contador de cada columna
    document.querySelectorAll('.kanban-col').forEach(c => {
      const count = c.querySelectorAll('.kanban-card').length;
      const counter = c.querySelector('.kanban-col-count');
      if (counter) counter.textContent = count;
    });

    const cardName = draggedCard.querySelector('.kanban-card-name').textContent;
    soundComplete();
    toast({
      type: 'success',
      title: 'Etapa actualizada',
      message: `${cardName} → ${stageLabels[stageName]}`
    });

    // Si se mueve a "pagado" → activación automática del programa
    if (stageName === 'pagado') {
      setTimeout(() => {
        toast({
          type: 'info',
          title: 'Programa activado',
          message: 'Se creó el ciclo, las tareas y se asignó al Program Specialist.'
        });
      }, 1200);
    }
  });
});
