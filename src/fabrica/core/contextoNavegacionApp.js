import { createContext } from 'react';

// 🧭 [HUECO REAL DEL KIT 2026-08-18, encontrado verificando un pedido de cambio en vivo]
//
// El pedido del usuario fue: "una acción en cada moneda que al dar click abra una pantalla nueva
// con un gráfico, una consola de scripts y un formulario". La IA generó las tres piezas bien —
// pero el click NO abría nada, porque el kit MEITI no tenía NINGUNA forma de cambiar de página.
// Lo único que podía hacer era guardar la selección y escribir "Abrí la pestaña Detalle de
// Criptomoneda" en un aviso. Media funcionalidad pedida (y pagada) era literalmente imposible.
//
// No fue un error de la IA: "paginaActivaId" vive en EnvoltorioAppMultiPagina (MotorUI.jsx) y
// nunca bajaba al molde. El molde no tenía a qué llamar.
//
// ⚠️ POR QUÉ CONTEXT Y NO UN PROP: el camino hasta el molde es
// EnvoltorioAppMultiPagina → EnvoltorioMatriz → ComponenteDinamico → motor de render, con TRES
// call sites distintos de EnvoltorioMatriz en MotorUI.jsx (desktop, mobile y la variante sin
// menú). Pasarlo como prop obligaba a tocar los tres y a sumar el prop a la firma de cada
// intermediario — exactamente la forma de la categoría más corroborada del proyecto
// ("regla_no_propagada_a_todos_los_puntos_de_entrada": una capacidad agregada donde nació y
// nunca propagada al resto). Con Context hay UN provider y los consumidores se enganchan solos.
//
// 🚨 Y hay un segundo motivo, más duro: el export standalone (generarArchivosProyectoExportado
// en server.js) adapta MotorUI.jsx con un REEMPLAZO LITERAL DE STRING sobre la línea JSX exacta
// que renderiza <MoldeSandboxeado ... />. Agregarle un prop a esa línea rompe el match, y el
// export sale roto. Con Context esa línea no se toca ni un carácter.
//
// Los DOS motores de render lo consumen, porque son dos caminos vivos distintos:
//   - MoldeSandboxeado.jsx  → app corriendo en el Core (iframe aislado, cruza por postMessage)
//   - ReactorRender.jsx     → app exportada standalone (react-live directo, sin sandbox)
//
// El valor por defecto es una función que avisa y devuelve false — nunca "undefined". Un molde
// puede renderizarse fuera de una app multi-página (preview de arquitecto, sandbox de un molde
// suelto, LegoPanel), y ahí no hay ninguna página hermana a la que ir: tiene que devolver false
// para que el molde muestre su propio aviso, jamás tirar una excepción que rompa el render.
export const ContextoNavegacionApp = createContext({
  irAPagina: () => {
    console.warn('[ MEITI ] irAPagina() fuera de una app multi-página — no hay ninguna página hermana a la que navegar.');
    return false;
  },
  // 🪟 [VENTANA DEL SISTEMA 2026-08-26] Mismo criterio que irAPagina y por el mismo motivo: la
  // ventana la dibuja la APP, no el molde, porque cada molde vive en un iframe cuyo alto es el de
  // su propio contenido — una ventana modal dibujada ahí adentro solo taparía ese molde.
  // Por defecto responde que NO: si un molde pide confirmación donde nadie puede preguntarle a
  // nadie (preview suelta, molde fuera de una app), una acción destructiva NUNCA se ejecuta por
  // silencio. Devuelve una promesa para que el molde la lea con await, igual que el confirm viejo.
  // ▶️ Fuera de una app no hay dónde dibujar el reproductor. Se avisa y se devuelve false, nunca
  // una excepción que rompa el molde entero (mismo criterio que las otras dos de acá).
  reproducir: () => {
    console.warn('[ MEITI ] reproducir() fuera de una app — no hay dónde dibujar el reproductor.');
    return false;
  },
  // 🌐 Fuera de una app no hay idioma de app que cambiar. Mismo criterio: aviso y false.
  cambiarIdioma: () => {
    console.warn('[ MEITI ] cambiarIdioma() fuera de una app — no hay ninguna app a la que cambiarle el idioma.');
    return false;
  },
  confirmar: () => {
    console.warn('[ MEITI ] confirmar() fuera de una app — no hay dónde dibujar la ventana. Se responde que no.');
    return Promise.resolve(false);
  }
});
