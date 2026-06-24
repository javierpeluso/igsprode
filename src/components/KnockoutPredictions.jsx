import React, { useState, useEffect } from 'react';
import { Flag } from '../data/flags';
import { BRACKET_MATCHES, resolveSlot } from '../data/bracket';
import { calcAllStandings, useManualThirds } from '../hooks/useBracket';
import Countdown from './Countdown';

// Rondas definidas en orden — mismo criterio que AdminKnockout
const ROUNDS = [
  { key: 'R32', label: '16avos de Final' },
  { key: 'R16', label: '8vos de Final' },
  { key: 'QF',  label: 'Cuartos de Final' },
  { key: 'SF',  label: 'Semifinales' },
  { key: 'TP',  label: '3er Puesto' },
  { key: 'F',   label: 'Final' },
];

// Kickoffs de rondas posteriores a R32 (horario Argentina UTC-3)
const LATER_ROUND_KICKOFFS = {
  'R16_M90':  '2026-07-04T14:00:00-03:00',
  'R16_M89':  '2026-07-04T18:00:00-03:00',
  'R16_M91':  '2026-07-05T17:00:00-03:00',
  'R16_M92':  '2026-07-05T21:00:00-03:00',
  'R16_M93':  '2026-07-06T16:00:00-03:00',
  'R16_M94':  '2026-07-06T21:00:00-03:00',
  'R16_M95':  '2026-07-07T13:00:00-03:00',
  'R16_M96':  '2026-07-07T17:00:00-03:00',
  'QF_M97':   '2026-07-09T17:00:00-03:00',
  'QF_M98':   '2026-07-10T16:00:00-03:00',
  'QF_M99':   '2026-07-11T18:00:00-03:00',
  'QF_M100':  '2026-07-11T22:00:00-03:00',
  'SF_M101':  '2026-07-14T16:00:00-03:00',
  'SF_M102':  '2026-07-15T16:00:00-03:00',
  'TP_M103':  '2026-07-18T18:00:00-03:00',
  'F_M104':   '2026-07-19T16:00:00-03:00',
};

// Devuelve true si ya pasaron los 10 minutos previos al kickoff
function isKnockoutClosed(kickoff) {
  if (!kickoff) return false;
  const cutoff = new Date(kickoff).getTime() - 10 * 60 * 1000;
  return Date.now() >= cutoff;
}

// Formatea fecha y hora en horario Argentina
function formatKnockoutKickoff(kickoff) {
  if (!kickoff) return '';
  const d = new Date(kickoff);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' }) +
    ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) + 'hs';
}

