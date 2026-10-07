# TablerosNorte

Proyecto exportado automáticamente desde MEITI — **standalone de verdad**: trae su propio
backend (`server/`) y su propia base de datos local (`server/data.sqlite`), no depende de
ningún servidor de MEITI para funcionar.

## Cómo correrlo

Necesitas dos terminales abiertas al mismo tiempo:

**Terminal 1 — backend local:**
```
cd server
npm install
npm start
```
Arranca en `http://localhost:4001`.

**Terminal 2 — frontend:**
```
npm install
npm run dev
```

## Producción (hosting web)

```
npm run build
```
La carpeta `dist/` queda lista para desplegar en Vercel/Netlify/Cloudflare Pages (necesitas
desplegar `server/` en algún lado también — Railway/Render/Fly.io son opciones simples para
un backend Node+SQLite chico).

## Empaquetado a escritorio (Windows/Mac/Linux)

Este export ya trae todo lo necesario para generar un instalador real con
[Electron](https://www.electronjs.org/) — `electron/main.cjs` abre una ventana con el
frontend ya construido y arranca `server/` como proceso interno, sin depender de dos
terminales ni de MEITI.

**Build local** (genera el instalador del sistema operativo donde lo corras):
```
npm install
npm install --prefix server
npm run dist:desktop
```
El instalador queda en `dist_electron/`. `dist:desktop` ya incluye el paso de
`rebuild:sqlite` (recompila el módulo nativo de SQLite para el Node que trae Electron
adentro — sin este paso el backend local no arranca empaquetado, aunque sí funcione bien
con `npm run dev`/`npm start` sueltos).

**Los 3 instaladores a la vez, sin tener las 3 máquinas**: sube este proyecto a un repo de
GitHub y corre manualmente el workflow `.github/workflows/build-desktop.yml` (pestaña
"Actions" → "Build de instaladores de escritorio" → "Run workflow"), o haz un
`git tag v1.0.0 && git push --tags` para que se dispare solo. Cada sistema operativo
compila el suyo en un runner de GitHub (gratis en repos públicos) y quedan como artifacts
para descargar — Windows (.exe), Mac (.dmg), Linux (.AppImage/.deb).

## Empaquetado a móvil (Android/iOS)

Usa [Capacitor](https://capacitorjs.com/) — envuelve el frontend ya construido en un WebView
nativo. A diferencia del escritorio, acá **NO conviene apuntar a `http://localhost:4001`**:
un teléfono real no puede llegar a "localhost" de tu computadora. Antes de generar la app
para distribuir de verdad, despliega `server/` en algún lado accesible (Railway/Render/
Fly.io, ver la sección de arriba) y cambia `VITE_API_URL` en `.env` a esa URL real —
recién ahí `npm run build` deja el frontend apuntando al lugar correcto.

**Android, build local:**
```
npm install
npm run cap:add:android
npm run cap:open:android
```
Abre el proyecto en Android Studio, listo para correr en un emulador/dispositivo o generar
el APK/AAB firmado desde ahí (Build → Generate Signed Bundle / APK).

**iOS, build local** (necesitas una Mac con Xcode instalado):
```
npm install
npm run cap:add:ios
npm run cap:open:ios
```

**Por GitHub Actions**: `.github/workflows/build-mobile.yml` — el job de Android compila un
APK de depuración y lo deja como artifact para descargar, sin necesitar Android Studio local.
El job de iOS solo VERIFICA que el proyecto compila (corre en un runner Mac) — no produce un
`.ipa` instalable, porque eso necesita tu propio certificado de Apple Developer Program
(algo que solo tú puedes cargar, con tu cuenta; no es algo que este workflow pueda traer
solo). Publicar en la Play Store/App Store también son pasos manuales tuyos después de tener
el build firmado.

## Atención

- 🔑 Esta app usa **login propio** (`requiere_login`). El backend exportado YA trae el sistema de códigos por email — solo falta que cargues tu propia cuenta de Resend: abre el botón ⚙️ en la app y completa la sección "Login por email" (API key + remitente), o llama a `POST /api/configuracion/conexiones` con `{ servicio: "resend_login", llave_secreta, remitente }`. Sin eso configurado, el código de acceso queda en la consola del backend en vez de mandarse por email (sirve para probar, no para usuarios reales).

