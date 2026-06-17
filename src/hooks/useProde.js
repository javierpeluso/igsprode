import { useState, useEffect } from 'react';
import {
  doc, setDoc, getDoc, onSnapshot, collection, getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calcPoints, ALL_MATCHES } from '../data/fixture';
import { markResultUpdated } from './useNewResults';
import { pushResultEvent, pushJoinedEvent } from './useFeed';
import { recalcUserStats, recalcGlobalStats } from './useProfile';
import { logPredictionChange, roundLabelFromMatchId } from './usePredictionHistory';

// ── Firestore structure ──────────────────────────────────────────────────────
// /users/{userId}           → { displayName, email, photoURL }
// /predictions/{userId}     → { [matchId]: { home, away }, ... }  (doc plano)
// /results                  → doc('all') → { [matchId]: { home, away }, ... }
// /scores/{userId}          → { pts, exact, winner, played,
//                               displayName, email, photoURL }
// ────────────────────────────────────────────────────────────────────────────

async function recalcScore(userId, allResults) {
  const predSnap = await getDoc(doc(db, 'predictions', userId));
  const preds = predSnap.exists() ? predSnap.data() : {};

  let pts = 0, exact = 0, winner = 0, played = 0;
  ALL_MATCHES.forEach((m) => {
    const res = allResults[m.id];
    if (!res) return;
    played++;
    const p = calcPoints(preds[m.id], res);
    if (p === 3) { pts += 3; exact++; }
    else if (p === 1) { pts += 1; winner++; }
  });

  const userSnap = await getDoc(doc(db, 'users', userId));
  const ud = userSnap.exists() ? userSnap.data() : {};

  // Bonus campeón: +10 si acertó (solo cuando hay resultado oficial en /campeon_result/winner)
  const campeonResultSnap = await getDoc(doc(db, '_meta', 'campeonWinner'));
  const campeonWinner = campeonResultSnap.exists() ? campeonResultSnap.data().team : null;
  const campeonPredSnap = await getDoc(doc(db, 'campeon', userId));
  const campeonPred = campeonPredSnap.exists() ? campeonPredSnap.data().team : null;
  const campeonBonus = campeonWinner && campeonPred && campeonWinner === campeonPred ? 10 : 0;

  await setDoc(doc(db, 'scores', userId), {
    pts: pts + campeonBonus, exact, winner, played,
    campeonPred: campeonPred || '',
    campeonBonus,
    displayName: ud.displayName || '',
    email: ud.email || '',
    photoURL: ud.photoURL || '',
  });
}

export function usePredictions(user) {
  const userId = user?.uid;
  const [predictions, setPredictions] = useState({});

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'predictions', userId), (snap) => {
      setPredictions(snap.exists() ? snap.data() : {});
    });
    return unsub;
  }, [userId]);

  const savePrediction = async (matchId, home, away) => {
    // Capturamos el valor anterior antes de pisarlo, para el historial de cambios
    const prevSnap = await getDoc(doc(db, 'predictions', userId));
    const previous = prevSnap.exists() ? (prevSnap.data()[matchId] || null) : null;

    await setDoc(doc(db, 'predictions', userId), { [matchId]: { home, away } }, { merge: true });

    const match = ALL_MATCHES.find(m => m.id === matchId);
    await logPredictionChange({
      userId,
      userName: user?.displayName,
      userEmail: user?.email,
      matchId,
      matchLabel: match ? `${match.home} vs ${match.away}` : matchId,
      previous,
      current: { home, away },
      source: 'user',
    });

    const snap = await getDoc(doc(db, 'results', 'all'));
    const allRes = snap.exists() ? snap.data() : {};
    await recalcScore(userId, allRes);
    await recalcUserStats(userId, allRes);
  };

  // Pronóstico de fase eliminatoria: incluye penaltyWinner si el usuario
  // pronosticó un empate en los 120min y eligió un ganador por penales.
  const saveKnockoutPrediction = async (matchId, home, away, penaltyWinner, homeTeam, awayTeam) => {
    const prevSnap = await getDoc(doc(db, 'predictions', userId));
    const previous = prevSnap.exists() ? (prevSnap.data()[matchId] || null) : null;

    const payload = { home, away, homeTeam, awayTeam };
    if (penaltyWinner) payload.penaltyWinner = penaltyWinner;
    else payload.penaltyWinner = null;
    await setDoc(doc(db, 'predictions', userId), { [matchId]: payload }, { merge: true });

    const round = roundLabelFromMatchId(matchId);
    await logPredictionChange({
      userId,
      userName: user?.displayName,
      userEmail: user?.email,
      matchId,
      matchLabel: homeTeam && awayTeam ? `${round ? round + ': ' : ''}${homeTeam} vs ${awayTeam}` : matchId,
      previous,
      current: { home, away, penaltyWinner: penaltyWinner || null },
      source: 'user',
    });
  };

  return { predictions, savePrediction, saveKnockoutPrediction };
}

