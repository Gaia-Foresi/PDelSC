# Notificaciones en el celular (como las de WhatsApp)

La app avisa al celular de dos maneras:

1. **Avisos del servidor (push):** llegan aunque la app esté cerrada. Se mandan cuando se registra un préstamo (activo), cuando se
   devuelve un libro (en espera), cuando el personal termina de revisarlo (devuelto), y también por vencimientos y bloqueos.
2. **Avisos programados en el celular:** "tu préstamo vence en 2 días" y "vence hoy" (a las 9:00). Los programa la propia app cuando el
   lector abre "Mis préstamos", y no necesitan ninguna configuración extra.

Los avisos programados (2) funcionan solos al generar la APK. Para los avisos del servidor (1) hay que hacer **una sola vez** esta
configuración de Firebase (es gratis), porque Android no permite recibir push sin ella:

## Pasos (una sola vez)

1. Entrá a https://console.firebase.google.com y creá un proyecto (por ejemplo "Ceibo Libros").
2. Dentro del proyecto: **Agregar app → Android**, con el nombre de paquete `com.ceibolibros.biblioteca`.
3. Descargá el archivo `google-services.json` y copialo en la carpeta `mobile/` (al lado de `app.json`).
4. En `mobile/app.json`, dentro de `"android"`, agregá la línea:
   `"googleServicesFile": "./google-services.json"`
5. En Firebase: **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Se descarga un `.json`.
6. En la carpeta `mobile/`:
   ```
   npx expo install expo-notifications
   eas credentials
   ```
   Elegí **Android → preview → Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1)**
   y subí el `.json` del paso 5.
7. Generá la APK de nuevo: `npm run build:apk`.

## En el servidor

Después de subir el backend, actualizá la base (agrega la tabla de celulares y los nuevos tipos de aviso):

```
cd backend
npm run db:migrar
```

## Cómo comprobar que anda

1. Instalá la APK, iniciá sesión como lector y aceptá el permiso de notificaciones.
2. Desde otra sesión (bibliotecario o gerente), registrá un préstamo a ese lector: al celular le llega "Tu préstamo está activo".
3. Marcá el libro como devuelto: llega "Devolución registrada: en espera". Cuando lo revisás: "Préstamo devuelto".

Si el permiso de notificaciones se rechazó, se puede activar desde Ajustes del teléfono → Aplicaciones → Ceibo Libros → Notificaciones.
