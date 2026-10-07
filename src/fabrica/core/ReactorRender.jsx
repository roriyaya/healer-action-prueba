import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { explicarError } from './errorLegible.js';
import { LiveProvider, LiveError, LivePreview } from 'react-live';
import { envolverComoElMotor } from '../../comunes/envolverMolde.js';
import { TEMA_DEFAULT, construirKitUI, cargarRecetasDelKit } from './kitUI.jsx';
import { construirTraductor, IDIOMA_NATURAL } from '../../comunes/idiomaApp.js';
import { construirMutacionesSeguras } from './mutacionesSeguras.js';
import { LIBRERIAS_PREMIUM } from './libreriasPremium.js';
import { ContextoNavegacionApp } from './contextoNavegacionApp.js';
import { API_BASE_URL } from '../../config/apiConfig';
import { descargarEnNavegador, construirCSV } from './descargas.js';
import { resolverRolEnApp } from '../../comunes/rolEnApp.js';

// 🛡️ [SANDBOX 2026-07-31] NO USADO por MotorUI.jsx en vivo desde la Fase 4 del rollout de
// sandbox — ese camino ahora renderiza SIEMPRE vía MoldeSandboxeado (iframe con origen opaco
// real, ver src/fabrica/sandbox/ y src/fabrica/core/MoldeSandboxeado.jsx). Este archivo sigue
// vivo a propósito porque server.js (generarArchivosProyectoExportado, la función que arma el
// export standalone/#12) lo lee del disco y lo embebe tal cual en cada proyecto exportado — un
// proyecto standalone corre en la máquina/backend del propio dueño de la app, no en la
// infraestructura de MEITI, así que portar el sandbox ahí quedó explícitamente diferido (ver el
// plan de sandbox). Si algún día se hace ese port, recién ahí este archivo se puede borrar —
// hasta entonces, BORRARLO ROMPE EL EXPORT (ver el replace de MoldeSandboxeado→ReactorRender en
// generarArchivosProyectoExportado, server.js).

// 🩹 [SEGURIDAD/ESTABILIDAD 2026-07-31] Sin esto, un error en tiempo de ejecución del código
// que genera la IA (no hace falta que sea malicioso, un bug cualquiera alcanza) no rompía solo
// esta cajita — React desmonta el árbol ENTERO de vuelta a la raíz si nadie lo atrapa antes,
// así que se llevaba puesta TODA la página (el panel admin completo, o la app pública entera),
// pantalla en blanco total. Los Error Boundary tienen que ser clase (React todavía no tiene el
// equivalente en hooks). Esto NO resuelve el aislamiento de seguridad (el código sigue
// corriendo con acceso a window/localStorage/fetch mientras no tire una excepción) — solo
// contiene el CRASH para que no tumbe páginas ajenas al molde que falló.
class ErrorBoundaryReactorRender extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[ReactorRender] Error en tiempo de ejecución del código generado por IA:', error, info);
  }
  render() {
    if (this.state.error) {
      const { causa, pista, original } = explicarError(this.state.error);
      return (
        <div className="text-xs p-3 rounded-lg break-words" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
          <div className="font-semibold mb-1">
            <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
            {this.props.nombreMolde ? `No se pudo mostrar "${this.props.nombreMolde}"` : 'No se pudo mostrar esta sección'}
          </div>
          <div className="mb-1">{causa}</div>
          {pista && <div className="opacity-80">{pista}</div>}
          {original && <div className="mt-1.5 font-mono opacity-60">{original}</div>}
        </div>
      );
    }
    return this.props.children;
  }
}

// 🩹 [2026-08-01, bug real reportado por el usuario en un APK Android instalado: "todo pegado",
// mismo bug de tarjetas colapsadas que ya se había arreglado antes] TEMA_DEFAULT/construirKitUI
// vivían ACÁ mismo como copia propia hasta que se extrajeron a kitUI.jsx para el sandbox — pero
// esta copia nunca se borró, solo quedó huérfana (el header de este archivo ya avisa que sigue
// vivo únicamente para el export standalone). Cuando el bug real de Tarjeta con "h-full" (recorta
// en vez de crecer) se corrigió a "min-h-full" en kitUI.jsx, esta copia paralela se quedó con la
// versión vieja y rota — invisible en el wizard/preview (usa el sandbox, que importa de kitUI.jsx)
// pero presente en TODO export nativo (Android/iOS/Electron), que renderiza vía este archivo.
// Fix real: importar de kitUI.jsx en vez de mantener una copia — mismo error no puede repetirse.

