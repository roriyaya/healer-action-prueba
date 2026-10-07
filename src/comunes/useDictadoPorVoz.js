// 🎙️ [DICTADO POR VOZ, extraído 2026-09-04] Vivía copiado adentro de EditorConClaude.jsx. Al sumar
// el mismo botón al Asistente de Contenido (pedido explícito del usuario: "icono de activar mic
// importante en este asistente"), se centraliza acá para no plantar una segunda copia de código con
// 3 bugs reales ya encontrados y corregidos (contexto no seguro sin aviso, permiso denegado en
// silencio, "start()" que tira una excepción SÍNCRONA en algunos navegadores de teléfono): "una vez
// y reutilizable".
// 🛡️ [SIN "textos" A PROPÓSITO, 2026-09-04] Al sumar el mismo botón a UI.Chat (kitUI.jsx, que corre
// TANTO afuera como DENTRO del iframe sandboxeado de un molde (ver el comentario grande al
// principio de kitUI.jsx: "componentes puramente presentacionales, sin fetch, sin localStorage")
// se encontró que la versión original importaba "t"/"idiomaActual" de comunes/textos, que SÍ lee
// localStorage: justo lo que ese archivo promete no hacer nunca, porque un sandbox de origen opaco
// puede bloquear ese acceso y tirar abajo el molde entero por un error de una API que ni usa. Fix:
// el hook ya no importa nada de "textos": recibe los mensajes ya traducidos y el idioma como
// parámetro, con defaults en español para quien no los pase.
import { useState, useRef, useEffect } from 'react';

const ReconocimientoDeVoz = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const LOCALE_VOZ = { es: 'es-MX', en: 'en-US' };
const MENSAJES_DEFAULT = {
  errorContexto: 'El dictado por voz necesita una conexión segura (https). Probando por IP local no funciona.',
  errorPermiso: 'No se pudo activar el micrófono. Revisa el permiso en tu navegador.',
  error: 'No se pudo usar el dictado por voz. Prueba de nuevo.'
};

