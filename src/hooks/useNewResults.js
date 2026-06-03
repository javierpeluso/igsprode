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

// ─────────────────────────────────────────────────────────────────────────────
// Auto-refresh: detecta cuando el admin publica una nueva versión de la app
// y recarga la página para que todos los usuarios vean los cambios.
//
// Cómo funciona:
//   1. Al iniciar la app se guarda en memoria el "buildId" actual
//      (un timestamp aleatorio generado en runtime, o el valor de
//      process.env.REACT_APP_BUILD_ID si está definido en el build).
//   2. Se escucha en tiempo real //_meta/appVersion en Firestore.
//   3. Si el campo `buildId` cambia respecto al que teníamos al cargar,
//      se recarga la pestaña (window.location.reload()).
//   4. El admin puede publicar una nueva versión desde AdminTab con
//      `publishNewVersion()`, que escribe el timestamp actual.
// ─────────────────────────────────────────────────────────────────────────────

// buildId "local": el que tenía la app cuando el usuario la abrió.
// Usamos REACT_APP_BUILD_ID si está inyectado en el build (CI/CD),
// o generamos uno aleatorio en runtime para la sesión actual.
const LOCAL_BUILD_ID =
  (typeof process !== 'undefined' && process.env?.REACT_APP_BUILD_ID) ||
  `session-${Math.random().toString(36).slice(2)}`;

// Publica una nueva versión: escribe el timestamp actual en Firestore.
// Llamar desde el panel admin cuando querés que todos los clientes recarguen.
export async function publishNewVersion() {
  await setDoc(doc(db, '_meta', 'appVersion'), {
    buildId: `deploy-${Date.now()}`,
    publishedAt: Date.now(),
  });
}

// Hook: observa //_meta/appVersion y recarga si el buildId cambió.
// Solo actúa en contexto de navegador (no en SSR/tests).
export function useAutoRefresh() {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState(null);

  useEffect(() => {
    // Solo en navegador
    if (typeof window === 'undefined') return;

    let initialLoad = true;
    let knownBuildId = null; // el que vimos la primera vez

    const unsub = onSnapshot(doc(db, '_meta', 'appVersion'), (snap) => {
      if (!snap.exists()) {
        initialLoad = false;
        return;
      }

      const { buildId, publishedAt } = snap.data();

      if (initialLoad) {
        // Primera lectura: guardamos el buildId de referencia
        knownBuildId = buildId;
        initialLoad = false;
        return;
      }

      // Si el buildId cambió desde que cargamos → nueva versión disponible
      if (buildId !== knownBuildId) {
        setRemoteVersion({ buildId, publishedAt });
        setNewVersionAvailable(true);
        // Auto-recarga suave: damos 1.5 s para que el usuario vea el banner
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    });

    return unsub;
  }, []);

  return { newVersionAvailable, remoteVersion };
}
