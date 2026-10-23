// Reservar un libro: pide los datos del lector, llama a la API y muestra el código de retiro.
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
        ? `Te guardamos "${libro.titulo}" para que lo leas en la biblioteca (24 horas). Completá tus datos para que te identifiquemos.`
        : `Te guardamos "${libro.titulo}" para que lo retires (3 días). Completá tus datos para que te identifiquemos.`,
      confirmText: 'Reservar',
      visitaTipo: tipo,
    });
    if (!datos) return false;
    try {
      const { reserva } = await api.reservas.crear({ libro_id: libro.id, tipo, ...datos });
      recargarPerfil().catch(() => {}); // el perfil guarda curso y DNI para la próxima vez
      onDone?.();
      await mostrarCodigo({
        titulo: '¡Reserva hecha!',
        mensaje: `Mostrá este código en la biblioteca para ${sala ? 'leer' : 'retirar'} "${libro.titulo}".`,
        codigo: reserva.codigo_retiro,
        visita: reserva.visita,
      });
      return true;
    } catch (e) {
      toast.fromError(e);
      return false;
    }
  }, [pedirDatos, mostrarCodigo, recargarPerfil, toast, onDone]);
}
