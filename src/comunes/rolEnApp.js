// 🎭 [MENÚ POR ROL 2026-08-28] Quién es y qué puede hacer, en UNA sola pregunta por app.
//
// Antes esto vivía repartido: `resolverDuenoDeLaApp` estaba suelto adentro de MoldeSandboxeado.jsx,
// y el ROL no lo resolvía nadie del lado del padre — cada molde de administración hacía su propio
// fetch a roles_usuarios_app. Medido en AcademiaMind: 14 moldes preguntando 14 veces lo mismo,
// escrito de cinco formas distintas. Y el menú lateral no podía reusar ninguna de esas respuestas,
// porque la decisión vivía adentro del código de cada molde.
//
// Dos consecuencias que se arreglan acá:
//   1. El molde recibe el rol YA RESUELTO en el MEITI_INIT, así que lo lee en su PRIMER render.
//      Deja de necesitar un estado de carga — y ese estado fue exactamente el bug del 2026-08-27
//      en AM_PerfilUsuario, donde `null` significaba "no cargué" y "no hay" a la vez.
//   2. El menú y el molde leen EL MISMO valor, así que no pueden contradecirse. Un menú que
//      escondiera una página que el molde sí deja abrir sería el peor error posible: una función
//      escondida no se reclama, se pierde.
//
// ⚠️ Esto NO es un control de acceso. El menú es cosmética: la puerta real sigue siendo la del
// molde, que corre igual si alguien navega directo a la página. Ver el comentario del endpoint
// /api/apps/:ecosistema/soy-dueno en server.js.
import { API_BASE_URL } from '../config/apiConfig';

// 🆔 [2026-08-28] Vivía suelto adentro de MoldeSandboxeado.jsx. Se movió acá porque ahora lo
// necesitan dos: el sandbox (para mandar la identidad al iframe) y el menú de MotorUI (para
// saber de quién resolver el rol). Sigue existiendo una copia en ReactorRender.jsx, que es el
// motor del export standalone y no puede depender del Core — anotado, no arreglado hoy.
// 🎓 Reubicado desde ReactorRender.jsx (antes "construirMeitiHelpers().obtenerUsuarioActual")
// — sigue leyendo localStorage acá porque este código corre del lado PADRE, con acceso real.
// El iframe nunca ejecuta esto: recibe el resultado ya calculado por postMessage
// (MEITI_INIT/MEITI_DATOS_UPDATE, ver meitiIframeShim.js del lado iframe).
export const resolverUsuarioActual = (appId) => {
  if (typeof window === 'undefined' || !window.localStorage) return 'usuario_anonimo';

  // 🔐 Login PROPIO de esta app tiene prioridad sobre la sesión de Mis Apps/Core — si esta app
  // tiene sus propios usuarios, esa es la identidad real que importa para dueño de registros.
  const emailSesionApp = window.localStorage.getItem(`meiti_sesion_app_email_${appId}`);
  if (emailSesionApp && emailSesionApp.trim()) return `email_${emailSesionApp.trim().toLowerCase()}`;

  const emailSesion = window.localStorage.getItem('meiti_sesion_email');
  if (emailSesion && emailSesion.trim()) return `email_${emailSesion.trim().toLowerCase()}`;

  const clave = `meiti_usuario_${appId || 'core_meiti'}`;
  let id = window.localStorage.getItem(clave);
  if (!id) {
    id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(clave, id);
  }
  return id;
};

// Caché por app + usuario, y por carga de página: la respuesta no cambia mientras dure la sesión, y
// una app grande monta muchos moldes a la vez — sin esto sería una llamada por cada uno.
const cache = new Map();

const VACIO = { dueno: false, rol: null, gateDiferido: false };

/**
 * @param {string} appId       plantilla_id de la app
 * @param {string} usuarioId   lo que devuelve MEITI.obtenerUsuarioActual() — el MISMO que usa el
 *                             molde, a propósito: si acá se resolviera otra identidad, el menú
 *                             escondería páginas que el molde sí deja entrar.
 * @returns {Promise<{dueno:boolean, rol:string|null, gateDiferido:boolean}>}
 */
export const resolverRolEnApp = async (appId, usuarioId) => {
  if (!appId || appId === 'core_meiti') return VACIO;
  const clave = `${appId}::${usuarioId || ''}`;
  if (cache.has(clave)) return cache.get(clave);

  const pedido = (async () => {
    try {
      const token = typeof window !== 'undefined' ? window.localStorage?.getItem('meiti_sesion_token') : null;
      const cabeceras = token ? { 'x-session-token': token } : {};
      // 🛡️ [2026-10-06] El servidor ya no acepta un email de palabra: el rol de un empleado se
      // reconoce solo si viene con su sesión de la app (la que abre el botón de sesión de MotorUI).
      const tokenApp = typeof window !== 'undefined' ? window.localStorage?.getItem(`meiti_sesion_app_token_${appId}`) : null;
      if (tokenApp) cabeceras['x-sesion-app-token'] = tokenApp;
      // ⏱️ Techo de tiempo: esto corre ANTES del primer render del molde. Si el servidor tarda, vale
      // mucho más mostrar la app con el rol en null (que muestra TODO) que dejarla en blanco.
      const corte = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined;
      const url = `${API_BASE_URL}/api/apps/${encodeURIComponent(appId)}/soy-dueno`
        + (usuarioId ? `?usuario_id=${encodeURIComponent(usuarioId)}` : '');
      const res = await fetch(url, { headers: cabeceras, credentials: 'include', signal: corte });
      if (!res.ok) return VACIO;
      const data = await res.json();
      return { dueno: !!data?.dueno, rol: data?.rol || null, gateDiferido: !!data?.gate_diferido };
    } catch (e) {
      return VACIO;
    }
  })();

  cache.set(clave, pedido);
  const resultado = await pedido;
  cache.set(clave, resultado);
  return resultado;
};

/** Compatibilidad con el único uso que había antes: solo el booleano de dueño. */
export const resolverDuenoDeLaApp = async (appId, usuarioId) => (await resolverRolEnApp(appId, usuarioId)).dueno;

/**
 * ¿Esta página se le muestra a quien está mirando?
 *
 * FALLA ABIERTO a propósito, y no es pereza: mientras el rol no se sepa (todavía cargando, servidor
 * caído, app sin tabla de roles, o las 21 apps que ya existen y no declaran `rol` en ninguna
 * página), se muestra TODO — que es exactamente el comportamiento de hoy. Esconder de más rompe
 * algo que nadie va a reportar, porque no se puede extrañar lo que no se ve.
 */
// 🎭 [2026-10-06, Tap Io: la cocina es del personal, no solo del admin] "rol" de una página puede
// ser uno ("admin") o varios ("admin,editor" o ["admin","editor"]). Antes era uno solo, así que una
// página para el empleado Y el admin no se podía declarar: o la veía solo el admin, o todos.
export const rolesDePagina = (pagina) => (Array.isArray(pagina?.rol) ? pagina.rol : String(pagina?.rol || '').split(','))
  .map(r => String(r).trim().toLowerCase())
  .filter(r => r && r !== 'todos');

export const puedeVerPagina = (pagina, { dueno, rol } = VACIO) => {
  const requeridos = rolesDePagina(pagina);
  if (!requeridos.length) return true;                     // sin declarar: la ve cualquiera
  if (dueno) return true;                                  // 👑 el dueño entra siempre
  if (!rol) return true;                                   // no sabemos: se muestra (falla abierto)
  return requeridos.includes(String(rol).trim().toLowerCase());
};