// =========================================================================
// 👤 IDENTIDAD DENTRO DE LA APP: si hay una sesión de email activa (login real
// de "Mis apps", ver src/landing/auth.js), la identidad se ata a esa sesión —
// así los datos del usuario lo siguen entre dispositivos (antes era un id
// aleatorio por dispositivo en localStorage, sin ninguna relación con el
// login: el mismo usuario logueado en el celular y en la compu veía datos
// DISTINTOS dentro de la misma app). Sin sesión (uso anónimo, vista previa
// en el panel admin), cae al id aleatorio por dispositivo de siempre.
// =========================================================================
// 🔐 Extraída como función local (no arrow property del objeto de abajo) para que
// "fetchDatosPropios" pueda llamarla directo sin depender de "this" — las funciones del objeto
// que devuelve "construirMeitiHelpers" son arrow functions, que NO bindean el objeto como "this".
const resolverUsuarioActual = (appId) => {
  if (typeof window === 'undefined' || !window.localStorage) return 'usuario_anonimo';

  // 🔐 Login PROPIO de esta app (molde base "Login seguro", ver /api/auth-app/*) tiene
  // prioridad sobre la sesión de Mis Apps/Core — si esta app tiene sus propios usuarios,
  // esa es la identidad real que importa para dueño de registros, no quién la creó.
  const emailSesionApp = window.localStorage.getItem(`meiti_sesion_app_email_${appId}`);
  if (emailSesionApp && emailSesionApp.trim()) {
    return `email_${emailSesionApp.trim().toLowerCase()}`;
  }

  const emailSesion = window.localStorage.getItem('meiti_sesion_email');
  if (emailSesion && emailSesion.trim()) {
    return `email_${emailSesion.trim().toLowerCase()}`;
  }

  const clave = `meiti_usuario_${appId || 'core_meiti'}`;
  let id = window.localStorage.getItem(clave);
  if (!id) {
    id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(clave, id);
  }
  return id;
};

// 🩹 [LIBRERÍA OBLIGATORIA 2026-08-06] Categoría "reload_dentro_molde" (window.location.reload()
// dentro de un molde, ya prohibido por regla de texto — ver "🚫 PROHIBIDO" en oraculo.js) — en
// vez de confiar en que Gemini nunca lo escriba, se convierte en un no-op inofensivo con aviso en
// consola: si igual aparece en código generado, no saca al usuario de donde estaba (ni de la
// Cámara de Cuarentena durante una revisión), solo avisa. Este archivo corre SOLO en exports
// standalone (ver comentario de arriba del todo) — la página ENTERA es la app generada, nada más
// comparte este "window", así que pisar "reload" acá no puede romper ninguna otra funcionalidad.
// Efecto de módulo, se instala una sola vez (el import solo corre una vez por carga de página).
if (typeof window !== 'undefined' && window.location && !window.__meitiReloadBloqueado) {
  // 🩹 [BUG REAL 2026-08-06] try/catch defensivo — ver el mismo fix en meitiIframeShim.js
  // (instalarBloqueoReload) para el caso confirmado real: en un origen opaco (sandbox iframe sin
  // allow-same-origin), esta asignación tira TypeError síncrono en modo estricto y mata el
  // módulo entero antes de que nada más pueda correr. Este archivo corre en la página top-level
  // de un export standalone (nunca opaco), así que en la práctica no debería tirar acá — pero
  // nunca vale la pena arriesgar que ESTA línea, específicamente, pueda dejar una app entera en
  // blanco por una asignación que no es crítica si falla.
  try {
    window.location.reload = () => {
      console.error('[MEITI] window.location.reload() bloqueado dentro de un molde — usa tu propia función de carga (ej. "cargarDatos()") para refrescar el estado, nunca recargues la página entera. Ver categoría "reload_dentro_molde".');
    };
  } catch (e) {
    console.warn('[MEITI] No se pudo instalar el bloqueo de reload — no es crítico.', e);
  }
  window.__meitiReloadBloqueado = true;
}

