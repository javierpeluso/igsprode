import React, { useState, useEffect, useCallback } from 'react';

/**
 * PaymentWarningBanner
 * – El overlay SIEMPRE bloquea la app (invisible o visible).
 * – El cartel aparece 10s, se oculta 10s, y repite el ciclo.
 * – "Cerrar" oculta el cartel hasta el próximo ciclo, pero el bloqueo persiste.
 */
export default function PaymentWarningBanner() {
  const [showCard, setShowCard] = useState(true);

  // Ciclo: visible 10s ↔ oculto 10s, indefinidamente
  useEffect(() => {
    const t = setTimeout(() => setShowCard(v => !v), 10000);
    return () => clearTimeout(t);
  }, [showCard]);

  const handleDismiss = useCallback(() => {
    setShowCard(false); // oculta hasta el próximo ciclo, el overlay sigue bloqueando
  }, []);

  const overlayStyle = showCard
    ? {}
    : { background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none' };

  return (
    <div className="payment-warning-overlay" style={overlayStyle}>
      {showCard && (
        <div className="payment-warning-banner" role="alertdialog" aria-modal="true">
          <div className="payment-warning-icon">⚠️</div>
          <div className="payment-warning-text">
            No se registra pago, su cuenta será deshabilitada
          </div>
          <button
            className="payment-warning-close"
            onClick={handleDismiss}
            aria-label="Cerrar advertencia"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
