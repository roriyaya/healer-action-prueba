// 🎛️ [FORMA DE CADA PACK 2026-08-26, pedido del usuario] Hasta hoy el pack de estilo era SOLO un
// texto para la IA: le decía cómo componer los moldes de la app, y nada más. Todo el resto —los
// botones, los campos, las tablas, las tarjetas, las barras de navegación— lo pone el sistema, y
// era idéntico en las 21 apps sin importar el pack elegido.
//
// El usuario lo dijo exacto: "no tiene sentido tener varios temas para seleccionar y que todas sean
// iguales con diferente color, es igual que tener solo las paletas de colores". Y midió bien el
// riesgo: un dev que prueba dos packs y ve la misma app con otro color nos tilda de vende humo.
//
// Los datos le dieron la razón: de 14 apps medidas, 14 usan grilla y 0 usan rounded-2xl. Lo que el
// pack SÍ controla cambió de verdad (PortalVideo cumple 8 de 9 requisitos de "escena" y no se
// parece a un dashboard) — el problema es que el pack solo alcanzaba a los moldes.
//
// Esto es lo que faltaba: la FORMA como dato, para que el kit y el chrome también la reciban.
//
// ── Reglas de este archivo ───────────────────────────────────────────────────────────────────
// · Acá NO hay colores. El color sale de "tema" y solo de ahí — un pack define la FORMA (radio,
//   densidad, borde, sombra, peso), nunca la paleta. Esa separación es lo que permite que
//   cualquier pack funcione con cualquier tema del dueño.
// · "meiti" es la forma que TODAS las apps tienen hoy. Es el default de todo lo que no declare
//   pack, así que las 21 apps online se ven exactamente igual que antes de este archivo.
// · Agregar un pack nuevo es sumar una entrada acá y su texto en src/backend/estilos/. Nada más.

