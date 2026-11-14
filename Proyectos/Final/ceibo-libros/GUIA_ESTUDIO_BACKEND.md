# Guía de estudio · Ceibo Libros (backend)

Resumen en criollo de qué hace cada parte del backend, para pasar a la libreta.

---

## 1. Panorama

El backend es una **API REST** hecha con **Node.js + Express** que guarda todo en una base **MySQL** en la nube. La app mobile le hace pedidos y la API responde en JSON.

**Particularidad del proyecto:** todas las rutas usan el método **POST** (aunque solo lean datos). Cualquier otro método responde 405.

**Formato de respuesta, siempre igual:**
- Bien: `{ ok: true, data: { ... } }`
- Error: `{ ok: false, error: { codigo, mensaje, detalles? } }`

### Camino de un pedido

```
App ──POST /api/libros/listar──▶ app.js (seguridad, JSON, límites)
                                   ▼
                              routes/   → ¿qué dirección es?
                                   ▼
                           middlewares → ¿está logueado? ¿tiene el rol? ¿los datos están bien?
                                   ▼
                           controllers → recibe el pedido y arma la respuesta
                                   ▼
                              services → lógica compartida (stock, préstamos, emails…)
                                   ▼
                           config/db.js → consulta a MySQL
```

Si algo falla en cualquier paso, se tira un error (`throw err.xxx`) y lo atrapa `middlewares/errores.js`, que responde con el formato de error.

### Tecnologías (package.json)

| Librería | Para qué |
|---|---|
| express | Servidor web y rutas |
| mysql2 | Conexión a MySQL |
| bcryptjs | Encriptar contraseñas (hash) |
| jsonwebtoken | Tokens de sesión (JWT) |
| zod | Validar los datos que llegan |
| helmet / cors | Seguridad de cabeceras / qué sitios pueden llamar a la API |
| express-rate-limit | Limitar intentos (anti fuerza bruta) |
| nodemailer | Mandar emails |
| node-cron | Tarea programada diaria |
| exceljs | Crear y leer archivos Excel |
| dotenv | Leer el archivo `.env` |

---

## 2. Arranque y configuración

| Archivo | Qué hace |
|---|---|
| `src/server.js` | Punto de entrada (`npm start`). Prueba la base, la actualiza (migración), enciende el servidor, programa la tarea diaria y cierra todo prolijo al apagar. |
| `src/app.js` | Arma la app de Express. Agrega los middlewares en orden: seguridad, CORS, JSON, solo POST, rutas `/api`, 404 y manejo de errores. |
| `api/index.js` | Entrada alternativa para **Vercel** (sin servidor siempre encendido): en cada pedido se asegura de que la base esté migrada y le pasa el pedido a la app. |
| `src/config/env.js` | Lee el `.env` y junta toda la configuración en un objeto (`env.db`, `env.jwt`, `env.reglas`…). Si falta algo obligatorio, frena con un error claro. |
| `src/config/db.js` | Crea el **pool** de conexiones y exporta `consultar(sql, params)` y `transaccion(fn)`. |

**Para recordar:**
- **Pool:** grupo de conexiones abiertas que se reutilizan, porque abrir una por consulta es lento.
- **Transacción:** varias consultas que se aplican **todas o ninguna**. `commit` confirma y `rollback` deshace.
- **`?` en el SQL:** marcadores de lugar que protegen contra la **inyección SQL**.

---

## 3. Middlewares y utilidades

Un **middleware** es una función `(req, res, next)` que se ejecuta antes del controlador. Puede cortar el pedido (error) o dejarlo seguir (`next()`).

| Archivo | Qué hace |
|---|---|
| `middlewares/auth.js` | Lee el token `Authorization: Bearer ...`, lo verifica con JWT y carga el usuario en `req.usuario`. El **rol se lee de la base** en cada pedido, así que un cambio de rol aplica al instante. |
| `middlewares/roles.js` | `requiereRol('gerente', ...)`: si el rol no está en la lista, responde 403. `STAFF` = gerente y bibliotecario. |
| `middlewares/validate.js` | `validar(esquema)`: revisa `req.body` con zod. Si está mal, responde 400 con el error de cada campo; si está bien, deja el body limpio. |
| `middlewares/limites.js` | Límite de pedidos por IP: estricto en login y registro (20 cada 15 min) y general en el resto (600 por minuto). |
| `middlewares/errores.js` | `soloPost` (405), `noEncontrado` (404) y `manejarErrores`, que traduce cada error a una respuesta JSON. |
| `utils/httpError.js` | Clase `HttpError` y la "fábrica" `err` (`err.noEncontrado()`, `err.conflicto()`…). |
| `utils/asyncHandler.js` | Envuelve controladores async para que sus errores lleguen al middleware de errores. |
| `utils/esquemas.js` | Piezas de validación zod: `id`, `texto`, `email`, `password`, `dni`… |
| `utils/codigos.js` | Códigos de 6 dígitos, `sha256`, tokens al azar y el **código de retiro** (6 caracteres, sin letras que se confunden). |
| `utils/fechas.js` | Fechas `YYYY-MM-DD` en la zona horaria de la biblioteca: `hoy()`, `sumarDias()`, `diasEntre()`. |
| `utils/serializers.js` | `usuarioPublico()`: arma el usuario que se devuelve, **sin el hash de la contraseña**. |

