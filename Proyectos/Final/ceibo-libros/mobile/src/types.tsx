// Tipos compartidos de la app (reflejan lo que devuelve la API; ver backend/README y docs de la API).

export type Rol = 'gerente' | 'bibliotecario' | 'usuario';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  rol: Rol;
  estado: 'activo' | 'bloqueado';
  motivo_bloqueo: string | null;
  tipo_bloqueo?: 'atraso' | 'dano' | null; // por qué está bloqueado
  telefono: string | null;
  curso: string | null;
  dni: string | null;
  foto_url: string | null;
  dos_pasos_activo: boolean;
  creado_en: string;
  prestamos_activos?: number;
}

export interface Sesion {
  usuario: Usuario;
  access_token: string;
  refresh_token: string;
}

export interface SesionGuardada {
  access_token: string | null;
  refresh_token: string | null;
  usuario: Usuario | null;
}

export interface Categoria {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  icono?: string | null;
  color?: string | null;
  total_libros?: number;
}

export interface Libro {
  id: number;
  titulo: string;
  autor: string;
  descripcion: string | null;
  portada_url: string | null;
  stock_total: number;
  disponibles: number;
  en_espera?: number; // devueltos que esperan revisión
  reservado_por_mi?: boolean;
  categoria?: string;
  categoria_id?: number;
  categoria_color?: string;
  categorias?: { id: number; nombre: string }[];
}

export interface ResumenPerfil {
  prestamos_activos: number;
  reservas_activas: number;
  reservas_max?: number; // tope de reservas activas por lector
}

/** Cuerpo de cualquier petición a la API. */
export type Cuerpo = Record<string, any>;

/** Props que React Navigation entrega a cada pantalla. */
export interface PantallaProps {
  navigation: any;
  route: any;
}

import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

/** Nombre de un ícono de MaterialCommunityIcons. */
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
