// 🖥️ Backend LOCAL autogenerado al exportar "TablerosNorte" desde MEITI — reemplaza por
// completo al backend original, no llama a ninguna URL de MEITI. Mismo contrato de
// /api/boveda/:tabla que el Core (auto-crea tablas al primer POST, ?usuario_id= filtra
// si la tabla tiene esa columna).
import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs, { readFileSync } from 'fs';
import crypto from 'crypto';
// 📦 [ALMACENAMIENTO 2026-08-26] El registro de proveedores viaja en el zip y se importa: la lógica
// de firma vive UNA vez. Escribirla de nuevo acá sería la divergencia silenciosa de siempre.
import { CATALOGO_PROVEEDORES, firmarSubida, camposSecretosDe } from './almacenamientoExterno.js';
// 🔐 Accesos: admin inicial, código de administrador y permisos por tabla (ver accesosExport.js).
import { crearAccesos, prepararAccesoLocal } from './accesosExport.js';
// El id de esta app, congelado al exportar. Sirve para que los archivos caigan en su propia carpeta
// dentro de la cuenta del dueño, igual que en MEITI.
const ECOSISTEMA_APP = "TablerosNorte_muugzt8s";
import { Resend } from 'resend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// 🔒 "origin: true, credentials: true" (no la wildcard "*") — necesario para que la cookie de
// sesión del login propio (si esta app la usa) pueda viajar. Inofensivo si la app no usa login.
app.use(cors({ origin: true, credentials: true }));
// 🩹 100kb (default de Express) no alcanza para una foto real guardada como Base64 — mismo
// bug ya encontrado y corregido en el backend real de MEITI.
app.use(express.json({ limit: '10mb' }));

// 🖥️ MEITI_DATA_DIR (seteada por electron/main.js cuando corre empaquetado como escritorio):
// dentro de un .exe/.app instalado, __dirname cae adentro del paquete de solo lectura (asar) —
// SQLite necesita escribir en una carpeta real de datos del usuario (app.getPath('userData')).
// Corriendo suelto con "npm run dev" (sin Electron) sigue usando esta misma carpeta de siempre.
const dirDatos = process.env.MEITI_DATA_DIR || __dirname;
const db = new sqlite3.Database(path.join(dirDatos, 'data.sqlite'));
const dbAll = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
const dbGet = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const dbRun = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function (err) { err ? reject(err) : resolve(this); }));

const accesos = crearAccesos({
  dbGet, dbAll, dbRun, ecosistema: ECOSISTEMA_APP,
  acceso: (() => {
    // Exportada para su dueño: trae su admin. Plantilla pública (acceso_admin.json vacío): esta
    // instalación crea el suyo en el primer arranque y lo guarda junto a data.sqlite.
    const delZip = JSON.parse(readFileSync(path.join(__dirname, 'acceso_admin.json'), 'utf8'));
    if (delZip.hash || !false) return delZip;
    return prepararAccesoLocal(path.join(dirDatos, 'acceso_admin.local.json'), process.env.MEITI_ADMIN_EMAIL, fs);
  })(),
  permisos: JSON.parse(readFileSync(path.join(__dirname, 'permisos_tablas.json'), 'utf8')),
  tienePersonal: false
});

