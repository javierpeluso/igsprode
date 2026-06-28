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

    let cancelled = false;

    // Escuchamos el timestamp del último resultado
    const unsub = onSnapshot(doc(db, '_meta', 'lastResult'), async (snap) => {
      if (!snap.exists()) return;
      const lastResult = snap.data().updatedAt;

      // Leemos cuándo vio el ranking este usuario por última vez
      const seenSnap = await getDoc(doc(db, '_meta_seen', userId));
      const lastSeen = seenSnap.exists() ? seenSnap.data().seenAt : 0;

      if (!cancelled) setHasNew(lastResult > lastSeen);
    });

    return () => { cancelled = true; unsub(); };
  }, [userId]);

  // Llamar esto cuando el usuario abre el tab de Ranking
  const markAsSeen = async () => {
    await setDoc(doc(db, '_meta_seen', userId), { seenAt: Date.now() });
    setHasNew(false);
  };

  return { hasNew, markAsSeen };
}

const LOCAL_BUILD_ID =
  (typeof process !== 'undefined' && process.env?.REACT_APP_BUILD_ID) ||
  `session-${Math.random().toString(36).slice(2)}`;


export async function publishNewVersion() {
  await setDoc(doc(db, '_meta', 'appVersion'), {
    buildId: `deploy-${Date.now()}`,
    publishedAt: Date.now(),
  });
}

export function useAutoRefresh() {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState(null);

  useEffect(() => {
    // Solo en navegador
    if (typeof window === 'undefined') return;

    let initialLoad = true;
    let knownBuildId = null; 

    const unsub = onSnapshot(doc(db, '_meta', 'appVersion'), (snap) => {
      if (!snap.exists()) {
        initialLoad = false;
        return;
      }

      const { buildId, publishedAt } = snap.data();

      if (initialLoad) {
        // Primera lectura
        knownBuildId = buildId;
        initialLoad = false;
        return;
      }

      // Si el buildId cambió → nueva versión disponible
      if (buildId !== knownBuildId) {
        setRemoteVersion({ buildId, publishedAt });
        setNewVersionAvailable(true);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    });

    return unsub;
  }, []);

  return { newVersionAvailable, remoteVersion };
}
