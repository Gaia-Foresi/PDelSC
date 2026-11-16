# Estructura del proyecto · Ceibo Libros

Árbol completo de carpetas y archivos. Para cada carpeta se explica **qué guarda** y para cada archivo **qué hace**.
No se incluyen `node_modules/` (librerías que instala `npm install`) ni `.expo/` (archivos temporales de Expo).

---

## Vista general

```
ceibo-libros/
├── backend/   → API (servidor): recibe los pedidos de la app y guarda todo en MySQL
├── mobile/    → App (celular y web): lo que ve y toca la persona
└── docs/      → Guías de instalación y publicación, y manuales en PDF
```

---

## Raíz del proyecto

```
ceibo-libros/
├── README.md                    Presentación del proyecto: qué es, cómo arrancarlo y usuarios de prueba
├── credenciales.txt             Usuarios de prueba (email, contraseña y rol) que crea "npm run db:seed"
├── .gitignore                   Archivos que Git no sube (node_modules, .env, certificados, builds)
├── GUIA_ESTUDIO_BACKEND.md      Guía de estudio del backend
├── GUIA_ESTUDIO_MOBILE.md       Guía de estudio de la app
└── ESTRUCTURA_PROYECTO.md       Este archivo
```

---

## `docs/` · Documentación para instalar, publicar y usar

```
docs/
├── GUIA_INSTALACION.md          Paso a paso para instalar todo (base de datos, backend y app)
├── PUBLICAR.md                  Cómo subir la API y la versión web a internet
├── LOGIN_SOCIAL.md              Cómo configurar el ingreso con Google, GitHub y Discord
├── Manual_Usuario.pdf           Manual para lectores
├── Manual_Bibliotecario.pdf     Manual para bibliotecarios
├── Manual_Gerente.pdf           Manual para el gerente
└── Manual_Completo.pdf          Los tres manuales juntos
```

---

## `backend/` · API REST (Node.js + Express + MySQL)

