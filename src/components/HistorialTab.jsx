import React, { useState } from 'react';
import { ALL_MATCHES, calcPoints, formatKickoff } from '../data/fixture';
import { Flag } from '../data/flags';
import { BRACKET_MATCHES, resolveSlot } from '../data/bracket';
import { calcAllStandings, useManualThirds } from '../hooks/useBracket';

// Kickoffs de rondas eliminatorias (UTC-3)
const KNOCKOUT_KICKOFFS = {
  'R32_M73': '2026-06-28T14:00:00-03:00',
  'R32_M74': '2026-06-28T18:00:00-03:00',
  'R32_M75': '2026-06-29T14:00:00-03:00',
  'R32_M76': '2026-06-29T18:00:00-03:00',
  'R32_M77': '2026-06-29T21:00:00-03:00',
  'R32_M78': '2026-06-30T14:00:00-03:00',
  'R32_M79': '2026-06-30T18:00:00-03:00',
  'R32_M80': '2026-06-30T21:00:00-03:00',
  'R32_M81': '2026-07-01T14:00:00-03:00',
  'R32_M82': '2026-07-01T18:00:00-03:00',
  'R32_M83': '2026-07-01T21:00:00-03:00',
  'R32_M84': '2026-07-02T14:00:00-03:00',
  'R32_M85': '2026-07-02T18:00:00-03:00',
  'R32_M86': '2026-07-02T21:00:00-03:00',
  'R32_M87': '2026-07-03T14:00:00-03:00',
  'R32_M88': '2026-07-03T18:00:00-03:00',
  'R16_M89': '2026-07-04T18:00:00-03:00',
  'R16_M90': '2026-07-04T14:00:00-03:00',
  'R16_M91': '2026-07-05T17:00:00-03:00',
  'R16_M92': '2026-07-05T21:00:00-03:00',
  'R16_M93': '2026-07-06T16:00:00-03:00',
  'R16_M94': '2026-07-06T21:00:00-03:00',
  'R16_M95': '2026-07-07T13:00:00-03:00',
  'R16_M96': '2026-07-07T17:00:00-03:00',
  'QF_M97':  '2026-07-09T17:00:00-03:00',
  'QF_M98':  '2026-07-10T16:00:00-03:00',
  'QF_M99':  '2026-07-11T18:00:00-03:00',
  'QF_M100': '2026-07-11T22:00:00-03:00',
  'SF_M101': '2026-07-14T16:00:00-03:00',
  'SF_M102': '2026-07-15T16:00:00-03:00',
  'TP_M103': '2026-07-18T18:00:00-03:00',
  'F_M104':  '2026-07-19T16:00:00-03:00',
};

function formatKnockoutKickoff(matchId) {
  const kickoff = KNOCKOUT_KICKOFFS[matchId];
  if (!kickoff) return matchId;
  const d = new Date(kickoff);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' }) +
    ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) + 'hs';
}

function ResultRow({ match, result, prediction, isKnockout }) {
  const pts = calcPoints(prediction, result);
  // Nombres reales de equipos (para knockout pueden estar en result.homeTeam/awayTeam)
  const homeName = (isKnockout && result?.homeTeam) ? result.homeTeam : match.home;
  const awayName = (isKnockout && result?.awayTeam) ? result.awayTeam : match.away;
  const dateLabel = isKnockout ? formatKnockoutKickoff(match.id) : formatKickoff(match.kickoff);

  return (
    <div className="historial-row">
      <div className="historial-header">
        <span className="historial-date">{dateLabel}</span>
        {pts !== null
          ? <span className={`pts-chip pts-${pts === 3 ? 'exact' : pts === 1 ? 'winner' : 'miss'}`}>
              {pts === 3 ? '⚡ +3' : pts === 1 ? '✓ +1' : '✗ 0'}
            </span>
          : <span className="pts-chip pts-none">Sin pronóstico</span>
        }
      </div>

      <div className="historial-body">
        <span className="historial-team home">
          {homeName}<Flag country={homeName} />
        </span>
        <div className="historial-scores">
          <div className="historial-result">{result.home} – {result.away}</div>
          {result.penaltyWinner && (
            <div className="historial-pred" style={{ color: 'var(--c-muted)', fontSize: 11 }}>
              ⚽ Penales: {result.penaltyWinner}
            </div>
          )}
          {prediction && (
            <div className="historial-pred">
              pronóstico: {prediction.home} – {prediction.away}
              {prediction.penaltyWinner && ` (penales: ${prediction.penaltyWinner})`}
            </div>
          )}
        </div>
        <span className="historial-team away">
          <Flag country={awayName} />{awayName}
        </span>
      </div>
    </div>
  );
}

