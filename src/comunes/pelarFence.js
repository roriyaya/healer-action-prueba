/**
 * 🧹 Saca el fence de markdown que ENVUELVE a un bloque de código. Nada más.
 *
 * ⚠️ NUNCA hagas un reemplazo global de ``` sobre el código de un molde.
 *
 * Por qué, con el caso real que lo destapó (2026-08-25 en el backend, 2026-08-27 en el render):
 * el molde `CO_MotorRecomendaciones` de CazadorOportunidades tenía la línea correcta para limpiar
 * la respuesta de Gemini:
 *
 *     texto = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
 *
 * Un `.replace(/```(javascript|jsx|react)?/gi, '')` sobre el FUENTE del molde se come esos
 * backticks y la deja así:
 *
 *     texto = texto.replace(/json/gi, '').replace(//g, '').trim();
 *
 * En JavaScript `//` no es una expresión regular vacía: abre un COMENTARIO. Se come el resto de la
 * línea, la sentencia nunca cierra, y el molde entero deja de parsear. La pantalla no carga nunca.
 *
 * Lo peor del bug es que se muerde la cola: la IA copia el limpiador de fences de NUESTRO propio
 * código (es el patrón obvio para consumir una API de texto), y nuestro limpiador se lo rompe justo
 * a ese. Y es invisible para cualquier chequeo que parsee `codigo_crudo`: en la base el molde está
 * perfecto, la corrupción ocurre en el render, cada vez.
 *
 * Vive acá, en `comunes`, y no copiada en cada punto, porque ya pasó lo contrario: el arreglo se
 * escribió en `oraculo.js` el 2026-08-25 y los TRES caminos de render del frontend
 * (SandboxRuntimeApp, ReactorRender, PreviewMoldeVivo) se quedaron con la versión que corrompe.
 * El molde se reparaba y volvía a romperse en la siguiente carga.
 */
export const pelarFenceEnvoltorio = (codigo) => String(codigo || '')
  .trim()
  .replace(/^```[a-z]*[ \t]*\r?\n?/i, '')   // solo el fence de apertura, y solo si abre
  .replace(/\r?\n?```[ \t]*$/, '')          // solo el de cierre, y solo si cierra
  .trim();

export default pelarFenceEnvoltorio;