export function useResults() {
  const [results, setResults] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'results', 'all'), (snap) => {
      setResults(snap.exists() ? snap.data() : {});
    });
    return unsub;
  }, []);

  const saveResult = async (matchId, home, away) => {
    await setDoc(doc(db, 'results', 'all'), { [matchId]: { home, away } }, { merge: true });
    const snap = await getDoc(doc(db, 'results', 'all'));
    const allResults = snap.exists() ? snap.data() : {};

    // Guardar posiciones actuales en Firestore ANTES de recalcular
    const scoresSnap = await getDocs(collection(db, 'scores'));
    const currentRows = scoresSnap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .sort((a, b) => b.pts - a.pts || b.exact - a.exact);
    const positions = {};
    currentRows.forEach((r, i) => { positions[r.uid] = i + 1; });
    await setDoc(doc(db, '_meta', 'rankingPositions'), positions);

    const usersSnap = await getDocs(collection(db, 'users'));
    await Promise.all(usersSnap.docs.map((u) => recalcScore(u.id, allResults)));
    await markResultUpdated();
    // Push feed events
    const matchObj = ALL_MATCHES.find(m => m.id === matchId);
    if (matchObj) await pushResultEvent(matchObj, home, away);
    // Recalc stats for all users
    await Promise.all(usersSnap.docs.map(u => recalcUserStats(u.id, allResults)));
    await recalcGlobalStats(allResults);
  };

  // Resultado de fase eliminatoria: incluye opcionalmente penaltyWinner
  // cuando el resultado en 120min terminó en empate.
  const saveKnockoutResult = async (matchId, payload) => {
    await setDoc(doc(db, 'results', 'all'), { [matchId]: payload }, { merge: true });
    const snap = await getDoc(doc(db, 'results', 'all'));
    const allResults = snap.exists() ? snap.data() : {};
    await markResultUpdated();
  };

  return { results, saveResult, saveKnockoutResult };
}

export function useRanking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let prevPositions = {};

    // Leer posiciones anteriores de Firestore una sola vez al montar
    getDoc(doc(db, '_meta', 'rankingPositions'))
      .then(snap => { if (snap.exists()) prevPositions = snap.data(); })
      .catch(() => {});

    const unsub = onSnapshot(collection(db, 'scores'), (snap) => {
      const rows = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .sort((a, b) => b.pts - a.pts || b.exact - a.exact);

      const hasPrev = Object.keys(prevPositions).length > 0;
      const rowsWithTrend = rows.map((r, i) => {
        const curr = i + 1;
        const old  = prevPositions[r.uid];
        let trend = 'same';
        if (hasPrev && old != null) {
          if (curr < old) trend = 'up';
          else if (curr > old) trend = 'down';
        }
        return { ...r, trend };
      });

      setRanking(rowsWithTrend);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { ranking, loading };
}

export async function registerUser(user) {
  // NO escribir en allowed_emails desde el cliente.
  // El admin agrega los emails desde el panel.

  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const isNew = !snap.exists();

  // Crear perfil si no existe
  if (isNew) {
    await setDoc(ref, {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '',
    });
  }

  // Garantizar que scores siempre existe con valores iniciales
  // (usa merge para no pisar puntos existentes)
  const scoresRef = doc(db, 'scores', user.uid);
  const scoresSnap = await getDoc(scoresRef);
  if (!scoresSnap.exists()) {
    await setDoc(scoresRef, {
      pts: 0, exact: 0, winner: 0, played: 0,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '',
    });
  }

  if (isNew) await pushJoinedEvent(user);
}
