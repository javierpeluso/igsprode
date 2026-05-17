import React, { useState } from 'react';
import { ALL_MATCHES, isClosed, formatKickoff } from '../data/fixture';
import { Flag } from '../data/flags';

export default function ProgressBar({ predictions, onGoToMatch }) {
  const [showPending, setShowPending] = useState(false);

  const total = ALL_MATCHES.length;
  const completed = ALL_MATCHES.filter(m => predictions[m.id]).length;
  const pendingMatches = ALL_MATCHES.filter(m => !isClosed(m) && !predictions[m.id]);
  const available = pendingMatches.length;
  const pct = Math.round((completed / total) * 100);

  const handleGoTo = (match) => {
    setShowPending(false);
    onGoToMatch(match);
  };

  return (
    <div className="progress-wrap">
      <div className="progress-header">
        <span className="progress-label">
          <span className="progress-count">{completed}</span>
          <span className="progress-total">/{total} pronósticos enviados</span>
        </span>
        {available > 0 && (
          <button className="progress-pending" onClick={() => setShowPending(v => !v)}>
            {available} partido{available !== 1 ? 's' : ''} sin pronosticar {showPending ? '▲' : '▼'}
          </button>
        )}
        {available === 0 && completed < total && (
          <span className="progress-closed">Todos los abiertos completados ✓</span>
        )}
        {completed === total && (
          <span className="progress-done">¡Completaste todos! 🎉</span>
        )}
      </div>

      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {showPending && available > 0 && (
        <div className="pending-list">
          {pendingMatches.map(m => (
            <button key={m.id} className="pending-row clickable" onClick={() => handleGoTo(m)}>
              <span className="pending-teams">
                <span className="pending-team"><Flag country={m.home} size={14} /> {m.home}</span>
                <span className="pending-vs">vs</span>
                <span className="pending-team"><Flag country={m.away} size={14} /> {m.away}</span>
              </span>
              <span className="pending-date">{formatKickoff(m.kickoff)} →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
