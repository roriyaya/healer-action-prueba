import crypto from 'crypto';

// 📦 [ALMACENAMIENTO EXTERNO 2026-08-26] Idea del usuario, textual: "no podemos alojar todavía
// nosotros en el VPS, está muy escaso... lo que sí podemos hacer es un molde que tenga una config
// de un proveedor de uploads grande y que la IA lo use para linkear los archivos, tal cual si fuera
// en MEITI pero en vez de rutas locales serían URLs construidas en base a la config".
//
// EL PRINCIPIO, que es lo que hace que esto no cueste nada de servidor:
//
//   MEITI es el ESCRIBANO, no el DEPÓSITO.
//
// El archivo NUNCA pasa por el VPS, ni siquiera de tránsito: si pasara, se comería RAM y ancho de
// banda, que es justo lo que no hay. Acá solo se FIRMA — una cuenta de microsegundos, sin un byte
// de tráfico — y el navegador sube directo al proveedor con esa firma. El VPS no ve el archivo.
//
// La cuenta es DEL DUEÑO DE LA APP, no de MEITI: se guarda en "llaves_sistema" como cualquier otra
// conexión (ver /api/conexiones-app y la pantalla de Conexiones seguras), así que MEITI nunca paga
// almacenamiento ni queda como responsable de archivos ajenos.
//
// Por qué la subida va FIRMADA y no "abierta": casi todos estos proveedores permiten una subida sin
// firma (un "preset público"). Es más fácil y es una trampa: ese preset viaja en el JavaScript de la
// app, así que cualquiera que abra las herramientas del navegador puede subir a la cuenta del dueño
// hasta llenarla. Con firma, cada subida necesita una autorización que sale de acá y dura minutos.
//
// Agregar un proveedor nuevo es sumar una entrada acá y nada más — mismo criterio que los packs de
// estilo (src/backend/estilos/): un archivo, una línea, y el resto del sistema no se entera.

const VENCIMIENTO_FIRMA_SEG = 10 * 60; // 10 minutos: alcanza para subir, no para repartir la firma.

export const PROVEEDORES = {
  // ☁️ Cloudinary primero por tres motivos concretos, no por gusto: su plan gratis es usable de
  // verdad, acepta imagen Y VIDEO (que es lo que destapó el caso VideoNet), y genera las miniaturas
  // solo — una portada no se baja en tamaño original, que en un teléfono es la diferencia entre una
  // app que carga y una que no.
  cloudinary: {
    id: 'cloudinary',
    nombre: 'Cloudinary',
    // Lo que el dueño tiene que pegar. "publica" viaja al navegador; "secreta" NUNCA sale del VPS.
    campos: [
      { clave: 'cloud_name', etiqueta: 'Cloud name', secreto: false },
      { clave: 'api_key', etiqueta: 'API Key', secreto: false },
      { clave: 'api_secret', etiqueta: 'API Secret', secreto: true }
    ],
    ayuda: 'Se sacan de Cloudinary → Dashboard, arriba de todo. El plan gratis alcanza para empezar.',
    /**
     * Devuelve TODO lo que el navegador necesita para subir directo, y nada más. El secreto se usa
     * para calcular la firma y no se incluye en la respuesta — ese es el punto del mecanismo.
     */
    firmar: ({ config, carpeta }) => {
      const timestamp = Math.floor(Date.now() / 1000);
      // Cloudinary firma los parámetros ordenados alfabéticamente, unidos por "&", con el secreto
      // pegado al final. Cualquier parámetro que el navegador mande y que no esté acá, lo rechaza —
      // por eso la carpeta va firmada: el dueño no puede terminar con archivos desparramados.
      const aFirmar = `folder=${carpeta}&timestamp=${timestamp}`;
      // 🩹 [BUG REAL 2026-09-11] Cloudinary cambió el algoritmo de firma por defecto a SHA-256 para
      // toda cuenta nueva (Settings → Security → Signature algorithm) — SHA-1 solo sigue siendo el
      // default en cuentas viejas. Firmar siempre con SHA-1 rechazaba la subida con "Invalid
      // Signature" en cualquier cuenta creada después del cambio, sin ninguna forma de saberlo desde
      // acá salvo probando contra la API real (confirmado así: mismo "string to sign" que Cloudinary
      // reportaba en el error, solo cambiaba el algoritmo).
      const firma = crypto.createHash('sha256').update(aFirmar + config.api_secret).digest('hex');
      return {
        url: `https://api.cloudinary.com/v1_1/${config.cloud_name}/auto/upload`,
        // "auto" y no "image": el mismo endpoint acepta imagen, video y archivo suelto, así que un
        // solo camino sirve para todo — que era el punto de "serviría para todo en general".
        campos: { api_key: config.api_key, timestamp: String(timestamp), signature: firma, folder: carpeta },
        // Cloudinary devuelve la URL final en su respuesta ("secure_url"): no hay que construirla
        // a mano, que es donde se rompen estas integraciones cuando el proveedor cambia el formato.
        campoUrlEnRespuesta: 'secure_url',
        vence: timestamp + VENCIMIENTO_FIRMA_SEG
      };
    }
  }
};

/** Los proveedores que el dueño puede elegir, sin un solo dato sensible. */
export const CATALOGO_PROVEEDORES = Object.values(PROVEEDORES).map(p => ({
  id: p.id, nombre: p.nombre, ayuda: p.ayuda,
  campos: p.campos.map(c => ({ clave: c.clave, etiqueta: c.etiqueta, secreto: c.secreto }))
}));

/**
 * La carpeta donde caen los archivos de una app. Va firmada, así que el navegador no puede
 * cambiarla: los archivos de una app nunca terminan mezclados con los de otra dentro de la misma
 * cuenta del dueño.
 */
export const carpetaDeApp = (ecosistemaApp) =>
  `meiti/${String(ecosistemaApp || 'app').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || 'app'}`;

/**
 * Vuelve a armar el campo secreto de un proveedor a partir de lo guardado. Existe porque la tabla
 * "llaves_sistema" guarda UN secreto en su propia columna (llave_secreta) y el resto de la config
 * en JSON: acá se los vuelve a juntar sin que el nombre del campo quede escrito en el server, que
 * es lo que obligaría a tocar el server cada vez que se suma un proveedor con otro nombre de campo.
 */
export const camposSecretosDe = (idProveedor, valorGuardado) => {
  const proveedor = PROVEEDORES[idProveedor];
  if (!proveedor) return {};
  const campoSecreto = proveedor.campos.find(c => c.secreto);
  return campoSecreto ? { [campoSecreto.clave]: valorGuardado } : {};
};

/**
 * Firma una subida. Devuelve null si el proveedor no existe o la config está incompleta — quien
 * llama tiene que decirle al dueño que falta configurar, NUNCA fallar en silencio (esa es la
 * lección de todo lo que se arregló hoy).
 */
export const firmarSubida = (idProveedor, config, ecosistemaApp) => {
  const proveedor = PROVEEDORES[idProveedor];
  if (!proveedor || !config) return null;
  const faltan = proveedor.campos.filter(c => !String(config[c.clave] || '').trim()).map(c => c.etiqueta);
  if (faltan.length > 0) return { error: `Falta completar: ${faltan.join(', ')}.` };
  try {
    return { proveedor: proveedor.id, ...proveedor.firmar({ config, carpeta: carpetaDeApp(ecosistemaApp) }) };
  } catch (e) {
    return { error: 'No se pudo preparar la subida con esa configuración.' };
  }
};