// "entrada"/"setEntrada" son el campo de texto donde se suma el dictado; "onError" recibe el
// mensaje ya traducido cuando algo falla (contexto no seguro, permiso denegado, error genérico).
// Quien usa el hook decide DÓNDE mostrarlo (cada pantalla ya tiene su propio estado de error).
// "opciones.idioma" ('es'/'en', default 'es') fija el idioma de reconocimiento; "opciones.mensajes"
// (parcial, se fusiona con MENSAJES_DEFAULT) permite traducir los 3 mensajes de error.
export const useDictadoPorVoz = (entrada, setEntrada, onError, opciones = {}) => {
  const idioma = opciones.idioma || 'es';
  const mensajes = { ...MENSAJES_DEFAULT, ...(opciones.mensajes || {}) };
  const [escuchando, setEscuchando] = useState(false);
  const reconocedorRef = useRef(null);
  const entradaAlEmpezarRef = useRef('');
  const finalAcumuladoRef = useRef('');
  const ultimoIndiceFinalRef = useRef(-1);
  const ultimoFinalNormalizadoRef = useRef(null);
  const ultimoFinalCrudoRef = useRef('');

  useEffect(() => () => reconocedorRef.current?.stop(), []);

  const alternarVoz = () => {
    if (!ReconocimientoDeVoz) return;
    if (escuchando) { reconocedorRef.current?.stop(); return; }
    // 🩹 [BUG REAL 2026-09-02, reportado en teléfono real: "en PC pregunta si quiere activar, en
    // teléfono da error de permiso, no pregunta"] Exactamente la firma de un contexto NO seguro:
    // el micrófono necesita HTTPS (o "localhost" literal); probar en un teléfono real contra el
    // dev local casi siempre es por IP de LAN, que es HTTP. Ahí el navegador ni pregunta: deniega
    // directo, sin diálogo, es indistinguible de "el usuario dijo que no" si no se chequea esto
    // antes. Cortar acá evita hasta el intento (que igual iba a fallar) y dice la verdad: no es un
    // permiso mal configurado en el teléfono, es el protocolo de esta URL de prueba. En producción
    // (HTTPS) esto no pasa.
    if (!window.isSecureContext) { onError(mensajes.errorContexto); return; }
    const reconocedor = new ReconocimientoDeVoz();
    reconocedor.lang = LOCALE_VOZ[idioma] || 'es-MX';
    reconocedor.continuous = true;
    reconocedor.interimResults = true;
    entradaAlEmpezarRef.current = entrada;
    finalAcumuladoRef.current = '';
    ultimoIndiceFinalRef.current = -1;
    ultimoFinalNormalizadoRef.current = null;
    ultimoFinalCrudoRef.current = '';
    // 🩹 [BUG REAL 2026-09-04, reportado en teléfono real, DOS INTENTOS ANTERIORES INSUFICIENTES:
    // ver commits f7ee257 y a963fe5] Los dos diagnósticos previos asumían que el eco era una
    // repetición EXACTA de la frase completa. La reproducción exacta que dio el usuario (dice
    // "créame una app" UNA sola vez y el campo termina con "créame" + "créame una" + "créame una
    // app") muestra el mecanismo real: en Android, cada resultado final NUEVO no es la palabra
    // siguiente, es el TEXTO ACUMULADO de la frase hasta ese momento, repetido y extendido cada vez
    // que el motor "cierra" un poco más de la misma frase. Como cada uno llega en un índice
    // genuinamente nuevo (nunca visto), ni el chequeo de índice ni el de "es exactamente el mismo
    // texto que el anterior" lo detectaban: "créame una" nunca es idéntico a "créame". Fix real:
    // cuando el nuevo final EMPIEZA con el final anterior (una extensión de la misma frase que
    // sigue creciendo), se REEMPLAZA lo ya sumado por el texto nuevo en vez de sumarlo aparte. Si en
    // cambio el nuevo final es más corto y el anterior empieza con él, es el eco de una versión
    // parcial vieja: se descarta. Solo se suma como frase NUEVA cuando no hay relación de prefijo
    // con la anterior (frases realmente distintas dentro de la misma sesión continua).
    reconocedor.onresult = (evento) => {
      let interino = '';
      for (let i = 0; i < evento.results.length; i++) {
        const resultado = evento.results[i];
        if (resultado.isFinal) {
          if (i > ultimoIndiceFinalRef.current) {
            const textoFinal = resultado[0].transcript;
            const normalizado = textoFinal.trim().toLowerCase();
            const anterior = ultimoFinalNormalizadoRef.current;
            if (anterior === null) {
              finalAcumuladoRef.current += textoFinal;
            } else if (normalizado === anterior) {
              // eco exacto de la misma frase: no se suma de nuevo.
            } else if (normalizado.startsWith(anterior)) {
              // extension acumulativa de la misma frase: reemplaza lo ya sumado, no lo duplica.
              finalAcumuladoRef.current = finalAcumuladoRef.current.slice(0, finalAcumuladoRef.current.length - ultimoFinalCrudoRef.current.length) + textoFinal;
            } else if (!anterior.startsWith(normalizado)) {
              // sin relacion de prefijo con la anterior: es una frase nueva de verdad. El motor no
              // siempre deja un espacio propio entre dos finales sin relacion (visto en pruebas:
              // "hola como estas" + "todo bien" pegaba "estastodo" sin este separador manual).
              const separadorFrase = finalAcumuladoRef.current && !/\s$/.test(finalAcumuladoRef.current) && !/^\s/.test(textoFinal) ? ' ' : '';
              finalAcumuladoRef.current += separadorFrase + textoFinal;
            }
            // si "anterior" empieza con "normalizado" (el nuevo es mas corto), es eco parcial viejo:
            // se descarta sin sumar nada.
            ultimoFinalNormalizadoRef.current = normalizado;
            ultimoFinalCrudoRef.current = textoFinal;
            ultimoIndiceFinalRef.current = i;
          }
        } else if (i > ultimoIndiceFinalRef.current) {
          interino += resultado[0].transcript;
        }
      }
      const separador = entradaAlEmpezarRef.current && !entradaAlEmpezarRef.current.endsWith(' ') ? ' ' : '';
      setEntrada(entradaAlEmpezarRef.current + separador + finalAcumuladoRef.current + interino);
    };
    // 🩹 [BUG REAL 2026-09-02, reportado en teléfono real: "el botón del mic no funciona al
    // click"] Antes, un permiso denegado (o un micrófono bloqueado por el navegador, pasa en
    // contextos no seguros, por ejemplo abrir la app por IP de LAN en vez de "localhost"/https)
    // apagaba "escuchando" en silencio: el botón volvía a su estado normal sin decir nada, y
    // clickearlo se sentía exactamente como "no hace nada". "no-speech"/"aborted" no son errores
    // reales (silencio o el propio "detener" del usuario): esos sí se quedan mudos a propósito.
    reconocedor.onerror = (evento) => {
      setEscuchando(false);
      if (evento.error === 'no-speech' || evento.error === 'aborted') return;
      onError(evento.error === 'not-allowed' || evento.error === 'service-not-allowed' ? mensajes.errorPermiso : mensajes.error);
    };
    reconocedor.onend = () => setEscuchando(false);
    reconocedorRef.current = reconocedor;
    // 🩹 [BUG REAL 2026-09-02, reportado en teléfono real: "por qué el mic no muestra el mensaje
    // del permiso como en la PC"] "onerror" cubre el fallo ASÍNCRONO (el navegador pide permiso y
    // el usuario lo niega), pero algunos navegadores de teléfono rechazan "start()" de forma
    // SÍNCRONA: tira una excepción ahí mismo, antes de que exista ninguna promesa de la que colgar
    // un "onerror". Sin este try/catch esa excepción quedaba sin atrapar: la función cortaba en
    // seco, "setEscuchando(true)" nunca corría, y no había NINGÚN aviso, ni el de "onerror" ni
    // ningún otro. Con esto, cualquiera de las dos formas de fallar termina en el mismo mensaje.
    try {
      reconocedor.start();
      setEscuchando(true);
    } catch (err) {
      onError(mensajes.errorPermiso);
    }
  };

  return { soportado: !!ReconocimientoDeVoz, escuchando, alternarVoz };
};