```
backend/
├── package.json                 Datos del proyecto, librerías que usa y comandos "npm run ..."
├── package-lock.json            Versiones exactas de cada librería instalada (lo genera npm)
├── .env                         Configuración privada: datos de la base, claves JWT, SMTP, OAuth (NO se comparte)
├── .gitignore                   Archivos del backend que Git no sube
├── ca.pem                       Certificado para conectarse de forma segura (SSL) a la base en la nube
├── vercel.json                  Configuración para publicar en Vercel: manda todo /api/... a api/index.js
├── README.md                    Documentación de los endpoints de la API
├── EMAIL.md                     Cómo configurar el envío de emails (por ejemplo, con Gmail)
│
├── api/                         ▸ Entrada para Vercel (servidor "sin servidor")
│   └── index.js                 Se ejecuta en cada pedido: prepara la base (migración) y le pasa el pedido a la app
│
├── sql/                         ▸ Estructura de la base de datos
│   └── schema.sql               Crea todas las tablas (usuarios, libros, préstamos, mensajes, días bloqueados...) en 3ª forma normal
│
├── scripts/                     ▸ Comandos sueltos que se ejecutan a mano desde la terminal
│   ├── db-init.js               npm run db:init → crea las tablas ejecutando schema.sql
│   ├── seed.js                  npm run db:seed → carga categorías, libros, usuarios y datos de ejemplo
│   ├── db-migrar.js             npm run db:migrar → actualiza una base vieja sin borrar datos
│   ├── cambiar-acceso.js        npm run acceso:cambiar → cambia el email y la contraseña de una cuenta
│   ├── limpiar-usuarios.js      npm run usuarios:limpiar → borra lectores de prueba (con --confirmar)
│   ├── portadas.js              npm run portadas → busca en internet las portadas que faltan
│   ├── recordatorios.js         npm run recordatorios → ejecuta a mano la tarea diaria de avisos
│   └── smoke-test.js            npm test → prueba rápida de toda la API (modifica datos: usar con una base de prueba)
│
└── src/                         ▸ Código de la API
    ├── server.js                Punto de entrada (npm start): conecta la base, migra, enciende el servidor y programa la tarea diaria
    ├── app.js                   Arma Express: seguridad, CORS, JSON, solo POST, rutas /api y manejo de errores
    │
    ├── config/                  ▸ Configuración general
    │   ├── env.js               Lee el .env y junta toda la configuración en un objeto
    │   └── db.js                Pool de conexiones a MySQL + funciones consultar() y transaccion()
    │
    ├── middlewares/             ▸ Pasos que se ejecutan ANTES del controlador
    │   ├── auth.js              Verifica el token (JWT) y carga el usuario logueado en req.usuario
    │   ├── roles.js             requiereRol(...): deja pasar solo a ciertos roles (si no, 403)
    │   ├── validate.js          Valida los datos que llegan con zod (si están mal, 400)
    │   ├── limites.js           Limita la cantidad de pedidos por IP (anti fuerza bruta)
    │   └── errores.js           Solo POST (405), ruta inexistente (404) y conversión de errores a JSON
    │
    ├── routes/                  ▸ Direcciones de la API: qué URL, con qué permisos y qué controlador la atiende
    │   ├── index.js             Junta todas las rutas bajo /api y aplica el límite estricto a /auth
    │   ├── auth.js              /api/auth/... registro, login, códigos, login social, refresh, logout, contraseña
    │   ├── usuarios.js          /api/usuarios/... perfil y gestión de usuarios · /api/admin/... cambio de rol
    │   ├── catalogo.js          /api/categorias/... y /api/libros/...
    │   ├── prestamos.js         /api/prestamos/... y /api/reservas/...
    │   ├── calendario.js        /api/calendario/listar (solo personal)
    │   └── gestion.js           /api/mensajes, /notificaciones, /distribuidoras, /bloqueos, /reposicion, /estadisticas
    │
    ├── controllers/             ▸ Reciben el pedido, hacen el trabajo y arman la respuesta
    │   ├── auth.js              Registro, verificación de email, login (con 2 pasos), redes sociales y recuperación
    │   ├── usuarios.js          Mi perfil, contraseña, 2 pasos, listar/bloquear/desbloquear usuarios, cambiar rol
    │   ├── catalogo.js          Crear, editar, listar y eliminar categorías y libros
    │   ├── prestamos.js         Préstamos (crear, devolver, revisar, extender) y reservas (crear, cancelar, atender)
    │   ├── calendario.js        Visitas (reservas y préstamos) de un rango de fechas
    │   ├── mensajes.js          Conversaciones: consultas a la biblioteca y mensajes internos del personal
    │   └── gestion.js           Notificaciones, push, distribuidoras, días no disponibles, pedidos de libros, estadísticas y Excel
    │
    ├── services/                ▸ Lógica compartida que usan varios controladores
    │   ├── prestamos.js         Crear préstamos con control de stock, devoluciones, revisión y desbloqueo automático
    │   ├── reservas.js          Consultas de reservas y vencimiento de las que pasaron su fecha
    │   ├── libros.js            Consulta de libros con "disponibles" calculado, categorías y autores
    │   ├── visitas.js           Horarios de visita disponibles y validación del horario elegido (respeta los días bloqueados)
    │   ├── bloqueos.js          Consulta qué días cerró el gerente (la usan visitas y reservas)
    │   ├── tokens.js            Crea, renueva y anula los tokens de sesión (access y refresh)
    │   ├── oauth.js             Verifica con Google, GitHub o Discord quién es el usuario
    │   ├── mailer.js            Envía emails (o los muestra en consola si no hay SMTP)
    │   ├── notificaciones.js    Crea avisos en la app (sin repetir) y los manda al celular
    │   ├── push.js              Notificaciones push al celular con el servicio de Expo
    │   ├── recordatorios.js     Tarea diaria: vence reservas, avisa devoluciones y bloquea atrasados
    │   ├── portadas.js          Busca portadas en Open Library / Google Books y guarda el link
    │   ├── informes.js          Genera el Excel de estadísticas y analiza Excel subidos
    │   └── migracion.js         Agrega a la base las columnas y tablas que falten (sin borrar nada)
    │
    └── utils/                   ▸ Funciones chicas de ayuda
        ├── httpError.js         Clase HttpError y "fábrica" err.xxx() de errores con código HTTP
        ├── asyncHandler.js      Hace que los errores de funciones async lleguen al manejador de errores
        ├── esquemas.js          Piezas de validación zod: id, texto, email, password, dni...
        ├── codigos.js           Códigos de 6 dígitos, sha256, tokens al azar y código de retiro
        ├── fechas.js            Fechas YYYY-MM-DD en la zona horaria de la biblioteca
        └── serializers.js       Convierte un usuario de la base al formato público (sin contraseña)
```

---

## `mobile/` · App (React Native + Expo + TypeScript)

### Archivos de configuración de la app

