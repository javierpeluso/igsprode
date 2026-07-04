import React, { useState, useEffect, useMemo } from 'react';
import { GROUPS, ALL_MATCHES, isClosed } from '../data/fixture';
import { BRACKET_MATCHES, resolveSlot, buildLaterRoundMatchesFlat } from '../data/bracket';
import { calcAllStandings, useManualThirds } from '../hooks/useBracket';
import { Flag } from '../data/flags';
import MatchCard from './MatchCard';
import LiveMatchCard from './LiveMatchCard';
import ProgressBar from './ProgressBar';

function formatKickoff(kickoff) {
  const d = new Date(kickoff);
  return (
    d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) +
    'hs'
  );
}

// Card informativa sin inputs — mismo estilo que MatchCard cerrado
function KnockoutInfoCard({ home, away, kickoff, label, onClick }) {
  const isPending = !home || home.startsWith('G ') || home.startsWith('P ');
  const isClickable = !!onClick;
  return (
    <div
      className="match-card is-closed"
      onClick={onClick}
      style={isClickable ? { cursor: 'pointer', transition: 'opacity 0.15s' } : {}}
      onMouseEnter={e => isClickable && (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={e => isClickable && (e.currentTarget.style.opacity = '1')}
    >
      <div className="match-header">
        <span className="match-date">{formatKickoff(kickoff)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="closed-chip" style={{ background: 'var(--c-accent-muted, #2a3a2a)', color: 'var(--c-muted)' }}>
            {label}
          </span>
          {isClickable && (
            <span style={{ fontSize: 11, color: 'var(--c-muted)', opacity: 0.7 }}>Ver →</span>
          )}
        </div>
      </div>
      <div className="match-body">
        <span className="team home">
          {isPending ? '?' : home}
          {!isPending && <Flag country={home} />}
        </span>
        <div className="score-area">
          <div className="pred-locked no-pred" style={{ fontSize: 18, letterSpacing: 2 }}>vs</div>
        </div>
        <span className="team away">
          {!isPending && <Flag country={away} />}
          {isPending ? '?' : away}
        </span>
      </div>
    </div>
  );
}

const isLiveNow = (match) => {
  const now     = Date.now();
  const kickoff = new Date(match.kickoff).getTime();
  return now >= kickoff && now <= kickoff + 140 * 60_000;
};

const isUpcoming72h = (match) => {
  const now     = Date.now();
  const kickoff = new Date(match.kickoff).getTime();
  const cutoff  = kickoff - 10 * 60 * 1000;
  return cutoff > now && kickoff <= now + 72 * 60 * 60 * 1000;
};

const FILTERS = [
  { key: 'live',     label: '🔴 En vivo' },
  { key: 'all',      label: 'Todos' },
  { key: 'upcoming', label: 'Próximos' },
  { key: 'pending',  label: 'Sin pronosticar' },
];

export default function PronosticosTab({ predictions, results, onSave, onGoToKnockout, currentUid, currentUser }) {
  const [activeGroup, setActiveGroup] = useState('A');
  const [filter, setFilter]           = useState('all');

  useEffect(() => {
    const t = setInterval(() => {}, 30_000);
    return () => clearInterval(t);
  }, []);

  const { manualThirds } = useManualThirds();
  const standings = useMemo(() => calcAllStandings(results), [results]);

  const goToMatch = (match) => {
    const group = match.id.split('_')[0];
    setActiveGroup(group);
    setFilter('all');
    setTimeout(() => {
      const el = document.getElementById(`match-${match.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // R32 con equipos resueltos
  const r32Matches = useMemo(() => BRACKET_MATCHES.map(m => ({
    id: m.id,
    kickoff: m.kickoff,
    label: '16avos de Final',
    home: resolveSlot(m.slot1, standings, manualThirds, m.id) || m.slot1.label,
    away: resolveSlot(m.slot2, standings, manualThirds, m.id) || m.slot2.label,
  })), [standings, manualThirds]);

  // 8vos en adelante, con equipos resueltos a partir de los resultados cargados
  const laterRoundMatches = useMemo(() => buildLaterRoundMatchesFlat(results), [results]);

  // Todos los de eliminatoria para el filtro próximos
  const allKnockoutMatches = [...r32Matches, ...laterRoundMatches];

  const liveMatches = ALL_MATCHES.filter(m => isLiveNow(m) && !results[m.id]);

  // Upcoming: grupos + eliminatoria, ordenados por kickoff, dentro de 72hs
  const upcomingMatches = [
    ...ALL_MATCHES.filter(m => isUpcoming72h(m)).map(m => ({ ...m, _type: 'group' })),
    ...allKnockoutMatches.filter(m => isUpcoming72h(m)).map(m => ({ ...m, _type: 'knockout' })),
  ].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  const getFilteredMatches = () => {
    if (filter === 'live')     return liveMatches;
    if (filter === 'upcoming') return upcomingMatches;
    if (filter === 'all')      return GROUPS[activeGroup].matches;
    if (filter === 'pending')  return GROUPS[activeGroup].matches.filter(
      m => !isClosed(m) && !results[m.id] && !predictions[m.id]
    );
    return GROUPS[activeGroup].matches;
  };

  const totalLive     = liveMatches.length;
  const totalPending  = ALL_MATCHES.filter(m => !isClosed(m) && !results[m.id] && !predictions[m.id]).length;
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
              ) : match._type === 'knockout' ? (
                <KnockoutInfoCard
                  home={match.home}
                  away={match.away}
                  kickoff={match.kickoff}
                  label={match.label}
                  onClick={onGoToKnockout}
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
