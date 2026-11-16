# Guía de estudio · Ceibo Libros (app mobile)

Resumen en criollo de cómo está armada la app, para pasar a la libreta.

---

## 1. Panorama

La app está hecha con **React Native + Expo** y escrita en **TypeScript** (archivos `.tsx`). El mismo código corre en **Android**, **iOS** y en la **web** (compu).

No guarda datos propios: todo lo pide al **backend** con pedidos **POST** (ver la guía del backend). En el celular solo guarda la sesión, la preferencia de tema y el historial de búsquedas.

### Camino de una pantalla

```
Pantalla (screens/)  ──usa──▶ hooks (useAsync, useReservar…)
       │                            │
       │                            ▼
       │                     api/index.tsx  → un método por endpoint (api.libros.listar…)
       │                            │
       │                            ▼
       │                     api/client.tsx → fetch POST + token + renovación automática
       ▼
componentes (components/) → Button, Input, Card, Modal, Toast…
contextos (context/)      → sesión del usuario, contadores, tema
```

### Conceptos de React que se usan en todos lados

| Concepto | Qué es |
|---|---|
| **Componente** | Función que devuelve lo que se dibuja (JSX: `<View>`, `<Text>`…). |
| **Props** | Datos que recibe un componente desde afuera (como los parámetros de una función). |
| **useState** | Guarda un dato; cuando cambia, la pantalla se vuelve a dibujar. |
| **useEffect** | Ejecuta algo al montar la pantalla o cuando cambia un dato (pedir datos, timers). La función que devuelve "limpia" lo que haya que limpiar. |
| **useRef** | Guarda un valor que **no** redibuja la pantalla al cambiar. |
| **useMemo / useCallback** | Guardan un valor o una función para no recalcularlos en cada render. |
| **Context** | "Caja" compartida: un `Provider` arriba de todo y cualquier pantalla la lee con `useX()`. |
| **Hook propio** | Función que empieza con `use` y reutiliza lógica entre pantallas. |

---

## 2. Arranque

| Archivo | Qué hace |
|---|---|
| `index.tsx` | Primer archivo que se ejecuta: registra `App` como raíz. |
| `App.tsx` | Envuelve la app con los **Providers** (tema, sesión, contadores, avisos, confirmaciones, datos del lector) y muestra la navegación. En la web oculta las barras de scroll y agrega "tirar para recargar". |
| `src/types.tsx` | Tipos de TypeScript: `Usuario`, `Libro`, `Categoria`, `Sesion`… Describen lo que devuelve la API. |

---

## 3. Comunicación con la API (`src/api/`)

| Archivo | Qué hace |
|---|---|
| `config.tsx` | URL del backend (`EXPO_PUBLIC_API_URL`) y los IDs públicos de Google, GitHub y Discord. |
| `client.tsx` | Función `post()`. Agrega el token, corta a los 15 s y convierte los errores en `ApiError`. Si el token venció, **lo renueva una sola vez** (aunque fallen varios pedidos a la vez) y repite el pedido. |
| `index.tsx` | Objeto `api` con un método por endpoint: `api.auth.login()`, `api.libros.listar()`… `publico` = sin token; `privado` = con token. |
| `session.tsx` | Guarda la sesión (tokens + usuario) en memoria y en el almacenamiento seguro del celular. |

**Para recordar:** el access token dura poco; el refresh token sirve para pedir uno nuevo sin que la persona tenga que volver a loguearse.

---

## 4. Estado global (`src/context/` y `src/theme/`)

| Archivo | Qué hace |
|---|---|
| `context/AuthContext.tsx` | `useAuth()`: usuario logueado, `iniciarSesion`, `cerrarSesion`, `recargarPerfil`. Al abrir la app, restaura la sesión guardada. |
| `context/BadgesContext.tsx` | `useBadges()`: numeritos de mensajes y notificaciones sin leer. Se actualizan cada 30 s y cuando la app vuelve al frente. |
| `theme/ThemeContext.tsx` | `useTheme()`: modo claro u oscuro (por defecto, el del sistema). |
| `theme/colors.tsx` | Paleta de colores de los dos modos. |
| `theme/tokens.tsx` | Medidas comunes: espaciados, bordes, tipografía, sombras y `MIN_TAP` (44 px). |

