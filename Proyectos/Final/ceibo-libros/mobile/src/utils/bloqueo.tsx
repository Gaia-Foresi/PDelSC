// Tipos de bloqueo de una cuenta: atraso en la devolución o daño a un libro.
export type TipoBloqueo = 'atraso' | 'dano';

export const TIPOS_BLOQUEO: { value: TipoBloqueo; label: string; description: string; mensaje: string }[] = [
  {
    value: 'atraso', label: 'Atraso en la devolución', description: 'No devolvió un libro a tiempo. Se habilita sola al devolverlo.',
    mensaje: 'Tenés libros pendientes de devolución. Devolvelos en la biblioteca para habilitar tu cuenta.',
  },
  {
    value: 'dano', label: 'Daño a un libro', description: 'Devolvió un libro dañado. Solo el personal puede habilitarla.',
    mensaje: 'Un libro que tenías sufrió daños. Acercate a la biblioteca para resolverlo y habilitar tu cuenta.',
  },
];

export const textoTipoBloqueo = (tipo?: string | null) => (tipo === 'dano' ? 'por daño a un libro' : 'por atraso en la devolución');