// 🧬 Esquema inicial (tablas propias de esta app) — se auto-crean igual si faltan.
const ESQUEMA_INICIAL = [
  "CREATE TABLE IF NOT EXISTS configuracion_app (id TEXT PRIMARY KEY, seccion TEXT DEFAULT 'ayuda', titulo TEXT, cuerpo TEXT, tono TEXT DEFAULT 'neutro', orden INTEGER DEFAULT 0, fecha DATETIME DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS roles_usuarios_app (id TEXT PRIMARY KEY, usuario_id TEXT, email_visible TEXT, rol TEXT DEFAULT 'lector', fecha_alta DATETIME DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS en_tarjetas (id TEXT PRIMARY KEY, proyecto_id TEXT, titulo TEXT, descripcion TEXT, columna_id TEXT, prioridad TEXT, fecha_limite TEXT, asignado_id TEXT, fecha_creacion TEXT); CREATE TABLE IF NOT EXISTS en_ui_estado (id TEXT PRIMARY KEY, usuario_id TEXT, tarjeta_activa_id TEXT);",
  "CREATE TABLE IF NOT EXISTS en_checklists (id TEXT PRIMARY KEY, tarjeta_id TEXT, texto TEXT, completado INTEGER); CREATE TABLE IF NOT EXISTS en_comentarios (id TEXT PRIMARY KEY, tarjeta_id TEXT, autor_id TEXT, texto TEXT, fecha TEXT);",
  "CREATE TABLE IF NOT EXISTS en_proyectos (id TEXT PRIMARY KEY, nombre TEXT, descripcion TEXT, color TEXT, estado TEXT);",
  "CREATE TABLE IF NOT EXISTS en_miembros (id TEXT PRIMARY KEY, nombre TEXT, rol TEXT, email TEXT, avatar_url TEXT); CREATE TABLE IF NOT EXISTS en_columnas (id TEXT PRIMARY KEY, nombre TEXT, orden INTEGER, color TEXT);",
  "CREATE TABLE IF NOT EXISTS en_columnas (id TEXT PRIMARY KEY, nombre TEXT, orden INTEGER, color TEXT);"
];
(async () => {
  for (const q of ESQUEMA_INICIAL) {
    try { await dbRun(q); } catch (e) { console.error('[SEED] Fallo al sembrar tabla:', e.message); }
  }
  // 🔐 Tabla LOCAL de credenciales de conexiones externas — nunca viaja en el zip, la carga
  // el dueño después de exportar (ver /api/configuracion/conexiones y ConfiguracionConexiones.jsx).
  try { await dbRun('CREATE TABLE IF NOT EXISTS llaves_locales (servicio TEXT PRIMARY KEY, llave_secreta TEXT, token_auth TEXT, dominio_confiado TEXT, remitente TEXT)'); } catch (e) { console.error('[SEED] Fallo al crear llaves_locales:', e.message); }
  try { await accesos.sembrarAdmin(); } catch (e) { console.error('[SEED] Fallo al sembrar el administrador:', e.message); }
  try { await dbRun('CREATE TABLE IF NOT EXISTS codigos_acceso_app (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, codigo TEXT, expira TEXT, usado INTEGER DEFAULT 0, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP)'); } catch (e) { console.error('[SEED] Fallo al crear codigos_acceso_app:', e.message); }
  try { await dbRun('CREATE TABLE IF NOT EXISTS sesiones_app (token TEXT PRIMARY KEY, email TEXT, fecha_expiracion TEXT)'); } catch (e) { console.error('[SEED] Fallo al crear sesiones_app:', e.message); }
})();

// 📡 Servicios que esta app necesita (congelado al exportar) — para que la pantalla de
// configuración sepa qué pedirle al dueño sin tener que adivinar mirando el código.
const serviciosRequeridos = JSON.parse(readFileSync(path.join(__dirname, 'servicios_requeridos.json'), 'utf8'));

// 🛡️ A DÓNDE SE LE PERMITE HABLAR AL SERVIDOR CUANDO EL DESTINO LO ELIGE OTRO.
//
// "/api/puente" existe para que un molde pueda usar una API externa sin que la credencial pase por
// el navegador. El precio es que el SERVIDOR hace la petición, y el servidor está adentro: no tiene
// la CSP del sandbox ni la lista de rutas permitidas. Si el destino lo elige el llamante, el puente
// es una ventana a la red interna del VPS. Eso es un SSRF y es la clase de agujero por la que se
// leen credenciales de nube.
//
// El 2026-08-29 se midió el guardián que había, comparando TEXTO del hostname, y tenía tres huecos.
// Los tres probados con respuestas reales, no en teoría:
//
//   1. IPv6. "new URL('http://[::1]:3001/').hostname" devuelve "[::1]" CON CORCHETES, así que
//      "host === '::1'" nunca coincidía y "startsWith('fd')" tampoco. TODO IPv6 loopback o privado
//      pasaba. Probado: llegó al backend y devolvió su HTML.
//   2. Nombres DNS. "localtest.me" resuelve a 127.0.0.1 y pasaba entero, porque el texto no dice
//      nada. Probado: se alcanzó un servicio interno en 127.0.0.1:9099 y devolvió su JSON. Que
//      "127.0.0.1.nip.io" quedara bloqueado era CASUALIDAD — lo frenó el texto, no la resolución.
//   3. Redirecciones. "fetch" las sigue solo por defecto, así que un host permitido podía rebotar
//      a uno interno y el guardián no volvía a mirar. Probado igual, con un 302.
//
// Por eso acá no se mira texto: se RESUELVE el nombre y se juzga cada dirección que devuelve, y
// cada salto de una redirección vuelve a pasar por lo mismo.
//
// ⚠️ LO QUE ESTO NO CIERRA, dicho de frente: entre que se resuelve el nombre y que "fetch" abre la
// conexión, el DNS puede contestar distinto (DNS rebinding). Cerrarlo del todo exige fijar la IP en
// la conexión, que necesita un dispatcher de undici — undici no es dependencia declarada del
// proyecto y NO existe en el backend que se exporta al dueño, así que el arreglo no podría ser el
// mismo en los dos lados, y un guardián con dos versiones es justo el bug que esto viene a cerrar.
// Queda anotado: el caso práctico (un nombre fijo apuntando a una IP interna) sí queda cerrado.
//
// 🔁 ESTE ARCHIVO ES LA ÚNICA COPIA. El backend del export NO lo duplica a mano: el generador
// inserta el texto real de este archivo. Antes había dos copias y la del export nunca recibió
// ningún arreglo — la misma categoría que ya lleva dieciséis registros en core_logs.
import dns from 'node:dns';
import net from 'node:net';