// La forma base: lo que hoy hace el kit, escrito como datos. Cualquier pack que no declare algo
// hereda de acá, así que un pack nuevo solo escribe lo que de verdad cambia.
const FORMA_MEITI = {
  // Radios. "pieza" son botones/campos/chips; "bloque" son tarjetas y contenedores grandes.
  radioPieza: '0.75rem',         // rounded-xl: el boton que el kit tuvo siempre
  radioBloque: '1rem',           // rounded-2xl: la tarjeta que el kit tuvo siempre
  // Densidad: el alto cómodo de las piezas interactivas y el aire de los bloques.
  altoPieza: '0.625rem 1rem',    // px-4 py-2.5: el alto de siempre, medido del original
  aireBloque: '1.25rem',         // p-5: el aire de siempre, medido del original
  separacion: '0.75rem',         // gap por defecto entre piezas
  // Trazo.
  bordePieza: '1px',
  bordeBloque: '1px',
  sombraBloque: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  // Carácter: cómo se ve la acción principal y cuánto pesa el texto de rótulos.
  botonPrimario: 'solido',       // solido | suave | fantasma
  pesoRotulo: 600,
  // Separadores de tabla/lista y del chrome (barras de navegación).
  separadores: 'sutiles',        // marcados | sutiles | ninguno
  chromeBorde: '1px',

  // 🎬 [ACABADOS 2026-08-27, reportado por el usuario: "los botones de las tablas salen igual en
  // todas, los demás sí cambian de forma pero no agregan sombras ni terminados ni efectos"]
  // Tenía razón en las dos mitades, y la primera tiene una causa concreta: una acción de tabla es
  // un botón FANTASMA — transparente y sin borde. Toma el radio del pack igual que los demás, pero
  // no tiene ninguna superficie donde mostrarlo, así que se ve idéntica en los seis packs.
  // Por eso la variante fantasma necesita carácter PROPIO, no heredar el del botón lleno.
  accionTabla: 'texto',          // texto (sin chrome) | contorno (borde) | suave (fondo lavado)
  // 📏 [2026-08-27, pedido del usuario: "necesitamos diferenciar más esos temas, que se note en
  // todos los sentidos; son pocos y el cambio es mínimo"] El tamaño del texto y el tratamiento del
  // rótulo se ven en CADA botón y CADA campo de la app — mueven la aguja mucho más que un radio.
  escalaTexto: '0.875rem',       // tamaño base de las piezas (botón, campo)
  rotulo: 'normal',              // normal | mayuscula (rótulos chicos en versalitas)
  // 🎴 [2026-08-27, pedido del usuario: "cambia bordes, sombras, efectos, formas de las tarjetas;
  // cuadraditas como las tarjetas de apps de MEITI"] El acento es lo que le da CARÁCTER a una
  // tarjeta más allá de su tamaño — y "barra" es exactamente el tratamiento de las tarjetas de
  // Mis Apps: una franja del color de marca al costado.
  //   ninguno | barra (franja izquierda) | linea (filete superior) | resplandor (halo del color)
  acentoTarjeta: 'ninguno',
  // Levanta al pasar el mouse. Solo tiene sentido donde ya hay elevación.
  elevaAlPasar: false,
  // 🖼️ [2026-08-27, duda del usuario: "no sé si dejar las tarjetas solas en los temas que tengan
  // sombras o algún efecto, la tarjeta que molesta"] Tenía razón en la intuición: MotorUI le pone
  // un MARCO a cada molde, y el molde adentro ya dibuja su propia tarjeta. Mientras todo era plano
  // no molestaba; con sombras y acentos son dos tarjetas anidadas y la de afuera le come el efecto
  // a la de adentro.
  //   tarjeta  -> el marco sigue al pack (mismo radio, aire, borde y sombra que lo de adentro)
  //   ninguno  -> el marco desaparece del todo y la tarjeta del molde queda sola
  //
  // 🎯 [DECISIÓN DEL USUARIO 2026-08-27] Va "ninguno" en los SEIS: "dejemos las tarjetas solas sin
  // ese envoltorio, que sería exacto MEITI original". El molde ya dibuja su propia UI.Tarjeta, así
  // que el marco de MotorUI era una segunda tarjeta alrededor de la primera — y con sombras y
  // acentos encima, la de afuera le recortaba el efecto a la de adentro.
  //
  // La opción se deja escrita, no borrada: el día que un molde NO dibuje su propia tarjeta (un
  // gráfico suelto, un contador), un pack va a querer devolverle el marco, y va a ser una línea.
  marcoMolde: 'ninguno',
  // Y esto es lo que faltaba para que un pack se sienta distinto y no solo se mida distinto:
  sombraPieza: 'none',           // sombra del botón lleno
  transicion: '150ms'            // qué tan rápido responde al mouse
};

