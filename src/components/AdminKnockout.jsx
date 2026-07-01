import React, { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calcPoints } from '../data/fixture';
import { Flag } from '../data/flags';
import { BRACKET_MATCHES, resolveSlot } from '../data/bracket';
import { calcAllStandings, useManualThirds } from '../hooks/useBracket';

// Rounds definidos en orden
const ROUNDS = [
  { key: 'R32', label: '16avos de Final', prefix: 'R32_' },
  { key: 'R16', label: '8vos de Final',   prefix: 'R16_' },
  { key: 'QF',  label: 'Cuartos de Final', prefix: 'QF_'  },
  { key: 'SF',  label: 'Semifinales',      prefix: 'SF_'  },
  { key: 'TP',  label: '3er Puesto',       prefix: 'TP_'  },
  { key: 'F',   label: 'Final',            prefix: 'F_'   },
];

// Construye los partidos de rondas posteriores a R32 a partir de los resultados guardados
function buildLaterRoundMatches(knockoutResults) {
  const getWinner = (matchId) => {
    const r = knockoutResults[matchId];
    if (!r) return `G ${matchId}`;
    if (r.home > r.away) return r.homeTeam || `G ${matchId}`;
    if (r.away > r.home) return r.awayTeam || `G ${matchId}`;
    // Empate → ganador por penales
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
    { id: 'R16_M89',  home: getWinner('R32_M74'), away: getWinner('R32_M77'), date: '4 jul',  label: '8vos M89',   kickoff: '2026-07-04T18:00:00-03:00' },
    { id: 'R16_M90',  home: getWinner('R32_M73'), away: getWinner('R32_M75'), date: '4 jul',  label: '8vos M90',   kickoff: '2026-07-04T14:00:00-03:00' },
    { id: 'R16_M91',  home: getWinner('R32_M76'), away: getWinner('R32_M78'), date: '5 jul',  label: '8vos M91',   kickoff: '2026-07-05T17:00:00-03:00' },
    { id: 'R16_M92',  home: getWinner('R32_M79'), away: getWinner('R32_M80'), date: '5 jul',  label: '8vos M92',   kickoff: '2026-07-05T21:00:00-03:00' },
    { id: 'R16_M93',  home: getWinner('R32_M83'), away: getWinner('R32_M84'), date: '6 jul',  label: '8vos M93',   kickoff: '2026-07-06T16:00:00-03:00' },
    { id: 'R16_M94',  home: getWinner('R32_M81'), away: getWinner('R32_M82'), date: '6 jul',  label: '8vos M94',   kickoff: '2026-07-06T21:00:00-03:00' },
    { id: 'R16_M95',  home: getWinner('R32_M86'), away: getWinner('R32_M88'), date: '7 jul',  label: '8vos M95',   kickoff: '2026-07-07T13:00:00-03:00' },
    { id: 'R16_M96',  home: getWinner('R32_M85'), away: getWinner('R32_M87'), date: '7 jul',  label: '8vos M96',   kickoff: '2026-07-07T17:00:00-03:00' },
  ];
  const qf = [
    { id: 'QF_M97',  home: getWinner('R16_M89'), away: getWinner('R16_M90'), date: '9 jul',  label: 'Cuartos M97',  kickoff: '2026-07-09T17:00:00-03:00' },
    { id: 'QF_M98',  home: getWinner('R16_M91'), away: getWinner('R16_M92'), date: '10 jul', label: 'Cuartos M98',  kickoff: '2026-07-10T16:00:00-03:00' },
    { id: 'QF_M99',  home: getWinner('R16_M93'), away: getWinner('R16_M94'), date: '11 jul', label: 'Cuartos M99',  kickoff: '2026-07-11T18:00:00-03:00' },
    { id: 'QF_M100', home: getWinner('R16_M95'), away: getWinner('R16_M96'), date: '11 jul', label: 'Cuartos M100', kickoff: '2026-07-11T22:00:00-03:00' },
  ];
  const sf = [
    { id: 'SF_M101', home: getWinner('QF_M97'),  away: getWinner('QF_M98'),  date: '14 jul', label: 'Semi M101', kickoff: '2026-07-14T16:00:00-03:00' },
    { id: 'SF_M102', home: getWinner('QF_M99'),  away: getWinner('QF_M100'), date: '15 jul', label: 'Semi M102', kickoff: '2026-07-15T16:00:00-03:00' },
  ];
  const tp = [
    { id: 'TP_M103', home: getLoser('SF_M101'),  away: getLoser('SF_M102'),  date: '18 jul', label: '3er Puesto', kickoff: '2026-07-18T18:00:00-03:00' },
  ];
  const final = [
    { id: 'F_M104',  home: getWinner('SF_M101'), away: getWinner('SF_M102'), date: '19 jul', label: 'Final',      kickoff: '2026-07-19T16:00:00-03:00' },
  ];
  return { r16, qf, sf, tp, final };
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ user }) {
  if (user.photoURL)
    return <img src={user.photoURL} alt={user.displayName} className="pred-avatar" referrerPolicy="no-referrer" />;
  const initials = (user.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pred-avatar pred-avatar-initials">{initials}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel de pronósticos para eliminatoria
// ─────────────────────────────────────────────────────────────────────────────
function AdminAllKnockoutPredictions({ matchId, result }) {
  const [allPreds, setAllPreds] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, 'users'));
      const rows = await Promise.all(
        usersSnap.docs.map(async (userDoc) => {
          const uid      = userDoc.id;
          const userData = userDoc.data();
          const predSnap = await getDoc(doc(db, 'predictions', uid));
          const preds    = predSnap.exists() ? predSnap.data() : {};
          return {
            uid,
            displayName: userData.displayName || userData.email,
            photoURL:    userData.photoURL,
            prediction:  preds[matchId] || null,
          };
        })
      );
      rows.sort((a, b) => {
        if (a.prediction && !b.prediction) return -1;
        if (!a.prediction && b.prediction) return 1;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });
      if (!cancelled) { setAllPreds(rows); setLoading(false); }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [matchId]);

  if (loading) return <div className="preds-loading">Cargando pronósticos...</div>;

  return (
    <div className="match-predictions">
      <div className="preds-title">Pronósticos de todos</div>
      <div className="preds-list">
        {allPreds.map(({ uid, displayName, photoURL, prediction }) => {
          const pts = result ? calcPoints(prediction, result) : null;
          // Bonus penales: si ambos aciertan el ganador por penales también es exacto
          const penCorrect = result?.penaltyWinner && prediction?.penaltyWinner === result.penaltyWinner;
          return (
            <div key={uid} className="pred-row">
              <Avatar user={{ displayName, photoURL }} />
              <span className="pred-name">{displayName}</span>
              <span className="pred-score">
                {prediction
                  ? <>
                      {prediction.home} – {prediction.away}
                      {prediction.penaltyWinner && (
                        <span style={{ fontSize: 11, color: 'var(--c-muted)', marginLeft: 4 }}>
                          · pen: {prediction.penaltyWinner}
                        </span>
                      )}
                    </>
                  : <span className="pred-none">Sin pronóstico</span>
                }
              </span>
              {result && (
                <span className={`pred-pts ${pts === 3 ? 'exact' : pts === 1 ? 'winner' : pts === 0 ? 'miss' : 'no-pred'}`}>
                  {pts === 3 ? (penCorrect ? '⚡ +3 pen' : '⚡ +3') : pts === 1 ? '✓ +1' : pts === 0 ? '✗ 0' : '–'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fila de un partido con soporte de penales
// ─────────────────────────────────────────────────────────────────────────────
function KnockoutMatchRow({ match, result, onSave }) {
  const [home, setHome]   = useState('');
  const [away, setAway]   = useState('');
  const [penaltyWinner, setPenaltyWinner] = useState('');
  const [showPenalty, setShowPenalty]     = useState(false);
  const [status, setStatus] = useState('idle');
  const [expanded, setExpanded] = useState(false);

  const hasResult = !!result;

  // Sync con resultado guardado — comparar valores para no resetear mientras el usuario escribe
  const prevResultRef = React.useRef(null);
  useEffect(() => {
    if (!result) return;
    const prev = prevResultRef.current;
    const homeVal = String(result.home ?? '');
    const awayVal = String(result.away ?? '');
    const penVal  = result.penaltyWinner ?? '';
    if (prev && prev.home === homeVal && prev.away === awayVal && prev.penaltyWinner === penVal) return;
    prevResultRef.current = { home: homeVal, away: awayVal, penaltyWinner: penVal };
    setHome(homeVal);
    setAway(awayVal);
    if (penVal) { setPenaltyWinner(penVal); setShowPenalty(true); }
    else { setPenaltyWinner(''); setShowPenalty(false); }
  }, [result]);

  // Mostrar selector de penales automáticamente si hay empate
  useEffect(() => {
    if (hasResult) return; // no recalcular si ya está guardado
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (!isNaN(h) && !isNaN(a) && h === a) {
      setShowPenalty(true);
    } else {
      setShowPenalty(false);
      setPenaltyWinner('');
    }
  }, [home, away, hasResult]);

  const matchStarted = match.kickoff ? Date.now() >= new Date(match.kickoff).getTime() : true;

  const handleSave = async () => {
    if (hasResult) return;
    if (!matchStarted) {
      setStatus('future'); setTimeout(() => setStatus('idle'), 3000); return;
    }
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a)) {
      setStatus('error'); setTimeout(() => setStatus('idle'), 2000); return;
    }
    const isDraw = h === a;
    if (isDraw && !penaltyWinner) {
      setStatus('error'); setTimeout(() => setStatus('idle'), 2500); return;
    }
    setStatus('saving');
    try {
      await onSave(match.id, h, a, isDraw ? penaltyWinner : null, match.home, match.away);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const homeLabel = match.home || '?';
  const awayLabel = match.away || '?';
  const isPending = homeLabel.startsWith('G ') || homeLabel.startsWith('P ');

  return (
    <div className="admin-row" style={{ flexDirection: 'column', gap: 8 }}>
      {/* Fila principal */}
      <div className="admin-teams" style={{ width: '100%' }}>
        <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4 }}>
          {!isPending && <Flag country={homeLabel} />} {homeLabel}
        </span>
        <div className="admin-inputs">
          <input
            type="number" min="0" max="20" value={home}
            onChange={e => !hasResult && setHome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="0"
            disabled={hasResult || !matchStarted}
            style={(hasResult || !matchStarted) ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          />
          <span>–</span>
          <input
            type="number" min="0" max="20" value={away}
            onChange={e => !hasResult && setAway(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="0"
            disabled={hasResult || !matchStarted}
            style={(hasResult || !matchStarted) ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          />
        </div>
        <span style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
          {!isPending && <Flag country={awayLabel} />} {awayLabel}
        </span>
      </div>

      {/* Selector de penales — aparece solo si hay empate y no está bloqueado */}
      {showPenalty && (
        <div className="knockout-penalty-box">
          <span className="knockout-penalty-label">⚽ Empate — ¿quién gana por penales?</span>
          <div className="knockout-penalty-options">
            <button
              className={`knockout-penalty-btn ${penaltyWinner === homeLabel ? 'selected' : ''}`}
              onClick={() => !hasResult && setPenaltyWinner(homeLabel)}
              disabled={hasResult}
            >
              {!isPending && <Flag country={homeLabel} />} {homeLabel}
            </button>
            <button
              className={`knockout-penalty-btn ${penaltyWinner === awayLabel ? 'selected' : ''}`}
              onClick={() => !hasResult && setPenaltyWinner(awayLabel)}
              disabled={hasResult}
            >
              {!isPending && <Flag country={awayLabel} />} {awayLabel}
            </button>
          </div>
          {!penaltyWinner && status === 'error' && (
            <div className="knockout-penalty-warn">Seleccioná el ganador por penales antes de guardar</div>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="admin-actions" style={{ width: '100%', justifyContent: 'flex-end' }}>
        <span className="admin-date">{match.label} · {match.date}</span>
        <button
          className={`btn-save ${hasResult ? 'saved' : ''} ${(status === 'error' || status === 'future') ? 'error' : ''}`}
          onClick={handleSave}
          disabled={hasResult || status === 'saving' || !matchStarted}
          title={hasResult ? 'Resultado ya cargado — no se puede modificar' : !matchStarted ? 'El partido aún no comenzó' : ''}
          style={(hasResult || !matchStarted) ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
        >
          {hasResult
            ? '🔒 Resultado cargado'
            : !matchStarted ? '⏳ Partido no iniciado'
            : status === 'saving' ? 'Guardando...'
            : status === 'saved' ? '✓ Guardado'
            : status === 'future' ? '⚠ Partido no iniciado'
            : status === 'error' ? '✗ Revisá los datos'
            : 'Guardar'}
        </button>
      </div>

      <button className="btn-ver-preds" onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Ocultar pronósticos ▲' : 'Ver pronósticos de todos ▼'}
      </button>
      {expanded && <AdminAllKnockoutPredictions matchId={match.id} result={result} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminKnockout({ results, onSaveKnockout }) {
  const [activeRound, setActiveRound] = useState('R32');
  const { manualThirds } = useManualThirds();
  const standings = React.useMemo(() => calcAllStandings(results), [results]);

  // Los resultados de eliminatoria viven en results bajo sus IDs (R32_*, R16_*, etc.)
  const knockoutResults = results;

  // Construir los partidos de R32 resolviendo slots
  const r32Matches = BRACKET_MATCHES.map(m => ({
    ...m,
    home: resolveSlot(m.slot1, standings, manualThirds, m.id) || m.slot1.label,
    away: resolveSlot(m.slot2, standings, manualThirds, m.id) || m.slot2.label,
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

  const handleSave = async (matchId, home, away, penaltyWinner, homeTeam, awayTeam) => {
    const payload = { home, away, homeTeam, awayTeam };
    if (penaltyWinner) payload.penaltyWinner = penaltyWinner;
    await onSaveKnockout(matchId, payload);
  };

  const currentMatches = matchesByRound[activeRound] || [];

  return (
    <div className="tab-content">
      <div className="admin-notice">
        En fase eliminatoria en caso que el partido se decida por penales, para que el resultado sea EXACTO se debe tener en cuenta esta instancia,
        por lo que se debe cargar el resultados teniendo en cuenta 120min de juego y posterior ganador via penal.
      </div>

      {/* Navegación de rondas */}
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
          <KnockoutMatchRow
            key={match.id}
            match={match}
            result={knockoutResults[match.id]}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
}
