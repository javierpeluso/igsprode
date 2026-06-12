import React, { useState, useEffect } from 'react';
import { useManualThirds } from '../hooks/useBracket';
import KnockoutPredictions from './KnockoutPredictions';

// 25 de junio de 2025 00:00:00 hora argentina (UTC-3)
const UNLOCK_DATE = new Date('2025-06-25T03:00:00Z');

function getTimeLeft() {
  const diff = UNLOCK_DATE.getTime() - Date.now();
  if (diff <= 0) return null;
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

function KnockoutCountdownModal() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) return null;

  const { days, hours, minutes, seconds } = timeLeft;

  return (
    <div className="knockout-unlock-overlay">
      <div className="knockout-unlock-modal">
        <div className="knockout-unlock-icon">🏆</div>
        <h2 className="knockout-unlock-title">Fase Eliminatoria</h2>
        <p className="knockout-unlock-sub">
          Los pronósticos de la fase eliminatoria estarán disponibles 5 dias antes del inicio de los 16avos de final.
        </p>
        <div className="knockout-unlock-countdown">
          <div className="knockout-unlock-unit">
            <span className="knockout-unlock-num">{String(days).padStart(2, '0')}</span>
            <span className="knockout-unlock-label">días</span>
          </div>
          <span className="knockout-unlock-sep">:</span>
          <div className="knockout-unlock-unit">
            <span className="knockout-unlock-num">{String(hours).padStart(2, '0')}</span>
            <span className="knockout-unlock-label">horas</span>
          </div>
          <span className="knockout-unlock-sep">:</span>
          <div className="knockout-unlock-unit">
            <span className="knockout-unlock-num">{String(minutes).padStart(2, '0')}</span>
            <span className="knockout-unlock-label">min</span>
          </div>
          <span className="knockout-unlock-sep">:</span>
          <div className="knockout-unlock-unit">
            <span className="knockout-unlock-num">{String(seconds).padStart(2, '0')}</span>
            <span className="knockout-unlock-label">seg</span>
          </div>
        </div>
        <p className="knockout-unlock-date">📅 25 de junio · 00:00 hs (ARG)</p>
      </div>
    </div>
  );
}

export default function BracketTab({ results, isAdmin, predictions, onSaveKnockoutPrediction }) {
  const { manualThirds } = useManualThirds();
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Usuarios no-admin: si la fecha de unlock no llegó, mostrar SOLO el modal (sin contenido debajo)
  if (!isAdmin && timeLeft !== null) {
    return (
      <div className="tab-content">
        <KnockoutCountdownModal />
      </div>
    );
  }

  return (
    <div className="tab-content">
      <KnockoutPredictions
        results={results}
        predictions={predictions || {}}
        onSaveKnockoutPrediction={onSaveKnockoutPrediction}
      />
    </div>
  );
}
