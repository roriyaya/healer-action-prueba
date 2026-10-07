// ⚠️ [BUG REAL 2026-08-26, reportado por el usuario: "Error al cargar la app — useRef is not
// defined"] "useRef" faltaba en este import y lo usan la ventana de confirmar y el reproductor,
// los dos agregados hoy. Un símbolo sin importar NO rompe el build —Rollup lo asume global— y
// revienta recién en el navegador, tirando la app entera. Es la misma trampa que ya está
// documentada en feedback_build_verde_no_prueba_pantalla, y caí otra vez.
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// 🛡️ [SANDBOX 2026-07-31] Fase 4 del rollout (ver plan de sandbox): MoldeSandboxeado (iframe
// con origen opaco de verdad — ver src/fabrica/sandbox/) es ahora el ÚNICO camino de render para
// código de la IA, tanto en preview de arquitecto como en producción. El motor viejo
// (ReactorRender.jsx, react-live directo en el mismo contexto JS, sin sandbox real) y el escáner
// de ladrillos físicos materializados (import.meta.glob) se borraron con este cambio.
import ReactorRender from '../fabrica/core/ReactorRender.jsx';
import { cargarTextosDeApp, leerIdiomaElegido, recordarIdiomaElegido } from '../fabrica/core/textosApp.js';
import { resolverIdiomaDeApp, construirTraductor, claveDePagina, textoDelMarco } from '../comunes/idiomaApp.js';
import { idiomaActual as idiomaDeLaInterfaz, t } from '../comunes/textos';
import { TEMA_DEFAULT, claseIcono, construirKitUI } from '../fabrica/core/kitUI.jsx';
import { resolverTema, modoDeTema, MODOS } from '../fabrica/core/temaModos.js';
import { formaDePack } from '../fabrica/core/formasPack.js';
// 🎭 [MENÚ POR ROL 2026-08-28] Ver el comentario largo de usePaginasVisibles, más abajo.
import { resolverRolEnApp, resolverUsuarioActual, puedeVerPagina } from '../comunes/rolEnApp.js';
// 🧭 [2026-08-18] Ver contextoNavegacionApp.js — este import viaja al export standalone igual que
// kitUI.jsx, así que el archivo está agregado a la lista explícita de generarArchivosProyectoExportado().
import { ContextoNavegacionApp } from '../fabrica/core/contextoNavegacionApp.js';
import { API_BASE_URL } from '../config/apiConfig';

// 🔒 [SEC-20 2026-08-15] El export standalone no tiene /landing/auth.js (no hay login de
// arquitecto ni sesiones ahí) — sin token, useCatalogoComponentes simplemente no lo manda, mismo
// comportamiento de siempre para una app exportada. En el Core real, este wrapper se pisa abajo.
let leerTokenSesionSiExiste = () => '';

// --- 1. CORDÓN UMBILICAL INTELIGENTE ---
const useFlujoEnergia = (fuenteDatosConfig) => {
  const [datosAPI, setDatosAPI] = useState(null);
  const [estado, setEstado] = useState('ESPERANDO ENLACE API...');

  useEffect(() => {
    if (!fuenteDatosConfig || !fuenteDatosConfig.url_base) {
      setEstado('NODO LOCAL / SIN CONEXIÓN');
      return;
    }

    // 🛡️ BLINDAJE CONTRA DISPAROS FANTASMAS
    if (fuenteDatosConfig.metodo === 'POST' || fuenteDatosConfig.metodo === 'PUT') {
      setEstado('LISTO PARA INYECTAR');
      return; 
    }

    const inyectarEnergia = async () => {
      setEstado('SUCCIONANDO ENERGÍA...');
      try {
        const payloadFetch = {
          url_base: fuenteDatosConfig.url_base,
          metodo: fuenteDatosConfig.metodo || 'GET',
          llave_requerida: fuenteDatosConfig.llave_requerida || 'none',
          payload: fuenteDatosConfig.payload || null,
          sincronizar_local: fuenteDatosConfig.sincronizar_local || null
        };

        const res = await fetch(`${API_BASE_URL}/api/puente`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadFetch)
        });

        const data = await res.json();
        if (res.ok) {
          setDatosAPI(data);
          setEstado('ONLINE');
        } else {
          const detalleError = typeof data.error === 'object'
            ? (data.error.message || JSON.stringify(data.error))
            : (data.error || 'No autorizado');

          setEstado(`ERROR: ${detalleError}`);
        }
      } catch (err) {
        setEstado('FALLO DE RED');
      }
    };

    inyectarEnergia();
  }, [fuenteDatosConfig]);

  return { datosAPI, estado };
};

// --- 2. EL WIDGET COMODÍN (RENDERIZADOR DINÁMICO HTML/TAILWIND) ---
const MoldeVisual = ({ datos, metadataTag }) => {
  const [htmlRenderizado, setHtmlRenderizado] = useState('');

  useEffect(() => {
    if (!metadataTag || !metadataTag.molde_visual) return;
    try {
      const ejecutarBisturi = new Function('data', `return (${metadataTag.bisturi_extractor || 'd => d'})(data)`);
      const valorCrudo = ejecutarBisturi(datos);

      if (valorCrudo !== undefined && valorCrudo !== null) {
        let codigoMolde = metadataTag.molde_visual;
        if (!codigoMolde.trim().startsWith('(') && !codigoMolde.includes('=>')) {
          codigoMolde = `(valor) => \`${codigoMolde.replace(/`/g, '\\`')}\``;
        }

        const ejecutarMolde = new Function('valor', `return (${codigoMolde})(valor)`);
        setHtmlRenderizado(ejecutarMolde(valorCrudo));
      } else {
        setHtmlRenderizado(`<div class="text-slate-500 text-xs font-mono animate-pulse">[ ESPERANDO TRANSMISIÓN DE DATOS... ]</div>`);
      }
    } catch (err) {
      console.error("Choque lógico en Widget:", err);
      setHtmlRenderizado(`<div class="text-red-400 text-[10px] font-mono p-3 bg-red-950/30 border border-red-900/50 rounded">FALLO DE RENDERIZADO: ${err.message}</div>`);
    }
  }, [datos, metadataTag]);

  return <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: htmlRenderizado }} />;
};

// 🏭 FÁBRICA DE COMPONENTES ATÓMICOS (MOTOR DINÁMICO V13)
const ComponentFactory = ({ config, datos, catalogo, appId, tema, idPack, manifestTablas }) => {
  if (!config) return null;

  // WIDGETS DINÁMICOS DESDE EL CATÁLOGO SQLITE & NÚCLEO EN VIVO
  let tag = catalogo?.find(c => c.id_tag === config.tipo);

  if (!tag && catalogo && catalogo.length > 0) {
    tag = catalogo.find(c => c.id_tag.toLowerCase() === config.tipo.toLowerCase());
  }

  if (tag) {
    // 🧬 Todo código de la IA (REACT_FORJADO o materializado con codigo_crudo retenido) renderiza
    // vía el iframe sandboxeado — único camino, ver src/fabrica/sandbox/.
    if (tag.tipo_render === 'REACT_FORJADO' || tag.codigo_crudo) {
      return <ReactorRender codigoCrudo={tag.codigo_crudo} datos={datos} appId={appId} tema={tema} idPack={idPack} manifestTablas={manifestTablas} />;
    }
    // Renderizado clásico por Molde HTML
    return <MoldeVisual datos={datos} metadataTag={tag} />;
  }

  // 🛡️ [UX 2026-08-10, pedido explícito del usuario] Antes esto se llamaba "FANTASMA DETECTADO"
  // con un ícono de fantasma con glow morado sobre fondo oscuro/borde punteado y jerga interna
  // ("LADRILLO EN ESPERA"/"FALTA MATERIALIZAR") — lo ve CUALQUIER usuario final de CUALQUIER app
  // generada, y leía como una pantalla de virus/hackeo, no como un estado normal de espera. Mismo
  // estado técnico (molde sin materializar en el catálogo que le llegó al cliente — normalmente
  // transitorio), pero ahora se comunica como lo que realmente es la mayoría de las veces: algo
  // temporal, con el color de la propia app (tema.colorPrimario, mismo criterio que kitUI.jsx
  // para todo lo que depende del tema — nunca un color fijo de MEITI metido en la app de otro).
  const colorSpinner = (tema && tema.colorPrimario) || TEMA_DEFAULT.colorPrimario;
  return (
    <div
      className="p-4 rounded-xl flex flex-col items-center justify-center h-full min-h-[200px] gap-3"
      style={{ background: `${colorSpinner}0d`, border: `1px solid ${colorSpinner}22` }}
    >
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{ border: `2px dashed ${colorSpinner}55`, animationDuration: '3s' }}
        ></div>
        <div className="meiti-forja-hex w-5 h-5" style={{ background: colorSpinner }}></div>
      </div>
      <span className="text-xs font-medium" style={{ color: colorSpinner }}>Preparando esta sección...</span>
      <span className="text-[9px] text-texto-suave font-mono opacity-50">{config.tipo}</span>
    </div>
  );
};

// --- 4. COMPONENTE INTELIGENTE UNIVERSAL ---
const ComponenteDinamico = ({ config, catalogo, appId, tema, idPack, manifestTablas, esDuenoDeLaApp = false }) => {
  const { datosAPI, estado } = useFlujoEnergia(config.fuente_datos);
  // 🤝 [ASISTENTE DE CONTENIDO 2026-09-04] El switch "Activar IA" es NATIVO (nunca lo escribe la
  // IA, nunca se clona por app) — se inyecta acá, al lado del molde de Configuración clonado de
  // esa app puntual (id_tag "{plantillaId}__Configuracion", único patrón real que existe: no hay
  // ningún hueco/slot dedicado en el molde para esto). Mismo criterio que ya usa este archivo para
  // "lo nativo llega a TODA app sin regenerarla" (ver el comentario del modo oscuro más abajo) —
  // gateado por "esDuenoDeLaApp" (nunca lo ve un visitante/cliente de la app).
  const esPaginaConfiguracion = esDuenoDeLaApp && typeof config.tipo === 'string' && config.tipo.endsWith('__Configuracion');

  // 🎨 Usa el tema real de la app (no colores oscuros hardcodeados) y NUNCA muestra el id
  // técnico crudo — solo el título, si el molde declaró uno. "min-h" es una red de seguridad:
  // si el contenido real (adentro del iframe sandboxeado) todavía no midió su alto, este
  // contenedor nunca colapsa a 0px con contenido invisible — siempre reserva un alto mínimo
  // razonable mientras tanto.
  // 🩹 [ALTURA REAL 2026-08-01] BUG REAL CONFIRMADO EN PRODUCCIÓN (tarjetas con contenido propio
  // más alto que su fila de grilla quedaban recortadas con scroll interno — "Llaves de Acceso"/
  // "Roles y permisos" en apps reales, campos escondidos). Este wrapper tenía "h-full" y el de
  // adentro "overflow-hidden": el <iframe> de MoldeSandboxeado.jsx heredaba esa misma altura fija
  // y no podía crecer más allá de ella. Ahora el iframe mide su propio contenido y avisa al padre
  // (MEITI_ALTURA, ver sandboxRuntimeMain.jsx/sandboxRelay.js) — este wrapper y el de adentro se
  // sacaron el "h-full"/"overflow-hidden" que lo hubiera vuelto a recortar acá afuera.
  // 🖼️ [BUG REAL 2026-08-27, reportado por el usuario: "el frame con el marco por fuera de las
  // tarjetas les tapa el efecto, la sombra de abajo, y termina en cuadradito; se ve descoordinado"]
  // Este envoltorio es el marco que MotorUI le pone a CADA molde, y tenía la forma clavada
  // ("p-5 rounded-xl border shadow-sm"). Mientras todo el kit era fijo no se notaba; ahora que un
  // pack pide tarjetas de 2rem con resplandor, este marco se quedaba en 0.75rem con borde duro —
  // dos formas distintas, una adentro de la otra, y la de afuera recortando el efecto de la de
  // adentro. El marco tiene que seguir al mismo pack que lo que contiene.
  const formaMarco = formaDePack(idPack);
  // Dos caminos, y los dos son deliberados:
  //   · "tarjeta"  -> el marco SIGUE al pack (mismo radio, aire, borde y sombra que las piezas de
  //                   adentro), así deja de haber dos formas distintas anidadas;
  //   · "ninguno"  -> el marco DESAPARECE del todo: sin fondo, sin borde, sin sombra y sin aire,
  //                   así la tarjeta del molde queda sola y su sombra se ve entera. No se "pinta
  //                   del color del fondo": se vuelve transparente, que además funciona con
  //                   cualquier tema sin tener que adivinar cuál es el fondo detrás.
  const sinMarco = formaMarco.marcoMolde === 'ninguno';
  const bordeMarco = (formaMarco.bordeBloque === '0' || formaMarco.separadores === 'ninguno')
    ? 'none'
    : `${formaMarco.bordeBloque} solid ${tema?.colorPrimario ? `${tema.colorPrimario}22` : '#e2e8f0'}`;
  return (
    <div
      className="flex flex-col min-h-[220px]"
      style={sinMarco ? { background: 'transparent' } : {
        background: tema?.superficie || '#fff',
        padding: formaMarco.aireBloque,
        borderRadius: formaMarco.radioBloque,
        border: bordeMarco,
        boxShadow: formaMarco.sombraBloque === 'none' ? undefined : formaMarco.sombraBloque
      }}
    >
      {config.titulo && (
        <div className="flex justify-between items-center mb-4 border-b pb-3" style={{ borderColor: tema?.colorPrimario ? `${tema.colorPrimario}22` : '#e2e8f0' }}>
          <span className="text-xs uppercase tracking-widest font-bold" style={{ color: tema?.texto || '#334155' }}>
            {config.titulo}
          </span>
          {estado !== 'ONLINE' && config.fuente_datos && (
            <span className="text-[9px] px-2 py-1 rounded border tracking-widest uppercase font-bold bg-slate-50 text-texto-suave border-borde">
              {estado}
            </span>
          )}
        </div>
      )}

      {esPaginaConfiguracion && <SwitchAsistenteContenido appId={appId} tema={tema} />}

      <div className="w-full">
        <ComponentFactory config={config} datos={datosAPI} catalogo={catalogo} appId={appId} tema={tema} idPack={idPack} manifestTablas={manifestTablas} />
      </div>
    </div>
  );
};

// 🤝 [ASISTENTE DE CONTENIDO 2026-09-04] Switch nativo — la IA nunca lo escribe, no vive en
// catalogo_componentes, no se clona por app. Trae su propio estado inicial (GET) y lo persiste
// con PATCH /api/nodos/:id/asistente-contenido/config (server.js) — mismo criterio que el resto
// del chrome nativo: no depende de que "esquemaActual" traiga el flag ya resuelto, así funciona
// igual sin importar cuántas capas de props haya en el medio.
const SwitchAsistenteContenido = ({ appId, tema }) => {
  const [habilitado, setHabilitado] = useState(null); // null = todavía cargando
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(`${API_BASE_URL}/api/apps/${appId}/asistente-contenido/config`, { headers: { 'x-session-token': leerTokenSesionSiExiste() || '' } })
      .then(res => res.json())
      .then(data => { if (vivo) setHabilitado(!!data.habilitado); })
      .catch(() => { if (vivo) setHabilitado(false); });
    return () => { vivo = false; };
  }, [appId]);

  const alternar = async () => {
    const nuevoValor = !habilitado;
    setGuardando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/apps/${appId}/asistente-contenido/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-session-token': leerTokenSesionSiExiste() || '' },
        body: JSON.stringify({ habilitado: nuevoValor })
      });
      const data = await res.json();
      if (res.ok) setHabilitado(!!data.habilitado);
    } catch (e) { /* el switch simplemente no cambia — el dueño puede reintentar */ }
    finally { setGuardando(false); }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl border mb-4" style={{ borderColor: tema?.colorPrimario ? `${tema.colorPrimario}33` : '#e2e8f0', background: tema?.superficie || '#fff' }}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: tema?.texto || '#0f172a' }}>
          <i className="fa-solid fa-wand-magic-sparkles" style={{ color: tema?.colorPrimario || '#06b6d4' }}></i>
          {t('ac_title')}
        </div>
        <p className="text-xs mt-1" style={{ color: `${tema?.texto || '#0f172a'}99` }}>
          {t('ac_switch_description')}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!!habilitado}
        disabled={habilitado === null || guardando}
        onClick={alternar}
        className="shrink-0 w-12 h-7 rounded-full relative transition-colors disabled:opacity-50"
        style={{ background: habilitado ? (tema?.colorPrimario || '#06b6d4') : '#cbd5e1' }}
      >
        <span className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform" style={{ transform: habilitado ? 'translateX(20px)' : 'translateX(0)' }}></span>
      </button>
    </div>
  );
};

