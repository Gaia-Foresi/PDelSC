// useConfirm() devuelve una función que muestra el diálogo y resuelve true/false.
// Uso:  if (!(await confirm({ title: '¿Eliminar libro?', destructive: true }))) return;
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ConfirmDialog } from './Modal';

const ConfirmContext = createContext(null);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((o) => new Promise((resolve) => {
    resolver.current = resolve;
    setOpts(o);
  }), []);

  const cerrar = (resultado) => {
    setOpts(null);
    resolver.current?.(resultado);
    resolver.current = null;
  };

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
