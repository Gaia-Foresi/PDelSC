// Sesión del usuario: login, logout, persistencia y rol.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { cargarSesion, guardarSesion, limpiarSesion, setAlPerderSesion, getSesion } from '../api/session';

const AuthContext = createContext(null);

// Proveedor de contexto para la sesión del usuario
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [resumen, setResumen] = useState(null);
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
      } catch (e) {
        if (e.codigo === 'SIN_CONEXION' && guardada.usuario) setUsuario(guardada.usuario); // sin internet: seguimos con lo guardado
        else await limpiarSesion();
      }
      setRestaurando(false);
    })();
  }, []);

  // Guarda la sesión que devuelve el backend ({ usuario, access_token, refresh_token })
  const iniciarSesion = useCallback(async (data) => {
    await guardarSesion({ access_token: data.access_token, refresh_token: data.refresh_token, usuario: data.usuario });
    setUsuario(data.usuario);
  }, []);

  // Cierra la sesión: borra la sesión guardada y el usuario en memoria, y avisa al backend para invalidar el refresh_token
  const cerrarSesion = useCallback(async () => {
    const { refresh_token } = getSesion();
    if (refresh_token) api.auth.logout({ refresh_token }).catch(() => {});
    await limpiarSesion();
    setUsuario(null);
    setResumen(null);
  }, []);

  // Actualiza el usuario en memoria y en la sesión guardada
  const actualizarUsuario = useCallback(async (nuevo) => {
    setUsuario(nuevo);
    await guardarSesion({ usuario: nuevo });
  }, []);

  // Recarga el perfil del usuario desde el backend y actualiza la sesión guardada
  const recargarPerfil = useCallback(async () => {
    const data = await api.usuarios.perfil();
    await actualizarUsuario(data.usuario);
    setResumen(data.resumen);
    return data;
  }, [actualizarUsuario]);

  // El valor del contexto incluye el usuario, su resumen, si se está restaurando la sesión, y funciones para iniciar/cerrar sesión, actualizar el usuario y recargar el perfil.
  const value = useMemo(() => ({
    usuario, resumen, restaurando,
    esDueno: usuario?.rol === 'dueno',
    esStaff: usuario?.rol === 'dueno' || usuario?.rol === 'bibliotecario',
    bloqueado: usuario?.estado === 'bloqueado',
    iniciarSesion, cerrarSesion, actualizarUsuario, recargarPerfil,
  }), [usuario, resumen, restaurando, iniciarSesion, cerrarSesion, actualizarUsuario, recargarPerfil]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
