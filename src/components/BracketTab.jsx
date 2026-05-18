import React, { useMemo } from 'react';
import { BRACKET_MATCHES, resolveSlot } from '../data/bracket';
import { calcAllStandings, useManualThirds } from '../hooks/useBracket';
import { Flag } from '../data/flags';

const THIRD_MATCHES = BRACKET_MATCHES.filter(m => m.slot2.type === '3');
const TOTAL_THIRDS  = THIRD_MATCHES.length; // 8

function TeamSlot({ team, isThird }) {
  if (!team) {
    return (
      <div className={`bracket-team pending ${isThird ? 'third-slot' : ''}`}>
        <span className="bracket-team-name muted">{isThird ? '3° (por definir)' : 'Por definir'}</span>
      </div>
    );
  }
  return (
    <div className={`bracket-team ${isThird ? 'third-slot' : ''}`}>
      <Flag country={team} size={18} />
      <span className="bracket-team-name">{team}</span>
    </div>
  );
}

function BracketCard({ match, standings, manualThirds }) {
  const team1   = resolveSlot(match.slot1, standings, manualThirds);
  const team2   = resolveSlot(match.slot2, standings, manualThirds);
  const isThird = match.slot2.type === '3';

  return (
    <div className="bracket-card">
      <div className="bracket-match-num">Partido {match.matchNum} · {match.date}</div>
      <TeamSlot team={team1} isThird={false} />
      <div className="bracket-vs">vs</div>
      <TeamSlot team={team2} isThird={isThird} />
      {isThird && <div className="bracket-third-label">{match.slot2.label}</div>}
    </div>
  );
}

export default function BracketTab({ results, isAdmin }) {
  const { manualThirds } = useManualThirds();
  const standings = useMemo(() => calcAllStandings(results), [results]);

  const thirdsLoaded  = Object.keys(manualThirds).length;
  const allThirdsReady = thirdsLoaded >= TOTAL_THIRDS;
  const allGroupsDone  = Object.keys(standings).length === 12 &&
    Object.values(standings).every(g => g[0]?.PJ === 3);

  // Usuarios normales: mostrar cartel si no están todos los terceros cargados
  if (!isAdmin && !allThirdsReady) {
    return (
      <div className="tab-content">
        <div className="bracket-dev-screen">
          <div className="bracket-dev-icon">🏗️</div>
          <div className="bracket-dev-title">Sección en desarrollo</div>
          <div className="bracket-dev-sub">
            Esta sección se encuentra en desarrollo ya que los resultados de la fase de grupos aún no están disponibles.
            <br /><br />
            Una vez que terminen todos los partidos y se definan los clasificados, podrás ver los cruces de la fase eliminatoria acá.
          </div>
          {allGroupsDone && (
            <div className="bracket-dev-progress">
              ⏳ Grupos terminados · Esperando definición de 3° clasificados ({thirdsLoaded}/{TOTAL_THIRDS} cargados)
            </div>
          )}
        </div>
      </div>
    );
  }

  const fixedMatches = BRACKET_MATCHES.filter(m => m.slot2.type !== '3');

  return (
    <div className="tab-content">
      {!allGroupsDone && (
        <div className="bracket-notice">
          🔄 Los cruces se completarán automáticamente cuando terminen todos los grupos
        </div>
      )}

      <div className="bracket-section-title">16avos de Final — Cruces confirmados</div>
      <div className="bracket-grid">
        {fixedMatches.map(m => (
          <BracketCard key={m.id} match={m} standings={standings} manualThirds={manualThirds} />
        ))}
      </div>

      <div className="bracket-section-title" style={{ marginTop: 24 }}>
        16avos de Final — Cruces con 3° clasificado
        {isAdmin && <span className="bracket-manual-badge">Cargar desde Admin → Terceros</span>}
        <span className="bracket-thirds-count">{thirdsLoaded}/{TOTAL_THIRDS} cargados</span>
      </div>
      <div className="bracket-grid">
        {THIRD_MATCHES.map(m => (
          <BracketCard key={m.id} match={m} standings={standings} manualThirds={manualThirds} />
        ))}
      </div>
    </div>
  );
}
