import React, { useState, useEffect } from 'react';
import { GROUPS, ALL_MATCHES, isClosed } from '../data/fixture';
import MatchCard from './MatchCard';
import LiveMatchCard from './LiveMatchCard';
import ProgressBar from './ProgressBar';

// Devuelve true si el partido está en curso según el horario (sin API)
// Se considera "en vivo" si ya arrancó y no pasaron más de 130 minutos
const isLiveNow = (match) => {
  const now      = Date.now();
  const kickoff  = new Date(match.kickoff).getTime();
  const end      = kickoff + 140 * 60_000;
  return now >= kickoff && now <= end;
};

const isUpcoming72h = (match) => {
  const now     = Date.now();
  const kickoff = new Date(match.kickoff).getTime();
  const cutoff  = kickoff - 10 * 60 * 1000;
  const in72h   = now + 72 * 60 * 60 * 1000;
  return cutoff > now && kickoff <= in72h;
};

const FILTERS = [
  { key: 'live',     label: '🔴 En vivo' },
  { key: 'all',      label: 'Todos' },
  { key: 'upcoming', label: 'Próximos' },
  { key: 'pending',  label: 'Sin pronosticar' },
];

export default function PronosticosTab({ predictions, results, onSave, currentUid, currentUser }) {
  const [activeGroup, setActiveGroup] = useState('A');
  const [filter, setFilter]           = useState('all');
  const [now, setNow]                 = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const goToMatch = (match) => {
    const group = match.id.split('_')[0];
    setActiveGroup(group);
    setFilter('all');
    setTimeout(() => {
      const el = document.getElementById(`match-${match.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const liveMatches     = ALL_MATCHES.filter(m => isLiveNow(m) && !results[m.id]);
  const upcomingMatches = ALL_MATCHES
    .filter(m => isUpcoming72h(m))
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  const getFilteredMatches = () => {
    if (filter === 'live')     return liveMatches;
    if (filter === 'upcoming') return upcomingMatches;
    if (filter === 'all')      return GROUPS[activeGroup].matches;
    if (filter === 'pending')  return GROUPS[activeGroup].matches.filter(
      m => !isClosed(m) && !results[m.id] && !predictions[m.id]
    );
    if (filter === 'closed')   return GROUPS[activeGroup].matches.filter(
      m => isClosed(m) && !results[m.id]
    );
    return GROUPS[activeGroup].matches;
  };

  const totalLive     = liveMatches.length;
  const totalPending  = ALL_MATCHES.filter(m => !isClosed(m) && !results[m.id] && !predictions[m.id]).length;
  const totalClosed   = ALL_MATCHES.filter(m => isClosed(m) && !results[m.id]).length;
  const totalUpcoming = upcomingMatches.length;

  const filteredMatches = getFilteredMatches();
  const hideGroupNav    = filter === 'live' || filter === 'upcoming';

  const emptyMsg = () => {
    if (filter === 'live')     return 'No hay partidos en vivo ahora mismo';
    if (filter === 'upcoming') return 'No hay partidos en las próximas 72 horas';
    if (filter === 'pending')  return 'No hay partidos pendientes en este grupo';
    return 'No hay partidos cerrados en este grupo';
  };

  return (
    <div className="tab-content">
      <ProgressBar predictions={predictions} onGoToMatch={goToMatch} />

      {/* Filtros */}
      <div className="match-filters">
        {FILTERS.map(f => {
          const count =
            f.key === 'live'     ? totalLive     :
            f.key === 'upcoming' ? totalUpcoming :
            f.key === 'pending'  ? totalPending  : null;
          const hasLiveCount = f.key === 'live' && totalLive > 0;
          return (
            <button
              key={f.key}
              className={`filter-btn ${filter === f.key ? 'active' : ''} ${hasLiveCount ? 'filter-btn--live' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {count !== null && count > 0 && (
                <span className={`filter-badge ${f.key}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selector de grupo */}
      {!hideGroupNav && (
        <div className="group-nav">
          {Object.keys(GROUPS).map((g) => (
            <button
              key={g}
              className={`group-btn ${activeGroup === g ? 'active' : ''}`}
              onClick={() => setActiveGroup(g)}
            >
              Grupo {g}
            </button>
          ))}
        </div>
      )}

      {/* Lista de partidos */}
      {filteredMatches.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--c-muted)', fontSize: 14 }}>
          {emptyMsg()}
        </div>
      ) : (
        <div className="matches-list">
          {filteredMatches.map((match) => (
            <div id={`match-${match.id}`} key={match.id}>
              {filter === 'live' ? (
                <LiveMatchCard
                  match={match}
                  prediction={predictions[match.id]}
                />
              ) : (
                <MatchCard
                  match={match}
                  prediction={predictions[match.id]}
                  result={results[match.id]}
                  onSave={onSave}
                  currentUid={currentUid}
                  currentUser={currentUser}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
