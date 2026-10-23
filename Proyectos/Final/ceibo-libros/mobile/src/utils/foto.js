// Elegir una foto de la galería y reducirla (cuadrada, 256 px, JPEG) para guardarla como foto de perfil.
// Viaja dentro de la base de datos, por eso tiene que pesar poco. En celular usa expo-image-manipulator;
// en la versión web la recorta y reduce con un canvas.
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const LADO = 256;

function reducirEnWeb(uri) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const lado = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = LADO;
      canvas.height = LADO;
      canvas.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, LADO, LADO);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = uri;
  });
}

async function reducirEnCelular(uri) {
  const imagen = await ImageManipulator.manipulate(uri).resize({ width: LADO }).renderAsync();
  const guardada = await imagen.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${guardada.base64}`;
}

/**
 * Abre la galería y devuelve { foto } (data URI), { cancelado: true } o { error: 'mensaje' }.
 */
export async function elegirFotoDePerfil() {
  try {
    if (Platform.OS !== 'web') {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) return { error: 'Necesitamos permiso para acceder a tus fotos. Podés habilitarlo en los ajustes del teléfono.' };
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (r.canceled || !r.assets?.length) return { cancelado: true };
    const uri = r.assets[0].uri;
    const foto = Platform.OS === 'web' ? await reducirEnWeb(uri) : await reducirEnCelular(uri);
    return { foto };
  } catch (e) {
    return { error: 'No pudimos procesar la imagen. Probá con otra.' };
  }
}
