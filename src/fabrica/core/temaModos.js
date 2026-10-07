// 🌗 [MODO CLARO/OSCURO 2026-08-26, pedido del usuario: "es un feature que siempre he visto
// necesario, al menos para mí que trabajo de noche... aman un modo oscuro sin perder el tema
// visual"] Toda app generada por MEITI puede mostrarse clara u oscura, y la decide QUIEN LA USA,
// no el dueño.
//
// La condición que manda todo el diseño de acá es la última frase del pedido: SIN PERDER EL TEMA
// VISUAL. Un modo oscuro que tira a la basura la paleta que eligió el dueño no es un modo, es otra
// app. Por eso el color de marca (colorPrimario/colorSecundario) es el ancla: se conserva su TONO
// siempre, y solo se le ajusta la luminosidad lo justo para que siga legible sobre la superficie
// nueva. Los neutros se derivan de ese mismo tono con saturación muy baja — así el gris de la app
// "sabe" a su marca en vez de traer el azulado genérico de una paleta de framework.
//
// Por qué esto NO cambia nada de lo que ya existe: el "tema" guardado de cada app se toma como uno
// de los dos modos (el que sea, se detecta por la luminancia de su fondo) y se devuelve TAL CUAL
// para ese modo. Solo el modo contrario se calcula. Las 19 apps que están online se ven exactamente
// igual que hoy mientras nadie toque el interruptor.

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const aRgb = (hex) => {
  const m = HEX.exec(String(hex || '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};

const aHex = ({ r, g, b }) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// Luminancia relativa (WCAG). Es la que decide si un fondo es claro u oscuro — no el "parece
// oscuro" a ojo: un verde saturado y un azul marino pueden verse igual de intensos y tener
// luminancias opuestas.
export const luminancia = (hex) => {
  const c = aRgb(hex);
  if (!c) return 1;
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};

export const contraste = (a, b) => {
  const la = luminancia(a), lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const aHsl = (hex) => {
  const c = aRgb(hex);
  if (!c) return null;
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
};

const desdeHsl = ({ h, s, l }) => {
  if (s === 0) { const v = Math.round(l * 255); return aHex({ r: v, g: v, b: v }); }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canal = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return aHex({ r: canal(h + 1 / 3) * 255, g: canal(h) * 255, b: canal(h - 1 / 3) * 255 });
};

// El color de marca ajustado para que se lea sobre la superficie que le toca, SIN cambiar de tono.
// Solo se mueve si hace falta: si ya contrasta, se devuelve intacto.
const marcaLegible = (hex, fondo, minimo = 3.2) => {
  const hsl = aHsl(hex);
  if (!hsl) return hex;
  if (contraste(hex, fondo) >= minimo) return hex;
  const haciaArriba = luminancia(fondo) < 0.35;
  let mejor = hex, mejorContraste = contraste(hex, fondo);
  for (let paso = 1; paso <= 20; paso++) {
    const l = Math.max(0.12, Math.min(0.92, hsl.l + (haciaArriba ? 1 : -1) * paso * 0.035));
    const cand = desdeHsl({ h: hsl.h, s: hsl.s, l });
    const c = contraste(cand, fondo);
    if (c > mejorContraste) { mejor = cand; mejorContraste = c; }
    if (c >= minimo) return cand;
  }
  return mejor;
};

// Los neutros toman el TONO de la marca con saturación mínima: es lo que hace que el gris de la app
// se sienta parte de la misma paleta y no un gris de catálogo pegado encima.
const neutro = (tono, sat, luz) => desdeHsl({ h: tono, s: sat, l: luz });

const MODO_CLARO = 'claro';
const MODO_OSCURO = 'oscuro';

export const modoDeTema = (tema) => (luminancia(tema?.fondo || '#ffffff') > 0.45 ? MODO_CLARO : MODO_OSCURO);

/**
 * Los dos modos de una app. El que ya era se devuelve TAL CUAL (byte por byte el tema guardado);
 * el otro se deriva conservando el tono de marca.
 */
export const derivarModos = (tema) => {
  const base = tema || {};
  const propio = modoDeTema(base);
  const hslPrimario = aHsl(base.colorPrimario) || { h: 0.72, s: 0.9, l: 0.6 };
  const tono = hslPrimario.h;

  const opuesto = propio === MODO_CLARO
    ? {
        // Oscuro derivado de un tema claro. Nunca negro puro: un fondo tintado con el tono de la
        // marca cansa menos y mantiene la identidad.
        ...base,
        fondo: neutro(tono, 0.16, 0.065),
        superficie: neutro(tono, 0.13, 0.108),
        texto: neutro(tono, 0.14, 0.93),
        colorPrimario: marcaLegible(base.colorPrimario, neutro(tono, 0.13, 0.108)),
        colorSecundario: marcaLegible(base.colorSecundario, neutro(tono, 0.13, 0.108))
      }
    : {
        // Claro derivado de un tema oscuro. La superficie es blanca y el fondo apenas tintado, que
        // es lo que separa las tarjetas sin necesidad de sombra fuerte.
        ...base,
        fondo: neutro(tono, 0.30, 0.975),
        superficie: '#ffffff',
        texto: neutro(tono, 0.22, 0.12),
        colorPrimario: marcaLegible(base.colorPrimario, '#ffffff', 3.6),
        colorSecundario: marcaLegible(base.colorSecundario, '#ffffff', 3.6)
      };

  return propio === MODO_CLARO ? { claro: base, oscuro: opuesto } : { claro: opuesto, oscuro: base };
};

/** El tema que corresponde al modo pedido. Sin modo (o con uno desconocido) devuelve el original. */
export const resolverTema = (tema, modo) => {
  if (!tema || (modo !== MODO_CLARO && modo !== MODO_OSCURO)) return tema;
  const modos = derivarModos(tema);
  return modos[modo] || tema;
};

export const MODOS = { CLARO: MODO_CLARO, OSCURO: MODO_OSCURO };
