// Aviso general de "el formulario tiene errores": lo dispara la validación (sinErrores) o un error del servidor con detalles.
// Lo escuchan (1) el desplazamiento automático hasta el primer campo con error y (2) el aviso (toast) con la cantidad de campos.
type Escucha = (cantidad?: number) => void;

const escuchas = new Set<Escucha>();

export function alAvisarErrores(fn: Escucha): () => void {
  escuchas.add(fn);
  return () => { escuchas.delete(fn); };
}

/** Se llama después de marcar los errores en pantalla. `cantidad` (opcional) es cuántos campos hay que corregir. */
export function avisarErrores(cantidad?: number) {
  // Pequeña espera: deja que React termine de dibujar los errores antes de buscar el primero
  setTimeout(() => escuchas.forEach((fn) => fn(cantidad)), 60);
}

const escuchasCorrecto = new Set<() => void>();

export function alFormularioCorrecto(fn: () => void): () => void {
  escuchasCorrecto.add(fn);
  return () => { escuchasCorrecto.delete(fn); };
}

/** Se llama cuando el formulario quedó bien: el aviso de "hay campos para corregir" ya no corresponde y se retira. */
export function avisarCorrecto() {
  escuchasCorrecto.forEach((fn) => fn());
}