```
mobile/
├── package.json                 Datos de la app, librerías y comandos (start, build:apk, manual:pdf, lint, typecheck)
├── package-lock.json            Versiones exactas de cada librería instalada
├── .env                         URL de la API y IDs de Google/GitHub/Discord (NO se comparte)
├── .gitignore                   Archivos de la app que Git no sube
├── app.json                     Configuración de Expo: nombre, ícono, splash, colores, esquema ceibolibros://, permisos
├── eas.json                     Perfiles para compilar con EAS: "preview" genera la APK, "production" el paquete para la tienda
├── tsconfig.json                Configuración de TypeScript (qué archivos revisa y con qué reglas)
├── babel.config.js              Configuración de Babel (traduce el código moderno para que lo entienda el celular)
├── babel.config.json            Lo mismo que babel.config.js en formato JSON (duplicado)
├── .eslintrc.js                 Reglas de ESLint (revisa el estilo y errores comunes del código)
├── .eslintrc.json               Lo mismo que .eslintrc.js en formato JSON (duplicado)
├── vercel.json                  Publicación web en Vercel: cualquier dirección abre index.html
├── README.md                    Cómo instalar, correr y compilar la app
├── NOTIFICACIONES.md            Cómo configurar Firebase para las notificaciones push
├── index.tsx                    Primer archivo que se ejecuta: registra App como componente raíz
└── App.tsx                      Envuelve la app con los Providers (tema, sesión, avisos...) y muestra la navegación
```

### Carpetas fuera de `src/`

```
mobile/
├── assets/                      ▸ Imágenes y archivos que vienen dentro de la app
│   ├── icon.png                 Ícono de la app
│   ├── adaptive-icon.png        Ícono adaptable de Android (se recorta según el celular)
│   ├── favicon.png              Ícono de la pestaña en la versión web
│   ├── splash.png               Pantalla de carga al abrir la app
│   ├── logo.png                 Logo (solo el dibujo)
│   ├── logo-horizontal.png      Logo con el nombre al costado
│   ├── logo-vertical.png        Logo con el nombre abajo
│   └── manuales/                ▸ Manuales en PDF que se abren desde la app según el rol
│       ├── manual-usuario.pdf
│       ├── manual-bibliotecario.pdf
│       ├── manual-gerente.pdf
│       └── manual-dueno.pdf     Versión vieja (antes el gerente se llamaba "dueño"): la app ya no lo usa
│
├── public/                      ▸ Archivos para la versión web
│   ├── index.html               Página base de la web: idioma español y sin traducción automática del navegador
│   └── _redirects               Hace que cualquier dirección abra index.html (para recargar sin error 404)
│
└── scripts/                     ▸ Comandos sueltos
    ├── generar-manual-pdf.tsx   npm run manual:pdf → genera los PDF de los manuales a partir de manual.json
    └── generar-manual-pdf.js    Versión en JavaScript común del mismo script (duplicado)
```

### `src/` · Código de la app

