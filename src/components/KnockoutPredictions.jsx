import React, { useState, useEffect } from 'react';
import { Flag } from '../data/flags';
import { BRACKET_MATCHES, resolveSlot } from '../data/bracket';
import { calcAllStandings, useManualThirds } from '../hooks/useBracket';
import Countdown from './Countdown';

const ROUNDS = [
  { key: 'R32', label: '16avos',   fullLabel: '16avos de Final',   icon: '32' },
  { key: 'R16', label: '8vos',     fullLabel: '8vos de Final',     icon: '16' },
  { key: 'QF',  label: 'Cuartos',  fullLabel: 'Cuartos de Final',  icon: '8'  },
  { key: 'SF',  label: 'Semis',    fullLabel: 'Semifinales',       icon: '4'  },
  { key: 'TP',  label: '3er 🥉',   fullLabel: 'Tercer Puesto',     icon: '3'  },
  { key: 'F',   label: 'Final 🏆', fullLabel: 'Gran Final',        icon: '1'  },
];

const ROUND_META = {
  R32: { gradient: 'linear-gradient(135deg, #1a2e22 0%, #161f1a 100%)', accent: '#8fa898', glow: 'rgba(143,168,152,0.15)' },
  R16: { gradient: 'linear-gradient(135deg, #1e2b1e 0%, #161f1a 100%)', accent: '#c6dd00', glow: 'rgba(198,221,0,0.15)' },
  QF:  { gradient: 'linear-gradient(135deg, #221e10 0%, #161f1a 100%)', accent: '#f0b429', glow: 'rgba(240,180,41,0.18)' },
  SF:  { gradient: 'linear-gradient(135deg, #1e1028 0%, #161f1a 100%)', accent: '#9b5de5', glow: 'rgba(155,93,229,0.18)' },
  TP:  { gradient: 'linear-gradient(135deg, #1c1410 0%, #161f1a 100%)', accent: '#cd7f32', glow: 'rgba(205,127,50,0.2)' },
  F:   { gradient: 'linear-gradient(135deg, #241a08 0%, #161f1a 100%)', accent: '#f0b429', glow: 'rgba(240,180,41,0.28)' },
};

