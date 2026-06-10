import React, { useState } from 'react';
import { GROUPS, ALL_MATCHES, isClosed } from '../data/fixture';
import MatchCard from './MatchCard';
import ProgressBar from './ProgressBar';

const FILTERS = [
  { key: 'all',      label: 'Todos' },
  { key: 'upcoming', label: 'Próximos partidos' },
  { key: 'pending',  label: 'Sin pronosticar' },
  { key: 'closed',   label: 'Cerrados' },
];

// Devuelve true si el partido se juega en las próximas 72 horas y aún no cerró
const isUpcoming72h = (match) => {
  const now = Date.now();
  const kickoff = new Date(match.kickoff).getTime();
  const cutoff  = kickoff - 10 * 60 * 1000; // mismo umbral que isClosed
  const in72h   = now + 72 * 60 * 60 * 1000;
  return cutoff > now && kickoff <= in72h;
};

export default function PronosticosTab({ predictions, results, onSave, currentUid, currentUser }) {
  const [activeGroup, setActiveGroup] = useState('A');
  const [filter, setFilter] = useState('all');

  const goToMatch = (match) => {
    const group = match.id.split('_')[0];
    setActiveGroup(group);
    setFilter('all');
    setTimeout(() => {
      const el = document.getElementById(`match-${match.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Partidos de las próximas 72hs en TODOS los grupos (para el filtro global)
  const upcomingMatches = ALL_MATCHES
    .filter(m => isUpcoming72h(m))
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  // Filtramos los partidos del grupo activo según el filtro seleccionado
  const getFilteredMatches = () => {
    // "Próximos partidos" muestra todos los grupos juntos, ignorando el selector de grupo
    if (filter === 'upcoming') return upcomingMatches;

    if (filter === 'all') return GROUPS[activeGroup].matches;

    if (filter === 'pending') {
      return GROUPS[activeGroup].matches.filter(
        m => !isClosed(m) && !results[m.id] && !predictions[m.id]
      );
    }

    if (filter === 'closed') {
      return GROUPS[activeGroup].matches.filter(
        m => isClosed(m) && !results[m.id]
      );
    }

    return GROUPS[activeGroup].matches;
  };

  // Conteos para los badges
  const totalPending  = ALL_MATCHES.filter(m => !isClosed(m) && !results[m.id] && !predictions[m.id]).length;
  const totalClosed   = ALL_MATCHES.filter(m => isClosed(m) && !results[m.id]).length;
  const totalUpcoming = upcomingMatches.length;

  const filteredMatches = getFilteredMatches();
  const isUpcomingView  = filter === 'upcoming';

  const emptyMsg = () => {
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
            f.key === 'upcoming' ? totalUpcoming :
            f.key === 'pending'  ? totalPending  :
            f.key === 'closed'   ? totalClosed   : null;
          return (
            <button
              key={f.key}
              className={`filter-btn ${filter === f.key ? 'active' : ''}`}
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

      {/* Selector de grupo — se oculta en vista "Próximos partidos" */}
      {!isUpcomingView && (
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
              <MatchCard
                match={match}
                prediction={predictions[match.id]}
                result={results[match.id]}
                onSave={onSave}
                currentUid={currentUid}
                currentUser={currentUser}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
