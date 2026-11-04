// Bajar y subir archivos: descarga un Excel generado por el servidor y deja elegir Excel guardados para analizarlos.
// Web: descarga del navegador y selector de archivos. Celular: carpeta temporal + menú de compartir/guardar.
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface ArchivoElegido { nombre: string; contenido: string } // contenido en base64

/** Guarda en el dispositivo (o descarga en el navegador) un archivo que llega en base64. */
export async function guardarArchivo(nombre: string, base64: string, mime = MIME_XLSX): Promise<void> {
  if (Platform.OS === 'web') {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }
  const uri = `${FileSystem.cacheDirectory}${nombre}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite guardar o compartir archivos.');
  await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: nombre, UTI: 'org.openxmlformats.spreadsheetml.sheet' });
}

const leerWeb = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(new Error('No pudimos leer el archivo.'));
  r.readAsDataURL(file);
});

/** Abre el selector y devuelve los Excel elegidos (varios a la vez) en base64. */
export async function elegirExcels(): Promise<ArchivoElegido[]> {
  const r = await DocumentPicker.getDocumentAsync({ type: [MIME_XLSX, 'application/octet-stream'], multiple: true, copyToCacheDirectory: true });
  if (r.canceled) return [];
  const salida: ArchivoElegido[] = [];
  for (const a of r.assets) {
    const contenido = Platform.OS === 'web' && a.file
      ? await leerWeb(a.file)
      : await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
    salida.push({ nombre: a.name, contenido });
  }
  return salida;
}
