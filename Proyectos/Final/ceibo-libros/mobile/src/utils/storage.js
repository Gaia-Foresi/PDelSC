// Almacenamiento seguro: SecureStore en el celular, localStorage en la web (solo para pruebas).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export async function guardar(clave, valor) {
  try {
    const texto = JSON.stringify(valor);
    if (isWeb) localStorage.setItem(clave, texto);
    else await SecureStore.setItemAsync(clave, texto);
  } catch (e) {
    /* si falla el almacenamiento la app sigue funcionando, solo no recuerda la sesión */
  }
}

export async function leer(clave) {
  try {
    const texto = isWeb ? localStorage.getItem(clave) : await SecureStore.getItemAsync(clave);
    return texto ? JSON.parse(texto) : null;
  } catch (e) {
    return null;
  }
}

export async function borrar(clave) {
  try {
    if (isWeb) localStorage.removeItem(clave);
    else await SecureStore.deleteItemAsync(clave);
  } catch (e) {
    /* nada que hacer */
  }
}
