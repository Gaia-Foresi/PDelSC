// Contadores del menú: mensajes sin leer y notificaciones nuevas. Se actualizan solos cada 30 s.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '../api';
import { useAuth } from './AuthContext';

const BadgesContext = createContext({ mensajes: 0, notificaciones: 0, refrescar: () => {} });

export function BadgesProvider({ children }) {
  const { usuario } = useAuth();
  const [mensajes, setMensajes] = useState(0);
  const [notificaciones, setNotificaciones] = useState(0);

  const refrescar = useCallback(async () => {
    if (!usuario) return;
    try {
      const [m, n] = await Promise.all([api.mensajes.noLeidos(), api.notificaciones.cantidad()]);
      setMensajes(m.total || 0);
      setNotificaciones(n.total || 0);
    } catch (e) { /* los contadores no son críticos */ }
  }, [usuario]);

  useEffect(() => {
    if (!usuario) { setMensajes(0); setNotificaciones(0); return undefined; }
    refrescar();
    const id = setInterval(refrescar, 30000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refrescar());
    return () => { clearInterval(id); sub.remove(); };
  }, [usuario, refrescar]);

  const value = useMemo(() => ({ mensajes, notificaciones, refrescar }), [mensajes, notificaciones, refrescar]);
  return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>;
}

export const useBadges = () => useContext(BadgesContext);
