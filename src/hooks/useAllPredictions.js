import { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Devuelve los pronósticos de TODOS los usuarios para un partido específico
// Solo se usa después de que el partido tiene resultado
export function useAllPredictions(matchId, enabled) {
  const [allPreds, setAllPreds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !matchId) return;
    setLoading(true);

    const fetchAll = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const scoresSnap = await getDocs(collection(db, 'scores'));

      const scoresMap = {};
      scoresSnap.docs.forEach(d => { scoresMap[d.id] = d.data(); });

      const results = await Promise.all(
        usersSnap.docs.map(async (userDoc) => {
          const uid = userDoc.id;
          const userData = userDoc.data();
          // Leemos el doc plano de predicciones del usuario
          const predSnap = await getDoc(doc(db, 'predictions', uid));
          const preds = predSnap.exists() ? predSnap.data() : {};
          const pred = preds[matchId] || null;
          return {
            uid,
            displayName: userData.displayName || userData.email,
            photoURL: userData.photoURL,
            prediction: pred,
          };
        })
      );

      // Ordenar: primero los que pronosticaron, luego los que no
      results.sort((a, b) => {
        if (a.prediction && !b.prediction) return -1;
        if (!a.prediction && b.prediction) return 1;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });

      setAllPreds(results);
      setLoading(false);
    };

    fetchAll();
  }, [matchId, enabled]);

  return { allPreds, loading };
}
