@"
# Ceibo Libros - Sistema de Gestion de Biblioteca

Aplicacion movil para la gestion de prestamos y reservas de libros, con tres roles: Dueno, Bibliotecario y Usuario.

## Tecnologias
- Frontend: React Native + Expo
- Backend: Node.js + Express
- Base de Datos: MySQL (Railway)
- Autenticacion: JWT + Google OAuth

## Estructura
- backend/  -> API REST
- frontend/ -> App movil
- docs/     -> Documentacion

## Roles
- Dueno: acceso total
- Bibliotecario: gestion de stock y prestamos
- Usuario: consulta y reserva
"@ | Out-File -FilePath README.md -Encoding UTF8