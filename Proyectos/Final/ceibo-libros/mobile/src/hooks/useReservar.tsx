// Reservar un libro: pide los datos del lector, llama a la API y muestra el código de retiro.
import { diasEntre, fechaHora, plural } from '../utils/format';
import { useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDatosLector } from '../components/DatosLector';
import { useToast } from '../components/Toast';
import { esErrorDeLimite, useAvisoLimite } from './useLimite';

export function useReservar(onDone) {
  const { pedirDatos, mostrarCodigo } = useDatosLector();
  const { recargarPerfil, esStaff } = useAuth();
  const toast = useToast();
  const avisarLimite = useAvisoLimite();
  return useCallback(async (libro, tipo) => {
    const sala = tipo === 'sala';
    // Si ya tiene todas las reservas permitidas, se avisa antes de pedirle los datos
    try {
      const { resumen } = await recargarPerfil();
      if (resumen.reservas_max && resumen.reservas_activas >= resumen.reservas_max) {
        await avisarLimite(`Ya tenés ${resumen.reservas_activas} reservas activas y el máximo es ${resumen.reservas_max}. No podés reservar ni pedir más libros hasta que retires o canceles alguna.`);
        return false;
      }
    } catch { /* si no se pudo consultar, el servidor igual valida el límite */ }
    const datos = await pedirDatos({
      titulo: sala ? 'Reservar para leer en sala' : 'Reservar para llevar',
      mensaje: sala
        ? `Te guardamos "${libro.titulo}" para que lo leas en la biblioteca. La reserva dura 24 horas. ${esStaff ? 'Escribí los datos de la persona que lo va a leer (no cambian tu perfil)' : 'Completá tus datos'} y elegí cuándo van a ir.`
        : `Te guardamos "${libro.titulo}" para que lo retires. La reserva dura 3 días. ${esStaff ? 'Escribí los datos de la persona que lo va a retirar (no cambian tu perfil)' : 'Completá tus datos'} y elegí cuándo van a ir.`,
    // el personal reserva para otra persona: el formulario arranca vacío, no con sus propios datos
    ...(esStaff ? { inicial: {} } : {}),
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
      if (esErrorDeLimite(e)) await avisarLimite(`${(e as Error).message} No podés reservar ni pedir más libros hasta liberar lugar.`);
      else toast.fromError(e);
      return false;
    }
  }, [pedirDatos, mostrarCodigo, recargarPerfil, esStaff, toast, onDone, avisarLimite]);
}
