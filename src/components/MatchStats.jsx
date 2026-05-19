import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function MatchStats({ match }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const fetch = async () => {
      setLoading(true);
      try {
        // Leer todos los usuarios
        const usersSnap = await getDocs(collection(db, 'users'));
        let home = 0, draw = 0, away = 0, total = 0;

        await Promise.all(usersSnap.docs.map(async userDoc => {
          const predSnap = await getDoc(doc(db, 'predictions', userDoc.id));
          if (!predSnap.exists()) return;
          const pred = predSnap.data()[match.id];
          if (!pred) return;
          total++;
          if (pred.home > pred.away)       home++;
          else if (pred.home < pred.away)  away++;
          else                             draw++;
        }));

        if (total === 0) { setStats(null); setLoading(false); return; }

        setStats({
          home: Math.round((home / total) * 100),
          draw: Math.round((draw / total) * 100),
          away: Math.round((away / total) * 100),
          total,
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, [match.id, expanded]);

  return (
    <div className="match-stats">
      <button className="btn-ver-preds" onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Ocultar estadísticas ▲' : 'Ver estadísticas de pronósticos ▼'}
      </button>

      {expanded && (
        <>
          {loading && <div className="match-stats-loading">Cargando estadísticas...</div>}
          {!loading && !stats && <div className="match-stats-empty">Nadie pronosticó este partido</div>}
          {!loading && stats && (
            <>
              <div className="match-stats-title" style={{ marginTop: 10 }}>
                Pronósticos de {stats.total} participante{stats.total !== 1 ? 's' : ''}
              </div>
              <div className="match-stats-bars">
                <div className="stats-team-label home">{match.home}</div>
                <div className="stats-bar-wrap"><div className="stats-bar home" style={{ width: `${stats.home}%` }} /></div>
                <div className="stats-pct home">{stats.home}%</div>

                <div className="stats-team-label draw">Empate</div>
                <div className="stats-bar-wrap"><div className="stats-bar draw" style={{ width: `${stats.draw}%` }} /></div>
                <div className="stats-pct draw">{stats.draw}%</div>

                <div className="stats-team-label away">{match.away}</div>
                <div className="stats-bar-wrap"><div className="stats-bar away" style={{ width: `${stats.away}%` }} /></div>
                <div className="stats-pct away">{stats.away}%</div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
