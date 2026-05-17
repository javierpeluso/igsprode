import React, { useState } from 'react';
import { ALL_MATCHES, calcPoints, formatKickoff } from '../data/fixture';
import { Flag } from '../data/flags';

function ResultRow({ match, result, prediction }) {
  const pts = calcPoints(prediction, result);

  return (
    <div className="historial-row">
      <div className="historial-header">
        <span className="historial-date">{formatKickoff(match.kickoff)}</span>
        {pts !== null
          ? <span className={`pts-chip pts-${pts === 3 ? 'exact' : pts === 1 ? 'winner' : 'miss'}`}>
              {pts === 3 ? '⚡ +3' : pts === 1 ? '✓ +1' : '✗ 0'}
            </span>
          : <span className="pts-chip pts-miss">Sin pronóstico</span>
        }
      </div>

      <div className="historial-body">
        <span className="historial-team home">
          {match.home}<Flag country={match.home} />
        </span>
        <div className="historial-scores">
          <div className="historial-result">{result.home} – {result.away}</div>
          {prediction && (
            <div className="historial-pred">pronóstico: {prediction.home} – {prediction.away}</div>
          )}
        </div>
        <span className="historial-team away">
          <Flag country={match.away} />{match.away}
        </span>
      </div>
    </div>
  );
}

export default function HistorialTab({ results, predictions }) {
  const [filter, setFilter] = useState('all'); // all | exact | winner | miss

  const played = ALL_MATCHES
    .filter(m => results[m.id])
    .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff));

  const filtered = played.filter(m => {
    if (filter === 'all') return true;
    const pts = calcPoints(predictions[m.id], results[m.id]);
    if (filter === 'exact')  return pts === 3;
    if (filter === 'winner') return pts === 1;
    if (filter === 'miss')   return pts === 0;
    return true;
  });

  if (played.length === 0) {
    return (
      <div className="tab-content">
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          Todavía no hay partidos jugados
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="historial-summary">
        <div className="summary-item">
          <span className="summary-num">{played.length}</span>
          <span className="summary-label">jugados</span>
        </div>
        <div className="summary-item exact">
          <span className="summary-num">{played.filter(m => calcPoints(predictions[m.id], results[m.id]) === 3).length}</span>
          <span className="summary-label">exactos</span>
        </div>
        <div className="summary-item winner">
          <span className="summary-num">{played.filter(m => calcPoints(predictions[m.id], results[m.id]) === 1).length}</span>
          <span className="summary-label">ganador</span>
        </div>
        <div className="summary-item miss">
          <span className="summary-num">{played.filter(m => calcPoints(predictions[m.id], results[m.id]) === 0).length}</span>
          <span className="summary-label">fallos</span>
        </div>
      </div>

      <div className="historial-filters">
        {[
          { key: 'all',    label: 'Todos' },
          { key: 'exact',  label: '⚡ Exactos' },
          { key: 'winner', label: '✓ Ganador' },
          { key: 'miss',   label: '✗ Fallos' },
        ].map(f => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No hay partidos en esta categoría</div>
      ) : (
        <div className="historial-list">
          {filtered.map(m => (
            <ResultRow
              key={m.id}
              match={m}
              result={results[m.id]}
              prediction={predictions[m.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
