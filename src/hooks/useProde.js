import { useState, useEffect } from 'react';
import {
  doc, setDoc, getDoc, onSnapshot, collection, getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calcPoints, ALL_MATCHES } from '../data/fixture';
import { markResultUpdated } from './useNewResults';

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

  await setDoc(doc(db, 'scores', userId), {
    pts, exact, winner, played,
    displayName: ud.displayName || '',
    email: ud.email || '',
    photoURL: ud.photoURL || '',
  });
}

export function usePredictions(userId) {
  const [predictions, setPredictions] = useState({});

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'predictions', userId), (snap) => {
      setPredictions(snap.exists() ? snap.data() : {});
    });
    return unsub;
  }, [userId]);

  const savePrediction = async (matchId, home, away) => {
    await setDoc(doc(db, 'predictions', userId), { [matchId]: { home, away } }, { merge: true });
    const snap = await getDoc(doc(db, 'results', 'all'));
    await recalcScore(userId, snap.exists() ? snap.data() : {});
  };

  return { predictions, savePrediction };
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
    const usersSnap = await getDocs(collection(db, 'users'));
    await Promise.all(usersSnap.docs.map((u) => recalcScore(u.id, allResults)));
    await markResultUpdated();
  };

  return { results, saveResult };
}

export function useRanking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'scores'), (snap) => {
      const rows = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .sort((a, b) => b.pts - a.pts || b.exact - a.exact);
      setRanking(rows);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { ranking, loading };
}

export async function registerUser(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    });
    await setDoc(doc(db, 'scores', user.uid), {
      pts: 0, exact: 0, winner: 0, played: 0,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    });
  }
}