### Códigos HTTP que usa el proyecto

| Código | Significado |
|---|---|
| 200 | OK |
| 201 | Creado |
| 400 | Datos mal |
| 401 | No logueado o sesión vencida |
| 403 | Sin permiso o bloqueado |
| 404 | No existe |
| 405 | Método no permitido |
| 409 | Conflicto (duplicado, sin stock) |
| 422 | Estado inválido |
| 429 | Demasiados intentos |
| 500 | Error interno |
| 502 | Falló un servicio externo |

---

## 4. Rutas y controladores

- **Rutas** (`src/routes/`): definen la dirección, los middlewares y qué controlador atiende. `routes/index.js` las junta todas bajo `/api`.
- **Controladores** (`src/controllers/`): reciben `req`, hacen el trabajo (o se lo piden a un servicio) y responden con `res.json(...)`.

| Área | Ruta | Controlador | Qué incluye |
|---|---|---|---|
| Autenticación | `/api/auth/...` | `auth.js` | Registro, verificación de email, login, login en 2 pasos, reenvío de códigos, login social, renovar sesión, logout, olvidé/restablecer contraseña. |
| Usuarios | `/api/usuarios/...`, `/api/admin/...` | `usuarios.js` | Mi perfil, cambiar contraseña, 2 pasos; listar, ver, bloquear y desbloquear usuarios (staff); cambiar rol (gerente). |
| Catálogo | `/api/categorias/...`, `/api/libros/...` | `catalogo.js` | Ver categorías y libros; crear y editar (staff); eliminar (gerente). Busca la portada sola. |
| Préstamos y reservas | `/api/prestamos/...`, `/api/reservas/...` | `prestamos.js` | Crear préstamo, devolver, revisar devoluciones, extender plazo; reservar, cancelar y atender reservas. |
| Calendario | `/api/calendario/listar` | `calendario.js` | Visitas (reservas y préstamos) entre dos fechas. Solo staff. |
| Mensajes | `/api/mensajes/...` | `mensajes.js` | Consultas (usuario → biblioteca) y mensajes internos (gerente ↔ bibliotecario). |
| Gestión | `/api/notificaciones`, `/distribuidoras`, `/reposicion`, `/estadisticas` | `gestion.js` | Notificaciones y push; distribuidoras y pedidos de libros por email; estadísticas y Excel. |

### Ideas de seguridad que se repiten (¡preguntas de examen!)

1. **No revelar si un email existe.** Login, reenvío de códigos y "olvidé mi contraseña" responden igual exista o no la cuenta.
2. **Tiempo constante.** `HASH_RELLENO` y `timingSafeEqual` hacen que la respuesta tarde lo mismo, para no dar pistas.
3. **Nada sensible en texto plano.** Contraseñas con **bcrypt**; códigos y refresh tokens con **sha256**.
4. **Códigos de un solo uso:** vencen a los 10 minutos y admiten como máximo 5 intentos.
5. **Baja lógica.** Libros y distribuidoras no se borran: se marcan `activo = 0` para conservar el historial.

---

## 5. Servicios

