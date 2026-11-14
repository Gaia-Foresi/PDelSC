// Aviso cuando se llega al límite de libros que se pueden tener reservados/pedidos a la vez.
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useConfirm } from '../components/Confirm';

/** ¿El error de la API es "llegaste al límite"? */
// ¿El error del servidor es por llegar al límite de reservas o libros?
export const esErrorDeLimite = (e: unknown) => (e as any)?.codigo === 'LIMITE_ALCANZADO';

/**
 * Devuelve una función que muestra el aviso de límite alcanzado.
 * `verReservas`: ofrece ir directo a "Mis reservas" para liberar lugar.
 */
// Devuelve una función que muestra el aviso de límite y ofrece ir a "Mis reservas".
export function useAvisoLimite() {
  const confirm = useConfirm() as (o: any) => Promise<boolean>;
  const navigation = useNavigation<any>();
  return useCallback(async (mensaje: string, opciones: { verReservas?: boolean; titulo?: string } = {}) => {
    const { verReservas = true, titulo = 'Llegaste al límite' } = opciones;
    const ir = await confirm({
      title: titulo,
      message: mensaje,
      icon: 'book-lock-outline',
      confirmText: verReservas ? 'Ver mis reservas' : 'Entendido',
      cancelText: verReservas ? 'Entendido' : '',
    });
    if (ir && verReservas) navigation.navigate('Tabs', { screen: 'ReservasTab' });
  }, [confirm, navigation]);
}
