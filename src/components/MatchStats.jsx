import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function MatchStats({ match }) {
  const [groups, setGroups] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;

    setLoading(true);

    // Suscripción en tiempo real a toda la colección predictions.
    // Cada doc es un usuario; se recalcula al instante si alguien cambia su pronóstico.
    const unsub = onSnapshot(collection(db, 'predictions'), (snap) => {
      const counts = {};
      let counted = 0;

      snap.docs.forEach(predDoc => {
        const pred = predDoc.data()[match.id];
        if (!pred) return;
        const key = `${pred.home}-${pred.away}`;
        counts[key] = (counts[key] || 0) + 1;
        counted++;
      });

      if (counted === 0) {
        setGroups(null);
        setTotal(0);
      } else {
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([score, count]) => ({ score, count }));
        setGroups(sorted);
        setTotal(counted);
      }

      setLoading(false);
    }, (e) => {
      console.error(e);
      setLoading(false);
    });

    // Cancelar suscripción al cerrar el panel o desmontar
    return () => unsub();
  }, [match.id, expanded]);

  return (
    <div className="match-stats">
      <button className="btn-ver-preds" onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Ocultar estadísticas ▲' : 'Ver estadísticas de pronósticos ▼'}
      </button>

      {expanded && (
        <>
          {loading && <div className="match-stats-loading">Cargando estadísticas...</div>}
          {!loading && !groups && <div className="match-stats-empty">Nadie pronosticó este partido</div>}
          {!loading && groups && (
            <>
              <div className="match-stats-title" style={{ marginTop: 10 }}>
                Pronósticos de {total} participante{total !== 1 ? 's' : ''}
              </div>
              <div className="match-stats-score-list">
                {groups.map(({ score, count }) => {
                  const [h, a] = score.split('-');
                  const hNum = parseInt(h);
                  const aNum = parseInt(a);
                  let resultLabel = '';
                  if (hNum > aNum) resultLabel = match.home;
                  else if (aNum > hNum) resultLabel = match.away;
                  else resultLabel = 'Empate';

                  return (
                    <div key={score} className="stats-score-row">
                      <span className="stats-score-result">{h} – {a}</span>
                      <span className="stats-score-tag">{resultLabel}</span>
                      <span className="stats-score-count">
                        {count === 1
                          ? '1 usuario dijo'
                          : `${count} usuarios dijeron`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
