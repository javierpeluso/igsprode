import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GROUPS } from '../data/fixture';

// Calcula la tabla de posiciones de todos los grupos
export function calcAllStandings(results) {
  const standings = {};
  Object.entries(GROUPS).forEach(([g, gdata]) => {
    const table = {};
    gdata.teams.forEach(t => { table[t] = { PJ:0, PG:0, PE:0, PP:0, GF:0, GC:0, DIF:0, PTS:0 }; });

    gdata.matches.forEach(match => {
      const res = results[match.id];
      if (!res) return;
      const h = match.home, a = match.away;
      const gh = res.home, ga = res.away;
      table[h].PJ++; table[a].PJ++;
      table[h].GF += gh; table[h].GC += ga;
      table[a].GF += ga; table[a].GC += gh;
      table[h].DIF = table[h].GF - table[h].GC;
      table[a].DIF = table[a].GF - table[a].GC;
      if (gh > ga)      { table[h].PG++; table[h].PTS += 3; table[a].PP++; }
      else if (gh < ga) { table[a].PG++; table[a].PTS += 3; table[h].PP++; }
      else              { table[h].PE++; table[h].PTS++; table[a].PE++; table[a].PTS++; }
    });

    standings[g] = Object.entries(table)
      .map(([team, s]) => ({ team, ...s }))
      .sort((a, b) => b.PTS - a.PTS || b.DIF - a.DIF || b.GF - a.GF || a.team.localeCompare(b.team));
  });
  return standings;
}

// Hook para leer/escribir los terceros manuales desde Firestore
export function useManualThirds() {
  const [manualThirds, setManualThirds] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, '_meta', 'manualThirds'), snap => {
      setManualThirds(snap.exists() ? snap.data() : {});
    });
    return unsub;
  }, []);

  // matchId → team (el equipo tercero que va en ese cruce)
  const saveManualThird = async (matchId, team) => {
    await setDoc(doc(db, '_meta', 'manualThirds'), { [matchId]: team }, { merge: true });
  };

  return { manualThirds, saveManualThird };
}
