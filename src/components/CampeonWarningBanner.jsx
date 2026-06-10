import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const DEADLINE = new Date('2026-06-11T16:00:00-03:00'); // primer partido

function getTimeLeft() {
  const diff = DEADLINE.getTime() - Date.now();
  if (diff <= 0) return null;

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

function formatTimeLeft(timeLeft) {
  const { days, hours, minutes, seconds } = timeLeft;
  if (days > 0)  return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * CampeonWarningBanner
 * – Se muestra al usuario normal si todavía no eligió campeón y el plazo no cerró.
 * – Al entrar a la app aparece primero un cartel grande centrado (overlay).
 * – Al cerrarlo (o elegir "Más tarde") queda solo el banner arriba, como antes.
 * – Cuenta regresiva en vivo hasta que se bloquea la opción.
 * – "Elegir campeón" abre el modal CampeonModal.
 */
export default function CampeonWarningBanner({ user, onSelect }) {
  const [campeon, setCampeon] = useState(null);
  const [loaded, setLoaded]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft());

  useEffect(() => {
    const ref = doc(db, 'campeon', user.uid);
    const unsub = onSnapshot(ref, snap => {
      setCampeon(snap.exists() ? snap.data().team : null);
      setLoaded(true);
    });
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!loaded || campeon || !timeLeft) return null;

  const text = formatTimeLeft(timeLeft);

  const handleSelect = () => {
    setShowOverlay(false);
    onSelect();
  };

  const handleLater = () => {
    setShowOverlay(false);
  };

  return (
    <>
      {showOverlay && (
        <div className="campeon-overlay-warning" role="alertdialog" aria-modal="true">
          <div className="campeon-overlay-warning-card">
            <div className="campeon-overlay-warning-icon">🏆</div>
            <h2 className="campeon-overlay-warning-title">¡Todavía no elegiste<br />tu campeón!</h2>
            <p className="campeon-overlay-warning-sub">
              Elegí quién va a salir campeón antes de que arranque el primer partido.
            </p>
            <div className="campeon-overlay-warning-countdown">
              ⏱ Te quedan <strong>{text}</strong> para elegirlo
            </div>
            <div className="campeon-overlay-warning-actions">
              <button className="btn-campeon-warning-later" onClick={handleLater}>
                Más tarde
              </button>
              <button className="btn-campeon-warning-select" onClick={handleSelect}>
                Elegir campeón
              </button>
            </div>
          </div>
        </div>
      )}

      {!showOverlay && !dismissed && (
        <div className="campeon-warning-banner" role="alert">
          <span className="campeon-warning-icon">🏆</span>
          <div className="campeon-warning-text">
            <strong>¡Todavía no elegiste tu campeón!</strong>
            <span className="campeon-warning-countdown">⏱ Te quedan {text} para elegirlo</span>
          </div>
          <div className="campeon-warning-actions">
            <button className="btn-campeon-warning-later" onClick={() => setDismissed(true)}>
              Más tarde
            </button>
            <button className="btn-campeon-warning-select" onClick={onSelect}>
              Elegir campeón
            </button>
          </div>
        </div>
      )}
    </>
  );
}