// Direcciones IPv4 a las que un destino elegido por otro nunca debería llegar.
const bloqueadaV4 = (ip) => {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0) return true;                          // 0.0.0.0/8 — "esta red"
  if (a === 10) return true;                         // privada
  if (a === 127) return true;                        // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 — CGNAT
  if (a === 169 && b === 254) return true;           // link-local, incluye la metadata de nube
  if (a === 172 && b >= 16 && b <= 31) return true;  // privada
  if (a === 192 && b === 168) return true;           // privada
  if (a >= 224) return true;                         // multicast y reservadas
  return false;
};

// Expande un IPv6 a sus 8 grupos. Devuelve null si no se puede leer — y no poder leerlo se trata
// como peligroso, nunca como seguro.
const aGrupos = (ip) => {
  let texto = ip.trim().toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  let colaV4 = null;
  const mV4 = /(?:^|:)((?:\d{1,3}\.){3}\d{1,3})$/.exec(texto);
  if (mV4) {
    const o = mV4[1].split('.').map(Number);
    if (o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    colaV4 = [(o[0] << 8) | o[1], (o[2] << 8) | o[3]];
    texto = texto.slice(0, mV4.index + (mV4[0].startsWith(':') ? 1 : 0));
    if (texto.endsWith(':') && !texto.endsWith('::')) texto = texto.slice(0, -1);
  }
  const faltantes = colaV4 ? 6 : 8;
  const partes = texto.split('::');
  if (partes.length > 2) return null;
  const leer = (t) => (t ? t.split(':').filter((x) => x !== '').map((x) => parseInt(x, 16)) : []);
  let grupos;
  if (partes.length === 2) {
    const izq = leer(partes[0]);
    const der = leer(partes[1]);
    const relleno = faltantes - izq.length - der.length;
    if (relleno < 0) return null;
    grupos = [...izq, ...new Array(relleno).fill(0), ...der];
  } else {
    grupos = leer(partes[0]);
    if (grupos.length !== faltantes) return null;
  }
  if (colaV4) grupos = [...grupos, ...colaV4];
  if (grupos.length !== 8 || grupos.some((g) => !Number.isInteger(g) || g < 0 || g > 0xffff)) return null;
  return grupos;
};

const bloqueadaV6 = (ip) => {
  const g = aGrupos(ip);
  if (!g) return true;
  // Un IPv4 disfrazado de IPv6 se juzga como el IPv4 que es: ::ffff:127.0.0.1 es loopback,
  // y sin esto entraba por la puerta de al lado.
  const esMapeada = g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0xffff;
  const esNat64 = g[0] === 0x64 && g[1] === 0xff9b;
  if (esMapeada || esNat64) {
    const a = (g[6] >> 8) & 0xff, b = g[6] & 0xff, c = (g[7] >> 8) & 0xff, d = g[7] & 0xff;
    return bloqueadaV4(`${a}.${b}.${c}.${d}`);
  }
  if (g.every((x) => x === 0)) return true;                          // ::
  if (g[0] === 0 && g.slice(1, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return true;                       // fc00::/7 — únicas locales
  if ((g[0] & 0xffc0) === 0xfe80) return true;                       // fe80::/10 — enlace local
  if ((g[0] & 0xff00) === 0xff00) return true;                       // ff00::/8 — multicast
  return false;
};

const esIPBloqueada = (ip) => {
  const tipo = net.isIP(String(ip).replace(/^\[|\]$/g, ''));
  if (tipo === 4) return bloqueadaV4(String(ip));
  if (tipo === 6) return bloqueadaV6(String(ip));
  return true; // ni una cosa ni la otra: no se deja pasar lo que no se entiende
};

const resolverTodas = (host) => new Promise((resolve) => {
  dns.lookup(host, { all: true, verbatim: true }, (err, direcciones) => {
    resolve(err ? null : (direcciones || []).map((d) => d.address));
  });
});

/**
 * Juzga un destino completo: el esquema, el hostname, y TODAS las direcciones a las que resuelve.
 *
 * "resolver" se puede reemplazar SOLO para probar. Existe porque el chequeo determinístico corre en
 * cada arranque del backend y no puede depender de internet: sin poder inyectar un resolutor, la
 * única parte que de verdad importa (que el veredicto salga de la RESOLUCIÓN y no del texto del
 * nombre) quedaba sin probar — y quedó demostrado saboteándola: se le sacó la resolución y el
 * chequeo siguió en verde.
 * @returns {Promise<{ok: boolean, motivo?: string}>}
 */
const analizarDestino = async (urlString, { resolver = resolverTodas } = {}) => {
  let u;
  try { u = new URL(String(urlString)); }
  catch (e) { return { ok: false, motivo: 'La dirección no es válida.' }; }

  // Solo http/https. "file:", "gopher:" y compañía son otras formas de leer el disco o hablarle a
  // un servicio interno.
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, motivo: `Protocolo no permitido: ${u.protocol}` };
  }

  // Los corchetes del IPv6 vienen incluidos en "hostname": sacarlos es el bug 1 de arriba.
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return { ok: false, motivo: 'La dirección no tiene host.' };

  // Si ya es una IP escrita a mano, se juzga directo (no hay nada que resolver).
  if (net.isIP(host)) {
    return esIPBloqueada(host)
      ? { ok: false, motivo: 'Destino interno o reservado.' }
      : { ok: true };
  }

  // "localhost" y los nombres del propio equipo, aunque el DNS de la máquina diga cualquier cosa.
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'localhost.localdomain') {
    return { ok: false, motivo: 'Destino interno o reservado.' };
  }

  const direcciones = await resolver(host);
  if (!direcciones || direcciones.length === 0) {
    return { ok: false, motivo: 'No se pudo resolver el destino.' };
  }
  // TODAS tienen que ser públicas: alcanza con que una sea interna para que el sistema operativo
  // termine usándola.
  if (direcciones.some((ip) => esIPBloqueada(ip))) {
    return { ok: false, motivo: 'Destino interno o reservado.' };
  }
  return { ok: true };
};

