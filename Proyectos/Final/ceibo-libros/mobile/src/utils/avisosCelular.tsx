// Notificaciones en el celular (como las de WhatsApp): llegan aunque la app esté cerrada.
//  - Push: el servidor manda el aviso cuando cambia algo (préstamo activo, en espera, devuelto, bloqueos, etc.).
//  - Locales: la propia app programa en el celular el aviso de "tu préstamo está por vencer", sin depender de internet.
// En la web (compu) no hace nada. Todo está protegido: si falta un permiso o la configuración, la app sigue funcionando igual.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api';

const nativo = Platform.OS !== 'web';
const CLAVE_TOKEN = 'ceibo_push_token';
const CANAL = 'avisos';
let configurado = false;

const cargar = () => import('expo-notifications');

/** Prepara cómo se muestran los avisos y crea el canal de Android. Se llama una vez. */
async function configurar() {
  if (!nativo || configurado) return;
  const N = await cargar();
  N.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(CANAL, {
      name: 'Avisos de la biblioteca',
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#8FAE8B',
    });
  }
  configurado = true;
}

/** Pide permiso para avisar (Android 13+ lo exige). Devuelve true si se puede notificar. */
async function pedirPermiso(): Promise<boolean> {
  const N = await cargar();
  const actual = await N.getPermissionsAsync();
  if (actual.granted) return true;
  if (actual.canAskAgain === false) return false;
  const nuevo = await N.requestPermissionsAsync();
  return nuevo.granted;
}

/** Registra este celular en el servidor para recibir los avisos. Se llama al iniciar sesión. */
export async function registrarAvisos(): Promise<void> {
  if (!nativo) return;
  try {
    await configurar();
    if (!(await pedirPermiso())) return;
    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const N = await cargar();
    const { data: token } = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!token) return;
    await api.notificaciones.pushRegistrar({ token, plataforma: Platform.OS === 'ios' ? 'ios' : 'android' });
    await SecureStore.setItemAsync(CLAVE_TOKEN, token);
  } catch {
    // Sin configuración de Firebase o sin permiso: no hay push, pero los avisos locales y la campana siguen andando
  }
}

/** Al cerrar sesión, este celular deja de recibir los avisos de esa cuenta. */
export async function quitarAvisos(): Promise<void> {
  if (!nativo) return;
  try {
    const token = await SecureStore.getItemAsync(CLAVE_TOKEN);
    if (token) {
      await api.notificaciones.pushQuitar({ token });
      await SecureStore.deleteItemAsync(CLAVE_TOKEN);
    }
    const N = await cargar();
    await N.cancelAllScheduledNotificationsAsync();
  } catch {
    /* se ignora */
  }
}

const aFecha = (iso: string, hora: number) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, hora, 0, 0);
};

/**
 * Programa en el celular los avisos de vencimiento de los préstamos activos: 2 días antes y el mismo día, a las 9:00.
 * Reemplaza lo programado antes, así que se puede llamar cada vez que se cargan los préstamos.
 */
export async function programarAvisosPrestamos(prestamos: { id: number; estado: string; fecha_vencimiento: string; items?: any[] }[]): Promise<void> {
  if (!nativo) return;
  try {
    await configurar();
    if (!(await pedirPermiso())) return;
    const N = await cargar();
    await N.cancelAllScheduledNotificationsAsync();
    const ahora = Date.now();
    for (const p of prestamos) {
      if (p.estado !== 'activo' || !(p.items || []).some((i) => !i.devuelto_en)) continue;
      const avisos = [
        { cuando: new Date(aFecha(p.fecha_vencimiento, 9).getTime() - 2 * 86400000), titulo: 'Se acerca la fecha de devolución', cuerpo: `Tu préstamo #${p.id} vence en 2 días. Acercate a la biblioteca a devolver los libros.` },
        { cuando: aFecha(p.fecha_vencimiento, 9), titulo: 'Tu préstamo vence hoy', cuerpo: `Hoy vence el préstamo #${p.id}. Devolvé los libros en la biblioteca para que no se bloquee tu cuenta.` },
      ];
      for (const a of avisos) {
        if (a.cuando.getTime() <= ahora) continue;
        await N.scheduleNotificationAsync({
          content: { title: a.titulo, body: a.cuerpo, sound: 'default', data: { local: true, prestamoId: p.id } },
          trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: a.cuando, channelId: CANAL },
        });
      }
    }
  } catch {
    /* se ignora: los avisos del servidor siguen funcionando */
  }
}
