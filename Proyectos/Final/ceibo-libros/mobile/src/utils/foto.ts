// Elegir una foto de la galería (o sacarla con la cámara) y reducirla (cuadrada, 256 px, JPEG) para guardarla como foto de perfil.
// Viaja dentro de la base de datos, por eso tiene que pesar poco. En celular usa expo-image-manipulator;
// en la versión web la recorta y reduce con un canvas.
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const LADO = 256;

function reducirEnWeb(uri: string): Promise<string> {
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

async function reducirEnCelular(uri: string): Promise<string> {
  const imagen = await ImageManipulator.manipulate(uri).resize({ width: LADO }).renderAsync();
  const guardada = await imagen.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${guardada.base64}` as string;
}

export type OrigenFoto = 'galeria' | 'camara';
export interface ResultadoFoto { foto?: string; error?: string; cancelado?: boolean }

/**
 * Obtiene la foto de perfil desde la galería o sacándola con la cámara.
 * Devuelve { foto } (data URI), { cancelado: true } o { error: 'mensaje' }.
 */
export async function obtenerFotoDePerfil(origen: OrigenFoto = 'galeria'): Promise<ResultadoFoto> {
  try {
    const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
    let r: ImagePicker.ImagePickerResult;
    if (origen === 'camara') {
      if (Platform.OS !== 'web') {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) return { error: 'Necesitamos permiso para usar la cámara. Podés habilitarlo en los ajustes del teléfono.' };
      }
      r = await ImagePicker.launchCameraAsync({ ...opciones, cameraType: ImagePicker.CameraType.front });
    } else {
      if (Platform.OS !== 'web') {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) return { error: 'Necesitamos permiso para acceder a tus fotos. Podés habilitarlo en los ajustes del teléfono.' };
      }
      r = await ImagePicker.launchImageLibraryAsync(opciones);
    }
    if (r.canceled || !r.assets?.length) return { cancelado: true };
    const uri = r.assets[0].uri;
    const foto = Platform.OS === 'web' ? await reducirEnWeb(uri) : await reducirEnCelular(uri);
    return { foto };
  } catch (e) {
    return { error: origen === 'camara' ? 'No pudimos usar la cámara. Probá de nuevo o elegí una foto de la galería.' : 'No pudimos procesar la imagen. Probá con otra.' };
  }
}

/** Compatibilidad: abre la galería. */
export const elegirFotoDePerfil = () => obtenerFotoDePerfil('galeria');
