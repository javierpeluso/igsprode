import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Guarda en Firestore cuándo fue el último resultado cargado
export async function markResultUpdated() {
  await setDoc(doc(db, '_meta', 'lastResult'), { updatedAt: Date.now() });
}

// Hook: devuelve true si hay resultados nuevos desde la última vez que el usuario vio el ranking
export function useNewResults(userId) {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Escuchamos el timestamp del último resultado
    const unsub = onSnapshot(doc(db, '_meta', 'lastResult'), async (snap) => {
      if (!snap.exists()) return;
      const lastResult = snap.data().updatedAt;

      // Leemos cuándo vio el ranking este usuario por última vez
      const seenSnap = await getDoc(doc(db, '_meta_seen', userId));
      const lastSeen = seenSnap.exists() ? seenSnap.data().seenAt : 0;

      setHasNew(lastResult > lastSeen);
    });

    return unsub;
  }, [userId]);

  // Llamar esto cuando el usuario abre el tab de Ranking
  const markAsSeen = async () => {
    await setDoc(doc(db, '_meta_seen', userId), { seenAt: Date.now() });
    setHasNew(false);
  };

  return { hasNew, markAsSeen };
}
