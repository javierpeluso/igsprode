import React, { useState, useEffect } from 'react';
import { Flag } from '../data/flags';
import { BRACKET_MATCHES, resolveSlot } from '../data/bracket';
import { calcAllStandings, useManualThirds } from '../hooks/useBracket';

// Rondas definidas en orden — mismo criterio que AdminKnockout
const ROUNDS = [
  { key: 'R32', label: '16avos de Final' },
  { key: 'R16', label: '8vos de Final' },
  { key: 'QF',  label: 'Cuartos de Final' },
  { key: 'SF',  label: 'Semifinales' },
  { key: 'TP',  label: '3er Puesto' },
  { key: 'F',   label: 'Final' },
];

// Construye los partidos de rondas posteriores a R32 a partir de los
// RESULTADOS OFICIALES ya cargados por el admin (mismo criterio que AdminKnockout,
// para que los cruces que ve el usuario sean siempre los confirmados).
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
    { id: 'R16_M89',  home: getWinner('R32_M73'), away: getWinner('R32_M74'), date: '4 jul',  label: '8vos M89'  },
    { id: 'R16_M90',  home: getWinner('R32_M75'), away: getWinner('R32_M76'), date: '4 jul',  label: '8vos M90'  },
    { id: 'R16_M91',  home: getWinner('R32_M77'), away: getWinner('R32_M78'), date: '5 jul',  label: '8vos M91'  },
    { id: 'R16_M92',  home: getWinner('R32_M79'), away: getWinner('R32_M80'), date: '5 jul',  label: '8vos M92'  },
    { id: 'R16_M93',  home: getWinner('R32_M81'), away: getWinner('R32_M82'), date: '6 jul',  label: '8vos M93'  },
    { id: 'R16_M94',  home: getWinner('R32_M83'), away: getWinner('R32_M84'), date: '6 jul',  label: '8vos M94'  },
    { id: 'R16_M95',  home: getWinner('R32_M85'), away: getWinner('R32_M86'), date: '7 jul',  label: '8vos M95'  },
    { id: 'R16_M96',  home: getWinner('R32_M87'), away: getWinner('R32_M88'), date: '7 jul',  label: '8vos M96'  },
  ];
  const qf = [
    { id: 'QF_M97',  home: getWinner('R16_M89'), away: getWinner('R16_M90'), date: '9 jul',  label: 'Cuartos M97'  },
    { id: 'QF_M98',  home: getWinner('R16_M91'), away: getWinner('R16_M92'), date: '9 jul',  label: 'Cuartos M98'  },
    { id: 'QF_M99',  home: getWinner('R16_M93'), away: getWinner('R16_M94'), date: '10 jul', label: 'Cuartos M99'  },
    { id: 'QF_M100', home: getWinner('R16_M95'), away: getWinner('R16_M96'), date: '10 jul', label: 'Cuartos M100' },
  ];
  const sf = [
    { id: 'SF_M101', home: getWinner('QF_M97'), away: getWinner('QF_M98'), date: '14 jul', label: 'Semi M101' },
    { id: 'SF_M102', home: getWinner('QF_M99'), away: getWinner('QF_M100'), date: '15 jul', label: 'Semi M102' },
  ];
  const tp = [
    { id: 'TP_M103', home: getLoser('SF_M101'), away: getLoser('SF_M102'), date: '18 jul', label: '3er Puesto' },
  ];
  const final = [
    { id: 'F_M104', home: getWinner('SF_M101'), away: getWinner('SF_M102'), date: '19 jul', label: 'Final' },
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

  const hasPred = prediction !== undefined && prediction !== null;

  // ── Resultado oficial ya cargado: solo mostramos lo pronosticado ──────────
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
          <span className="admin-date">{match.label} · {match.date}</span>
        </div>
      </div>
    );
  }

  // ── Sin resultado todavía: formulario de pronóstico ───────────────────────
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

      <div className="admin-actions" style={{ width: '100%', justifyContent: 'space-between' }}>
        <span className="admin-date">{match.label} · {match.date}</span>
        {!isPending && (
          <button
            className={`btn-save ${status === 'saved' ? 'saved' : ''} ${status === 'error' ? 'error' : ''}`}
            onClick={handleSave}
            disabled={status === 'saving' || (!dirty && hasPred)}
          >
            {status === 'saving' ? 'Guardando...'
              : status === 'saved' ? '✓ Guardado'
              : status === 'error' ? 'Completá los datos'
              : hasPred ? 'Actualizar pronóstico'
              : 'Enviar pronóstico'}
          </button>
        )}
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
        termina en empate, vas a poder elegir quién pasa de ronda por penales. Podés pronosticar
        hasta que el admin cargue el resultado oficial del partido.
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
