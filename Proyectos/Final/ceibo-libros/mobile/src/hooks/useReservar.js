// Reservar un libro: pide los datos del lector, llama a la API y muestra el código de retiro.
import { diasEntre, fechaHora, plural } from '../utils/format';
import { useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDatosLector } from '../components/DatosLector';
import { useToast } from '../components/Toast';

export function useReservar(onDone) {
  const { pedirDatos, mostrarCodigo } = useDatosLector();
  const { recargarPerfil } = useAuth();
  const toast = useToast();
  return useCallback(async (libro, tipo) => {
    const sala = tipo === 'sala';
    const datos = await pedirDatos({
      titulo: sala ? 'Reservar para leer en sala' : 'Reservar para llevar',
      mensaje: sala
        ? `Te guardamos "${libro.titulo}" para que lo leas en la biblioteca. La reserva dura 24 horas. Completá tus datos y elegí cuándo vas a ir.`
        : `Te guardamos "${libro.titulo}" para que lo retires. La reserva dura 3 días. Completá tus datos y elegí cuándo vas a ir.`,
      confirmText: 'Reservar',
      visitaTipo: tipo,
    });
    if (!datos) return false;
    try {
      const { reserva } = await api.reservas.crear({ libro_id: libro.id, tipo, ...datos });
      recargarPerfil().catch(() => {}); // el perfil guarda el DNI para la próxima vez
      onDone?.();
      await mostrarCodigo({
        titulo: '¡Reserva hecha!',
        mensaje: `Mostrá este código en la biblioteca para ${sala ? 'leer' : 'retirar'} "${libro.titulo}".`,
        codigo: reserva.codigo_retiro,
        visita: reserva.visita,
        vigencia: `Si no podés ir ese día, tenés tiempo hasta el ${fechaHora(reserva.fecha_limite)} (${plural(diasEntre(reserva.creada_en, reserva.fecha_limite), 'día', 'días')} desde que reservaste). Pasada esa fecha, la reserva se cancela sola.`,
      });
      return true;
    } catch (e) {
      toast.fromError(e);
      return false;
    }
  }, [pedirDatos, mostrarCodigo, recargarPerfil, toast, onDone]);
}
