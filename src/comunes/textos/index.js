import { useEffect, useState } from 'react';
import es from './es.js';
import en from './en.js';

// 🌐 [MULTILENGUAJE 2026-08-21] El mecanismo de idiomas de MEITI. Un archivo por idioma, y esto
// que los conecta.
//
// POR QUÉ NO UNA LIBRERÍA (react-i18next y compañía). No es por gusto: **las apps exportadas se
// llevan el kit adentro y tienen que andar offline en una Raspberry Pi**. Una librería de i18n
// sería peso permanente en cada app generada, para siempre. Este módulo pesa lo que pesan los
// textos. Si algún día hacen falta plurales raros de seis idiomas y traductores externos con
// archivos .json, la migración es mecánica — las claves son las mismas.
//
// ⚠️ LA REGLA QUE NO SE ROMPE: la clave NUNCA es el texto en español.
// Con t("Crea tu app"), el día que se le corrige una tilde a esa frase, TODOS los demás idiomas
// se caen en silencio — sin error, sin aviso, la página queda en español para el alemán. Por eso
// las claves son nombres EN INGLÉS, snake_case: t('hero_title').
// En inglés a propósito: la IA que genere el japonés va a leer estos archivos, y una clave en
// inglés no le deja dudas de qué es cada cosa.
//
// CÓMO CRECE. Español e inglés se escriben a mano: son la cara del producto y el molde del que
// salen los demás. El resto de los idiomas los va a generar la IA sola, la primera vez que llegue
// alguien que los hable, y quedan como archivo estático — se paga una vez en la vida de ese
// idioma, no en cada visita. Ver `feedback_ia_como_fabrica_no_motor` en memoria.

const IDIOMAS = { es, en };

// Los nombres completos son los que viaja al backend y a la IA (`oraculo.js` los recibe así:
// 'español', 'english'). NO tocar esos valores — hay prompts que los usan como texto.
const NOMBRE_COMPLETO = {
  es: 'español', en: 'english', pt: 'português',
  fr: 'français', de: 'deutsch', it: 'italiano'
};

const POR_DEFECTO = 'es';
const CLAVE_GUARDADA = 'meiti_idioma';

// 🔤 El navegador ya sabe qué idioma habla la persona — no hace falta preguntárselo. Esto vivía
// dentro de LandingWizard; se mueve acá porque ahora lo necesita toda la interfaz (misma regla
// del catálogo: si se usa en dos lugares, vive en uno solo).
export const detectarIdiomaNavegador = () => {
  if (typeof navigator === 'undefined') return POR_DEFECTO;
  const prefijo = (navigator.language || '').slice(0, 2).toLowerCase();
  return NOMBRE_COMPLETO[prefijo] ? prefijo : POR_DEFECTO;
};

// Si la persona eligió un idioma a mano, esa decisión gana sobre lo que diga el navegador —
// alguien con la máquina en inglés puede preferir leer en español, y no hay que discutírselo.
const leerGuardado = () => {
  try {
    const guardado = localStorage.getItem(CLAVE_GUARDADA);
    return guardado && NOMBRE_COMPLETO[guardado] ? guardado : null;
  } catch (error) { return null; }
};

// 🔗 [SEO IDIOMAS 2026-08-22, decision del usuario: "espanol es el privilegiado, los demas
// entraran en /x/"] El idioma tambien vive en la URL: "/" es espanol y "/en/..." es ingles.
//
// Se lee ANTES que lo guardado y que el navegador, y no por capricho: si alguien abre
// "meiti.dev/en/marketplace" pidio ingles de forma explicita, mas explicita que cualquier
// preferencia vieja. Es ademas lo que hace que el prerender funcione sin trucos: el robot navega
// a la URL y la pagina ya sale en ese idioma, sin inyectarle nada al navegador.
//
// El idioma raiz NO lleva prefijo ("/", no "/es/"): asi la URL que Google ya tiene indexada no se
// mueve, y no hay dos URLs distintas sirviendo lo mismo.
export const IDIOMA_RAIZ = POR_DEFECTO;