// 🩹 [BUG REAL 2026-08-10, reportado por el usuario: instaló un APK Android de una app con
// login propio, el login "parecía" funcionar pero cualquier guardado en /api/boveda fallaba en
// silencio (401)] La única prueba de sesión que /api/boveda acepta hasta ahora es la cookie
// HttpOnly "meiti_sesion_app_<eco>" (ver resolverSesionAppReal, server.js) — SameSite=None cross-
// origin, necesaria porque el WebView de Capacitor sirve el bundle bajo "https://localhost" pero
// pega contra el backend real en otro dominio. El token YA se guarda en localStorage al loguearse
// (ver GateAppPropia, MotorUI.jsx) y ya viaja como header "x-session-token" para /api/auth-app/
// sesion — pero nunca se mandaba también en las llamadas de datos, así que quedaban 100% a
// merced de que esa cookie cross-site sobreviviera el WebView del dispositivo (no siempre lo
// hace). Mandar el mismo token como header en cada llamada (server.js lo acepta como fallback si
// no hay cookie) cierra el hueco sin tocar el mecanismo de cookie existente para nadie a quien ya
// le funcionaba.
const obtenerHeaderSesionApp = (appId) => {
  if (typeof window === 'undefined' || !window.localStorage || !appId) return {};
  const token = window.localStorage.getItem(`meiti_sesion_app_token_${appId}`);
  // 🛡️ [PERMISOS POR TABLA 2026-10-06] El servidor exportado decide quién escribe cada tabla: un
  // cliente sin sesión solo puede tocar sus propias filas, y para saber cuáles son necesita el id
  // anónimo de este navegador. Mismo dato que manda el relay del sandbox en MEITI.
  const cabeceras = { 'x-meiti-usuario': resolverUsuarioActual(appId) };
  if (token) cabeceras['x-sesion-app-token'] = token;
  return cabeceras;
};

// 🩹 [BUG REAL 2026-08-10, FacturacionCRM: "las apps no guardan nada" en APK Android] Todo
// molde (BASE y generado por Gemini) escribe sus fetch con ruta RELATIVA ('/api/boveda/...') —
// funciona en preview (el origen de la página ya es meiti.dev) y en export a Raspberry Pi
// (frontend y backend comparten host), pero en un export Android/iOS/Electron el WebView sirve
// el bundle bajo "https://localhost"/"file://", un origen totalmente distinto al backend real.
// Confirmado con evidencia real (DevTools de un APK instalado): la Request URL terminaba siendo
// "https://localhost/api/boveda/..." interceptada localmente por Capacitor
// (client-via: shouldInterceptRequest), devolviendo un 200 con HTML vacío en vez de JSON real —
// nunca salía del dispositivo, nunca llegaba a nginx. apiConfig.js YA se reescribe con la URL
// real del backend al exportar (ver apiBaseUrlExport, generarArchivosProyectoExportado en
// server.js) pero este archivo nunca lo importaba ni lo usaba. Fix: anteponer API_BASE_URL a
// toda URL relativa antes de hacer fetch.
const resolverUrlAbsoluta = (url) => (/^https?:\/\//.test(url) ? url : `${API_BASE_URL}${url}`);

// 🔒 [SEC-21 2026-08-15] resolverUrlAbsoluta solo reescribe URLs relativas — una URL absoluta
// pasa sin tocar. Sin este chequeo, obtenerHeaderSesionApp (el token real de sesión del usuario
// final de esta app) viajaba a CUALQUIER destino que el código generado por IA eligiera llamar
// vía fetchDatos/fetchMutante (las únicas funciones que oraculo.js exige usar para toda llamada
// de red, nunca "fetch" crudo) — un molde que integrara un webhook externo, o un prompt-injection
// deliberado, podía filtrar ese token a un servidor de terceros. Corre en TODO export standalone
// (Android/iOS/Electron/Pi) y en la vista previa sin sandbox de Cuarentena, no solo en el iframe
// sandboxeado (que sí valida destino aparte, ver meitiIframeShim.js/sandboxRelay.js).
const esDestinoPropio = (urlAbsoluta) => {
  try { return new URL(urlAbsoluta, API_BASE_URL).origin === new URL(API_BASE_URL).origin; } catch (e) { return false; }
};

// 🧰 [LIBRERÍA OBLIGATORIA 2026-08-06] Ver comentario de "fetchDatos"/"fetchMutante" más abajo.
const ejecutarFetchDatos = async (url, appId) => {
  try {
    const urlFinal = resolverUrlAbsoluta(url);
    const res = await fetch(urlFinal, { credentials: 'include', headers: esDestinoPropio(urlFinal) ? obtenerHeaderSesionApp(appId) : {} });
    if (!res.ok) return { ok: false, error: `Error ${res.status}`, registros: [] };
    const data = await res.json().catch(() => ({}));
    const registros = Array.isArray(data) ? data : (data.registros || data.nodos || []);
    return { ok: true, registros };
  } catch (e) {
    return { ok: false, error: e.message || 'Error de red', registros: [] };
  }
};

// 💾 La escritura real. Extraída del objeto para que "construirMutacionesSeguras" pueda envolverla
// (ver mutacionesSeguras.js) sin depender de "this".
const ejecutarFetchMutante = async (url, opciones = {}, appId) => {
  try {
    const urlFinal = resolverUrlAbsoluta(url);
    const res = await fetch(urlFinal, {
      credentials: 'include',
      ...opciones,
      headers: { ...(esDestinoPropio(urlFinal) ? obtenerHeaderSesionApp(appId) : {}), ...(opciones.headers || {}) }
    });
    const cuerpo = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: cuerpo.error || `Error ${res.status}`, data: cuerpo };
    return { ok: true, data: cuerpo };
  } catch (e) {
    return { ok: false, error: e.message || 'Error de red', data: null };
  }
};