// Construye los partidos de rondas posteriores a R32
function buildLaterRoundMatches(knockoutResults) {
  const getWinner = (matchId) => {
    const r = knockoutResults[matchId];
    if (!r) return `G ${matchId}`;
    if (r.home > r.away) return r.homeTeam || `G ${matchId}`;
    if (r.away > r.home) return r.awayTeam || `G ${matchId}`;
    if (r.penaltyWinner) return r.penaltyWinner;
    return `G ${matchId}`;
  };
  const getLoser = (matchId) => {
    const r = knockoutResults[matchId];
    if (!r) return `P ${matchId}`;
    if (r.home > r.away) return r.awayTeam || `P ${matchId}`;
    if (r.away > r.home) return r.homeTeam || `P ${matchId}`;
    if (r.penaltyWinner) {
      return r.penaltyWinner === r.homeTeam ? r.awayTeam : r.homeTeam;
    }
    return `P ${matchId}`;
  };

  const r16 = [
    { id: 'R16_M89',  home: getWinner('R32_M73'), away: getWinner('R32_M74'), label: '8vos M89'  },
    { id: 'R16_M90',  home: getWinner('R32_M75'), away: getWinner('R32_M76'), label: '8vos M90'  },
    { id: 'R16_M91',  home: getWinner('R32_M77'), away: getWinner('R32_M78'), label: '8vos M91'  },
    { id: 'R16_M92',  home: getWinner('R32_M79'), away: getWinner('R32_M80'), label: '8vos M92'  },
    { id: 'R16_M93',  home: getWinner('R32_M81'), away: getWinner('R32_M82'), label: '8vos M93'  },
    { id: 'R16_M94',  home: getWinner('R32_M83'), away: getWinner('R32_M84'), label: '8vos M94'  },
    { id: 'R16_M95',  home: getWinner('R32_M85'), away: getWinner('R32_M86'), label: '8vos M95'  },
    { id: 'R16_M96',  home: getWinner('R32_M87'), away: getWinner('R32_M88'), label: '8vos M96'  },
  ];
  const qf = [
    { id: 'QF_M97',  home: getWinner('R16_M89'), away: getWinner('R16_M90'), label: 'Cuartos M97'  },
    { id: 'QF_M98',  home: getWinner('R16_M91'), away: getWinner('R16_M92'), label: 'Cuartos M98'  },
    { id: 'QF_M99',  home: getWinner('R16_M93'), away: getWinner('R16_M94'), label: 'Cuartos M99'  },
    { id: 'QF_M100', home: getWinner('R16_M95'), away: getWinner('R16_M96'), label: 'Cuartos M100' },
  ];
  const sf = [
    { id: 'SF_M101', home: getWinner('QF_M97'), away: getWinner('QF_M98'), label: 'Semi M101' },
    { id: 'SF_M102', home: getWinner('QF_M99'), away: getWinner('QF_M100'), label: 'Semi M102' },
  ];
  const tp = [
    { id: 'TP_M103', home: getLoser('SF_M101'), away: getLoser('SF_M102'), label: '3er Puesto' },
  ];
  const final = [
    { id: 'F_M104', home: getWinner('SF_M101'), away: getWinner('SF_M102'), label: 'Final' },
  ];
  return { r16, qf, sf, tp, final };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fila de un partido de eliminatoria — pronóstico del usuario
// ─────────────────────────────────────────────────────────────────────────────
function KnockoutPredictionRow({ match, prediction, result, onSave }) {
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [penaltyWinner, setPenaltyWinner] = useState('');
  const [showPenalty, setShowPenalty] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('idle');

  const kickoff = match.kickoff || LATER_ROUND_KICKOFFS[match.id];
  const closed = isKnockoutClosed(kickoff);

  // Sync con pronóstico guardado
  useEffect(() => {
    if (prediction) {
      setHome(String(prediction.home ?? ''));
      setAway(String(prediction.away ?? ''));
      if (prediction.penaltyWinner) {
        setPenaltyWinner(prediction.penaltyWinner);
        setShowPenalty(true);
      } else {
        setPenaltyWinner('');
      }
      setDirty(false);
    }
  }, [prediction]);

  // Mostrar selector de penales automáticamente si el pronóstico es empate
  useEffect(() => {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (!isNaN(h) && !isNaN(a) && h === a) {
      setShowPenalty(true);
    } else {
      setShowPenalty(false);
      setPenaltyWinner('');
    }
  }, [home, away]);

  const homeLabel = match.home || '?';
  const awayLabel = match.away || '?';
  const isPending = homeLabel.startsWith('G ') || homeLabel.startsWith('P ');
  const hasResult = !!result;
  const hasPred = prediction !== undefined && prediction !== null;

  const handleChange = (setter) => (e) => {
    setter(e.target.value);
    setDirty(true);
    setStatus('idle');
  };

  const handleSave = async () => {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a) || home === '' || away === '') {
      setStatus('error'); setTimeout(() => setStatus('idle'), 2000); return;
    }
    const isDraw = h === a;
    if (isDraw && !penaltyWinner) {
      setStatus('error'); setTimeout(() => setStatus('idle'), 2500); return;
    }
    setStatus('saving');
    try {
      await onSave(match.id, h, a, isDraw ? penaltyWinner : null, homeLabel, awayLabel);
      setDirty(false);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  // ── Resultado oficial ya cargado ──────────────────────────────────────────
  if (hasResult) {
    return (
      <div className="admin-row" style={{ flexDirection: 'column', gap: 8 }}>
        <div className="admin-teams" style={{ width: '100%' }}>
          <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4 }}>
            {!isPending && <Flag country={homeLabel} />} {homeLabel}
          </span>
          <div className="final-score" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{result.home}</span>
            <span className="score-sep">–</span>
            <span>{result.away}</span>
          </div>
          <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            {!isPending && <Flag country={awayLabel} />} {awayLabel}
          </span>
        </div>
        {result.penaltyWinner && (
          <div className="knockout-penalty-label" style={{ textAlign: 'center', width: '100%' }}>
            ⚽ Definido por penales — ganó {result.penaltyWinner}
          </div>
        )}
        <div className="my-pred" style={{ width: '100%', textAlign: 'center' }}>
          {hasPred
            ? <>Tu pronóstico: {prediction.home} – {prediction.away}{prediction.penaltyWinner ? ` (penales: ${prediction.penaltyWinner})` : ''}</>
            : 'No enviaste pronóstico'}
        </div>
        <div className="admin-actions" style={{ width: '100%', justifyContent: 'flex-end' }}>
          <span className="admin-date">{match.label}{kickoff ? ' · ' + formatKnockoutKickoff(kickoff) : ''}</span>
        </div>
      </div>
    );
  }

  // ── Pronóstico ya enviado y partido cerrado (10 min antes del kickoff) ────
  if (hasPred && closed) {
    return (
      <div className="admin-row" style={{ flexDirection: 'column', gap: 8 }}>
        <div className="admin-teams" style={{ width: '100%' }}>
          <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4 }}>
            {!isPending && <Flag country={homeLabel} />} {homeLabel}
          </span>
          <div className="pred-locked" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
            <span>{prediction.home}</span>
            <span className="score-sep">–</span>
            <span>{prediction.away}</span>
          </div>
          <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            {!isPending && <Flag country={awayLabel} />} {awayLabel}
          </span>
        </div>
        {prediction.penaltyWinner && (
          <div className="knockout-penalty-label" style={{ textAlign: 'center', width: '100%' }}>
            ⚽ Penales: {prediction.penaltyWinner}
          </div>
        )}
        <div className="my-pred" style={{ width: '100%', textAlign: 'center' }}>
          🔒 Pronóstico guardado
        </div>
        <div className="admin-actions" style={{ width: '100%', justifyContent: 'flex-end' }}>
          <span className="admin-date">{match.label}{kickoff ? ' · ' + formatKnockoutKickoff(kickoff) : ''}</span>
        </div>
      </div>
    );
  }

  // ── Cerrado sin pronóstico ─────────────────────────────────────────────────
  if (!hasPred && closed) {
    return (
      <div className="admin-row" style={{ flexDirection: 'column', gap: 8 }}>
        <div className="admin-teams" style={{ width: '100%' }}>
          <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4 }}>
            {!isPending && <Flag country={homeLabel} />} {homeLabel}
          </span>
          <div className="pred-locked no-pred" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>–</span>
          </div>
          <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            {!isPending && <Flag country={awayLabel} />} {awayLabel}
          </span>
        </div>
        <div className="my-pred no-pred-text" style={{ width: '100%', textAlign: 'center' }}>
          🔒 Cerrado — no enviaste pronóstico
        </div>
        <div className="admin-actions" style={{ width: '100%', justifyContent: 'flex-end' }}>
          <span className="admin-date">{match.label}{kickoff ? ' · ' + formatKnockoutKickoff(kickoff) : ''}</span>
        </div>
      </div>
    );
  }

  // ── Sin resultado todavía y partido abierto: formulario ───────────────────
  // En eliminatoria: si ya hay pronóstico guardado, NO se puede modificar
  if (hasPred && !closed) {
    return (
      <div className="admin-row" style={{ flexDirection: 'column', gap: 8 }}>
        <div className="admin-teams" style={{ width: '100%' }}>
          <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4 }}>
            {!isPending && <Flag country={homeLabel} />} {homeLabel}
          </span>
          <div className="pred-locked" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
            <span>{prediction.home}</span>
            <span className="score-sep">–</span>
            <span>{prediction.away}</span>
          </div>
          <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            {!isPending && <Flag country={awayLabel} />} {awayLabel}
          </span>
        </div>
        {prediction.penaltyWinner && (
          <div className="knockout-penalty-label" style={{ textAlign: 'center', width: '100%' }}>
            ⚽ Penales: {prediction.penaltyWinner}
          </div>
        )}
        <div className="my-pred" style={{ width: '100%', textAlign: 'center' }}>
          ✓ Pronóstico enviado — no se puede modificar
        </div>
        <div className="admin-actions" style={{ width: '100%', justifyContent: 'space-between' }}>
          <span className="admin-date">{match.label}{kickoff ? ' · ' + formatKnockoutKickoff(kickoff) : ''}</span>
          {kickoff && <Countdown kickoff={kickoff} />}
        </div>
      </div>
    );
  }

  // ── Abierto, sin pronóstico todavía ──────────────────────────────────────
  return (
    <div className="admin-row" style={{ flexDirection: 'column', gap: 8 }}>
      <div className="admin-teams" style={{ width: '100%' }}>
        <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4 }}>
          {!isPending && <Flag country={homeLabel} />} {homeLabel}
        </span>
        <div className="admin-inputs">
          <input
            type="number" min="0" max="20" value={home}
            onChange={handleChange(setHome)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="0"
            disabled={isPending}
            aria-label={`Goles ${homeLabel}`}
          />
          <span>–</span>
          <input
            type="number" min="0" max="20" value={away}
            onChange={handleChange(setAway)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="0"
            disabled={isPending}
            aria-label={`Goles ${awayLabel}`}
          />
        </div>
        <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
          {!isPending && <Flag country={awayLabel} />} {awayLabel}
        </span>
      </div>

      {/* Selector de penales — aparece solo si el pronóstico es empate */}
      {showPenalty && !isPending && (
        <div className="knockout-penalty-box">
          <span className="knockout-penalty-label">⚽ Empate — ¿quién pasa por penales?</span>
          <div className="knockout-penalty-options">
            <button
              className={`knockout-penalty-btn ${penaltyWinner === homeLabel ? 'selected' : ''}`}
              onClick={() => { setPenaltyWinner(homeLabel); setDirty(true); setStatus('idle'); }}
            >
              {!isPending && <Flag country={homeLabel} />} {homeLabel}
            </button>
            <button
              className={`knockout-penalty-btn ${penaltyWinner === awayLabel ? 'selected' : ''}`}
              onClick={() => { setPenaltyWinner(awayLabel); setDirty(true); setStatus('idle'); }}
            >
              {!isPending && <Flag country={awayLabel} />} {awayLabel}
            </button>
          </div>
          {!penaltyWinner && status === 'error' && (
            <div className="knockout-penalty-warn">Seleccioná quién pasa por penales antes de guardar</div>
          )}
        </div>
      )}

      {isPending && (
        <div className="my-pred no-pred-text" style={{ width: '100%', textAlign: 'center' }}>
          Cruce a definir — disponible cuando se confirme el equipo
        </div>
      )}

      {!isPending && (
        <div className="my-pred no-pred-text" style={{ width: '100%', textAlign: 'center', color: 'var(--color-warning, #f59e0b)', fontSize: '0.82rem' }}>
          ⚠️ Una vez enviado, el pronóstico no se puede modificar
        </div>
      )}

      <div className="admin-actions" style={{ width: '100%', justifyContent: 'space-between' }}>
        <span className="admin-date">{match.label}{kickoff ? ' · ' + formatKnockoutKickoff(kickoff) : ''}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {kickoff && <Countdown kickoff={kickoff} />}
          {!isPending && (
            <button
              className={`btn-save ${status === 'saved' ? 'saved' : ''} ${status === 'error' ? 'error' : ''}`}
              onClick={handleSave}
              disabled={status === 'saving' || !dirty}
            >
              {status === 'saving' ? 'Guardando...'
                : status === 'saved' ? '✓ Guardado'
                : status === 'error' ? 'Completá los datos'
                : 'Enviar pronóstico'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal — vista usuario
// ─────────────────────────────────────────────────────────────────────────────
export default function KnockoutPredictions({ results, predictions, onSaveKnockoutPrediction }) {
  const [activeRound, setActiveRound] = useState('R32');
  const { manualThirds } = useManualThirds();
  const standings = React.useMemo(() => calcAllStandings(results), [results]);

  const knockoutResults = results;

  const r32Matches = BRACKET_MATCHES.map(m => ({
    ...m,
    home: resolveSlot(m.slot1, standings, manualThirds) || m.slot1.label,
    away: resolveSlot(m.slot2, standings, manualThirds) || m.slot2.label,
    label: `16avos M${m.matchNum}`,
  }));

  const { r16, qf, sf, tp, final } = buildLaterRoundMatches(knockoutResults);

  const matchesByRound = {
    R32: r32Matches,
    R16: r16,
    QF:  qf,
    SF:  sf,
    TP:  tp,
    F:   final,
  };

  const currentMatches = matchesByRound[activeRound] || [];

  return (
    <div className="tab-content">
      <div className="admin-notice">
        Pronosticá la fase eliminatoria teniendo en cuenta los 120 minutos de juego. Si tu pronóstico
        termina en empate, vas a poder elegir quién pasa de ronda por penales. El pronóstico se cierra
        10 minutos antes del partido y <strong>no se puede modificar una vez enviado</strong>.
      </div>

      <div className="group-nav" style={{ flexWrap: 'wrap' }}>
        {ROUNDS.map(r => (
          <button
            key={r.key}
            className={`group-btn ${activeRound === r.key ? 'active' : ''}`}
            onClick={() => setActiveRound(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="admin-list" style={{ marginTop: 16 }}>
        {currentMatches.map(match => (
          <KnockoutPredictionRow
            key={match.id}
            match={match}
            prediction={predictions[match.id]}
            result={knockoutResults[match.id]}
            onSave={onSaveKnockoutPrediction}
          />
        ))}
      </div>
    </div>
  );
}