// Cabeceras que llevan una credencial. En un salto que cambia de origen NO viajan: si un host
// permitido redirige a otro lado, la llave del dueño no se va con él.
const CABECERAS_CON_CREDENCIAL = ['authorization', 'cookie', 'x-api-key', 'x-session-token'];

/**
 * fetch con el destino juzgado en CADA salto. Las redirecciones se siguen a mano, nunca solas.
 */
const fetchDestinoSeguro = async (urlInicial, config = {}, opciones = {}) => {
  const maxSaltos = opciones.maxSaltos ?? 3;
  const msTimeout = opciones.msTimeout ?? 15000;
  let url = String(urlInicial);
  let cfg = { ...config };
  const origenInicial = (() => { try { return new URL(url).origin; } catch (e) { return null; } })();

  for (let salto = 0; salto <= maxSaltos; salto++) {
    const veredicto = await analizarDestino(url);
    if (!veredicto.ok) {
      const e = new Error(veredicto.motivo);
      e.destinoBloqueado = true;
      throw e;
    }
    const respuesta = await fetch(url, {
      ...cfg,
      redirect: 'manual',
      signal: AbortSignal.timeout(msTimeout)
    });

    const destinoSalto = respuesta.headers.get('location');
    if (respuesta.status >= 300 && respuesta.status < 400 && destinoSalto) {
      const siguiente = new URL(destinoSalto, url).toString();
      // Cambió de origen: la credencial se queda acá.
      let origenNuevo = null;
      try { origenNuevo = new URL(siguiente).origin; } catch (e) { /* lo juzga analizarDestino */ }
      if (origenNuevo !== origenInicial && cfg.headers) {
        const limpias = {};
        for (const [k, v] of Object.entries(cfg.headers)) {
          if (!CABECERAS_CON_CREDENCIAL.includes(k.toLowerCase())) limpias[k] = v;
        }
        cfg = { ...cfg, headers: limpias };
      }
      // 303, y 301/302 sobre POST, se convierten en GET sin cuerpo, como manda el estándar.
      if (respuesta.status === 303 || ((respuesta.status === 301 || respuesta.status === 302) && cfg.method && cfg.method !== 'GET' && cfg.method !== 'HEAD')) {
        cfg = { ...cfg, method: 'GET', body: undefined };
      }
      url = siguiente;
      continue;
    }
    return respuesta;
  }
  const e = new Error('Demasiadas redirecciones.');
  e.destinoBloqueado = true;
  throw e;
};


// 🩹 BUG REAL CONFIRMADO (2026-08-06, auditoría de seguridad): mismo patrón exacto ya encontrado
// y arreglado en el /api/boveda real de MEITI (ver sanitizarColumnaSQL más arriba en este mismo
// archivo) — esta copia embebida (el backend que se genera para cada export standalone) nunca
// recibió el mismo fix: los nombres de columna del JSON que manda el cliente se pegaban crudos en
// el CREATE TABLE/INSERT. Cualquier app exportada y expuesta en red (no solo Electron de escritorio
// sin red) hereda la misma inyección SQL contra su propio data.sqlite local.
const sanitizarColumnaSQL = (col) => String(col).replace(/[^a-zA-Z0-9_]/g, '_');

