// 🗣️ [ERRORES LEGIBLES 2026-08-26] Nace de un caso real: el usuario probando VideoNet encontró
// "Error: Minified React error #130; visit https://react.dev/errors/130?args[]=undefined..." —
// textual, en medio de una pantalla, y lo describió como "este error escondido en el scroll".
//
// El problema no era solo que se viera feo: ese texto no le dice NADA a nadie. Ni al dueño de la
// app, que solo ve jerga en inglés con una URL; ni a quien tiene que arreglarlo, que no sabe qué
// molde falló. En ese caso puntual el diagnóstico tardó una hora de arqueología cuando el propio
// error ya contenía la respuesta: "#130 con undefined" significa exactamente "quisiste dibujar un
// componente que no existe".
//
// Esto traduce los errores que de verdad aparecen en código generado, y deja el original abajo
// para quien lo necesite. Vive en un archivo propio porque los DOS motores de render tienen que
// mostrar lo mismo (ver el comentario de las librerías premium en ReactorRender.jsx: si divergen,
// el mismo molde se explica distinto según dónde corra).
const TRADUCCIONES = [
  {
    // El más común de lejos en código generado: <Algo /> donde "Algo" es undefined.
    prueba: /Minified React error #130|Element type is invalid/i,
    causa: 'El molde intentó dibujar un componente que no existe.',
    pista: 'Casi siempre es un nombre mal escrito o que nunca existió: un ícono (Iconos.Algo), una pieza del kit (UI.Algo) o un gráfico. Los íconos ya tienen reemplazo automático, así que si el error persiste mira los UI.* y los Graficos.*.'
  },
  {
    prueba: /Minified React error #31|Objects are not valid as a React child/i,
    causa: 'El molde intentó mostrar un objeto entero donde va un texto.',
    pista: 'Suele ser un dato de la bóveda usado directo ({fila}) en vez de una de sus columnas ({fila.titulo}), o el resultado de un fetch sin elegir el campo.'
  },
  {
    prueba: /Minified React error #185|Maximum update depth/i,
    causa: 'El molde se quedó en un bucle: cada dibujo dispara otro cambio de estado.',
    pista: 'Normalmente es un setEstado llamado durante el render, o un useEffect sin su lista de dependencias.'
  },
  {
    prueba: /Cannot read propert(y|ies) of (undefined|null)/i,
    causa: 'El molde leyó algo de un dato que todavía no llegó.',
    pista: 'Pasa cuando se usa la respuesta de la bóveda antes de que cargue. Se resuelve con un valor por defecto o preguntando por el dato antes de usarlo.'
  },
  {
    prueba: /is not a function/i,
    causa: 'El molde llamó a una función que no existe en su caja de herramientas.',
    pista: 'Revisa el nombre contra las funciones de MEITI.* y las piezas de UI.* que el kit ofrece de verdad.'
  }
];

/**
 * Devuelve { causa, pista, original } para mostrarle a una persona. Nunca tira: si no reconoce el
 * error, devuelve el mensaje crudo como causa — peor es no decir nada.
 */
export function explicarError(error) {
  const original = (error && (error.message || String(error))) || 'Este molde falló al dibujarse.';
  const conocido = TRADUCCIONES.find(t => t.prueba.test(original));
  if (!conocido) return { causa: original, pista: null, original: null };
  return { causa: conocido.causa, pista: conocido.pista, original };
}
