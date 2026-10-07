import React, { useState, useEffect, useRef } from 'react';
import FilaDeslizable from '../comunes/FilaDeslizable';
import { construirSvgIcono } from '../backend/iconosAppsData.js';
import { t } from '../comunes/textos';

// ╔══════════════════════════════════════════════════════════════════════════════════════════════╗
// ║  💬  CHAT MEITI — la librería de chat con IA del proyecto                                     ║
// ╚══════════════════════════════════════════════════════════════════════════════════════════════╝
//
// [2026-08-19, pedido del usuario: "crea un archivo bonito con esto que estas creando, una nueva
// libreria de chat para ia tipo meiti personalizado"]
//
// Todo lo que hace falta para poner un chat con IA en MEITI vive acá. No es un envoltorio sobre una
// librería de terceros: se escribió a mano a propósito, porque los asistentes de MEITI no son un
// chat genérico — emiten marcadores que el backend interpreta ([PREGUNTA], [DATOS_LISTOS]), viven
// dentro de pantallas que además tienen otras fases, y la landing tiene que abrir rápido para
// alguien que llega de un anuncio (una librería de markdown completa son ~40 kB para cubrir
// sintaxis que estos prompts nunca producen).
//
// ── QUÉ HAY ADENTRO ───────────────────────────────────────────────────────────────────────────
//   <BurbujaChat>            Un mensaje. Markdown liviano, y el asistente escribe a lo ancho.
//   <IndicadorEscribiendo>   Los tres puntitos, alineados con los mensajes del asistente.
//   <ModoChat>               El layout: mensajes que ocupan lo que sobra + barra fija abajo.
//   <BarraEntradaChat>       Campo de escribir + etiquetas + ayuda, con todo su comportamiento.
//   useAltoAutomatico()      El campo crece con el texto en vez de recortarlo.
//   useAvisoEscribiendo()    Avisarle al resto de la página que el teclado está abierto.
//
// ── LAS TRES REGLAS QUE LO EXPLICAN TODO ──────────────────────────────────────────────────────
//
//   1. NINGUNA MEDIDA ESCRITA A MANO. Este chat estuvo armado con alturas medidas en una pantalla
//      puntual (76px, 320px, 60dvh, un espaciador vacío de 123px) y se rompía en cualquier otra —
//      se "arregló" tres veces cambiando unos números por otros. Reparte el navegador; lo único
//      que se mide se mide en vivo, con ResizeObserver.
//
//   2. EL CAMPO DE ESCRIBIR NO SE MUEVE. Nunca con el scroll. Solo con el teclado, y en las dos
//      pantallas por igual (la inicial y la del chat andando). Es la referencia fija de la
//      pantalla: si se corre, la persona pierde el hilo de dónde estaba.
//
//   3. CON EL TECLADO ABIERTO, TODO LO DEMÁS SE CORRE. Etiquetas, botón de soporte, título de la
//      página: en un teléfono no entran junto al teclado, y lo que importa en ese momento es leer
//      lo que uno escribe. Nada desaparece del todo — se pliega y vuelve al cerrar el teclado.
//
// ── DE DÓNDE SALIÓ ────────────────────────────────────────────────────────────────────────────
// [CHAT UNIFICADO 2026-08-18, pedido explícito del usuario: "los chat de asistentes no
// mantienen el comportamiento de un chat normal con ia, ni la apariencia, eso espanta a la gente"
// + "revisa todos los campos de chat no solo el asistente" + "todos tienen los mismos deficits"
// + "quiero que esten unificados mismo estilo mismo comportamiento"]
//
// QUÉ PASABA: había SIETE chats en el producto (crear app, industrial, LegoPanel, soporte,
// servicios, editor con Claude, y los dos de Mis apps) y cada uno tenía su propia copia del mismo
// marcado de burbuja, escrito a mano. Ya habían divergido entre sí —unos en text-sm y otros en
// text-base, anchos máximos de 80%, 85% y 90%, cuatro de los siete sin auto-scroll— y, sobre todo,
// arrastraban todos el mismo defecto de fondo:
//
//   El texto del asistente se pintaba con "{m.texto}" pelado. React colapsa los saltos de línea,
//   así que una respuesta que la IA escribió como tres párrafos o una lista de pasos llegaba a la
//   pantalla como UN SOLO PARRAFÓN, y los "**" de la negrita y los "-" de las viñetas se veían
//   crudos. No era un problema de gusto: cualquier persona que haya usado ChatGPT o Claude nota en
//   el primer mensaje que este chat no se comporta como los que conoce.
//
// Este archivo es la ÚNICA definición de cómo se ve y se comporta un mensaje en MEITI. Mismo
// criterio que ya seguían ".meiti-chat-*" (estiloMeiti.css) para el layout: si vive en un solo
// lugar, ningún chat puede volver a divergir por su cuenta.

// 🎨 Los dos fondos sobre los que se dibuja un chat en el producto. "oscuro" existe solo por el
// editor con Claude de dev-tools (panel slate-950); todo lo que ve un usuario normal es "claro".
const PALETAS = {
  claro: {
    textoAsistente: 'text-texto-medio',
    codigoInline: 'bg-relleno text-acento-fuerte',
    bloqueCodigo: 'bg-inverso text-emerald-300',
    bordeBloque: 'border-slate-800',
    vineta: 'text-acento-vivo',
    avatar: 'bg-acento-tinte-2 text-acento'
  },
  oscuro: {
    textoAsistente: 'text-slate-100',
    codigoInline: 'bg-inverso text-acento-vivo',
    bloqueCodigo: 'bg-inverso text-emerald-300',
    bordeBloque: 'border-slate-700',
    vineta: 'text-acento-vivo',
    avatar: 'bg-acento-vivo/20 text-acento-vivo'
  }
};

function BotonCopiar({ texto }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch (e) {
      // Sin permiso de portapapeles (http, o el usuario lo bloqueó) — el código igual está a la
      // vista y se puede seleccionar a mano. Nunca romper el mensaje por esto.
    }
  };
  return (
    <button
      type="button"
      onClick={copiar}
      className="text-[11px] text-texto-suave hover:text-slate-200 transition-colors"
    >
      <i className={`fa-solid ${copiado ? 'fa-check' : 'fa-copy'} mr-1`}></i>
      {copiado ? 'Copiado' : t('copy')}
    </button>
  );
}

// ✍️ Markdown liviano, escrito a mano a propósito en vez de sumar una librería: los asistentes de
// MEITI escriben prosa conversacional con negritas y listas de pasos, nunca tablas ni encabezados
// ni links de referencia. Una librería de markdown completa serían ~40 kB de bundle en la LANDING
// (la página que tiene que abrir rápido para alguien que llega de un anuncio) para cubrir sintaxis
// que nadie usa acá. Lo que sí se cubre es exactamente lo que los prompts producen de verdad.
//
// ⚠️ Todo se arma con elementos de React, NUNCA con dangerouslySetInnerHTML: este texto viene de un
// modelo de IA y, en el chat de soporte, incluye texto que escribió el propio usuario. Pintarlo
// como HTML sería dejar entrar cualquier etiqueta que la IA repita de lo que le mandaron.