// 📦 [SUBIR ARCHIVOS 2026-08-26] Misma idea que en el sandbox, sin puente: el export standalone no
// vive en un iframe, así que habla directo con la API. El molde no se entera de la diferencia.
const pedirFirmaDeSubida = async (appId) => {
  try {
    const res = await fetch(resolverUrlAbsoluta('/api/subidas/firma'), {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...obtenerHeaderSesionApp(appId) },
      body: JSON.stringify({ ecosistema: appId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { detalle: data?.detalle || 'No se pudo preparar la subida.' };
    return data;
  } catch (e) {
    return { detalle: 'No se pudo preparar la subida.' };
  }
};

export const construirMeitiHelpers = (appId, manifestTablas, navegarAPagina, pedirConfirmacion, pedirReproducir, identidad = null) => ({
  // 🏛️ MOLDES BASE DEL SISTEMA (reusados por MUCHAS apps distintas, ver origen='BASE' en
  // catalogo_componentes): su codigo_crudo no se regenera por app, así que no puede tener
  // el "?ecosistema=" pegado a mano en el código — necesita resolverlo en tiempo real contra
  // la app donde efectivamente se está renderizando ahora.
  obtenerEcosistemaActual: () => appId || 'core_meiti',
  obtenerUsuarioActual: () => resolverUsuarioActual(appId),
  // 👑 [2026-08-27] En un export standalone la app corre en la maquina del propio dueno, sin
  // sesion de plataforma ni nodo de MEITI detras: no hay a quien preguntarle. Devuelve true a
  // proposito — quien corre su propio export ES el dueno. El verbo existe acá para que un molde
  // que lo use no explote al exportarse (los dos motores tienen que ofrecer lo mismo).
  // 🔐 [2026-10-06, Tap Io exportado] Ese supuesto vale para una app de escritorio de una persona,
  // NO para un kiosco que usan los clientes: con "true" fijo, cualquier cliente pasaba todos los
  // candados de administración. Ahora lo decide el servidor exportado (/soy-dueno): una app SIN
  // personal sigue respondiendo "dueño" (comportamiento de siempre); una CON personal responde el
  // rol de la sesión verificada. Sin identidad pasada, el comportamiento de antes.
  soyDuenoDeLaApp: () => (identidad ? !!identidad.dueno : true),
  // 🎭 [MENU POR ROL 2026-08-28] Mismo criterio que soyDuenoDeLaApp de arriba: en un export
  // standalone la app corre en la maquina de su propio dueno, sin nodo de MEITI ni tabla de roles
  // detras a quien preguntarle. Devuelve 'admin' a proposito — quien corre su propio export es el
  // dueno. Y existe acá porque los dos motores tienen que ofrecer los MISMOS verbos: si un molde
  // usa este y el export no lo tiene, anda en el Core y explota al exportarse.
  miRolEnLaApp: () => (identidad ? (identidad.dueno ? 'admin' : identidad.rol) : 'admin'),
  // 🌐 [IDIOMA DE LA APP 2026-08-29] Mismo verbo que en el sandbox. Acá el diccionario todavía no
  // se carga (este motor es el del export standalone y no puede depender del Core), así que cada
  // texto cae a su respaldo — que es exactamente lo que la app mostraba antes de existir el idioma,
  // o sea: encender esto no cambia nada hasta que el export traiga sus diccionarios.
  t: (clave, variables, respaldo) => construirTraductor(null, IDIOMA_NATURAL)(clave, variables, respaldo),
  idiomaActual: () => IDIOMA_NATURAL,
  // 🌐 [2026-10-05] Mismos verbos que en el sandbox, para que el MISMO molde no explote al
  // exportarse. Este motor todavía no carga diccionarios: hay un solo idioma, y cambiarlo no hace
  // nada (avisa y devuelve false, igual que irAPagina fuera de una app).
  cambiarIdioma: () => {
    console.warn('[ MEITI ] cambiarIdioma(): la app exportada todavía no trae sus diccionarios — sigue en el idioma natural.');
    return false;
  },
  idiomasDisponibles: () => [IDIOMA_NATURAL],
  // 🔑 [CONCEPTO DINÁMICO 2026-08-14, pedido explícito del usuario: "un zapato no se fabrica
  // solo"] Mismo criterio que obtenerEcosistemaActual — nunca un nombre de tabla hardcodeado en
  // el propio código del molde, siempre resuelto en vivo contra el manifest de la app actual
  // (el mismo "concepto" que Gemini ya usa como "tabla" en modelo_datos_completo). El fallback
  // (devolver el concepto tal cual si el manifest no tiene entrada) ES el comportamiento de hoy
  // para cualquier app sin manifest todavía — nunca rompe nada existente.
  obtenerTabla: (concepto) => manifestTablas?.[concepto] || concepto,

  // 🧭 [HUECO REAL DEL KIT 2026-08-18] Navegar a OTRA PÁGINA DE LA MISMA APP — ver el bug real que
  // lo motivó en contextoNavegacionApp.js (un pedido de cambio pagado que era imposible de cumplir
  // porque ningún molde tenía forma de cambiar de pantalla).
  //
  // ⚠️ NO DEVUELVE NADA, aunque acá sí podría: es una llamada directa (sin iframe de por medio),
  // así que el booleano estaría disponible al toque. Pero la copia de este mismo helper que corre
  // en el sandbox del Core (meitiIframeShim.js) manda un postMessage y NO puede saber el resultado
  // — si acá devolviera algo, el MISMO código de molde se comportaría distinto según corra en el
  // Core o en la app exportada, que es justo la divergencia silenciosa que ya costó cara en este
  // proyecto (categoría "export_codigo_duplicado_desincronizado"). Los dos callan igual.
  irAPagina: (idPagina) => {
    if (typeof idPagina === 'string' && idPagina.trim()) navegarAPagina?.(idPagina);
  },

  // 🔗 [BUG REAL 2026-08-26, encontrado por infra/chequeo-salidas.mjs en su PRIMERA corrida]
  // "abrirEnlaceExterno" existía solo en el motor del sandbox. O sea que un molde que abre un
  // enlace externo andaba en el Core y explotaba en la app EXPORTADA con "no es una función" —
  // la divergencia silenciosa de siempre (export_codigo_duplicado_desincronizado), esta vez
  // anterior a esta sesión y sin que nadie la hubiera notado.
  // Acá no hace falta pedirle permiso a nadie (el export no vive en un iframe), pero el contrato
  // es el mismo y la validación también: solo https, nunca un esquema arbitrario.
  abrirEnlaceExterno: (url) => {
    if (typeof url === 'string' && url.startsWith('https://')) {
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { window.location.href = url; }
    }
  },

  // ▶️ [REPRODUCTOR 2026-08-26] Reproducir un video o un audio. Lo dibuja la APP, no el molde, y
  // eso no es una preferencia: un molde corre en un iframe SIN permiso de pantalla completa
  // (imposible desde adentro) y su iframe MUERE al cambiar de página, así que el video se cortaría
  // al navegar. Del lado de la app sobrevive — y eso es lo que hace posible un YouTube o un Netflix.
  //
  // El molde no construye ningún reproductor: le pasa QUÉ mostrar y lo maquilla alrededor.
  //   MEITI.reproducir(fila.video_url, { titulo: fila.titulo, modo: 'pantalla' })
  reproducir: (fuente, opciones = {}) => {
    if (typeof pedirReproducir !== 'function') return false;
    return pedirReproducir(fuente, opciones);
  },

  // 📦 [SUBIR ARCHIVOS 2026-08-26] El espejo de "descargar". El archivo NO pasa por el servidor de
  // MEITI: se le pide una firma (una cuenta chica, sin tráfico), y con esa firma el navegador sube
  // DIRECTO a la cuenta del dueño de la app. MEITI es el escribano, no el depósito — ver
  // src/backend/almacenamientoExterno.js.
  //
  // Devuelve { ok, url } o { ok:false, motivo }. NUNCA tira ni falla en silencio: si la app no tiene
  // proveedor configurado, el molde recibe un motivo legible para mostrarle al dueño DÓNDE se
  // arregla, en vez de un botón que no hace nada.
  subirArchivo: async (archivo, opciones = {}) => {
    try {
      if (!archivo || typeof archivo !== 'object' || !archivo.name) {
        return { ok: false, motivo: 'No se recibió ningún archivo.' };
      }
      const topeMB = Number(opciones.topeMB) > 0 ? Number(opciones.topeMB) : 25;
      if (archivo.size > topeMB * 1024 * 1024) {
        return { ok: false, motivo: `El archivo pesa más de ${topeMB} MB.` };
      }
      const firma = await pedirFirmaDeSubida(appId);
      if (!firma || !firma.url) {
        return { ok: false, motivo: (firma && firma.detalle) || 'Esta app todavía no tiene dónde guardar archivos. Se configura una vez en Conexiones seguras.' };
      }
      const formulario = new FormData();
      Object.entries(firma.campos || {}).forEach(([k, v]) => formulario.append(k, v));
      formulario.append('file', archivo);
      // Sube DIRECTO al proveedor: este fetch no pasa por MEITI. Se usa el fetch nativo a propósito
      // (el del kit solo habla con la bóveda de la app y rechazaría este destino).
      const res = await fetch(firma.url, { method: 'POST', body: formulario });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, motivo: (data && data.error && data.error.message) || 'El proveedor rechazó el archivo.' };
      const url = data[firma.campoUrlEnRespuesta || 'secure_url'] || data.url || null;
      if (!url) return { ok: false, motivo: 'El proveedor no devolvió la dirección del archivo.' };
      return { ok: true, url, nombre: archivo.name, tipo: archivo.type || null, peso: archivo.size };
    } catch (e) {
      return { ok: false, motivo: 'No se pudo subir el archivo.' };
    }
  },

  // 💾 [DESCARGAS 2026-08-26] Mismas dos funciones que en el sandbox, con la MISMA lógica de
  // archivo (descargas.js) — acá no hace falta puente porque el export standalone no vive en un
  // iframe, pero el molde no se entera: mismo nombre, mismos argumentos, mismo archivo resultante.
  descargar: (nombre, contenido, tipo) => descargarEnNavegador(nombre, contenido, tipo || undefined),
  descargarCSV: (nombre, filas, columnas) => descargarEnNavegador(nombre || 'datos.csv', construirCSV(filas, columnas), 'text/csv;charset=utf-8'),

  // 🪟 [VENTANA DEL SISTEMA 2026-08-26] Tiene que existir en LOS DOS motores o el mismo molde
  // funciona en el Core y explota en la app exportada con "MEITI.confirmar is not a function" —
  // exactamente la divergencia silenciosa que ya costó cara en este proyecto (categoría
  // "export_codigo_duplicado_desincronizado", ver el comentario de irAPagina acá arriba).
  // La ventana la dibuja la app (MotorUI) en los dos casos; lo único distinto es el transporte:
  // allá cruza un postMessage, acá es una llamada directa. El molde no se entera de la diferencia.
  // Sin nadie que la dibuje responde que NO: una acción destructiva nunca se ejecuta por silencio.
  confirmar: (mensaje, opciones = {}) => {
    if (typeof pedirConfirmacion !== 'function') return Promise.resolve(false);
    return Promise.resolve(pedirConfirmacion({
      mensaje: String(mensaje || '¿Confirmas esta acción?'),
      titulo: opciones.titulo ? String(opciones.titulo) : null,
      confirmar: opciones.confirmar ? String(opciones.confirmar) : 'Confirmar',
      cancelar: opciones.cancelar ? String(opciones.cancelar) : 'Cancelar',
      tono: opciones.tono === 'peligro' ? 'peligro' : 'normal'
    })).then(r => !!r).catch(() => false);
  },

  // 🧰 [LIBRERÍA OBLIGATORIA 2026-08-06] Estas funciones existen para sacarle a la IA la
  // responsabilidad de acordarse de reglas en CADA fetch que escribe — en vez de pedirle que siga
  // una instrucción de texto religiosamente (que se le escapa en fetches secundarios, ver
  // categoría "mutante_sin_validar_respuesta" en oraculo.js, corroborada varias veces pese a la
  // regla ya existir), la regla queda ADENTRO de la función y listo. El prompt de forja/reparación
  // (oraculo.js) exige usarlas para GET/mutación a bóveda en vez de "fetch" crudo — no son opt-in.
  // Mismo criterio para todas: nunca tiran (nunca rompen el render con una excepción no atrapada),
  // siempre devuelven una forma consistente para que el molde solo tenga que chequear ".ok".
  fetchDatos: async (url) => ejecutarFetchDatos(url, appId),
  // 🩹 [LIBRERÍA OBLIGATORIA 2026-08-06] Misma familia — categoría "get_sin_filtro_usuario"
  // (GET a una tabla que otro molde de la misma app escribe con "usuario_id", pero sin mandar
  // "?usuario_id=" en el GET, mostrando datos de TODOS los usuarios) seguía corroborándose en
  // apps nuevas pese a estar documentada como regla de texto (ver bug real de seguridad
  // EvaluaIA, 2026-08-01). Fix estructural: esta función arma el query param sola a partir de
  // "obtenerUsuarioActual()" — Gemini no tiene que acordarse de pegarlo a mano en cada URL, solo
  // tiene que elegir la función correcta ("fetchDatosPropios" para datos personales del usuario,
  // "fetchDatos" para catálogos/config compartidos de toda la app). Si la URL ya trae
  // "usuario_id=" (por las dudas, defensivo), no lo duplica.
  // 🩹 [LIBRERÍA OBLIGATORIA 2026-08-06] Además del filtro server-side de arriba, esta función
  // vuelve a filtrar "registros" del lado del CLIENTE contra "usuario_id" antes de devolverlos —
  // mata de raíz la categoría "data0_sin_verificar_propietario" (código que confía en
  // "registros[0]" sin comprobar que sea realmente del usuario actual): si el filtro del
  // servidor alguna vez fallara o se saltara, acá no llega ni un registro ajeno, así que
  // "registros[0]" es confiable por construcción — Gemini ya no necesita escribir esa
  // verificación a mano en cada molde.
  // 🩹 [BUG REAL 2026-09-01] Renombrado del slug viejo (get_sin_filtro_usuario,
  // data0_sin_verificar_propietario) al formato de ruta que la taxonomía usa desde el
  // 2026-08-25 — el viejo nunca hizo match tras la migración, ver REGEX_CURA en server.js.
  // CURA: datos/propiedad/get-sin-filtro-usuario, datos/propiedad/confia-en-data0
  fetchDatosPropios: async (url) => {
    const usuarioId = resolverUsuarioActual(appId);
    const urlConUsuario = url.includes('usuario_id=')
      ? url
      : `${url}${url.includes('?') ? '&' : '?'}usuario_id=${encodeURIComponent(usuarioId)}`;
    const resultado = await ejecutarFetchDatos(urlConUsuario, appId);
    if (resultado.ok) {
      resultado.registros = resultado.registros.filter(r => r && r.usuario_id === usuarioId);
    }
    return resultado;
  },
  fetchMutante: (url, opciones = {}) => ejecutarFetchMutante(url, opciones, appId),
  // 💾 [2026-08-19] "mutar" / "mutarVarias" — la continuación del éxito como parámetro, para que
  // no quede dónde escribir "refrescar y limpiar el formulario" sin haber mirado si salió bien.
  // Ver src/fabrica/core/mutacionesSeguras.js: la regla vive una sola vez, el transporte es de cada
  // entorno.
  ...construirMutacionesSeguras((url, opciones) => ejecutarFetchMutante(url, opciones, appId)),
});

export default function ReactorRender({ codigoCrudo, datos, appId, tema, idPack, manifestTablas }) {
  const temaFinal = { ...TEMA_DEFAULT, ...(tema || {}) };
  const UI = construirKitUI(temaFinal, idPack);
  // 🧭 [HUECO REAL DEL KIT 2026-08-18] Ver contextoNavegacionApp.js. Se toma del contexto y NO de
  // un prop nuevo a propósito: el export standalone se arma reemplazando por STRING LITERAL la
  // línea JSX de MotorUI.jsx que renderiza este componente (ver generarArchivosProyectoExportado
  // en server.js) — sumarle un prop a esa línea rompía el match y el zip salía roto.
  const navegacion = useContext(ContextoNavegacionApp);
  // 🔐 [2026-10-06] Quién mira, resuelto ANTES de dibujar el molde: con la misma función y la misma
  // caché que el menú (rolEnApp.js), así el menú y los candados no pueden contradecirse.
  const [identidad, setIdentidad] = useState(null);
  useEffect(() => {
    let vivo = true;
    resolverRolEnApp(appId, resolverUsuarioActual(appId)).then((r) => { if (vivo) setIdentidad(r); });
    return () => { vivo = false; };
  }, [appId]);
  const MEITI = construirMeitiHelpers(appId, manifestTablas, navegacion?.irAPagina, navegacion?.confirmar, navegacion?.reproducir, identidad);

  // 🧰 [REGISTRO DINÁMICO DEL KIT 2026-08-23] Este componente vive solo en el export standalone
  // (el wizard/preview usa MoldeSandboxeado, que carga y reenvía las recetas por postMessage) —
  // acá se cargan directo. Promesa cacheada en kitUI.jsx: montar N moldes dispara UN fetch, y si
  // el backend local del export no tiene el endpoint, cae a lista vacía sin romper nada.
  useEffect(() => { cargarRecetasDelKit(); }, []);

  // 1. Las herramientas de la IA: React, hooks, datos de la API, tema, kit de UI e identidad de usuario.
  // 🩹 [FIX 2026-08-13, bug real reportado por el usuario en EscuelaVirtual: "ReferenceError:
  // useRef is not defined"] Mismo scope duplicado a propósito en SandboxRuntimeApp.jsx y
  // PreviewMoldeVivo.jsx — los tres se actualizan juntos para no repetir el drift ya documentado
  // arriba (export_codigo_duplicado_desincronizado).
  // 💎 [LIBRERÍAS PREMIUM 2026-08-16] "...LIBRERIAS_PREMIUM" suma Iconos/Animacion — siempre
  // presentes, sin gate acá (el gate está al GENERAR, no al VER: ver libreriasPremium.js).
  const scope = { React, useState, useEffect, useRef, useMemo, useCallback, datos, tema: temaFinal, UI, MEITI, LIBRERIAS_PREMIUM, ...LIBRERIAS_PREMIUM };

  if (!codigoCrudo) {
    return <div className="text-red-500 font-mono text-xs">[ ERROR ]: Código vacío.</div>;
  }
  // Hasta saber quién mira no se dibuja: un cliente no puede ver ni un instante una pantalla del
  // personal. resolverRolEnApp tiene su propio techo de tiempo (4 s) y nunca queda colgado.
  if (!identidad) return null;

  // 🧬 [2026-08-29] La limpieza y el envoltorio viven en comunes/envolverMolde.js, en UNA sola
  // definicion compartida con el motor del sandbox. Antes estaban escritos dos veces y ya
  // habian divergido: alla se quitaban los "import" sueltos y aca no, asi que un molde con un
  // import lider habria andado en el Core y explotado en el export.
  const codigoFinal = envolverComoElMotor(codigoCrudo);

  return (
    // 🎚️ [2026-08-29] --meiti-acento hace que checkbox, radio y slider usen el color de la APP
    // en vez del azul del sistema (ver estiloMeiti.css). Va en los DOS motores, o el mismo molde se
    // ve distinto en el Core y en el export.
    <div className="relative w-full h-full" style={{ '--meiti-acento': tema?.colorPrimario }}>
      {/* El Motor con noInline={true} para que acepte el render() */}
      <ErrorBoundaryReactorRender key={codigoFinal}>
        <LiveProvider code={codigoFinal} scope={scope} noInline={true}>
          <LivePreview className="w-full h-full" />
          <LiveError className="bg-red-50 text-red-600 text-xs p-3 font-mono border border-red-200 rounded-lg break-words mt-2" />
        </LiveProvider>
      </ErrorBoundaryReactorRender>
    </div>
  );
}
