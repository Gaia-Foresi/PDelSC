// Actualización automática de la app del celular (sin reinstalar la APK).
// En criollo: cuando se publica una versión nueva del código, la app la baja sola en segundo plano y se reinicia con ella.
//  - Se revisa al abrir la app y cada vez que el usuario vuelve a ella desde otra app.
//  - Si no hay nada nuevo, no pasa nada. Si no hay internet o algo falla, la app sigue como estaba (nunca se rompe por esto).
//  - En la web (compu) no hace nada: la página ya se actualiza sola al redeployar en Vercel.
//  - Solo cambia el código de la app (pantallas, textos, diseño). Los datos ya se ven siempre al día porque vienen del servidor.
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

const nativo = Platform.OS !== 'web';
const ESPERA_MINIMA = 60 * 1000; // no revisar más de una vez por minuto

async function buscarYAplicar(): Promise<void> {
  const U = await import('expo-updates');
  if (!U.isEnabled) return; // en desarrollo (Expo Go o servidor local) no hay actualizaciones
  const hay = await U.checkForUpdateAsync();
  if (!hay.isAvailable) return;
  await U.fetchUpdateAsync();
  await U.reloadAsync(); // reinicia la app con el código nuevo
}

/** Se usa una sola vez en App.tsx. */
export function useActualizacionAutomatica(): void {
  const ultima = useRef(0);
  const trabajando = useRef(false);

  useEffect(() => {
    if (!nativo) return;
    const revisar = async () => {
      if (trabajando.current || Date.now() - ultima.current < ESPERA_MINIMA) return;
      trabajando.current = true;
      ultima.current = Date.now();
      try {
        await buscarYAplicar();
      } catch {
        /* sin internet o sin configuración: se sigue con la versión actual */
      } finally {
        trabajando.current = false;
      }
    };
    revisar(); // al abrir la app
    const sub = AppState.addEventListener('change', (estado) => { if (estado === 'active') revisar(); }); // al volver a la app
    return () => sub.remove();
  }, []);
}
