// 🌐 EL IDIOMA DE UNA APP GENERADA.
//
// La interfaz de MEITI ya habla dos idiomas desde el 2026-08-21 (`src/comunes/textos/`). Las apps
// que MEITI genera, no: hasta hoy el texto quedaba escrito a mano en el idioma del pedido, para
// siempre. Verificado antes de escribir esto: el kit y el shim del sandbox tenían CERO de idiomas.
//
// **La razón fuerte es industrial, no de marketing.** Las plantas compran máquinas chinas, italianas
// y alemanas, y la mayoría no trae sistema multilenguaje: es un tablero lleno de etiquetas en un
// idioma que el operador no lee. Ese es el gatillo de compra de la mayoría de las apps industriales.
//
// ── POR QUÉ NO UNA LIBRERÍA DE i18n ────────────────────────────────────────────────────────────
// Las apps exportadas se llevan el kit adentro y corren SIN INTERNET en una Raspberry Pi. Una
// librería sería peso permanente en todas, para siempre. Este módulo pesa lo que pesan los textos.
//
// ── LA MISMA FORMA QUE EL TRADUCTOR DEL CORE ───────────────────────────────────────────────────
// Cadena de respaldo (idioma → en → es) e interpolación de `{variable}`: copiadas a propósito de
// `src/comunes/textos/index.js`, para que quien lea uno entienda el otro. Lo que se agrega acá es
// el TERCER escalón, y es lo que hace que esto se pueda encender sin romper nada:
//
// ── EL RESPALDO, QUE ES LO QUE LO VUELVE SEGURO ────────────────────────────────────────────────
//     MEITI.t('config_titulo', null, 'Configuración')
//
// El molde lleva su propio texto en español como último recurso. Así:
//   · una app VIEJA, sin diccionario ninguno, sigue mostrando exactamente lo que mostraba;
//   · una clave que falta nunca deja un hueco en la pantalla NI muestra "config_titulo" crudo,
//     que es lo peor de todo;
//   · y la migración se puede hacer molde por molde, sin un día de corte.
//
// ⚠️ Ojo con la trampa que esto NO contradice: la clave NO es el texto en español. Con
// `t("Configuración")` como clave, el día que se le corrige una tilde a esa frase todos los demás
// idiomas se caen en silencio. Acá el español es el RESPALDO, no la llave.

export const IDIOMA_NATURAL = 'es';   // la voz de la plataforma
export const IDIOMA_PUENTE = 'en';    // desde el que se traduce a los demás

// El orden en que se busca un texto. El idioma pedido primero, después el puente, después el
// natural. Nunca al revés: a alguien que pidió inglés, un texto en español le sirve más que nada,
// pero el inglés le sirve más que el español.
const cadenaDe = (idioma) => [idioma, IDIOMA_PUENTE, IDIOMA_NATURAL].filter((c, i, a) => c && a.indexOf(c) === i);

const interpolar = (texto, variables) => {
  if (!variables) return texto;
  return String(texto).replace(/\{(\w+)\}/g, (crudo, nombre) => (
    variables[nombre] !== undefined && variables[nombre] !== null ? String(variables[nombre]) : crudo
  ));
};

// 🔀 [2026-10-06, Tap Io: 24 claves con dos textos] Dos moldes pueden usar la misma clave para cosas
// distintas: "btn_save" es "Guardar" en el menú y "Guardar Servicio" en servicios de entrega. Con
// una sola fila por clave, uno de los dos botones mostraba el texto del otro, en TODOS los idiomas
// (también en español). La IA elige las claves y no se puede garantizar que no choquen, pero el
// respaldo que el molde lleva adentro sí distingue: cada variante extra se guarda con la clave más
// una huella de su texto original, y el traductor la busca primero. Lo usan el extractor (al armar
// el pack) y el traductor (al mostrar), así que la huella sale siempre de esta misma función.
const huellaDeTexto = (texto) => {
  let h = 5381;
  for (const ch of String(texto)) h = ((h << 5) + h + ch.codePointAt(0)) >>> 0;
  return h.toString(36);
};
export const claveDeVariante = (clave, textoOriginal) => `${clave}~${huellaDeTexto(textoOriginal)}`;

// 📄 [2026-10-06, Tap Io en inglés con el menú en español] Los títulos y descripciones de las
// páginas no viven en ningún molde: están en el esquema de la app y los dibuja el marco. El pack de
// idioma solo barría moldes, así que la pantalla salía en inglés con su encabezado y todo el menú en
// español. Entran al pack con esta clave (el extractor y el marco la arman con la misma función).
export const claveDePagina = (idPagina, campo) => `__pagina.${idPagina}.${campo}`;

