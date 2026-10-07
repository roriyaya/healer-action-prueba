// 🛡️ [SANDBOX 2026-07-31] Extraído de ReactorRender.jsx — componentes puramente presentacionales
// (sin fetch, sin localStorage) que se importan tanto del lado del padre como desde el runtime
// del iframe sandboxeado (src/fabrica/sandbox/). Al vivir en un módulo sin dependencias propias,
// cada bundle se lleva su propia copia del código fuente — no hace falta (ni se podría) que
// crucen la frontera del iframe como referencias vivas.
import React, { useState, useRef, useEffect } from 'react';
// 💬 [2026-08-19, rumbo fijado por el usuario: "ese asistente es el mismo que usaremos en las
// máquinas... será como un molde base que llama los parámetros de la librería, jamás tendremos que
// cablear todo eso en cada app industrial"] El chat entra al kit para que un molde pueda usarlo.
// Un molde NO importa archivos — recibe todo en su scope (UI.*, MEITI.*, tema), así que la única
// forma de que llegue es por acá. Al darlo de alta en "construirKitUI" queda disponible de una en
// los TRES caminos que arman ese scope: la app exportada (ReactorRender), el iframe del Core
// (SandboxRuntimeApp) y el preview de dev-tools (PreviewMoldeVivo).
// Vive en "src/chat/" y no en "landing/" justamente por esto: lo comparten el sitio y las apps.
import { ChatMeiti } from '../../chat/ChatMeiti.jsx';
import { formaDePack } from './formasPack.js';
import { ICONOS_DE_MARCA } from '../../comunes/iconosMarcasFA.js';
// 🎙️ [MIC EN UI.Chat 2026-09-04, pedido explícito del usuario: "en los asistentes que no esta el
// boton de mic vamos a agregarlo"] useDictadoPorVoz no importa nada de "comunes/textos" a propósito
// (ver el comentario grande del propio hook): es justo lo que permite sumarlo acá sin romper la
// regla de este archivo ("sin fetch, sin localStorage", corre dentro del iframe sandboxeado).
import { useDictadoPorVoz } from '../../comunes/useDictadoPorVoz';


// 🎨 [BUG REAL CONFIRMADO 2026-08-18, visto en vivo en el navegador del usuario] Font Awesome tiene
// DOS familias de fuente y el nombre del ícono NO dice a cuál pertenece: los sólidos viven en
// "Font Awesome 6 Free" (clase "fa-solid") y los logos de marca en "Font Awesome 6 Brands" (clase
// "fa-brands"). Todo el sistema anteponía "fa-solid" a ciegas al nombre que llegara — así que
// cualquier ícono de marca salía como CUADRADO TACHADO, sin ningún error en consola.
//
// Se confirmó en dos superficies distintas el mismo día, lo que muestra que no era un descuido
// puntual sino la regla mal puesta: (1) el ícono de la página "Cripto" en el menú lateral de la app
// (MotorUI.jsx) y (2) "fa-bitcoin" pasado a UI.EstadoVacio por tres moldes distintos. Es más, la IA
// SÍ sabe la diferencia cuando escribe el <i> a mano ("fa-brands fa-bitcoin" en IH_ResumenDashboard
// está perfecto) — el error lo metía el sistema, no ella: al pasar solo el NOMBRE por una prop, la
// familia se perdía y el kit reponía la equivocada.
//
// Esta función centraliza la decisión en UN solo lugar, así ninguna superficie nueva tiene que
// acordarse (categoría "regla_no_propagada_a_todos_los_puntos_de_entrada"). Si el llamador ya vino
// con la familia puesta, se respeta tal cual y no se toca nada.
//
// ⚠️ Los 35 nombres de abajo se verificaron MIRÁNDOLOS pintados con "fa-brands" en el navegador, no
// de memoria — es el único método que funcionó. Las tres formas programáticas que se probaron antes
// (ancho del elemento, canvas measureText, "content" del ::before) dieron "está todo bien" con el
// ícono roto adentro, porque el glifo vive en un pseudo-elemento. "fa-x-twitter" se probó y quedó
// AFUERA a propósito: no existe en la versión 6.4.0 que carga index.html.

// 🎨 [2026-08-28] El fallback era 'fa-cube'. El usuario lo reportó como "cajitas" en el menú de
// casi todas sus apps: un cubo no significa nada y en pantalla se lee como un ícono que no cargó.
// Una hoja dice "una página", que es lo único que sabemos cuando no vino nombre.
export const claseIcono = (nombre) => {
  const n = (nombre || '').trim();
  if (!n) return 'fa-solid fa-file-lines';
  // Ya trae familia explícita (el molde escribió "fa-brands fa-bitcoin"): se respeta sin tocar.
  if (/fa-(solid|brands|regular|light|thin|duotone)/.test(n)) return n;
  return `${ICONOS_DE_MARCA.has(n) ? 'fa-brands' : 'fa-solid'} ${n}`;
};

// =========================================================================
// 🎨 TEMA POR DEFECTO: se pisa con lo que la IA declare en ui_schema.tema
// =========================================================================
export const TEMA_DEFAULT = {
  colorPrimario: '#06b6d4',
  colorSecundario: '#8b5cf6',
  fondo: '#0B1120',
  superficie: '#111827',
  texto: '#e2e8f0'
};

// =========================================================================
// 🧰 REGISTRO DINÁMICO DEL KIT [2026-08-23]: el kit recibe DATOS (nunca código) desde la tabla
// kit_recetas del backend — por cada categoría de bug corroborada, el mensaje de prohibición y
// la función del kit que ya lo resuelve. Este es el lado receptor: el mismo dato que el prompt
// ya recibe como regla (obtenerLeccionesIA, server.js) llega acá para que el kit "lo entienda"
// — cualquier pieza del kit puede consultar recetaDelKit(categoria) sin volver a la red.
//
// ⚠️ Export-safe a propósito: cero imports nuevos (este archivo viaja al export standalone —
// lección del core "export_standalone_dependencia_oculta") y el fetch falla en silencio a lista
// vacía (en Electron con file:// una URL relativa no resuelve; la app sigue andando igual).
// =========================================================================
let recetasDelKit = [];
export const recibirRecetasDelKit = (recetas) => {
  if (Array.isArray(recetas)) recetasDelKit = recetas;
};
export const recetaDelKit = (categoria) => recetasDelKit.find(r => r.categoria === categoria) || null;
export const listarRecetasDelKit = () => recetasDelKit;

// Carga única por sesión (promesa cacheada — llamadas repetidas son no-op). En el iframe del
// sandbox NO se usa: ahí los datos llegan por postMessage (MEITI_RECETAS_KIT) para no tener que
// abrir el endpoint en la allowlist del relay.
let cargaRecetasEnCurso = null;
export const cargarRecetasDelKit = () => {
  if (!cargaRecetasEnCurso) {
    cargaRecetasEnCurso = fetch('/api/kit/recetas-activas')
      .then(r => (r.ok ? r.json() : []))
      .then(lista => { recibirRecetasDelKit(lista); return recetasDelKit; })
      .catch(() => recetasDelKit);
  }
  return cargaRecetasEnCurso;
};

