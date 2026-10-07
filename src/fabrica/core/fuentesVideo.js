// ▶️ [REGISTRO DE ORÍGENES 2026-08-26] Qué es una "fuente" reproducible y cómo se toca.
//
// Existe por un bug real: en VideoNet, la IA escribió un reproductor que detectaba los enlaces
// cortos de YouTube ("youtu.be/ID") pero al convertirlos a formato reproducible solo reemplazaba
// "watch?v=", que en el link corto NO EXISTE — así que un enlace corto entraba al reproductor sin
// convertir y no reproducía nada. El sistema lo encontró y lo reparó, pero la conclusión de fondo
// es otra: **cada app estaba reinventando esto, y cada una se iba a equivocar distinto**.
//
// Acá se resuelve UNA vez. Agregar un origen nuevo (HLS, Twitch, un podcast) es sumar una entrada
// a esta lista y nada más — mismo criterio que los packs de estilo y los proveedores de archivos.
//
// El orden IMPORTA: se prueba de arriba hacia abajo y gana el primero que reconozca la dirección.
// Por eso los específicos van antes que el genérico.

const ORIGENES = [
  {
    id: 'youtube',
    nombre: 'YouTube',
    reconoce: (url) => /(?:youtube\.com|youtu\.be)/i.test(url),
    resolver: (url) => {
      // Las TRES formas que existen en la calle. La del medio es la que rompió VideoNet.
      let id = null;
      const corto = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
      const largo = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
      const yaEmbed = url.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
      id = (corto && corto[1]) || (largo && largo[1]) || (yaEmbed && yaEmbed[1]) || null;
      if (!id) return null;
      // "El minuto donde iba" viaja en la propia dirección en YouTube (?t=90 o &start=90).
      const t = url.match(/[?&](?:t|start)=(\d+)/);
      const desde = t ? `&start=${t[1]}` : '';
      return {
        tipo: 'iframe',
        src: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${desde}`,
        // Los permisos que el reproductor incrustado necesita para que el botón de pantalla
        // completa exista de verdad. Sin esto se ve el botón y no hace nada.
        permisos: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'
      };
    }
  },
  {
    id: 'vimeo',
    nombre: 'Vimeo',
    reconoce: (url) => /vimeo\.com/i.test(url),
    resolver: (url) => {
      const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (!m) return null;
      return {
        tipo: 'iframe',
        src: `https://player.vimeo.com/video/${m[1]}`,
        permisos: 'autoplay; fullscreen; picture-in-picture'
      };
    }
  },
  {
    id: 'hls',
    nombre: 'Transmisión en vivo (HLS)',
    // 📡 [2026-08-26] El formato de las transmisiones en vivo y de casi todo el video adaptativo.
    // Va ANTES que el archivo porque un .m3u8 no es un archivo de video: es una lista que apunta a
    // pedacitos, y una etiqueta <video> comun solo lo entiende en Safari y iPhone.
    reconoce: (url) => /\.m3u8(\?|#|$)/i.test(url),
    resolver: (url) => ({
      tipo: 'video',
      src: url,
      // Se marca para que el reproductor pueda avisar con claridad donde NO se puede ver, en vez
      // de mostrar un rectangulo negro sin explicacion — que es lo que hacia hasta hoy.
      hls: true,
      // Una transmision en vivo no tiene "el minuto donde ibas": siempre se entra al ahora.
      recordable: false
    })
  },
  {
    id: 'audio',
    nombre: 'Audio',
    // Antes que el archivo de video: un .mp3 no va en una etiqueta de video.
    // La extension, o que quien llama lo diga. Lo segundo importa: una radio en vivo suele ser una
    // direccion SIN extension ("stream.radio.com/vivo"), y adivinarlo por el nombre es una
    // heuristica que siempre tiene borde. Mejor que el molde lo declare: reproducir(url, { audio: true }).
    reconoce: (url, pistas = {}) => pistas.audio === true || /\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i.test(url),
    resolver: (url) => ({ tipo: 'audio', src: url, recordable: true })
  },
  {
    id: 'archivo',
    nombre: 'Archivo de video',
    reconoce: (url) => /\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(url),
    // El único tipo donde SE PUEDE saber y recordar el minuto: un video incrustado de otro sitio
    // corre adentro de su propio marco y no cuenta nada de lo que pasa ahí adentro.
    resolver: (url) => ({ tipo: 'video', src: url, recordable: true })
  },
  {
    id: 'directo',
    nombre: 'Enlace directo',
    // El último de la fila: si nadie lo reconoció pero parece una dirección, se intenta como video.
    // Vale más intentar y que el navegador diga que no, que negarse de entrada.
    reconoce: (url) => /^https?:\/\//i.test(url),
    resolver: (url) => ({ tipo: 'video', src: url, recordable: true })
  }
];

/**
 * Convierte lo que sea que le hayan pasado en algo reproducible.
 * Devuelve null si no hay nada que reproducir — quien llama tiene que MOSTRARLO, nunca quedarse en
 * blanco: la lección de todo lo que se arregló hoy es que un fallo silencioso es peor que un error.
 */
export const resolverFuente = (fuente, pistas = {}) => {
  const url = typeof fuente === 'string' ? fuente.trim() : String(fuente?.url || '').trim();
  if (!url) return null;
  for (const origen of ORIGENES) {
    if (!origen.reconoce(url, pistas)) continue;
    const resuelto = origen.resolver(url);
    if (resuelto) return { origen: origen.id, nombreOrigen: origen.nombre, url, ...resuelto };
  }
  return null;
};

/** Los orígenes que el sistema entiende. Sirve para el prompt y para explicar un fallo. */
export const ORIGENES_SOPORTADOS = ORIGENES.map(o => ({ id: o.id, nombre: o.nombre }));
