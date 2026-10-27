# Ceibo Libros 📚

Sistema de biblioteca con **préstamos y reservas de libros**, con tres roles (dueño, bibliotecario y usuario).

* **`backend/`** · API REST en Node.js + Express (solo `POST`), MySQL en la nube, JWT con refresh token. Documentación de los endpoints en [`backend/README.md`](backend/README.md).
* **`mobile/`** · App React Native (Expo). Ver [`mobile/README.md`](mobile/README.md).
* **`docs/`** · [`GUIA_INSTALACION.md`](docs/GUIA_INSTALACION.md) (paso a paso), [`PUBLICAR.md`](docs/PUBLICAR.md) (Railway + web), [`LOGIN_SOCIAL.md`](docs/LOGIN_SOCIAL.md) (Google, GitHub y Discord) y los manuales en PDF: [`Manual_Usuario.pdf`](docs/Manual_Usuario.pdf), [`Manual_Bibliotecario.pdf`](docs/Manual_Bibliotecario.pdf), [`Manual_Dueno.pdf`](docs/Manual_Dueno.pdf) y [`Manual_Completo.pdf`](docs/Manual_Completo.pdf).
* **`credenciales.txt`** · usuarios de prueba con su rol y contraseña.

## Inicio rápido

```bash
# 1) Backend (necesita una base MySQL en la nube, ver docs/GUIA_INSTALACION.md)
cd backend && npm install && cp .env.example .env     # completar .env
npm run db:init && npm run db:seed && npm start
# (si ya tenías la base de una versión anterior: npm run db:migrar)

# 2) App
cd ../mobile && npm install && cp .env.example .env   # poner EXPO_PUBLIC_API_URL
npx expo start
```

## Usuarios de prueba

Se crean con `npm run db:seed` (también están en [`credenciales.txt`](credenciales.txt)).

| Rol | Email | Contraseña | Qué puede hacer |
|---|---|---|---|
| **Dueño** | `dueno@ceibolibros.com` | `Dueno2026` | Todo: estadísticas, pedidos a la distribuidora, panel admin (cambiar roles), categorías, eliminar libros. |
| **Bibliotecario** | `biblioteca@ceibolibros.com` | `Biblio2026` | Stock, préstamos y reservas, usuarios y mensajes. No ve estadísticas ni pide libros. |
| **Usuario** | `lucia@ejemplo.com` | `Lector2026` | Consulta el catálogo, reserva, ve sus préstamos y manda consultas. |
| **Usuario bloqueado** | `tomas@ejemplo.com` | `Lector2026` | Cuenta con un atraso, sirve para ver el mensaje de bloqueo. |

> Cambiá estas contraseñas antes de usar la app con personas reales. También se puede ingresar con Google, GitHub o Discord (ver [`docs/LOGIN_SOCIAL.md`](docs/LOGIN_SOCIAL.md)).

### Borrar usuarios de la base

Para limpiar cuentas de prueba (solo lectores; **nunca** borra al dueño ni a los bibliotecarios):

```bash
cd backend
npm run usuarios:limpiar                       # solo muestra a quién borraría
npm run usuarios:limpiar -- --confirmar        # borra a todos los lectores, salvo Lucía y Tomás
npm run usuarios:limpiar -- --email=a@x.com,b@y.com --confirmar   # borra solo esas cuentas
npm run usuarios:limpiar -- --incluir-demo --confirmar            # borra también a Lucía y Tomás
```

Junto con cada usuario se borran sus préstamos, reservas y mensajes.

## Qué incluye

| Área | Detalle |
|---|---|
| Roles | Dueño (todo, administra roles), Bibliotecario (stock, préstamos, usuarios), Usuario (consulta, reserva, sus préstamos). Permisos validados en el backend por middleware. |
| Libros | Catálogo por categorías (cn, H, F, CF, R, C, M, T), stock, disponibilidad calculada. La **portada se busca sola** en internet (se guarda el link). El dueño crea categorías nuevas y él y los bibliotecarios les agregan libros. |
| Reservas | Para leer en sala (24 h) o para retirar (72 h); máximo 3 por persona. Piden nombre, apellido, DNI y **día y hora de la visita** (solo horarios disponibles, hasta 14 días adelante, de lunes a sábados de 08:00 a 18:00 hs; domingos cerrado) y devuelven un **código de retiro** que se ve también en el préstamo. |
| Calendario | Dueño y bibliotecario tienen un **calendario de visitas** (ícono en la barra superior) que guarda cada reserva y préstamo con día, hora, nombre, apellido y libro. Horarios configurables con `VISITA_*` en `.env`. |
| Préstamos | Hasta 5 libros, 14 días por defecto, edición para agregar libros, devolución. Se buscan por código, DNI, nombre o libro. |
| Bloqueo | Se bloquea (no se elimina) a quien se atrasa, con mensaje, hasta que devuelve. |
| Avisos | Recordatorio 2 días antes del vencimiento (notificación + email). |
| Mensajes | Consultas usuario↔bibliotecario, interno dueño↔bibliotecario y pedidos del dueño a la distribuidora. |
| Seguridad | Contraseñas con bcrypt, JWT 15 min + refresh rotativo, verificación de email, 2 pasos opcional, login con Google/GitHub/Discord, rate limit, helmet, validación con zod. |
| App | Sesión persistente, claro/oscuro, mobile-first (en compu los accesos van como íconos en la barra superior, sin menú lateral), foto de perfil, estadísticas explicadas, sin `alert`, confirmación antes de eliminar, manual dentro de la app y en PDF. |
| Base de datos | MySQL en 3FN, 18 tablas (`backend/sql/schema.sql`), en la nube. |

## Pruebas realizadas

* API: `npm test` en `backend/` (167 comprobaciones de roles, permisos, visitas y calendario, reservas, préstamos, bloqueo, mensajes y seguridad).
* App: recorrido real en navegador de los tres roles en modo claro y oscuro.

## Límites conocidos

No se implementaron: multas, auditoría/logs de acciones, configuración global editable por el dueño (los valores —14 días, máx. 5 libros, etc.— están en el código), gráficos de torta, subida de portadas por archivo (se usa URL) y el APK no se generó (requiere tu cuenta de Expo; ver la guía, paso 6).

**Novedades:** historial de las últimas 10 personas por libro (al editarlo), extensión de préstamos con historial de ediciones (quién y cuándo), libros en más de una categoría, filtro "Respondidos" en Mensajes (las consultas respondidas salen solas de la lista y reaparecen si el usuario escribe), aviso "Hay un nuevo mensaje" y modo claro/oscuro, calendario y perfil en la barra superior.
