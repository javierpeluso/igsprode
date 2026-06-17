import { useState, useEffect } from 'react';
import {
  addDoc, collection, serverTimestamp, query, orderBy, limit, onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ── Firestore structure ──────────────────────────────────────────────────────
// /predictionHistory/{autoId} → {
//   userId, userName, userEmail,
//   matchId, matchLabel,
//   previous: { home, away, penaltyWinner? } | null,  // valor antes del cambio
//   current:  { home, away, penaltyWinner? } | null,  // valor nuevo (null = se eliminó)
//   source: 'user' | 'admin',   // quién hizo el cambio
//   changedAt: serverTimestamp(),
// }
// ────────────────────────────────────────────────────────────────────────────

// Traduce el prefijo de un matchId de fase eliminatoria a un nombre de ronda
// legible. La fase de grupos ya tiene ids autoexplicativos (ej. "A_0").
export function roundLabelFromMatchId(matchId) {
  if (!matchId) return '';
  if (matchId.startsWith('R32_')) return '16avos de Final';
  if (matchId.startsWith('R16_')) return '8vos de Final';
  if (matchId.startsWith('QF_'))  return 'Cuartos de Final';
  if (matchId.startsWith('SF_'))  return 'Semifinal';
  if (matchId.startsWith('TP_'))  return '3er Puesto';
  if (matchId.startsWith('F_'))   return 'Final';
  return '';
}

const sameValue = (a, b) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.home === b.home && a.away === b.away && (a.penaltyWinner || null) === (b.penaltyWinner || null);
};

// Registra en el historial un cambio de pronóstico (creación, modificación o
// eliminación). No escribe nada si el valor nuevo es idéntico al anterior,
// para no generar ruido cuando se reenvía el mismo resultado sin cambios.
export async function logPredictionChange({
  userId, userName, userEmail, matchId, matchLabel, previous, current, source = 'user',
}) {
  if (sameValue(previous, current)) return;
  try {
    await addDoc(collection(db, 'predictionHistory'), {
      userId,
      userName: userName || '',
      userEmail: userEmail || '',
      matchId,
      matchLabel: matchLabel || matchId,
      previous: previous || null,
      current: current || null,
      source,
      changedAt: serverTimestamp(),
    });
  } catch (e) {
    // No bloqueamos el guardado del pronóstico si falla el registro de historial
    console.error('No se pudo registrar el historial del pronóstico:', e);
  }
}

// Hook para el panel admin — trae el historial completo de cambios, en vivo,
// ordenado del más reciente al más antiguo.
export function usePredictionHistory(maxItems = 1000) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'predictionHistory'), orderBy('changedAt', 'desc'), limit(maxItems));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error cargando historial de pronósticos:', err);
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [maxItems]);

  return { history, loading, error };
}