// Negrita (**así**) y código inline (`así`) dentro de una línea suelta.
const conFormatoInline = (texto, paleta, claveBase) => {
  const partes = String(texto).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return partes.map((parte, i) => {
    if (!parte) return null;
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
      return <strong key={`${claveBase}-${i}`} className="font-semibold">{parte.slice(2, -2)}</strong>;
    }
    if (parte.startsWith('`') && parte.endsWith('`') && parte.length > 2) {
      return (
        <code key={`${claveBase}-${i}`} className={`${paleta.codigoInline} px-1.5 py-0.5 rounded text-[0.9em] font-mono`}>
          {parte.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${claveBase}-${i}`}>{parte}</React.Fragment>;
  });
};

// Un bloque de texto (sin ``` ) → párrafos y listas. Las líneas en blanco separan párrafos, igual
// que en cualquier chat de IA; una línea que arranca con "- ", "* " o "1. " es un ítem de lista.
const renderizarTexto = (texto, paleta, claveBase) => {
  const lineas = String(texto).split('\n');
  const bloques = [];
  let listaAbierta = null;

  const cerrarLista = () => {
    if (!listaAbierta) return;
    bloques.push(
      <ul key={`${claveBase}-l${bloques.length}`} className="my-1.5 space-y-1">
        {listaAbierta.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className={`${paleta.vineta} shrink-0`}>{item.marca}</span>
            <span className="min-w-0">{conFormatoInline(item.texto, paleta, `${claveBase}-li${i}`)}</span>
          </li>
        ))}
      </ul>
    );
    listaAbierta = null;
  };

  lineas.forEach((linea, i) => {
    const viñeta = linea.match(/^\s*[-*]\s+(.*)$/);
    const numerada = linea.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (viñeta) {
      listaAbierta = listaAbierta || [];
      listaAbierta.push({ marca: '•', texto: viñeta[1] });
      return;
    }
    if (numerada) {
      listaAbierta = listaAbierta || [];
      listaAbierta.push({ marca: `${numerada[1]}.`, texto: numerada[2] });
      return;
    }
    cerrarLista();
    if (!linea.trim()) return; // línea en blanco: ya separa por el espaciado entre párrafos
    bloques.push(
      <p key={`${claveBase}-p${i}`} className="whitespace-pre-wrap">
        {conFormatoInline(linea, paleta, `${claveBase}-p${i}`)}
      </p>
    );
  });
  cerrarLista();
  return bloques;
};

// Mensaje completo: separa los bloques de código (```) del resto y arma cada parte.
const renderizarContenido = (contenido, paleta) => {
  const partes = String(contenido || '').split(/```[a-zA-Z]*\n?/);
  return partes.map((parte, i) => {
    const esCodigo = i % 2 === 1;
    if (!parte.trim()) return null;
    if (esCodigo) {
      const codigo = parte.replace(/\n$/, '');
      return (
        <div key={i} className={`my-2 rounded-lg overflow-hidden ${paleta.bloqueCodigo}`}>
          <div className={`flex justify-end px-3 py-1.5 border-b ${paleta.bordeBloque}`}>
            <BotonCopiar texto={codigo} />
          </div>
          <pre className="text-xs whitespace-pre-wrap break-all font-mono px-3 py-3">{codigo}</pre>
        </div>
      );
    }
    return <div key={i} className="space-y-2">{renderizarTexto(parte, paleta, `b${i}`)}</div>;
  });
};

/**
 * Un mensaje del chat.
 *
 * 🎨 LA APARIENCIA, Y POR QUÉ CAMBIÓ: antes los dos lados eran una burbuja gris o violeta, el
 * formato de los chats de mensajería (WhatsApp). Un chat con IA se lee distinto: lo que responde
 * el asistente son párrafos largos que hay que LEER, no frases sueltas que se escanean. Metidos en
 * una burbuja gris angosta al 80%, esos párrafos se ven apretados y ajenos. Por eso el asistente
 * ahora escribe a lo ancho, como texto normal con su ícono al lado —igual que ChatGPT o Claude—, y
 * la burbuja violeta queda solo para lo que escribió la persona, que sí son frases cortas y ahí
 * el globo ayuda a distinguir de un vistazo quién dijo qué.
 */
// 👤 [2026-08-30] "icono" existe porque no todo chat es con la IA. En el chat vendedor↔probador
// el que responde es una PERSONA, y el microchip de MEITI ahi decia una mentira: el probador leia la
// respuesta del vendedor como si se la hubiera escrito el asistente. Es un parametro y no una copia
// de la burbuja porque hay UN chat en el sistema, no siete.
export function BurbujaChat({ rol, children, texto, tono = 'claro', extra = null, icono = 'fa-microchip' }) {
  const paleta = PALETAS[tono] || PALETAS.claro;
  const contenido = texto !== undefined ? texto : children;

  if (rol === 'usuario') {
    return (
      <div className="flex justify-end">
        {/* "group" para que "extra" pueda aparecer solo al pasar el mouse (el lápiz de editar en la
            pantalla de revisión del wizard industrial). */}
        <div className="group max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-acento text-white text-[15px] leading-relaxed break-words flex items-start gap-2">
          <span className="whitespace-pre-wrap min-w-0">{contenido}</span>
          {extra}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 items-start">
      <div className={`shrink-0 w-7 h-7 rounded-full ${paleta.avatar} flex items-center justify-center text-xs mt-0.5`}>
        <i className={`fa-solid ${icono}`}></i>
      </div>
      <div className={`min-w-0 flex-1 ${paleta.textoAsistente} text-[15px] leading-relaxed break-words space-y-2`}>
        {typeof contenido === 'string' ? renderizarContenido(contenido, paleta) : contenido}
        {extra}
      </div>
    </div>
  );
}

// ⌨️ [2026-08-19, pedido del usuario: "el boton de soporte teclado arriba se esconde en un plegable
// al costado, deja solo el indicio de que sigue ahi... teclado abajo escribiendo off, toque afuera
// de pantalla, sale desplegable soporte expandido"]
//
// "Estoy escribiendo" tiene que llegar a piezas que NO son hijas del chat: el botón de soporte es
// flotante y se monta una sola vez para todo el sitio (App.tsx), del otro lado del árbol. Pasarle
// una prop implicaría subir este estado hasta la raíz y bajarlo por todos lados, solo para un
// detalle visual.
//
// En vez de eso se marca el <body>, que es el único lugar que las dos partes comparten, y el resto
// lo resuelve CSS (estiloMeiti.css). Es un canal de una sola dirección y un solo dato — nadie puede
// "leer" el estado por accidente ni quedarse con una copia vieja: al desmontarse, se limpia.
export function useAvisoEscribiendo(escribiendo) {
  useEffect(() => {
    document.body.classList.toggle('meiti-escribiendo', !!escribiendo);
    return () => document.body.classList.remove('meiti-escribiendo');
  }, [escribiendo]);
}

/**
 * 🧱 [MODO CHAT AUTOAJUSTABLE 2026-08-18, pedido del usuario: "el campo de entrada a una altura
 * fija donde se vean las tags de ejemplos y todo lo que se escribe se mueve detrás del campo de
 * entrada, el campo no se mueve" + "sería autoajustable, no definido por parámetros fijos"]
 *
 * POR QUÉ EXISTE: el chat estaba armado a fuerza de números medidos a mano — la caja de mensajes
 * "76px", después "320px en desktop", "min(60dvh, 480px) en teléfono", más un espaciador vacío de
 * "123px" cuyo único trabajo era empujar el campo de escribir hasta el mismo píxel donde estaba en
 * la pantalla anterior. Cada uno de esos números se midió en UNA pantalla puntual, así que en
 * cualquier otra el campo se corría, y ya se habían arreglado varias veces seguidas justamente por
 * eso. El problema no era ninguno de los números: era medir en vez de dejar que el navegador
 * reparta.
 *
 * CÓMO FUNCIONA AHORA, sin una sola medida escrita a mano:
 *  - Los mensajes ocupan TODO lo que sobre de alto ("flex:1"). Si la pantalla es chica ocupan poco,
 *    si es grande ocupan mucho, y no hay que actualizar nada.
 *  - La barra de abajo (campo de escribir + tags de ejemplo) se dibuja ENCIMA de los mensajes, no
 *    debajo. Por eso el campo no se mueve nunca y la conversación le pasa por atrás.
 *  - El espacio que la barra le roba a los mensajes se mide sola con ResizeObserver: el campo
 *    crece al escribir, los tags se acomodan en más o menos filas según el ancho, y el hueco se
 *    ajusta solo en el mismo momento. Ese es el único "número", y lo calcula el navegador.
 */
// 🖼️ [2026-08-19] ¿Este chat vive dentro de una ventana flotante (un modal, el panel de
// soporte) o directo en el flujo de la página? Cambia las dos cosas que ModoChat hace por su cuenta:
//
//  - El borde de abajo: en la página, el borde real es el de la PANTALLA, y si el contenedor termina
//    antes (por su respiro) hay que compensar. En una ventana flotante, el borde real es el de LA
//    VENTANA — compensar ahí le sacaría la barra por fuera de la esquina redondeada.
//  - El acomodo de los contenedores: una ventana flotante ya define su propio alto, y meterle mano
//    puede desarmarla.
//
// Se detecta por el "position" de los contenedores, que es lo que de verdad distingue una cosa de la
// otra, en vez de que cada pantalla tenga que declararlo.
const dentroDeVentanaFlotante = (nodo) => {
  let actual = nodo?.parentElement;
  for (let i = 0; i < 8 && actual && actual !== document.body; i++) {
    const posicion = window.getComputedStyle(actual).position;
    if (posicion === 'fixed' || posicion === 'absolute') return true;
    actual = actual.parentElement;
  }
  return false;
};

// "embebido": el chat es una caja acotada dentro de una pantalla que tiene otras cosas (el editor
// con Claude es un panel al lado de la lista de moldes), no la pantalla entera. Entonces no se
// estira hasta el borde de abajo ni le toca el alto a sus contenedores — llena el suyo y nada más.
// Es una variación real que los parámetros expresan, en vez de un archivo aparte.
// 🧱 [2026-08-22, pedido del usuario: "vamos a dividir la consola negra en el cuadro de
// chatear y el campo de entrada afuera para escribir, separados"]
//
// "barraAfuera" cambia una sola cosa, y es la que importa: por defecto la barra va ABSOLUTA dentro
// de la caja (el chat a pantalla completa la ancla al fondo y los mensajes le reservan hueco). Con
// barraAfuera, caja y barra son HERMANAS: la caja contiene solo la conversacion y el campo vive
// como bloque aparte debajo.
//
// Se usa donde el chat es un panel y no la pantalla entera — ahi el anclaje no aporta nada y el
// campo terminaba pegado arriba, dentro de la misma caja oscura, sin separacion visual entre
// "lo que se lee" y "lo que se escribe".
export function ModoChat({ mensajes, barra, encabezado = null, className = '', embebido = false, separarDelBorde = false, barraAfuera = false, cajaInterna = false }) {
  const raizRef = useRef(null);
  const barraRef = useRef(null);
  const [altoBarra, setAltoBarra] = useState(0);
  // Cuánto le tapa la barra a los mensajes, medido en vivo (ver "medir" más abajo). Distinto de
  // "altoBarra": la barra puede estar corrida hacia arriba y tapar más de lo que mide.
  const [huecoBarra, setHuecoBarra] = useState(0);
  // 📏 [BUG REAL 2026-08-26, reportado por el usuario: "queda mucho espacio entre el campo y la
  // pantalla negra"] La caja termina donde el layout la deja, pero la barra se corre hacia abajo
  // para llegar al teclado — y entre las dos queda aire. En Crear App no se nota porque el chat ya
  // llega al borde de la pantalla (corrimiento 0); en el editor hay contenido debajo, así que el
  // chat termina antes y el aire aparece. Medido en el editor real: consola hasta 639, barra desde
  // 744 → 104px de hueco. Se resuelve con UNA medida real, la distancia del techo de la caja al
  // techo de la barra, que sirve para los dos casos: si la barra tapa, la caja se achica; si la
  // barra se fue para abajo, la caja se estira hasta ella. 0 = todavía sin medir.
  const [altoCajaInterna, setAltoCajaInterna] = useState(0);
  const [desfaseAbajo, setDesfaseAbajo] = useState(0);

  // 📐 [2026-08-19, reporte del usuario: "en Lego Panel el teclado queda separado del campo de
  // chat... tiene un espacio entre el teclado y el campo de entrada"] La barra se ancla al borde de
  // ABAJO de este componente, y ese borde no siempre es el borde de la pantalla: Lego Panel vive
  // dentro de ".meiti-contenedor-pagina", que reserva 4rem de respiro abajo, así que el campo
  // flotaba 64px por encima del teclado. Crear App nunca lo tuvo porque no usa ese contenedor.
  //
  // Se arregla ACÁ y no en cada página a propósito (señalado por el usuario: "la librería que hiciste
  // no es común en esos parámetros?"). Tenía razón: si cada página que hospeda un chat tiene que
  // acordarse de anular su propio respiro de abajo, la que se olvide vuelve a tener el hueco — que
  // es exactamente lo que veníamos sacando del proyecto. El chat se ancla solo, sea cual sea el
  // contenedor que lo rodee.
  //
  // Se mide, no se resta un número conocido (regla 1): cuánto le falta al borde de abajo de este
  // componente para llegar al borde de la pantalla. Donde ya llega —Crear App— da 0 y no cambia nada.
  // 🧬 [2026-08-19, misma observación del usuario que el punto de entrada único] Lo último que
  // la página todavía tenía que acordarse: para que el campo de escribir pueda quedar fijo abajo,
  // la columna que sostiene al chat no puede crecer con su contenido — tiene que tomar el alto que
  // sobra. Eso obligaba a cada página a sumar "flex-1 min-h-0 flex flex-col" a mano, y a llevar un
  // estado propio para saber cuándo ponerlo. La que se olvidara, no tenía campo fijo.
  //
  // Ahora lo hace el chat: al montarse sube por sus contenedores hasta el que scrollea, y los deja
  // en condiciones. Al desmontarse los devuelve EXACTAMENTE como estaban — se guarda el valor
  // previo de cada propiedad que toca, no se "limpia" a un valor supuesto, así que una página que
  // ya venía con su propio layout no queda alterada al salir del chat.
  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz) return;
    if (embebido || dentroDeVentanaFlotante(raiz)) return;

    // 👁️ [BUG REAL 2026-08-26, con 3 screenshots del usuario del editor en el teléfono] Dos fallas
    // con la misma raíz: este arreglo del layout corría UNA sola vez al montar y no se enteraba de
    // nada después.
    //   1. La consola y el campo aparecían en la pestaña de los MOLDES, donde el chat tiene que
    //      estar escondido. El editor lo esconde con la clase "hidden" (display:none) sin
    //      desmontarlo — y este código le ponía "display:flex" INLINE al contenedor, que le gana a
    //      la clase. O sea: lo destapaba él mismo.
    //   2. Al entrar la primera vez, el campo caía encima del texto de la página y los íconos se
    //      encimaban; con un toque se acomodaba. Es el mismo problema visto de otra forma: al
    //      montar, la lista de moldes y las pestañas todavía se estaban acomodando, así que las
    //      medidas se tomaban sobre un layout que en un instante más iba a ser otro.
    //
    // Ahora: no se toca lo que ya está bien (si un contenedor YA es flex en columna, se lo deja en
    // paz — así "hidden" sigue mandando cuando el editor lo esconde), se aborta si el chat está
    // invisible, y se vuelve a revisar cada vez que el chat cambia de tamaño (que es lo que pasa
    // cuando se abre, se cierra, o la página termina de acomodarse).
    const esVisible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    let tocados = [];
    let anchosTocados = [];
    let aplicado = false;

    const deshacer = () => {
      tocados.forEach(({ el, previo }) => {
        el.style.display = previo.display;
        el.style.flexDirection = previo.flexDirection;
        el.style.minHeight = previo.minHeight;
        el.style.flex = previo.flex;
      });
      anchosTocados.forEach(({ el, previo }) => { el.style.width = previo; });
      tocados = [];
      anchosTocados = [];
      aplicado = false;
    };

    const aplicar = () => {
      // 📐 [BUG REAL 2026-08-26, screenshot del editor angosto] Convertir un contenedor a
      // "display:flex" cambia lo que significan los márgenes automáticos de sus hijos: en bloque,
      // "margin-inline:auto" con ancho automático ocupa TODO y centra; en flex, los márgenes
      // automáticos se comen el espacio libre y el hijo se encoge a su contenido. El editor vive
      // dentro de "max-w-5xl mx-auto", así que al treparle el chat quedaba angosto y centrado.
      // Medido: hijo con mx-auto en contenedor bloque 375px → forzado a flex 8px → con
      // "width:100%" vuelve a 375px. Darle ancho definido no le saca el centrado: si hay
      // "max-width", el ancho se topa ahí y los márgenes automáticos siguen centrándolo igual.
      let hijo = raiz; // la raíz ya trae "w-full", así que no necesita ayuda
      let actual = raiz.parentElement;
      // Tope de 8 saltos: si en 8 contenedores no apareció el que scrollea, algo cambió mucho en el
      // layout del sitio y es preferible no seguir subiendo hasta el <body>.
      for (let i = 0; i < 8 && actual && actual !== document.body; i++) {
        const estilo = window.getComputedStyle(actual);
        // Escondido: no hay layout que arreglar, y forzarlo sería destaparlo. Se deshace lo que se
        // haya tocado más abajo y se espera a que se muestre (el observador de abajo lo avisa).
        if (estilo.display === 'none') { deshacer(); return; }
        const scrollea = estilo.overflowY === 'auto' || estilo.overflowY === 'scroll';
        tocados.push({
          el: actual,
          previo: {
            display: actual.style.display,
            flexDirection: actual.style.flexDirection,
            minHeight: actual.style.minHeight,
            flex: actual.style.flex
          }
        });
        // Solo se toca lo que hace falta. Si el contenedor ya es flex en columna por su clase, se
        // lo deja como está: escribirle el estilo inline le ganaría después a un "hidden" de la
        // misma clase, que es exactamente el bug 1 de arriba.
        if (estilo.display !== 'flex') actual.style.display = 'flex';
        if (estilo.flexDirection !== 'column') actual.style.flexDirection = 'column';
        actual.style.minHeight = '0';
        // Al que scrollea no se le toca el "flex": ya tiene el suyo y es el que define el alto real.
        if (!scrollea) actual.style.flex = '1 1 0%';
        // "actual" es flex: su hijo en el camino necesita ancho definido para que un "mx-auto" suyo
        // no lo encoja al contenido.
        if (hijo !== raiz) {
          anchosTocados.push({ el: hijo, previo: hijo.style.width });
          hijo.style.width = '100%';
        }
        if (scrollea) break;
        hijo = actual;
        actual = actual.parentElement;
      }
      aplicado = true;
    };

    const revisar = () => {
      const visible = esVisible(raiz);
      if (visible && !aplicado) aplicar();
      else if (!visible && aplicado) deshacer();
    };

    revisar();

    // 🔔 El aviso de "ahora sí estoy visible". Un ResizeObserver NO alcanza: mientras el chat está
    // dentro de un "display:none" no tiene caja, y medido acá no dispara al destaparse. Lo que sí
    // se puede mirar es lo que la página realmente hace para mostrarlo: cambiarle la CLASE al
    // contenedor. Se vigila el atributo de los contenedores del camino (son pocos y cambian poco),
    // y ahí se vuelve a revisar. Los estilos que escribe este mismo efecto también disparan el
    // aviso, pero "revisar" es idempotente: si ya está aplicado y sigue visible, no hace nada.
    const cadena = [];
    for (let el = raiz.parentElement, i = 0; i < 8 && el && el !== document.body; i++, el = el.parentElement) {
      cadena.push(el);
    }
    const vigias = [];
    if (typeof MutationObserver !== 'undefined') {
      const mo = new MutationObserver(revisar);
      cadena.forEach(el => mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] }));
      vigias.push(() => mo.disconnect());
    }
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(revisar);
      ro.observe(raiz);
      cadena.forEach(el => ro.observe(el));
      vigias.push(() => ro.disconnect());
    }
    return () => {
      vigias.forEach(parar => parar());
      deshacer();
    };
  }, [embebido]);

  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz) return;
    if (embebido || dentroDeVentanaFlotante(raiz)) return;
    const medirDesfase = () => {
      // 🚫 [BUG REAL 2026-08-26, reportado por el usuario: "al entrar la primera vez queda mucho
      // espacio entre el campo y la pantalla negra"] Escondido (display:none en algún contenedor)
      // el chat NO TIENE CAJA: su rect da todo cero, y esta cuenta daba la pantalla ENTERA de
      // desfase. Medido en el editor real: desfase 812 → la barra terminaba en 1451, o sea 571px
      // por debajo del borde de la pantalla, con 743px de hueco entre la consola y el campo. Y como
      // nada la volvía a medir al destaparse, quedaba así hasta que algo la obligara (ese toque que
      // "la acomodaba"). Medir sin caja es peor que no medir: acá no se mide.
      if (!(raiz.offsetWidth || raiz.offsetHeight || raiz.getClientRects().length)) return;
      // "clientHeight" del documento y no "visualViewport": tiene que estar en el mismo sistema de
      // coordenadas que getBoundingClientRect. Con el teclado abierto esta medida ya se achica sola
      // gracias a "interactive-widget=resizes-content" (index.html).
      const brecha = document.documentElement.clientHeight - raiz.getBoundingClientRect().bottom;
      setDesfaseAbajo(brecha > 0 ? Math.round(brecha) : 0);
    };
    medirDesfase();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medirDesfase);
    observador.observe(raiz);
    // 📏 [2026-08-26, segundo screenshot del usuario: al entrar la primera vez el campo caía encima
    // del texto de la página y con un toque se acomodaba] Un ResizeObserver avisa cuando algo cambia
    // de TAMAÑO, no de LUGAR. Al cargar, la lista de moldes y las pestañas se terminan de acomodar y
    // empujan al chat hacia abajo sin cambiarle el tamaño: el desfase seguía siendo el del primer
    // instante, y la barra quedaba donde ya no correspondía hasta que algo la obligara a medir de
    // nuevo (ese toque). Mirando también el alto del documento, cualquier cosa que se acomode arriba
    // o abajo dispara una medición nueva.
    observador.observe(document.body);
    // 🔔 El mismo aviso que usa el arreglo de contenedores de arriba, y por el mismo motivo: dentro
    // de un "display:none" no hay caja que observar, así que un ResizeObserver no se entera de que
    // el chat se destapó. Lo que sí se ve es lo que la página hace para mostrarlo: cambiarle la
    // clase al contenedor. Ahí se mide, ahora sí con caja.
    const cadena = [];
    for (let el = raiz.parentElement, i = 0; i < 8 && el && el !== document.body; i++, el = el.parentElement) {
      cadena.push(el);
      observador.observe(el);
    }
    let vigia = null;
    if (typeof MutationObserver !== 'undefined') {
      vigia = new MutationObserver(medirDesfase);
      cadena.forEach(el => vigia.observe(el, { attributes: true, attributeFilter: ['class', 'style'] }));
    }
    window.addEventListener('resize', medirDesfase);
    return () => {
      observador.disconnect();
      vigia?.disconnect();
      window.removeEventListener('resize', medirDesfase);
    };
  }, []);

  useEffect(() => {
    const barraEl = barraRef.current;
    if (!barraEl) return;
    const medir = () => {
      const alto = barraEl.offsetHeight;
      setAltoBarra(alto);
      // 📏 [BUG REAL 2026-08-20, reportado por el usuario: "en la vista inicial se ve el texto
      // pisado por las etiquetas"] Lo que la barra le tapa a los mensajes NO es su alto. En PC la
      // barra se sube 28px para dejar aire abajo, así que cubre 28px MÁS de lo que mide. La cuenta
      // vieja restaba el desfase pero no sumaba esa separación: reservaba 174px cuando tapaba 202,
      // y el saludo quedaba 14px por debajo del borde de las etiquetas (medido: saludo 582→612,
      // barra desde 598).
      // Ahora no se deduce: se MIDE la distancia real entre el borde de abajo del chat y el borde de
      // arriba de la barra. Da igual cuántas cosas la muevan — separación de escritorio, desfase del
      // contenedor, o lo que venga después.
      const raizEl = raizRef.current;
      if (raizEl) {
        const rectRaiz = raizEl.getBoundingClientRect();
        const rectBarra = barraEl.getBoundingClientRect();
        setHuecoBarra(Math.max(0, Math.round(rectRaiz.bottom - rectBarra.top)));
        // La caja tiene que llegar EXACTAMENTE al techo de la barra, esté la barra adentro o más
        // abajo. Como la caja arranca en el techo de la raíz, su alto es esa distancia.
        setAltoCajaInterna(Math.max(0, Math.round(rectBarra.top - rectRaiz.top)));
      }
      // 🆘 [2026-08-19] El mismo número le sirve al botón flotante de soporte, que se monta una sola
      // vez para todo el sitio (App.tsx) y no tiene forma de saber que abajo hay una barra de chat:
      // sin esto se dibuja justo encima del botón de enviar. Se publica como variable de CSS en el
      // <body> —el único lugar que las dos partes comparten— y el botón se levanta solo lo que mida
      // la barra en ese momento, que cambia cuando el campo crece o las etiquetas se pliegan.
      document.body.style.setProperty('--meiti-alto-barra-chat', `${alto}px`);
    };
    medir();
    if (typeof ResizeObserver === 'undefined') return () => document.body.style.removeProperty('--meiti-alto-barra-chat');
    const observador = new ResizeObserver(medir);
    observador.observe(barraEl);
    // 📱 [BUG REAL 2026-09-06, reportado por el usuario: "en modo chat apenas deja un par de
    // líneas para leer los mensajes"] Este observador solo miraba el TAMAÑO de la barra, igual que
    // el bug de arriba (2026-08-20) con el hueco. Pero acá lo que se movía era la RAÍZ del chat, no
    // la barra: en el Asistente de Contenido embebido, el contenido de arriba (selector de app,
    // encabezado) termina de acomodarse después del primer render y empuja la raíz hacia arriba sin
    // cambiarle el tamaño a la barra. Medido en producción real: altoCajaInterna quedaba en 135
    // cuando la geometría actual pedía 445. La caja de mensajes se achicaba a un par de líneas y
    // dejaba ~310px de hueco vacío entre ella y el campo. Mismo remedio que ya usa medirDesfase
    // para el mismo tipo de bug: mirar también la raíz y su cadena de contenedores (tamaño Y clase),
    // para que cualquier acomodo arriba dispare una medición nueva.
    const raizEl = raizRef.current;
    const cadena = [];
    if (raizEl) {
      observador.observe(raizEl);
      observador.observe(document.body);
      for (let el = raizEl.parentElement, i = 0; i < 8 && el && el !== document.body; i++, el = el.parentElement) {
        cadena.push(el);
        observador.observe(el);
      }
    }
    let vigia = null;
    if (raizEl && typeof MutationObserver !== 'undefined') {
      vigia = new MutationObserver(medir);
      cadena.forEach(el => vigia.observe(el, { attributes: true, attributeFilter: ['class', 'style'] }));
    }
    return () => {
      observador.disconnect();
      vigia?.disconnect();
      // Al salir del chat la barra ya no existe: si quedara la variable, el botón de soporte se
      // quedaría flotando a media pantalla en todas las demás pantallas.
      document.body.style.removeProperty('--meiti-alto-barra-chat');
    };
    // 📏 [BUG REAL 2026-08-20, reportado por el usuario: "en las demás páginas el mensaje está
    // más alto — dejémoslo a la misma altura, pensé que era la misma librería para todos"]
    // Es la misma librería: lo que fallaba era CUÁNDO medía. En las páginas cuyo contenedor tiene
    // respiro propio (Servicios y Lego, dentro de ".meiti-contenedor-pagina" con 4rem abajo) el chat
    // termina 64px antes del borde de la pantalla y la barra baja esos 64px para llegar igual. Pero
    // el hueco se medía ANTES de que ese desfase estuviera aplicado, y nada lo volvía a medir: el
    // observador mira el TAMAÑO de la barra, y correrla de lugar no la cambia de tamaño.
    // Resultado medido: la variable decía 202px donde correspondían 138, y el saludo quedaba 78px
    // sobre la barra en vez de 14 como en Crear App y AutoMach.
    // Con "desfaseAbajo" como dependencia, apenas se conoce el desfase se vuelve a medir.
  }, [desfaseAbajo]);

  // ↓ [2026-08-20, pedido del usuario: "cuando hay una conversación larga y scrolleo para buscar
  //   mensajes anteriores, falta la flechita en el borde del campo de regresar"]
  //
  // Con la columna invertida, estar al día es "scrollTop en 0" — el borde de abajo es el principio.
  // El umbral de 40px, y no una comparación exacta: los navegadores devuelven fracciones, y a un
  // píxel de distancia nadie se siente perdido. El botón tiene que aparecer cuando de verdad te
  // fuiste a mirar hacia atrás, no por un roce del dedo.
  const [lejosDelUltimo, setLejosDelUltimo] = useState(false);
  const cajaMensajesRef = useRef(null);

  useEffect(() => {
    const caja = cajaMensajesRef.current;
    if (!caja) return;
    const revisar = () => setLejosDelUltimo(Math.abs(caja.scrollTop) > 40);
    revisar();
    caja.addEventListener('scroll', revisar, { passive: true });
    return () => caja.removeEventListener('scroll', revisar);
  }, []);

  const volverAlUltimo = () => {
    cajaMensajesRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🩹 [2026-08-26, tercer reporte del usuario: "ahora solo veo la pantalla negra, nada más"]
  // LA CAUSA, medida en el código y no supuesta: la barra va anclada POR DEBAJO del borde de abajo
  // del chat (bottom: calc(-1 * --meiti-desfase), en estiloMeiti.css) — así es como llega al borde
  // de la pantalla aunque el chat termine antes. El editor le pasa al chat un className con
  // "overflow-hidden" (la caja negra redondeada), y overflow-hidden recorta al borde de su caja:
  // la barra, que vive fuera de ese borde, se recortaba ENTERA. De ahí los tres síntomas juntos:
  // sin campo visible, la consola ocupando todo, y el texto de abajo trepando.
  //
  // "cajaInterna" separa las dos cosas que estaban encimadas en un solo elemento:
  //   · la RAÍZ queda transparente y sin recorte — es el marco de posición de la barra, igual que
  //     en el asistente, que justamente no lleva overflow-hidden.
  //   · el LOOK (la caja negra) baja al bloque que scrollea, que ahora termina exactamente donde
  //     empieza la barra: paddingBottom = huecoBarra, la MISMA medida real que ya se toma para no
  //     tapar mensajes (raíz.bottom - barra.top). Por eso la consola queda apoyada sobre el campo
  //     en vez de pasarle por debajo, y el campo queda pegado al teclado.
  // Sin bucle: el padding no mueve el borde de abajo de la raíz, que es contra lo que se mide.
  const clasesLook = cajaInterna
    ? className.split(/\s+/).filter(c => c && !c.startsWith('overflow-')).join(' ')
    : '';

  const caja = (
    <div
      ref={raizRef}
      className={`relative flex-1 min-h-0 w-full flex flex-col ${cajaInterna ? '' : className}`}
      style={undefined}
    >
      {/* 📌 [2026-08-20, idea del usuario: "reutiliza lo que funciona bien — el hook del campo de
          entrada al fondo y al teclado, igual para el mensaje: orden más reciente primero"]
          Tenía razón, y era el cambio de enfoque que faltaba. El campo NUNCA persigue el fondo: está
          anclado a él. Los mensajes sí lo perseguían — llegaba uno nuevo y recién ahí se scrolleaba—
          y por eso había que adivinar el momento justo: tres intentos, y cada uno arreglaba un
          tamaño de pantalla y rompía el otro (PC 74px sin recorrer / teléfono 172px, alternando).
          Con "column-reverse" el ancla es el borde de abajo: el mensaje más reciente va PRIMERO en el
          DOM y el navegador lo mantiene pegado solo, sin scrollear nada. Un mensaje nuevo empuja a
          los viejos hacia arriba en vez de correr la vista. No hay momento que acertar porque no hay
          nada que perseguir. Y subir a releer sigue funcionando igual. */}
      <div
        ref={cajaMensajesRef}
        className={`meiti-chat-caja-mensajes flex-1 min-h-0 overflow-y-auto chat-scroll-fino flex flex-col-reverse ${cajaInterna ? clasesLook : 'px-1'}`}
        style={cajaInterna && altoCajaInterna > 0 ? { height: `${altoCajaInterna}px`, flex: 'none' } : undefined}
      >
        {/* Adentro el orden es NORMAL (viejo → nuevo): el que invierte es el contenedor de afuera, y
            con un solo hijo eso solo significa "apoya el bloque contra el borde de abajo". Así quien
            usa la librería sigue pasando los mensajes como siempre y no se entera de nada. */}
        {/* El hueco que hay que dejar libre abajo es el alto de la barra MENOS lo que ella bajó
            fuera de este componente: si se corrió 64px hacia el respiro de la página, esos 64px ya
            no tapan mensajes y reservarlos dejaría un vacío muerto.
            Viaja como variable CSS y no como padding directo porque la SEPARACIÓN entre el último
            mensaje y el campo cambia según la pantalla (pedido del usuario: cero en teléfono, un
            poco en PC) — y eso lo decide el CSS, no este cálculo. Ver estiloMeiti.css. */}
        {/* 📌 [2026-08-20, pedido del usuario: "deja las apps ok, pero el mensaje va abajo cerca de
            las cards — ese es del chat y está pegado arriba a las apps"] La vitrina de apps NO es un
            mensaje: es contenido de la página, y se queda arriba. El saludo sí es un mensaje, y como
            todo mensaje tiene que vivir pegado al campo de escribir.
            Estaban juntos en el mismo bloque, así que al subir el bloque se subieron los dos. Ahora
            son hermanos: en la columna invertida, el que va PRIMERO queda abajo (los mensajes) y
            "margin-bottom:auto" empuja al otro hasta el tope (la vitrina). */}
        <div
          className="meiti-chat-mensajes-bloque flex flex-col gap-5"
          style={{ '--meiti-hueco-barra': `${cajaInterna ? 0 : huecoBarra}px` }}
        >
          {mensajes}
        </div>
        {encabezado && (
          <div className="meiti-chat-encabezado shrink-0">{encabezado}</div>
        )}
      </div>
      {/* ↓ Vuelve al último mensaje. Aparece solo si te alejaste, y va anclado ARRIBA de la barra
          usando su alto real medido (el mismo que reserva el hueco de los mensajes), así nunca queda
          tapado por el campo ni flotando lejos de él. */}
      {lejosDelUltimo && (
        <button
          type="button"
          onClick={volverAlUltimo}
          aria-label={t('chat_back_to_last')}
          className="absolute left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-superficie border border-borde shadow-md text-texto-suave hover:text-acento hover:border-acento-suave transition-colors flex items-center justify-center"
          style={{ bottom: `calc(${huecoBarra}px + 0.75rem)` }}
        >
          <i className="fa-solid fa-arrow-down text-xs"></i>
        </button>
      )}

      {/* El desfase viaja como VARIABLE, no como "bottom" inline: así el CSS puede combinarlo con la
          separación de escritorio en una sola cuenta. Con el bottom inline, el desfase le ganaba a
          la clase y una página cuyo contenedor tiene respiro propio (Servicios) se quedaba sin el
          aire de PC que sí tenía Crear App. */}
      {/* Con "barraAfuera" este bloque no existe: la barra se dibuja como hermana de la caja,
          abajo del cierre. */}
      {!barraAfuera && (
        <div
          ref={barraRef}
          className={`absolute inset-x-0 meiti-chat-barra ${separarDelBorde ? 'meiti-chat-barra--separada' : ''}`}
          style={{ '--meiti-desfase': `${desfaseAbajo}px` }}
        >
          {barra}
        </div>
      )}
    </div>
  );

  // La barra afuera: caja y campo como hermanos, con aire entre los dos. Sin "absolute" y sin
  // reservar hueco — nada se superpone, asi que no hay nada que medir.
  if (barraAfuera) {
    return (
      <div className="flex-1 min-h-0 w-full flex flex-col gap-3">
        {caja}
        <div ref={barraRef} className="shrink-0">{barra}</div>
      </div>
    );
  }

  return caja;
}

/**
 * 📱 [2026-08-18, encontrado mirando el wizard en 375px a pedido del usuario: "falta la vista de
 * telefono"] El campo de escribir tenía un alto fijo ("rows"), medido en una pantalla ancha. En un
 * teléfono la misma frase ocupa el doble de líneas, así que al escribir algo de dos renglones —lo
 * más normal del mundo cuando alguien está explicando qué app necesita— el texto se iba para arriba
 * y NO SE VEÍA LO QUE ESTABA ESCRIBIENDO. Se puede corregir a ciegas, pero nadie hace eso: se
 * borra y se escribe menos, que es exactamente lo contrario de lo que necesita una entrevista.
 *
 * Ahora el campo crece con el texto, como cualquier chat, hasta un tope a partir del cual scrollea
 * solo. El tope existe para que en un teléfono el campo no se coma la conversación entera.
 */
// 🩹 [2026-08-19, reporte del usuario: "al escribir la primera vez, en lo que empezás a tipear un
// carácter, se agranda el campo de texto de entrada"] Era un salto real y tenía una causa concreta:
// al enfocar el campo aparece el botón de etiquetas adentro, y con él el espacio reservado arriba
// para que el texto arranque abajo. Pero el alto solo se recalculaba cuando cambiaba el TEXTO, así
// que entre el foco y la primera tecla el campo se quedaba con el alto viejo — y el ajuste caía
// todo junto, de golpe, sobre la primera letra.
// "recalcularCon" existe para eso: cualquier cosa que cambie el tamaño del campo sin cambiar su
// texto tiene que entrar por acá, o el salto vuelve.
export function useAltoAutomatico(refCampo, valor, altoMaximoPx = 160, recalcularCon = null) {
  useEffect(() => {
    const campo = refCampo.current;
    if (!campo) return;

    const ajustar = () => {
      // 🚫 [BUG REAL 2026-08-26, visto en el editor con sesión real] Escondido (display:none en
      // algún contenedor) el campo no tiene caja: su scrollHeight da 0 y esto le fijaba
      // "height: 0px". Al destaparse quedaba aplastado en una línea —pidiendo 72px, renderizando
      // 24— con el texto cortado y los íconos encimados. Medido en el editor real: inline
      // height 0px, scrollHeight 72, alto renderizado 24. Sin caja no se mide.
      if (!(campo.offsetWidth || campo.offsetHeight || campo.getClientRects().length)) return false;
      // 'auto' primero y sí o sí: sin resetear, scrollHeight nunca puede volver a ACHICARSE (se
      // queda con el alto grande de antes), así que al borrar texto el campo quedaría estirado.
      campo.style.height = 'auto';
      const alto = Math.min(campo.scrollHeight, altoMaximoPx);
      campo.style.height = `${alto}px`;
      campo.style.overflowY = campo.scrollHeight > altoMaximoPx ? 'auto' : 'hidden';
      return true;
    };

    // Si ahora no se puede medir, se espera a que el campo aparezca. Mismo criterio que el resto
    // del chat: dentro de un display:none no hay caja que observar, así que el aviso confiable es
    // el cambio de clase en los contenedores de arriba.
    if (ajustar() || typeof MutationObserver === 'undefined') return;
    const vigia = new MutationObserver(() => { if (ajustar()) vigia.disconnect(); });
    for (let el = campo.parentElement, i = 0; i < 8 && el && el !== document.body; i++, el = el.parentElement) {
      vigia.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
    }
    return () => vigia.disconnect();
  }, [valor, recalcularCon, refCampo, altoMaximoPx]);
}

/**
 * El asistente está escribiendo. Alineado con el mismo ícono que sus mensajes, para que la
 * respuesta aparezca exactamente donde ya estaban los tres puntitos y no salte de lugar.
 */
export function IndicadorEscribiendo({ tono = 'claro' }) {
  const paleta = PALETAS[tono] || PALETAS.claro;
  return (
    <div className="flex gap-2.5 items-start">
      {/* 🧠 [2026-08-19] El ícono late mientras piensa — ver ".meiti-chat-avatar-pensando" en
          estiloMeiti.css. El mismo ícono que firma cada respuesta del asistente es el que avisa que
          está por llegar la próxima. */}
      <div className={`shrink-0 w-7 h-7 rounded-full ${paleta.avatar} flex items-center justify-center text-xs mt-0.5 meiti-chat-avatar-pensando`}>
        <i className="fa-solid fa-microchip"></i>
      </div>
      <div className="flex items-center gap-1.5 h-7">
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⌨️  LA BARRA DE ESCRIBIR
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Las etiquetas de ejemplo, en una fila que se desliza.
 *
 * 🏷️ [2026-08-19, pedido del usuario: "las etiquetas ponlas en ese mismo horizontal deslizable pero
 * en la parte superior del campo de entrada, con este comportamiento: teclado arriba, escribiendo,
 * cursor on → etiquetas plegadas, guardadas, escondidas, solo un tag que dice etiquetas; click
 * afuera de pantalla, teclado abajo → etiquetas fuera, desplegadas, deslizante horizontal"]
 *
 * Arriba del campo y no abajo porque abajo es donde aparece el teclado: ahí quedaban aplastadas
 * contra él o directamente tapadas. Y plegadas mientras se escribe porque en ese momento no son
 * una ayuda —ya sabes qué vas a escribir— y sí le sacan renglones a la conversación.
 *
 * El único tag que queda ("Etiquetas") no es decorativo: al tocarlo se cierra el teclado, que es
 * exactamente lo que hay que hacer para volver a verlas. Sin él no habría forma de recuperarlas sin
 * adivinar que hay que tocar en cualquier lado.
 */
/**
 * 🏷️ Arma las etiquetas de ejemplo a partir de DATOS.
 *
 * [2026-08-19, reporte del usuario: "las etiquetas, excepto la de crear apps, no tienen iconos,
 * están peladitas"] Y era el mismo patrón de siempre: Crear App armaba el ícono a mano en su propio
 * archivo, así que las otras tres pantallas nacieron sin él — nadie decidió que fueran distintas,
 * simplemente el cómo dibujarlo vivía en un solo lugar y no era compartido.
 *
 * Ahora cada pantalla declara solo QUÉ dice cada ejemplo y de qué rubro es; el ícono lo pone esta
 * función, del mismo pack curado que usan las apps del marketplace y Mis apps.
 *
 *   ejemplos:   [{ texto, categoria, color, alElegir? }]
 *   alElegir:   qué hacer al tocar uno (por defecto para todos; cada ejemplo puede pisarlo).
 */
export function tagsDeEjemplos(ejemplos, alElegir) {
  return (ejemplos || []).map(ej => ({
    texto: ej.texto,
    icono: (
      <span
        className="block w-6 h-6 rounded-lg overflow-hidden shrink-0 [&>svg]:w-full [&>svg]:h-full"
        dangerouslySetInnerHTML={{ __html: construirSvgIcono(ej.categoria || 'generico', ej.color) }}
      />
    ),
    onClick: () => (ej.alElegir ? ej.alElegir() : alElegir?.(ej.texto))
  }));
}

export function TagsChat({ tags, plegadas = false, onDesplegar = null }) {
  if (!tags || tags.length === 0) return null;

  if (plegadas) {
    return (
      <div className="w-full flex justify-start">
        <button
          type="button"
          onClick={onDesplegar}
          className="flex items-center gap-2 pl-3 pr-3.5 py-1.5 bg-superficie border border-borde rounded-full text-xs text-texto-suave shadow-sm"
        >
          <i className="fa-solid fa-tags text-acento-vivo"></i>
          {t('chat_tags')}
        </button>
      </div>
    );
  }

  return (
    <FilaDeslizable className="flex gap-2 justify-center max-w-xl mx-auto w-full" etiquetaSiguiente={t('chat_more_examples')}>
      {tags.map(tag => (
        <button
          key={tag.texto}
          type="button"
          onClick={tag.onClick}
          className="flex items-center gap-2 pl-2 pr-4 py-2 bg-superficie hover:bg-fondo border border-borde hover:border-borde-fuerte rounded-full text-sm text-texto-medio hover:text-texto shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          {tag.icono}
          {tag.texto}
        </button>
      ))}
    </FilaDeslizable>
  );
}

/**
 * El campo de escribir, con las etiquetas arriba y la ayuda adentro.
 *
 * ⌨️ EL TECLADO Y EL BORDE QUE RESPIRA [2026-08-19, pedido del usuario: "es normal entrar en on
 * escribiendo, teclado arriba y campo entrada de chat pegado al teclado... igual sube y baja con el
 * teclado, solo deja un breve espacio para que se vea el borde neon respirando"]
 *
 * El campo se pega al borde de abajo y sube con el teclado — eso ya lo resuelve el navegador, no
 * JavaScript: el meta viewport declara "interactive-widget=resizes-content" (index.html), así que
 * al abrirse el teclado la pantalla se achica DE VERDAD y todo lo que esté anclado abajo sube solo.
 * Lo único que hace falta acá es el "pb-1.5": el borde de este campo tiene un halo animado
 * (".meiti-input-vivo") que, pegado del todo al borde, queda cortado a la mitad. Ese respiro es el
 * pedido literal.
 *
 * ❓ LA AYUDA VA ADENTRO [pedido del usuario: "no sabes como empezar, ese texto ponlo dentro del
 * campo de escribir, esquina superior derecha encima del boton enviar, que si lo tocan salga el
 * texto"] Antes era una línea de texto suelta debajo de todo. Ocupaba un renglón permanente para
 * algo que hace falta una sola vez, y encima competía con el campo por el lugar en la pantalla.
 */
// 📡 [2026-08-19, pregunta del usuario: "ese comportamiento es de página no de librería de chat,
// correcto?"] Media razón, y la otra media explica un bug que acabamos de tener. QUÉ se esconde es
// de la página (el encabezado es suyo). CUÁNDO es del chat (solo él sabe si ya hay charla). El
// problema estaba en el cable del medio: cada página tenía que agarrar la señal y conectarla a la
// prop correcta, cuatro hicieron el mismo cableado y dos quedaron con la prop vieja escondiendo de
// más. No es "cada página tiene su copia del chat", es "cada página tiene su copia del cableado".
//
// Acá el chat publica su estado en un lugar único y PublicNav lo lee solo. Mismo patrón que ya usa
// ModoChat con "--meiti-alto-barra-chat" para que el botón de soporte se entere de que abajo hay una
// barra sin que nadie se lo pase. La página deja de decidir, y deja de poder equivocarse.
const suscriptores = new Set();
let hayConversacionActiva = false;
const publicarConversacion = (valor) => {
  if (valor === hayConversacionActiva) return;
  hayConversacionActiva = valor;
  suscriptores.forEach((avisar) => avisar(valor));
};

/** ¿Hay una conversación andando en esta pantalla? Lo usa PublicNav para esconder el título. */
export function useHayConversacion() {
  const [hay, setHay] = useState(hayConversacionActiva);
  useEffect(() => {
    setHay(hayConversacionActiva);
    suscriptores.add(setHay);
    return () => { suscriptores.delete(setHay); };
  }, []);
  return hay;
}

/**
 * 💬 EL PUNTO DE ENTRADA. Una página que quiere un chat monta ESTO y nada más.
 *
 * [2026-08-19, señalado por el usuario: "la forma o la función que llamás desde la página es lo que
 * debería variar, la librería debe contener todas las funciones y parámetros"]
 *
 * Tenía razón. Hasta acá la librería tenía las PIEZAS (ModoChat, BurbujaChat, BarraEntradaChat) pero
 * el ARMADO seguía siendo tarea de cada página, y era siempre el mismo armado con las mismas cuatro
 * cosas para acordarse:
 *
 *   1. acotar el alto de su contenedor, o el campo de escribir no podía quedar fijo abajo;
 *   2. avisar hacia arriba cuándo esconder su propio encabezado;
 *   3. sacar las etiquetas y la ayuda apenas arranca la conversación;
 *   4. bajar el campo a una línea en ese mismo momento.
 *
 * Cuatro cosas que no tienen NADA que ver con la página y todo que ver con cómo se comporta un chat.
 * La que se olvidara de una volvía a tener el defecto — que es exactamente lo que veníamos sacando
 * del proyecto. Ahora varía lo único que de verdad cambia entre un chat y otro: qué mensajes hay,
 * qué dice el placeholder, qué ejemplos ofrece y qué pasa al enviar.
 *
 * PARÁMETROS
 *   historial      [{rol:'usuario'|'asistente', texto}] — la conversación.
 *   escribiendo    true mientras el asistente piensa (muestra los tres puntitos).
 *   saludo         Texto del asistente cuando todavía no hay historial. Opcional.
 *   valor/onCambio/onEnviar   El campo de escribir.
 *   placeholder    Lo que dice el campo vacío.
 *   tags           [{texto, onClick}] — ejemplos para arrancar. Se van solos al arrancar.
 *   ayuda          {texto, href, enlace} — el "¿no sabes cómo empezar?". Se va solo, igual.
 *   extra          Algo más al final de los mensajes (Lego mete ahí los botones de su propuesta).
 *   campoRef       Solo si la página necesita el foco del campo por su cuenta.
 *   onConversacion (bool) => void — avisa cuándo hay charla, para esconder el encabezado.
 *   tono           'claro' | 'oscuro'.
 */
export function ChatMeiti({
  historial = [],
  escribiendo = false,
  saludo = null,
  valor,
  onCambio,
  onEnviar,
  placeholder = t('chat_placeholder'),
  tags = null,
  ayuda = null,
  extra = null,
  antesDeMensajes = null,
  campoRef = null,
  onConversacion = null,
  // 🔁 [LA CHARLA TE ESPERA 2026-08-25, pedido del usuario: "engancháselo al botón de continuar
  // cuando sale algún error... así estará ahí esperándolo cuando regrese: tienes un chat en
  // proceso, continuar o nuevo" — y "en la librería chat, para que le salga a todos"] Hermano del
  // botón de reintentar de abajo: ese rescata la charla cuando el error pasa CON el modal abierto;
  // esto la rescata cuando el dueño ya se fue. Vive acá por el mismo motivo — hay UN chat, no
  // siete, y cualquier pantalla que guarde su conversación lo hereda pasando estas tres props.
  //
  // La pantalla que lo use se encarga de traer la charla guardada y de olvidarla; el chat solo
  // pregunta. Sin "charlaPendiente" no cambia absolutamente nada de lo que ya hacía.
  charlaPendiente = null,      // { mensajes: [...] } — una charla sin terminar que espera
  onContinuarCharla = null,
  onEmpezarDeNuevo = null,
  // 👤 Quien responde del otro lado. Por defecto la IA; un chat entre personas pasa el suyo.
  iconoAsistente = 'fa-microchip',
  embebido = false,
  // 🛠️ [TIPO EDITOR 2026-08-26, pedido del usuario: "ese chat de Claude anda fuera de la librería...
  // escribe en la librería las líneas para el tipo ia editor, así como ya existe asistente chat"]
  // El chat del editor de devs (consola negra + campo afuera) tenía razón en verse distinto, pero
  // se estaba comportando distinto TAMBIÉN donde no debía: en teléfono la consola colapsaba al alto
  // de una línea y el campo no se pegaba al teclado, porque "embebido" apaga justamente el anclaje
  // que el resto de los chats hereda de ModoChat.
  //
  // variante="editor" lo vuelve un tipo de la librería con el contrato correcto por pantalla:
  //   · TELÉFONO/TABLET (el chat ES la pantalla): se comporta como el chat completo — la consola
  //     se estira hasta llenar el alto y el campo queda anclado al teclado, igual que Crear App.
  //   · PC (el chat es un PANEL junto a la lista de moldes): embebido, como venía — llena su
  //     columna y no le toca el layout a nadie.
  // La identidad visual (consola oscura, barraAfuera) la sigue poniendo la pantalla vía
  // className/tono, que para eso son props de look.
  variante = null,
  tono = 'claro',
  className = '',
  // 🧱 Deja el campo de escribir AFUERA de la caja de mensajes (ver ModoChat).
  barraAfuera = false,
  // ⚠️ [ERROR CON REINTENTO 2026-08-25, pedido del usuario: "define en la librería del chat que
  // si hay texto en el chat y se produce un error, eso saca un botón de reintentar — así lo cogen
  // todos"] El caso real: el asistente de Pedir cambio fallaba a mitad de conversación y quedaba
  // trabado, sin forma de seguir. La primera versión del arreglo vivía en esa pantalla; acá lo
  // hereda cualquier chat del sistema sin escribir una línea, que es como corresponde: hay UN
  // chat, no siete.
  //
  // El botón aparece solo si hay algo escrito, porque reintentar sin texto no tiene qué mandar.
  // Quien usa el chat solo pasa "error"; el reintento reusa el MISMO onEnviar de siempre.
  error = null,
  // 🤖 Ver el comentario junto a "debajoDelCampo" en BarraEntradaChat, más abajo — pasa de largo
  // hasta ahí sin tocar nada del resto.
  debajoDelCampo = null,
  // 🔒 [BUG REAL 2026-09-03, pedido explícito del usuario: "la idea es que ninguna IA pueda ver
  // más allá de la app que está en el visor... si no hay app cargada no tienes nada que hacer
  // aún, para qué necesitas mandarle mensajes a las IAs sin la app en el visor?"] Antes, sin
  // ninguna app elegida, el campo seguía activo — el pedido igual se mandaba (sin herramientas,
  // sin contexto real), y la IA, en vez de decir claramente "no puedo", inventaba una respuesta
  // (misma familia que la alucinación de esta misma noche). Este prop deja el campo INACTIVO de
  // entrada, antes de que exista ningún pedido que rechazar — quien use el chat pasa esto cuando
  // haya una condición previa que tiene que cumplirse (acá, "hay una app elegida") en vez de
  // confiar en que el prompt la rechace con gracia.
  deshabilitado = false
}) {
  // 🧹 [2026-08-20] Acá vivía "useModoChatAutoScroll": un hook que, al llegar un mensaje,
  // scrolleaba la caja hasta el fondo e insistía unos frames por si el alto todavía se estaba
  // acomodando. Quedó sin función al anclar los mensajes con "column-reverse" — ahora el último
  // mensaje se queda abajo solo, sin que nadie scrollee nada. Se borra en vez de dejarlo apagado:
  // funcionando en paralelo se lo podía tomar por el mecanismo bueno y "arreglarlo" en vez de
  // mirar el anclaje, que es donde vive la conducta real.

  // 📖 El modo lectura no es una decisión de la página: apenas hay una conversación real, las
  // etiquetas (ejemplos para ARRANCAR) y la ayuda (cómo EMPEZAR) ya cumplieron, y el campo baja a
  // una línea. Antes cada página tenía que pasar "tags" y "filas" distintos según la fase.
  const hayConversacion = historial.length > 0;
  // 🛠️ [TIPO EDITOR 2026-08-26] En pantallas angostas el editor muestra SOLO el chat, así que ahí
  // se comporta como el chat completo (anclaje al teclado, consola estirada); en PC es un panel y
  // queda embebido. 1023px es el mismo corte (lg) con el que el editor parte sus dos columnas.
  const pantallaAngosta = useMediaQueryChat('(max-width: 1023px)');
  const embebidoEfectivo = variante === 'editor' ? !pantallaAngosta : embebido;
  // 🩹 [2026-08-26, segundo reporte del usuario: "no queda anclado el borde inferior del campo
  // contra el teclado... esto funciona excelente ya en el asistente"] Tenía razón dos veces. El
  // primer intento apagó "embebido" pero dejó "barraAfuera" — y la barra afuera es una HERMANA
  // simple, sin absolute y sin medición (ver ModoChat): queda fuera de toda la maquinaria de
  // anclaje. El asistente que funciona usa la barra ADENTRO. En angosto, el tipo editor copia ese
  // camino EXACTO — mismo código, cero ramas nuevas — y "barraAfuera" queda como look de PC, que
  // es donde nació (separar consola y campo en el panel de dos columnas).
  const barraAfueraEfectiva = variante === 'editor' && pantallaAngosta ? false : barraAfuera;
  // En angosto el look del editor (caja negra) NO puede ir en la raíz: la recortaría la barra. Va
  // adentro. En PC no cambia nada — ahí la caja y el campo ya son hermanos ("barraAfuera").
  const cajaInterna = variante === 'editor' && pantallaAngosta;

  useEffect(() => {
    publicarConversacion(hayConversacion);
    onConversacion?.(hayConversacion);
    // 📖 [2026-08-26, pedido del usuario: "en la vista teléfono quita el ícono de soporte en el
    // modo de leer"] La misma señal, pero visible para el CSS: con una conversación andando, el
    // teléfono está en modo de leer mensajes y el botón de soporte solo tapa texto. Ver
    // estiloMeiti.css — en desktop no cambia nada.
    document.body.classList.toggle('meiti-conversando', hayConversacion);
  }, [hayConversacion, onConversacion]);
  useEffect(() => () => {
    publicarConversacion(false);
    onConversacion?.(false);
    document.body.classList.remove('meiti-conversando');
  }, []);

  return (
    <ModoChat
      className={className}
      embebido={embebidoEfectivo}
      barraAfuera={barraAfueraEfectiva}
      cajaInterna={cajaInterna}
      separarDelBorde={!hayConversacion}
      encabezado={antesDeMensajes}
      mensajes={
        <>
          {/* 💬 [SUGERENCIAS DENTRO DEL CAMPO 2026-08-26] Acá vivía el saludo, en una burbuja
              propia arriba de las etiquetas. Se fue adentro del campo (ver useSugerenciaRotativa):
              ocupaba una pantalla entera para decir una sola cosa, una sola vez, y encima empujaba
              hacia abajo las etiquetas y el campo — justo lo que el usuario tiene que ver primero.
              "saludo" sigue aceptándose para no romper a quien lo pase, pero ya no se dibuja: la
              pantalla que quiera decir algo lo pone en "placeholder", que ahora acepta una lista. */}
          {/* "m.extra" deja colgar algo de UN mensaje puntual — el botón "Crear mi app" que soporte
              engancha a su respuesta, o la etiqueta de quién contestó en un hilo con un humano. */}
          {historial.map((m, i) => (
            <BurbujaChat key={i} rol={m.rol} texto={m.texto} tono={tono} extra={m.extra || null} icono={iconoAsistente} />
          ))}
          {escribiendo && <IndicadorEscribiendo tono={tono} />}
          {extra}
        </>
      }
      barra={
        <BarraEntradaChat
          campoRef={campoRef}
          valor={valor}
          onCambio={onCambio}
          onEnviar={onEnviar}
          placeholder={placeholder}
          deshabilitado={escribiendo || deshabilitado}
          error={error}
          charlaPendiente={charlaPendiente}
          onContinuarCharla={onContinuarCharla}
          onEmpezarDeNuevo={onEmpezarDeNuevo}
          tags={hayConversacion ? null : tags}
          ayuda={hayConversacion ? null : ayuda}
          filas={hayConversacion ? 1 : 3}
          debajoDelCampo={debajoDelCampo}
        />
      }
    />
  );
}

/**
 * 📱 ¿Esta pantalla es un teléfono? Reactivo: si se cambia el tamaño de la ventana, se entera.
 *
 * [2026-08-20, pedido del usuario: "en teléfono todo se esconde y aparece según lo hicimos; en pc
 * todo siempre visible, ahí hay espacio de sobra"] Todo el plegado del chat existe por UNA razón:
 * el teclado virtual se come media pantalla y hay que elegir qué sacrificar. En una computadora esa
 * razón no existe, así que esconder cosas ahí es puro costo sin beneficio.
 *
 * 640px es el mismo corte que usa el resto del proyecto (el breakpoint "sm" de Tailwind y los
 * media queries de estiloMeiti.css) — un solo número para "de acá para abajo es un teléfono".
 */
// 🛠️ [TIPO EDITOR 2026-08-26] Igual que useEsTelefono pero con la consulta como parámetro: el
// tipo editor corta en 1023px (lg), que es donde el editor de devs parte sus dos columnas.
function useMediaQueryChat(consulta) {
  const [coincide, setCoincide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(consulta).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const alCambiar = (e) => setCoincide(e.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, [consulta]);
  return coincide;
}

function useEsTelefono() {
  const [esTelefono, setEsTelefono] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  );
  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 639px)');
    const alCambiar = (e) => setEsTelefono(e.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);
  return esTelefono;
}

// 💬 [SUGERENCIAS DENTRO DEL CAMPO 2026-08-26, pedido del usuario: "quitar el mensaje que aparece
// encima de las etiquetas y ponerlo dentro del campo, con otros mensajes más que recomienden
// acciones según la pantalla"] El saludo ocupaba una burbuja entera arriba de todo para decir una
// sola cosa, y la decía una sola vez. Adentro del campo no ocupa nada y puede decir varias: es el
// lugar donde el usuario ya está mirando cuando no sabe qué escribir.
//
// "placeholder" acepta desde ahora un texto (como siempre) o una lista. Con lista va rotando, y
// SOLO mientras el campo esté vacío y sin foco — apenas escribes o entras al campo se queda quieto,
// porque un texto que cambia debajo del cursor es un estorbo, no una ayuda.
const useSugerenciaRotativa = (placeholder, quieto) => {
  const lista = Array.isArray(placeholder) ? placeholder.filter(Boolean) : [placeholder];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (lista.length < 2 || quieto) return;
    const id = setInterval(() => setI(n => (n + 1) % lista.length), 4200);
    return () => clearInterval(id);
  }, [lista.length, quieto]);
  return lista[i % lista.length] || '';
};

export function BarraEntradaChat({
  valor,
  onCambio,
  onEnviar,
  placeholder = t('chat_placeholder'),
  deshabilitado = false,
  tags = null,
  ayuda = null,
  campoRef = null,
  filas = 2,
  // ⚠️ [ERROR CON REINTENTO 2026-08-25] El error se dibuja PEGADO al campo, no arriba de todo:
  // es donde el usuario está mirando cuando su mensaje no salió, y donde tiene el texto para
  // reintentarlo. Cualquier pantalla que use el chat lo hereda pasando solo "error".
  error = null,
  // 🔁 [LA CHARLA TE ESPERA 2026-08-25] Va en ESTE componente, no en ChatMeiti: el aviso se dibuja
  // acá, junto al campo y al error, por el mismo motivo que el error. ChatMeiti las recibe de la
  // pantalla y las pasa para abajo.
  // 🩹 Regresión propia del mismo día: la primera versión declaró estas props en ChatMeiti y dejó
  // el JSX acá — "charlaPendiente is not defined", pantalla en blanco en TODA página con chat. El
  // build pasó verde: un símbolo fuera de alcance no rompe la compilación, solo el render. Es
  // exactamente la lección "build verde no prueba la pantalla", y la había verificado en MisApps
  // pero no acá, que es donde vive el JSX.
  charlaPendiente = null,
  onContinuarCharla = null,
  onEmpezarDeNuevo = null,
  debajoDelCampo = null
}) {
  const refInterna = useRef(null);
  const ref = campoRef || refInterna;
  const [enfocado, setEnfocado] = useState(false);
  // 🎧 [2026-08-26] Mientras esta barra esté en pantalla, el body lo dice: en teléfono, el
  // pentágono flotante de soporte se esconde (su ícono vive acá adentro, ver meiti-soporte-circulo)
  // y en páginas sin chat queda normal. Mismo patrón que meiti-conversando.
  useEffect(() => {
    document.body.classList.add('meiti-chat-en-pantalla');
    return () => document.body.classList.remove('meiti-chat-en-pantalla');
  }, []);
  // 💬 La sugerencia que se ve ahora mismo dentro del campo. Se queda quieta apenas hay algo
  // escrito o el campo tiene el foco.
  const sugerencia = useSugerenciaRotativa(placeholder, enfocado || !!String(valor || '').trim());
  // Solo en teléfono el foco pliega las etiquetas: en escritorio hay lugar para todo (ver
  // useEsTelefono arriba). "plegarEtiquetas" es el único lugar donde se decide.
  const esTelefono = useEsTelefono();
  const plegarEtiquetas = enfocado && esTelefono;
  const [ayudaAbierta, setAyudaAbierta] = useState(false);

  // El foco entra como dependencia: al enfocar cambia el espacio reservado adentro del campo (el
  // botón de etiquetas), así que el alto tiene que recalcularse en ese mismo momento y no recién
  // con la primera tecla.
  useAltoAutomatico(ref, valor, 160, plegarEtiquetas);
  useAvisoEscribiendo(enfocado);

  const enviar = (e) => {
    e.preventDefault();
    if (!valor.trim() || deshabilitado) return;
    onEnviar(e);
    // 📖 [MODO LECTURA 2026-08-19, pedido del usuario: "después que manda el mensaje... se queda
    // pegado abajo, no vuelve a abrir el teclado... se abre el teclado si clickea para escribir
    // otra vez, y a eso le llamaremos modo lectura"] Al mandar, el teclado se va. Es el momento
    // exacto en que la persona deja de escribir y pasa a LEER la respuesta: dejarle el teclado
    // abierto le tapa media pantalla justo para eso, y encima el chat parece estar esperando que
    // siga escribiendo cuando en realidad le toca al asistente.
    // Solo en teléfono: en una computadora el foco no cuesta pantalla y perderlo obliga a volver a
    // hacer click para cada respuesta.
    if (window.matchMedia('(max-width: 639px)').matches) ref.current?.blur();
  };

  return (
    // 📐 [2026-08-19, pedido del usuario: "quitale un poquito de alto al campo de escritura del
    //     chat, solo unos 3 px, para que no escrollee con el teclado arriba"] Con el teclado abierto
    //     la pantalla que queda es tan justa que 3px de más alcanzan para que aparezca un scroll —
    //     y este campo es lo único que no se puede mover (regla 2). Los 3px salen de acá, del
    //     respiro de abajo, y no del área de escribir: el halo del borde sigue viéndose con 3px, y
    //     achicar el campo en sí sería pagar el arreglo con espacio para leer lo que uno tipea.
    <div className="w-full pb-[3px]">
      {ayudaAbierta && ayuda && (
        <div className="mb-2 px-4 py-3 bg-superficie border border-borde rounded-2xl shadow-sm text-xs text-texto-suave flex items-start gap-2">
          <i className="fa-solid fa-circle-info text-acento-vivo mt-0.5 shrink-0"></i>
          <span className="min-w-0">
            {ayuda.texto}{' '}
            {ayuda.href && (
              <a href={ayuda.href} className="text-acento hover:underline font-medium">{ayuda.enlace || t('see_more')}</a>
            )}
          </span>
          <button type="button" onClick={() => setAyudaAbierta(false)} className="shrink-0 text-texto-tenue hover:text-texto-suave" aria-label={t('chat_close_help')}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* 🏷️ [2026-08-19, pedido del usuario: "pasa el boton de etiquetas para dentro del campo de
          escribir, esquina superior izquierda"] Las etiquetas desplegadas viven ARRIBA del campo;
          plegadas se meten ADENTRO, arriba a la izquierda, en espejo con la ayuda de la derecha.
          Así, mientras se escribe, la barra entera es el campo y nada más — cada pieza que quedaba
          suelta afuera le robaba un renglón a la conversación, que es lo que menos sobra con el
          teclado abierto. */}
      {tags && !plegarEtiquetas && (
        // 📐 [2026-08-23, pedido del usuario: "dale un poco de aire a esa zona entre el texto, el
        // campo y las etiquetas; unos espacios, no tan grandes, pero que no quede tan pegado"] Las
        // etiquetas quedaban pegadas al mensaje de arriba y al campo de abajo, las tres cosas en un
        // bloque continuo. Se separan de los dos lados, no de uno solo: darle aire solo abajo la
        // hubiera dejado colgando del mensaje.
        <div className="mt-4 mb-4">
          <TagsChat tags={tags} />
        </div>
      )}

      {/* 🔁 La charla que quedó a medias, esperando. Va arriba del campo de escribir, en el mismo
          lugar donde aparece el error — es el mismo tipo de aviso: "algo pasó, esto es lo que
          puedes hacer". Solo si de verdad hay mensajes guardados. */}
      {charlaPendiente?.mensajes?.length > 0 && (
        <div className="mb-2 w-full text-sm bg-superficie border border-borde px-3 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 text-texto-suave">
            <i className="fa-solid fa-clock-rotate-left mr-1.5 text-alerta"></i>
            {t('chat_charla_en_proceso')}
          </span>
          <span className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onContinuarCharla?.()}
              className="px-3 py-1.5 rounded-lg bg-inverso hover:bg-inverso text-white text-xs font-medium transition-colors"
            >
              {t('chat_continuar_charla')}
            </button>
            <button
              type="button"
              onClick={() => onEmpezarDeNuevo?.()}
              className="px-3 py-1.5 rounded-lg bg-superficie border border-borde hover:border-borde-fuerte text-texto-suave text-xs font-medium transition-colors"
            >
              {t('chat_empezar_de_nuevo')}
            </button>
          </span>
        </div>
      )}

      {error && (
        <div className="mb-2 w-full text-sm text-peligro bg-peligro-tinte border border-peligro-suave px-3 py-2 rounded-xl flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0">{error}</span>
          {String(valor || "").trim() && !deshabilitado && (
            <button
              type="button"
              onClick={(e) => enviar(e)}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-peligro hover:bg-peligro-fuerte text-white text-xs font-medium transition-colors"
            >
              <i className="fa-solid fa-rotate-right mr-1.5"></i>{t("chat_reintentar")}
            </button>
          )}
        </div>
      )}
      <form onSubmit={enviar} className="meiti-input-vivo relative w-full bg-superficie border border-borde-fuerte rounded-2xl shadow-lg p-2 flex items-end gap-2">
        <textarea
          ref={ref}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          placeholder={sugerencia}
          rows={filas}
          disabled={deshabilitado}
          // 📐 [2026-08-19, pedido del usuario: "ponlo debajo de la etiqueta, no seguido"] El texto
          // arranca en el renglón de ABAJO del botón de etiquetas, no a su costado. Se reserva alto
          // arriba, no ancho a la izquierda: al costado, el texto entraba a media línea y cada
          // frase quedaba con una sangría rara que se arrastraba hasta el final; y si se corría el
          // texto entero (padding en vez de sangría), una frase medianamente larga pasaba a
          // envolver en cuatro líneas y el final quedaba cortado. Debajo, el texto usa el ancho
          // completo desde la primera letra.
          // 📐 [2026-08-23, propuesta del usuario: "aumentarlo en el estado sin foco al tamano del
          // estado con foco, que cuando las etiquetas entren adentro se quede del mismo tamano"]
          // El hueco se reserva SIEMPRE que el chat tenga etiquetas, no solo cuando estan plegadas.
          // Antes solo aparecia al enfocar, asi que tocar el campo para escribir lo hacia crecer
          // 44px de golpe: en telefono, justo cuando esta subiendo el teclado, ese salto se siente.
          // Reservado siempre, meter la pastilla adentro no mueve nada.
          style={tags ? { paddingTop: '2.75rem' } : undefined}
          // 📐 [2026-08-25, reportado por el usuario: "el campo de entrada se desborda por los
          // lados del ancho de la ventana"] "min-w-0" no es decorativo: un <textarea> trae un ancho
          // mínimo propio (su atributo cols por defecto) y un hijo flex NUNCA se encoge por debajo
          // de su min-content salvo que se lo permitas. Sin esto, en un contenedor angosto (el modal
          // de Pedir cambio, una pantalla chica) el textarea empujaba el formulario más ancho que su
          // padre y se salía por los costados. Vale para TODOS los chats: este componente es uno solo.
          className="flex-1 min-w-0 resize-none outline-none p-3 pr-9 text-base text-texto placeholder-texto-suave disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) enviar(e);
          }}
        />

        {tags && plegarEtiquetas && (
          <button
            type="button"
            // Cerrar el teclado ES desplegarlas: el estado depende del foco, así que sacarle el
            // foco al campo las trae de vuelta sin ningún estado paralelo que pueda desincronizarse.
            // "onMouseDown" con preventDefault además de onClick: sin eso, el navegador le saca el
            // foco al campo ANTES del click, el botón se desmonta a mitad de camino y el click nunca
            // llega a dispararse.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => ref.current?.blur()}
            className="absolute top-3 left-3 flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full border border-borde bg-superficie text-[11px] text-texto-suave hover:text-acento hover:border-acento-suave transition-colors"
          >
            <i className="fa-solid fa-tags text-acento-vivo text-[10px]"></i>
            {t('chat_tags')}
          </button>
        )}

        {/* 🎧❓ [2026-08-26, reportado por el usuario: "el ícono de soporte está pisando el de
            ayuda"] Antes eran DOS botones absolutos calculándose la esquina por separado (el de
            soporte adivinaba right-11 o right-3 según si la ayuda existía) — cualquier combinación
            no prevista los encimaba. Ahora es UN contenedor flex en la esquina y los botones se
            ordenan solos: existan uno, el otro o los dos, nunca se pisan. El circulito de soporte
            sigue siendo CSS puro (meiti-soporte-circulo: solo teléfono y solo si la página tiene
            soporte de verdad); display:none lo saca del flex sin dejar hueco. */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('meiti:abrir-soporte'))}
            aria-label={t('support')}
            className="meiti-soporte-circulo w-6 h-6 rounded-full text-texto-tenue hover:text-acento-vivo hover:bg-acento-tinte items-center justify-center transition-colors"
          >
            <i className="fa-solid fa-headset text-sm"></i>
          </button>
          {ayuda && (
            <button
              type="button"
              onClick={() => setAyudaAbierta(a => !a)}
              aria-label={t('chat_help_aria')}
              aria-expanded={ayudaAbierta}
              className="w-6 h-6 rounded-full text-texto-tenue hover:text-acento-vivo hover:bg-acento-tinte flex items-center justify-center transition-colors"
            >
              <i className="fa-solid fa-circle-question text-sm"></i>
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!valor.trim() || deshabilitado}
          aria-label={t('send')}
          className="shrink-0 w-11 h-11 rounded-xl bg-acento hover:bg-acento-fuerte disabled:bg-relleno-fuerte disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors mb-1 mr-1"
        >
          <i className="fa-solid fa-arrow-up"></i>
        </button>
      </form>
      {/* 🤖 [PIE DEL CAMPO 2026-09-02, pedido del usuario: "espacio de una línea debajo del campo,
          igual a PC" — para el selector de modelo del Editor con IA] En angosto, "barraAfuera" se
          apaga (ver comentario de "variante='editor'" en ChatMeiti) y el campo pasa a vivir DENTRO
          del anclaje real al teclado (ver ModoChat): un hijo agregado como hermano AFUERA de
          ChatMeiti, en el flujo normal del documento, no se mueve con el campo ahí — queda flotando
          donde el campo YA NO ESTÁ. Este div vive ADENTRO de "barraRef" (ver ModoChat), así que
          cuenta para el mismo alto medido que reserva el hueco de los mensajes: quien lo use no
          rompe el anclaje, lo hereda gratis. Vacío no reserva nada (null no ocupa alto). */}
      {debajoDelCampo && <div className="pt-1.5">{debajoDelCampo}</div>}
    </div>
  );
}

// Re-exportado para que un chat necesite UN solo import y no dos.
