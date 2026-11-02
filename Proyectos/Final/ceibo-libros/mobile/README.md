# Ceibo Libros · App móvil (React Native + Expo)

App para Android (también corre en iOS y web para pruebas) de la biblioteca **Ceibo Libros**.

```bash
npm install
cp .env.example .env     # poné EXPO_PUBLIC_API_URL (ver ../docs/GUIA_INSTALACION.md)
npx expo start           # Expo Go: escaneá el QR
npm run build:apk        # APK con EAS Build
npm run manual:pdf       # regenera los manuales en PDF (uno por rol + completo)
npm run lint
```

## Variables (`.env`)

| Variable | Para qué |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL base de la API (termina en `/api`). |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` · `…_ANDROID_…` · `…_IOS_…` | Ingreso con Google. Si faltan, el botón avisa qué configurar. |
| `EXPO_PUBLIC_GITHUB_CLIENT_ID` | Ingreso con GitHub (el *secret* va solo en el backend). |
| `EXPO_PUBLIC_DISCORD_CLIENT_ID` | Ingreso con Discord. |

Las URIs de redirección de GitHub y Discord son `ceibolibros://oauth`. Detalle paso a paso en `../docs/GUIA_INSTALACION.md`.

## Estructura

```
mobile/
├── App.js                     # proveedores globales + navegación
├── app.json · eas.json        # configuración de Expo / build del APK
├── assets/                    # logos, íconos y manuales/ (un PDF por rol)
├── scripts/generar-manual-pdf.js
└── src/
    ├── api/                   # cliente HTTP (solo POST, renueva el token solo) y un método por endpoint
    ├── auth/                  # botones de Google / GitHub / Discord
    ├── components/            # Button, Input, Card, Modal/Confirm (sin alert), Toast, BottomBar, Header...
    ├── content/manual.json    # manual de usuario (se muestra en la app y genera el PDF)
    ├── context/               # AuthContext (sesión persistente), BadgesContext (contadores)
    ├── hooks/                 # useAsync, useRefreshOnFocus, usePolling, useReservar
    ├── navigation/            # Drawer (menú) > Stack > Tabs por rol
    ├── screens/               # auth, home, stock, prestamos, mensajes, usuarios, perfil, estadisticas, reposicion...
    ├── theme/                 # paleta Ceibo Libros, tema claro/oscuro, medidas
    └── utils/                 # formatos, validadores, almacenamiento seguro, responsive
```

## Decisiones de diseño

* **Todo POST:** `src/api/client.js` solo hace `POST` con JSON (regla del proyecto). Si el token vence (`401 TOKEN_EXPIRADO`), renueva con el refresh token y reintenta una sola vez, aunque varias llamadas fallen a la vez.
* **Sesión persistente:** los tokens se guardan en `expo-secure-store` (cifrado del sistema); al abrir la app se valida con el servidor. Sin internet, se mantiene la sesión guardada.
* **Sin `alert()`:** los avisos son `Toast` y las preguntas (eliminar, devolver, bloquear, cerrar sesión…) son el diálogo `useConfirm()`.
* **Mobile-first:** se diseñó para el celular vertical (áreas táctiles ≥ 44 px) y se adapta a más columnas y ancho máximo en tablet/horizontal (`useResponsive`).
* **Claro/oscuro:** sigue al sistema y se cambia desde el menú; la elección se recuerda.
* **Botones principales por rol** (barra inferior): usuario 4 · bibliotecario 6 · dueño 7. Se registran según `usuario.rol`, y el backend vuelve a validar cada permiso.