---

## 5. Navegación (`src/navigation/`)

```
Sin sesión → AuthStack: Login · Registro · Código · Olvidé mi contraseña
Con sesión → Pila principal
              ├── Tabs (barra de abajo, según el rol)
              │     usuario: Inicio · Mensajes · Reservas · Préstamos · Perfil
              │     staff:   + Stock · Usuarios
              └── Pantallas de detalle (préstamo, usuario, libro, hilo…)
```

| Navegador | Qué hace |
|---|---|
| **Stack** | Pantallas apiladas; se vuelve con "atrás". |
| **Tabs** | Botones fijos abajo. |
| **Drawer** | Menú lateral (en el celular). |

- `RootNavigator.tsx` decide entre login y app según `useAuth()`, y define las URL para la versión web (`linking`).
- `DrawerContent.tsx` es el contenido del menú lateral.

**Moverse entre pantallas:** `navigation.navigate('Nombre', { parámetros })`. Los parámetros llegan en `route.params`.

---

## 6. Hooks propios (`src/hooks/`)

| Hook | Para qué |
|---|---|
| `useAsync(fn, deps)` | Pide datos y devuelve `{ data, loading, error, reload, refresh, setData }`. Ignora respuestas viejas si se hizo otro pedido después. |
| `useRefreshOnFocus` | Vuelve a pedir los datos cada vez que se vuelve a la pantalla. |
| `usePolling` | Repite un pedido cada X segundos mientras la pantalla está visible (por ejemplo, el chat cada 10 s). |
| `useReservar` | Flujo completo de reserva: revisa el límite, pide los datos y el horario, llama a la API y muestra el código. |
| `useAvisoLimite` | Aviso cuando se llegó al máximo de reservas o libros. |
| `useTecladoAbierto` / `useEspacioTeclado` | Saber si el teclado está abierto y cuánto espacio dejar para que no tape los campos. |

**Patrón "debounce"** (aparece en todos los buscadores): se espera 400 ms después de la última tecla antes de buscar, para no hacer un pedido por cada letra.

```js
useEffect(() => {
  const id = setTimeout(() => setBusqueda(q.trim()), 400);
  return () => clearTimeout(id);   // si escribe otra letra, se cancela el anterior
}, [q]);
```

---

## 7. Componentes (`src/components/`)

| Grupo | Componentes |
|---|---|
| Básicos | `Button`, `Input`, `Card`, `Badge`, `Chips` (filtros), `Avatar`, `Logo`, `SearchBar`, `SelectField` |
| Estructura | `ScreenContainer` (barra superior + scroll + recargar), `Header`, `BottomBar`, `NavAcciones` (menú de la cuenta) |
| Estados | `Skeleton` (cargando), `EmptyState` (vacío), `ErrorState` (error + reintentar) |
| Diálogos | `Modal` (`ConfirmDialog`, `SheetModal`), `Confirm` (`useConfirm()` devuelve true o false), `Toast` (`useToast()` para avisos cortos) |
| Biblioteca | `BookCard` (tarjeta de libro), `DatosLector` (nombre, apellido, DNI y horario), `SelectorVisita` (calendario de horarios; los días bloqueados se ven tachados), `CodigoRetiro`, `BloqueoBanner`, `HorarioAtencion` |
| Formularios | `Revelador`: si hay errores, lleva la pantalla hasta el primer campo marcado y lo enfoca |
| Otros | `PanelColores`, `OrigenFoto`, `VisorFoto`, `VolverArriba`, `FondoDecorativo` (dibujo de la versión web) |

**Regla de la app:** no se usa el `alert` del sistema. Todo pasa por `useConfirm()` y `useToast()`.

---

## 8. Pantallas (`src/screens/`)

