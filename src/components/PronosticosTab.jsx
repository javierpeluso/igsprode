import React, { useState } from 'react';
import { GROUPS, ALL_MATCHES, isClosed } from '../data/fixture';
import MatchCard from './MatchCard';
import ProgressBar from './ProgressBar';

const FILTERS = [
  { key: 'all',    label: 'Todos' },
  { key: 'pending', label: 'Sin pronosticar' },
  { key: 'closed',  label: 'Cerrados' },
];

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

  // Filtramos los partidos del grupo activo según el filtro seleccionado
  const getFilteredMatches = () => {
    if (filter === 'all') return GROUPS[activeGroup].matches;

    if (filter === 'pending') {
      // Sin pronosticar: abiertos y sin pronóstico enviado
      return GROUPS[activeGroup].matches.filter(
        m => !isClosed(m) && !results[m.id] && !predictions[m.id]
      );
    }

    if (filter === 'closed') {
      // Cerrados: ya no se pueden editar y sin resultado aún
      return GROUPS[activeGroup].matches.filter(
        m => isClosed(m) && !results[m.id]
      );
    }

    return GROUPS[activeGroup].matches;
  };

  // Contar pendientes y cerrados en todos los grupos para mostrar en el badge
  const totalPending = ALL_MATCHES.filter(m => !isClosed(m) && !results[m.id] && !predictions[m.id]).length;
  const totalClosed  = ALL_MATCHES.filter(m => isClosed(m) && !results[m.id]).length;

  const filteredMatches = getFilteredMatches();

  return (
    <div className="tab-content">
      <ProgressBar predictions={predictions} onGoToMatch={goToMatch} />

      {/* Filtros */}
      <div className="match-filters">
        {FILTERS.map(f => {
          const count = f.key === 'pending' ? totalPending : f.key === 'closed' ? totalClosed : null;
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

      {/* Selector de grupo */}
      <div className="group-nav">
        {Object.keys(GROUPS).map((g) => (
          <button
            key={g}
            className={`group-btn ${activeGroup === g ? 'active' : ''}`}
            onClick={() => setActiveGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Lista de partidos */}
      {filteredMatches.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--c-muted)', fontSize: 14 }}>
          {filter === 'pending' ? 'No hay partidos pendientes en este grupo' : 'No hay partidos cerrados en este grupo'}
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
