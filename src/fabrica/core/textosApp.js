// 🌐 De dónde saca sus textos una app generada.
//
// Los diccionarios viven en la BÓVEDA DE LA APP, en la tabla `textos_app` (una fila por clave y por
// idioma). Tres motivos, y los tres pesan:
//
//   · **Viajan con el export.** El zip se lleva la bóveda, así que una app exportada arranca con sus
//     idiomas adentro y funciona SIN INTERNET en una Raspberry Pi — que es el caso industrial que
//     motivó todo esto.
//   · **El dueño los puede editar** con las herramientas que ya existen, sin que nadie toque código:
//     es una tabla más de su bóveda.
//   · **Se traducen solos.** Un idioma nuevo es un INSERT, no un deploy. La IA se usa como fábrica
//     una vez por idioma, no en cada visita (ver `feedback_ia_como_fabrica_no_motor`).
//
// El caché es por app y por carga de página, igual que `cargarRecetasDelKit` y por el mismo motivo:
// una app grande monta muchos moldes a la vez y todos piden lo mismo.
import { API_BASE_URL } from '../../config/apiConfig';
import { diccionariosDesdeFilas, IDIOMA_NATURAL } from '../../comunes/idiomaApp.js';

const cache = new Map();   // appId -> Promise<{diccionarios, idiomas}>

const VACIO = { diccionarios: {}, idiomas: [IDIOMA_NATURAL] };

export const cargarTextosDeApp = (appId) => {
  if (!appId) return Promise.resolve(VACIO);
  if (cache.has(appId)) return cache.get(appId);

  const promesa = fetch(`${API_BASE_URL}/api/boveda/textos_app?ecosistema=${encodeURIComponent(appId)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const filas = (d && (d.registros || d.nodos)) || [];
      const diccionarios = diccionariosDesdeFilas(filas);
      const idiomas = Object.keys(diccionarios);
      return { diccionarios, idiomas: idiomas.length ? idiomas : [IDIOMA_NATURAL] };
    })
    // 🩹 Una app SIN la tabla (o sea, todas las de antes de hoy) no es un error: es una app que
    // todavía no tiene idiomas, y cada molde cae al respaldo que lleva adentro. Encender esto no
    // puede romper una sola app existente, y ese fue el requisito del diseño.
    .catch(() => VACIO);

  cache.set(appId, promesa);
  return promesa;
};

// Para cuando el dueño edita sus textos y hay que releerlos sin recargar la página.
export const olvidarTextosDeApp = (appId) => { cache.delete(appId); };

export const CLAVE_IDIOMA_ELEGIDO = (appId) => `meiti_idioma_app_${appId}`;

export const leerIdiomaElegido = (appId) => {
  try { return window.localStorage.getItem(CLAVE_IDIOMA_ELEGIDO(appId)) || null; }
  catch (e) { return null; }
};

export const recordarIdiomaElegido = (appId, codigo) => {
  try { window.localStorage.setItem(CLAVE_IDIOMA_ELEGIDO(appId), codigo); }
  catch (e) { /* modo privado: la elección vale para esta visita y ya */ }
};