| Carpeta | Pantallas | Quién la ve |
|---|---|---|
| `auth/` | Login, Registro, Código (verificación y 2 pasos), Olvidé mi contraseña | Sin sesión |
| `home/` | Inicio (buscador + categorías), Libros de una categoría | Todos |
| `prestamos/` | Préstamos, Detalle, Nuevo préstamo, Reservas, Calendario, Días no disponibles | Lector: los suyos · Staff: todos · Días no disponibles: ver = staff, editar = gerente |
| `mensajes/` | Lista de conversaciones, Conversación, Nuevo mensaje | Todos |
| `notificaciones/` | Avisos de la biblioteca | Todos |
| `perfil/` | Perfil, Editar perfil, Seguridad (2 pasos y contraseña) | Todos |
| `busquedas/` | Historial de búsquedas | Todos |
| `stock/` | Stock, Alta y edición de libro, Categorías | Staff |
| `usuarios/` | Usuarios, Detalle (bloquear o desbloquear), Panel admin (roles) | Staff · Admin: gerente |
| `reposicion/` | Pedir libros, Distribuidoras | Gerente |
| `estadisticas/` | Estadísticas (gráficos), Informes (Excel) | Gerente |
| `ManualScreen` | Manual según el rol + PDF | Todos |

### Patrón de formulario (se repite en casi todas las pantallas)

```js
const [form, setForm] = useState({ email: '', password: '' });
const [errores, setErrores] = useState({});
const [cargando, setCargando] = useState(false);

const enviar = async () => {
  const e = { email: v.email(form.email) };           // 1) validar en la app
  setErrores(e);
  if (!v.sinErrores(e)) return;
  setCargando(true);
  try {
    await api.algo(form);                              // 2) llamar a la API
  } catch (err) {
    if (err.detalles) setErrores(err.detalles);        // 3) errores del servidor por campo
    toast.fromError(err);
  } finally {
    setCargando(false);                                // 4) siempre se apaga el "cargando"
  }
};
```

---

## 9. Utilidades (`src/utils/`)

| Archivo | Qué hace |
|---|---|
| `validators.tsx` | Validaciones de formularios (las mismas reglas que el backend). |
| `format.tsx` | Fechas en español, iniciales, estado de un préstamo, `plural()`… |
| `storage.tsx` | Guardar y leer en el celular (SecureStore) o en la web (localStorage). |
| `avisosCelular.tsx` | Notificaciones push y avisos locales antes del vencimiento. Ya no pide permiso: solo revisa si está dado (en Android 13 o más se activa a mano en Ajustes). |
| `archivos.tsx` | Descargar Excel y elegir archivos para analizar. |
| `foto.tsx` | Elegir o sacar la foto de perfil y achicarla (256 px, JPEG). |
| `historialBusquedas.tsx` | Historial completo y rápido (5) de búsquedas, por usuario. |
| `useResponsive.tsx` | Adaptar el diseño al ancho de la pantalla (columnas, menú fijo en la compu). |
| `formularios.tsx` | Aviso de "hay campos para corregir" (lo escuchan el Toast y el Revelador). |
| `iconosCategoria.tsx`, `bloqueo.tsx`, `fondo.tsx` | Íconos y colores de categorías, tipos de bloqueo y ancho de la columna en la web. |

---

## 10. Glosario rápido

- **React Native:** se programa con componentes de React y se dibuja con componentes nativos del celular (`View`, `Text`, `Pressable`).
- **Expo:** herramientas para correr y compilar la app sin configurar Android Studio (Expo Go, EAS Build).
- **JSX:** sintaxis parecida al HTML dentro de JavaScript (`<Text>Hola</Text>`).
- **TypeScript:** JavaScript con tipos; avisa errores antes de ejecutar.
- **Render:** cada vez que React vuelve a dibujar un componente.
- **Provider / Context:** forma de compartir datos sin pasarlos pantalla por pantalla.
- **Promise / async-await:** forma de esperar algo que tarda (un pedido a la API).
- **Debounce:** esperar a que la persona deje de escribir antes de buscar.
- **Polling:** preguntar al servidor cada X segundos si hay algo nuevo.
- **Push:** aviso que manda el servidor al celular aunque la app esté cerrada.
- **Token:** "llave" que prueba que iniciaste sesión; viaja en cada pedido.
