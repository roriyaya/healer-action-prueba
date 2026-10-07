// 🔐 ACCESOS DEL SERVIDOR EXPORTADO (2026-10-06, Tap Io)
//
// Viaja tal cual dentro del zip (server/accesosExport.js) y lo importa el server.js generado, igual
// que almacenamientoExterno.js: la lógica vive UNA vez y se puede probar sin exportar nada.
//
// Por qué existe: en MEITI el dueño de la app es admin con su cuenta de meiti.dev, y el servidor de
// MEITI aplica los permisos por tabla. Una app exportada no tiene ni lo uno ni lo otro: su servidor
// dejaba escribir y leer cualquier tabla a cualquiera, y una app de kiosco (sin login obligatorio)
// ni siquiera traía forma de que el personal iniciara sesión.
//
// Lo que hace, con el diseño que pidió el usuario:
//   · El email del dueño queda sembrado como admin desde el primer arranque.
//   · Un CÓDIGO DE ADMINISTRADOR (lo ve solo el dueño, en Mis apps de MEITI) le da una sesión de
//     admin sin depender del email: sirve para la primera vez, antes de configurar Resend, y como
//     recuperación si algún día pierde el acceso. En el zip viaja solo su hash, nunca el código.
//   · Con Resend configurado, todos (admin y personal) entran con email + código, como en MEITI.
//   · Los permisos por tabla se aplican igual que en MEITI (escribir / propios / leer).
import crypto from 'crypto';

export const normalizarCodigoAdmin = (codigo) => String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const hashCodigoAdmin = (codigo, sal) => crypto.createHash('sha256').update(String(sal) + normalizarCodigoAdmin(codigo)).digest('hex');

// 🌐 [PLANTILLA PÚBLICA, 2026-10-07] Una app publicada como template en GitHub no puede traer el
// admin de quien la exportó: cada persona que la despliegue arrancaría con ESE email y ESE código, y
// el autor (o quien filtre el código) sería admin de todas las copias. En modo plantilla pública el
// zip trae acceso_admin.json vacío, y el PRIMER arranque de cada instalación crea su propio admin:
// genera un código, lo muestra UNA vez en la consola, y guarda solo el hash en un archivo local que
// git ignora. El email sale de MEITI_ADMIN_EMAIL si se definió; si no, queda uno local y se entra
// con el código. Las arrancadas siguientes leen ese archivo: el código nunca se vuelve a mostrar.
export const prepararAccesoLocal = (rutaLocal, emailEnv, fs) => {
  if (fs.existsSync(rutaLocal)) return JSON.parse(fs.readFileSync(rutaLocal, 'utf8'));
  const codigo = crypto.randomBytes(24).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 16).toUpperCase().replace(/(.{4})(?=.)/g, '$1-');
  const sal = crypto.randomBytes(16).toString('hex');
  const acceso = { email_admin: String(emailEnv || 'admin@localhost').trim().toLowerCase(), sal, hash: hashCodigoAdmin(codigo, sal), origen: 'consola' };
  fs.writeFileSync(rutaLocal, JSON.stringify(acceso, null, 2), { mode: 0o600 });
  console.log('\n' + '='.repeat(64));
  console.log('  ACCESO DE ADMINISTRADOR (se muestra UNA sola vez, guárdalo)');
  console.log(`  Código: ${codigo}`);
  console.log(`  Email de admin: ${acceso.email_admin}${emailEnv ? '' : '  (define MEITI_ADMIN_EMAIL para usar el tuyo)'}`);
  console.log('  En la app: Iniciar sesión → "Entrar con código de administrador".');
  console.log('='.repeat(64) + '\n');
  return acceso;
};

const listaDeRoles = (v) => (Array.isArray(v) ? v : String(v || '').split(','))
  .map(r => String(r).trim().toLowerCase()).filter(Boolean);

const leerCookies = (req) => Object.fromEntries(String(req.headers.cookie || '').split(';')
  .map(p => p.trim()).filter(Boolean)
  .map(p => { const i = p.indexOf('='); return i < 0 ? [p, ''] : [p.slice(0, i), decodeURIComponent(p.slice(i + 1))]; }));

const MAX_FALLOS_CODIGO = 5;
const BLOQUEO_MS = 10 * 60 * 1000;

/**
 * @param {object} deps
 * @param {Function} deps.dbGet / deps.dbAll / deps.dbRun  helpers de la base local
 * @param {string}   deps.ecosistema  plantilla_id congelado al exportar (nombre de la cookie de sesión)
 * @param {object}   deps.acceso      { email_admin, sal, hash } (server/acceso_admin.json)
 * @param {object}   deps.permisos    { tabla: { escribir, propios, leer } } ya ajustados al exportar
 * @param {boolean}  deps.tienePersonal  la app declara páginas con "rol", permisos o modo kiosco
 */
