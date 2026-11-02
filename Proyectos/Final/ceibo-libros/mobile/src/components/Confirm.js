// useConfirm() devuelve una función que muestra el diálogo y resuelve true/false.
// Uso:  if (!(await confirm({ title: '¿Eliminar libro?', destructive: true }))) return;
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ConfirmDialog } from './Modal';

// Contexto para el diálogo de confirmación
const ConfirmContext = createContext(null);
export const useConfirm = () => useContext(ConfirmContext);

// Componente que envuelve la app y permite usar el diálogo de confirmación en cualquier parte
export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);

  // Función que muestra el diálogo y devuelve una promesa que se resuelve con true/false según la elección del usuario
  const confirm = useCallback((o) => new Promise((resolve) => {
    resolver.current = resolve;
    setOpts(o);
  }), []);

  // Función que cierra el diálogo y resuelve la promesa con el resultado (true/false)
  const cerrar = (resultado) => {
    setOpts(null);
    resolver.current?.(resultado);
    resolver.current = null;
  };

  // Renderiza el proveedor de contexto y el diálogo de confirmación, pasando las opciones y los callbacks correspondientes
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        visible={!!opts}
        title={opts?.title}
        message={opts?.message}
        confirmText={opts?.confirmText}
        cancelText={opts?.cancelText}
        destructive={opts?.destructive}
        onConfirm={() => cerrar(true)}
        onCancel={() => cerrar(false)}
      />
    </ConfirmContext.Provider>
  );
}