export const partirRutaPorIdioma = (pathname) => {
  const partes = (pathname || '/').split('/');
  const posible = partes[1];
  if (posible && posible !== IDIOMA_RAIZ && IDIOMAS[posible]) {
    return { idioma: posible, ruta: '/' + partes.slice(2).join('/') };
  }
  return { idioma: null, ruta: pathname || '/' };
};

const leerDeLaUrl = () => {
  if (typeof window === 'undefined') return null;
  return partirRutaPorIdioma(window.location.pathname).idioma;
};

// 📍 [SEO IDIOMAS 2026-08-22, decision del usuario: opcion A] El idioma de la pagina sale de
// la URL y de NADA MAS. Antes caia al navegador, y eso hacia que "/marketplace" (la URL espanola)
// mostrara ingles a quien tuviera el navegador en ingles: medido en vivo, titulo en ingles en la
// URL espanola. Una URL que a veces responde en un idioma y a veces en otro no se puede indexar,
// y vuelve mentira al hreflang y al canonical.
//
// Al que llega con el navegador en otro idioma no se lo ignora: el selector de idioma (ver
// landing/SelectorIdiomaNav) esta en la barra de TODA pagina, con la etiqueta escrita en el
// idioma de quien mira. Pero elegir LLEVA a la otra URL en vez de mutar esta.
// "leerGuardado" y "detectarIdiomaNavegador" siguen existiendo, ahora para decidir ese aviso.
let idioma = leerDeLaUrl() || IDIOMA_RAIZ;
const escuchando = new Set();

export const idiomaActual = () => idioma;

// Que idioma preferiria esta persona, independiente de lo que diga la URL. Primero lo que eligio
// a mano alguna vez (una decision explicita no se pisa), y si nunca eligio, lo que dice su
// navegador. Con la opcion A esto ya NO decide que se ve: solo decide si vale la pena ofrecerle
// el cambio.
export const idiomaPreferido = () => leerGuardado() || detectarIdiomaNavegador();

// El nombre completo, para mandárselo a la IA o al backend.
export const nombreIdioma = (codigo = idioma) => NOMBRE_COMPLETO[codigo] || NOMBRE_COMPLETO[POR_DEFECTO];

// Los nombres PARA MOSTRAR son distintos de los que viajan a la IA: esos van en minúscula
// ('español') porque así los espera el prompt, y en un selector se verían mal. Y cada idioma se
// escribe en sí mismo — "English", no "Inglés" — porque lo lee justamente quien NO entiende el
// idioma actual de la página.
const NOMBRE_VISIBLE = {
  es: 'Español', en: 'English', pt: 'Português',
  fr: 'Français', de: 'Deutsch', it: 'Italiano'
};

export const idiomasDisponibles = () =>
  Object.keys(IDIOMAS).map(codigo => ({
    codigo,
    nombre: NOMBRE_VISIBLE[codigo] || NOMBRE_COMPLETO[codigo]
  }));

// 💾 [MULTILENGUAJE 2026-08-22] Dónde se guarda la elección, aparte del navegador.
//
// Este módulo NO sabe de sesiones ni de la API a propósito: vive en "comunes/" y auth vive en
// "landing/", así que importarlo sería al revés. La app le INYECTA cómo persistir (ver App.tsx).
// Sin inyectar nada sigue andando igual que antes, solo con localStorage.
let guardarEnCuenta = null;
export const configurarPersistenciaDeIdioma = (fn) => { guardarEnCuenta = fn; };

// ⚡ [2026-08-22] Cuándo la persona eligió el idioma a mano.
//
// Existe por una CARRERA real: al cargar la página arranca la consulta del idioma de la cuenta, que
// tarda. Si en ese rato la persona elige otro idioma en el selector, la respuesta vieja aterriza
// después y la devuelve al idioma anterior, en silencio. Se veía así: eliges inglés, la pantalla
// queda en inglés un instante y vuelve sola a español.
//
// Con esta marca, una elección a mano SIEMPRE le gana a una respuesta que ya venía en camino.
let elegidoAMano = 0;
export const huboEleccionManual = (desde) => elegidoAMano > desde;
export const marcaDeTiempo = () => Date.now();

