// Bajar y subir archivos: descarga un Excel generado por el servidor y deja elegir Excel guardados para analizarlos.
// Web: descarga del navegador y selector de archivos. Celular: carpeta temporal + menú de compartir/guardar.
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface ArchivoElegido { nombre: string; contenido: string } // contenido en base64

export type DondeQuedo = 'descargas' | 'carpeta' | 'compartido';

/**
 * Guarda un archivo que llega en base64.
 * Web: lo baja a la carpeta Descargas del navegador. Android: deja elegir una carpeta (ej. Documentos) y lo guarda ahí;
 * si se cancela, abre el menú de compartir. iPhone: menú de compartir ("Guardar en Archivos").
 */
export async function guardarArchivo(nombre: string, base64: string, mime = MIME_XLSX): Promise<DondeQuedo> {
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
    return 'descargas';
  }
  if (Platform.OS === 'android') {
    const saf = FileSystem.StorageAccessFramework;
    const permiso = await saf.requestDirectoryPermissionsAsync();
    if (permiso.granted) {
      const destino = await saf.createFileAsync(permiso.directoryUri, nombre.replace(/\.xlsx$/i, ''), mime);
      await FileSystem.writeAsStringAsync(destino, base64, { encoding: FileSystem.EncodingType.Base64 });
      return 'carpeta';
    }
  }
  const uri = `${FileSystem.cacheDirectory}${nombre}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite guardar o compartir archivos.');
  await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: nombre, UTI: 'org.openxmlformats.spreadsheetml.sheet' });
  return 'compartido';
}

const leerWeb = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(new Error('No pudimos leer el archivo.'));
  r.readAsDataURL(file);
});

const esXlsx = (nombre: string) => /\.xlsx$/i.test(nombre);

/** Abre el selector y devuelve los Excel (.xlsx) elegidos en base64. Lo que no sea un .xlsx se rechaza y se devuelve aparte. */
export async function elegirExcels(): Promise<{ validos: ArchivoElegido[]; rechazados: string[] }> {
  // En el celular se muestran todos los archivos: Drive y WhatsApp a veces guardan el Excel con otro tipo y no aparecería.
  // Lo que no termine en .xlsx se rechaza igual más abajo.
  const r: any = await DocumentPicker.getDocumentAsync({
    type: Platform.OS === 'web' ? [MIME_XLSX, '.xlsx'] : '*/*',
    multiple: true,
    copyToCacheDirectory: true,
    base64: false,
  });
  const elegidos: any[] = Array.isArray(r?.assets) ? r.assets : (r?.uri && !r?.canceled ? [r] : []);
  if (r?.canceled || r?.type === 'cancel' || !elegidos.length) return { validos: [], rechazados: [] };
  const salida: ArchivoElegido[] = [];
  const rechazados: string[] = [];
  for (const a of elegidos) {
    const nombre: string = String(a?.name || decodeURIComponent(String(a?.uri || '').split('/').pop() || '') || 'archivo');
    if (!esXlsx(nombre)) { rechazados.push(nombre); continue; }
    try {
      const contenido = Platform.OS === 'web' && a.file
        ? await leerWeb(a.file)
        : await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
      // Un .xlsx es un ZIP: en base64 empieza con "UEsD". Si no, es otro archivo con la extensión cambiada.
      if (!String(contenido || '').startsWith('UEsD')) { rechazados.push(nombre); continue; }
      salida.push({ nombre, contenido });
    } catch {
      rechazados.push(nombre);
    }
  }
  return { validos: salida, rechazados };
}
