// ╔══════════════════════════════════════════════════════════════════════════════════════════════╗
// ║  💾  MUTACIONES SEGURAS — que el camino del éxito no pueda correr si la operación falló       ║
// ╚══════════════════════════════════════════════════════════════════════════════════════════════╝
//
// [2026-08-19] Categoría "mutante_sin_validar_respuesta": la IA llama a "MEITI.fetchMutante(...)"
// con DELETE/POST/PUT y NO revisa ".ok" antes de refrescar la lista y limpiar el formulario. Si el
// servidor rechaza la operación, la pantalla actúa como si hubiera salido bien: el registro sigue
// existiendo pero desapareció de la vista hasta el próximo refresco, y nadie se entera.
//
// POR QUÉ NO ALCANZÓ CON ENSEÑARLO. Ya estaba documentado como lección Y como regla del prompt, con
// ejemplo de código correcto e incorrecto. Igual volvió a aparecer en apps distintas — tanto que el
// propio pipeline lo registró: "ya apareció en más de una app distinta pese a estar documentada
// como lección, probablemente necesita un fix directo en el prompt maestro, no solo otra lección".
//
// Es exactamente la misma señal que dio "data0_sin_verificar_propietario", y aquella se resolvió el
// 2026-08-06 del único modo que funcionó: NO con otra regla, sino con una función que hace imposible
// escribir la versión mala ("MEITI.fetchDatosPropios", que re-filtra sola). Esa categoría pasó de 24
// casos a CERO y no volvió a aparecer nunca más. Esto es lo mismo, para la otra mitad del problema.
//
// EL DIAGNÓSTICO REAL: la herramienta ya existía, pero el chequeo era OPCIONAL. "fetchMutante"
// devuelve "{ ok, error, data }" y confía en que quien la llama se acuerde de mirar ".ok". Todo lo
// que es opcional se olvida — no por falta de conocimiento, sino porque el código que sigue después
// está separado del que decide si corresponde ejecutarlo.
//
// EL ARREGLO: que lo que pasa DESPUÉS del éxito sea un parámetro. Así no queda dónde escribir la
// versión rota: no hay línea "siguiente" que pueda correr sola, porque la continuación vive adentro
// de la llamada.
//
//   ❌ ANTES:  await MEITI.fetchMutante(url, { method: 'DELETE' });
//              cargarDatos(); setForm(vacio);        ← corre igual si falló
//
//   ✅ AHORA:  await MEITI.mutar(url, { method: 'DELETE' }, {
//                alLograr: () => { cargarDatos(); setForm(vacio); },
//                alFallar: setError
//              });
//
// "fetchMutante" sigue existiendo y no cambia: hay usos legítimos donde hace falta el resultado
// crudo (leer el "data" devuelto para encadenar otra cosa). Lo que cambia es cuál es el camino
// recomendado en el prompt para el caso común, que es el 99%.

/**
 * Arma las dos funciones a partir del "fetchMutante" de cada entorno.
 *
 * Se recibe por parámetro en vez de importarlo: hay TRES entornos que construyen el objeto MEITI
 * —la app exportada (ReactorRender), el iframe del Core (meitiIframeShim) y el preview de dev-tools
 * (PreviewMoldeVivo)— y cada uno tiene su propio "fetchMutante" (rutas absolutas, postMessage al
 * padre, o una respuesta simulada). Lo que comparten es la REGLA, no el transporte, así que lo
 * único que vive una sola vez acá es la regla.
 */
export const construirMutacionesSeguras = (fetchMutante) => ({
  /**
   * 📖 Leer algo que NO es una lista: un plano, un resumen, un estado.
   *
   * [2026-08-20] Hueco real encontrado revisando por qué un molde BASE del sistema
   * ("BASE__PanelManualInstalacion") usaba "fetch" crudo pese a que la regla lo prohíbe. No era
   * desprolijidad: NO TENÍA HERRAMIENTA. "fetchDatos" devuelve siempre un array
   * ("data.registros || data.nodos || []"), así que leer un objeto con él devuelve una lista vacía
   * y pierde la respuesta entera. La única función que devuelve el cuerpo crudo era "fetchMutante",
   * que por nombre es para ESCRIBIR — nadie la busca para leer.
   *
   * Con el hueco tapado, "nunca uses fetch crudo" pasa a ser una regla que se puede cumplir siempre:
   * lista → fetchDatos, objeto → fetchObjeto, escribir → mutar. No queda ningún caso sin cubrir.
   *
   * Hereda gratis lo que ya hace el transporte de cada entorno: resuelve la URL absoluta (una ruta
   * relativa funciona en el sandbox y se rompe apenas la app se exporta), manda la sesión solo si el
   * destino es propio, y nunca tira una excepción suelta.
   */
  fetchObjeto: async (url) => {
    const resultado = await fetchMutante(url, { method: 'GET' });
    return { ok: resultado.ok, data: resultado.data, error: resultado.error || null };
  },


  /**
   * Una escritura (POST/PUT/DELETE). "alLograr" corre SOLO si el servidor confirmó.
   * Devuelve igual "{ ok, error, data }" por si hace falta seguir mirándolo.
   */
  // 🩹 [BUG REAL 2026-09-01] Renombrado del slug viejo (mutante_sin_validar_respuesta) al formato
  // de ruta de la taxonomía de 2026-08-25 — el viejo nunca hizo match tras la migración, ver
  // REGEX_CURA en server.js.
  // CURA: datos/escritura/mutante-sin-validar
  mutar: async (url, opciones = {}, { alLograr, alFallar } = {}) => {
    const resultado = await fetchMutante(url, opciones);
    if (resultado.ok) {
      if (alLograr) await alLograr(resultado.data);
    } else if (alFallar) {
      alFallar(resultado.error);
    }
    return resultado;
  },

  /**
   * Varias escrituras que tienen que salir bien TODAS (ej. los dos equipos de un partido, o un
   * registro y su contraparte). "alLograr" corre solo si ninguna falló.
   *
   * Existe por un bug real ya confirmado (TorneoRanking2, 2026-08-08): con "Promise.all" de dos
   * "fetchMutante", el código revisaba el ".ok" del primero y daba por buenos los dos. Acá no hay
   * un "primero" que mirar — o salieron todas, o no corre la continuación.
   *
   *   MEITI.mutarVarias(
   *     [{ url: urlA, opciones: {...} }, { url: urlB, opciones: {...} }],
   *     { alLograr: () => cargarDatos(), alFallar: setError }
   *   )
   */
  mutarVarias: async (peticiones = [], { alLograr, alFallar } = {}) => {
    const resultados = await Promise.all(
      (peticiones || []).map(p => fetchMutante(p.url, p.opciones || {}))
    );
    const primeraFalla = resultados.find(r => !r || !r.ok);
    if (primeraFalla) {
      const error = primeraFalla.error || 'No se pudo completar la operación.';
      if (alFallar) alFallar(error);
      return { ok: false, error, resultados };
    }
    if (alLograr) await alLograr(resultados.map(r => r.data));
    return { ok: true, error: null, resultados };
  }
});