export const crearAccesos = ({ dbGet, dbAll, dbRun, ecosistema, acceso = {}, permisos = {}, tienePersonal = false }) => {
  const emailAdmin = String(acceso.email_admin || '').trim().toLowerCase();
  const fallosPorIp = new Map();

  const sembrarAdmin = async () => {
    await dbRun('CREATE TABLE IF NOT EXISTS roles_usuarios_app (id TEXT PRIMARY KEY, usuario_id TEXT, email_visible TEXT, rol TEXT, fecha_alta DATETIME DEFAULT CURRENT_TIMESTAMP)');
    await dbRun('CREATE TABLE IF NOT EXISTS sesiones_app (token TEXT PRIMARY KEY, email TEXT, fecha_expiracion TEXT)');
    if (!emailAdmin) return;
    const ya = await dbGet('SELECT 1 AS ok FROM roles_usuarios_app WHERE usuario_id = ?', [`email_${emailAdmin}`]);
    if (!ya) {
      await dbRun('INSERT INTO roles_usuarios_app (id, usuario_id, email_visible, rol) VALUES (?, ?, ?, ?)',
        [`rol_admin_inicial_${Date.now()}`, `email_${emailAdmin}`, emailAdmin, 'admin']);
    }
  };

  // Quién pide, con sesión verificada (la cookie o el token del login de la app).
  const identidadDe = async (req) => {
    const token = leerCookies(req)[`meiti_sesion_app_${ecosistema}`] || req.headers['x-sesion-app-token'] || req.headers['x-session-token'];
    if (!token) return null;
    try {
      const s = await dbGet('SELECT email, fecha_expiracion FROM sesiones_app WHERE token = ?', [token]);
      if (!s || new Date(s.fecha_expiracion) < new Date()) return null;
      return `email_${String(s.email).trim().toLowerCase()}`;
    } catch (e) { return null; }
  };

  const tieneRol = async (identidad, roles) => {
    if (!identidad || !roles.length) return false;
    try {
      const fila = await dbGet('SELECT rol FROM roles_usuarios_app WHERE usuario_id = ? LIMIT 1', [identidad]);
      const rol = String(fila?.rol || '').trim().toLowerCase();
      // El admin puede todo, aunque una tabla no lo nombre: en el export no hay "dueño de la plataforma".
      return !!rol && (rol === 'admin' || roles.includes(rol));
    } catch (e) { return false; }
  };

  // Un cliente sin sesión se identifica con el id anónimo de su navegador. Un email nunca de palabra.
  const requirenteDe = (req, identidad) => {
    if (identidad) return identidad;
    const anonimo = String(req.headers['x-meiti-usuario'] || '').trim();
    return anonimo && !anonimo.startsWith('email_') ? anonimo : null;
  };

  const TABLAS_DE_ACCESO = new Set(['roles_usuarios_app', 'sesiones_app', 'codigos_acceso_app', 'llaves_locales']);

  /** null = puede leer todo; { requirente } = solo sus filas. */
  const filtroLectura = async (req, tabla) => {
    if (!tienePersonal) return null; // app de una persona: todo como siempre
    const p = permisos[tabla];
    const roles = p ? listaDeRoles(p.leer) : [];
    if (!roles.length) return null;
    const identidad = await identidadDe(req);
    if (await tieneRol(identidad, roles)) return null;
    return { requirente: requirenteDe(req, identidad) };
  };

  /** { ok, motivo?, privilegiado?, nueva?, requirente? } */
  const decidirEscritura = async (req, tabla, metodo, idFila) => {
    if (!tienePersonal) return { ok: true, privilegiado: true }; // app de una persona: todo como siempre
    const identidad = await identidadDe(req);
    // La tabla de roles solo la toca un admin: es la que decide quién entra.
    if (TABLAS_DE_ACCESO.has(tabla)) {
      return (await tieneRol(identidad, ['admin'])) ? { ok: true, privilegiado: true } : { ok: false, motivo: 'Solo un administrador puede cambiar los accesos.' };
    }
    const p = permisos[tabla];
    if (!p) return { ok: true, privilegiado: false };
    if (await tieneRol(identidad, listaDeRoles(p.escribir))) return { ok: true, privilegiado: true };
    const motivoPersonal = 'Solo el personal autorizado puede modificar esta información. Si eres del personal, inicia sesión.';
    if (!p.propios) return { ok: false, motivo: motivoPersonal };
    const requirente = requirenteDe(req, identidad);
    const fila = idFila ? await dbGet(`SELECT * FROM ${tabla} WHERE id = ? LIMIT 1`, [idFila]).catch(() => null) : null;
    if (!fila) return metodo === 'DELETE' ? { ok: true, requirente } : { ok: true, requirente, nueva: true };
    if (requirente && fila.usuario_id && String(fila.usuario_id) === requirente) return { ok: true, requirente };
    return { ok: false, motivo: 'Solo puedes modificar tus propios registros. ' + motivoPersonal };
  };

  /** Crea una sesión igual a la del login por email (misma tabla, misma cookie). */
  const crearSesion = async (req, res, email) => {
    const token = crypto.randomBytes(24).toString('hex');
    const expira = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await dbRun('INSERT INTO sesiones_app (token, email, fecha_expiracion) VALUES (?, ?, ?)', [token, email, expira]);
    const esHttps = req.protocol === 'https' || req.secure;
    res.cookie(`meiti_sesion_app_${ecosistema}`, token, {
      httpOnly: true, secure: esHttps, sameSite: esHttps ? 'none' : 'lax', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/'
    });
    return token;
  };

  /** POST /api/auth-app/codigo-admin { codigo } → misma respuesta que verificar-codigo. */
  const loginConCodigoAdmin = async (req, res) => {
    if (!acceso.hash || !acceso.sal || !emailAdmin) return res.status(404).json({ error: 'Esta app no tiene código de administrador.' });
    const ip = req.ip || req.socket?.remoteAddress || 'desconocida';
    const estado = fallosPorIp.get(ip) || { fallos: 0, hasta: 0 };
    if (estado.hasta > Date.now()) {
      return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil((estado.hasta - Date.now()) / 60000)} minuto(s).` });
    }
    const dado = hashCodigoAdmin(req.body?.codigo, acceso.sal);
    const ok = dado.length === acceso.hash.length && crypto.timingSafeEqual(Buffer.from(dado), Buffer.from(acceso.hash));
    if (!ok) {
      estado.fallos += 1;
      if (estado.fallos >= MAX_FALLOS_CODIGO) { estado.fallos = 0; estado.hasta = Date.now() + BLOQUEO_MS; }
      fallosPorIp.set(ip, estado);
      return res.status(401).json({ error: 'Código de administrador incorrecto.' });
    }
    fallosPorIp.delete(ip);
    await sembrarAdmin();
    const token = await crearSesion(req, res, emailAdmin);
    console.log(`[ACCESO] Sesión de administrador abierta con el código de administrador (${emailAdmin}).`);
    res.json({ exito: true, token, email: emailAdmin });
  };

  /** GET /api/auth-app/estado: qué formas de entrar hay (la pantalla de login lo usa). */
  const estadoAcceso = async (req, res) => {
    let emailConfigurado = false;
    try { emailConfigurado = !!(await dbGet("SELECT llave_secreta FROM llaves_locales WHERE servicio = 'resend_login'"))?.llave_secreta; } catch (e) { /* sin tabla todavía */ }
    // "origen": dónde está el código, para que la pantalla de login lo diga bien (en Mis apps de
    // MEITI, o en la consola del primer arranque si es una plantilla pública).
    res.json({ codigo_admin: !!(acceso.hash && emailAdmin), email_configurado: emailConfigurado, origen_codigo: acceso.origen === 'consola' ? 'consola' : 'meiti' });
  };

  /** GET /api/apps/:eco/soy-dueno: lo usan el menú por rol y los candados de cada pantalla. Una app
   *  sin personal sigue diciendo "eres el dueño" (una app de escritorio de una persona, como siempre);
   *  una con personal responde el rol de la sesión verificada, o "ninguno". */
  const soyDueno = async (req, res) => {
    if (!tienePersonal) return res.json({ dueno: true, rol: 'admin' });
    const identidad = await identidadDe(req);
    if (!identidad) return res.json({ dueno: false, rol: 'ninguno' });
    try {
      const fila = await dbGet('SELECT rol FROM roles_usuarios_app WHERE usuario_id = ? LIMIT 1', [identidad]);
      return res.json({ dueno: false, rol: fila?.rol || 'ninguno' });
    } catch (e) { return res.json({ dueno: false, rol: 'ninguno' }); }
  };

  return { sembrarAdmin, identidadDe, filtroLectura, decidirEscritura, loginConCodigoAdmin, estadoAcceso, soyDueno, TABLAS_DE_ACCESO };
};
