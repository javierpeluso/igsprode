import { addDoc, collection, serverTimestamp, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calcPoints } from '../data/fixture';

export async function pushResultEvent(match, homeScore, awayScore) {
  // Evento del resultado
  await addDoc(collection(db, 'feed'), {
    type: 'result',
    matchId: match.id,
    matchHome: match.home,
    matchAway: match.away,
    scoreHome: homeScore,
    scoreAway: awayScore,
    createdAt: serverTimestamp(),
  });

  // Obtener todos los usuarios y sus pronósticos
  const usersSnap = await getDocs(collection(db, 'users'));
  const result = { home: homeScore, away: awayScore };

  // Obtener scores anteriores para detectar cambios de ranking
  const scoresSnap = await getDocs(collection(db, 'scores'));
  const prevScores = {};
  scoresSnap.docs.forEach(d => { prevScores[d.id] = d.data(); });

  // Ordenar por pts previos para saber posiciones anteriores
  const prevRanking = Object.entries(prevScores)
    .sort((a, b) => b[1].pts - a[1].pts)
    .map(([uid], idx) => ({ uid, pos: idx + 1 }));
  const prevPosMap = {};
  prevRanking.forEach(({ uid, pos }) => { prevPosMap[uid] = pos; });

  // Generar evento por cada usuario
  await Promise.all(usersSnap.docs.map(async userDoc => {
    const uid = userDoc.id;
    const userData = userDoc.data();
    const predSnap = await getDoc(doc(db, 'predictions', uid));
    const preds = predSnap.exists() ? predSnap.data() : {};
    const pred = preds[match.id];
    const pts = calcPoints(pred, result);

    let type;
    if (!pred)    type = 'no_pred';
    else if (pts === 3) type = 'exact';
    else if (pts === 1) type = 'winner';
    else               type = 'miss';

    await addDoc(collection(db, 'feed'), {
      type,
      userId: uid,
      displayName: userData.displayName || userData.email,
      matchId: match.id,
      matchHome: match.home,
      matchAway: match.away,
      scoreHome: homeScore,
      scoreAway: awayScore,
      pts: pts || 0,
      createdAt: serverTimestamp(),
    });
  }));
}

export async function pushJoinedEvent(user) {
  await addDoc(collection(db, 'feed'), {
    type: 'joined',
    userId: user.uid,
    displayName: user.displayName || user.email,
    createdAt: serverTimestamp(),
  });
}
