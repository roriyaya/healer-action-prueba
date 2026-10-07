// 💾 [DESCARGAS 2026-08-26] Bajar un archivo desde un molde: exportar una tabla, un reporte, un
// respaldo. Hasta hoy era imposible y de la peor forma — en silencio: el iframe donde corre un
// molde va con "sandbox=allow-scripts allow-modals allow-forms", SIN "allow-downloads", así que
// cualquier descarga iniciada ahí adentro el navegador la bloquea sin decir nada. Ni un error, ni
// un aviso: el botón simplemente no hace nada. Por eso ningún molde lo intenta (cero en 81).
//
// La descarga la dispara el PADRE, igual que la ventana de confirmar y por el mismo motivo: es la
// página que sí tiene el permiso. El molde pide, el padre baja.
//
// Este archivo existe para que la lógica viva UNA vez: los dos motores de render (el sandbox del
// Core y el export standalone) tienen que producir el MISMO archivo con los mismos datos. Si el
// escape del CSV se escribiera dos veces, tarde o temprano difieren y el mismo molde exporta
// distinto según dónde corra — la categoría "export_codigo_duplicado_desincronizado" en persona.

const TOPE_BYTES = 8 * 1024 * 1024; // 8 MB: un CSV de datos de app nunca se acerca; un abuso, sí.

/**
 * Deja un nombre de archivo seguro. No es cosmética: el nombre viaja desde código generado por IA,
 * así que se le sacan las barras (que podrían apuntar a otra carpeta), los caracteres que Windows
 * no acepta, y se le pone un tope de largo.
 */
export const sanearNombreArchivo = (nombre, extensionPorDefecto = 'txt') => {
  let limpio = String(nombre || '').trim()
    // Separadores de ruta y caracteres que Windows no acepta en un nombre de archivo. El espacio
    // se DEJA a proposito: "reporte de ventas.csv" es un nombre legitimo y mas legible.
    .replace(/[\\/:*?"<>|]/g, '')
    // Los puntos seguidos se colapsan: no son un riesgo real aca (el navegador ignora rutas en
    // "download"), pero un archivo llamado "....etcpasswd.csv" es basura para quien lo recibe.
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
    .trim();
  if (!limpio) limpio = `descarga.${extensionPorDefecto}`;
  if (!/\.[a-zA-Z0-9]{1,8}$/.test(limpio)) limpio += `.${extensionPorDefecto}`;
  return limpio;
};

/**
 * Arma un CSV bien escapado. Está acá y no en cada molde porque el escape es exactamente lo que
 * sale mal cuando se escribe a mano: un nombre con coma parte la fila, unas comillas rompen la
 * celda, y un salto de línea adentro de un texto corre todo lo que sigue.
 *
 * "columnas" es opcional y acepta la MISMA forma que UI.TablaDatos ({clave, etiqueta}), para que
 * exportar lo que se ve sea pasarle las mismas columnas de la tabla.
 */
export const construirCSV = (filas, columnas = null) => {
  const datos = Array.isArray(filas) ? filas : [];
  const cols = Array.isArray(columnas) && columnas.length > 0
    ? columnas.map(c => (typeof c === 'string' ? { clave: c, etiqueta: c } : { clave: c.clave, etiqueta: c.etiqueta || c.clave }))
    : Object.keys(datos[0] || {}).map(k => ({ clave: k, etiqueta: k }));

  const celda = (v) => {
    if (v === null || v === undefined) return '';
    const texto = typeof v === 'object' ? JSON.stringify(v) : String(v);
    // Se entrecomilla si tiene coma, comillas o salto de línea; y las comillas de adentro se
    // duplican, que es como manda el formato.
    return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  const lineas = [cols.map(c => celda(c.etiqueta)).join(',')];
  datos.forEach(f => lineas.push(cols.map(c => celda(f?.[c.clave])).join(',')));
  // El BOM al principio no es adorno: sin él, Excel abre un CSV en UTF-8 y muestra "Ã±" donde va
  // una ñ. Es la diferencia entre un export que sirve y uno que el dueño de la app tira.
  return '﻿' + lineas.join('\r\n');
};

/**
 * La descarga real. Solo la llama quien TIENE el permiso: la página padre (o el export standalone,
 * que no vive en un iframe). Devuelve false si no pudo, nunca tira.
 */
export const descargarEnNavegador = (nombre, contenido, tipo = 'text/plain;charset=utf-8') => {
  try {
    if (typeof document === 'undefined') return false;
    const texto = typeof contenido === 'string' ? contenido : String(contenido ?? '');
    if (texto.length > TOPE_BYTES) {
      console.warn(`[ MEITI ] Descarga cancelada: ${texto.length} caracteres supera el tope de ${TOPE_BYTES}.`);
      return false;
    }
    const blob = new Blob([texto], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanearNombreArchivo(nombre);
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Se libera en el próximo tick: revocar en el mismo instante cancela la descarga en Safari.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch (e) {
    console.warn('[ MEITI ] No se pudo descargar:', e.message);
    return false;
  }
};