// 🤝 [ASISTENTE DE CONTENIDO 2026-09-04] Cáscara de UI — cero lógica de negocio propia, "el
// editor lo que necesite estar, lo demás llama a los mismos endpoints de MEITI" (pedido literal
// del usuario). Reusa ChatMeiti tal cual, y el MISMO mecanismo de visor que ya usa
// EditorConClaude.jsx (token-preview → iframe apuntado al CLON, nunca a la app real). Aplicar/
// Descartar son los MISMOS endpoints de siempre (server.js) — no llevan ningún flag nuevo, ya
// manejan el remapeo/limpieza de activos_diseno_indice.
// 🤖 [SELECTOR DE MODELO 2026-09-04, pedido explícito del usuario] Mismos 3 modelos no-código que
// ya acepta el endpoint (server.js: MODELOS_ASISTENTE_CONTENIDO). Lista blanca literal, nunca
// generada dinámicamente contra MODELOS_AGENTE completo (ese tiene los 2 de código, que acá nunca
// aplican). Sin "· Code"/"· Text" (esas etiquetas del Editor con Claude distinguen contra las
// opciones de código, que acá no existen).
const OPCIONES_MODELO_ASISTENTE_CONTENIDO = [
  { valor: 'haiku', texto: 'Haiku' },
  { valor: 'geminiFlash', texto: 'Gemini Flash' },
  { valor: 'meitiAiFree', texto: 'Meiti AI Free' }
];