export const FORMAS = {
  // El que ya existe. No cambia nada: es el retrato de lo que el kit hace hoy.
  meiti: FORMA_MEITI,

  // 🧱 BENTO — bloques grandes que respiran, sin bordes; la sombra hace la separación.
  bento: {
    ...FORMA_MEITI,
    radioPieza: '1rem',
    radioBloque: '2rem',
    altoPieza: '0.75rem 1.5rem',
    aireBloque: '2rem',
    separacion: '1.5rem',
    escalaTexto: '0.9375rem',
    bordeBloque: '0',
    sombraBloque: '0 10px 30px -12px rgb(0 0 0 / 0.25)',
    separadores: 'ninguno',
    accionTabla: 'suave',
    sombraPieza: '0 4px 12px -4px rgb(0 0 0 / 0.25)',
    transicion: '200ms',
    acentoTarjeta: 'resplandor',
    elevaAlPasar: true,
    // 🧭 [CHROME POR PACK 2026-09-08, pedido del usuario: "cada uno que use su barra real"] Bento
    // ya dice de sí mismo "sin bordes, la sombra hace la separación" — el chrome (sidebar/barras
    // de navegación) sigue esa misma decisión en vez de quedarse con el borde transparente y nada
    // más. Campo explícito, no inferido de "sombraBloque" (que meiti también define, muy sutil) —
    // así queda escrito qué packs quieren este tratamiento, sin comparar strings de sombra.
    separadorChrome: 'sombra'
  },

  // 🔥 CÁLIDO — todo redondeado y suave, aire generoso, la acción principal no grita.
  calido: {
    ...FORMA_MEITI,
    radioPieza: '9999px',
    radioBloque: '2rem',
    altoPieza: '0.875rem 1.75rem',
    aireBloque: '2rem',
    separacion: '1.25rem',
    bordePieza: '0',
    escalaTexto: '1rem',
    bordeBloque: '1px',
    sombraBloque: '0 8px 24px -14px rgb(0 0 0 / 0.2)',
    botonPrimario: 'suave',
    pesoRotulo: 500,
    separadores: 'sutiles',
    accionTabla: 'suave',
    sombraPieza: '0 6px 16px -8px rgb(0 0 0 / 0.22)',
    transicion: '240ms',
    acentoTarjeta: 'ninguno',
    elevaAlPasar: true,
    // Ver el comentario de "separadorChrome" en Bento: Cálido también define una sombra real
    // (suave, cálida) para sus tarjetas — el chrome la hereda, sumada al borde sutil que ya tenía.
    separadorChrome: 'sombra'
  },

  // 📊 DENSO — la mayor cantidad de dato por pantalla: poco radio, poco aire, líneas marcadas.
  denso: {
    ...FORMA_MEITI,
    radioPieza: '0.125rem',
    radioBloque: '0.25rem',
    altoPieza: '0.1875rem 0.5rem',
    aireBloque: '0.5rem',
    separacion: '0.375rem',
    escalaTexto: '0.8125rem',
    rotulo: 'mayuscula',
    sombraBloque: 'none',
    pesoRotulo: 700,
    separadores: 'marcados',
    chromeBorde: '1px',
    // Un panel denso vive de las lineas: la accion de tabla se dibuja con contorno, no con color.
    accionTabla: 'contorno',
    sombraPieza: 'none',
    transicion: '90ms',
    acentoTarjeta: 'barra'
  },

  // 📱 MÓVIL — pensado para el dedo: todo más alto, radios amplios, sin líneas finas.
  movil: {
    ...FORMA_MEITI,
    radioPieza: '1.25rem',
    radioBloque: '1.75rem',
    altoPieza: '1rem 1.5rem',        // ~48px de alto real: cómodo al pulgar, no el mínimo
    aireBloque: '1.5rem',
    separacion: '1.25rem',
    escalaTexto: '1rem',
    bordePieza: '0',
    sombraBloque: '0 4px 16px -8px rgb(0 0 0 / 0.2)',
    separadores: 'sutiles',
    accionTabla: 'suave',
    sombraPieza: '0 3px 10px -4px rgb(0 0 0 / 0.25)',
    transicion: '180ms',
    acentoTarjeta: 'linea'
  },

  // 🎬 ESCENA — el cromo se corre para que mande el contenido: nada de bordes ni sombras
  // compitiendo con las portadas, y la única pieza llena es reproducir.
  escena: {
    ...FORMA_MEITI,
    radioPieza: '9999px',
    radioBloque: '1.25rem',
    altoPieza: '0.5rem 1.25rem',
    aireBloque: '0.5rem',
    separacion: '0.5rem',
    escalaTexto: '0.875rem',
    rotulo: 'mayuscula',
    bordePieza: '0',
    bordeBloque: '0',
    sombraBloque: 'none',
    botonPrimario: 'fantasma',   // la acción principal (reproducir) la pinta el molde, no el kit
    pesoRotulo: 700,
    separadores: 'ninguno',
    chromeBorde: '0',
    // Acá el cromo se corre a proposito: la accion de tabla es texto y nada mas.
    accionTabla: 'texto',
    sombraPieza: 'none',
    transicion: '220ms'
  }
};

/**
 * La forma de un pack. Cualquier id desconocido —o ninguno— cae en "meiti", que es el aspecto que
 * el sistema tuvo siempre: una app vieja sin pack declarado no cambia ni un píxel.
 */
export const formaDePack = (idPack) => FORMAS[String(idPack || '').toLowerCase()] || FORMAS.meiti;

/** Los packs que tienen forma propia. Sirve para el panel y para los chequeos. */
export const PACKS_CON_FORMA = Object.keys(FORMAS);