const manejarCrudBoveda = async (req, res, tablaCruda) => {
  const tabla = tablaCruda.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  const metodo = req.method;
  try {
    if (metodo === 'GET') {
      const filtroLectura = await accesos.filtroLectura(req, tabla);
      if (filtroLectura) {
        if (!filtroLectura.requirente) return res.json({ nodos: [], registros: [] });
        try {
          const propias = await dbAll('SELECT * FROM ' + tabla + ' WHERE usuario_id = ?', [filtroLectura.requirente]);
          return res.json({ nodos: propias || [], registros: propias || [] });
        } catch (e) { return res.json({ nodos: [], registros: [] }); }
      }
      const usuarioId = req.query.usuario_id;
      if (usuarioId) {
        try {
          const filas = await dbAll(`SELECT * FROM ${tabla} WHERE usuario_id = ?`, [usuarioId]);
          return res.json({ nodos: filas || [], registros: filas || [] });
        } catch (e) { /* sigue abajo, sin filtro */ }
      }
      try {
        const filas = await dbAll(`SELECT * FROM ${tabla}`);
        return res.json({ nodos: filas || [], registros: filas || [] });
      } catch (e) {
        return res.json({ nodos: [], registros: [] });
      }
    }
    if (metodo === 'POST' || metodo === 'PUT') {
      const datos = { ...req.body };
      delete datos.ecosistema;
      if (!datos || Object.keys(datos).length === 0) return res.status(400).json({ error: 'Paquete de datos vacío.' });
      const permisoEscritura = await accesos.decidirEscritura(req, tabla, metodo, datos.id);
      if (!permisoEscritura.ok) return res.status(403).json({ error: permisoEscritura.motivo });
      if (permisoEscritura.nueva && permisoEscritura.requirente) datos.usuario_id = permisoEscritura.requirente;
      const columnas = Object.keys(datos).map(sanitizarColumnaSQL);
      const valores = Object.values(datos);
      const columnasParaCrear = columnas.filter(c => !['id', 'fecha_registro'].includes(c.toLowerCase())).map(c => `${c} TEXT`).join(', ');
      await dbRun(`CREATE TABLE IF NOT EXISTS ${tabla} (id TEXT PRIMARY KEY${columnasParaCrear ? ', ' + columnasParaCrear : ''}, fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      // Columna que la app empezó a mandar después de crear la tabla: se agrega (mismo criterio que el Core).
      const columnasReales = new Set((await dbAll(`PRAGMA table_info(${tabla})`) || []).map(c => String(c.name).toLowerCase()));
      for (const col of columnas) {
        if (!columnasReales.has(col.toLowerCase())) await dbRun(`ALTER TABLE ${tabla} ADD COLUMN ${col} TEXT`);
      }
      const placeholders = columnas.map(() => '?').join(', ');
      await dbRun(`INSERT OR REPLACE INTO ${tabla} (${columnas.join(', ')}) VALUES (${placeholders})`, valores);
      return res.json({ exito: true });
    }
    if (metodo === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Falta el id a borrar (?id=...).' });
      const permisoBorrado = await accesos.decidirEscritura(req, tabla, 'DELETE', id);
      if (!permisoBorrado.ok) return res.status(403).json({ error: permisoBorrado.motivo });
      await dbRun(`DELETE FROM ${tabla} WHERE id = ?`, [id]);
      return res.json({ exito: true });
    }
    return res.status(405).json({ error: `Método ${metodo} no soportado en /api/boveda.` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// 🔐 Quién mira y cómo entra el personal (ver accesosExport.js).
app.get('/api/apps/:eco/soy-dueno', (req, res) => accesos.soyDueno(req, res));
app.get('/api/auth-app/estado', (req, res) => accesos.estadoAcceso(req, res));
app.post('/api/auth-app/codigo-admin', (req, res) => accesos.loginConCodigoAdmin(req, res));

app.all('/api/boveda/:tabla', (req, res) => manejarCrudBoveda(req, res, req.params.tabla));
app.delete('/api/boveda/:tabla/:id', async (req, res) => {
  try {
    const tabla = req.params.tabla.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    // Mismo permiso que el borrado de arriba: dos caminos, una sola regla.
    const permisoBorrado = await accesos.decidirEscritura(req, tabla, 'DELETE', req.params.id);
    if (!permisoBorrado.ok) return res.status(403).json({ error: permisoBorrado.motivo });
    await dbRun(`DELETE FROM ${tabla} WHERE id = ?`, [req.params.id]);
    res.json({ exito: true });
  } catch (e) { res.status(500).json({ error: 'Fallo al borrar.' }); }
});

// 📦 Catálogo estático embebido — moldes base que esta app usa, congelados al momento de
// exportar (ya no se sincronizan con MEITI).
const catalogoEstatico = JSON.parse(readFileSync(path.join(__dirname, 'catalogo_estatico.json'), 'utf8'));
app.get('/api/catalogo/componentes', (req, res) => res.json(catalogoEstatico));

// 🔌 CONFIGURACIÓN LOCAL DE CONEXIONES (etapa 2 del export): a diferencia de la etapa 1, que
// solo avisaba "configuralo tú mismo" sin decir cómo, esto le da al DUEÑO de esta app
// exportada un flujo guiado real — ve qué servicios necesita, carga SU PROPIA credencial
// (queda solo en su `data.sqlite` local, nunca vuelve a MEITI), y listo.
app.get('/api/conexiones/estado', async (req, res) => {
  try {
    const filas = await dbAll('SELECT servicio, llave_secreta, token_auth FROM llaves_locales');
    const configuradas = new Map(filas.map(f => [f.servicio, !!((f.llave_secreta && f.llave_secreta.trim()) || (f.token_auth && f.token_auth.trim()))]));
    res.json(serviciosRequeridos.map(servicio => ({ servicio, conectado: configuradas.get(servicio) || false })));
  } catch (error) { res.json(serviciosRequeridos.map(servicio => ({ servicio, conectado: false }))); }
});

app.post('/api/configuracion/conexiones', async (req, res) => {
  const { servicio, llave_secreta, token_auth, dominio_confiado, remitente } = req.body || {};
  const serviciosValidos = [...serviciosRequeridos, 'resend_login'];
  if (!servicio || !serviciosValidos.includes(servicio)) return res.status(400).json({ error: 'Servicio inválido.' });
  try {
    await dbRun(
      'INSERT INTO llaves_locales (servicio, llave_secreta, token_auth, dominio_confiado, remitente) VALUES (?, ?, ?, ?, ?) ON CONFLICT(servicio) DO UPDATE SET llave_secreta = excluded.llave_secreta, token_auth = excluded.token_auth, dominio_confiado = excluded.dominio_confiado, remitente = excluded.remitente',
      [servicio, llave_secreta || null, token_auth || null, dominio_confiado || null, remitente || null]
    );
    res.json({ exito: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 📦 [ALMACENAMIENTO 2026-08-26] Las mismas cuatro rutas que el Core, para que una app exportada
// pueda subir archivos SIN depender de MEITI. Ese es el punto entero: el usuario lo señaló cuando
// se discutió dónde vivía la configuración — si la firma la diera MEITI, una app autoalojada
// quedaría atada a MEITI para siempre solo para poder subir una foto.
//
// La lógica de firma NO se copia acá: se importa de almacenamientoExterno.js, que viaja en el zip.
// Escribirla dos veces es exactamente la divergencia silenciosa que este proyecto ya pagó cara
// (export_codigo_duplicado_desincronizado): el día que un proveedor cambie su firma, una de las dos
// copias queda vieja y nadie se entera hasta que un dueño no puede subir.
app.get('/api/subidas/proveedores', (req, res) => res.json(CATALOGO_PROVEEDORES));

app.get('/api/almacenamiento/estado', async (req, res) => {
  try {
    const fila = await dbGet('SELECT llave_secreta, token_auth FROM llaves_locales WHERE servicio = ?', ['almacenamiento']);
    let publica = {};
    try { publica = JSON.parse(fila?.token_auth || '{}'); } catch (e) { publica = {}; }
    // 🔒 El secreto nunca viaja: solo se dice si hay uno guardado.
    const config = {
      configurado: !!(fila && fila.llave_secreta),
      proveedor: publica.proveedor || null,
      publica,
      proveedores: CATALOGO_PROVEEDORES
    };
    res.json({ ...config, registros: [config] });
  } catch (error) { res.status(500).json({ error: 'No se pudo leer la configuración de archivos.' }); }
});

app.post('/api/almacenamiento/guardar', async (req, res) => {
  try {
    const proveedor = String(req.body?.proveedor || '').trim();
    const valores = req.body?.valores && typeof req.body.valores === 'object' ? req.body.valores : {};
    const ficha = CATALOGO_PROVEEDORES.find(p => p.id === proveedor);
    if (!ficha) return res.status(400).json({ error: 'Ese proveedor no existe.' });
    const faltan = ficha.campos.filter(c => !String(valores[c.clave] || '').trim()).map(c => c.etiqueta);
    if (faltan.length > 0) return res.status(400).json({ error: 'Falta completar: ' + faltan.join(', ') + '.' });
    const campoSecreto = ficha.campos.find(c => c.secreto);
    const secreto = campoSecreto ? String(valores[campoSecreto.clave]).trim() : null;
    const publica = { proveedor };
    ficha.campos.filter(c => !c.secreto).forEach(c => { publica[c.clave] = String(valores[c.clave]).trim(); });
    // Se reusa "llaves_locales", que ya existe en esta base: el secreto en su columna y el resto en
    // "token_auth" como JSON. Una tabla nueva solo para esto sería una migración por nada.
    await dbRun(
      'INSERT INTO llaves_locales (servicio, llave_secreta, token_auth) VALUES (?, ?, ?) ON CONFLICT(servicio) DO UPDATE SET llave_secreta = excluded.llave_secreta, token_auth = excluded.token_auth',
      ['almacenamiento', secreto, JSON.stringify(publica)]
    );
    res.json({ exito: true });
  } catch (error) { res.status(500).json({ error: 'No se pudo guardar la configuración de archivos.' }); }
});

app.post('/api/almacenamiento/borrar', async (req, res) => {
  try {
    // Se desconecta la CUENTA, no se borran los archivos: viven en el proveedor del dueño.
    await dbRun('DELETE FROM llaves_locales WHERE servicio = ?', ['almacenamiento']);
    res.json({ exito: true });
  } catch (error) { res.status(500).json({ error: 'No se pudo desconectar la cuenta.' }); }
});

app.post('/api/subidas/firma', async (req, res) => {
  try {
    const fila = await dbGet('SELECT llave_secreta, token_auth FROM llaves_locales WHERE servicio = ?', ['almacenamiento']);
    if (!fila || !fila.llave_secreta) {
      // 🚫 Nunca fallar en silencio: quien llama tiene que poder decirle al dueño QUÉ falta.
      return res.status(409).json({ error: 'SIN_CONFIGURAR', detalle: 'Esta app todavía no tiene un proveedor de archivos configurado.' });
    }
    let publica = {};
    try { publica = JSON.parse(fila.token_auth || '{}'); } catch (e) { publica = {}; }
    const firma = firmarSubida(publica.proveedor, { ...publica, ...camposSecretosDe(publica.proveedor, fila.llave_secreta) }, ECOSISTEMA_APP);
    if (!firma) return res.status(409).json({ error: 'SIN_CONFIGURAR', detalle: 'El proveedor guardado ya no existe. Vuelve a configurarlo.' });
    if (firma.error) return res.status(409).json({ error: 'CONFIG_INCOMPLETA', detalle: firma.error });
    res.json(firma);
  } catch (error) { res.status(500).json({ error: 'No se pudo preparar la subida.' }); }
});

// 🌉 /api/puente: además de la topología LOCAL/HÍBRIDA (fuente_datos.url_base ya reescrito al
// exportar), ahora también puede usar una credencial real SI el dueño la cargó en
// /api/configuracion/conexiones — mismo principio de seguridad que el /api/puente original de
// MEITI: la credencial solo viaja si el host de destino coincide con el dominio que el dueño
// registró para ese servicio (nunca a un "url_base" arbitrario que mande el llamante), y los
// destinos internos/privados quedan bloqueados (SSRF).
app.post('/api/puente', async (req, res) => {
  const { url_base, metodo, llave_requerida, payload } = req.body || {};
  if (!url_base) return res.status(400).json({ error: 'Falta url_base.' });
  const veredictoDestino = await analizarDestino(url_base);
  if (!veredictoDestino.ok) return res.status(400).json({ error: 'Destino no permitido.' });

  let headersFinal = { 'Content-Type': 'application/json' };
  let urlFinal = url_base;

  if (llave_requerida && llave_requerida !== 'none') {
    const llave = await dbGet('SELECT llave_secreta, token_auth, dominio_confiado FROM llaves_locales WHERE servicio = ?', [llave_requerida]);
    if (!llave || (!llave.llave_secreta && !llave.token_auth)) {
      return res.status(501).json({ error: `Esta app necesita la conexión "${llave_requerida}" y todavía no la configuraste: abre el ⚙️ de conexiones y carga tu credencial.` });
    }
    let hostCoincide = false;
    try { hostCoincide = !!llave.dominio_confiado && new URL(urlFinal).hostname.toLowerCase().endsWith(llave.dominio_confiado.toLowerCase()); } catch (e) { }
    if (!hostCoincide) {
      return res.status(403).json({ error: 'El destino no coincide con el dominio que registraste para esa credencial.' });
    }
    if (llave.token_auth && llave.token_auth.trim()) {
      headersFinal['Authorization'] = `Bearer ${llave.token_auth}`;
    } else if (llave.llave_secreta && llave.llave_secreta.trim()) {
      urlFinal += urlFinal.includes('?') ? `&key=${llave.llave_secreta}` : `?key=${llave.llave_secreta}`;
    }
  }

  try {
    const opciones = { method: metodo || 'GET', headers: headersFinal };
    if (opciones.method === 'POST' || opciones.method === 'PUT') opciones.body = JSON.stringify(payload || {});
    const respuesta = await fetchDestinoSeguro(urlFinal, opciones);
    const datos = await respuesta.json().catch(() => ({}));
    res.status(respuesta.status).json(datos);
  } catch (error) {
    res.status(502).json({ error: 'Fallo al conectar: ' + error.message });
  }
});

const generarCodigoOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const EMAIL_REGEX_LOCAL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/auth-app/solicitar-codigo', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!EMAIL_REGEX_LOCAL.test(email)) return res.status(400).json({ error: 'Email inválido.' });
  try {
    const ultimo = await dbGet('SELECT fecha_creacion FROM codigos_acceso_app WHERE email = ? ORDER BY fecha_creacion DESC LIMIT 1', [email]);
    if (ultimo && (Date.now() - new Date(ultimo.fecha_creacion + 'Z').getTime()) < 60000) {
      return res.status(429).json({ error: 'Espera un minuto antes de pedir otro código.' });
    }
    const codigo = generarCodigoOTP();
    const expira = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await dbRun('INSERT INTO codigos_acceso_app (email, codigo, expira) VALUES (?, ?, ?)', [email, codigo, expira]);

    const credencial = await dbGet('SELECT llave_secreta, remitente FROM llaves_locales WHERE servicio = ?', ['resend_login']);
    if (!credencial || !credencial.llave_secreta) {
      console.warn(`[AUTH] (sin Resend configurado) Código de acceso para ${email}: ${codigo}`);
      return res.json({ exito: true, aviso: 'Envío de email no configurado todavía: abre el ⚙️ de conexiones y carga tu credencial de Resend, o pídele el código al dueño (queda en la consola del backend).' });
    }
    const resend = new Resend(credencial.llave_secreta);
    const { error: errorEnvio } = await resend.emails.send({
      from: credencial.remitente || 'onboarding@resend.dev',
      to: email,
      subject: 'Tu código de acceso',
      html: `<p>Tu código de acceso es: <strong style="font-size:20px">${codigo}</strong></p><p>Vence en 10 minutos. Si no lo pediste tú, ignora este mensaje.</p>`
    });
    if (errorEnvio) {
      console.error('[AUTH] Resend rechazó el envío del código:', errorEnvio.message || errorEnvio);
      return res.status(500).json({ error: 'No se pudo mandar el código. Intenta de nuevo.' });
    }
    res.json({ exito: true });
  } catch (error) {
    console.error('[AUTH] Fallo al generar/mandar el código:', error.message);
    res.status(500).json({ error: 'No se pudo mandar el código. Intenta de nuevo.' });
  }
});

app.post('/api/auth-app/verificar-codigo', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const codigo = (req.body.codigo || '').trim();
  if (!email || !codigo) return res.status(400).json({ error: 'Falta email o código.' });
  try {
    const fila = await dbGet(
      'SELECT * FROM codigos_acceso_app WHERE email = ? AND codigo = ? AND usado = 0 ORDER BY fecha_creacion DESC LIMIT 1',
      [email, codigo]
    );
    if (!fila || new Date(fila.expira) < new Date()) return res.status(401).json({ error: 'Código incorrecto o vencido.' });
    await dbRun('UPDATE codigos_acceso_app SET usado = 1 WHERE id = ?', [fila.id]);

    const token = crypto.randomBytes(24).toString('hex');
    const expiraSesion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await dbRun('INSERT INTO sesiones_app (token, email, fecha_expiracion) VALUES (?, ?, ?)', [token, email, expiraSesion]);

    const esHttps = req.protocol === 'https' || req.secure;
    res.cookie('meiti_sesion_app_' + "TablerosNorte_muugzt8s", token, {
      httpOnly: true,
      secure: esHttps,
      sameSite: esHttps ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });
    res.json({ exito: true, token, email });
  } catch (error) {
    console.error('[AUTH] Fallo al verificar el código:', error.message);
    res.status(500).json({ error: 'No se pudo verificar el código.' });
  }
});

app.get('/api/auth-app/sesion', async (req, res) => {
  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'Sin sesión.' });
  try {
    const sesion = await dbGet('SELECT email, fecha_expiracion FROM sesiones_app WHERE token = ?', [token]);
    if (!sesion || new Date(sesion.fecha_expiracion) < new Date()) return res.status(401).json({ error: 'Sesión vencida.' });
    res.json({ email: sesion.email });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/auth-app/sesion', async (req, res) => {
  res.clearCookie('meiti_sesion_app_' + "TablerosNorte_muugzt8s", { path: '/' });
  const token = req.headers['x-session-token'];
  if (!token) return res.json({ exito: true });
  try {
    await dbRun('DELETE FROM sesiones_app WHERE token = ?', [token]);
    res.json({ exito: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

const PUERTO = process.env.PORT || 4001;
app.listen(PUERTO, () => console.log(`[${"TablerosNorte"}] Backend standalone escuchando en http://localhost:${PUERTO}`));