// =========================================================================
// 🧩 KIT DE UI NATIVO: piezas reales (no generadas por IA) que cualquier
// molde REACT_FORJADO recibe listas para usar vía "UI.*" en su scope,
// para que la IA deje de reinventar botones/tarjetas/inputs a mano cada vez.
// =========================================================================
// 🌗 [SISTEMA VISUAL 2026-08-26] Luminancia WCAG, copiada a mano de temaModos.js en vez de
// importada — A PROPÓSITO. Este módulo no tiene dependencias propias por diseño (ver la nota de
// arriba de todo): viaja copiado a tres bundles distintos, incluido el export nativo, y un import
// nuevo acá es exactamente el bug que este proyecto ya registró CUATRO veces
// (export_standalone_dependencia_oculta): un archivo fuente que gana un import rompe todos los
// builds nativos porque el generador del export no copia esa dependencia. Doce líneas duplicadas
// cuestan menos que eso.
const luminancia = (hex) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return 1;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const canal = (i) => {
    const s = parseInt(h.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
};

export const construirKitUI = (temaFinal, idPack) => {
  // 🎛️ [FORMA POR PACK 2026-08-26] El pack elegido por el dueno deja de ser solo un texto para
  // la IA y pasa a decidir tambien la FORMA de las piezas del kit: radio, densidad, borde,
  // sombra y caracter del boton principal. El color NUNCA sale de aca (eso es "tema"), y un
  // pack desconocido o ausente cae en "meiti", que es el aspecto de siempre.
  const forma = formaDePack(idPack);
  const { colorPrimario, colorSecundario, texto: colorTexto, superficie: colorSuperficie, fondoInput } = temaFinal;
  // 🩹 BUG REAL CONFIRMADO (reportado por el usuario, presente por igual en vivo y en cualquier
  // export — "en meiti se ve igual los mismos colores"): TEMA_DEFAULT traía un "fondoInput" fijo
  // ('#00000066', negro semitransparente) pensado para el tema oscuro por defecto — pero NINGUNA
  // app define su propio "fondoInput" en el tema que le pide a Gemini (solo colorPrimario/
  // Secundario/fondo/superficie/texto son las 5 propiedades reales que Gemini conoce), así que
  // ese negro semitransparente quedaba puesto SIEMPRE, incluso sobre una tarjeta con tema claro
  // (ver CreatorSuite: superficie blanca, texto #3D405B) — ahí un input queda como un bloque gris
  // plano sin borde visible, indistinguible de un placeholder vacío. Fix: derivar el fondo del
  // input de "colorTexto" con opacidad baja en vez de un valor fijo — un tinte translúcido del
  // color de texto se adapta solo: sutil y oscuro sobre una superficie clara, sutil y claro sobre
  // una superficie oscura (mismo principio que "surface + text-tinted overlay" de Material Design).
  const fondoInputFinal = fondoInput || `${colorTexto}14`;

  // 🎨 [SISTEMA VISUAL 2026-08-26] Las escalas y los estados dejan de ser una regla escrita en el
  // prompt y pasan a ser CÓDIGO. La lección de esta semana, dicha por el usuario: una regla de
  // prompt sin su chequeo se rompe y nadie se entera. Acá el molde ya no puede equivocarse en esto
  // porque no lo decide — lo decide el kit.
  //
  // Todo se deriva de "temaFinal", nunca de un color fijo: la app sigue siendo dueña de su paleta.
  const superficieEsClara = luminancia(colorSuperficie || '#111827') > 0.45;

  // Estados por color, nunca por opacidad. Sobre una superficie de color, bajar la opacidad
  // ensucia en vez de atenuar — se mezcla con lo que hay detrás. La capa es un velo del texto
  // (oscurece sobre claro, aclara sobre oscuro), así funciona con cualquier paleta.
  const velo = (nivel) => (superficieEsClara ? `rgba(0,0,0,${nivel})` : `rgba(255,255,255,${nivel})`);
  const ANILLO_FOCO = `0 0 0 3px ${colorPrimario}38`;

  // Los tonos semánticos SÍ tienen hue propio (verde es verde en toda app), pero su fondo, borde y
  // texto se arman según la superficie. Antes venían con hex claros fijos, pensados solo para tema
  // oscuro: sobre una app clara quedaban en ~2:1 y casi no se leían.
  const TONOS_BASE = {
    exito: { hue: '#16a34a', claro: '#166534', oscuro: '#86efac', icono: 'fa-circle-check' },
    alerta: { hue: '#d97706', claro: '#92400e', oscuro: '#fcd34d', icono: 'fa-circle-exclamation' },
    peligro: { hue: '#dc2626', claro: '#b91c1c', oscuro: '#fca5a5', icono: 'fa-triangle-exclamation' }
  };
  // Se llama "tonoSemantico" y no "tono" a propósito: UI.Aviso y UI.Chip reciben una PROP llamada
  // "tono", que taparía a esta función adentro de esos componentes. Compilaría igual y fallaría en
  // pantalla — la lección de esta semana sobre símbolos fuera de alcance.
  const tonoSemantico = (nombre) => {
    const t = TONOS_BASE[nombre] || TONOS_BASE.peligro;
    return {
      color: superficieEsClara ? t.claro : t.oscuro,
      background: superficieEsClara ? `${t.hue}14` : `${t.hue}29`,
      border: superficieEsClara ? `${t.hue}59` : `${t.hue}73`,
      icono: t.icono
    };
  };

    const bordeSuave = `${colorPrimario}33`;
    // 🎛️ El mismo estilo de campo que usa Campo mas abajo. Vive ACA, un nivel arriba, porque lo
    // comparten Desplegable y SelectorFecha: con una copia cada uno, el desplegable y el calendario
    // de un mismo formulario podrian dejar de verse iguales sin que nadie lo note.
    const estiloInputBase = {
      // 🎛️ [2026-08-29, reportado por el usuario: "los campos select estan mas gruesos que los
      // demas"] El tamaño sale del PACK, igual que el input y el boton — nunca de un p-3 fijo. Ese
      // fijo era el bug: el desplegable quedaba en 0.75rem de padding y 1rem de letra mientras el
      // campo de al lado usaba 0.625rem y 0.875rem del pack. Dos controles del mismo formulario
      // dejaban de ser el mismo rectangulo, y en un pack denso la diferencia se ve enseguida.
      borderRadius: forma.radioPieza,
      padding: forma.altoPieza,
      fontSize: forma.escalaTexto,
      background: fondoInputFinal, color: colorTexto, border: `1px solid ${bordeSuave}`,
      '--meiti-glow-a': `${colorPrimario}26`, '--meiti-glow-b': `${colorPrimario}33`,
      '--meiti-glow-a-fuerte': `${colorPrimario}4d`, '--meiti-glow-b-fuerte': `${colorPrimario}73`
    };

    // 📏 [2026-08-28] Un desplegable de FORMULARIO y uno de BARRA DE HERRAMIENTAS no son el mismo
    // control. Los moldes BASE de graficos, agenda y tablas tenian su <select> crudo justamente
    // porque la pieza del kit se pintaba grande y les rompia la barra: el tamaño fijo era parte de
    // POR QUE nadie la usaba. Es un PARAMETRO, no una copia (regla dura del proyecto).
    // Un desplegable de FORMULARIO y uno de BARRA DE HERRAMIENTAS no son el mismo control: los
    // moldes BASE de graficos, agenda y tablas tenian su <select> crudo justamente porque la pieza
    // del kit no entraba en la barra. "compacto" es ese caso, y es lo UNICO que pisa al pack —
    // "normal" no pisa nada, para que un desplegable y un campo de texto sean el mismo rectangulo.
    // 🎨 [2026-08-29, pregunta del usuario: "¿estas modificaciones son con etiquetas dinámicas para
    // temas?"] Lo eran salvo acá: el compacto tenía padding, radio y letra FIJOS, así que en una app
    // de esquinas redondas su desplegable de barra salía cuadrado. Ahora se deriva del pack igual
    // que el normal — el RADIO se respeta tal cual (una app de pastillas tiene pastillas también en
    // su barra) y solo se achican el relleno y la letra.
    const achicar = (medida, factor) => String(medida || '')
      .trim().split(/\s+/)
      .map((v) => {
        const m = /^(-?[\d.]+)(rem|em|px)$/.exec(v);
        return m ? `${+(parseFloat(m[1]) * factor).toFixed(4)}${m[2]}` : v;
      })
      .join(' ');

    // 📡 [2026-08-29, reportado por el usuario: "los select se esconden detras del div cuando se
    // salen de la card del formulario"] Este bug ya se habia "arreglado" el 2026-08-27 sacando un
    // overflow-x-hidden de la Tarjeta, y volvio — porque el recorte real no era ese.
    //
    // El molde vive en un <iframe> cuyo alto es EXACTAMENTE el de su contenido (MEITI_ALTURA). La
    // lista del desplegable es "absolute", asi que NO suma alto. Resultado: se sale del iframe, y
    // nada dentro de un iframe puede pintar fuera de sus bordes — subir el z-index (que es lo que
    // hacia MEITI_CAPA) no alcanza, porque el iframe sigue igual de bajo.
    //
    // Lo que si funciona: pedirle al padre que AGRANDE el iframe mientras haya algo desplegado. El
    // padre compensa ese alto extra con un margen negativo, asi que la fila de la grilla no se mueve
    // y el iframe simplemente pinta por encima de lo que tiene debajo (ver MoldeSandboxeado.jsx).
    const enIframe = () => typeof window !== 'undefined' && window.parent !== window;
    // 🪟 [BUG REAL 2026-10-06, Tap Io, "el select se abre de forma extraña"] Un desplegable ADENTRO
    // de un modal (capa "fixed") no pide capa propia: el iframe crecía, el modal centrado bajaba la
    // mitad de ese alto, la lista bajaba con él y volvía a pedir más — hasta el tope de 1200px, con
    // el formulario centrado fuera de la vista. Ahí manda el alto del modal (MEITI_MODAL, ver
    // altoNaturalDeCapas en sandboxRuntimeMain.jsx), que ya cuenta la lista abierta.
    const dentroDeModal = (nodo) => {
      for (let el = nodo?.parentElement; el && el !== document.body; el = el.parentElement) {
        if (getComputedStyle(el).position === 'fixed') return true;
      }
      return false;
    };
    const avisarCapa = (abierto, panelRef) => {
      if (!enIframe()) return;
      if (abierto && dentroDeModal(panelRef.current)) return;
      let alto = 0;
      if (abierto && panelRef.current) {
        // Cuanto sobresale el panel por debajo del borde del iframe. "innerHeight" adentro de un
        // iframe ES el alto del iframe, que es justo lo que hay que superar.
        const caja = panelRef.current.getBoundingClientRect();
        alto = Math.max(0, Math.ceil(caja.bottom - window.innerHeight) + 8);
      }
      try { window.parent.postMessage({ type: 'MEITI_CAPA', activa: abierto, alto }, '*'); } catch (e) { /* sin padre alcanzable */ }
    };

    const CAJA_COMPACTA = {
      padding: achicar(forma.altoPieza, 0.45),
      borderRadius: forma.radioPieza,
      fontSize: achicar(forma.escalaTexto, 0.85),
    };
    const cajaDe = (tamano) => (tamano === 'compacto' ? CAJA_COMPACTA : null);

    // 🔠 Texto legible SOBRE el color primario de la app. Antes era '#ffffff' fijo: sobre un
    // primario claro (un amarillo, un lima) el elegido quedaba blanco sobre casi blanco y no se
    // leía. El kit ya medía luminancia para el chat; acá se usa lo mismo.
    const textoSobrePrimario = luminancia(colorPrimario) > 0.45 ? '#111827' : '#ffffff';

  // 🩹 [BUG REAL CONFIRMADO 2026-08-06, QATest3GPIO] "ariaLabel" nuevo, opcional — un botón de
  // solo ícono (sin texto visible como children) queda estructuralmente invisible para el
  // matcher de Ojo Óptico (busca por textContent/aria-label/title, ver ojo_optico.js), aunque
  // se vea perfecto en pantalla. En vez de confiar en que la IA se acuerde de escribir el
  // atributo nativo a mano cada vez, la librería ya sabe pasarlo — el prompt maestro solo tiene
  // que pedir que se llene cuando el botón sea icono-solo (ver regla universal en oraculo.js).
  // 🩹 [BUG REAL CONFIRMADO 2026-08-14, reportado por el usuario: "en pc se van a full ancho como
  // los demas campos"] Un <button> normal, dentro de un contenedor "flex flex-col" (el patrón más
  // común para apilar Campo+Boton en un formulario), hereda "align-items: stretch" (default de
  // flexbox) y se estira al 100% del ancho del contenedor — el mismo comportamiento por el que
  // UI.Campo SÍ debe ocupar el ancho completo, pero un botón nunca debería (se ve como un campo
  // más, no como una acción). "self-start" cancela ese estiramiento (vuelve al ancho natural del
  // contenido) SIN bloquear un ancho explícito — un molde que de verdad quiere un botón de ancho
  // completo (ej. "Continuar" al pie de un wizard) sigue pudiendo pasar "className='w-full'" y
  // gana igual, porque "w-full" fija el ancho directamente, algo que "self-start" no toca.
  // 🩹 [BUG REAL CONFIRMADO 2026-08-29, reportado por el usuario: "cada vez que se muestra un boton
  // despues de un campo esta fuera de lugar, mas alto que el campo, no sigue la linea"] "self-start"
  // arreglaba el ancho en COLUMNA y rompia la alineacion en FILA: "align-self" del hijo LE GANA a
  // "align-items" del padre, asi que un molde que pedia "alignItems: flex-end" para alinear el boton
  // con el input no lo conseguia. Medido en pantalla: el boton quedaba 24px arriba (exactamente el
  // alto de la etiqueta), con el MISMO desfase en los dos casos, el que pedia alinear y el que no.
  // Ahora se consigue lo mismo por TAMANO en vez de por alineacion: "w-fit" evita el estirado
  // horizontal en columna (el bug del 2026-08-14, intacto) y "h-fit" evita el estirado vertical en
  // fila. Ninguno de los dos pisa lo que el contenedor decida, que es lo que un hijo no debe hacer.
  // Y para el caso que lo motivo hay ademas una pieza que no se puede desalinear: "UI.Campo" con
  // "accion", donde el boton vive adentro del campo y la fila la resuelve el kit.
  // 🎨 [SISTEMA VISUAL 2026-08-26] Antes: "transition-opacity hover:opacity-90 disabled:opacity-40"
  // para las tres variantes. Dos problemas reales, no de gusto: un botón de color transparentado
  // sobre una tarjeta de color se ENSUCIA (se mezcla con lo de atrás) en vez de atenuarse; y un
  // deshabilitado al 40% conserva su color de acción, así que sigue pareciendo pulsable. Ahora cada
  // estado tiene su propio color, derivado del tema — el hover y el activo apoyan un velo que
  // oscurece sobre superficie clara y aclara sobre oscura, así funciona con cualquier paleta.
  // 🔽 [DESPLEGABLE DEL KIT 2026-08-26, pedido del usuario: "agregá el <select> que está crudo
  // también en tema MEITI apps"] Un <select> nativo abre un menú del SISTEMA OPERATIVO, no un
  // elemento de la página: en Android sigue el tema del teléfono (lista blanca aunque la app sea
  // oscura) y en Windows el resaltado del elegido es el azul del sistema. Ninguna hoja de estilos
  // los alcanza — es la misma pared que ya obligó a escribir un desplegable propio en el portal.
  //
  // Este es el del kit, y es OTRO archivo a propósito: kitUI.jsx viaja a las apps exportadas y no
  // puede importar nada del portal (categoría "export_standalone_dependencia_oculta"). Los colores
  // salen del "tema" de la app, así que el desplegable se ve como la app y no como MEITI.
  const Desplegable = ({ valor, onCambio, opciones = [], placeholder = 'Selecciona...', id, etiqueta, deshabilitado = false, tamano = 'normal' }) => {
    const [abierto, setAbierto] = useState(false);

    // 📡 [2026-08-27, pregunta del usuario: "¿no hay forma de poner las cards encima del iframe?"]
    // No la hay: nada dentro de un <iframe> puede pintar fuera de sus bordes, y esa barrera es
    // justamente lo que hace seguro el sandbox. Pero SÍ se puede pedirle al padre que levante el
    // iframe entero por encima de sus vecinos mientras haya algo abierto — que es lo que resuelve
    // el sintoma real: "el select se esconde detrás de la tabla que está debajo", donde esa tabla
    // es OTRO molde, o sea otro iframe hermano que pinta después.
    // Si esto no corre dentro de un iframe (preview de dev-tools, app exportada), no hace nada.
    const [resaltado, setResaltado] = useState(-1);
    const [arriba, setArriba] = useState(false);
    // 🪟 [2026-10-06, Tap Io] Dentro de un modal, la lista va "fixed" pegada al botón: el cuerpo de
    // un formulario modal suele tener scroll propio, y una lista "absolute" adentro quedaba cortada
    // por ese contenedor (se veían dos opciones de cuarenta). Fuera de un modal no cambia nada.
    const [fijo, setFijo] = useState(null);
    const raizRef = useRef(null);
    const botonRef = useRef(null);
    const panelRef = useRef(null);   // la lista / el calendario, para medir cuanto sobresale del iframe
    const ubicarFijo = () => {
      const c = botonRef.current && botonRef.current.getBoundingClientRect();
      if (c) setFijo({ top: c.bottom + 4, left: c.left, width: c.width });
    };
    useEffect(() => {
      if (!abierto || !fijo) return;
      // El contenedor con scroll se puede mover con la lista abierta: la lista lo sigue.
      window.addEventListener('scroll', ubicarFijo, true);
      window.addEventListener('resize', ubicarFijo);
      return () => { window.removeEventListener('scroll', ubicarFijo, true); window.removeEventListener('resize', ubicarFijo); };
    }, [abierto, !!fijo]);

    // Va DESPUES de panelRef a proposito: aunque el cierre lo resolveria igual (el efecto corre
    // post-render), leerlo antes de su declaracion se parece demasiado a un bug.
    useEffect(() => { avisarCapa(abierto, panelRef); }, [abierto]);

    const indiceActual = opciones.findIndex(o => String(o.value) === String(valor));
    const elegido = indiceActual >= 0 ? opciones[indiceActual] : null;

    useEffect(() => {
      if (!abierto) return;
      const afuera = (e) => { if (!raizRef.current || !raizRef.current.contains(e.target)) setAbierto(false); };
      // 🚪 [2026-08-29] El "clic afuera" vive DENTRO del iframe, asi que un clic en cualquier otra
      // parte de la pagina (otro molde, el fondo) nunca le llega y el panel se quedaba abierto,
      // con el iframe crecido y por encima de sus vecinos. El blur de la ventana SI cruza esa
      // frontera: al hacer foco en cualquier otro lado, este iframe lo pierde.
      const perderFoco = () => setAbierto(false);
      document.addEventListener('mousedown', afuera);
      document.addEventListener('touchstart', afuera, { passive: true });
      window.addEventListener('blur', perderFoco);
      return () => {
        document.removeEventListener('mousedown', afuera);
        document.removeEventListener('touchstart', afuera);
        window.removeEventListener('blur', perderFoco);
      };
    }, [abierto]);

    const abrir = () => {
      if (deshabilitado) return;
      // Hacia dónde abrir se MIDE, no se supone: un desplegable al final de un formulario en un
      // teléfono no tiene lugar abajo.
      const caja = botonRef.current && botonRef.current.getBoundingClientRect();
      if (caja) {
        const espacioAbajo = window.innerHeight - caja.bottom;
        // 📐 [2026-08-29] Adentro de un iframe SIEMPRE se abre hacia abajo: el padre agranda el
        // iframe para que quepa (ver avisarCapa). Abrir hacia arriba ahi solo cambia contra que
        // borde se corta. Fuera del iframe (export standalone, preview) si conviene medir y girar.
        setArriba(!enIframe() && (espacioAbajo < Math.min(opciones.length * 40 + 8, 260) && caja.top > espacioAbajo));
        if (dentroDeModal(botonRef.current)) { setArriba(false); setFijo({ top: caja.bottom + 4, left: caja.left, width: caja.width }); }
        else setFijo(null);
      }
      setResaltado(indiceActual >= 0 ? indiceActual : 0);
      setAbierto(true);
    };

    const elegir = (i) => {
      const op = opciones[i];
      if (!op) return;
      onCambio && onCambio({ target: { value: op.value } });
      setAbierto(false);
      botonRef.current && botonRef.current.focus();
    };

    const alTeclado = (e) => {
      if (deshabilitado) return;
      if (!abierto) {
        if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].indexOf(e.key) >= 0) { e.preventDefault(); abrir(); }
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); setAbierto(false); botonRef.current && botonRef.current.focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(resaltado); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setResaltado(r => (r + 1) % opciones.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setResaltado(r => (r - 1 + opciones.length) % opciones.length); }
      else if (e.key === 'Tab') setAbierto(false);
    };

    return (
      <div ref={raizRef} className="relative w-full">
        <button
          ref={botonRef}
          type="button"
          id={id}
          disabled={deshabilitado}
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-label={etiqueta}
          onClick={() => (abierto ? setAbierto(false) : abrir())}
          onKeyDown={alTeclado}
          className="meiti-campo-vivo w-full outline-none flex items-center justify-between gap-2 text-left"
          style={{ ...estiloInputBase, ...cajaDe(tamano), cursor: deshabilitado ? 'not-allowed' : 'pointer', opacity: deshabilitado ? 0.55 : 1 }}
        >
          <span style={{ opacity: elegido ? 1 : 0.55 }}>{elegido ? elegido.label : placeholder}</span>
          <i className={`fa-solid fa-chevron-down text-xs transition-transform ${abierto ? 'rotate-180' : ''}`} style={{ opacity: 0.6 }}></i>
        </button>
        {abierto && (
          <ul
            ref={panelRef}
            role="listbox"
            aria-label={etiqueta}
            className={`${fijo ? 'fixed z-[1000]' : `absolute z-50 left-0 right-0 ${arriba ? 'bottom-full mb-1' : 'top-full mt-1'}`} p-1 rounded-xl overflow-y-auto list-none m-0`}
            // 🩹 [BUG REAL 2026-08-27, reportado por el usuario: "el select está transparente y se
            // liga con el texto de abajo"] Acá iba "fondoInputFinal", que es el color del texto
            // al 8% de opacidad. Sobre un campo QUIETO adentro de una tarjeta se lee como un
            // tinte suave y está bien — pero esta lista FLOTA por encima del contenido, y un
            // panel translúcido deja pasar lo de atrás: las dos capas de texto se superponen y
            // no se lee ninguna. Una superficie que tapa tiene que ser OPACA.
            style={{ maxHeight: '16rem', background: colorSuperficie, border: `1px solid ${bordeSuave}`, boxShadow: `0 12px 28px -12px ${colorTexto}59`, ...(fijo ? { top: fijo.top, left: fijo.left, width: fijo.width } : {}) }}
          >
            {opciones.map((op, i) => {
              const esElegida = String(op.value) === String(valor);
              const activa = i === resaltado;
              return (
                <li
                  key={op.value}
                  role="option"
                  aria-selected={esElegida}
                  onMouseEnter={() => setResaltado(i)}
                  onClick={() => elegir(i)}
                  className="px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between gap-3 text-sm"
                  style={{
                    // El resaltado es el color de LA APP, nunca el azul del sistema: eso era la
                    // mitad del problema que el <select> nativo no dejaba arreglar.
                    background: activa ? colorPrimario : 'transparent',
                    color: activa ? textoSobrePrimario : (esElegida ? colorPrimario : colorTexto),
                    fontWeight: esElegida ? 600 : 400
                  }}
                >
                  <span>{op.label}</span>
                  {esElegida && <i className="fa-solid fa-check text-xs"></i>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

    // 📅 [2026-08-28, reportado por el usuario: "calendario generico en los forms"] Hermana de
    // Desplegable, y por el MISMO motivo: el calendario de un <input type="date"> lo dibuja el
    // NAVEGADOR, no la app. Sale con los colores del sistema, en el idioma del sistema, y en
    // Android es una hoja blanca aunque la app sea oscura. Ninguna hoja de estilos lo alcanza.
    // Acá el calendario vive en el DOM y se pinta con el tema de la app, igual que la lista del
    // desplegable desde el 2026-08-26.
    //
    // Contrato IDENTICO al del input nativo a propósito: recibe y emite "YYYY-MM-DD" y llama a
    // onCambio({ target: { value } }). Un molde que hoy hace <input type="date" value={f.fecha}
    // onChange={...}> sigue funcionando palabra por palabra al cambiar el tag.
    const DIAS_CORTOS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    // ⚠️ NUNCA new Date('2026-03-12'): eso lo interpreta como UTC medianoche y en todo el continente
    // americano (offset negativo) devuelve el DIA ANTERIOR. Es un bug clásico y silencioso — la
    // fecha que el usuario eligió no es la que se guarda. Se parte el texto a mano.
    const aPartes = (iso) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
      return m ? { anio: +m[1], mes: +m[2] - 1, dia: +m[3] } : null;
    };
    const aTexto = (anio, mes, dia) =>
      `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    const SelectorFecha = ({ valor, onCambio, id, etiqueta, placeholder = 'Elige una fecha', deshabilitado = false, min, max, tamano = 'normal' }) => {
      const [abierto, setAbierto] = useState(false);
      const elegida = aPartes(valor);
      const hoy = new Date();
      const [vista, setVista] = useState(() => ({
        anio: elegida ? elegida.anio : hoy.getFullYear(),
        mes: elegida ? elegida.mes : hoy.getMonth()
      }));
      const [arriba, setArriba] = useState(false);
      const raizRef = useRef(null);
      const botonRef = useRef(null);
      const panelRef = useRef(null);   // la lista / el calendario, para medir cuanto sobresale del iframe

      // 📡 Mismo motivo que en Desplegable: nada dentro de un <iframe> puede pintar fuera de sus
      // bordes, así que se le pide al padre que levante el iframe entero mientras esto está abierto
      // — si no, el calendario queda tapado por el molde de al lado.
      useEffect(() => { avisarCapa(abierto, panelRef); }, [abierto]);

      useEffect(() => {
        if (!abierto) return;
        const afuera = (e) => { if (!raizRef.current || !raizRef.current.contains(e.target)) setAbierto(false); };
        // 🚪 [2026-08-29] El "clic afuera" vive DENTRO del iframe, asi que un clic en cualquier otra
        // parte de la pagina (otro molde, el fondo) nunca le llega y el panel se quedaba abierto,
        // con el iframe crecido y por encima de sus vecinos. El blur de la ventana SI cruza esa
        // frontera: al hacer foco en cualquier otro lado, este iframe lo pierde.
        const perderFoco = () => setAbierto(false);
        document.addEventListener('mousedown', afuera);
        document.addEventListener('touchstart', afuera, { passive: true });
        window.addEventListener('blur', perderFoco);
        return () => {
          document.removeEventListener('mousedown', afuera);
          document.removeEventListener('touchstart', afuera);
          window.removeEventListener('blur', perderFoco);
        };
      }, [abierto]);

      const abrir = () => {
        if (deshabilitado) return;
        // Hacia dónde abrir se MIDE, no se supone: un calendario al final de un formulario en un
        // teléfono no tiene lugar abajo.
        const caja = botonRef.current && botonRef.current.getBoundingClientRect();
        if (caja) {
          const espacioAbajo = window.innerHeight - caja.bottom;
          // 📐 [2026-08-29] Adentro de un iframe SIEMPRE se abre hacia abajo: el padre agranda el
          // iframe para que quepa (ver avisarCapa). Abrir hacia arriba ahi solo cambia contra que
          // borde se corta. Fuera del iframe (export standalone, preview) si conviene medir y girar.
          setArriba(!enIframe() && (espacioAbajo < 340 && caja.top > espacioAbajo));
        }
        if (elegida) setVista({ anio: elegida.anio, mes: elegida.mes });
        setAbierto(true);
      };

      const fueraDeRango = (iso) => (min && iso < min) || (max && iso > max);

      const elegir = (dia) => {
        const iso = aTexto(vista.anio, vista.mes, dia);
        if (fueraDeRango(iso)) return;
        onCambio && onCambio({ target: { value: iso } });
        setAbierto(false);
        botonRef.current && botonRef.current.focus();
      };

      const moverMes = (delta) => setVista((v) => {
        const total = v.anio * 12 + v.mes + delta;
        return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
      });

      const alTeclado = (e) => {
        if (deshabilitado) return;
        if (!abierto) {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); abrir(); }
          return;
        }
        if (e.key === 'Escape') { setAbierto(false); botonRef.current && botonRef.current.focus(); }
        else if (e.key === 'PageUp') { e.preventDefault(); moverMes(-1); }
        else if (e.key === 'PageDown') { e.preventDefault(); moverMes(1); }
        else if (e.key === 'Tab') setAbierto(false);
      };

      // Domingo primero: es como se lee un calendario en México y buena parte de Latinoamérica.
      const primerDiaSemana = new Date(vista.anio, vista.mes, 1).getDay();
      const diasDelMes = new Date(vista.anio, vista.mes + 1, 0).getDate();
      const celdas = [];
      for (let i = 0; i < primerDiaSemana; i++) celdas.push(null);
      for (let d = 1; d <= diasDelMes; d++) celdas.push(d);

      const textoBoton = elegida
        ? `${elegida.dia} ${MESES_CORTOS[elegida.mes]} ${elegida.anio}`
        : placeholder;

      return (
        <div ref={raizRef} className="relative w-full">
          <button
            ref={botonRef}
            type="button"
            id={id}
            disabled={deshabilitado}
            aria-haspopup="dialog"
            aria-expanded={abierto}
            aria-label={etiqueta}
            onClick={() => (abierto ? setAbierto(false) : abrir())}
            onKeyDown={alTeclado}
            className="meiti-campo-vivo w-full outline-none flex items-center justify-between gap-2 text-left"
            style={{ ...estiloInputBase, ...cajaDe(tamano), cursor: deshabilitado ? 'not-allowed' : 'pointer', opacity: deshabilitado ? 0.55 : 1 }}
          >
            <span style={{ opacity: elegida ? 1 : 0.55 }}>{textoBoton}</span>
            <i className="fa-solid fa-calendar-days text-xs" style={{ opacity: 0.6 }}></i>
          </button>

          {abierto && (
            <div
              ref={panelRef}
              role="dialog"
              aria-label={etiqueta || 'Calendario'}
              onKeyDown={alTeclado}
              className={`absolute z-50 left-0 p-3 rounded-xl ${arriba ? 'bottom-full mb-1' : 'top-full mt-1'}`}
              // Una superficie que TAPA tiene que ser opaca — misma lección que la lista del
              // desplegable (2026-08-27): un panel translúcido deja pasar el texto de atrás y no se
              // lee ninguna de las dos capas.
              style={{
                width: '17rem', background: colorSuperficie, border: `1px solid ${bordeSuave}`,
                boxShadow: `0 12px 28px -12px ${colorTexto}59`, color: colorTexto
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <button type="button" aria-label="Mes anterior" onClick={() => moverMes(-1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ color: colorTexto, opacity: 0.7 }}>
                  <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>
                <span className="text-sm font-semibold">{MESES[vista.mes]} {vista.anio}</span>
                <button type="button" aria-label="Mes siguiente" onClick={() => moverMes(1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ color: colorTexto, opacity: 0.7 }}>
                  <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DIAS_CORTOS.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold uppercase py-1" style={{ opacity: 0.5 }}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {celdas.map((dia, i) => {
                  if (dia === null) return <div key={`v${i}`} />;
                  const iso = aTexto(vista.anio, vista.mes, dia);
                  const esElegida = !!elegida && elegida.anio === vista.anio && elegida.mes === vista.mes && elegida.dia === dia;
                  const esHoy = hoy.getFullYear() === vista.anio && hoy.getMonth() === vista.mes && hoy.getDate() === dia;
                  const bloqueada = fueraDeRango(iso);
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={bloqueada}
                      aria-label={`${dia} de ${MESES[vista.mes]} de ${vista.anio}`}
                      aria-current={esHoy ? 'date' : undefined}
                      onClick={() => elegir(dia)}
                      className="h-8 rounded-lg text-sm flex items-center justify-center transition-colors"
                      style={{
                        // El resaltado es el color de LA APP, nunca el azul del sistema: eso era la
                        // mitad de lo que el calendario nativo no dejaba arreglar.
                        background: esElegida ? colorPrimario : 'transparent',
                        color: esElegida ? textoSobrePrimario : colorTexto,
                        fontWeight: esElegida || esHoy ? 600 : 400,
                        border: esHoy && !esElegida ? `1px solid ${colorPrimario}` : '1px solid transparent',
                        cursor: bloqueada ? 'not-allowed' : 'pointer',
                        opacity: bloqueada ? 0.3 : 1
                      }}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${bordeSuave}` }}>
                <button type="button" onClick={() => {
                  setVista({ anio: hoy.getFullYear(), mes: hoy.getMonth() });
                  const iso = aTexto(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
                  if (!fueraDeRango(iso)) { onCambio && onCambio({ target: { value: iso } }); setAbierto(false); }
                }} className="text-xs font-medium" style={{ color: colorPrimario }}>Hoy</button>
                {/* Poder DESELEGIR importa: un campo de fecha opcional que ya se tocó no tenía forma
                    de volver a quedar vacío, y el usuario terminaba guardando una fecha que no quiso. */}
                <button type="button" onClick={() => { onCambio && onCambio({ target: { value: '' } }); setAbierto(false); }}
                  className="text-xs" style={{ color: colorTexto, opacity: 0.6 }}>Limpiar</button>
              </div>
            </div>
          )}
        </div>
      );
    };


  const Boton = ({ children, onClick, tipo = 'button', variante = 'primario', disabled = false, className = '', ariaLabel }) => {
    const [encima, setEncima] = useState(false);
    const [presionado, setPresionado] = useState(false);
    const [enfocado, setEnfocado] = useState(false);

    const capa = presionado ? velo(0.18) : encima ? velo(0.10) : null;
    // 👻 [2026-08-26, observación del usuario: "los botones que diseñaste no son una palabra roja
    // de borrar y una violeta de editar, eso no combina con el diseño"] Tenía razón: las acciones
    // de una fila de tabla eran texto pelado de color, sin ninguno de los estados del botón real
    // (hover, foco, apagado). Faltaba la variante para ese lugar: dentro de una fila, un botón con
    // fondo y borde compite con el dato — la pieza correcta es la "fantasma", que no se dibuja en
    // reposo pero SÍ reacciona igual que las otras. Así una acción de tabla deja de ser una
    // excepción visual y pasa a ser el mismo botón del kit, más discreto.
    const base = {
      // 🎛️ El caracter de la accion principal lo decide el pack: "solido" pinta el color de
      // marca lleno (meiti, bento, denso), "suave" lo baja a un lavado del mismo tono (calido),
      // y "fantasma" lo deja sin fondo (escena, donde el unico boton lleno tiene que ser
      // reproducir y lo pinta el molde, no el kit).
      primario: forma.botonPrimario === 'fantasma'
        ? { background: 'transparent', color: colorPrimario, border: `${forma.bordePieza === '0' ? '0px' : forma.bordePieza} solid transparent` }
        : forma.botonPrimario === 'suave'
          ? { background: `${colorPrimario}26`, color: colorPrimario, border: `1px solid ${colorPrimario}33` }
          // 🔠 [2026-08-29] Acá decía '#ffffff' fijo. En una app con primario claro (un amarillo, un
          // lima, un cian) el botón principal quedaba blanco sobre casi blanco: el botón más
          // importante de la app, ilegible. Se mide la luminancia, igual que el resto del kit.
          : { background: colorPrimario, color: textoSobrePrimario, border: `1px solid ${colorPrimario}` },
      secundario: { background: 'transparent', color: colorPrimario, border: `1px solid ${colorPrimario}` },
      peligro: { background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626' },
      // 🎬 [ACABADOS 2026-08-27] El fantasma ya no es siempre transparente: su caracter sale del
      // pack. Era la razon exacta de que las acciones de tabla se vieran IGUALES en los seis
      // packs — un boton sin fondo ni borde no tiene donde mostrar el radio ni la densidad.
      fantasma: forma.accionTabla === 'contorno'
        ? { background: 'transparent', color: colorPrimario, border: `1px solid ${colorPrimario}55` }
        : forma.accionTabla === 'suave'
          ? { background: `${colorPrimario}1f`, color: colorPrimario, border: '1px solid transparent' }
          : { background: 'transparent', color: colorPrimario, border: '1px solid transparent' },
      // El color sale de "tonoSemantico", que ya elige el matiz correcto según si la superficie de
      // la app es clara u oscura — un rojo puro sobre fondo negro no se lee.
      'fantasma-peligro': forma.accionTabla === 'contorno'
        ? { background: 'transparent', color: tonoSemantico('peligro').color, border: `1px solid ${tonoSemantico('peligro').color}55` }
        : forma.accionTabla === 'suave'
          ? { background: `${tonoSemantico('peligro').color}1f`, color: tonoSemantico('peligro').color, border: '1px solid transparent' }
          : { background: 'transparent', color: tonoSemantico('peligro').color, border: '1px solid transparent' },
      'fantasma-exito': forma.accionTabla === 'contorno'
        ? { background: 'transparent', color: tonoSemantico('exito').color, border: `1px solid ${tonoSemantico('exito').color}55` }
        : forma.accionTabla === 'suave'
          ? { background: `${tonoSemantico('exito').color}1f`, color: tonoSemantico('exito').color, border: '1px solid transparent' }
          : { background: 'transparent', color: tonoSemantico('exito').color, border: '1px solid transparent' }
    };
    const esFantasma = String(variante).startsWith('fantasma');
    const estilo = { ...(base[variante] || base.primario) };

    if (disabled) {
      // Gris neutro de verdad: sin el color de la acción, nadie lo confunde con algo pulsable.
      estilo.background = `${colorTexto}14`;
      estilo.color = `${colorTexto}66`;
      estilo.border = `1px solid ${colorTexto}1f`;
    } else if (capa) {
      // El velo va ENCIMA del color propio (dos capas), nunca reemplazándolo: así el botón
      // secundario, que es transparente, también reacciona.
      estilo.backgroundImage = `linear-gradient(${capa}, ${capa})`;
    }
    if (enfocado && !disabled) estilo.boxShadow = ANILLO_FOCO;

    return (
      <button
        type={tipo}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        title={ariaLabel}
        onMouseEnter={() => setEncima(true)}
        onMouseLeave={() => { setEncima(false); setPresionado(false); }}
        onMouseDown={() => setPresionado(true)}
        onMouseUp={() => setPresionado(false)}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        className={`${esFantasma ? 'font-semibold' : 'w-fit h-fit font-semibold'} transition-colors disabled:cursor-not-allowed ${className}`}
        style={{
          ...estilo,
          // 🎛️ Densidad y radio del pack: "denso" da un boton compacto, "movil" uno de 44px
          // comodo al tacto, "calido" y "escena" uno completamente redondeado.
          padding: esFantasma ? '0.375rem 0.625rem' : forma.altoPieza,
          borderRadius: forma.radioPieza,
          fontWeight: forma.pesoRotulo,
          // Los "terminados" que faltaban: un boton de "bento" o "calido" ahora levanta del
          // fondo, y uno de "denso" sigue plano a proposito. Apagada si esta deshabilitado:
          // una pieza apagada no puede parecer pulsable.
          // "none" se ve igual que no tener sombra, pero emitirlo cambiaria el HTML de las apps
          // que no pidieron nada. Un pack sin sombra no escribe la propiedad, y punto.
          boxShadow: (disabled || esFantasma) ? undefined
            : (enfocado ? ANILLO_FOCO : (forma.sombraPieza === 'none' ? undefined : forma.sombraPieza)),
          transitionDuration: forma.transicion,
          // 📏 El tamaño del texto es lo que mas separa un pack de otro a simple vista: un
          // "denso" a 13px y un "calido" a 16px no se parecen aunque compartan el color.
          fontSize: esFantasma ? `calc(${forma.escalaTexto} - 0.0625rem)` : forma.escalaTexto
        }}
      >
        {children}
      </button>
    );
  };

  // 🩹 "min-h-full flex flex-col": la celda de grilla (align-items:stretch por defecto en CSS
  // Grid) le da a la Tarjeta una altura resuelta para que un hijo directo con "flex-1" pueda
  // estirarse de verdad — esto es lo que necesitan tablas/listas largas dentro de un molde (ver
  // bug real, sesión anterior). Pero con "height:100%" (h-full) esa altura era un techo RÍGIDO:
  // si el contenido propio de la tarjeta (formularios, checkboxes, texto) pedía más alto que la
  // fila de sus vecinas, quedaba recortado con scroll interno en vez de crecer la página. Con
  // "min-h-full" sigue emparejando la altura de filas cortas, pero nunca recorta: crece más allá
  // si su propio contenido lo necesita (bug real, sesión actual — reportado en apps ya en prod).
  // 🐛 [BUG REAL 2026-08-15, pedido explícito del usuario: "el div inferior esta mas ancho que
  // la card exterior... eso hace que le corte un pedasito en la derecha... la card inferior no
  // esta en el centro completamente"] UI.Tarjeta es un <div> de bloque normal (sin "w-full"
  // propio, sin overflow) — si algo adentro (una fila flex sin wrap, texto largo sin "break",
  // etc.) pide más ancho del que hay disponible, ESE contenido sangra hacia afuera pasando el
  // borde/esquina redondeada de la card (la caja de la Tarjeta en sí NUNCA crece, solo lo que
  // desborda queda visualmente cortado por el borde derecho del viewport/grid en vez del borde
  // de la propia card) — se ve como si le faltara un pedacito a la línea que delimita la card.
  // ⚠️ [BUG REAL 2026-08-27, reportado por el usuario: "los select cuando se salen del formulario
  // quedan debajo del div y se cortan, y ese mismo div le está tapando el efecto de sombreado, lo
  // mismo que le pasaba a las cards de MEITI en las vitrinas"] Acá había un "overflow-x-hidden"
  // puesto para atajar esa fuga, y la nota de abajo decía "nunca overflow-hidden a secas porque
  // recortaría también el alto".
  //
  // La intención era correcta y el dato equivocado: por especificación de CSS, si UN eje es
  // "hidden" y el otro "visible", el navegador computa el segundo como "auto". O sea que
  // "overflow-x-hidden" recorta arriba y abajo IGUAL. Por eso se cortaban las dos únicas cosas que
  // se salen de la caja a propósito: la lista del desplegable y la sombra de la tarjeta al elevarse.
  //
  // Se saca, y la fuga horizontal se ataja donde corresponde: "min-w-0" deja que la card se encoja
  // dentro de su celda (un item flex tiene "min-width: auto" y por eso empujaba), y la pieza que de
  // verdad desbordaba —la tabla— YA tiene su propio "overflow-x-auto" adentro. Se contiene el ancho
  // en el elemento ancho, no recortando a todos sus padres.
  //
  // ── nota original, que queda porque explica de dónde venía la fuga ──
  // "overflow-x-hidden" (nunca "overflow-hidden" a secas: recortaría también el alto, que
  // "min-h-full" deja crecer a propósito, ver comentario arriba — ese es OTRO bug real ya
  // corregido antes, no hay que reintroducirlo) — clipea la fuga horizontal en el borde real de
  // la card, nunca en el borde del viewport.
  // 🎛️ El aire, el radio, el borde y la sombra salen del pack. Un "denso" apretado y un "bento"
  // amplio dejan de ser la misma tarjeta con otro color.
  const Tarjeta = ({ children, className = '' }) => {
    // 🎴 El ACENTO es lo que le da carácter a la tarjeta más allá del tamaño. "barra" es el mismo
    // tratamiento que las tarjetas de Mis Apps: una franja del color de marca al costado.
    const acento = forma.acentoTarjeta;
    const halo = acento === 'resplandor'
      ? `, 0 0 0 1px ${colorPrimario}1f, 0 12px 40px -18px ${colorPrimario}66`
      : '';
    return (
      <div
        // "meiti-tarjeta-viva" solo se pone donde hay elevación: levanta un pelo al pasar el mouse.
        // Vive en estiloMeiti.css y no inline porque :hover no existe en un style de React —
        // mismo criterio de siempre: lo que se repite va al vocabulario propio, no duplicado.
        className={`min-h-full flex flex-col min-w-0 ${forma.elevaAlPasar ? 'meiti-tarjeta-viva' : ''} ${className}`}
        style={{
          background: colorSuperficie,
          color: colorTexto,
          padding: forma.aireBloque,
          borderRadius: forma.radioBloque,
          // El shorthand va PRIMERO: lo que viene abajo tiene que poder pisarlo.
          border: forma.bordeBloque === '0' ? 'none' : `${forma.bordeBloque} solid ${colorPrimario}22`,
          ...(acento === 'barra' ? { borderLeft: `3px solid ${colorPrimario}` } : {}),
          ...(acento === 'linea' ? { borderTop: `2px solid ${colorPrimario}` } : {}),
          boxShadow: `${forma.sombraBloque === 'none' && !halo ? 'none' : (forma.sombraBloque === 'none' ? '' : forma.sombraBloque)}${halo}`.replace(/^, /, ''),
          transitionDuration: forma.transicion
        }}
      >
        {children}
      </div>
    );
  };

  // 'accion' es el boton que PERTENECE a este campo (el "Agregar" de un email, la lupa de un
  // buscador). Existe porque la alineacion de esa fila es una decision que el molde se olvidaba de
  // tomar: medido el 2026-08-29, 109 moldes ponian un boton al lado de un campo y solo 12 pedian
  // alinearlo. Adentro del campo no hay nada que olvidar: el boton va en la misma linea que el
  // input, debajo de la etiqueta, y no puede quedar en otro lado.
  const Campo = ({ etiqueta, tipo = 'text', valor, onChange, placeholder = '', opciones = [], filas = 3, accion = null }) => {
    // 🎨 [KIT UI 2026-08-14] Glow "vivo" al enfocar — mismo lenguaje visual que el input del
    // asistente de MEITI (ver estiloMeiti.css, ".meiti-input-vivo"), acá coloreado con el tema
    // real de cada app en vez de fijo en violeta. Las 4 variables CSS son "colorPrimario" + canal
    // alfa (mismo patrón hex+alfa que ya usa todo este kit) — ".meiti-campo-vivo" en estiloMeiti.css
    // las consume solo mientras el campo está en foco.
    // 🎛️ [2026-08-29] Antes acá vivía una SEGUNDA copia del estilo de campo, y esa duplicación era
    // la causa de que el desplegable se viera más grueso que el input de al lado: cada uno se
    // dimensionaba por su cuenta. Ahora hay una sola definición (arriba) y acá solo se agrega lo
    // que es propio del input.
    const estiloInput = {
      ...estiloInputBase,
      // ⚠️ El "padding" inline PISA el "pr-8" de la clase, que es el lugar reservado para el
      // botoncito de ayuda "?" — sin esto el texto del campo le pasa por debajo. Se repone acá:
      // 2rem es exactamente lo que valía ese "pr-8".
      paddingRight: '2rem',
    };
    // 🩹 [BUG REAL 2026-08-10] Los inputs no tenían "id"/"name" — Chrome DevTools lo marca como
    // problema de autofill ("A form field element should have an id or name attribute"), y en la
    // práctica el autofill de Android (Samsung Pass, etc.) identifica peor cada campo sin esto,
    // aumentando el riesgo de que una sugerencia de autofill interfiera con el campo equivocado.
    // Se deriva un id estable a partir de la etiqueta (única dentro de un mismo formulario en la
    // práctica) — sin etiqueta, cae a un id genérico por tipo.
    const idCampo = 'campo_' + (etiqueta || tipo).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    // ❓ [AYUDA DE CAMPO 2026-08-12, pedido explícito del usuario, versión final tras iterar] Mismo
    // problema que ya se encontró en un form de MEITI propio: un placeholder ("Ej: 3") explica el
    // campo SOLO hasta que el usuario carga un valor — apenas hay algo escrito, "3" solo ya no dice
    // qué es. Solución elegida: 100% automática, sin prop nueva — si "placeholder" viene con texto,
    // se agrega un "?" chico DENTRO del campo (borde derecho) que repite ese mismo texto como
    // tooltip al tocarlo. Nunca hace falta escribir la ayuda dos veces ni pasar nada extra — un
    // campo sin placeholder (ej. "Nombre" con solo la etiqueta) no muestra ningún ícono.
    // 🩹 [2026-08-12, pedido explícito del usuario: "aparte es solo si tiene un valor definido"] El
    // "?" NO aparece con el campo vacío — ahí el placeholder nativo ya está a la vista, sería ruido
    // redundante. Recién aparece cuando "valor" tiene contenido, que es el momento exacto en que el
    // placeholder nativo desaparece y deja de explicar nada.
    const [ayudaAbierta, setAyudaAbierta] = useState(false);
    const tieneValor = !!(valor ?? '').toString().trim();
    const ayudaEnCampo = placeholder && tieneValor && (tipo === 'textarea' || tipo !== 'select') && (
      <>
        <button
          type="button"
          onClick={() => setAyudaAbierta(v => !v)}
          aria-label={`Ayuda: ${placeholder}`}
          className="absolute right-2.5 top-2.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center opacity-70 hover:opacity-100"
          style={{ background: `${colorPrimario}33`, color: colorTexto }}
        >
          ?
        </button>
        {ayudaAbierta && (
          <span
            className="absolute z-20 top-full right-0 mt-1.5 max-w-[220px] w-max text-[11px] font-normal normal-case rounded-lg px-2.5 py-1.5 shadow-lg"
            style={{ background: colorSuperficie, color: colorTexto, border: `1px solid ${colorPrimario}33` }}
          >
            {placeholder}
          </span>
        )}
      </>
    );
    return (
      <div className="w-full">
        {etiqueta && (
          <label htmlFor={idCampo} className="block font-semibold mb-1.5 opacity-80" style={{
            color: colorTexto,
            // Un panel denso rotula en versalitas chicas; uno calido, en texto normal y grande.
            fontSize: `calc(${forma.escalaTexto} - 0.125rem)`,
            textTransform: forma.rotulo === 'mayuscula' ? 'uppercase' : 'none',
            letterSpacing: forma.rotulo === 'mayuscula' ? '0.06em' : 'normal'
          }}>
            {etiqueta}
          </label>
        )}
        <div className={accion ? 'flex items-stretch gap-2' : ''}>
        <div className="relative flex-1 min-w-0">
          {tipo === 'textarea' ? (
            <textarea id={idCampo} name={idCampo} rows={filas} value={valor} onChange={onChange} placeholder={placeholder} aria-label={etiqueta} className="meiti-campo-vivo w-full p-3 pr-8 rounded-xl outline-none resize-none" style={estiloInput} />
          ) : tipo === 'select' ? (
            // 🔽 [2026-08-26] Antes acá había un <select> nativo. Su lista la dibuja el SISTEMA
            // OPERATIVO: en Android sale blanca aunque la app sea oscura, y en Windows el elegido
            // se resalta con el azul del sistema. Ninguna hoja de estilos lo alcanza, así que la
            // lista pasa a vivir en el DOM (ver "Desplegable" arriba) y se pinta con el tema de la
            // app. De paso se fue el "Selecciona..." en voseo.
            //
            // El bug de 2026-08-07 que motivó el placeholder deshabilitado (un <select> controlado
            // en '' mostraba la primera opción como si estuviera elegida, sin que React se enterara)
            // ya no puede pasar: acá lo que se muestra sale de "valor", no del navegador. Si no hay
            // nada elegido se ve el texto guía, y no hay ninguna opción real marcada por accidente.
            <Desplegable
              id={idCampo}
              etiqueta={etiqueta}
              valor={valor}
              onCambio={onChange}
              opciones={opciones}
            />
          ) : tipo === 'date' ? (
            // 📅 [2026-08-28] Antes acá caía al <input type="date"> generico, y su calendario lo dibuja
            // el NAVEGADOR: colores del sistema, idioma del sistema, y en Android una hoja blanca aunque
            // la app sea oscura. Mismo problema y misma solucion que el <select>.
            <SelectorFecha
              id={idCampo}
              etiqueta={etiqueta}
              valor={valor}
              onCambio={onChange}
              placeholder={placeholder}
            />
          ) : (
            // 🩹 [BUG REAL 2026-09-11, reportado por el usuario en vivo con Cloudinary/Tap Io] Un
            // <input type="password"> sin autoComplete cae en la heurística default del navegador
            // ("current-password" en la práctica), así que Chrome/el gestor de contraseñas ofrece
            // autocompletar con CUALQUIER valor que haya guardado antes para ese campo — incluida
            // una prueba vieja de puro asteriscos, que termina reemplazando en silencio lo que el
            // usuario tipeó. Confirmado: la firma de Cloudinary se armaba con un secreto de 10
            // caracteres, los 10 el mismo asterisco. "new-password" le dice al navegador que es una
            // credencial NUEVA a ingresar, no una a autocompletar — mismo criterio que un campo de
            // "elegir contraseña" en cualquier formulario de alta.
            <input id={idCampo} name={idCampo} type={tipo} value={valor} onChange={onChange} placeholder={placeholder} aria-label={etiqueta} autoComplete={tipo === 'password' ? 'new-password' : undefined} className="meiti-campo-vivo w-full p-3 pr-8 rounded-xl outline-none" style={estiloInput} />
          )}
          {ayudaEnCampo}
        </div>
        {accion}
        </div>
      </div>
    );
  };

    // 🗂️ [2026-08-29] Pestañas. No se agrega "por si sirve": se midió que **11 moldes en 7 apps
    // distintas ya las arman a mano**, cada uno con su propio ancho, su propio resaltado y su propia
    // idea de cómo se ve la activa. Eso es exactamente la regla dura del proyecto — si se repite, se
    // escribe una vez y se le publica a la IA.
    //
    // Mismo criterio que el resto del kit: el tamaño y el radio salen del PACK, el color de la
    // activa es el de la app, y el texto sobre ella se elige midiendo luminancia (un primario claro
    // con texto blanco no se lee).
    const Pestanas = ({ pestanas = [], activa, onCambio, className = '' }) => {
      const lista = Array.isArray(pestanas) ? pestanas.filter(Boolean) : [];
      if (!lista.length) return null;
      const actual = lista.some((p) => p.id === activa) ? activa : lista[0].id;

      return (
        <div
          role="tablist"
          className={`flex items-center gap-1 p-1 overflow-x-auto ${className}`}
          style={{
            background: fondoInputFinal,
            borderRadius: forma.radioPieza,
            border: `1px solid ${colorPrimario}22`,
          }}
        >
          {lista.map((p) => {
            const esActiva = p.id === actual;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={esActiva}
                onClick={() => onCambio && onCambio(p.id)}
                className="flex items-center justify-center gap-2 whitespace-nowrap flex-1 transition-colors"
                style={{
                  // El relleno sale del pack, achicado igual que el desplegable compacto: una barra
                  // de pestañas es un control de navegación, no un campo de formulario.
                  padding: achicar(forma.altoPieza, 0.8),
                  borderRadius: forma.radioPieza,
                  fontSize: achicar(forma.escalaTexto, 0.95),
                  fontWeight: esActiva ? 600 : 500,
                  background: esActiva ? colorPrimario : 'transparent',
                  color: esActiva ? textoSobrePrimario : colorTexto,
                  opacity: esActiva ? 1 : 0.7,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                {p.icono && <i className={`${claseIcono(p.icono)} text-xs`}></i>}
                <span>{p.titulo}</span>
              </button>
            );
          })}
        </div>
      );
    };

  const Etiqueta = ({ children }) => (
    <span className="text-xs font-semibold uppercase tracking-wider opacity-70" style={{ color: colorTexto }}>
      {children}
    </span>
  );

  const EstadoVacio = ({ icono = 'fa-inbox', mensaje = 'Sin datos todavía' }) => (
    <div className="flex flex-col items-center justify-center py-10 opacity-60 text-center" style={{ color: colorTexto }}>
      <i className={`${claseIcono(icono)} text-3xl mb-3`}></i>
      <span className="text-sm">{mensaje}</span>
    </div>
  );

  const Chip = ({ children, tono = 'neutro' }) => {
    const tonos = {
      neutro: { background: `${colorPrimario}1a`, color: colorPrimario },
      exito: { background: '#16a34a1a', color: '#16a34a' },
      alerta: { background: '#f59e0b1a', color: '#f59e0b' },
      peligro: { background: '#dc26261a', color: '#dc2626' }
    };
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide" style={tonos[tono] || tonos.neutro}>
        {children}
      </span>
    );
  };

  // 🩹 BUG REAL CONFIRMADO (CarroElectrico, 2026-08-03; recurrencia PanelLuces, 2026-08-04):
  // alert() como respuesta a un error de fetch es un patrón que el propio prompt de Gemini
  // recomendaba, pero es NATIVO y BLOQUEANTE — en controles de mantener-presionado se encola uno
  // atrás de otro ("errores sin parar" reportado en vivo), y en la prueba automática de uso real
  // (ojo_optico.js) un alert() sin manejar congela toda la sesión de Puppeteer, haciendo que
  // acciones completamente ajenas se marquen "no respondió a la interacción". "Aviso" es el
  // reemplazo por defecto: no bloquea nada, se puede cerrar a mano, y el próximo intento lo
  // reemplaza solo. Renderiza null si "mensaje" es falsy — se usa directo como
  // "{errorAlgo && <UI.Aviso .../>}" o pasando el mensaje condicional sin wrappear.
  const Aviso = ({ mensaje, tono = 'peligro', onCerrar }) => {
    if (!mensaje) return null;
    // 🎨 [BUG REAL 2026-08-26] Acá vivían tres juegos de hex FIJOS pensados solo para superficie
    // oscura (texto #fca5a5/#fcd34d/#86efac sobre un fondo al 15%). Sobre una app de tema claro
    // —que es la mayoría— ese texto queda en ~2:1 contra el blanco: el aviso está ahí y no se lee.
    // Ahora el hue es el mismo siempre (verde es verde en toda app) pero el fondo, el borde y el
    // texto se arman según la superficie real. Ver "tono()" arriba.
    const t = tonoSemantico(tono);
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm" style={{ background: t.background, border: `1px solid ${t.border}`, color: t.color }}>
        <span><i className={`${claseIcono(t.icono)} mr-2`}></i>{mensaje}</span>
        {onCerrar && (
          // 🩹 [BUG REAL CONFIRMADO 2026-08-06, QATest3GPIO] Botón de solo ícono sin texto/
          // aria-label/title — invisible para el matcher de Ojo Óptico (busca por esos 3 campos,
          // ver ojo_optico.js), así que la prueba de uso real nunca podía cerrar un aviso de
          // error para seguir probando el resto de la pantalla.
          <button onClick={onCerrar} aria-label="Cerrar aviso" className="shrink-0 opacity-80 hover:opacity-100">
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>
    );
  };

  // 🧰 [LIBRERÍA OBLIGATORIA 2026-08-08] Misma familia que TablaDatos/MEITI.fetchDatos/fetchMutante
  // (mismo criterio: sacarle a la IA la responsabilidad de acordarse de algo en cada call site).
  // Bug real confirmado (CryptoDashboard, CD_PanelMercado): el Contrato de Altura/Scroll del
  // prompt ya prohibía "max-h-[300px] overflow-y-auto" con un ejemplo ❌/✅ — pero Gemini escribió
  // el mismo anti-patrón disfrazado de otra forma ("flex-1 overflow-y-auto" + un
  // "style={{ maxHeight: '600px' }}" inline aparte), una variante que el ejemplo textual no
  // mencionaba. Un componente ya armado con el patrón correcto hace que la violación quede
  // estructuralmente imposible en vez de solo desaconsejada por texto — nunca acepta ningún prop
  // de altura fija a propósito, así no hay forma de pedirle por accidente el mismo error.
  // 📏 [2026-08-29] "alto" no estaba, y el prompt lo venía enseñando desde que la pieza se publicó
  // ("<UI.ListaScrollable alto='24rem'>"). O sea que toda app que la usó como se le enseñó pasaba
  // una prop que la pieza IGNORABA en silencio: sin un padre flex de alto acotado, "flex-1" no
  // acota nada y la lista larga estira la página, que es justo lo que la pieza existe para evitar.
  // Se repone la prop documentada en vez de sacarla del prompt: la lista con tope propio es la que
  // sirve adentro de una tarjeta, y es la forma en que ya está escrita en las apps.
  const ListaScrollable = ({ children, className = '', alto }) => (
    <div className={`flex-1 overflow-y-auto ${className}`} style={alto ? { maxHeight: alto } : undefined}>
      {children}
    </div>
  );

  // 🧰 [LIBRERÍA OBLIGATORIA 2026-08-06] Misma familia que MEITI.fetchDatos/fetchMutante (ver
  // BLOQUE_LIBRERIA_OBLIGATORIA en oraculo.js) — la categoría "tabla_sin_editar" (tabla con
  // "Borrar" pero sin "Editar") seguía corroborándose en apps nuevas pese a estar documentada TRES
  // veces en el prompt (reglas 3b, 342, 609) — mismo patrón ya visto con "mutante_sin_validar_
  // respuesta": una instrucción en texto no es determinística, un LLM la puede saltear al escribir
  // la tabla a mano. Fix estructural: un componente ya armado que Gemini arma con datos, no con
  // JSX de tabla escrito a mano — si pasa "onEditar"/"onBorrar" ya le vienen los botones correctos
  // sin que tenga que acordarse de escribir ambos. Si igual pasa solo uno de los dos, el gap queda
  // VISIBLE (banner ámbar arriba de la tabla) en vez de silencioso — así una revisión humana u Ojo
  // Óptico lo detecta con solo mirar la pantalla, nunca queda escondido en el código.
  // "columnas[].tipo" cubre los formatos de celda más comunes en un mismo lugar ("variantes de
  // tabla por tipo en el mismo molde") en vez de que cada molde reinvente el parseo de fecha/
  // booleano/moneda a mano cada vez. Es SOLO transformación de dato a texto (función), nunca una
  // decisión de color/estilo — eso queda fuera de acá a propósito (el visual sigue otro camino,
  // ej. "UI.Chip" si el propio molde decide mostrar un valor como chip de color). "render" sigue
  // disponible como escape hatch para lo que estos tipos no cubran.
  const formatearCelda = (fila, columna) => {
    if (columna.render) return columna.render(fila);
    const valor = fila[columna.clave];
    if (valor === null || valor === undefined || valor === '') return '—';
    switch (columna.tipo) {
      case 'fecha': {
        const f = new Date(valor);
        return isNaN(f.getTime()) ? String(valor) : f.toLocaleDateString();
      }
      case 'booleano':
        return (valor === true || valor === 1 || valor === '1') ? 'Sí' : 'No';
      case 'moneda':
        return `$${Number(valor).toLocaleString()}`;
      case 'numero':
        return Number(valor).toLocaleString();
      default:
        return String(valor);
    }
  };

  // "accionesExtra": botones nombrados más allá de Editar/Borrar (ej. "Marcar leído", "Aprobar",
  // "Archivar") — mismo mecanismo (botón ya armado, el molde solo pasa etiqueta+onClick), para que
  // este tipo de acción tampoco se reinvente a mano en cada molde. "condicion(fila)" es opcional,
  // para acciones que solo aplican a algunas filas (ej. "Marcar leído" no tiene sentido si ya está
  // leída).
  // "advertirAccionIncompleta" (default true): el aviso de arriba asume que Editar+Borrar sueltos
  // es un descuido — pero hay dos casos legítimos donde NO lo es: (a) una tabla de solo lectura por
  // diseño (ej. un log/auditoría, donde editar no tiene sentido y solo se puede borrar) y (b)
  // ocultar una acción según el ROL del usuario actual (ej. "onBorrar={esAdmin ? borrarFila :
  // undefined}", leyendo el rol vía la misma tabla que ya usa BASE__PanelRolesPermisos) — para un
  // usuario sin permiso, ver el aviso de "falta Editar" sería confuso, no un bug real. En cualquiera
  // de los dos casos, pasa "advertirAccionIncompleta={false}" a propósito para apagar el aviso.
  // 🩹 [BUG REAL 2026-09-01] Renombrado del slug viejo (lista_sin_ui_tabladatos, tabla_sin_editar)
  // al formato de ruta de la taxonomía de 2026-08-25 — el viejo nunca hizo match tras la
  // migración, ver REGEX_CURA en server.js.
  // CURA: diseno/listas/dibujada-a-mano, diseno/listas/sin-accion-editar
  // 🎛️ [2026-08-27] La tabla también sigue al pack, en sus dos cosas propias: cuánto pesa la línea
  // que separa las filas y cuánto respira cada celda. "denso" existe justamente para que quepan
  // muchas filas a la vista, y hasta ahora se veía igual que "cálido".
  const separadorFila = forma.separadores === 'ninguno'
    ? '1px solid transparent'
    : `1px solid ${colorPrimario}${forma.separadores === 'marcados' ? '55' : '22'}`;
  // La celda respira la mitad que un bloque: un padding de tarjeta adentro de una fila la infla.
  const celdaPadding = forma.altoPieza;

  const TablaDatos = ({ columnas, datos, claveId = 'id', onEditar, onBorrar, accionesExtra = [], advertirAccionIncompleta = true, vacioMensaje = 'Sin datos todavía' }) => {
    if (!datos || datos.length === 0) return <EstadoVacio mensaje={vacioMensaje} />;
    const tieneAcciones = !!(onEditar || onBorrar || accionesExtra.length > 0);
    const accionesIncompletas = advertirAccionIncompleta && ((onEditar && !onBorrar) || (!onEditar && onBorrar));
    return (
      <div className="w-full">
        {accionesIncompletas && (
          <div className="mb-2 text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#f59e0b26', color: '#fcd34d' }}>
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>
            Esta tabla solo pasa "{onEditar ? 'onEditar' : 'onBorrar'}" a UI.TablaDatos — suma también "{onEditar ? 'onBorrar' : 'onEditar'}" (el usuario tiene que poder corregir un dato sin borrar y recrear el registro), o si es a propósito (solo lectura, o depende del rol) pasa "advertirAccionIncompleta={false}".
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {columnas.map((c, i) => (
                  <th key={c.clave || i} className="text-left opacity-70 font-semibold uppercase tracking-wide text-xs" style={{ padding: celdaPadding }}>{c.etiqueta}</th>
                ))}
                {tieneAcciones && <th className="text-right opacity-70 font-semibold uppercase tracking-wide text-xs" style={{ padding: celdaPadding }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {datos.map((fila, i) => (
                <tr key={fila[claveId] ?? i} style={{ borderTop: separadorFila }}>
                  {columnas.map((c, j) => (
                    <td key={c.clave || j} style={{ padding: celdaPadding }}>{formatearCelda(fila, c)}</td>
                  ))}
                  {tieneAcciones && (
                    <td className="text-right whitespace-nowrap" style={{ padding: celdaPadding }}>
                      {/* 🎨 [2026-08-26, observación del usuario: "una palabra roja de borrar y una
                          violeta de editar no combina con el diseño"] Eran <button> sueltos con
                          color inline y un "hover:opacity-80" — sin foco de teclado, sin estado
                          apagado y sin ninguno de los estados del botón real del kit. Ahora son el
                          MISMO UI.Boton que el resto de la app, en su variante fantasma: sin fondo
                          en reposo para no competir con el dato, y con hover, foco y apagado
                          iguales a los de cualquier otro botón. Una acción de tabla deja de ser
                          una excepción visual. */}
                      <span className="inline-flex items-center gap-1 justify-end">
                        {accionesExtra.filter(a => !a.condicion || a.condicion(fila)).map((a, k) => {
                          const etiquetaResuelta = typeof a.etiqueta === 'function' ? a.etiqueta(fila) : a.etiqueta;
                          return (
                            <Boton
                              key={k}
                              variante={a.tono === 'peligro' ? 'fantasma-peligro' : a.tono === 'exito' ? 'fantasma-exito' : 'fantasma'}
                              ariaLabel={etiquetaResuelta}
                              onClick={() => a.onClick(fila)}
                            >
                              {/* 🖼️ [2026-08-27, pedido del usuario (voseo-ok: cita textual, se deja como él la escribió): "los botones de las tablas
                                  dejalos en los iconos con el color del tema, sin texto, así en
                                  vista teléfono molestan menos"] El texto se va a "ariaLabel", que
                                  además pinta el tooltip — un botón sin texto NO puede quedarse
                                  mudo para un lector de pantalla. Si la acción no trae ícono se
                                  conserva el texto: sin una cosa ni la otra el botón sería
                                  invisible. */}
                              {a.icono ? <i className={claseIcono(a.icono)}></i> : etiquetaResuelta}
                            </Boton>
                          );
                        })}
                        {onEditar && (
                          <Boton variante="fantasma" ariaLabel="Editar" onClick={() => onEditar(fila)}>
                            <i className="fa-solid fa-pen"></i>
                          </Boton>
                        )}
                        {onBorrar && (
                          <Boton variante="fantasma-peligro" ariaLabel="Borrar" onClick={() => onBorrar(fila)}>
                            <i className="fa-solid fa-trash"></i>
                          </Boton>
                        )}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 📝 [LISTA DE ÍTEMS 2026-10-05, pedido del usuario: "¿por qué sigue apareciendo este bug?"] La
  // familia "diseno/listas" (dibujada-a-mano, sin-accion-editar) salió en 4 de 18 apps en una
  // noche, y la cirugía no la curaba nunca (SOLUCION_NO_CONFIRMADA). Los 4 casos eran la misma
  // cosa: listas CORTAS adentro de otra pantalla (el checklist de una nota, las tareas de una
  // sección, los horarios de un coach, las acciones de un resumen). La regla exigía UI.TablaDatos,
  // que es una tabla con columnas: para un checklist es peor diseño, así que la IA la dibujaba a
  // mano. El kit no tenía la pieza correcta; ahora la tiene.
  //
  // Una fila por ítem: casilla opcional (si se pasa "onAlternar"), el texto, un secundario opcional,
  // y las acciones Editar (en el lugar, sin salir de la pantalla) y Borrar. Con "onAgregar" aparece
  // el campo para sumar un ítem al pie. Igual que en TablaDatos, las acciones son UI.Boton fantasma
  // con ícono, y si se pasa solo una de Editar/Borrar no queda silencioso.
  // Sin alto fijo ni scroll interno a propósito: la lista crece con la tarjeta (ver la receta de
  // render/contenedores/alto-fijo-con-scroll).
  // CURA: diseno/listas/dibujada-a-mano, diseno/listas/sin-accion-editar
  const ListaItems = ({
    items, claveId = 'id', campoTexto = 'texto', campoHecho, secundario,
    onAlternar, onEditar, onBorrar, onAgregar,
    placeholder = 'Agregar...', vacioMensaje = 'Sin ítems todavía', advertirAccionIncompleta = true
  }) => {
    const [editandoId, setEditandoId] = useState(null);
    const [textoEdicion, setTextoEdicion] = useState('');
    const [nuevo, setNuevo] = useState('');
    const lista = items || [];
    const accionesIncompletas = advertirAccionIncompleta && ((onEditar && !onBorrar) || (!onEditar && onBorrar));
    const confirmarEdicion = (item) => {
      const texto = textoEdicion.trim();
      if (texto && texto !== String(item[campoTexto] ?? '')) onEditar(item, texto);
      setEditandoId(null);
    };
    const agregar = () => {
      const texto = nuevo.trim();
      if (!texto) return;
      onAgregar(texto);
      setNuevo('');
    };
    // Hereda el campo del kit: la fila de agregar y la edición en el lugar tienen que verse
    // iguales al Campo del formulario de al lado.
    const estiloInput = { ...estiloInputBase, width: '100%', outline: 'none' };
    return (
      <div className="w-full">
        {accionesIncompletas && (
          <div className="mb-2 text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#f59e0b26', color: '#fcd34d' }}>
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>
            Esta lista solo pasa "{onEditar ? 'onEditar' : 'onBorrar'}" a UI.ListaItems — suma también "{onEditar ? 'onBorrar' : 'onEditar'}", o si es a propósito pasa "advertirAccionIncompleta={'{false}'}".
          </div>
        )}
        {lista.length === 0 && !onAgregar && <EstadoVacio icono="fa-list-check" mensaje={vacioMensaje} />}
        <ul className="flex flex-col">
          {lista.map((item, i) => {
            const id = item[claveId] ?? i;
            const hecho = campoHecho ? !!item[campoHecho] && item[campoHecho] !== '0' : false;
            const editando = editandoId === id;
            return (
              <li key={id} className="flex items-center gap-2" style={{ borderTop: i > 0 ? separadorFila : 'none', padding: `${celdaPadding} 0` }}>
                {onAlternar && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={hecho}
                    aria-label={hecho ? 'Marcar como pendiente' : 'Marcar como hecho'}
                    onClick={() => onAlternar(item, !hecho)}
                    className="shrink-0 flex items-center justify-center"
                    style={{ width: '1.15rem', height: '1.15rem', borderRadius: '0.3rem', border: `2px solid ${colorPrimario}`, background: hecho ? colorPrimario : 'transparent', color: colorSuperficie }}
                  >
                    {hecho && <i className="fa-solid fa-check text-[10px]"></i>}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  {editando ? (
                    <input
                      autoFocus
                      value={textoEdicion}
                      onChange={(e) => setTextoEdicion(e.target.value)}
                      onBlur={() => confirmarEdicion(item)}
                      onKeyDown={(e) => { if (e.key === 'Enter') confirmarEdicion(item); if (e.key === 'Escape') setEditandoId(null); }}
                      style={estiloInput}
                    />
                  ) : (
                    <>
                      <div className="text-sm break-words" style={{ color: colorTexto, textDecoration: hecho ? 'line-through' : 'none', opacity: hecho ? 0.55 : 1 }}>
                        {String(item[campoTexto] ?? '')}
                      </div>
                      {secundario && secundario(item) && (
                        <div className="text-xs opacity-60" style={{ color: colorTexto }}>{secundario(item)}</div>
                      )}
                    </>
                  )}
                </div>
                {!editando && (onEditar || onBorrar) && (
                  <span className="inline-flex items-center gap-1 shrink-0">
                    {onEditar && (
                      <Boton variante="fantasma" ariaLabel="Editar" onClick={() => { setEditandoId(id); setTextoEdicion(String(item[campoTexto] ?? '')); }}>
                        <i className="fa-solid fa-pen"></i>
                      </Boton>
                    )}
                    {onBorrar && (
                      <Boton variante="fantasma-peligro" ariaLabel="Borrar" onClick={() => onBorrar(item)}>
                        <i className="fa-solid fa-trash"></i>
                      </Boton>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {onAgregar && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1">
              <input
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregar(); }}
                placeholder={placeholder}
                style={estiloInput}
              />
            </div>
            <Boton variante="secundario" ariaLabel="Agregar" onClick={agregar}><i className="fa-solid fa-plus"></i></Boton>
          </div>
        )}
      </div>
    );
  };

  // 💬 El chat, con el tema de la app ya puesto. Un molde escribe "<UI.Chat historial={...}
  // valor={...} onCambio={...} onEnviar={...} />" y se acabó: el layout, el campo que crece, el
  // modo lectura, el anclaje al teclado y el auto-scroll ya vienen resueltos.
  //
  // El claro/oscuro se DEDUCE de la superficie de la app, no se elige: una app de tema oscuro con
  // el chat en paleta clara queda con texto gris sobre fondo negro. Se mide la luminancia de
  // "superficie" con los coeficientes estándar de percepción (el ojo ve el verde mucho más claro
  // que el azul, por eso no es un promedio simple).
  //
  // ⚠️ PENDIENTE para cuando se arme el molde base del asistente de máquina: hoy esto resuelve el
  // claro/oscuro, pero los acentos del chat siguen siendo los violetas de MEITI. Falta pasarle los
  // colores reales del tema de cada app.
  const esSuperficieOscura = (() => {
    const hex = String(colorSuperficie || '').replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
  })();
  // 🎙️ [MIC 2026-09-04, pedido explícito del usuario] Un molde escribe "<UI.Chat valor={...}
  // onCambio={...} .../>" y nunca sabe que el mic existe. Se inyecta acá, con el MISMO
  // "valor"/"onCambio" que el molde ya declaró, para que quede prendido gratis en cualquier chat
  // del kit sin que cada molde tenga que cablearlo. Si el molde YA pasó su propio
  // "debajoDelCampo", eso gana (nunca se pisa lo que el molde pidió a propósito).
  const Chat = (props) => {
    const [errorVoz, setErrorVoz] = useState(null);
    const { soportado: soportaVoz, escuchando, alternarVoz } = useDictadoPorVoz(props.valor || '', props.onCambio || (() => {}), setErrorVoz);
    const botonVoz = soportaVoz ? (
      <button
        type="button"
        onClick={alternarVoz}
        aria-pressed={escuchando}
        title={escuchando ? 'Detener el dictado' : 'Dictar por voz'}
        className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full border transition-colors ${escuchando ? 'bg-peligro-tinte border-peligro-suave text-peligro animate-pulse' : 'bg-superficie border-borde text-texto-suave hover:text-acento hover:border-acento-suave'}`}
      >
        <i className={`fa-solid ${escuchando ? 'fa-stop' : 'fa-microphone'} text-[11px]`}></i>
      </button>
    ) : null;
    return (
      <ChatMeiti
        tono={esSuperficieOscura ? 'oscuro' : 'claro'}
        {...props}
        error={props.error || errorVoz}
        debajoDelCampo={props.debajoDelCampo || botonVoz}
      />
    );
  };

  const PIEZAS = { Boton, Tarjeta, Campo, Etiqueta, EstadoVacio, Chip, Aviso, TablaDatos, ListaItems, ListaScrollable, Chat, Desplegable, SelectorFecha, Pestanas };

  // 🛟 [2026-08-26] El mismo agujero que los íconos, sin tapar hasta hoy. Si un molde escribe
  // "<UI.Algo>" y "Algo" no está en el kit, React recibe undefined como tipo de elemento — el
  // error #130 — y eso NO rompe esa pieza: TIRA ABAJO EL MOLDE ENTERO. Es exactamente lo que costó
  // dos pantallas de VideoNet con un ícono inventado, y con UI.* podía volver a pasar igual.
  //
  // La diferencia con un ícono es importante y define el reemplazo: un ícono es decoración y se
  // puede sustituir por otro dibujito, pero un componente LLEVA CONTENIDO. Si el reemplazo no lo
  // muestra, la pantalla no se cae pero queda muda, que para el dueño de la app es casi igual de
  // malo. Así que el reemplazo dibuja lo que le pasaron: los children si los hay, y si no, el
  // primer texto que venga en las props que el propio kit usa por convención (mensaje, texto,
  // titulo, etiqueta). Se pierde el estilo de esa pieza; no se pierde la información.
  //
  // Mismos cuidados que en los íconos: solo responde por nombres que parecen componente (empiezan
  // con mayúscula), porque React consulta "$$typeof", "prototype" y símbolos sobre cualquier objeto
  // que recibe; avisa una vez por nombre; y Object.keys sigue devolviendo las piezas reales, así
  // que el prompt y cualquier chequeo ven lo mismo que antes.
  const CLAVES_CON_TEXTO = ['mensaje', 'texto', 'titulo', 'etiqueta', 'children'];
  const piezasInventadasAvisadas = new Set();
  const piezaDeReemplazo = (nombre) => {
    const Reemplazo = (props = {}) => {
      const contenido = props.children != null
        ? props.children
        : (CLAVES_CON_TEXTO.map(k => props[k]).find(v => typeof v === 'string' && v.trim()) || null);
      if (contenido == null) return null;
      return <div className="text-sm" style={{ color: colorTexto }}>{contenido}</div>;
    };
    Reemplazo.displayName = `UI.${nombre} (no existe)`;
    return Reemplazo;
  };

  return new Proxy(PIEZAS, {
    get(objetivo, propiedad, receptor) {
      if (Reflect.has(objetivo, propiedad)) return Reflect.get(objetivo, propiedad, receptor);
      if (typeof propiedad !== 'string' || !/^[A-Z]/.test(propiedad)) return undefined;
      if (!piezasInventadasAvisadas.has(propiedad)) {
        piezasInventadasAvisadas.add(propiedad);
        console.warn(`[ KIT ] Pieza inexistente pedida por un molde: "UI.${propiedad}". Se dibuja su contenido sin estilo. Las piezas reales son: ${Object.keys(objetivo).join(', ')}.`);
      }
      return piezaDeReemplazo(propiedad);
    }
  });
};