// Construye la lista completa de partidos eliminatorios con nombres resueltos
function buildKnockoutMatches(results, standings, manualThirds) {
  const getWinner = (matchId) => {
    const r = results[matchId];
    if (!r) return `G ${matchId}`;
    if (r.home > r.away) return r.homeTeam || `G ${matchId}`;
    if (r.away > r.home) return r.awayTeam || `G ${matchId}`;
    if (r.penaltyWinner) return r.penaltyWinner;
    return `G ${matchId}`;
  };
  const getLoser = (matchId) => {
    const r = results[matchId];
    if (!r) return `P ${matchId}`;
    if (r.home > r.away) return r.awayTeam || `P ${matchId}`;
    if (r.away > r.home) return r.homeTeam || `P ${matchId}`;
    if (r.penaltyWinner) return r.penaltyWinner === r.homeTeam ? r.awayTeam : r.homeTeam;
    return `P ${matchId}`;
  };

  const r32 = BRACKET_MATCHES.map(m => ({
    id: m.id,
    home: resolveSlot(m.slot1, standings, manualThirds, m.id) || m.slot1.label,
    away: resolveSlot(m.slot2, standings, manualThirds, m.id) || m.slot2.label,
  }));

  const r16 = [
    { id: 'R16_M89',  home: getWinner('R32_M74'), away: getWinner('R32_M77') },
    { id: 'R16_M90',  home: getWinner('R32_M73'), away: getWinner('R32_M75') },
    { id: 'R16_M91',  home: getWinner('R32_M76'), away: getWinner('R32_M78') },
    { id: 'R16_M92',  home: getWinner('R32_M79'), away: getWinner('R32_M80') },
    { id: 'R16_M93',  home: getWinner('R32_M83'), away: getWinner('R32_M84') },
    { id: 'R16_M94',  home: getWinner('R32_M81'), away: getWinner('R32_M82') },
    { id: 'R16_M95',  home: getWinner('R32_M86'), away: getWinner('R32_M88') },
    { id: 'R16_M96',  home: getWinner('R32_M85'), away: getWinner('R32_M87') },
  ];
  const qf = [
    { id: 'QF_M97',  home: getWinner('R16_M89'), away: getWinner('R16_M90') },
    { id: 'QF_M98',  home: getWinner('R16_M91'), away: getWinner('R16_M92') },
    { id: 'QF_M99',  home: getWinner('R16_M93'), away: getWinner('R16_M94') },
    { id: 'QF_M100', home: getWinner('R16_M95'), away: getWinner('R16_M96') },
  ];
  const sf = [
    { id: 'SF_M101', home: getWinner('QF_M97'), away: getWinner('QF_M98') },
    { id: 'SF_M102', home: getWinner('QF_M99'), away: getWinner('QF_M100') },
  ];
  const tp = [{ id: 'TP_M103', home: getLoser('SF_M101'), away: getLoser('SF_M102') }];
  const final = [{ id: 'F_M104', home: getWinner('SF_M101'), away: getWinner('SF_M102') }];

  return [...r32, ...r16, ...qf, ...sf, ...tp, ...final];
}

export default function HistorialTab({ results, predictions }) {
  const [filter, setFilter] = useState('all'); // all | exact | winner | miss
  const { manualThirds } = useManualThirds();
  const standings = React.useMemo(() => calcAllStandings(results), [results]);

  // Partidos de grupos con resultado
  const groupPlayed = ALL_MATCHES
    .filter(m => results[m.id])
    .map(m => ({ ...m, isKnockout: false }));

  // Partidos eliminatorios con resultado
  const knockoutMatches = buildKnockoutMatches(results, standings, manualThirds);
  const knockoutPlayed = knockoutMatches
    .filter(m => results[m.id])
    .map(m => ({ ...m, isKnockout: true, kickoff: KNOCKOUT_KICKOFFS[m.id] || null }));

  const played = [...groupPlayed, ...knockoutPlayed]
    .sort((a, b) => {
      const ta = a.kickoff ? new Date(a.kickoff).getTime() : 0;
      const tb = b.kickoff ? new Date(b.kickoff).getTime() : 0;
      return tb - ta;
    });

  const filtered = played.filter(m => {
    if (filter === 'all') return true;
    const pts = calcPoints(predictions[m.id], results[m.id]);
    if (filter === 'exact')  return pts === 3;
    if (filter === 'winner') return pts === 1;
    if (filter === 'miss')   return pts === 0;
    return true;
  });

  const totalExact  = played.filter(m => calcPoints(predictions[m.id], results[m.id]) === 3).length;
  const totalWinner = played.filter(m => calcPoints(predictions[m.id], results[m.id]) === 1).length;
  const totalMiss   = played.filter(m => calcPoints(predictions[m.id], results[m.id]) === 0).length;

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
          <span className="summary-num">{totalExact}</span>
          <span className="summary-label">exactos</span>
        </div>
        <div className="summary-item winner">
          <span className="summary-num">{totalWinner}</span>
          <span className="summary-label">ganador</span>
        </div>
        <div className="summary-item miss">
          <span className="summary-num">{totalMiss}</span>
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
              isKnockout={m.isKnockout}
            />
          ))}
        </div>
      )}
    </div>
  );
}