const AsistenteContenidoWidget = ({ appId, tema, onCerrar }) => {
  const [mensajes, setMensajes] = useState([]); // [{rol:'usuario'|'asistente', texto, creditos?}]: forma de ChatMeiti + créditos para la estadística
  const [valor, setValor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [clonId, setClonId] = useState(null);
  const [urlVisor, setUrlVisor] = useState(null);
  const [resultadoFinal, setResultadoFinal] = useState(null); // 'aplicado' | 'descartado' | null
  const [procesandoFinal, setProcesandoFinal] = useState(false);
  const [modelo, setModelo] = useState('geminiFlash');
  const { soportado: soportaVoz, escuchando, alternarVoz } = useDictadoPorVoz(valor, setValor, setError, {
    idioma: idiomaDeLaInterfaz(),
    mensajes: { errorContexto: t('voz_error_contexto'), errorPermiso: t('voz_error_permiso'), error: t('voz_error') }
  });
  const saldoCreditos = useSaldoCreditos();
  const adjuntoAsistente = useAdjuntoArchivo(setError, {
    tipoInvalido: t('adj_tipo_invalido'), demasiadoGrande: t('adj_demasiado_grande'), errorLectura: t('adj_error_lectura')
  });

  useEffect(() => {
    if (!clonId) return;
    let vivo = true;
    fetch(`${API_BASE_URL}/api/nodos/${clonId}/token-preview?incrustado=1`, {
      method: 'POST',
      headers: { 'x-session-token': leerTokenSesionSiExiste() || '' }
    })
      .then(res => res.json())
      .then(data => { if (vivo && data.url_sandbox) setUrlVisor(data.url_sandbox); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [clonId]);

  const enviarMensaje = async (e) => {
    e.preventDefault();
    const texto = valor.trim();
    if (!texto || enviando) return;
    const historialNuevo = [...mensajes, { rol: 'usuario', texto }];
    setMensajes(historialNuevo);
    setValor('');
    setError(null);
    setEnviando(true);
    const adjuntoParaEnviar = adjuntoAsistente.adjunto;
    adjuntoAsistente.quitarAdjunto();
    try {
      const res = await fetch(`${API_BASE_URL}/api/apps/${appId}/asistente-contenido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': leerTokenSesionSiExiste() || '' },
        body: JSON.stringify({ historial: historialNuevo.map(m => ({ rol: m.rol, contenido: m.texto })), modelo, adjunto: adjuntoParaEnviar })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'No se pudo contactar al asistente.');
      // "creditos" viaja en cada mensaje del asistente (no solo el total) para poder armar la
      // miniatura de gasto, mismo criterio que ya usa EditorConClaude.jsx.
      setMensajes(h => [...h, { rol: 'asistente', texto: data.respuesta || '', creditos: data.creditos_cobrados || 0 }]);
      if (data.clon_id) setClonId(data.clon_id);
    } catch (err) {
      setMensajes(h => h.slice(0, -1));
      setValor(texto);
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const aplicarODescartar = async (accion) => {
    if (!clonId || procesandoFinal) return;
    setProcesandoFinal(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/nodos/${clonId}/${accion === 'aplicar' ? 'aplicar-cambio' : 'descartar-cambio'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': leerTokenSesionSiExiste() || '' }
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'No se pudo terminar.');
      setResultadoFinal(accion === 'aplicar' ? 'aplicado' : 'descartado');
      setTimeout(() => { window.location.reload(); }, 1400);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesandoFinal(false);
    }
  };

  const colorPrimario = tema?.colorPrimario || '#06b6d4';
  const colorFondo = tema?.fondo || '#0B1120';
  const colorSuperficie = tema?.superficie || colorFondo;
  const colorTexto = tema?.texto || '#f8fafc';

  // 🩹 [BUG REAL 2026-09-04, reportado por el usuario en vivo: "el asistente no cambia a modo
  // obscuro... también tiene que seguir los temas"] ChatMeiti (BarraEntradaChat, BurbujaChat,
  // etc.) no pinta con `tema`. Pinta con las clases de rol del PORTAL (bg-superficie,
  // border-borde, text-texto-suave...), que resuelven contra las variables CSS globales de
  // index.css, las mismas que solo cambian con el modo oscuro DEL PORTAL (BotonModoPortal,
  // PublicNav.jsx). Es un concepto completo y distinto del modo oscuro DE LA APP (modoVisual, este
  // archivo). Por eso el campo de escribir se quedaba siempre en el color del portal, sin
  // importar el tema real de la app ni su propio modo claro/oscuro.
  // "tono='claro'" (no derivado de modoVisual) es a propósito. Es el ÚNICO de los dos que usa
  // esas mismas clases de rol (ver el comentario de PALETAS en ChatMeiti.jsx: "oscuro" existe
  // solo para el panel fijo del Editor con Claude, con colores slate crudos, no roles). El fix
  // real es pisar esas variables CSS acá, en la raíz de este widget, con los colores REALES del
  // tema de la app. Así "claro" deja de significar "siempre claro" y pasa a significar "lo que
  // el tema de esta app diga", oscuro incluido.
  const variablesTemaChat = {
    '--color-superficie': colorSuperficie,
    '--color-fondo': colorFondo,
    '--color-relleno': `${colorTexto}12`,
    '--color-relleno-fuerte': `${colorTexto}22`,
    '--color-inverso': colorTexto,
    '--color-texto': colorTexto,
    '--color-texto-medio': colorTexto,
    '--color-texto-suave': `${colorTexto}99`,
    '--color-texto-tenue': `${colorTexto}66`,
    '--color-sobre-acento': '#ffffff',
    '--color-borde': `${colorPrimario}33`,
    '--color-borde-suave': `${colorPrimario}22`,
    '--color-borde-fuerte': `${colorPrimario}55`,
    '--color-acento': colorPrimario,
    '--color-acento-fuerte': colorPrimario,
    '--color-acento-vivo': colorPrimario,
    '--color-acento-tinte': `${colorPrimario}15`,
    '--color-acento-tinte-2': `${colorPrimario}28`,
    '--color-acento-suave': `${colorPrimario}40`
  };

  // 🤖 [SELECTOR DE MODELO 2026-09-04, pedido explícito del usuario: "no salen los select debajo
  // del campo de entrada como en el editor de dev... icono de activar mic... estadisticas igual y
  // linkea igual a meiti creditos"] Mismos 3 controles, JSX casi calcado del que ya prueba
  // EditorConClaude.jsx. Reusa las clases de rol (bg-superficie/border-borde/text-acento-vivo)
  // porque "variablesTemaChat" de arriba ya pisa esas variables CSS con el tema real de esta app,
  // así que resuelven solas sin necesitar su propia versión con "style" inline.
  const selectorModeloAsistente = (
    <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-borde bg-superficie text-xs text-texto-suave">
      <i className="fa-solid fa-microchip text-acento-vivo shrink-0" aria-hidden="true"></i>
      <Desplegable
        valor={modelo}
        onCambio={setModelo}
        opciones={OPCIONES_MODELO_ASISTENTE_CONTENIDO}
        ariaLabel={t('ed_model_label')}
        className="meiti-desplegable--desnudo meiti-desplegable--abre-derecha"
      />
    </div>
  );

  const botonVozAsistente = soportaVoz ? (
    <button
      type="button"
      onClick={alternarVoz}
      aria-pressed={escuchando}
      title={escuchando ? t('voz_stop') : t('voz_start')}
      className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full border transition-colors ${escuchando ? 'bg-peligro-tinte border-peligro-suave text-peligro animate-pulse' : 'bg-superficie border-borde text-texto-suave hover:text-acento hover:border-acento-suave'}`}
    >
      <i className={`fa-solid ${escuchando ? 'fa-stop' : 'fa-microphone'} text-[11px]`}></i>
    </button>
  ) : null;

  // 💳 [SALDO PERMANENTE 2026-09-04, pedido explícito del usuario] Antes este botón solo se
  // mostraba cuando ya se había gastado algo EN esta charla puntual. El usuario lo corrigió: acá
  // es donde el dueño está mirando SU PROPIA app (no el panel de MEITI), así que necesita el saldo
  // REAL siempre visible, para saber si le alcanza antes de pedir algo que cuesta créditos, con un
  // click directo a /creditos si no. La gráfica de gasto de ESTA charla se suma al lado cuando hay
  // algo que graficar, pero el saldo se ve siempre, aunque todavía no se haya gastado nada.
  const totalCreditosAsistente = Math.round(mensajes.reduce((suma, m) => suma + (m.creditos || 0), 0) * 100) / 100;
  const datosGastosAsistente = mensajes.filter(m => m.rol === 'asistente' && m.creditos > 0).map((m, i) => ({ i, v: m.creditos }));

  // 🩹 [BUG REAL 2026-09-05, reportado por el usuario en vivo desde el teléfono: "apenas deja un
  // par de líneas para leer los mensajes... el bg del campo cubre casi toda la pantalla"] Este
  // bloque de Descartar/Aplicar vivía como una fila HERMANA, afuera del árbol de ChatMeiti (ver el
  // comentario viejo, más abajo, que ya lo advertía: "ChatMeiti mide su propio alto disponible una
  // vez... y no se entera cuando un HERMANO afuera de su árbol cambia de alto"). En mobile,
  // ChatMeiti mide su propio espacio disponible restando SOLO lo que hay dentro de su propia raíz
  // (altoCajaInterna/desfaseAbajo en ChatMeiti.jsx): todo lo que hay POR FUERA de esa raíz, como
  // esta fila, queda invisible para esa cuenta. El resultado real: la barra de entrada se calculaba
  // como si esta fila no existiera, la caja de mensajes se estiraba de más para "llegar" hasta
  // donde la barra debería estar, y el hueco que sobraba se veía como fondo vacío entre el último
  // mensaje y el campo. Fix: se muda ADENTRO de "debajoDelCampo" (mismo prop que ya usan el
  // selector de modelo, la voz, el adjunto y los créditos): ahí SÍ es parte de la barra que
  // ChatMeiti mide de verdad con su propio ResizeObserver, así que el cálculo queda correcto solo,
  // sin necesitar una cuenta aparte para este caso puntual.
  const descartarOAplicarAsistente = (
    <div className={`flex gap-2 pt-1.5 border-t ${clonId ? '' : 'invisible pointer-events-none'}`} style={{ borderColor: `${colorPrimario}22` }}>
      <button
        onClick={() => aplicarODescartar('descartar')}
        disabled={procesandoFinal}
        className="flex-1 py-2 rounded-lg text-sm font-medium border disabled:opacity-50"
        style={{ borderColor: `${colorPrimario}33`, color: colorTexto }}
      >
        {t('ac_discard')}
      </button>
      <button
        onClick={() => aplicarODescartar('aplicar')}
        disabled={procesandoFinal}
        className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        style={{ background: colorPrimario, color: '#fff' }}
      >
        {procesandoFinal ? t('ac_applying') : t('ac_apply')}
      </button>
    </div>
  );

  const debajoDelCampoAsistente = (
    <div className="flex flex-col gap-1.5">
      <ChipAdjunto adjunto={adjuntoAsistente.adjunto} quitarAdjunto={adjuntoAsistente.quitarAdjunto} />
      <div className="flex items-center gap-2 flex-wrap">
        {selectorModeloAsistente}
        {botonVozAsistente}
        <BotonAdjuntar inputRef={adjuntoAsistente.inputRef} onCambioInput={adjuntoAsistente.onCambioInput} elegirArchivo={adjuntoAsistente.elegirArchivo} />
        <BotonCreditos saldo={saldoCreditos} totalCreditosSesion={totalCreditosAsistente} datosGastoSesion={datosGastosAsistente} />
      </div>
      {/* 🆓 [AVISO DE PRIVACIDAD 2026-10-06] Mismo aviso que el Editor con IA y que el nivel gratis de Healer. */}
      {modelo === 'meitiAiFree' && (
        <p className="text-[11px] leading-snug text-texto-suave"><i className="fa-solid fa-circle-info mr-1" aria-hidden="true"></i>{t('ia_free_aviso_privacidad')}</p>
      )}
      {descartarOAplicarAsistente}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: colorFondo, ...variablesTemaChat }}>
      {/* 🩹 [BUG REAL 2026-09-04, encontrado probando en vivo] Este header, cuando quedaba SIEMPRE
          visible, competía con el anclaje real de ChatMeiti en angosto (ver "variante='editor'" en
          ChatMeiti.jsx): ese modo asume que el chat ES toda la pantalla y posiciona su propio campo
          contra el borde real del documento — con este header arriba, el campo terminaba tapándolo.
          Mismo criterio que ya usa EditorConClaude.jsx: en angosto se esconde y el botón de volver
          vive DENTRO de la columna del chat (ver más abajo); en PC (embebido, sin anclaje real) no
          hay conflicto y el header se puede mostrar entero. */}
      <div className="shrink-0 hidden lg:flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: `${colorPrimario}33`, background: colorSuperficie }}>
        <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: colorTexto }}>
          <i className="fa-solid fa-wand-magic-sparkles" style={{ color: colorPrimario }}></i>
          {t('ac_title')}
        </div>
        <button onClick={onCerrar} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: colorTexto }} title={t('ac_close')} aria-label={t('ac_close')}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {resultadoFinal ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ color: colorTexto }}>
          <i className={`fa-solid ${resultadoFinal === 'aplicado' ? 'fa-circle-check' : 'fa-trash'} text-3xl`} style={{ color: colorPrimario }}></i>
          <p className="text-sm">{resultadoFinal === 'aplicado' ? t('ac_applied') : t('ac_discarded')}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* 🩹 [BUG REAL 2026-09-04, encontrado probando en vivo] "lg:" acá, nunca "md:". Tiene que
              coincidir EXACTO con el corte de 1023px que ChatMeiti usa internamente para
              "variante='editor'" (pantallaAngosta, ChatMeiti.jsx). Con "md:" (768px) entre 768 y
              1023px el layout ya partía en dos columnas pero ChatMeiti seguía en modo "toda la
              pantalla" (anclaje real al teclado): la caja del chat se rompía justo en ese rango.
              Mismo criterio que ya usa EditorConClaude.jsx para su propio split de dos columnas. */}
          <div className="flex-1 min-h-0 lg:max-w-md lg:border-r flex flex-col" style={{ borderColor: `${colorPrimario}22` }}>
            {/* Cerrar: en angosto (el chat ocupa toda la pantalla) el header de arriba está
                escondido — este es el único cierre visible ahí. En PC el header ya trae su propia
                "X", así que acá no hace falta duplicarlo. */}
            <button
              onClick={onCerrar}
              className="lg:hidden shrink-0 self-start m-2 mb-0 text-xs font-medium flex items-center gap-1.5"
              style={{ color: colorTexto }}
            >
              <i className="fa-solid fa-arrow-left"></i> {t('ac_close')}
            </button>
            {/* 🩹 [BUG REAL 2026-09-04, encontrado probando en vivo] "flex flex-col" acá NO es
                decorativo — sin eso el "raíz" interno de ChatMeiti (que se apoya en su propio
                "flex-1" para tomar el alto real) tiene un padre que no es contenedor flex, así que
                ese "flex-1" no hace nada: colapsaba a 14px y la barra de entrada (absolute contra
                ese raíz) terminaba con un "top" negativo, fuera de la pantalla. Mismo combo de 4
                clases que ChatMeiti.jsx pide explícito en su propio comentario: "flex-1 min-h-0
                flex flex-col". */}
            {/* 🩹 [BUG REAL 2026-09-04, reportado por el usuario en vivo: "el chat y el campo de
                entrada están muy pegados a los bordes de la ventana"] "px-3" acá empuja tanto la
                lista de mensajes como la barra de entrada (ambas hijas del mismo raíz de
                ChatMeiti). La barra, aunque se posiciona "absolute" en angosto, lo hace contra el
                borde de ESTE div (su ancestro con position:relative más cercano), así que hereda
                el mismo aire sin necesitar su propio ajuste. */}
            <div className="flex-1 min-h-0 flex flex-col px-3">
              <ChatMeiti
                variante="editor"
                barraAfuera
                historial={mensajes}
                escribiendo={enviando}
                valor={valor}
                onCambio={setValor}
                onEnviar={enviarMensaje}
                placeholder={t('ac_placeholder')}
                error={error}
                tono="claro"
                debajoDelCampo={debajoDelCampoAsistente}
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 hidden lg:block">
            {urlVisor ? (
              <iframe src={urlVisor} title={t('ac_title')} className="w-full h-full border-0" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: `${colorTexto}99` }}>
                {clonId ? t('ac_preview_loading') : t('ac_preview_empty')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- 5. HOOK COMPARTIDO DE CATÁLOGO (se pide una sola vez por render de app, no por página) ---
// 🧬 [MOLDES POR APP 2026-08-11] appId identifica la app que se está renderizando — con él, el
// backend sirve los moldes propios de ESA app (de su propia DB, incluida la auto-sanación de
// clones de BASE) + los BASE de Core, en vez de la tabla entera de Core. 'core_meiti' (o vacío,
// paneles admin que aún no threadean un appId real) sigue pidiendo exactamente lo de siempre.
const useCatalogoComponentes = (appId, tokenPreview) => {
  const [catalogo, setCatalogo] = useState([]);
  // 🩹 [BUG REAL 2026-09-10, reportado por el usuario: instaló un export de Windows y quedó
  // cargando los moldes para siempre] Un fetch que nunca llega a responder (backend embebido
  // caído, típico de un export standalone sin conexión) caía siempre en este catch, pero solo
  // hacía console.error — "catalogo" quedaba en [] para siempre, sin ningún aviso en pantalla.
  const [errorCatalogo, setErrorCatalogo] = useState(null);

  useEffect(() => {
    // 🔒 [SEC-20 2026-08-15] El backend ahora exige dueño/arquitecto (o el token de sandbox de
    // Cuarentena/Ojo Óptico) para leer el catálogo de una app que no esté ONLINE — mandar el
    // token de sesión si hay uno en este navegador (no hace nada si la app ya está ONLINE, el
    // backend ni lo mira) y el token de preview si el llamador lo threadeó (ver extraerUI).
    const url = (appId && appId !== 'core_meiti')
      ? `${API_BASE_URL}/api/catalogo/componentes?ecosistema=${encodeURIComponent(appId)}${tokenPreview ? `&token=${encodeURIComponent(tokenPreview)}` : ''}`
      : `${API_BASE_URL}/api/catalogo/componentes`;
    fetch(url, { headers: { 'x-session-token': leerTokenSesionSiExiste() || '' } })
      .then(res => res.json())
      .then(data => setCatalogo(data))
      .catch(err => {
        console.error("Fallo Bóveda:", err);
        setErrorCatalogo(err.message || 'No se pudo conectar con el backend.');
      });
  }, [appId, tokenPreview]);

  return [catalogo, errorCatalogo];
};

// 🔑 [CONCEPTO DINÁMICO 2026-08-14] Mismo criterio que useCatalogoComponentes (se pide una sola
// vez por render de app, nunca por página/molde) — mapa {concepto: tabla} que MEITI.obtenerTabla
// consulta en vez de que cada molde traiga el nombre físico de tabla hardcodeado. Si la app no
// tiene modelo_datos_completo todavía (apps viejas, o antes de que exista el manifest), el
// endpoint devuelve {} — MEITI.obtenerTabla ya sabe caer al concepto tal cual en ese caso.
const useManifestTablas = (appId) => {
  const [manifestTablas, setManifestTablas] = useState({});

  useEffect(() => {
    if (!appId || appId === 'core_meiti') { setManifestTablas({}); return; }
    fetch(`${API_BASE_URL}/api/catalogo/manifest-tablas?ecosistema=${encodeURIComponent(appId)}`)
      .then(res => res.json())
      .then(data => setManifestTablas(data && typeof data === 'object' ? data : {}))
      .catch(err => console.error("Fallo manifest de tablas:", err));
  }, [appId]);

  return manifestTablas;
};

// --- 6. ENVOLTORIO MATRIZ (una sola grilla — hoy una página, antes la app entera) ---
const EnvoltorioMatriz = ({ esquemaActual, catalogo, appId, tema, idPack, manifestTablas, esDuenoDeLaApp = false }) => {
  if (!esquemaActual || !esquemaActual.componentes) return null;

  // 🐛 [BUG REAL 2026-08-15, pedido explícito del usuario: "revisa en vista de telefono cualquier
  // app... el div recorre alrededor y se corta en el lado derecho por el scroll y se mueve
  // escrolea un poquito leve... son todos, incluso los moldes base"] Esta grilla tenía "h-full"
  // (obliga a medir EXACTO el alto del contenedor con scroll) y CADA UI.Tarjeta adentro (usada
  // por cualquier molde) tiene "min-h-full" (pide medir COMO MÍNIMO ese mismo alto completo).
  // Con más de una tarjeta apilada en una sola columna (el layout normal en teléfono), cada una
  // compite por "al menos el 100% del contenedor entero" — matemáticamente no entran todas en
  // ese 100% sin pisarse, así que el conjunto termina un poco más alto que el contenedor real:
  // un scroll fantasma chico, consistente, en cualquier pantalla con más de una tarjeta (que es
  // prácticamente cualquier pantalla real). Sacando "h-full" de acá, la grilla mide lo que su
  // contenido necesita (nunca un alto fijo artificial) — "min-h-full" en UI.Tarjeta ahora no
  // tiene contra qué resolverse cuando hay una sola tarjeta sola en pantalla (pierde el "se
  // estira para no verse como una cajita chica flotando"), pero elimina el desborde real que
  // afectaba a CUALQUIER pantalla con más de una tarjeta.
  return (
    <div className="grid grid-cols-12 gap-6 w-full min-w-0">
      {esquemaActual.componentes.map((comp, idx) => {
        const colSpan = comp.col_span || 12;
        return (
          <div key={idx} className={`col-span-12 lg:col-span-${colSpan} min-w-0 w-full`}>
            <ComponenteDinamico config={comp} catalogo={catalogo} appId={appId} tema={tema} idPack={idPack} manifestTablas={manifestTablas} esDuenoDeLaApp={esDuenoDeLaApp} />
          </div>
        );
      })}
    </div>
  );
};

// --- 7. APP SHELL MULTI-PÁGINA (nativo y fijo, la IA nunca escribe esta navegación) ---
const ICONOS_NAV_DEFAULT = ['fa-house', 'fa-compass', 'fa-comment-dots', 'fa-book-open', 'fa-user'];
// 🎭 [MENU POR ROL 2026-08-28, pedido del usuario] Una pagina de solo-admin igual mostraba su icono
// en el menu: el usuario entraba y se comia un "Acceso restringido: esta seccion es solo para
// administradores". Palabras suyas: "es mas bonito que al ser admin le salgan todos los iconos, y al
// no serlo le salgan solo los que puede usar. Se ve bien la app, sin portazos en la cara".
//
// UNA sola definicion para los DOS lugares que arman la lista (elegir la pagina inicial y pintar los
// sidebars). Si esto se copiara en los dos, seria exactamente la categoria mas corroborada del
// sistema — y ademas un usuario podria ARRANCAR parado en una pagina que el menu no le muestra.
//
// 🚨 El menu es COSMETICA, no un control de acceso: cada molde conserva su propio gate y corre igual
// si alguien navega directo. Ver puedeVerPagina en comunes/rolEnApp.js.
const usePaginasVisibles = (esquemaActual, appId) => {
  const todas = useMemo(
    () => (Array.isArray(esquemaActual?.paginas) ? esquemaActual.paginas : []),
    [esquemaActual]
  );
  // null = todavia no se quien es. Mientras tanto se muestra TODO, que es lo de siempre.
  const [identidad, setIdentidad] = useState(null);

  useEffect(() => {
    let vivo = true;
    resolverRolEnApp(appId, resolverUsuarioActual(appId)).then((r) => { if (vivo) setIdentidad(r); });
    return () => { vivo = false; };
  }, [appId]);

  return useMemo(() => {
    if (!identidad) return todas;
    const visibles = todas.filter((p) => puedeVerPagina(p, identidad));
    // 🛟 Si NINGUNA queda visible, se muestran todas. Una app en blanco no le sirve a nadie y no se
    // puede reportar; una puerta cerrada al menos dice que existe y por que.
    return visibles.length ? visibles : todas;
  }, [todas, identidad]);
};



// 🔒 [PÁGINA GRIS DESACTIVADA, 2026-08-10, EscuelaVirtual] "paginasPendientes" viene del dueño de
// la app (título real ya conocido, ver /api/nodos/mios), NUNCA de "esquemaActual" — una app con
// páginas del plan original todavía sin generar mostraba su navegación como si estuviera
// completa, sin ningún indicio de qué faltaba. El usuario final entraba, no encontraba una
// función que esperaba, y asumía que la app entera estaba rota — sin saber que esa parte
// específica todavía no se había generado. Ahora el ítem de menú SÍ aparece (título real, el
// usuario sabe que existe) pero deshabilitado — nunca se navega a un contenido que no existe.
// 🧭 [HUECO REAL DEL KIT 2026-08-18] Este wrapper existe SOLO para ser dueño del estado de página
// activa y publicarlo como "MEITI.irAPagina(...)" a los moldes — ver el comentario largo en
// contextoNavegacionApp.js para el bug real que lo motivó (un pedido pagado que era imposible de
// cumplir porque ningún molde tenía forma de cambiar de página).
//
// ⚠️ Por qué un wrapper y no envolver el JSX adentro: "AppMultiPaginaInterno" tiene TRES ramas de
// return distintas (layout 'web', industrial, y el AppShell por defecto). Envolver cada una en el
// Provider eran tres ediciones y tres oportunidades de olvidarse de una — la forma exacta de la
// categoría "regla_no_propagada_a_todos_los_puntos_de_entrada". Con el estado acá arriba, las tres
// ramas quedan sin tocar y el Provider es uno solo.
// 🌐 [IDIOMAS 2026-08-29] El selector de idioma de una app generada.
//
// No aparece si la app habla un solo idioma: un selector con una sola opción es ruido, y la enorme
// mayoría de las apps van a tener uno hasta que el dueño compre un pack.
//
// La etiqueta de cada idioma va EN SU PROPIO IDIOMA ("Português", no "Portugués"), que es la misma
// regla que ya usa el selector de la interfaz de MEITI y por el mismo motivo: lo lee justamente
// quien no habla el idioma actual.
const SelectorIdiomaApp = ({ appId, idiomas, actual, onCambiar, colorTexto, colapsado }) => {
  if (!Array.isArray(idiomas) || idiomas.length < 2) return null;
  const NOMBRE = {
    es: 'Español', en: 'English', pt: 'Português', fr: 'Français', it: 'Italiano', de: 'Deutsch',
    zh: '中文', ja: '日本語', ko: '한국어', ru: 'Русский', ar: 'العربية', nl: 'Nederlands',
    pl: 'Polski', tr: 'Türkçe', hi: 'हिन्दी'
  };
  return (
    <div className={`px-3 py-2 shrink-0 ${colapsado ? 'md:px-1' : ''}`}>
      <label className="sr-only" htmlFor={`idioma_${appId}`}>{textoDelMarco(actual, 'idioma')}</label>
      <div className="flex items-center gap-2">
        <i className="fa-solid fa-language text-xs shrink-0" style={{ color: `${colorTexto}80` }} aria-hidden="true"></i>
        <select
          id={`idioma_${appId}`}
          value={actual}
          onChange={(e) => onCambiar(e.target.value)}
          className={`w-full bg-transparent text-xs outline-none cursor-pointer ${colapsado ? 'md:hidden' : ''}`}
          style={{ color: `${colorTexto}b0` }}
        >
          {idiomas.map((c) => <option key={c} value={c} style={{ color: '#111827' }}>{NOMBRE[c] || c}</option>)}
        </select>
      </div>
    </div>
  );
};

const EnvoltorioAppMultiPagina = ({ esquemaActual, catalogo, appId, nombreApp, paginasPendientes = [], manifestTablas, esDuenoDeLaApp = false }) => {
  const paginas = usePaginasVisibles(esquemaActual, appId);
  const [paginaActivaId, setPaginaActivaId] = useState(paginas[0]?.id || null);

  // 🌐 Qué idiomas habla esta app y cuál se está viendo. Al cambiarlo, la app entera se vuelve a
  // montar (ver la "key" de abajo): un molde lee su idioma UNA vez, al montarse, así que cambiarlo
  // sin remontar dejaría media pantalla en un idioma y media en otro.
  const [idiomasApp, setIdiomasApp] = useState([]);
  const [idiomaApp, setIdiomaApp] = useState(null);
  const [diccionariosApp, setDiccionariosApp] = useState(null);
  useEffect(() => {
    let vivo = true;
    cargarTextosDeApp(appId).then(({ idiomas, diccionarios }) => {
      if (!vivo) return;
      setIdiomasApp(idiomas);
      setDiccionariosApp(diccionarios || null);
      setIdiomaApp(resolverIdiomaDeApp({
        elegido: leerIdiomaElegido(appId),
        idiomaInterfaz: idiomaDeLaInterfaz(),
        disponibles: idiomas
      }));
    });
    return () => { vivo = false; };
  }, [appId]);

  // 📄 [2026-10-06, Tap Io] Títulos y descripciones de página en el idioma elegido. Se traduce la
  // lista UNA vez acá y la pantalla recibe la copia traducida: el título se dibuja en siete lugares
  // (menú, barra, hoja de "Más"...) y así no se escapa ninguno. La navegación (irAPagina, arriba)
  // sigue usando las páginas originales: un molde puede navegar por el título en español.
  const traducirPaginas = useCallback((lista) => {
    if (!diccionariosApp || !Array.isArray(lista)) return lista;
    const t = construirTraductor(diccionariosApp, idiomaApp);
    return lista.map(p => (p && p.id ? {
      ...p,
      titulo: typeof p.titulo === 'string' && p.titulo ? t(claveDePagina(p.id, 'titulo'), null, p.titulo) : p.titulo,
      descripcion: typeof p.descripcion === 'string' && p.descripcion ? t(claveDePagina(p.id, 'descripcion'), null, p.descripcion) : p.descripcion
    } : p));
  }, [diccionariosApp, idiomaApp]);
  const esquemaEnIdioma = useMemo(() => (
    esquemaActual && Array.isArray(esquemaActual.paginas) ? { ...esquemaActual, paginas: traducirPaginas(esquemaActual.paginas) } : esquemaActual
  ), [esquemaActual, traducirPaginas]);
  const pendientesEnIdioma = useMemo(() => traducirPaginas(paginasPendientes), [paginasPendientes, traducirPaginas]);

  const cambiarIdioma = useCallback((codigo) => {
    recordarIdiomaElegido(appId, codigo);
    setIdiomaApp(codigo);
  }, [appId]);

  // 🧭 Resuelve por ID o por TÍTULO, sin distinguir mayúsculas ni espacios de sobra. El "id" es lo
  // correcto y es lo que el prompt le pide a la IA, pero aceptar el título también sale gratis y
  // cubre el caso realista de que escriba el nombre visible de la pantalla ("Detalle de
  // Criptomoneda") en vez del id — mismo criterio que sanearIconosDePaginas: es más barato tolerar
  // la variante razonable acá que gastar una reparación entera arreglándolo después.
  const irAPagina = useCallback((idOTitulo) => {
    if (typeof idOTitulo !== 'string' || !idOTitulo.trim()) return false;
    const buscado = idOTitulo.trim().toLowerCase();
    const destino = paginas.find(p =>
      String(p?.id || '').toLowerCase() === buscado ||
      String(p?.titulo || '').trim().toLowerCase() === buscado
    );
    if (!destino) {
      // 🚫 Nunca navegar a una página que todavía NO se generó: "paginasPendientes" ya aparece en
      // el menú pero deshabilitada a propósito (ver el comentario de PÁGINA GRIS más arriba) —
      // sería incoherente que el menú la bloquee y un molde pudiera saltarla por atrás.
      const esPendiente = (paginasPendientes || []).some(p =>
        String(p?.id || '').toLowerCase() === buscado ||
        String(p?.titulo || '').trim().toLowerCase() === buscado
      );
      console.warn(`[ MEITI ] irAPagina("${idOTitulo}"): ${esPendiente ? 'esa página todavía no se generó' : 'no existe ninguna página con ese id ni título'}.`);
      return false;
    }
    setPaginaActivaId(destino.id);
    return true;
  }, [paginas, paginasPendientes]);

  // 🪟 [VENTANA DEL SISTEMA 2026-08-26] La ventana de confirmación vive ACÁ, en la app, y no en el
  // molde: cada molde corre en un iframe cuyo alto es el de su propio contenido, así que una
  // ventana modal dibujada ahí adentro solo taparía ese molde y saldría recortada. Acá tapa la app
  // entera, que es lo que una ventana modal significa.
  // Reemplaza al confirm() del navegador, que 29 moldes ya usaban: ese gris del sistema operativo
  // no se parece en nada a la app y en un teléfono se lee como un cartel del navegador.
  const [ventana, setVentana] = useState(null); // { pedido, resolver }
  const confirmar = useCallback((pedido) => new Promise((resolver) => {
    setVentana({ pedido: pedido || {}, resolver });
  }), []);
  const cerrarVentana = useCallback((respuesta) => {
    setVentana((v) => { v?.resolver(respuesta); return null; });
  }, []);

  // useMemo para que el value del Provider no cambie de identidad en cada render — si no, todo
  // consumidor se re-renderiza al pedo en cada actualización del padre.
  // ▶️ [REPRODUCTOR 2026-08-26] Vive ACÁ, en la app, y no en un molde. No es una preferencia: un
  // molde corre en un iframe SIN permiso de pantalla completa (imposible desde adentro, no es que
  // salga feo) y su iframe MUERE al cambiar de página, así que el video se cortaría al navegar.
  // Acá sobrevive — y eso es exactamente lo que hace posible un YouTube o un Netflix.
  //
  // Idea del usuario: que sea un VERBO y no un molde con cara, porque "un reproductor puesto en una
  // página sin mostrar nada es como una tabla sin el formulario". El molde recibe el elemento a
  // mostrar y lo maquilla como quiera alrededor; el reproductor en sí es UNO SOLO — igual que en
  // Netflix, donde lo que cambia es todo lo que lo rodea, nunca los controles de play.
  const [reproduccion, setReproduccion] = useState(null);
  const reproducir = useCallback((fuente, opciones = {}) => {
    // "audio: true" lo declara quien llama, y es la forma honesta de resolver una radio en vivo:
    // su dirección no tiene extensión, y adivinarlo por el nombre es una heurística con borde.
    const resuelta = resolverFuente(fuente, { audio: opciones.audio === true });
    if (!resuelta) {
      // 🚫 Nunca quedarse en blanco: si no se puede reproducir, se dice. Un reproductor mudo es el
      // mismo pecado que un botón que no hace nada.
      setReproduccion({ error: 'No se pudo reconocer ese video. Revisa la dirección.', modo: 'pantalla' });
      return false;
    }
    const cola = Array.isArray(opciones.cola) ? opciones.cola.filter(Boolean) : [];
    setReproduccion({
      fuente: resuelta,
      titulo: opciones.titulo ? String(opciones.titulo) : null,
      subtitulo: opciones.subtitulo ? String(opciones.subtitulo) : null,
      modo: opciones.modo === 'mini' ? 'mini' : 'pantalla',
      cola,
      indice: 0
    });
    return true;
  }, []);

  // 🌐 [2026-10-05] cambiarIdioma también viaja: un molde con su propio selector de idioma lo pide
  // por MEITI.cambiarIdioma, y es el mismo que usa el selector del marco (lo recuerda por app).
  const navegacion = useMemo(() => ({ irAPagina, confirmar, reproducir, cambiarIdioma }), [irAPagina, confirmar, reproducir, cambiarIdioma]);

  return (
    <ContextoNavegacionApp.Provider value={navegacion}>
      <AppMultiPaginaInterno
        // 🔑 La llave incluye el idioma: cambiarlo REMONTA la app entera. Es a propósito y no es
        // un atajo — cada molde recibe su idioma en el mensaje de arranque y lo lee una sola vez,
        // así que sin remontar quedaría media pantalla en cada idioma.
        key={`${appId}::${idiomaApp || 'sin_idioma'}`}
        esquemaActual={esquemaEnIdioma}
        catalogo={catalogo}
        appId={appId}
        nombreApp={nombreApp}
        paginasPendientes={pendientesEnIdioma}
        manifestTablas={manifestTablas}
        paginaActivaId={paginaActivaId}
        setPaginaActivaId={setPaginaActivaId}
        idiomasApp={idiomasApp}
        idiomaApp={idiomaApp}
        onCambiarIdioma={cambiarIdioma}
        esDuenoDeLaApp={esDuenoDeLaApp}
      />
      {ventana && (
        <VentanaConfirmar
          pedido={ventana.pedido}
          idioma={idiomaApp}
          tema={esquemaActual?.tema}
          idPack={esquemaActual?.estilo_visual}
          onResponder={cerrarVentana}
        />
      )}
      {reproduccion && (
        <Reproductor
          estado={reproduccion}
          appId={appId}
          tema={esquemaActual?.tema}
          onCambiarModo={(modo) => setReproduccion(r => r && ({ ...r, modo }))}
          onSiguiente={() => setReproduccion(r => {
            if (!r || !r.cola || r.indice + 1 >= r.cola.length) return null;
            const siguiente = resolverFuente(r.cola[r.indice + 1]);
            if (!siguiente) return null;
            return { ...r, fuente: siguiente, indice: r.indice + 1, titulo: r.cola[r.indice + 1]?.titulo || null };
          })}
          onCerrar={() => setReproduccion(null)}
        />
      )}
    </ContextoNavegacionApp.Provider>
  );
};

// ▶️ [REPRODUCTOR 2026-08-26] El reproductor de la app. Uno solo, siempre igual — lo que cambia es
// lo que la IA dibuja alrededor (catálogo, filas, ficha), nunca los controles de play.
//
// Dos modos, y el segundo es la razón de que esto no pueda vivir en un molde:
//   · "pantalla": encima de todo, con el video grande. El play de Netflix.
//   · "mini": chiquito abajo a la derecha, y SOBREVIVE A QUE NAVEGUES. Eso es lo que hace posible
//     un YouTube o un Spotify, y un molde no puede hacerlo: su iframe muere al cambiar de página.
//
// Recuerda el minuto donde ibas, pero SOLO en video propio: un video incrustado de otro sitio corre
// dentro de su propio marco y no cuenta nada de lo que pasa ahí adentro. Se dice acá para que nadie
// se pregunte después por qué "seguir viendo" anda con unos videos y con otros no.
// 📡 ¿Este navegador entiende una transmisión HLS con una etiqueta <video> a secas? Safari y iOS
// sí; Chrome y Firefox no. Se PREGUNTA en vez de deducirlo del nombre del navegador, que es la
// forma que envejece mal.
const soportaHlsNativo = () => {
  try {
    const v = document.createElement('video');
    return !!v.canPlayType('application/vnd.apple.mpegurl');
  } catch (e) { return false; }
};

const Reproductor = ({ estado, appId, tema, onCambiarModo, onSiguiente, onCerrar }) => {
  const temaFinal = { ...TEMA_DEFAULT, ...(tema || {}) };
  const videoRef = useRef(null);
  const { fuente, titulo, subtitulo, modo, error } = estado;
  const claveMinuto = fuente ? `meiti_minuto_${appId || 'app'}_${fuente.url}` : null;

  // Retomar donde iba. Solo para video propio (ver arriba).
  useEffect(() => {
    if (!fuente?.recordable || !videoRef.current || !claveMinuto) return;
    try {
      const guardado = parseFloat(window.localStorage.getItem(claveMinuto) || '0');
      // Menos de 10 segundos no vale la pena retomar, y si estaba por terminar tampoco: nadie
      // quiere que "seguir viendo" lo devuelva a los créditos finales.
      if (guardado > 10) videoRef.current.currentTime = guardado;
    } catch (e) { /* sin storage se empieza de cero, que no es un error */ }
  }, [fuente?.url, claveMinuto]);

  const guardarMinuto = () => {
    if (!fuente?.recordable || !videoRef.current || !claveMinuto) return;
    try {
      const t = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      // Si ya lo terminó, se olvida: la próxima vez arranca de nuevo.
      if (total && t > total - 15) window.localStorage.removeItem(claveMinuto);
      else window.localStorage.setItem(claveMinuto, String(t));
    } catch (e) { /* idem */ }
  };

  useEffect(() => {
    const alTeclado = (e) => { if (e.key === 'Escape') { guardarMinuto(); onCerrar(); } };
    document.addEventListener('keydown', alTeclado);
    return () => { document.removeEventListener('keydown', alTeclado); };
  }, [onCerrar]);

  const cerrar = () => { guardarMinuto(); onCerrar(); };

  const contenido = error ? (
    <div className="w-full h-full flex items-center justify-center p-6 text-center text-sm" style={{ color: temaFinal.texto }}>
      {error}
    </div>
  ) : fuente.tipo === 'iframe' ? (
    <iframe
      src={fuente.src}
      title={titulo || 'Reproductor'}
      className="w-full h-full"
      style={{ border: 'none' }}
      allow={fuente.permisos}
      allowFullScreen
    ></iframe>
  ) : fuente.tipo === 'audio' ? (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
      <i className="fa-solid fa-music text-4xl" style={{ color: temaFinal.colorPrimario }}></i>
      <audio ref={videoRef} src={fuente.src} controls autoPlay onTimeUpdate={guardarMinuto} onEnded={onSiguiente} className="w-full max-w-md" />
    </div>
  ) : fuente.hls && !soportaHlsNativo() ? (
    // 📡 [2026-08-26] Un .m3u8 es una lista que apunta a pedacitos, no un archivo: solo Safari y
    // iPhone lo entienden con una etiqueta <video> común. En el resto hace falta hls.js (~150 KB).
    //
    // DECISIÓN DEL USUARIO, tomada acá: NO se suma hasta que alguien pida una app que la necesite.
    // El motivo es sano — meter 150 KB en TODAS las apps por un caso que todavía no existió es
    // pagar hoy por algo de mañana. Cuando aparezca esa app, se suma acá: carga dinámica (solo
    // cuando de verdad se reproduce un vivo), y el resto del sistema no se entera porque el
    // contrato de MEITI.reproducir no cambia.
    //
    // Mientras tanto se AVISA con claridad — un rectángulo negro sin explicación es exactamente el
    // fallo silencioso que se corrigió todo el día.
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ color: temaFinal.texto }}>
      <i className="fa-solid fa-tower-broadcast text-3xl" style={{ color: temaFinal.colorPrimario }}></i>
      <p className="text-sm font-semibold">Esta transmisión en vivo no se puede ver en este navegador.</p>
      <p className="text-xs" style={{ opacity: 0.7 }}>Prueba desde un iPhone o Safari, o pídele al dueño de la app una dirección de video común.</p>
    </div>
  ) : (
    <video
      ref={videoRef}
      src={fuente.src}
      controls
      autoPlay
      playsInline
      onTimeUpdate={guardarMinuto}
      onEnded={onSiguiente}
      className="w-full h-full"
      style={{ objectFit: 'contain', background: '#000' }}
    />
  );

  const barra = (
    <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ background: temaFinal.superficie, color: temaFinal.texto }}>
      <div className="min-w-0 flex-1">
        {titulo && <p className="text-sm font-semibold truncate">{titulo}</p>}
        {subtitulo && <p className="text-xs truncate" style={{ opacity: 0.6 }}>{subtitulo}</p>}
      </div>
      <button
        type="button"
        onClick={() => onCambiarModo(modo === 'mini' ? 'pantalla' : 'mini')}
        aria-label={modo === 'mini' ? 'Agrandar' : 'Achicar y seguir navegando'}
        title={modo === 'mini' ? 'Agrandar' : 'Achicar y seguir navegando'}
        className="p-2 rounded-lg shrink-0"
        style={{ color: temaFinal.texto, opacity: 0.75 }}
      >
        <i className={`fa-solid ${modo === 'mini' ? 'fa-up-right-and-down-left-from-center' : 'fa-down-left-and-up-right-to-center'} text-xs`}></i>
      </button>
      <button type="button" onClick={cerrar} aria-label="Cerrar" title="Cerrar" className="p-2 rounded-lg shrink-0" style={{ color: temaFinal.texto, opacity: 0.75 }}>
        <i className="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>
  );

  if (modo === 'mini') {
    return (
      <div
        className="fixed bottom-4 right-4 z-[95] rounded-xl overflow-hidden flex flex-col"
        style={{ width: 'min(22rem, calc(100vw - 2rem))', background: temaFinal.superficie, border: `1px solid ${temaFinal.colorPrimario}33`, boxShadow: '0 18px 40px -12px #00000099' }}
      >
        <div style={{ aspectRatio: '16 / 9', background: '#000' }}>{contenido}</div>
        {barra}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[95] flex flex-col" style={{ background: '#000000f2' }}>
      {barra}
      <div className="flex-1 min-h-0">{contenido}</div>
    </div>
  );
};

