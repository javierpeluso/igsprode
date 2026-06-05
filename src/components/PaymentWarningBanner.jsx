import React, { useState, useEffect, useCallback } from 'react';

export default function PaymentWarningBanner() {
  const [visible, setVisible]     = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const timeout = setTimeout(
      () => setVisible(v => !v),
      10000
    );
    return () => clearTimeout(timeout);
  }, [visible, dismissed]);

  if (dismissed || !visible) return null;

  return (
    <div className="payment-warning-overlay">
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
    </div>
  );
}
