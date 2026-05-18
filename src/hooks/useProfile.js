import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calcPoints, ALL_MATCHES, GROUPS } from '../data/fixture';

// Calcula y guarda las estadísticas del usuario en /stats/{userId}
export async function recalcUserStats(userId, allResults) {
  const predSnap = await getDoc(doc(db, 'predictions', userId));
  const preds = predSnap.exists() ? predSnap.data() : {};

  let exact = 0, winner = 0, miss = 0, noPred = 0;
  let currentStreak = 0, bestStreak = 0, worstStreak = 0;
  let currentWin = 0, currentLoss = 0;
  const teamStats = {}; // { team: { correct, total } }

  // Solo partidos con resultado, ordenados por fecha
  const played = ALL_MATCHES
    .filter(m => allResults[m.id])
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  let totalPts = 0;
  let globalCorrect = 0;

  played.forEach(m => {
    const res = allResults[m.id];
    const pred = preds[m.id];
    const pts = calcPoints(pred, res);

    // Contar por tipo
    if (!pred) { noPred++; currentWin = 0; currentLoss++; }
    else if (pts === 3) { exact++; totalPts += 3; globalCorrect++; currentWin++; currentLoss = 0; }
    else if (pts === 1) { winner++; totalPts += 1; globalCorrect++; currentWin++; currentLoss = 0; }
    else { miss++; currentWin = 0; currentLoss++; }

    bestStreak  = Math.max(bestStreak, currentWin);
    worstStreak = Math.max(worstStreak, currentLoss);

    // Stats por equipo
    [m.home, m.away].forEach(team => {
      if (!teamStats[team]) teamStats[team] = { correct: 0, total: 0 };
      if (pred) {
        teamStats[team].total++;
        if (pts >= 1) teamStats[team].correct++;
      }
    });
  });

  currentStreak = currentWin > 0 ? currentWin : -currentLoss;

  // Top 3 equipos con más aciertos (mínimo 2 partidos)
  const topTeams = Object.entries(teamStats)
    .filter(([, s]) => s.total >= 2)
    .sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total))
    .slice(0, 3)
    .map(([team, s]) => ({ team, pct: Math.round((s.correct / s.total) * 100), total: s.total }));

  const totalPlayed = played.length;
  const predSent = exact + winner + miss;
  const pctExact  = predSent > 0 ? Math.round((exact / predSent)  * 100) : 0;
  const pctWinner = predSent > 0 ? Math.round((winner / predSent) * 100) : 0;
  const pctCorrect = predSent > 0 ? Math.round((globalCorrect / predSent) * 100) : 0;

  await setDoc(doc(db, 'stats', userId), {
    totalPlayed, predSent, exact, winner, miss, noPred,
    totalPts, pctExact, pctWinner, pctCorrect,
    bestStreak, worstStreak, currentStreak,
    topTeams,
    updatedAt: Date.now(),
  });
}

// Hook para leer las stats del usuario actual
export function useUserStats(userId) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'stats', userId), snap => {
      setStats(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { stats, loading };
}

// Hook para leer el promedio global (de /stats_global/summary)
export function useGlobalStats() {
  const [global, setGlobal] = useState(null);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, '_meta', 'globalStats'), snap => {
      setGlobal(snap.exists() ? snap.data() : null);
    });
    return unsub;
  }, []);
  return global;
}

// Recalcula el promedio global y lo guarda
export async function recalcGlobalStats(allResults) {
  const statsSnap = await getDocs(collection(db, 'stats'));
  if (statsSnap.empty) return;

  const all = statsSnap.docs.map(d => d.data());
  const avgPctCorrect = Math.round(all.reduce((s, u) => s + (u.pctCorrect || 0), 0) / all.length);
  const avgPts        = Math.round(all.reduce((s, u) => s + (u.totalPts    || 0), 0) / all.length);
  const avgExact      = Math.round(all.reduce((s, u) => s + (u.pctExact    || 0), 0) / all.length);

  await setDoc(doc(db, '_meta', 'globalStats'), { avgPctCorrect, avgPts, avgExact, updatedAt: Date.now() });
}