export const cambiarIdioma = (codigo, { persistir = true } = {}) => {
  if (!NOMBRE_COMPLETO[codigo] || codigo === idioma) return;
  if (persistir) elegidoAMano = Date.now();
  idioma = codigo;
  try { localStorage.setItem(CLAVE_GUARDADA, codigo); } catch (error) { /* modo privado: se pierde al recargar, no rompe nada */ }
  if (typeof document !== 'undefined') document.documentElement.lang = codigo;
  escuchando.forEach(avisar => avisar(codigo));
  // "persistir: false" es para cuando el cambio VIENE de la cuenta: no tiene sentido devolverle
  // a la cuenta lo que la cuenta acaba de decir.
  if (persistir && guardarEnCuenta) { try { guardarEnCuenta(codigo); } catch (error) { /* la preferencia local ya quedó igual */ } }
};

// Guarda la preferencia SIN tocar lo que se ve: con la opcion A el idioma visible lo decide la
// URL, y esta funcion se llama justo antes de saltar a esa URL.
export const recordarIdioma = (codigo) => {
  if (!NOMBRE_COMPLETO[codigo]) return;
  elegidoAMano = Date.now();
  try { localStorage.setItem(CLAVE_GUARDADA, codigo); } catch (error) { /* modo privado */ }
  if (guardarEnCuenta) { try { guardarEnCuenta(codigo); } catch (error) { /* la local ya quedo */ } }
};

// 📖 t('clave') → el texto en el idioma activo.
//
// ⚠️ Una traducción que falta NUNCA queda en blanco: cae a inglés, y si tampoco está, a español.
// Un hueco en la pantalla es peor que una palabra en otro idioma — y la clave cruda ("hero_title")
// en medio de la página es lo peor de todo.
//
// Variables: t('greeting', { nombre: 'Rober' }) reemplaza {nombre} en el texto. Sin esto, cada
// pantalla arma sus frases pegando strings, que es justo lo que no se puede traducir.
export const t = (clave, variables = null) => tEnIdioma(clave, idioma, variables);

// 🗣️ [SEO IDIOMAS 2026-08-22] La misma busqueda, pero forzando el idioma.
//
// Hace falta para el aviso de idioma: a alguien con el navegador en ingles, parado en la pagina
// espanola, hay que ofrecerle el cambio EN INGLES. Un cartel en espanol ofreciendo ingles no lo
// lee justamente quien lo necesita.
export const tEnIdioma = (clave, codigo, variables = null) => {
  const texto =
    IDIOMAS[codigo]?.[clave] ??
    IDIOMAS.en?.[clave] ??
    IDIOMAS.es?.[clave];

  if (texto === undefined) {
    if (import.meta.env?.DEV) console.warn(`[textos] falta la clave "${clave}" en todos los idiomas`);
    return '';
  }
  if (!variables) return texto;
  return texto.replace(/\{(\w+)\}/g, (crudo, nombre) =>
    variables[nombre] !== undefined ? variables[nombre] : crudo
  );
};

// 🔁 Para que la pantalla se vuelva a dibujar cuando cambia el idioma. Devuelve el código actual,
// así el componente puede usarlo directo si lo necesita (ej. para mandarlo al backend).
export const useIdioma = () => {
  const [actual, setActual] = useState(idioma);
  useEffect(() => {
    escuchando.add(setActual);
    return () => escuchando.delete(setActual);
  }, []);
  return actual;
};

// 🔍 Qué falta traducir. Son diez líneas y es la diferencia entre enterarnos nosotros o que se
// entere un cliente. Se puede llamar desde la consola del navegador: faltantesDeTraduccion().
export const faltantesDeTraduccion = (codigo = 'en') => {
  const base = Object.keys(IDIOMAS.es || {});
  const otro = IDIOMAS[codigo] || {};
  return base.filter(clave => otro[clave] === undefined);
};

if (typeof window !== 'undefined') {
  document.documentElement.lang = idioma;
  if (import.meta.env?.DEV) window.faltantesDeTraduccion = faltantesDeTraduccion;
}