```
mobile/src/
├── types.tsx                    Tipos de TypeScript: Usuario, Libro, Categoria, Sesion...
│
├── api/                         ▸ Comunicación con el backend
│   ├── config.tsx               URL de la API e IDs públicos de OAuth
│   ├── client.tsx               post(): manda el pedido con el token y lo renueva solo si venció
│   ├── index.tsx                Objeto api con un método por endpoint (api.libros.listar...)
│   └── session.tsx              Guarda y lee la sesión (tokens + usuario) en el celular
│
├── auth/                        ▸ Ingreso con redes sociales
│   └── SocialButtons.tsx        Botones de Google, GitHub y Discord
│
├── context/                     ▸ Datos compartidos por toda la app
│   ├── AuthContext.tsx          useAuth(): usuario logueado, iniciar y cerrar sesión
│   └── BadgesContext.tsx        useBadges(): numeritos de mensajes y notificaciones sin leer
│
├── theme/                       ▸ Apariencia
│   ├── ThemeContext.tsx         useTheme(): modo claro u oscuro
│   ├── colors.tsx               Paleta de colores de los dos modos
│   └── tokens.tsx               Espaciados, bordes, tipografía y sombras
│
├── navigation/                  ▸ Cómo se pasa de una pantalla a otra
│   ├── RootNavigator.tsx        Login o app según la sesión; pestañas según el rol; direcciones de la web
│   └── DrawerContent.tsx        Menú lateral del celular
│
├── hooks/                       ▸ Lógica reutilizable (funciones "use...")
│   ├── useAsync.tsx             Pide datos y maneja cargando / error / datos
│   ├── useFocus.tsx             useRefreshOnFocus (recarga al volver) y usePolling (repite cada X segundos)
│   ├── useReservar.tsx          Flujo completo para reservar un libro
│   ├── useLimite.tsx            Aviso cuando se llega al límite de reservas o libros
│   └── useTeclado.tsx           Saber si el teclado está abierto y cuánto lugar dejarle
│
├── content/                     ▸ Contenido del manual
│   ├── manual.json              Texto del manual (secciones y preguntas frecuentes)
│   ├── manualRoles.tsx          Qué secciones ve cada rol y cómo se numeran
│   └── manualRoles.js           Versión en JavaScript común para el script de PDF (duplicado)
│
├── utils/                       ▸ Funciones de ayuda
│   ├── validators.tsx           Validaciones de formularios (email, contraseña, código...)
│   ├── format.tsx               Fechas en español, iniciales, estado del préstamo, plural...
│   ├── storage.tsx              Guardar/leer en el celular (SecureStore) o en la web (localStorage)
│   ├── avisosCelular.tsx        Notificaciones push y avisos programados antes del vencimiento
│   ├── archivos.tsx             Descargar Excel y elegir archivos para analizar
│   ├── foto.tsx                 Elegir o sacar la foto de perfil y achicarla
│   ├── historialBusquedas.tsx   Historial de búsquedas (completo y rápido) por usuario
│   ├── useResponsive.tsx        Adaptar el diseño al ancho de la pantalla
│   ├── formularios.tsx          Aviso de "hay campos para corregir"
│   ├── iconosCategoria.tsx      Íconos y colores para elegir en las categorías
│   ├── bloqueo.tsx              Tipos de bloqueo (atraso o daño) y sus textos
│   └── fondo.tsx                Ancho de la columna central (para el dibujo de fondo en la web)
│
├── components/                  ▸ Piezas visuales reutilizables
│   ├── index.tsx                Junta los componentes más usados para importarlos de un solo lugar
│   ├── Button.tsx               Botón con variantes de color, ícono y "cargando"
│   ├── Input.tsx                Campo de texto con etiqueta, error y ver/ocultar contraseña
│   ├── Card.tsx                 Tarjeta con fondo, borde y sombra
│   ├── Badge.tsx                Etiqueta chiquita de color ("Vencido", "Disponible")
│   ├── Chips.tsx                Fila de filtros
│   ├── Avatar.tsx               Foto de perfil redonda o iniciales
│   ├── Logo.tsx                 Logo de la app en sus tres versiones
│   ├── SearchBar.tsx            Buscador con lupa y botón para borrar
│   ├── SelectField.tsx          Campo que abre una lista de opciones
│   ├── ScreenContainer.tsx      Estructura de cada pantalla: barra superior, scroll y "tirar para recargar"
│   ├── Header.tsx               Barra superior (logo o flecha para volver)
│   ├── BottomBar.tsx            Barra de botones de abajo (cambia según el rol)
│   ├── NavAcciones.tsx          Tema, manual, campanita y menú de la cuenta
│   ├── Skeleton.tsx             Cajas grises mientras cargan los datos
│   ├── EmptyState.tsx           Mensaje de "no hay nada para mostrar"
│   ├── ErrorState.tsx           Mensaje de error con "Reintentar"
│   ├── Modal.tsx                Diálogo de confirmación y panel que sube desde abajo
│   ├── Confirm.tsx              useConfirm(): pregunta "¿seguro?" y devuelve true o false
│   ├── Toast.tsx                useToast(): avisos cortos (éxito, error, información)
│   ├── Revelador.tsx            Lleva la pantalla hasta el primer campo con error
│   ├── BookCard.tsx             Tarjeta de libro con portada, datos y botones
│   ├── DatosLector.tsx          Formulario de nombre, apellido, DNI y horario + diálogo del código de retiro
│   ├── SelectorVisita.tsx       Calendario para elegir día y hora de la visita
│   ├── CodigoRetiro.tsx         Muestra el código de retiro en grande
│   ├── BloqueoBanner.tsx        Aviso destacado para cuentas bloqueadas
│   ├── HorarioAtencion.tsx      Cartel con el horario de la biblioteca
│   ├── PanelColores.tsx         Selector de color con barras deslizables
│   ├── OrigenFoto.tsx           Elegir cámara o galería para la foto
│   ├── VisorFoto.tsx            Foto ampliada a pantalla completa
│   ├── VolverArriba.tsx         Botón flotante para volver al principio de una lista
│   └── FondoDecorativo.tsx      Dibujo de enredaderas y libros a los costados (solo web)
│
└── screens/                     ▸ Pantallas de la app (una por archivo)
    ├── ManualScreen.tsx         Manual según el rol y descarga del PDF
    │
    ├── auth/                    ▸ Pantallas sin sesión iniciada
    │   ├── AuthLayout.tsx       Fondo y tarjeta comunes de estas pantallas
    │   ├── LoginScreen.tsx      Iniciar sesión
    │   ├── RegisterScreen.tsx   Crear cuenta
    │   ├── CodeScreen.tsx       Ingresar el código de 6 dígitos (verificar email o 2 pasos)
    │   └── ForgotPasswordScreen.tsx  Recuperar la contraseña con un código por email
    │
    ├── home/                    ▸ Inicio y catálogo
    │   ├── HomeScreen.tsx       Buscador de libros y grilla de categorías
    │   └── LibrosCategoriaScreen.tsx  Libros de una categoría, con filtro y reserva
    │
    ├── prestamos/               ▸ Préstamos, reservas y calendario
    │   ├── PrestamosScreen.tsx      Lista de préstamos (los míos, o todos si es personal)
    │   ├── PrestamoDetalleScreen.tsx  Detalle: devolver, revisar, agregar libros, extender plazo
    │   ├── PrestamoNuevoScreen.tsx  Crear un préstamo (personal): lector, datos, libros y plazo
    │   ├── ReservasScreen.tsx       Reservas: cancelar (lector) o atender (personal)
    │   ├── CalendarioScreen.tsx     Calendario mensual de visitas (personal)
    │   └── BloqueosScreen.tsx       Días no disponibles para reservar (gerente: crea y quita · bibliotecario: solo mira)
    │
    ├── mensajes/                ▸ Mensajería
    │   ├── MensajesScreen.tsx       Lista de conversaciones
    │   ├── HiloScreen.tsx           Conversación con burbujas (se actualiza cada 10 s)
    │   └── NuevoMensajeScreen.tsx   Empezar una conversación nueva
    │
    ├── notificaciones/
    │   └── NotificacionesScreen.tsx  Avisos de la biblioteca (vencimientos, bloqueos, préstamos...)
    │
    ├── perfil/                  ▸ Cuenta propia
    │   ├── PerfilScreen.tsx         Foto, datos y resumen de préstamos y reservas
    │   ├── EditarPerfilScreen.tsx   Editar datos personales y foto
    │   └── SeguridadScreen.tsx      Verificación en 2 pasos y cambio de contraseña
    │
    ├── busquedas/
    │   └── HistorialBusquedasScreen.tsx  Historial completo de búsquedas con fecha
    │
    ├── stock/                   ▸ Gestión del catálogo (personal)
    │   ├── StockScreen.tsx          Resumen de stock, alertas, devoluciones pendientes y lista de libros
    │   ├── LibroFormScreen.tsx      Alta y edición de un libro (portada automática)
    │   └── CategoriasScreen.tsx     Crear, editar y eliminar categorías (ícono y color)
    │
    ├── usuarios/                ▸ Gestión de personas (personal)
    │   ├── UsuariosScreen.tsx       Lista de usuarios con buscador y filtros
    │   ├── UsuarioDetalleScreen.tsx  Préstamos, reservas, bloquear/desbloquear y cambiar rol
    │   └── AdminScreen.tsx          Panel de administración de roles (gerente)
    │
    ├── reposicion/              ▸ Compras a la distribuidora (gerente)
    │   ├── PedirLibrosScreen.tsx    Armar y mandar por email un pedido de libros
    │   └── DistribuidorasScreen.tsx  Alta, edición y baja de distribuidoras
    │
    └── estadisticas/            ▸ Números de la biblioteca (gerente)
        ├── EstadisticasScreen.tsx   Tarjetas y gráficos de barras
        ├── InformesScreen.tsx       Descargar el Excel y analizar varios Excel juntos
        └── SelectorMeses.tsx        Selector de meses agrupado por año (lo usa Informes)
```

---

## Para recordar

- **Backend en capas:** `routes` (dirección) → `middlewares` (controles) → `controllers` (respuesta) → `services` (lógica) → `config/db.js` (base de datos).
- **App en capas:** `screens` (pantallas) usan `components` (piezas visuales), `hooks` (lógica reutilizable) y `api` (pedidos al backend). Los datos compartidos viven en `context`.
- **Archivos privados:** `.env`, `ca.pem` y `credenciales.txt` tienen claves y contraseñas. No se suben a internet ni se comparten.
- **Duplicados que se podrían limpiar:** `babel.config.json`, `.eslintrc.json`, `generar-manual-pdf.js` + `manualRoles.js` (versiones `.js` de archivos `.tsx`) y `manual-dueno.pdf`. Antes de borrarlos, probá que `npx expo start`, `npm run lint` y `npm run manual:pdf` sigan andando.
