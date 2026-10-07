// 🎨 [ÍCONOS DE APP 2026-08-10, split 2026-08-12] Datos puros (glifos + construcción de SVG) —
// separado de iconosApps.js a propósito: iconosApps.js importa puppeteer (solo corre en Node, para
// el PNG del instalador), pero el ÍCONO EN SÍ (mismo glifo, mismo color) también se muestra en Mis
// Apps del lado del navegador. Este archivo es la única fuente de verdad de "qué dibuja cada
// categoría" — nunca duplicar el set de glifos en un mapeo aparte (ver [[feedback-estilomeiti-css]]
// y el pedido explícito del usuario de no crear una segunda tabla hardcodeada para lo mismo).
//
// Glifos tomados tal cual de lucide-react (ya es dependencia real de este proyecto, licencia ISC,
// uso libre) — mismo lenguaje visual limpio/consistente que el resto de MEITI, sin inventar trazos
// nuevos a mano.

export const CATEGORIAS_ICONO = {
  finanzas: {
    nombre: 'Finanzas / facturación / pagos',
    glifo: [
      ['path', { d: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1' }],
      ['path', { d: 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4' }]
    ]
  },
  tareas: {
    nombre: 'Gestión de tareas / checklists / CRM operativo',
    glifo: [
      ['path', { d: 'M13 5h8' }],
      ['path', { d: 'M13 12h8' }],
      ['path', { d: 'M13 19h8' }],
      ['path', { d: 'm3 17 2 2 4-4' }],
      ['path', { d: 'm3 7 2 2 4-4' }]
    ]
  },
  comercio: {
    nombre: 'Ventas / comercio / marketplace',
    glifo: [
      ['circle', { cx: '8', cy: '21', r: '1' }],
      ['circle', { cx: '19', cy: '21', r: '1' }],
      ['path', { d: 'M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12' }]
    ]
  },
  educacion: {
    nombre: 'Educación / academias / cursos',
    glifo: [
      ['path', { d: 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z' }],
      ['path', { d: 'M22 10v6' }],
      ['path', { d: 'M6 12.5V16a6 3 0 0 0 12 0v-3.5' }]
    ]
  },
  salud_fitness: {
    nombre: 'Salud / fitness / hábitos',
    glifo: [
      ['path', { d: 'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5' }],
      ['path', { d: 'M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27' }]
    ]
  },
  industrial: {
    nombre: 'Control industrial / automatización / operaciones',
    glifo: [
      ['path', { d: 'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915' }],
      ['circle', { cx: '12', cy: '12', r: '3' }]
    ]
  },
  comunicacion: {
    nombre: 'Comunicación / soporte / mensajería',
    glifo: [
      ['path', { d: 'M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719' }]
    ]
  },
  datos_analitica: {
    nombre: 'Analítica / dashboards / reportes',
    glifo: [
      ['path', { d: 'M3 3v16a2 2 0 0 0 2 2h16' }],
      ['path', { d: 'M18 17V9' }],
      ['path', { d: 'M13 17V5' }],
      ['path', { d: 'M8 17v-3' }]
    ]
  },
  hogar: {
    nombre: 'Hogar / familia / vida personal',
    glifo: [
      ['path', { d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' }],
      ['path', { d: 'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }]
    ]
  },
  eventos_calendario: {
    nombre: 'Eventos / turnos / agenda',
    glifo: [
      ['path', { d: 'M8 2v4' }],
      ['path', { d: 'M16 2v4' }],
      ['rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }],
      ['path', { d: 'M3 10h18' }],
      ['path', { d: 'm9 16 2 2 4-4' }]
    ]
  },
  contenido_creativo: {
    nombre: 'Contenido / creatividad / medios',
    glifo: [
      ['path', { d: 'M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z' }],
      ['circle', { cx: '12', cy: '13', r: '3' }]
    ]
  },
  // 🩹 Fallback si Gemini/Flash devuelve algo fuera del set, o si el campo nunca llegó (apps
  // forjadas antes de esta feature) — mismo hexágono de la animación "forja" del placeholder de
  // carga (ver MotorUI.jsx, 2026-08-10), para que la identidad visual de MEITI sea consistente
  // entre "cargando" y "el ícono de instalador de una app sin categoría clara".
  generico: {
    nombre: 'Genérico (default MEITI)',
    glifo: [
      ['path', { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' }]
    ]
  }
};

// El VIEWBOX de origen de todos los glifos de lucide es 24x24, trazo redondeado de 2px — se
// escalan a un grid de 100 y se centran sobre un fondo cuadrado redondeado (mismo look "app icon"
// de Material/iOS: color sólido + glifo blanco centrado).
const construirElementoSvg = ([tag, attrs]) => {
  const props = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
  return `<${tag} ${props} />`;
};

// 🔒 colorHex se valida contra un regex estricto antes de interpolarlo/usarse (nunca texto libre
// de la IA sin filtrar) — mismo default #7c3aed (violet-600, marca MEITI) en TODOS los usos (ícono
// del instalador nativo, ícono de Mis Apps, y ahora el tinte de la tarjeta) — una sola función
// decide ese fallback, nunca se repite el criterio en otro lado.
export const resolverColorIcono = (colorHex) => (/^#[0-9a-fA-F]{6}$/.test(colorHex) ? colorHex : '#7c3aed');

export const construirSvgIcono = (categoria, colorHex) => {
  const cat = CATEGORIAS_ICONO[categoria] || CATEGORIAS_ICONO.generico;
  const glifoSvg = cat.glifo.map(construirElementoSvg).join('');
  const colorSeguro = resolverColorIcono(colorHex);
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="${colorSeguro}" />
    <g transform="translate(19,19) scale(2.583)" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${glifoSvg}
    </g>
  </svg>`;
};
