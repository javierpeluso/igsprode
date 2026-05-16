import { useState, useEffect } from 'react';

// Devuelve el tiempo restante hasta 2hs antes del partido
function getTimeLeft(kickoff) {
  const cutoff = new Date(kickoff).getTime() - 10 * 60 * 1000;0
  const diff = cutoff - Date.now();
  if (diff <= 0) return null;

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, diff };
}

export default function Countdown({ kickoff }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(kickoff));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(kickoff));
    }, 1000);
    return () => clearInterval(timer);
  }, [kickoff]);

  if (!timeLeft) return null;

  const { days, hours, minutes, seconds, diff } = timeLeft;

  const isUrgent = diff < 2 * 60 * 60 * 1000;
  const isVeryUrgent = diff < 30 * 60 * 1000;

  let text;
  if (days > 0) {
    text = `Cierra en ${days}d ${hours}h`;
  } else if (hours > 0) {
    text = `Cierra en ${hours}h ${minutes}m`;
  } else {
    text = `Cierra en ${minutes}m ${seconds}s`;
  }

  return (
    <span className={`countdown ${isVeryUrgent ? 'very-urgent' : isUrgent ? 'urgent' : ''}`}>
      ⏱ {text}
    </span>
  );
}
