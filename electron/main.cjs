// Proceso principal de Electron — generado por MEITI al exportar. Arranca el backend
// local (server/server.js) como proceso hijo y abre una ventana con el frontend ya
// construido (dist/index.html). Nunca llama a ninguna URL de MEITI.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let procesoBackend = null;
let ventanaPrincipal = null;

function iniciarBackendLocal() {
  const rutaServidor = path.join(__dirname, '..', 'server', 'server.js');
  // Dentro del paquete instalado, __dirname (server/) cae en el .asar de solo lectura —
  // SQLite necesita una carpeta real donde escribir, la de datos del usuario del SO.
  const dirDatos = app.getPath('userData');
  procesoBackend = fork(rutaServidor, [], {
    env: Object.assign({}, process.env, { MEITI_DATA_DIR: dirDatos, PORT: '4001' }),
    silent: false
  });
  procesoBackend.on('error', function (err) {
    console.error('[ELECTRON] El backend local no pudo arrancar:', err.message);
  });
}

function crearVentana() {
  ventanaPrincipal = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  ventanaPrincipal.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(function () {
  iniciarBackendLocal();
  crearVentana();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana();
  });
});

app.on('window-all-closed', function () {
  if (procesoBackend) procesoBackend.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', function () {
  if (procesoBackend) procesoBackend.kill();
});
