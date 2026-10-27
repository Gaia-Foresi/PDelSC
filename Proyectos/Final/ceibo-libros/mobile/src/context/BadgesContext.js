// Contadores del menú: mensajes sin leer y notificaciones nuevas. Se actualizan solos cada 30 s.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { api } from '../api';
import { useAuth } from './AuthContext';
import { useToast } from '../components/Toast';

// Aviso del sistema (solo web): se muestra aunque la app esté en segundo plano, si el usuario lo permitió
function avisoDelSistema(texto) {
  try {
    if (Platform.OS === 'web' && typeof globalThis.Notification !== 'undefined' && globalThis.Notification.permission === 'granted') {
      new globalThis.Notification('Ceibo Libros', { body: texto, icon: '/favicon.ico' });
    }
  } catch { /* no es crítico */ }
}

const BadgesContext = createContext({ mensajes: 0, notificaciones: 0, refrescar: () => {} });

export function BadgesProvider({ children }) {
  const { usuario } = useAuth();
  const [mensajes, setMensajes] = useState(0);
  const [notificaciones, setNotificaciones] = useState(0);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const previo = useRef(null); // null = todavía no se hizo la primera lectura (no avisar al abrir la app)

  const refrescar = useCallback(async () => {
    if (!usuario) return;
    try {
      const [m, n] = await Promise.all([api.mensajes.noLeidos(), api.notificaciones.cantidad()]);
      const nuevoM = m.total || 0;
      const nuevoN = n.total || 0;
      if (previo.current && (nuevoM > previo.current.m || nuevoN > previo.current.n)) {
        toastRef.current.info('Hay un nuevo mensaje');
        avisoDelSistema('Hay un nuevo mensaje');
      }
      previo.current = { m: nuevoM, n: nuevoN };
      setMensajes(nuevoM);
      setNotificaciones(nuevoN);
    } catch (e) { /* los contadores no son críticos */ }
  }, [usuario]);

  useEffect(() => {
    if (!usuario) { setMensajes(0); setNotificaciones(0); previo.current = null; return undefined; }
    refrescar();
    // Web: pide permiso para avisos del sistema la primera vez que el usuario toca la pantalla
    let pedir;
    if (Platform.OS === 'web' && typeof globalThis.Notification !== 'undefined' && globalThis.Notification.permission === 'default') {
      pedir = () => { try { globalThis.Notification.requestPermission(); } catch { /* ignorar */ } };
      document.addEventListener('click', pedir, { once: true });
    }
    const id = setInterval(refrescar, 30000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refrescar());
    return () => { clearInterval(id); sub.remove(); if (pedir) document.removeEventListener('click', pedir); };
  }, [usuario, refrescar]);

  const value = useMemo(() => ({ mensajes, notificaciones, refrescar }), [mensajes, notificaciones, refrescar]);
  return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>;
}

export const useBadges = () => useContext(BadgesContext);