// 🪟 La ventana en sí. Usa el kit de la propia app, así que se ve como sus pantallas y no como
// MEITI. Detalles que un confirm() nativo daba gratis y hay que devolver a mano:
//   · Escape cancela y Enter confirma;
//   · el foco arranca en el botón seguro (Cancelar), nunca en el destructivo;
//   · tocar el fondo cancela, igual que salirse de un diálogo;
//   · role="alertdialog" con el mensaje asociado, para lectores de pantalla.
const VentanaConfirmar = ({ pedido, tema, idPack, onResponder, idioma = null }) => {
  const temaFinal = { ...TEMA_DEFAULT, ...(tema || {}) };
  const UI = construirKitUI(temaFinal, idPack);
  const ventanaRef = useRef(null);

  useEffect(() => {
    // El foco entra a la ventana, NO al botón destructivo: con el foco en "Confirmar", un Enter
    // reflejo borraría algo sin leer. El diálogo es foco-able solo por código (tabIndex -1).
    ventanaRef.current?.focus();
    const alTeclado = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onResponder(false); }
      if (e.key === 'Enter') { e.preventDefault(); onResponder(true); }
    };
    document.addEventListener('keydown', alTeclado);
    return () => document.removeEventListener('keydown', alTeclado);
  }, [onResponder]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: '#00000099', backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onResponder(false); }}
    >
      <div
        ref={ventanaRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-label={pedido.titulo || textoDelMarco(idioma, 'confirmar_accion')}
        className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-4 outline-none"
        style={{ background: temaFinal.superficie, color: temaFinal.texto, border: `1px solid ${temaFinal.colorPrimario}33`, boxShadow: '0 24px 48px -12px #00000080' }}
      >
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-semibold">{pedido.titulo || textoDelMarco(idioma, 'confirmar_accion')}</h3>
          <p className="text-sm" style={{ opacity: 0.75 }}>{pedido.mensaje}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <UI.Boton variante="fantasma" onClick={() => onResponder(false)}>
            {pedido.cancelar || textoDelMarco(idioma, 'cancelar')}
          </UI.Boton>
          <UI.Boton variante={pedido.tono === 'peligro' ? 'peligro' : 'primario'} onClick={() => onResponder(true)}>
            {pedido.confirmar || textoDelMarco(idioma, 'confirmar')}
          </UI.Boton>
        </div>
      </div>
    </div>
  );
};

