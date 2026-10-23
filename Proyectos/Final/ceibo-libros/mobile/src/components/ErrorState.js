import React from 'react';
import EmptyState from './EmptyState';

// Pantalla de error con botón para reintentar (sirve para falta de conexión y errores del servidor)
export default function ErrorState({ error, onRetry }) {
  const sinRed = error?.codigo === 'SIN_CONEXION';
  return (
    <EmptyState
      icon={sinRed ? 'wifi-off' : 'alert-circle-outline'}
      title={sinRed ? 'Sin conexión' : 'Algo salió mal'}
      text={error?.message || 'No pudimos cargar la información.'}
      actionTitle="Reintentar"
      onAction={onRetry}
    />
  );
}