// 🧭 Lo poco que escribe el marco por su cuenta ("Más", "Cerrar menú"...). No pasa por el pack:
// es igual en todas las apps, así que va escrito acá una vez. Un idioma que no está cae al puente.
const TEXTOS_DEL_MARCO = {
  es: {
    mas: 'Más', idioma: 'Idioma', no_disponible: 'Todavía no disponible',
    modo_claro: 'Cambiar a modo claro', modo_oscuro: 'Cambiar a modo oscuro',
    expandir_menu: 'Expandir menú', colapsar_menu: 'Colapsar menú', cerrar_menu: 'Cerrar menú',
    confirmar_accion: 'Confirmar acción', cancelar: 'Cancelar', confirmar: 'Confirmar'
  },
  en: {
    mas: 'More', idioma: 'Language', no_disponible: 'Not available yet',
    modo_claro: 'Switch to light mode', modo_oscuro: 'Switch to dark mode',
    expandir_menu: 'Expand menu', colapsar_menu: 'Collapse menu', cerrar_menu: 'Close menu',
    confirmar_accion: 'Confirm action', cancelar: 'Cancel', confirmar: 'Confirm'
  }
};
export const textoDelMarco = (idioma, clave) => {
  const codigo = String(idioma || IDIOMA_NATURAL).toLowerCase().split('-')[0];
  return (TEXTOS_DEL_MARCO[codigo] || TEXTOS_DEL_MARCO[IDIOMA_PUENTE])[clave] || TEXTOS_DEL_MARCO[IDIOMA_NATURAL][clave] || clave;
};

/**
 * Arma el traductor de una app.
 *
 * @param {Object} diccionarios  { es: {clave: texto}, en: {...} } — tal como viene de la bóveda.
 * @param {string} idioma        el idioma de quien está mirando.
 * @returns {(clave: string, variables?: Object, respaldo?: string) => string}
 */
export const construirTraductor = (diccionarios, idioma) => {
  const dicc = diccionarios && typeof diccionarios === 'object' ? diccionarios : {};
  const cadena = cadenaDe(String(idioma || IDIOMA_NATURAL).toLowerCase().slice(0, 5));

  return (clave, variables = null, respaldo = undefined) => {
    if (typeof clave !== 'string' || !clave) return respaldo !== undefined ? interpolar(respaldo, variables) : '';
    // Primero la variante de ESTE texto (si la clave choca con otro molde), después la clave sola.
    const claves = typeof respaldo === 'string' ? [claveDeVariante(clave, respaldo), clave] : [clave];
    for (const codigo of cadena) {
      for (const k of claves) {
        const texto = dicc[codigo] && dicc[codigo][k];
        if (texto !== undefined && texto !== null && texto !== '') return interpolar(texto, variables);
      }
    }
    // El tercer escalón: el texto que el molde lleva adentro. Sin esto, una app sin diccionario
    // mostraría claves crudas en la cara del usuario.
    if (respaldo !== undefined) return interpolar(respaldo, variables);
    // Y si tampoco hay respaldo, la clave es el último recurso: fea, pero nunca un hueco mudo, y
    // dice exactamente qué falta traducir.
    return clave;
  };
};

/**
 * Qué idioma mostrarle a quien está mirando.
 *
 * Orden: lo que eligió a mano para ESTA app > el idioma de la interfaz de MEITI (si la app lo
 * habla) > el del navegador > el natural. Nunca se le pregunta nada a nadie: el navegador ya sabe
 * qué idioma habla la persona.
 */
export const resolverIdiomaDeApp = ({ elegido, idiomaInterfaz, disponibles, navegador } = {}) => {
  const hablados = Array.isArray(disponibles) && disponibles.length ? disponibles : [IDIOMA_NATURAL];
  const normal = (c) => String(c || '').toLowerCase().split('-')[0];
  const habla = (c) => hablados.includes(normal(c));

  if (elegido && habla(elegido)) return normal(elegido);
  if (idiomaInterfaz && habla(idiomaInterfaz)) return normal(idiomaInterfaz);
  const delNavegador = navegador || (typeof navigator !== 'undefined' ? (navigator.languages || [navigator.language]) : []);
  for (const c of (Array.isArray(delNavegador) ? delNavegador : [delNavegador])) if (habla(c)) return normal(c);
  return hablados.includes(IDIOMA_NATURAL) ? IDIOMA_NATURAL : hablados[0];
};

/**
 * Qué falta traducir. Son pocas líneas y es la diferencia entre enterarnos nosotros o que se entere
 * el operador de una planta parado frente al tablero.
 */
export const faltantesDeApp = (diccionarios, codigo) => {
  const base = Object.keys((diccionarios && diccionarios[IDIOMA_NATURAL]) || {});
  const otro = (diccionarios && diccionarios[codigo]) || {};
  return base.filter((clave) => otro[clave] === undefined || otro[clave] === '');
};

/**
 * Convierte las filas de la bóveda (una por clave y por idioma) al objeto que usa el traductor.
 * Vive acá, y no en quien consulta, porque lo necesitan los TRES motores de render.
 */
export const diccionariosDesdeFilas = (filas) => {
  const salida = {};
  for (const f of Array.isArray(filas) ? filas : []) {
    const idioma = String(f?.idioma || '').toLowerCase().trim();
    const clave = String(f?.clave || '').trim();
    if (!idioma || !clave) continue;
    if (!salida[idioma]) salida[idioma] = {};
    salida[idioma][clave] = f.texto == null ? '' : String(f.texto);
  }
  return salida;
};
