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

// Cámara en la versión web: en la compu "launchCameraAsync" abre el explorador de archivos, así que se abre la cámara de verdad
// con getUserMedia y un visor propio (vista previa, botón "Sacar foto" y "Cancelar"). Devuelve la foto como data URI o null si se canceló.
function sacarFotoEnWeb(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const medios = (navigator as any).mediaDevices;
    if (!medios?.getUserMedia) { reject(new Error('sin-camara')); return; }
    medios.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false }).then((stream: any) => {
      const fondo = document.createElement('div');
      fondo.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif';
      const caja = document.createElement('div');
      caja.style.cssText = 'background:#1b1613;color:#f3ece2;border-radius:16px;padding:16px;max-width:520px;width:100%;display:flex;flex-direction:column;gap:12px;box-shadow:0 10px 40px rgba(0,0,0,.5)';
      const titulo = document.createElement('div');
      titulo.textContent = 'Sacarme una foto';
      titulo.style.cssText = 'font-size:18px;font-weight:700';
      const video = document.createElement('video');
      video.autoplay = true; video.muted = true; video.setAttribute('playsinline', 'true');
      video.srcObject = stream;
      video.style.cssText = 'width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:12px;background:#000;transform:scaleX(-1)';
      const fila = document.createElement('div');
      fila.style.cssText = 'display:flex;gap:10px';
      const boton = (texto: string, principal: boolean) => {
        const b = document.createElement('button');
        b.textContent = texto;
        b.style.cssText = `flex:1;min-height:48px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;border:1px solid #7fb08c;${principal ? 'background:#7fb08c;color:#10200f' : 'background:transparent;color:#7fb08c'}`;
        return b;
      };
      const cancelar = boton('Cancelar', false);
      const sacar = boton('Sacar foto', true);
      let cerrado = false;
      const cerrar = (valor: string | null) => {
        if (cerrado) return;
        cerrado = true;
        stream.getTracks().forEach((t: any) => t.stop());
        fondo.remove();
        resolve(valor);
      };
      cancelar.onclick = () => cerrar(null);
      sacar.onclick = () => {
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);
        cerrar(canvas.toDataURL('image/jpeg', 0.9));
      };
      fondo.onclick = (e) => { if (e.target === fondo) cerrar(null); };
      fila.append(cancelar, sacar);
      caja.append(titulo, video, fila);
      fondo.append(caja);
      document.body.append(fondo);
    }).catch((e: any) => reject(e));
  });
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
    if (origen === 'camara' && Platform.OS === 'web') {
      let capturada: string | null;
      try {
        capturada = await sacarFotoEnWeb();
      } catch (e: any) {
        const negada = e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
        return { error: negada ? 'El navegador no nos dejó usar la cámara. Habilitá el permiso desde el candado de la barra de direcciones y probá de nuevo.' : 'No encontramos una cámara en este dispositivo. Elegí una foto de la galería.' };
      }
      if (!capturada) return { cancelado: true };
      return { foto: await reducirEnWeb(capturada) };
    }
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
