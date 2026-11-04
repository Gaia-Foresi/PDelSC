// Un método por endpoint del backend (ver backend/README.md). Todos son POST.
import { post } from './client';
import type { Categoria, Cuerpo, Libro, ResumenPerfil, Sesion, Usuario } from '../types';

// `T` es lo que devuelve el endpoint dentro de `data`; sin indicarlo queda como any.
const publico = <T = any>(ruta: string) => (cuerpo?: Cuerpo) => post<T>(ruta, cuerpo, { auth: false });
const privado = <T = any>(ruta: string) => (cuerpo?: Cuerpo) => post<T>(ruta, cuerpo);

export const api = {
  auth: {
    registro: publico('/auth/registro'),
    verificarEmail: publico<Sesion>('/auth/verificar-email'),
    login: publico<any>('/auth/login'),
    login2fa: publico<Sesion>('/auth/login-2fa'),
    reenviarCodigo: publico('/auth/reenviar-codigo'),
    social: publico<Sesion>('/auth/social'),
    refresh: publico('/auth/refresh'),
    logout: publico('/auth/logout'),
    olvidePassword: publico('/auth/olvide-password'),
    resetPassword: publico('/auth/reset-password'),
  },
  usuarios: {
    perfil: privado<{ usuario: Usuario; resumen: ResumenPerfil }>('/usuarios/perfil'),
    actualizarPerfil: privado('/usuarios/actualizar-perfil'),
    cambiarPassword: privado('/usuarios/cambiar-password'),
    dosPasos: privado('/usuarios/dos-pasos'),
    listar: privado('/usuarios/listar'),
    detalle: privado('/usuarios/detalle'),
    bloquear: privado('/usuarios/bloquear'),
    desbloquear: privado('/usuarios/desbloquear'),
  },
  admin: { cambiarRol: privado('/admin/cambiar-rol') },
  categorias: {
    listar: privado<{ categorias: Categoria[] }>('/categorias/listar'),
    crear: privado('/categorias/crear'),
    actualizar: privado('/categorias/actualizar'),
    eliminar: privado('/categorias/eliminar'),
  },
  libros: {
    listar: privado<{ libros: Libro[] }>('/libros/listar'),
    detalle: privado<{ libro: Libro }>('/libros/detalle'),
    historial: privado('/libros/historial'),
    crear: privado('/libros/crear'),
    actualizar: privado('/libros/actualizar'),
    buscarPortada: privado('/libros/buscar-portada'),
    eliminar: privado('/libros/eliminar'),
  },
  reservas: {
    crear: privado('/reservas/crear'),
    mis: privado('/reservas/mis'),
    listar: privado('/reservas/listar'),
    cancelar: privado('/reservas/cancelar'),
    atender: privado('/reservas/atender'),
    horarios: privado('/reservas/horarios'),
  },
  calendario: {
    listar: privado('/calendario/listar'),
  },
  prestamos: {
    crear: privado('/prestamos/crear'),
    mis: privado('/prestamos/mis'),
    listar: privado('/prestamos/listar'),
    detalle: privado('/prestamos/detalle'),
    agregarLibros: privado('/prestamos/agregar-libros'),
    devolver: privado('/prestamos/devolver'),
    extender: privado('/prestamos/extender'),
    pendientes: privado('/prestamos/pendientes'),
    revisar: privado('/prestamos/revisar'),
  },
  mensajes: {
    hilos: privado('/mensajes/hilos'),
    hilo: privado('/mensajes/hilo'),
    crear: privado('/mensajes/crear'),
    enviar: privado('/mensajes/enviar'),
    noLeidos: privado('/mensajes/no-leidos'),
    contactos: privado('/mensajes/contactos'),
  },
  distribuidoras: {
    listar: privado('/distribuidoras/listar'),
    crear: privado('/distribuidoras/crear'),
    actualizar: privado('/distribuidoras/actualizar'),
    eliminar: privado('/distribuidoras/eliminar'),
  },
  reposicion: { crear: privado('/reposicion/crear'), listar: privado('/reposicion/listar') },
  notificaciones: {
    listar: privado('/notificaciones/listar'),
    marcarLeidas: privado('/notificaciones/marcar-leidas'),
    cantidad: privado('/notificaciones/cantidad'),
  },
  estadisticas: {
    resumen: privado('/estadisticas/resumen'),
    exportar: privado<{ nombre: string; base64: string; resumen: any }>('/estadisticas/exportar'),
    analizar: privado<{ analisis: any }>('/estadisticas/analizar'),
  },
};
