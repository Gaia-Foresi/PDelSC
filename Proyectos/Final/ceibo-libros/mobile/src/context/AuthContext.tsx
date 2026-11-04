// Sesión del usuario: login, logout, persistencia y rol.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { cargarSesion, guardarSesion, limpiarSesion, setAlPerderSesion, getSesion } from '../api/session';
import type { ResumenPerfil, Sesion, Usuario } from '../types';


interface AuthValue {
  usuario: Usuario | null;
  resumen: ResumenPerfil | null;
  restaurando: boolean;
  esGerente: boolean;
  esStaff: boolean;
  bloqueado: boolean;
  iniciarSesion: (data: Sesion) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  actualizarUsuario: (nuevo: Usuario) => Promise<void>;
  recargarPerfil: () => Promise<{ usuario: Usuario; resumen: ResumenPerfil }>;
}

const AuthContext = createContext<AuthValue>(null as unknown as AuthValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [resumen, setResumen] = useState<ResumenPerfil | null>(null);
  const [restaurando, setRestaurando] = useState(true);

  // Si el cliente HTTP no logra renovar el token, volvemos al login
  useEffect(() => {
    setAlPerderSesion(() => { setUsuario(null); setResumen(null); });
  }, []);

  // Al abrir la app: restaurar la sesión guardada y validarla con el servidor
  useEffect(() => {
    (async () => {
      const guardada = await cargarSesion();
      if (!guardada.refresh_token) { setRestaurando(false); return; }
      try {
        const data = await api.usuarios.perfil();
        setUsuario(data.usuario);
        setResumen(data.resumen);
        await guardarSesion({ usuario: data.usuario });
      } catch (e: any) {
        // Solo se cierra la sesión si el servidor la rechaza; ante cualquier otro fallo (red, servidor caído) seguimos con lo guardado
        if (e.status === 401 || e.status === 403 && e.codigo !== 'USUARIO_BLOQUEADO') await limpiarSesion();
        else if (guardada.usuario) setUsuario(guardada.usuario);
        else await limpiarSesion();
      }
      setRestaurando(false);
    })();
  }, []);

  // Guarda la sesión que devuelve el backend ({ usuario, access_token, refresh_token })
  const iniciarSesion = useCallback(async (data: Sesion) => {
    await guardarSesion({ access_token: data.access_token, refresh_token: data.refresh_token, usuario: data.usuario });
    setUsuario(data.usuario);
  }, []);

  const cerrarSesion = useCallback(async () => {
    const { refresh_token } = getSesion();
    if (refresh_token) api.auth.logout({ refresh_token }).catch(() => {});
    await limpiarSesion();
    setUsuario(null);
    setResumen(null);
  }, []);

  const actualizarUsuario = useCallback(async (nuevo: Usuario) => {
    setUsuario(nuevo);
    await guardarSesion({ usuario: nuevo });
  }, []);

  const recargarPerfil = useCallback(async () => {
    const data = await api.usuarios.perfil();
    await actualizarUsuario(data.usuario);
    setResumen(data.resumen);
    return data;
  }, [actualizarUsuario]);

  const value = useMemo(() => ({
    usuario, resumen, restaurando,
    esGerente: usuario?.rol === 'gerente',
    esStaff: usuario?.rol === 'gerente' || usuario?.rol === 'bibliotecario',
    bloqueado: usuario?.estado === 'bloqueado',
    iniciarSesion, cerrarSesion, actualizarUsuario, recargarPerfil,
  }), [usuario, resumen, restaurando, iniciarSesion, cerrarSesion, actualizarUsuario, recargarPerfil]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