// 🌗 [MODO CLARO/OSCURO 2026-08-26] Qué modo está viendo ESTA persona en ESTA app. Tres capas, en
// orden: lo que eligió antes (guardado por app, no global — alguien puede querer oscura su app de
// trabajo y clara la de la tienda), lo que dice su sistema operativo, y por último el modo con el
// que la app fue diseñada. Nada de esto toca el tema guardado: es preferencia de quien mira.
const useModoVisual = (appId, temaGuardado) => {
  const clave = 'meiti_modo_' + (appId || 'app');
  const modoPropio = modoDeTema(temaGuardado);
  const [modo, setModo] = useState(() => {
    try {
      const guardado = localStorage.getItem(clave);
      if (guardado === MODOS.CLARO || guardado === MODOS.OSCURO) return guardado;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return MODOS.OSCURO;
    } catch (e) { /* navegador sin storage: cae al modo de diseño */ }
    return modoPropio;
  });
  const alternar = () => {
    const siguiente = modo === MODOS.OSCURO ? MODOS.CLARO : MODOS.OSCURO;
    setModo(siguiente);
    try { localStorage.setItem(clave, siguiente); } catch (e) { /* la sesión igual cambia */ }
  };
  return [modo, alternar];
};

// 📄 [DESCRIPCIÓN DE PÁGINA TRUNCADA 2026-09-15, pedido explícito del usuario: "a veces se ve más
// de la mitad en teléfono de solo descripción"] La descripción de una página no tenía límite de
// líneas — en un teléfono angosto, una descripción larga podía envolver en 3-4 líneas y empujar el
// contenido real de la pantalla bien abajo, solo para mostrar texto de encabezado. Colapsada a una
// sola línea con "…" nativo del navegador (mismo criterio que el título de al lado, que ya usa
// "truncate"). Al tocarla, se expande hasta 2 líneas — nunca sin límite: el pedido explícito fue
// "que llegue a agregar otra línea debajo, solo una línea", no la descripción completa sin tope
// si es larga de verdad. El disparador es el propio texto truncado (sus caracteres reales con el
// "…" al final), nunca la palabra "Descripción" ni un ícono aparte — se toca el texto mismo.
const DescripcionPagina = ({ texto, color }) => {
  const [expandida, setExpandida] = useState(false);
  if (!texto) return null;
  return (
    <p
      onClick={() => setExpandida(v => !v)}
      className={expandida ? 'line-clamp-2 cursor-pointer' : 'truncate cursor-pointer'}
      style={{ color }}
      title={expandida ? undefined : texto}
    >
      {texto}
    </p>
  );
};

