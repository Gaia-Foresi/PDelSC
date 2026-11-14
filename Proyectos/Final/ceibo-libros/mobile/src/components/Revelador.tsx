// Lleva la vista hasta el primer campo con error y lo enfoca, para que en el celular se vea siempre qué hay que corregir.
// Los campos (Input, SelectField) se registran en el contexto de la pantalla/hoja que los contiene.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { alAvisarErrores } from '../utils/formularios';

import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { RefObject } from 'react';

export interface CampoRegistrado {
  vista: () => any;
  tieneError: () => boolean;
  enfocar?: () => void;
}

interface RevelaCtx {
  registrar: (campo: CampoRegistrado) => () => void;
}

// Contexto donde se registran los campos de una pantalla, para poder encontrar el primero con error.
const Ctx = createContext<RevelaCtx | null>(null);
export const RevelaProvider = Ctx.Provider;
export const useRevelaCampos = () => useContext(Ctx);

// Mide la posición (y) y el alto (h) de una vista en la pantalla.
const medir = (vista: any): Promise<{ y: number; h: number }> =>
  new Promise((resolve) => (vista as any).measureInWindow((_x: number, y: number, _w: number, h: number) => resolve({ y, h })));

/**
 * Se usa con el ScrollView que contiene el formulario. Devuelve `onScroll`, el `contenedor` (ref de una View que envuelve
 * al ScrollView) y el `valor` para el RevelaProvider.
 */
// Hook que usa la pantalla: guarda los campos, sigue el scroll y, ante un error, desplaza hasta el primero.
export function useRevelador(scrollRef: RefObject<any>) {
  const campos = useRef(new Set<CampoRegistrado>());
  const scrollY = useRef(0);
  const contenedor = useRef<any>(null);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => { scrollY.current = e.nativeEvent.contentOffset.y; }, []);

  const valor = useMemo<RevelaCtx>(() => ({
    registrar: (campo) => { campos.current.add(campo); return () => { campos.current.delete(campo); }; },
  }), []);

  useEffect(() => alAvisarErrores(async () => {
    const conError = [...campos.current].filter((c) => c.tieneError() && c.vista());
    if (!conError.length || !contenedor.current) return;
    try {
      const area = await medir(contenedor.current);
      const medidos = await Promise.all(conError.map(async (c) => ({ c, ...(await medir(c.vista())) })));
      medidos.sort((a, b) => a.y - b.y);
      const primero = medidos[0];
      const relativo = primero.y - area.y; // posición del campo dentro de la zona visible
      const fuera = relativo < 12 || relativo + primero.h > area.h - 12;
      if (fuera) scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current + relativo - 90), animated: true });
      // En el celular enfocar abre el teclado justo en el campo a corregir
      setTimeout(() => primero.c.enfocar?.(), fuera ? 280 : 0);
    } catch {
      /* si no se puede medir, el campo igual queda marcado en rojo */
    }
  }), [scrollRef]);

  return { onScroll, contenedor, valor };
}

/** Mensaje de error de un campo: ícono + texto, bien visible. */
// Texto de error en rojo debajo de un campo.
export function MensajeError({ texto }: { texto?: string }) {
  const { colors } = useTheme();
  if (!texto) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 }} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <MaterialCommunityIcons name="alert-circle" size={17} color={colors.danger} style={{ marginTop: 1, marginRight: 5 }} />
      <Text style={{ color: colors.danger, fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 19 }}>{texto}</Text>
    </View>
  );
}

export const esWeb = Platform.OS === 'web';

/** Envuelve cualquier bloque (una lista, un selector propio) para que también se lo lleve a la vista cuando tiene un error. */
// Envuelve cualquier parte de la pantalla para que el revelador también pueda llevar la vista hasta ahí.
export function ZonaConError({ error, children }: { error?: string; children?: React.ReactNode }) {
  const revela = useRevelaCampos();
  const caja = useRef<any>(null);
  const errorRef = useRef(error);
  errorRef.current = error;
  useEffect(() => revela?.registrar({ vista: () => caja.current, tieneError: () => !!errorRef.current }), [revela]);
  return <View ref={caja} collapsable={false}>{children}</View>;
}
