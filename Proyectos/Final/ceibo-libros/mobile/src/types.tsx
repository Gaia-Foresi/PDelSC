// Tipos compartidos de la app (reflejan lo que devuelve la API; ver backend/README y docs de la API).

// "type" e "interface" describen la forma de los datos para que TypeScript avise si usamos mal un campo.
export type Rol = 'gerente' | 'bibliotecario' | 'usuario';

// Usuario tal como lo devuelve la API (sin contraseña). El "?" marca campos que pueden faltar.
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

// Lo que devuelve el login: los datos del usuario y los dos tokens.
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
// Cuerpo de un pedido: un objeto cualquiera (clave: valor).
export type Cuerpo = Record<string, any>;

/** Props que React Navigation entrega a cada pantalla. */
// Props comunes de las pantallas: navigation (para moverse) y route (parámetros recibidos).
export interface PantallaProps {
  navigation: any;
  route: any;
}

import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

/** Nombre de un ícono de MaterialCommunityIcons. */
// Nombre válido de un ícono de MaterialCommunityIcons (TypeScript avisa si escribís uno que no existe).
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
