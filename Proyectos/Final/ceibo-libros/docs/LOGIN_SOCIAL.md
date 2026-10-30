# Ingreso con Google, GitHub y Discord

Los tres botones ya están en la app. Si todavía no cargaste las credenciales, al tocarlos la app avisa qué falta. Las credenciales son **de tu cuenta** en cada servicio, por eso no vienen en el código: se crean una sola vez (unos 5–10 minutos cada una) y se pegan en dos archivos:

* **`mobile/.env`** → las variables `EXPO_PUBLIC_…` (después hay que reiniciar con `npx expo start -c`).
* **`backend/.env`** → las variables de servidor (después hay que reiniciar `npm start`).

> Nunca pongas un *client secret* en `mobile/.env`: ese archivo viaja dentro de la app. El secret de GitHub va **solo** en `backend/.env`.

## Qué dirección de redirección registrar

Depende de dónde estés probando. La app la muestra en la consola del navegador al abrirse (`[login social] URI de redirección…`).

| Dónde probás | Google | GitHub y Discord |
|---|---|---|
| **Navegador de la compu** (`npx expo start --web --port 8081`) | Origen JS autorizado y URI de redirección: `http://localhost:8081` | `http://localhost:8081/oauth` |
| **APK instalado** (EAS Build) | Cliente tipo *Android* (paquete `com.ceibolibros.biblioteca` + huella SHA‑1) | `ceibolibros://oauth` |
| **Expo Go** en el celular | ❌ No conviene: la dirección de Expo Go (`exp://IP:8081/--/oauth`) cambia con la IP y Google no la admite. Probá en el navegador de la compu o con el APK. | ❌ igual |

Para que la dirección no cambie de puerto, arrancá siempre con `npx expo start --web --port 8081` cuando pruebes en la compu.

## Google (el obligatorio)

1. <https://console.cloud.google.com> → crear proyecto → **APIs y servicios → Pantalla de consentimiento de OAuth** → tipo *Externo* → completá nombre de la app y tu email → en **Usuarios de prueba** agregá los emails con los que vas a probar.
2. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**:
   * *Orígenes de JavaScript autorizados:* `http://localhost:8081`
   * *URI de redirección autorizados:* `http://localhost:8081`
   * Copiá el **ID de cliente** → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` en `mobile/.env`.
3. Para el APK: **Crear ID de cliente → Android**, con el nombre de paquete `com.ceibolibros.biblioteca` y la huella SHA‑1 (`eas credentials` la muestra) → `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.
4. En `backend/.env`: `GOOGLE_CLIENT_IDS=<id-web>,<id-android>` (el servidor comprueba que el token sea de tu app).
5. Reiniciá app y servidor. En el login, tocá **Google**.

## GitHub

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. *Authorization callback URL:* `https://ceibo-libros.vercel.app/oauth` para la web (o `http://localhost:8081/oauth` en la compu). Una OAuth App de GitHub admite **una sola** dirección.
3. Copiá el **Client ID** → `EXPO_PUBLIC_GITHUB_CLIENT_ID` (`mobile/.env` o Vercel) y, junto con el **Client secret**, → `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` (`backend/.env` o Vercel).
4. **Para el APK** creá una *segunda* OAuth App con callback `ceibolibros://oauth`. Su Client ID va en `EXPO_PUBLIC_GITHUB_MOBILE_CLIENT_ID` (en `mobile/eas.json`, bloque `env`) y, con su Client secret, en `GITHUB_MOBILE_CLIENT_ID` y `GITHUB_MOBILE_CLIENT_SECRET` del backend (Vercel). El servidor elige solo cuál usar según la dirección de retorno.

## Discord

1. <https://discord.com/developers/applications> → **New Application** → **OAuth2**.
2. En **Redirects** agregá `http://localhost:8081/oauth` (y `ceibolibros://oauth` para el APK; Discord admite varias).
3. Copiá el **Client ID** → `EXPO_PUBLIC_DISCORD_CLIENT_ID` (`mobile/.env`) y `DISCORD_CLIENT_ID` (`backend/.env`).

## Cómo se comporta

* La primera vez que alguien entra con una red social queda registrado como **Usuario**. Si ya existía una cuenta con ese email, se vincula a ella.
* El servidor valida todo con el proveedor (nunca confía en lo que manda la app) y exige que el email esté verificado.
* Si un botón dice que "todavía no está activado", falta su variable en `mobile/.env`. Si al tocarlo se abre el servicio y vuelve con error, casi siempre es que la dirección de redirección registrada no es exactamente la de la tabla de arriba.

---

## Con la app publicada en Vercel (https://ceibo-libros.vercel.app)

El login social falla en producción si las direcciones no están registradas **exactamente** igual.

**Google** (Google Cloud → APIs y servicios → Credenciales → tu "ID de cliente de OAuth" tipo *Aplicación web*)
- *Orígenes autorizados de JavaScript*: `https://ceibo-libros.vercel.app`
- *URI de redireccionamiento autorizados*: `https://ceibo-libros.vercel.app` (y también `https://ceibo-libros.vercel.app/`)
- Pantalla de consentimiento → **Publicar la app** ("En producción"); si queda en "Prueba", solo entran los usuarios de prueba.
- Si aparece `redirect_uri_mismatch`, tocá "detalles del error": ahí Google muestra la dirección exacta que recibió; copiala tal cual en la lista.

**GitHub** (Settings → Developer settings → OAuth Apps)
- GitHub permite una sola dirección por app: creá una **segunda OAuth App** para producción con *Authorization callback URL* = `https://ceibo-libros.vercel.app/oauth`.
- Su Client ID va en el proyecto web de Vercel (`EXPO_PUBLIC_GITHUB_CLIENT_ID`); Client ID y Secret en el proyecto del backend (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`).

**Discord** (Developer Portal → OAuth2 → Redirects)
- Agregá `https://ceibo-libros.vercel.app/oauth`.

**Backend en Vercel**: `CORS_ORIGIN=https://ceibo-libros.vercel.app`.
Después de cambiar variables, en Vercel hacé **Redeploy** de ambos proyectos (las `EXPO_PUBLIC_*` se incorporan al compilar).