const LATER_ROUND_KICKOFFS = {
  'R16_M89':  '2026-07-04T18:00:00-03:00',
  'R16_M90':  '2026-07-04T14:00:00-03:00',
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

function isKnockoutClosed(kickoff) {
  if (!kickoff) return false;
  const cutoff = new Date(kickoff).getTime() - 10 * 60 * 1000;
  return Date.now() >= cutoff;
}

function formatKnockoutKickoff(kickoff) {
  if (!kickoff) return '';
  const d = new Date(kickoff);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' }) +
    ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) + 'hs';
}

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
    if (r.penaltyWinner) return r.penaltyWinner === r.homeTeam ? r.awayTeam : r.homeTeam;
    return `P ${matchId}`;
  };

  const r16 = [
    { id: 'R16_M89',  home: getWinner('R32_M74'), away: getWinner('R32_M77'), label: 'M89', kickoff: '2026-07-04T18:00:00-03:00' },
    { id: 'R16_M90',  home: getWinner('R32_M73'), away: getWinner('R32_M75'), label: 'M90', kickoff: '2026-07-04T14:00:00-03:00' },
    { id: 'R16_M91',  home: getWinner('R32_M76'), away: getWinner('R32_M78'), label: 'M91', kickoff: '2026-07-05T17:00:00-03:00' },
    { id: 'R16_M92',  home: getWinner('R32_M79'), away: getWinner('R32_M80'), label: 'M92', kickoff: '2026-07-05T21:00:00-03:00' },
    { id: 'R16_M93',  home: getWinner('R32_M83'), away: getWinner('R32_M84'), label: 'M93', kickoff: '2026-07-06T16:00:00-03:00' },
    { id: 'R16_M94',  home: getWinner('R32_M81'), away: getWinner('R32_M82'), label: 'M94', kickoff: '2026-07-06T21:00:00-03:00' },
    { id: 'R16_M95',  home: getWinner('R32_M86'), away: getWinner('R32_M88'), label: 'M95', kickoff: '2026-07-07T13:00:00-03:00' },
    { id: 'R16_M96',  home: getWinner('R32_M85'), away: getWinner('R32_M87'), label: 'M96', kickoff: '2026-07-07T17:00:00-03:00' },
  ];
  const qf = [
    { id: 'QF_M97',  home: getWinner('R16_M89'), away: getWinner('R16_M90'), label: 'M97',  kickoff: '2026-07-09T17:00:00-03:00' },
    { id: 'QF_M98',  home: getWinner('R16_M91'), away: getWinner('R16_M92'), label: 'M98',  kickoff: '2026-07-10T16:00:00-03:00' },
    { id: 'QF_M99',  home: getWinner('R16_M93'), away: getWinner('R16_M94'), label: 'M99',  kickoff: '2026-07-11T18:00:00-03:00' },
    { id: 'QF_M100', home: getWinner('R16_M95'), away: getWinner('R16_M96'), label: 'M100', kickoff: '2026-07-11T22:00:00-03:00' },
  ];
  const sf = [
    { id: 'SF_M101', home: getWinner('QF_M97'),  away: getWinner('QF_M98'),  label: 'M101', kickoff: '2026-07-14T16:00:00-03:00' },
    { id: 'SF_M102', home: getWinner('QF_M99'),  away: getWinner('QF_M100'), label: 'M102', kickoff: '2026-07-15T16:00:00-03:00' },
  ];
  const tp = [
    { id: 'TP_M103', home: getLoser('SF_M101'),  away: getLoser('SF_M102'),  label: 'M103', kickoff: '2026-07-18T18:00:00-03:00' },
  ];
  const final = [
    { id: 'F_M104',  home: getWinner('SF_M101'), away: getWinner('SF_M102'), label: 'M104', kickoff: '2026-07-19T16:00:00-03:00' },
  ];
  return { r16, qf, sf, tp, final };
}

