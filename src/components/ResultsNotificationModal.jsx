import React, { useEffect } from 'react';

/**
 * Modal que se muestra al usuario cuando el admin cargó resultados nuevos.
 * Se cierra solo cuando el usuario hace clic en el botón, momento en que
 * se llama a onClose (que llama a markAsSeen en useNewResults).
 */
export default function ResultsNotificationModal({ onClose, onGoToRanking }) {
  // Bloquear scroll mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border2)',
          borderRadius: '20px',
          padding: '36px 28px 28px',
          maxWidth: '360px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'resultsModalIn 0.3s cubic-bezier(.34,1.56,.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Ícono animado */}
        <div style={{ fontSize: 54, marginBottom: 12, lineHeight: 1 }}>🏆</div>

        <div
          style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 26,
            letterSpacing: '0.06em',
            color: 'var(--c-accent)',
            marginBottom: 8,
          }}
        >
          ¡Nuevos resultados!
        </div>

        <div
          style={{
            fontSize: 14,
            color: 'var(--c-text)',
            lineHeight: 1.55,
            marginBottom: 6,
          }}
        >
          Se cargaron resultados de partidos.
        </div>
        <div
          style={{
            fontSize: 14,
            color: 'var(--c-muted)',
            lineHeight: 1.55,
            marginBottom: 28,
          }}
        >
          El ranking fue actualizado — ¡revisá tu posición!
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onGoToRanking}
            style={{
              padding: '12px 0',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--c-accent)',
              color: '#fff',
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 16,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Ver ranking
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '11px 0',
              borderRadius: '12px',
              border: '1px solid var(--c-border2)',
              background: 'transparent',
              color: 'var(--c-muted)',
              fontSize: 14,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes resultsModalIn {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
