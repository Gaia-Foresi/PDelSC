// Almacenamiento seguro: SecureStore en el celular, localStorage en la web (solo para pruebas).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

// Guarda un valor convertido a texto (JSON). Si falla, no rompe la app.
export async function guardar(clave: string, valor: unknown): Promise<void> {
  try {
    const texto = JSON.stringify(valor);
    if (isWeb) localStorage.setItem(clave, texto);
    else await SecureStore.setItemAsync(clave, texto);
  } catch (e) {
    /* si falla el almacenamiento la app sigue funcionando, solo no recuerda la sesión */
  }
}

// Lee y convierte de vuelta el texto a objeto. Si no hay nada, devuelve null.
export async function leer(clave: string): Promise<any> {
  try {
    const texto = isWeb ? localStorage.getItem(clave) : await SecureStore.getItemAsync(clave);
    return texto ? JSON.parse(texto) : null;
  } catch (e) {
    return null;
  }
}

// Borra una clave guardada.
export async function borrar(clave: string): Promise<void> {
  try {
    if (isWeb) localStorage.removeItem(clave);
    else await SecureStore.deleteItemAsync(clave);
  } catch (e) {
    /* nada que hacer */
  }
}