| Archivo | Qué hace |
|---|---|
| `prestamos.js` | Corazón del sistema: crear préstamo (valida usuario, datos y stock dentro de una transacción con `FOR UPDATE`), agregar libros, devolver (el libro queda "pendiente" de revisión), revisar (vuelve al stock, dañado o repuesto) y desbloqueo automático. |
| `reservas.js` | Consultas de reservas y `expirarReservas()`, que marca como vencidas las que pasaron su fecha límite. |
| `libros.js` | Consulta base de libros con **disponibles calculados**, categorías múltiples y autor ("buscar o crear"). |
| `visitas.js` | Horarios de visita (lunes a sábado de 8 a 18, cada 30 min, hasta 14 días adelante) y validación del horario elegido. Todo se guarda en UTC. |
| `tokens.js` | Sesión: **access token** (JWT, 60 min) y **refresh token** (días, guardado como hash). Rotación: cada renovación anula el refresh anterior; reusar uno viejo cierra todas las sesiones. |
| `oauth.js` | Login con Google, GitHub y Discord. El servidor **siempre** le pregunta al proveedor quién es el usuario. |
| `mailer.js` | Emails con nodemailer. Sin SMTP configurado, los muestra en consola. `escapar()` evita romper el HTML. |
| `notificaciones.js` | Crea avisos en la app (`INSERT IGNORE`, para no repetirlos) y los manda al celular. |
| `push.js` | Notificaciones push con el servicio de Expo. Borra los tokens de celulares que ya no existen. |
| `recordatorios.js` | Tarea diaria: vence reservas, avisa devoluciones próximas y **bloquea** a quien tiene préstamos vencidos. |
| `portadas.js` | Busca portadas en Open Library o Google Books y guarda el link. |
| `informes.js` | Genera el Excel de estadísticas por período y analiza Excel subidos (más prestados, no devueltos, dañados…). |
| `migracion.js` | Actualiza una base vieja agregando solo lo que falta (**idempotente**). Se ejecuta al arrancar. |

### Fórmula clave

```
disponibles = stock_total − prestados sin devolver (o en revisión) − reservas activas
```

No se guarda en la base: se calcula en cada consulta (3ª forma normal).

### Ciclo de un préstamo

```
Reserva (activa) ──atender──▶ Préstamo (activo) ──devolver──▶ libro "pendiente"
                                   │                                │
                     vence sin devolver                  revisar: repuesto / dañado
                                   ▼                                ▼
                         usuario bloqueado        préstamo cerrado + aviso al lector
                    (se desbloquea solo al devolver,
                     salvo bloqueo por daño)
```

---

## 6. Base de datos y scripts

**`sql/schema.sql`:** crea todas las tablas, en 3ª forma normal.

| Grupo | Tablas |
|---|---|
| Usuarios | `roles` (1 gerente, 2 bibliotecario, 3 usuario), `usuarios`, `identidades_sociales`, `codigos_verificacion`, `refresh_tokens` |
| Catálogo | `categorias`, `autores`, `libros`, `libro_categorias` |
| Préstamos | `reservas`, `prestamos`, `prestamo_items` (un renglón por libro), `prestamo_ediciones` |
| Mensajes | `hilos`, `hilo_participantes`, `mensajes` |
| Reposición | `distribuidoras`, `pedidos_reposicion`, `pedido_items` |
| Avisos | `notificaciones`, `dispositivos_push` |

**Scripts** (`npm run ...`):

| Comando | Qué hace |
|---|---|
| `db:init` | Crea las tablas. Con `-- --reset` borra todo antes. |
| `db:seed` | Carga datos de ejemplo y usuarios de prueba (no duplica). |
| `db:migrar` | Actualiza una base vieja. |
| `acceso:cambiar` | Cambia el email y la contraseña de una cuenta. |
| `usuarios:limpiar` | Borra lectores de prueba (solo muestra, salvo con `--confirmar`). |
| `portadas` | Completa las portadas faltantes. |
| `recordatorios` | Ejecuta a mano la tarea diaria. |
| `test` | Prueba de humo de toda la API (modifica datos: usar con una base de pruebas). |

---

## 7. Glosario rápido

- **API REST:** servidor que recibe pedidos HTTP y responde datos (acá, en JSON).
- **Middleware:** función que se ejecuta antes del controlador y puede cortar o dejar seguir el pedido.
- **JWT:** token firmado que dice quién sos. Si alguien lo modifica, la firma deja de coincidir.
- **Refresh token:** token largo que solo sirve para pedir un JWT nuevo.
- **Hash:** transformación que no se puede revertir (bcrypt para contraseñas, sha256 para códigos).
- **Inyección SQL:** ataque que mete código en una consulta. Se evita con `?`.
- **Transacción:** "todo o nada".
- **`FOR UPDATE`:** traba filas durante una transacción para que dos pedidos simultáneos no choquen.
- **Baja lógica:** marcar como inactivo en lugar de borrar.
- **Idempotente:** se puede ejecutar varias veces y el resultado es el mismo.
- **UTC:** hora universal. La base guarda todo en UTC y se convierte a la hora local (−3) para mostrar.
- **Desestructuración:** `const { a, b } = obj` o `const [x, y] = lista`.
- **`?.` (encadenamiento opcional):** lee una propiedad sin romper si el objeto es `null`.
- **Promise.all:** ejecuta varias tareas async al mismo tiempo y espera a todas.
