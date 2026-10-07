// 🧬 [2026-08-29] UNA sola definición de "qué código se compila de verdad" cuando se renderiza un
// molde.
//
// El problema que cierra. Un molde no se compila tal como está guardado: primero se le pela el
// fence, se le quitan los `import` y el `export default`, y después se lo ENVUELVE (`render(...)` o
// `const ComponenteGeneradoIA = ...`). Eso significa que validar el `codigo_crudo` a secas no prueba
// lo que la pantalla va a ejecutar: el envoltorio puede generar JS inválido a partir de un molde que
// parsea perfecto. Es la forma exacta del bug del 2026-08-27.
//
// Y estaba escrito DOS veces, una por motor — con una diferencia real entre las copias:
//
//     sandbox        .replace(/^\s*import\s+[^;]+;?\s*$/gm, '')   ← quitaba los imports
//     ReactorRender  (no los quitaba)
//
// El propio comentario del sandbox explica por qué hace falta: un `import React, {...} from 'react'`
// al principio "es justo lo que trae CUALQUIER componente NATIVO materializado", y sin sacarlo el
// ESCENARIO B genera `const ComponenteGeneradoIA = import React...`, que es un SyntaxError. O sea
// que ese molde andaba en el Core y explotaba en el export: la categoría más corroborada del
// sistema, escondida en una diferencia de una línea entre dos copias.
//
// react-live inyecta React y los hooks por `scope` en LOS DOS motores, así que un `import` nunca
// sirve y siempre estorba: se quita siempre.
import { pelarFenceEnvoltorio } from './pelarFence.js';

/** Lo que queda del molde antes de envolverlo. */
export const limpiarMolde = (codigoCrudo) => pelarFenceEnvoltorio(codigoCrudo)
  // Un `import` suelto no tiene sentido acá (no hay contexto de módulo: el scope lo inyecta
  // react-live) y rompe el envoltorio de abajo.
  .replace(/^\s*import\s+[^;]+;?\s*$/gm, '')
  .replace(/export\s+default\s+[a-zA-Z0-9_]+;?/g, '')
  .trim();

/**
 * El código EXACTO que se le entrega al compilador. Si esto cambia, cambia para los dos motores y
 * para el validador del backend a la vez — que es todo el punto de que viva acá.
 */
export const envolverComoElMotor = (codigoCrudo) => {
  const codigoLimpio = limpiarMolde(codigoCrudo);
  if (!codigoLimpio) return '';

  // La IA ya llamó a render() por su cuenta: se respeta tal cual.
  if (codigoLimpio.includes('render(')) return codigoLimpio;

  // ESCENARIO A: JSX puro (ej. <div>…</div>).
  if (codigoLimpio.startsWith('<')) return `render(${codigoLimpio});`;

  // ESCENARIO B: una función. Si viene con nombre ("const MiComp = () => …") se le saca para
  // forzarla a anónima. La expresión tolera comentarios de línea ANTES del "const": sin eso, un
  // comentario líder rompía el match anclado a ^ y el envoltorio generaba
  // "const ComponenteGeneradoIA = // comentario\nconst X = …" — SyntaxError real, encontrado
  // backfillando codigo_crudo de moldes materializados. Se arregló por separado en los dos motores
  // antes de que esto viviera en un solo lugar.
  // 🩹 [2026-08-29] La versión anterior toleraba SOLO comentarios de línea (`//`). Un molde que
  // arrancaba con un comentario de BLOQUE — "/* qué hace este molde */" — no matcheaba, así que el
  // "const Panel =" quedaba adentro y se generaba
  // "const ComponenteGeneradoIA = /* … */\nconst Panel = …", que es un SyntaxError.
  // Lo encontró el validador nuevo en su primera corrida, justamente porque ahora compila el
  // resultado del envoltorio y no el código crudo: con Babel sobre el crudo esto pasaba como válido.
  const fnLimpia = codigoLimpio.replace(/^(\s*(?:\/\/[^\n]*\n|\/\*[^]*?\*\/\s*))*\s*(const|let|var)\s+[a-zA-Z0-9_]+\s*=\s*/, '');

  // 💎 [BUG REAL CONFIRMADO 2026-08-18, reportado por el usuario dos veces: "2 moldes con este error
  // TypeError: Cannot read properties of undefined (reading 'motion')"] Las librerías premium se
  // pasan TAMBIÉN como props, no solo por el scope de react-live. Motivo: cuando la IA escribe la
  // firma "({ datos, tema, UI, MEITI, Animacion, Graficos, Iconos })", esos parámetros SOMBREAN a
  // los globales del scope — y como no venían como props, llegaban "undefined", así que
  // "Animacion.motion" explotaba en tiempo de render. Es un error lógico de la IA (el prompt es
  // explícito en que NO van en la firma), pero pedirlo no alcanza: ya se corrigió una vez limpiando
  // la firma al guardar, y volvió a aparecer apenas un camino de guardado nuevo (páginas
  // pendientes) no pasó por esa limpieza.
  // Pasándolas también como props, la firma sucia deja de importar: reciba o no la IA el mensaje, el
  // molde renderiza igual — y arregla de una los moldes YA guardados con la firma sucia, sin
  // ninguna migración de datos. El spread va DESPUÉS de los demás para que, si alguna vez una
  // librería se llamara igual que un prop existente, gane el kit, no la librería.
  return `
    const ComponenteGeneradoIA = ${fnLimpia};
    render(<ComponenteGeneradoIA datos={datos} tema={tema} UI={UI} MEITI={MEITI} {...LIBRERIAS_PREMIUM} />);
  `;
};