// ─── Match card ───────────────────────────────────────────────────────────────
const KnockoutMatchCard = React.memo(function KnockoutMatchCard({ match, prediction, result, onSave, roundKey }) {
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [penaltyWinner, setPenaltyWinner] = useState('');
  const [showPenalty, setShowPenalty] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('idle');

  const kickoff = match.kickoff || LATER_ROUND_KICKOFFS[match.id];
  const closed = isKnockoutClosed(kickoff);
  const meta = ROUND_META[roundKey] || ROUND_META['R32'];

  // Usar ref para rastrear los valores previos y evitar resetear el input
  // cada vez que el padre recrea el objeto prediction con la misma referencia
  const prevPredRef = React.useRef(null);

  useEffect(() => {
    if (!prediction) return;
    const prev = prevPredRef.current;
    const homeVal = String(prediction.home ?? '');
    const awayVal = String(prediction.away ?? '');
    const penVal  = prediction.penaltyWinner ?? '';
    // Solo actualizar si los valores reales cambiaron (no solo la referencia)
    if (
      prev &&
      prev.home === homeVal &&
      prev.away === awayVal &&
      prev.penaltyWinner === penVal
    ) return;
    prevPredRef.current = { home: homeVal, away: awayVal, penaltyWinner: penVal };
    setHome(homeVal);
    setAway(awayVal);
    if (penVal) { setPenaltyWinner(penVal); setShowPenalty(true); }
    else { setPenaltyWinner(''); }
    setDirty(false);
  }, [prediction]);

  useEffect(() => {
    const h = parseInt(home, 10), a = parseInt(away, 10);
    if (!isNaN(h) && !isNaN(a) && h === a) { setShowPenalty(true); }
    else { setShowPenalty(false); setPenaltyWinner(''); }
  }, [home, away]);

  const homeLabel = match.home || '?';
  const awayLabel = match.away || '?';
  const isPending = homeLabel.startsWith('G ') || homeLabel.startsWith('P ');
  const hasResult = !!result;
  const hasPred   = prediction !== undefined && prediction !== null;

  const handleChange = (setter) => (e) => { setter(e.target.value); setDirty(true); setStatus('idle'); };

  const handleSave = async () => {
    const h = parseInt(home, 10), a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a) || home === '' || away === '') { setStatus('error'); setTimeout(() => setStatus('idle'), 2000); return; }
    const isDraw = h === a;
    if (isDraw && !penaltyWinner) { setStatus('error'); setTimeout(() => setStatus('idle'), 2500); return; }
    setStatus('saving');
    try {
      await onSave(match.id, h, a, isDraw ? penaltyWinner : null, homeLabel, awayLabel);
      setDirty(false); setStatus('saved'); setTimeout(() => setStatus('idle'), 2500);
    } catch (e) { console.error(e); setStatus('error'); setTimeout(() => setStatus('idle'), 3000); }
  };

  // ── Render helpers ──
  const TeamSlot = ({ label, align = 'left' }) => (
    <div className={`kmc-team kmc-team--${align}`}>
      {!isPending && <Flag country={label} />}
      <span className="kmc-team-name">{isPending ? '?' : label}</span>
    </div>
  );

  const ScoreBadge = ({ h, a, pen }) => (
    <div className="kmc-score-badge" style={{ '--card-accent': meta.accent }}>
      <span className="kmc-score-num">{h}</span>
      <span className="kmc-score-sep">–</span>
      <span className="kmc-score-num">{a}</span>
      {pen && <span className="kmc-score-pen">pen</span>}
    </div>
  );

  const CardShell = ({ children, statusTag }) => (
    <div
      className={`kmc-card kmc-card--${roundKey.toLowerCase()}`}
      style={{ background: meta.gradient, '--card-accent': meta.accent, '--card-glow': meta.glow }}
    >
      <div className="kmc-glow-bar" style={{ background: meta.accent }} />
      <div className="kmc-header">
        <span className="kmc-match-id">{match.label}</span>
        {statusTag}
        {kickoff && <span className="kmc-kickoff">{formatKnockoutKickoff(kickoff)}</span>}
      </div>
      {children}
    </div>
  );

  // ── Con resultado oficial ──
  if (hasResult) {
    const correctScore = hasPred && prediction.home === result.home && prediction.away === result.away;
    const correctWinner = hasPred && !correctScore && (
      (result.home > result.away && prediction.home > prediction.away) ||
      (result.away > result.home && prediction.away > prediction.home) ||
      (result.penaltyWinner && prediction.penaltyWinner === result.penaltyWinner)
    );
    return (
      <CardShell statusTag={<span className="kmc-tag kmc-tag--result">Resultado</span>}>
        <div className="kmc-body">
          <TeamSlot label={homeLabel} align="left" />
          <div className="kmc-center">
            <ScoreBadge h={result.home} a={result.away} pen={result.penaltyWinner} />
            {result.penaltyWinner && (
              <div className="kmc-pen-label">⚽ Penales: {result.penaltyWinner}</div>
            )}
          </div>
          <TeamSlot label={awayLabel} align="right" />
        </div>
        {hasPred && (
          <div className={`kmc-mypred kmc-mypred--${correctScore ? 'exact' : correctWinner ? 'winner' : 'miss'}`}>
            <span className="kmc-mypred-icon">{correctScore ? '🎯' : correctWinner ? '✅' : '❌'}</span>
            <span>Tu pronóstico: {prediction.home} – {prediction.away}
              {prediction.penaltyWinner ? ` · pen: ${prediction.penaltyWinner}` : ''}</span>
          </div>
        )}
        {!hasPred && <div className="kmc-mypred kmc-mypred--miss"><span className="kmc-mypred-icon">❌</span><span>No enviaste pronóstico</span></div>}
      </CardShell>
    );
  }

  // ── Cerrado con pronóstico ──
  if (hasPred && closed) {
    return (
      <CardShell statusTag={<span className="kmc-tag kmc-tag--locked">🔒 Cerrado</span>}>
        <div className="kmc-body">
          <TeamSlot label={homeLabel} align="left" />
          <div className="kmc-center">
            <ScoreBadge h={prediction.home} a={prediction.away} pen={prediction.penaltyWinner} />
            {prediction.penaltyWinner && <div className="kmc-pen-label">⚽ Pen: {prediction.penaltyWinner}</div>}
          </div>
          <TeamSlot label={awayLabel} align="right" />
        </div>
        <div className="kmc-mypred kmc-mypred--locked">
          <span className="kmc-mypred-icon">🔒</span><span>Pronóstico guardado — esperando resultado</span>
        </div>
      </CardShell>
    );
  }

  // ── Cerrado sin pronóstico ──
  if (!hasPred && closed) {
    return (
      <CardShell statusTag={<span className="kmc-tag kmc-tag--missed">Sin pronóstico</span>}>
        <div className="kmc-body">
          <TeamSlot label={homeLabel} align="left" />
          <div className="kmc-center"><div className="kmc-no-pred-score">– –</div></div>
          <TeamSlot label={awayLabel} align="right" />
        </div>
        <div className="kmc-mypred kmc-mypred--miss">
          <span className="kmc-mypred-icon">🔒</span><span>Cerrado sin pronóstico enviado</span>
        </div>
      </CardShell>
    );
  }

  // ── Abierto con pronóstico (inmutable) ──
  if (hasPred && !closed) {
    return (
      <CardShell statusTag={<span className="kmc-tag kmc-tag--sent">✓ Enviado</span>}>
        <div className="kmc-body">
          <TeamSlot label={homeLabel} align="left" />
          <div className="kmc-center">
            <ScoreBadge h={prediction.home} a={prediction.away} pen={prediction.penaltyWinner} />
            {prediction.penaltyWinner && <div className="kmc-pen-label">⚽ Pen: {prediction.penaltyWinner}</div>}
          </div>
          <TeamSlot label={awayLabel} align="right" />
        </div>
        <div className="kmc-footer kmc-footer--sent">
          <span className="kmc-footer-note">✓ No se puede modificar una vez enviado</span>
          {kickoff && <Countdown kickoff={kickoff} />}
        </div>
      </CardShell>
    );
  }

  // ── Abierto para pronóstico ──
  return (
    <CardShell statusTag={isPending
      ? <span className="kmc-tag kmc-tag--pending">Por definir</span>
      : <span className="kmc-tag kmc-tag--open">Abierto</span>}
    >
      <div className="kmc-body">
        <TeamSlot label={homeLabel} align="left" />
        <div className="kmc-center">
          <div className="kmc-inputs">
            <input
              type="number" min="0" max="20" value={home}
              onChange={handleChange(setHome)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="–" disabled={isPending}
              aria-label={`Goles ${homeLabel}`}
              className="kmc-input"
              style={{ '--card-accent': meta.accent }}
            />
            <span className="kmc-input-sep">–</span>
            <input
              type="number" min="0" max="20" value={away}
              onChange={handleChange(setAway)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="–" disabled={isPending}
              aria-label={`Goles ${awayLabel}`}
              className="kmc-input"
              style={{ '--card-accent': meta.accent }}
            />
          </div>
        </div>
        <TeamSlot label={awayLabel} align="right" />
      </div>

      {showPenalty && !isPending && (
        <div className="kmc-penalty-box" style={{ borderColor: meta.accent }}>
          <span className="kmc-penalty-label" style={{ color: meta.accent }}>⚽ Empate — ¿quién pasa por penales?</span>
          <div className="kmc-penalty-options">
            {[homeLabel, awayLabel].map(team => (
              <button
                key={team}
                className={`kmc-penalty-btn ${penaltyWinner === team ? 'selected' : ''}`}
                style={{ '--card-accent': meta.accent }}
                onClick={() => { setPenaltyWinner(team); setDirty(true); setStatus('idle'); }}
              >
                {!isPending && <Flag country={team} />} {team}
              </button>
            ))}
          </div>
          {!penaltyWinner && status === 'error' && (
            <div className="kmc-penalty-warn">Seleccioná quién pasa por penales antes de guardar</div>
          )}
        </div>
      )}

      {isPending && (
        <div className="kmc-pending-note">Cruce a definir — disponible cuando se confirme el equipo</div>
      )}

      <div className="kmc-footer">
        <span className="kmc-warning">⚠️ Una vez enviado no se puede modificar</span>
        <div className="kmc-footer-right">
          {kickoff && <Countdown kickoff={kickoff} />}
          {!isPending && (
            <button
              className={`kmc-btn-save kmc-btn-save--${status}`}
              style={{ '--card-accent': meta.accent }}
              onClick={handleSave}
              disabled={status === 'saving' || !dirty}
            >
              {status === 'saving' ? 'Guardando…'
                : status === 'saved' ? '✓ Guardado'
                : status === 'error' ? 'Completá los datos'
                : 'Enviar pronóstico'}
            </button>
          )}
        </div>
      </div>
    </CardShell>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────
const KnockoutPredictions = React.memo(function KnockoutPredictions({ results, predictions, onSaveKnockoutPrediction }) {
  const [activeRound, setActiveRound] = useState('R32');
  const { manualThirds } = useManualThirds();
  const standings = React.useMemo(() => calcAllStandings(results), [results]);
  const knockoutResults = results;

  const r32Matches = BRACKET_MATCHES.map(m => ({
    ...m,
    home: resolveSlot(m.slot1, standings, manualThirds, m.id) || m.slot1.label,
    away: resolveSlot(m.slot2, standings, manualThirds, m.id) || m.slot2.label,
    label: `M${m.matchNum}`,
  }));

  const { r16, qf, sf, tp, final } = buildLaterRoundMatches(knockoutResults);
  const matchesByRound = { R32: r32Matches, R16: r16, QF: qf, SF: sf, TP: tp, F: final };
  const currentMatches = matchesByRound[activeRound] || [];
  const activeRoundData = ROUNDS.find(r => r.key === activeRound);
  const meta = ROUND_META[activeRound] || ROUND_META['R32'];

  return (
    <div className="tab-content kmc-wrap">
      <div className="kmc-notice">
        Pronosticá los 120 minutos. Si tu pronóstico termina en empate, elegís quien pasa por penales.
        El cierre es <strong>10 min antes del partido</strong> y el pronóstico no se puede modificar.
      </div>

      {/* Round tabs */}
      <div className="kmc-round-tabs">
        {ROUNDS.map(r => (
          <button
            key={r.key}
            className={`kmc-round-btn ${activeRound === r.key ? 'active' : ''}`}
            style={activeRound === r.key ? { '--tab-accent': ROUND_META[r.key].accent, borderColor: ROUND_META[r.key].accent, color: ROUND_META[r.key].accent } : {}}
            onClick={() => setActiveRound(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Round header */}
      <div className="kmc-round-header" style={{ '--card-accent': meta.accent }}>
        <span className="kmc-round-title" style={{ color: meta.accent }}>{activeRoundData?.fullLabel}</span>
        <span className="kmc-round-count">{currentMatches.length} partidos</span>
      </div>

      {/* Cards */}
      <div className="kmc-list">
        {currentMatches.map(match => (
          <KnockoutMatchCard
            key={match.id}
            match={match}
            prediction={predictions[match.id]}
            result={knockoutResults[match.id]}
            onSave={onSaveKnockoutPrediction}
            roundKey={activeRound}
          />
        ))}
      </div>
    </div>
  );
});

export default KnockoutPredictions;