const AppMultiPaginaInterno = ({ esquemaActual, catalogo, appId, nombreApp, paginasPendientes = [], manifestTablas, paginaActivaId, setPaginaActivaId, idiomasApp = [], idiomaApp = null, onCambiarIdioma = () => {}, esDuenoDeLaApp = false }) => {
  const [asistenteContenidoAbierto, setAsistenteContenidoAbierto] = useState(false);
  // 🐛 [BUG REAL CONFIRMADO 2026-09-09, reportado por el usuario en vivo: "no veía la página...
  // la barra de estilo Móvil nada más muestra 5 páginas, las demás no se ven"] La barra flotante
  // del pack Móvil (más abajo, "paginas.slice(0, 5)") corta silenciosamente cualquier página más
  // allá de la quinta — sin ningún "más" ni forma de llegar ahí, esa página existe en el esquema
  // y en el catálogo pero queda inalcanzable para siempre por navegación normal. Confirmado real
  // (BenditOver, 7 páginas): "Gestión del Menú" era la 7ª, invisible en la barra. Este estado abre
  // la hoja inferior con el resto de las páginas — mismo patrón que ya pide estiloMovil.js para
  // "lo que se abre sube desde abajo".
  const [masPaginasAbierto, setMasPaginasAbierto] = useState(false);
  const paginas = usePaginasVisibles(esquemaActual, appId);
  // 🌗 [MODO CLARO/OSCURO 2026-08-26] El tema guardado es la paleta que eligió el DUEÑO; el modo lo
  // elige QUIEN USA la app. "resolverTema" devuelve el guardado tal cual para su propio modo y
  // deriva el contrario conservando el tono de marca (ver temaModos.js) — así una app que hoy es
  // clara se ve exactamente igual que ayer mientras nadie toque el interruptor.
  const temaGuardado = esquemaActual.tema || {};
  const [modoVisual, alternarModo] = useModoVisual(appId, temaGuardado);
  const tema = resolverTema(temaGuardado, modoVisual);
  const tipoNav = esquemaActual.navegacion?.tipo || 'tabs_inferior';
  // 🧭 [2026-08-04, pedido explícito del usuario: "menus adaptables desktop y phone que hicimos
  // antes en meiti"] Mismo sistema de sidebar+drawer que ya usa PublicNav.jsx/EnrutadorMaestro.jsx
  // — se puede colapsar a solo íconos con un click en desktop; en mobile es un drawer superpuesto
  // a pantalla completa (nunca resta ancho al contenido).
  // 🩹 [BUG REAL 2026-08-06, reportado por el usuario en AcademiaMind: "no dice el nombre de la
  // página arriba"] Arrancaba COLAPSADO por defecto (solo íconos, el título de la página queda
  // oculto con "md:hidden" mientras está colapsado) — un usuario nuevo nunca descubre solo que
  // hay un botón para expandirlo, así que ve una barra de íconos sin ningún texto y la interpreta
  // como "no hay barra". Se pasó a arrancar EXPANDIDO para que el estado inicial mostrara el
  // nombre de la página.
  // 🩹 [2026-08-16, pedido explícito del usuario: "los menús que ahora se cambiaron a sobrepuesto
  // ya no empujan la página, que arranquen contraído no desplegado, en core y apps"] Vuelve a
  // arrancar COLAPSADO, y esta vez SIN reintroducir el bug de arriba: en la misma tanda de
  // 2026-08-06 se le sacó el "md:hidden" a la barra superior de contenido, así que el nombre de
  // la página ahora se ve SIEMPRE ahí (ver "paginaActiva.titulo" más abajo, en la barra h-14),
  // en todos los tamaños de pantalla y sin depender del sidebar. Es decir: el motivo por el que
  // se había puesto expandido ya está cubierto por otra vía. Y desde que el sidebar es "fixed"
  // (no empuja, se superpone), arrancar desplegado tapaba contenido al entrar.
  const [menuColapsado, setMenuColapsado] = useState(true);
  const [menuMobileAbierto, setMenuMobileAbierto] = useState(false);

  const paginaActiva = paginas.find(p => p.id === paginaActivaId) || paginas[0];

  if (!paginaActiva) {
    return <div className="text-red-500 font-mono text-sm p-4">[ ERROR: La app declaró "paginas" pero está vacío ]</div>;
  }

  const colorFondo = tema.fondo || '#0B1120';
  const colorPrimario = tema.colorPrimario || '#06b6d4';
  const colorTexto = tema.texto || TEMA_DEFAULT.texto;
  // 🎨 [2026-08-06, bug real reportado: "la parte de los menus se ve blanco"] La barra
  // lateral usaba "colorFondo" (el mismo color que el contenido) para su propio fondo — con temas
  // claros (fondo blanco/casi blanco) el menú quedaba indistinguible del resto de la pantalla, sin
  // ningún límite visible más que un borde a muy baja opacidad. "superficie" existe justamente para
  // esto (bloques elevados/distintos del fondo, mismo campo que ya usa UI.Tarjeta) — el AppShell
  // nunca lo leía. Fallback a colorFondo si el tema no trae "superficie" (temas viejos).
  const colorSuperficie = tema.superficie || colorFondo;

  // 🎛️ [CHROME POR PACK 2026-08-27] Las barras de navegación son el marco de TODA la app, así que
  // hasta ahora un "escena" y un "denso" se veían iguales por más que sus tarjetas cambiaran.
  // El pack decide cuánto pesa esa línea, y el color sigue siendo el de la app (nunca del pack):
  //   · "marcados" (denso) sube el alfa: un panel de datos vive de sus líneas;
  //   · "sutiles" (meiti, cálido, móvil) deja el 33 de siempre — las apps actuales no cambian;
  //   · "ninguno" / chromeBorde 0 (bento, escena) lo apaga: ahí el cromo se corre para que mande
  //     el contenido, que es justo lo que pide el pack de portales.
  const formaChrome = formaDePack(esquemaActual?.estilo_visual);
  const colorSeparador = `${colorPrimario}${(formaChrome.chromeBorde === '0' || formaChrome.separadores === 'ninguno') ? '00' : formaChrome.separadores === 'marcados' ? '66' : '33'}`;
  // 🎛️ [CHROME POR PACK 2026-09-08, pedido del usuario: "el estilo real... cada uno que use su
  // barra real"] Hasta acá el chrome solo variaba el COLOR del borde — la FORMA (radio, sombra,
  // aire) que "formasPack.js" ya define por pack nunca llegaba al propio sidebar, así que Bento,
  // Cálido, Denso y Escena terminaban con el mismo rectángulo, apenas con el borde más o menos
  // marcado. Bento y Cálido declaran "separadorChrome: 'sombra'" (ver formasPack.js) — el sidebar
  // se separa por sombra en vez de (o además de) línea, igual que sus propias tarjetas. Meiti,
  // Denso y Escena no lo declaran: siguen separándose solo por línea (o sin nada en Escena, donde
  // el cromo se corre a propósito) — CERO cambio para ellos.
  // 🩹 [BUG PROPIO, cazado en vivo antes de comitear] Un primer intento comparaba contra el string
  // "sombraBloque !== 'none'" — pero Meiti TAMBIÉN define una sombra real ahí (muy sutil,
  // "0 1px 2px"), así que Meiti recibía la sombra nueva por error. Un campo explícito ("qué packs
  // quieren esto") en vez de inferir de otro campo (qué tan grande es su sombra de tarjeta) es lo
  // que evita este tipo de falso positivo.
  const sombraChromeLateral = formaChrome.separadorChrome === 'sombra'
    ? '6px 0 24px -8px rgba(0, 0, 0, 0.35)'
    : 'none';

  // 📱 [2026-08-04, pedido explícito del usuario] "estilo_layout" — 'app' (default de siempre,
  // sin cambios abajo) o 'web' — inyectado determinísticamente por server.js al forjar (NUNCA
  // confiado a que Gemini lo escriba solo, ver bug de PanelLuces documentado en core_logs).
  // La variante 'web' reusa el MISMO criterio ya aplicado en todo Core/PublicNav esta sesión:
  // la página completa crece y scrollea (nada de "h-full"/"overflow-y-auto min-h-0" acotado), y
  // la navegación entre páginas pasa de una barra inferior fija a pestañas tipo "card" arriba,
  // en vez de inventar un layout nuevo de cero.
  if (esquemaActual.estilo_layout === 'web') {
    return (
      <div
        className="meiti-scroll-tema w-full min-h-full flex flex-col"
        style={{ background: colorFondo, '--meiti-scroll-thumb': `${colorPrimario}80`, '--meiti-acento': colorPrimario }}
      >
        {(paginas.length > 1 || paginasPendientes.length > 0) && (
          <nav
            className="shrink-0 flex flex-wrap gap-2 px-4 border-b"
            style={{
              borderColor: colorSeparador,
              background: colorSuperficie,
              paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
              paddingBottom: '0.75rem'
            }}
          >
            {paginas.map((pagina, idx) => {
              const activa = pagina.id === paginaActiva.id;
              return (
                <button
                  key={pagina.id}
                  onClick={() => setPaginaActivaId(pagina.id)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors"
                  style={activa
                    ? { background: `${colorPrimario}1a`, color: colorPrimario, borderColor: `${colorPrimario}55` }
                    : { background: 'transparent', color: `${colorTexto}99`, borderColor: `${colorPrimario}22` }}
                >
                  <i className={`${claseIcono(pagina.icono || ICONOS_NAV_DEFAULT[idx % ICONOS_NAV_DEFAULT.length])} text-xs`}></i>
                  {pagina.titulo || pagina.id}
                </button>
              );
            })}
            {paginasPendientes.map((pendiente) => (
              <button
                key={pendiente.pagina_id}
                type="button"
                disabled
                title={textoDelMarco(idiomaApp, 'no_disponible')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium cursor-not-allowed opacity-50"
                style={{ background: 'transparent', color: `${colorTexto}80`, borderColor: `${colorPrimario}15` }}
              >
                <i className="fa-solid fa-lock text-xs"></i>
                {pendiente.titulo}
              </button>
            ))}
          </nav>
        )}

        <EnvoltorioMatriz
          esquemaActual={{ componentes: paginaActiva.componentes || [] }}
          catalogo={catalogo}
          appId={appId}
          tema={tema}
          idPack={esquemaActual?.estilo_visual}
          manifestTablas={manifestTablas}
        />
      </div>
    );
  }

  // 📱 [PACK MÓVIL 2026-09-08, BUG REAL CONFIRMADO, reportado por el usuario viendo apps reales:
  // "todas las apps están iguales no cambian... siempre menú al costado izquierdo y mismo estilo
  // tarjetas... solo cambian botones formas y colores"] El pack "Móvil" (ver estiloMovil.js) le
  // pide a la IA una barra de navegación FLOTANTE ABAJO — pero el sidebar+drawer de más abajo se
  // renderizaba SIN CONDICIÓN para toda app "estilo_layout=app", ignorando por completo qué pack
  // se había elegido. La prueba: "tipoNav" se calculaba unas líneas arriba y nunca se volvía a usar
  // en todo el archivo. Mismo patrón ya usado arriba para "estilo_layout === 'web'": un shell
  // alternativo, elegido ANTES de llegar al sidebar por defecto — nunca se toca el sidebar
  // existente, que sigue sirviendo a los otros 5 packs exactamente igual que siempre.
  // Header calcado del que ya usa el shell de sidebar (mismo bloque, sin el botón de abrir drawer
  // — acá no hay drawer que abrir) para que "Móvil" tenga la MISMA paridad de funciones (Asistente
  // de Contenido, modo claro/oscuro, selector de idioma) y no una versión pobre del shell normal.
  if (esquemaActual.estilo_visual === 'movil') {
    return (
      <div
        className="meiti-scroll-tema w-full min-h-full flex flex-col relative"
        style={{ background: colorFondo, '--meiti-scroll-thumb': `${colorPrimario}80`, '--meiti-acento': colorPrimario }}
      >
        {/* Mismo "pl-16 md:pl-5" que el shell de sidebar: "Mis apps" (VisorApp.jsx) es un botón FIJO
            que no sabe qué shell está activo, y comparte este mismo rincón en cualquiera de los dos. */}
        <div className="pl-16 pr-5 md:pl-5 pt-5 flex items-start gap-3 shrink-0">
          <div className="meiti-header-pagina min-w-0 flex-1">
            <h1 style={{ color: colorTexto }}>
              <i className={claseIcono(paginaActiva.icono || ICONOS_NAV_DEFAULT[0])} style={{ color: colorPrimario }}></i>
              <span className="truncate">{paginaActiva.titulo || paginaActiva.id}</span>
            </h1>
            <DescripcionPagina texto={paginaActiva.descripcion} color={`${colorTexto}99`} />
          </div>
          {esDuenoDeLaApp && esquemaActual.ia_contenido_habilitada && (
            <button
              onClick={() => setAsistenteContenidoAbierto(true)}
              className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors"
              style={{ borderColor: `${colorPrimario}33`, color: colorPrimario }}
              title={t('ac_title')}
              aria-label={t('ac_title')}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
            </button>
          )}
          <button
            onClick={alternarModo}
            className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors"
            style={{ borderColor: `${colorPrimario}33`, color: colorTexto }}
            title={textoDelMarco(idiomaApp, modoVisual === MODOS.OSCURO ? 'modo_claro' : 'modo_oscuro')}
            aria-label={textoDelMarco(idiomaApp, modoVisual === MODOS.OSCURO ? 'modo_claro' : 'modo_oscuro')}
          >
            <i className={modoVisual === MODOS.OSCURO ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}></i>
          </button>
          <BotonSesionApp appId={appId} tema={tema} idPack={esquemaActual?.estilo_visual} colorPrimario={colorPrimario} colorTexto={colorTexto} esDuenoDeLaApp={esDuenoDeLaApp} modoKiosco={!!esquemaActual?.modo_kiosco} />
          {idiomasApp.length > 1 && (
            <SelectorIdiomaApp appId={appId} idiomas={idiomasApp} actual={idiomaApp} onCambiar={onCambiarIdioma} colorTexto={colorTexto} colapsado={true} />
          )}
        </div>

        {/* "pb-28" reserva el alto de la barra flotante de abajo (ver estiloMovil.js, regla 1:
            "reserva su alto abajo... para que la barra nunca tape la última fila") — mismo criterio
            que el "p-5" del shell de sidebar, adaptado al espacio que se come la barra inferior. */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 pb-28">
          <EnvoltorioMatriz
            esquemaActual={{ componentes: paginaActiva.componentes || [] }}
            catalogo={catalogo}
            appId={appId}
            tema={tema}
            idPack={esquemaActual?.estilo_visual}
            manifestTablas={manifestTablas}
            esDuenoDeLaApp={esDuenoDeLaApp}
          />
        </div>

        {paginas.length > 1 && (
          <nav
            className="fixed bottom-4 inset-x-4 mx-auto rounded-2xl p-2 flex items-stretch justify-around gap-1 z-30"
            style={{ background: colorSuperficie, border: `1px solid ${colorPrimario}22`, maxWidth: '28rem' }}
          >
            {/* Con más de 5 páginas, la 5ª ranura pasa a ser "Más" (abre la hoja de abajo con el
                resto) — nunca se corta la 5ª página real en silencio. */}
            {(paginas.length > 5 ? paginas.slice(0, 4) : paginas).map((pagina, idx) => {
              const activa = pagina.id === paginaActiva.id;
              return (
                <button
                  key={pagina.id}
                  onClick={() => setPaginaActivaId(pagina.id)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors min-w-0"
                  style={activa ? { background: `${colorPrimario}26`, color: colorPrimario } : { color: `${colorTexto}99` }}
                >
                  <i className={`${claseIcono(pagina.icono || ICONOS_NAV_DEFAULT[idx % ICONOS_NAV_DEFAULT.length])} text-base`}></i>
                  <span className="text-[10px] font-medium truncate max-w-full px-1">{pagina.titulo || pagina.id}</span>
                </button>
              );
            })}
            {paginas.length > 5 && (
              <button
                onClick={() => setMasPaginasAbierto(true)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors min-w-0"
                style={paginas.slice(4).some(p => p.id === paginaActiva.id) ? { background: `${colorPrimario}26`, color: colorPrimario } : { color: `${colorTexto}99` }}
              >
                <i className="fa-solid fa-ellipsis text-base"></i>
                <span className="text-[10px] font-medium truncate max-w-full px-1">{textoDelMarco(idiomaApp, 'mas')}</span>
              </button>
            )}
          </nav>
        )}
        {/* 🩹 [BUG REAL 2026-09-09] Hoja inferior con las páginas que no entran en la barra —
            mismo patrón que ya pide estiloMovil.js para todo lo que se abre ("sube desde abajo",
            "rounded-t-3xl", manija centrada, se cierra tocando afuera). */}
        {masPaginasAbierto && (
          <div className="fixed inset-0 z-40 flex items-end" onClick={() => setMasPaginasAbierto(false)}>
            <div className="absolute inset-0" style={{ background: 'rgba(0, 0, 0, 0.4)' }}></div>
            <div
              className="relative w-full rounded-t-3xl p-5 pb-8 max-h-[70vh] overflow-y-auto"
              style={{ background: colorSuperficie }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: `${colorTexto}33` }}></div>
              <div className="flex flex-col gap-1">
                {paginas.slice(4).map((pagina, idx) => {
                  const activa = pagina.id === paginaActiva.id;
                  return (
                    <button
                      key={pagina.id}
                      onClick={() => { setPaginaActivaId(pagina.id); setMasPaginasAbierto(false); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left"
                      style={activa ? { background: `${colorPrimario}1a`, color: colorPrimario } : { color: colorTexto }}
                    >
                      <i className={`${claseIcono(pagina.icono || ICONOS_NAV_DEFAULT[(idx + 4) % ICONOS_NAV_DEFAULT.length])} text-lg w-6 text-center`}></i>
                      <span className="font-medium">{pagina.titulo || pagina.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {asistenteContenidoAbierto && (
          <AsistenteContenidoWidget appId={appId} tema={tema} onCerrar={() => setAsistenteContenidoAbierto(false)} />
        )}
      </div>
    );
  }

  // 🏭 [2026-08-04, bug real reportado: "la de industria paneles cogio el estilo de meiti
  // tambien"] El nuevo sidebar/drawer de abajo es SOLO para apps normales — industrial nunca lo
  // pidió y tiene que seguir viéndose distinta (tablero HMI, sin chrome de menú tipo MEITI).
  // "es_industrial" viene inyectado determinísticamente por server.js (mismo criterio que
  // "estilo_layout" — nunca detectado implícitamente acá). Se preserva tal cual la barra inferior
  // fija + header simple que ya tenía este branch antes del sidebar.
  if (esquemaActual.es_industrial) {
    return (
      <div
        className="meiti-scroll-tema w-full h-full flex flex-col min-h-0"
        style={{ background: colorFondo, '--meiti-scroll-thumb': `${colorPrimario}80`, '--meiti-acento': colorPrimario }}
      >
        {paginas.length > 1 && (
          <header
            className="shrink-0 flex items-center px-4 border-b"
            style={{
              borderColor: colorSeparador,
              background: colorSuperficie,
              paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
              paddingBottom: '0.75rem'
            }}
          >
            <span className="text-sm font-semibold tracking-wide" style={{ color: colorTexto }}>
              {paginaActiva.titulo || paginaActiva.id}
            </span>
          </header>
        )}

        {/* 🩹 [BUG REAL CONFIRMADO 2026-09-09, reportado por el usuario en vivo: "no tiene aire
            arriba... y lo mismo en los lados y abajo, todo queda pegado"] Mismo bug ya encontrado y
            arreglado en el shell de sidebar (ver el comentario de "p-5" más abajo en este archivo) —
            nunca se propagó acá: el shell industrial es un branch aparte (ver el comentario de
            "es_industrial" arriba) que quedó con el mismo "sin padding" que el sidebar tenía antes
            de su propio fix. "p-5" mismo criterio: respiro chico y parejo en los cuatro bordes. */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5">
          <EnvoltorioMatriz
            esquemaActual={{ componentes: paginaActiva.componentes || [] }}
            catalogo={catalogo}
            appId={appId}
            tema={tema}
            idPack={esquemaActual?.estilo_visual}
            manifestTablas={manifestTablas}
          />
        </div>

        {paginas.length > 1 && tipoNav !== 'ninguna' && (
          <nav
            className="shrink-0 flex justify-around items-center border-t px-1"
            style={{
              borderColor: colorSeparador,
              background: colorSuperficie,
              paddingTop: '0.5rem',
              paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))'
            }}
          >
            {paginas.map((pagina, idx) => {
              const activa = pagina.id === paginaActiva.id;
              return (
                <button
                  key={pagina.id}
                  onClick={() => setPaginaActivaId(pagina.id)}
                  className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
                  style={{ color: activa ? colorPrimario : `${colorPrimario}80` }}
                >
                  <i className={`${claseIcono(pagina.icono || ICONOS_NAV_DEFAULT[idx % ICONOS_NAV_DEFAULT.length])} text-lg`}></i>
                  <span className="text-[9px] font-mono uppercase tracking-wider">{pagina.titulo || pagina.id}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    );
  }

  const hayNav = (paginas.length > 1 || paginasPendientes.length > 0) && tipoNav !== 'ninguna';

  return (
    <div
      className="meiti-scroll-tema w-full h-full flex overflow-hidden relative"
      style={{ background: colorFondo, '--meiti-scroll-thumb': `${colorPrimario}80`, '--meiti-acento': colorPrimario }}
    >
      {/* 📱 Fondo oscuro detrás del drawer — solo mobile, tocarlo lo cierra. */}
      {/* 🩹 [BUG REAL 2026-08-16] "absolute", no "fixed" — mismo motivo que el sidebar de abajo:
          embebida en Cuarentena/Radar, un backdrop "fixed" oscurecería TODA la pantalla de Core
          en vez de solo la caja de la app. */}
      {hayNav && menuMobileAbierto && (
        <div
          onClick={() => setMenuMobileAbierto(false)}
          className="absolute inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* 🧭 [2026-08-04] BARRA LATERAL (nativa, la IA nunca la escribe) — reemplaza a la vieja
          barra inferior fija: mismo sistema de sidebar+drawer que PublicNav.jsx/Core, coloreado
          con "tema" en vez de las clases violeta fijas de esos dos (acá el color es adaptable,
          elegido por el usuario en el wizard). Fixed/superpuesta y oculta bajo "md" (drawer), en
          flujo normal desde "md" (empuja al contenido, con su propio toggle colapsado/expandido). */}
      {/* 📏 [SIDEBAR SUPERPUESTO EN DESKTOP 2026-08-15, pedido explícito del usuario: "las apps
          tienen el mismo detalle se mueven con el menu"] Mismo fix que PublicNav.jsx/Core — antes
          "fixed md:static" hacía que en desktop el sidebar pasara a "static" (miembro normal del
          flex row), empujando el contenido de al lado al expandir de w-20 a w-64. Ahora "fixed"
          siempre — el contenido (más abajo) compensa con "md:ml-20" fijo (el ancho SIEMPRE
          colapsado) en vez de depender del ancho dinámico real del sidebar. */}
      {/* 🩹 [BUG REAL CONFIRMADO 2026-08-16, reportado por el usuario: "sea en vista de teléfono
          o en vista pc no sale ni el ícono ni el menú"] Ahora es "absolute", no "fixed". El cambio
          del 2026-08-15 (que sacó "md:static" para que el menú se superpusiera en vez de empujar)
          lo dejó en "fixed" SIEMPRE — y "fixed" ancla al VIEWPORT, no al contenedor. Eso funciona
          cuando la app ocupa la pantalla entera (Mis Apps), pero la MISMA app se renderiza
          EMBEBIDA dentro de una card acotada en Cámara de Cuarentena ("max-w-4xl min-h-[600px]
          overflow-hidden") y en el Radar: ahí el sidebar se escapaba de la card hacia el borde
          izquierdo de la pantalla, quedando detrás del sidebar de Core y recortado por el
          overflow-hidden de la card. Resultado: app sin menú ni botón, en las dos resoluciones.
          "absolute" + "relative" en la raíz (ver arriba) mantiene la superposición que se buscaba,
          pero anclada a la caja REAL de la app — pantalla completa o preview embebido.
          ⚠️ Regla general: en un componente que puede renderizarse embebido, "fixed" es casi
          siempre un bug esperando — se ancla a algo que el componente no controla. */}
      {hayNav && (
        <div className={`
          absolute inset-y-0 left-0 z-50
          ${menuMobileAbierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
          transition-transform md:transition-all duration-300 ease-in-out
          w-64 ${menuColapsado ? 'md:w-20' : 'md:w-64'}
          flex-shrink-0 flex flex-col border-r
        `} style={{ background: colorSuperficie, borderColor: colorSeparador, boxShadow: sombraChromeLateral }}>
          {/* 🩹 [BUG REAL 2026-08-06, reportado por el usuario: "la página sale doble el
              nombre... en la barra de las 3 rayitas dice el nombre de la página y en la barra
              [de contenido] también"] Este header caía a "paginaActiva.titulo" porque
              "esquemaActual.titulo" (un título a nivel de APP, no de página) nunca existe en la
              práctica — Gemini solo genera "paginas[].titulo" (título por página), nunca un
              título de app en la raíz del esquema. El resultado: este header SIEMPRE mostraba el
              mismo texto que la barra de contenido de abajo (línea ~484), que es la que ya
              cumple ese rol desde el fix de hoy. Fix confirmado con el usuario: colapsado = solo
              el ícono, expandido = nombre CORTO de la app (no de la página) — "nombreApp" viaja
              como prop nueva desde el llamador de "extraerUI" (el único con el título amigable
              real del nodo, ver MisApps.jsx/RadarTelemetria.jsx/CamaraCuarentena.jsx/
              ComponenteAisladorCuarentena.jsx), nunca se deriva de la página activa. */}
          {/* 🩹 [BUG REAL 2026-08-06, reportado por el usuario: "el ícono de menú de las 3
              rayitas no está en la misma línea vertical con los de la barra colapsada"] Con
              "justify-between" y un solo hijo visible (el botón, una vez que el span del nombre
              se esconde con "md:hidden" al colapsar), el botón queda pegado a la izquierda
              (padding px-3) en vez de centrado — los íconos de "paginas" de abajo SÍ quedan
              centrados en ese estado ("md:justify-center" en la lista, línea ~432). "md:justify-
              center" acá (mismo patrón condicional que ya usa "menuColapsado" en otros lados de
              este bloque) alinea el ícono del toggle con los de abajo — en mobile/expandido sigue
              siendo "justify-between" (nombre a la izquierda, botón a la derecha). */}
          <div className={`h-14 flex items-center justify-between px-3 border-b shrink-0 ${menuColapsado ? 'md:justify-center' : ''}`} style={{ borderColor: colorSeparador }}>
            {(nombreApp || esquemaActual.titulo) && (
              <span className={`text-sm font-semibold truncate ${menuColapsado ? 'md:hidden' : ''}`} style={{ color: colorTexto }}>
                {nombreApp || esquemaActual.titulo}
              </span>
            )}
            <button
              onClick={() => setMenuColapsado(!menuColapsado)}
              className="hidden md:inline-flex p-1.5 rounded-lg transition-colors shrink-0"
              style={{ color: `${colorTexto}80` }}
              title={textoDelMarco(idiomaApp, menuColapsado ? 'expandir_menu' : 'colapsar_menu')}
            >
              <i className={`fa-solid ${menuColapsado ? 'fa-bars' : 'fa-chevron-left'}`}></i>
            </button>
            <button
              onClick={() => setMenuMobileAbierto(false)}
              className="md:hidden p-1.5 rounded-lg transition-colors shrink-0"
              style={{ color: `${colorTexto}80` }}
              title={textoDelMarco(idiomaApp, 'cerrar_menu')}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-3">
            <ul>
              {paginas.map((pagina, idx) => {
                const activa = pagina.id === paginaActiva.id;
                return (
                  <li key={pagina.id} className="mb-1 px-2">
                    <button
                      onClick={() => { setPaginaActivaId(pagina.id); setMenuMobileAbierto(false); }}
                      title={menuColapsado ? (pagina.titulo || pagina.id) : ''}
                      className={`w-full flex items-center gap-2 ${menuColapsado ? 'md:justify-center' : 'justify-start'} px-3.5 py-2.5 rounded-lg border text-sm transition-colors`}
                      style={activa
                        ? { background: `${colorPrimario}1a`, color: colorPrimario, borderColor: `${colorPrimario}55`, fontWeight: 500 }
                        : { background: 'transparent', color: `${colorTexto}99`, borderColor: `${colorPrimario}1a` }}
                    >
                      <i className={`${claseIcono(pagina.icono || ICONOS_NAV_DEFAULT[idx % ICONOS_NAV_DEFAULT.length])}`}></i>
                      <span className={`whitespace-nowrap ${menuColapsado ? 'md:hidden' : ''}`}>{pagina.titulo || pagina.id}</span>
                    </button>
                  </li>
                );
              })}
              {paginasPendientes.map((pendiente) => (
                <li key={pendiente.pagina_id} className="mb-1 px-2">
                  <div
                    title={pendiente.titulo + ' · ' + textoDelMarco(idiomaApp, 'no_disponible')}
                    className={`w-full flex items-center gap-2 ${menuColapsado ? 'md:justify-center' : 'justify-start'} px-3.5 py-2.5 rounded-lg border text-sm cursor-not-allowed opacity-50`}
                    style={{ background: 'transparent', color: `${colorTexto}80`, borderColor: `${colorPrimario}15` }}
                  >
                    <i className="fa-solid fa-lock"></i>
                    <span className={`whitespace-nowrap ${menuColapsado ? 'md:hidden' : ''}`}>{pendiente.titulo}</span>
                  </div>
                </li>
              ))}
            </ul>
          </nav>
          {/* 🌐 Al pie del menú, que es donde se busca un cambio de idioma en cualquier producto.
              No se dibuja si la app habla un solo idioma. */}
          <SelectorIdiomaApp
            appId={appId}
            idiomas={idiomasApp}
            actual={idiomaApp}
            onCambiar={onCambiarIdioma}
            colorTexto={colorTexto}
            colapsado={menuColapsado}
          />
        </div>
      )}

      {/* 🏎️ CONTENIDO — la página completa scrollea acá adentro (mismo criterio ya aplicado en
          todo Core/PublicNav: ningún contenedor arma su propio scroll acotado por fuera de este).
          "md:ml-20" solo si hay sidebar (hayNav) — compensa el ancho SIEMPRE colapsado del
          sidebar, que se superpone al contenido (ver comentario ahí).
          🩹 [BUG REAL 2026-08-16, reportado por el usuario: "faltaban los dos marcos exteriores
          del shell, parecía una L invertida"] Un rato antes esto se había puesto en "md:mx-20"
          (margen a AMBOS lados) copiando el fix de centrado de PublicNav.jsx/EnrutadorMaestro.jsx.
          Ahí ese fix es correcto — son páginas con contenido centrado (max-w + mx-auto) y sin el
          margen derecho quedaban corridas. Pero una APP no es eso: su shell tiene que OCUPAR todo
          el ancho disponible, y el sidebar vive solo a la izquierda. El margen derecho dejaba una
          franja muerta de 80px contra el borde, cortando la barra superior y el marco del shell.
          Vuelve a "ml-20": margen SOLO del lado donde hay sidebar.
          ⚠️ Lección: no propagar un fix de layout entre superficies sin mirar qué hace cada una.
          "Contenido centrado en una página" y "shell de app a pantalla completa" tienen
          necesidades opuestas, aunque el síntoma original se parezca. */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${hayNav ? 'md:ml-20' : ''}`}>
        {/* 🌐 [2026-08-29, advertido por el usuario: "los LegoPanel no tienen menú lateral, es un
            panel"] El selector vive al pie del menú cuando hay menú. Una app de UNA sola pantalla
            —un panel armado con LegoPanel, o cualquier app de una página— no tiene menú, así que
            ahí quedaría sin forma de cambiar de idioma: los idiomas comprados existirían y nadie
            podría elegirlos. Misma pieza, otra ubicación — nunca una segunda copia. */}
        {!hayNav && (
          <div className="flex justify-end shrink-0">
            <SelectorIdiomaApp
              appId={appId}
              idiomas={idiomasApp}
              actual={idiomaApp}
              onCambiar={onCambiarIdioma}
              colorTexto={colorTexto}
              colapsado={false}
            />
          </div>
        )}
          {/* 🎨 [2026-08-18, pedido del usuario: "todo MEITI es solo el menú lateral y las páginas
              salen arriba a la izquierda al lado del menú, el nombre de la página y el ícono con la
              descripción debajo; y las apps sale un top sin nada, solo el nombre de la página sin
              estilo ninguno"]

              Acá había una barra "h-14" con borde inferior, sombra y fondo de superficie, que
              mostraba el nombre de la página suelto en 14px. No era un error de alineación: era
              chrome que MEITI no usa en ninguna otra pantalla. El resto del producto —Mis apps,
              Créditos, Marketplace, Cuarentena, Gestor de Catálogos— no tiene ninguna franja
              superior: el título vive DENTRO del contenido, arriba a la izquierda, como ícono +
              nombre + descripción debajo. Una app generada se veía de otro producto.

              Ahora usa el MISMO patrón, con la clase compartida ".meiti-header-pagina"
              (estiloMeiti.css) en vez de repetir clases Tailwind — misma regla que sigue el resto
              del sitio, así un cambio de tamaño futuro los alcanza a todos de una.

              ⚠️ El COLOR sí va inline y no por la clase: ".meiti-header-pagina h1" fija slate-900,
              que es correcto para el panel (siempre claro) pero dejaría el título invisible en una
              app de tema oscuro. El tema de cada app manda.

              El botón de menú de mobile se mantiene acá adentro, alineado a la derecha: al sacar la
              barra se quedaba sin lugar, y en teléfono es la ÚNICA forma de abrir el drawer. */}
        {/* 🩹 [BUG REAL 2026-09-04, reportado por el usuario en vivo: "lo pisa el regresar a mis
            apps... y también al de modo oscuro" / "si te fijas tapa el nombre de la página"]
            "Mis apps" (VisorApp.jsx) es un botón FIJO que compartía rincón con este chrome nativo
            de los DOS lados: en PC con estos íconos (modo oscuro, Asistente de Contenido), en
            teléfono con el título de acá abajo (ícono + nombre de página). Bug VIEJO, anterior a
            hoy: ya tapaba el modo oscuro y el título, el ícono nuevo solo lo hizo evidente.
            Primer intento (reservar espacio acá con "pr-36") quedaba mal: cuando la app SALE de
            MEITI (export), "Mis apps" ya no existe — y este chrome quedaría corrido para siempre,
            con un hueco vacío que ya no protege nada. Fix real, pedido del usuario: este chrome se
            queda en SU lugar real de siempre (nunca se mueve, exportada o no) — es "Mis apps" el
            que se acomoda alrededor de él (VisorApp.jsx) cuando existe.
            En PC "Mis apps" sigue siendo texto, corrido a la derecha de estos íconos (right-32) —
            no hace falta tocar nada acá. En TELÉFONO pasa a ser un círculo de ícono solo (w-9,
            mismo ancho que estos íconos) sobre el título — como el título es de ancho VARIABLE
            (nunca se sabe cuánto mide "nombre de página" de antemano), en vez de perseguirlo se
            reserva ESE ancho fijo con "pl-16" (64px: 36px del círculo + margen), solo en teléfono
            (md:pl-5 lo vuelve a los 20px normales en PC, donde no hace falta). */}
        {hayNav && (
          <div className="pl-16 pr-5 md:pl-5 pt-5 flex items-start gap-3 shrink-0">
            <div className="meiti-header-pagina min-w-0 flex-1">
              <h1 style={{ color: colorTexto }}>
                <i className={claseIcono(paginaActiva.icono || ICONOS_NAV_DEFAULT[0])} style={{ color: colorPrimario }}></i>
                <span className="truncate">{paginaActiva.titulo || paginaActiva.id}</span>
              </h1>
              <DescripcionPagina texto={paginaActiva.descripcion} color={`${colorTexto}99`} />
            </div>
            {/* 🤝 [ASISTENTE DE CONTENIDO 2026-09-04] Mismo criterio que el modo oscuro (de abajo):
                nativo, en la esquina del chrome, nunca escrito por la IA. Gateado DOBLE —
                "esDuenoDeLaApp" (nunca lo ve un visitante/cliente de esta app) Y el switch que el
                dueño prendió en Configuración (si nunca lo activó, ni el ícono aparece). Va ANTES
                del modo oscuro (pedido del usuario, probando en vivo: "está al revés,
                intercámbialos") — no había una razón funcional para el orden anterior. */}
            {esDuenoDeLaApp && esquemaActual.ia_contenido_habilitada && (
              <button
                onClick={() => setAsistenteContenidoAbierto(true)}
                className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors"
                style={{ borderColor: `${colorPrimario}33`, color: colorPrimario }}
                title={t('ac_title')}
                aria-label={t('ac_title')}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              </button>
            )}
            {/* 🌗 [MODO CLARO/OSCURO 2026-08-26] Vive acá, al lado del menú: es la esquina del
                chrome nativo, así que ninguna app generada tiene que acordarse de ponerlo — lo
                heredan las 19 que ya están online y todas las que vengan. */}
            <button
              onClick={alternarModo}
              className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors"
              style={{ borderColor: `${colorPrimario}33`, color: colorTexto }}
              title={textoDelMarco(idiomaApp, modoVisual === MODOS.OSCURO ? 'modo_claro' : 'modo_oscuro')}
              aria-label={textoDelMarco(idiomaApp, modoVisual === MODOS.OSCURO ? 'modo_claro' : 'modo_oscuro')}
            >
              <i className={modoVisual === MODOS.OSCURO ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}></i>
            </button>
            <BotonSesionApp appId={appId} tema={tema} idPack={esquemaActual?.estilo_visual} colorPrimario={colorPrimario} colorTexto={colorTexto} esDuenoDeLaApp={esDuenoDeLaApp} modoKiosco={!!esquemaActual?.modo_kiosco} />
            <button
              onClick={() => setMenuMobileAbierto(true)}
              className="md:hidden w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
              style={{ borderColor: `${colorPrimario}33`, color: colorTexto }}
              title="Abrir menú"
            >
              <i className="fa-solid fa-bars"></i>
            </button>
          </div>
        )}

        {/* 🩹 [BUG REAL 2026-08-06, reportado tras el fix de la barra superior: "no tiene
            espacio entre la página y la barra de arriba"] El contenedor de contenido no tenía
            ningún padding — el grid de tarjetas (EnvoltorioMatriz) arrancaba pegado justo debajo
            del border-b de la barra, sin aire en ningún borde. "p-5" le da un respiro chico y
            parejo en todos los tamaños (el usuario pidió explícitamente poco espacio, no el
            "md:p-6" más generoso que se probó primero). */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5">
          <EnvoltorioMatriz
            esquemaActual={{ componentes: paginaActiva.componentes || [] }}
            catalogo={catalogo}
            appId={appId}
            tema={tema}
            idPack={esquemaActual?.estilo_visual}
            manifestTablas={manifestTablas}
            esDuenoDeLaApp={esDuenoDeLaApp}
          />
        </div>
      </div>
      {asistenteContenidoAbierto && (
        <AsistenteContenidoWidget appId={appId} tema={tema} onCerrar={() => setAsistenteContenidoAbierto(false)} />
      )}
    </div>
  );
};

// --- 7.5 GATE DE LOGIN PROPIO DE LA APP (nativo, la IA nunca lo escribe — activado por
// "ui_schema.requiere_login: true", ver oraculo.js). Tercer molde del trío de seguridad
// junto a roles/permisos y conexiones seguras: mismo mecanismo OTP que el login de Mis
// Apps/Core, pero con sesión propia por app (ver /api/auth-app/* en server.js) — el login
// de una empresa nunca se mezcla con el de otra ni con el de Core. ---
const GateAppPropia = ({ appId, tema, idPack, children }) => {
  const [estado, setEstado] = useState('verificando'); // verificando | autorizado | sin_sesion
  const temaFinal = { ...TEMA_DEFAULT, ...(tema || {}) };
  const claveToken = `meiti_sesion_app_token_${appId}`;
  const claveEmail = `meiti_sesion_app_email_${appId}`;

  useEffect(() => {
    const token = window.localStorage.getItem(claveToken);
    if (!token) { setEstado('sin_sesion'); return; }
    fetch(`${API_BASE_URL}/api/auth-app/sesion?ecosistema=${appId}`, { headers: { 'x-session-token': token }, credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => { window.localStorage.setItem(claveEmail, data.email); setEstado('autorizado'); })
      .catch(() => {
        window.localStorage.removeItem(claveToken);
        window.localStorage.removeItem(claveEmail);
        setEstado('sin_sesion');
      });
  }, [appId]);

  if (estado === 'verificando') {
    return <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: temaFinal.fondo, color: temaFinal.texto }}>Verificando acceso...</div>;
  }
  if (estado === 'autorizado') return children;
  return <PantallaLoginApp appId={appId} tema={temaFinal} idPack={idPack} onLogueado={() => setEstado('autorizado')} />;
};

function PantallaLoginApp({ appId, tema, idPack, onLogueado }) {
  const [paso, setPaso] = useState('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  // 🔐 [ACCESO DE ADMIN DEL EXPORT 2026-10-06] Una app exportada con personal trae un código de
  // administrador (lo ve el dueño en Mis apps de MEITI): sirve para entrar la primera vez, antes de
  // configurar Resend, y para recuperar el acceso. Solo el servidor exportado responde este estado;
  // en MEITI no existe y la opción no aparece.
  const [hayCodigoAdmin, setHayCodigoAdmin] = useState(false);
  const [codigoAdmin, setCodigoAdmin] = useState('');
  // Dónde está el código: en Mis apps de MEITI, o en la consola del primer arranque si la app se
  // bajó como plantilla pública (ver prepararAccesoLocal en accesosExport.js).
  const [origenCodigo, setOrigenCodigo] = useState('meiti');
  useEffect(() => {
    let vivo = true;
    fetch(`${API_BASE_URL}/api/auth-app/estado`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (vivo && d && d.codigo_admin) { setHayCodigoAdmin(true); setOrigenCodigo(d.origen_codigo || 'meiti'); } })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const entrarConCodigoAdmin = async (e) => {
    e.preventDefault();
    setError(''); setEnviando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth-app/codigo-admin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ codigo: codigoAdmin.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código de administrador incorrecto.');
      window.localStorage.setItem(`meiti_sesion_app_token_${appId}`, data.token);
      window.localStorage.setItem(`meiti_sesion_app_email_${appId}`, data.email);
      onLogueado();
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  };

  const pedirCodigo = async (e) => {
    e.preventDefault();
    setError(''); setAviso(''); setEnviando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth-app/solicitar-codigo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), ecosistema: appId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo mandar el código.');
      if (data.aviso) setAviso(data.aviso);
      setPaso('codigo');
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  };

  const confirmarCodigo = async (e) => {
    e.preventDefault();
    setError(''); setEnviando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth-app/verificar-codigo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase(), codigo: codigo.trim(), ecosistema: appId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código incorrecto.');
      window.localStorage.setItem(`meiti_sesion_app_token_${appId}`, data.token);
      window.localStorage.setItem(`meiti_sesion_app_email_${appId}`, data.email);
      onLogueado();
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  };

  // 🎨 [2026-08-26, observación del usuario: "el login de la interfaz de usuario no se enteró de
  // lo que pasó con los visuales últimamente"] Tenía razón, y era el peor lugar posible para que
  // pasara: esta pantalla la ve TODO usuario final de TODA app con login — es la primera
  // impresión del producto para alguien que no es el dueño. Estaba escrita a mano con <input> y
  // <button> crudos (sin foco, sin hover, sin estado apagado), avisos con dos colores clavados a
  // mano, y un "Revisa tu email" en voseo que sobrevivió al barrido de la sesión.
  // Ahora usa el kit de la propia app: los mismos campos, botones y avisos que sus pantallas.
  const UI = construirKitUI(tema, idPack);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center" style={{ background: tema.fondo, color: tema.texto }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6" style={{ background: `${tema.colorPrimario}22`, color: tema.colorPrimario }}>
        <i className="fa-solid fa-lock"></i>
      </div>
      <h2 className="text-lg font-semibold mb-2">{paso === 'email' ? 'Iniciar sesión' : paso === 'admin' ? 'Código de administrador' : 'Revisa tu email'}</h2>
      <p className="text-sm mb-6 max-w-xs" style={{ opacity: 0.65 }}>
        {paso === 'email' ? 'Te mandamos un código de acceso — sin contraseñas.'
          : paso === 'admin' ? (origenCodigo === 'consola'
            ? 'Se mostró una sola vez en la consola del servidor, la primera vez que arrancó la app.'
            : 'Lo encuentras en MEITI, en Mis apps, botón "Acceso de administrador".')
          : `Te mandamos un código de 6 dígitos a ${email}.`}
      </p>
      <div className="w-full max-w-xs mb-4 empty:mb-0">
        {aviso && <UI.Aviso mensaje={aviso} tono="alerta" onCerrar={() => setAviso('')} />}
        {error && <UI.Aviso mensaje={error} tono="peligro" onCerrar={() => setError('')} />}
      </div>
      {paso === 'admin' ? (
        <form onSubmit={entrarConCodigoAdmin} className="w-full max-w-xs flex flex-col gap-3 items-stretch">
          <input type="text" required autoFocus placeholder="XXXX-XXXX-XXXX-XXXX" value={codigoAdmin} onChange={e => setCodigoAdmin(e.target.value.toUpperCase())}
            aria-label="Código de administrador" autoComplete="off" spellCheck={false}
            className="meiti-campo-vivo w-full p-3 rounded-xl outline-none text-center text-base tracking-widest font-mono"
            style={{ background: `${tema.colorPrimario}11`, color: tema.texto, border: `1px solid ${tema.colorPrimario}33` }} />
          <UI.Boton tipo="submit" disabled={enviando || codigoAdmin.replace(/[^A-Z0-9]/g, '').length < 16} className="w-full self-stretch text-center justify-center">
            {enviando ? 'Verificando...' : 'Entrar como administrador'}
          </UI.Boton>
          <UI.Boton variante="fantasma" onClick={() => { setPaso('email'); setCodigoAdmin(''); setError(''); }} className="self-center">
            Volver
          </UI.Boton>
        </form>
      ) : paso === 'email' ? (
        <form onSubmit={pedirCodigo} className="w-full max-w-xs flex flex-col gap-3 items-stretch">
          <UI.Campo tipo="email" etiqueta="Tu email" valor={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
          <UI.Boton tipo="submit" disabled={enviando || !email.trim()} className="w-full self-stretch text-center justify-center">
            {enviando ? 'Enviando...' : 'Enviar código'}
          </UI.Boton>
          {hayCodigoAdmin && (
            <UI.Boton variante="fantasma" onClick={() => { setPaso('admin'); setError(''); setAviso(''); }} className="self-center">
              Entrar con código de administrador
            </UI.Boton>
          )}
        </form>
      ) : (
        <form onSubmit={confirmarCodigo} className="w-full max-w-xs flex flex-col gap-3 items-stretch">
          {/* El código sigue con su input propio: 6 dígitos centrados y espaciados es un patrón
              de un solo uso, y meterlo al kit como variante seria darle una pieza a toda app que
              ninguna otra necesita. */}
          <input type="text" inputMode="numeric" maxLength={6} required autoFocus placeholder="123456" value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
            aria-label="Código de 6 dígitos"
            className="meiti-campo-vivo w-full p-3 rounded-xl outline-none text-center text-2xl tracking-[0.5em] font-mono"
            style={{ background: `${tema.colorPrimario}11`, color: tema.texto, border: `1px solid ${tema.colorPrimario}33` }} />
          <UI.Boton tipo="submit" disabled={enviando || codigo.length !== 6} className="w-full self-stretch text-center justify-center">
            {enviando ? 'Verificando...' : 'Verificar'}
          </UI.Boton>
          <UI.Boton variante="fantasma" onClick={() => { setPaso('email'); setCodigo(''); setError(''); setAviso(''); }} className="self-center">
            Usar otro email
          </UI.Boton>
        </form>
      )}
    </div>
  );
}

// --- 7.6 SESIÓN OPCIONAL DEL VISITANTE (email + Salir, mismo criterio visual que CardPerfilSesion
// en Core) — 2026-09-09, pedido explícito del usuario: "no hay botón de salir" en una app con
// "requiere_login: false" (kiosco de autoservicio) donde igual hace falta que el PERSONAL se
// identifique para que se le reconozca el rol asignado en el Panel de Roles y Permisos. Antes de
// esto, "PantallaLoginApp" (más arriba) solo existía detrás del gate FORZADO de "requiere_login:
// true" — una app sin login obligatorio no tenía ningún camino para que alguien se logueara
// voluntariamente, así que el rol asignado nunca se podía reclamar. Reusa el MISMO flujo real
// (email + código, "/api/auth-app/*") en un modal en vez de a pantalla completa.
// 🧑‍🍳 [ENTRADA DE PERSONAL 2026-10-06, Tap Io] En un kiosco el botón "Iniciar sesión" no tiene que
// estar frente al cliente. Con "ui_schema.modo_kiosco: true" el botón solo aparece en un dispositivo
// del personal: el que abrió la app con "?personal=1" (queda recordado en ese navegador; con
// "?personal=0" se olvida). Es la misma app y los mismos datos: lo que cambia es la puerta de entrada.
const leerModoPersonal = (appId) => {
  if (typeof window === 'undefined') return false;
  const clave = `meiti_modo_personal_${appId}`;
  try {
    const pedido = new URLSearchParams(window.location.search).get('personal');
    if (pedido === '1') window.localStorage.setItem(clave, '1');
    if (pedido === '0') window.localStorage.removeItem(clave);
    return window.localStorage.getItem(clave) === '1';
  } catch (e) {
    return false;
  }
};

function BotonSesionApp({ appId, tema, idPack, colorPrimario, colorTexto, esDuenoDeLaApp = false, modoKiosco = false }) {
  const claveEmail = `meiti_sesion_app_email_${appId}`;
  const [email, setEmail] = useState(() => (typeof window !== 'undefined' ? window.localStorage.getItem(claveEmail) : null));
  const [modalAbierto, setModalAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modoPersonal] = useState(() => leerModoPersonal(appId));

  // Entrar o salir cambia el rol, y el rol decide el menú y los candados de cada pantalla: se recarga
  // para que todo lo lea de nuevo, en vez de dejar media app con el rol anterior.
  const salir = () => {
    window.localStorage.removeItem(`meiti_sesion_app_token_${appId}`);
    window.localStorage.removeItem(claveEmail);
    setEmail(null);
    setMenuAbierto(false);
    window.location.reload();
  };

  if (!email && modoKiosco && !modoPersonal) return null;

  // 🩹 [2026-09-09, corrección del usuario probando en vivo: "si estoy logeado en la app me
  // debería salir el botón para salir"] "Ser dueño de la plataforma" y "tener una sesión de
  // email abierta DENTRO de la app" son dos cosas independientes (mismo puente de identidades
  // documentado en server.js, /soy-dueno: "dos logins distintos que no se hablan"). El dueño no
  // necesita el botón de ENTRAR (ya tiene acceso total sin loguearse) pero si de algún modo tiene
  // una sesión de app activa, "Salir" tiene que verse igual — ocultar el componente entero para
  // "esDuenoDeLaApp" escondía también ese caso.
  if (!email && esDuenoDeLaApp) return null;

  // 🩹 [2026-09-09, corrección del usuario probando en vivo: "queda detrás de la flecha de mis
  // apps... y en teléfono no me sale"] La primera versión mostraba el email como texto suelto AL
  // LADO del ícono — eso hacía crecer el ancho de esta fila más allá del presupuesto que ya
  // reservan los otros botones nativos (Asistente/modo oscuro), y "Mis apps" (VisorApp.jsx) es un
  // overlay FIJO en ese mismo rincón que no sabe nada de este contenido: cualquier cosa que crezca
  // más de la cuenta termina RENDERIZADA DEBAJO de "Mis apps" en vez de al lado. En mobile, el
  // mismo ancho extra sencillamente no entraba y el elemento quedaba invisible. Ahora el botón
  // SIEMPRE mide lo mismo que sus vecinos (w-9 h-9, ícono solo) sin importar el estado — el email y
  // "Cerrar sesión" viven en un menú chico que se abre encima (position:absolute, no le suma ancho
  // a la fila) en vez de empujar el layout.
  if (email) {
    return (
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuAbierto(v => !v)}
          className="w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-colors"
          style={{ borderColor: `${colorPrimario}33`, color: colorTexto }}
          title={email}
          aria-label={email}
        >
          <i className="fa-solid fa-user"></i>
        </button>
        {menuAbierto && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(false)}></div>
            <div
              className="absolute right-0 top-11 z-50 rounded-xl border p-3 flex flex-col gap-2 shadow-lg"
              style={{ background: tema.superficie || tema.fondo, borderColor: `${colorPrimario}33`, minWidth: '12rem' }}
            >
              <span className="text-xs truncate" style={{ color: `${colorTexto}99` }} title={email}>{email}</span>
              <button
                onClick={salir}
                className="flex items-center gap-2 text-sm font-medium px-2 py-1.5 rounded-lg transition-colors"
                style={{ color: colorTexto }}
              >
                <i className="fa-solid fa-right-from-bracket text-xs"></i>
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalAbierto(true)}
        className="w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-colors"
        style={{ borderColor: `${colorPrimario}33`, color: colorTexto }}
        title="Iniciar sesión"
        aria-label="Iniciar sesión"
      >
        <i className="fa-solid fa-right-to-bracket"></i>
      </button>
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setModalAbierto(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ height: '26rem', background: tema.fondo }} onClick={(e) => e.stopPropagation()}>
            <PantallaLoginApp
              appId={appId}
              tema={tema}
              idPack={idPack}
              onLogueado={() => { setModalAbierto(false); setEmail(window.localStorage.getItem(claveEmail)); window.location.reload(); }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// --- 8. RESOLVEDOR DE FORMA: decide si la app es multi-página o grilla plana (legacy) ---
const ResolvedorMaestro = ({ esquemaActual, appId, registrarUso, nombreApp, paginasPendientes = [], tokenPreview, esDuenoDeLaApp = false }) => {
  // El modo se resuelve con el MISMO hook que usa el envoltorio multipagina, asi que las dos
  // ramas (login y app sin paginas) siguen exactamente la misma preferencia guardada por app.
  const [modoResolvedor] = useModoVisual(appId, esquemaActual.tema || {});
  const [catalogo, errorCatalogo] = useCatalogoComponentes(appId, tokenPreview);
  const manifestTablas = useManifestTablas(appId);
  const esMultiPagina = Array.isArray(esquemaActual.paginas) && esquemaActual.paginas.length > 0;

  // 📊 Apertura real de una app YA creada — SOLO cuando "Mis apps" la abre para un usuario final
  // de verdad (registrarUso=true). Nunca dispara desde previews de admin (Radar, Cámara de
  // Cuarentena, editor de Gestor de Catálogos), que llaman a extraerUI sin este flag — si no,
  // el propio arquitecto navegando el panel infla las estadísticas de "uso real".
  
  // 🩹 [BUG REAL 2026-09-10, reportado por el usuario: instaló un export de Windows y quedó
  // cargando los moldes para siempre] Sin esto, un fetch de catálogo que nunca responde (backend
  // embebido caído, típico de un export standalone) dejaba "catalogo" en [] para siempre:
  // ComponentFactory no encuentra match para ningún tag y el contenido queda en blanco, idéntico
  // en pantalla a "todavía está cargando". Mostrar el error real en vez de quedarse callado.
  if (errorCatalogo) {
    return (
      <div style={{ padding: '1.5rem', fontFamily: 'monospace', fontSize: '13px', color: '#b91c1c', background: '#fef2f2', height: '100%', width: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>⚠️ No se pudo cargar el catálogo de la app</div>
        {errorCatalogo}
      </div>
    );
  }

  // 🌗 [BUG REAL 2026-08-27, visto en CasinoOnline con el portal en modo oscuro] Acá se pasaba
  // "esquemaActual.tema" CRUDO — la paleta tal como quedó guardada al forjar — en vez del tema ya
  // resuelto para el modo elegido. El envoltorio multipágina sí resuelve (por eso el chrome de una
  // app se ve oscuro), pero estas dos ramas no, y una de ellas es la PANTALLA DE LOGIN: la primera
  // pantalla que ve todo usuario final de toda app con login. Con el portal en oscuro salía blanca.
  // La otra rama son las apps viejas sin "paginas", que además no tienen interruptor propio: sin
  // esto no siguen el modo por ningún lado.
  const temaResuelto = resolverTema(esquemaActual.tema || {}, modoResolvedor);
  const contenido = esMultiPagina
    ? <EnvoltorioAppMultiPagina esquemaActual={esquemaActual} catalogo={catalogo} appId={appId} nombreApp={nombreApp} paginasPendientes={paginasPendientes} manifestTablas={manifestTablas} esDuenoDeLaApp={esDuenoDeLaApp} />
    // Retrocompatibilidad: nodos viejos sin "paginas" siguen renderizando como grilla única.
    : <EnvoltorioMatriz esquemaActual={esquemaActual} catalogo={catalogo} appId={appId} tema={temaResuelto} idPack={esquemaActual.estilo_visual} manifestTablas={manifestTablas} esDuenoDeLaApp={esDuenoDeLaApp} />;

  if (esquemaActual.requiere_login) {
    return <GateAppPropia appId={appId} tema={temaResuelto} idPack={esquemaActual.estilo_visual}>{contenido}</GateAppPropia>;
  }
  return contenido;
};

// 🩹 [BUG REAL 2026-08-10] Un crash de render en la app (cualquier excepción no atrapada durante
// el mount de ResolvedorMaestro/GateAppPropia) dejaba la WebView de Capacitor en blanco y sin
// ningún rastro — nginx no ve nada porque nunca llegó a intentar ningún fetch, y sin DevTools de
// WebView conectados no hay forma de saber qué pasó. Un Error Boundary muestra el mensaje real en
// pantalla en vez de una pantalla en blanco silenciosa — mismo criterio que ya usa el resto del
// proyecto ("nunca romper el render con una excepción no atrapada", ver fetchDatos/fetchMutante).
class ErrorBoundaryApp extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[MEITI] Error de render capturado:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '1.5rem', fontFamily: 'monospace', fontSize: '13px', color: '#b91c1c', background: '#fef2f2', whiteSpace: 'pre-wrap', height: '100%', width: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>⚠️ Error al cargar la app</div>
          {String((this.state.error && this.state.error.message) || this.state.error)}
        </div>
      );
    }
    return this.props.children;
  }
}

// --- 9. EL RESOLVEDOR MAESTRO ---
// 🛡️ [SANDBOX 2026-07-31] "esCuarentena" queda en la firma solo por compatibilidad posicional
// con los llamadores existentes (CamaraCuarentena.jsx, ComponenteAisladorCuarentena.jsx, etc.) —
// ya no cambia el camino de render (el sandbox es el único camino, ver ComponentFactory arriba).
export const extraerUI = (uiSchema, _esCuarentena = false, appId = 'core_meiti', registrarUso = false, nombreApp = null, paginasPendientes = [], tokenPreview = null, esDuenoDeLaApp = false) => {
  let materiaCruda = uiSchema;
  if (typeof materiaCruda === 'string') {
    try { materiaCruda = JSON.parse(materiaCruda); } catch (e) { }
  }
  const esquemaActual = materiaCruda?.ui_schema
    ? materiaCruda.ui_schema
    : ((materiaCruda?.componentes || materiaCruda?.paginas) ? materiaCruda : null);

  if (!esquemaActual) {
    return <div className="text-red-500 font-mono text-sm p-4">[ ERROR: Esquema Vacío o Corrupto ]</div>;
  }
  return (
    <ErrorBoundaryApp>
      <ResolvedorMaestro esquemaActual={esquemaActual} appId={appId} registrarUso={registrarUso} nombreApp={nombreApp} paginasPendientes={paginasPendientes} tokenPreview={tokenPreview} esDuenoDeLaApp={esDuenoDeLaApp} />
    </ErrorBoundaryApp>
  );
};