import React, { useState, useEffect } from 'react';
import { calcPoints, isClosed, formatKickoff } from '../data/fixture';
import { Flag } from '../data/flags';
import Countdown from './Countdown';
import MatchPredictions from './MatchPredictions';
import MatchComments from './MatchComments';

export default function MatchCard({ match, prediction, result, onSave, currentUid, currentUser }) {
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [dirty, setDirty]   = useState(false);
  const [status, setStatus] = useState('idle');

  const [expanded, setExpanded] = useState(false);
  const closed = isClosed(match);
  const hasResult = !!result;
  const pts = calcPoints(prediction, result);

  useEffect(() => {
    if (prediction) {
      setHome(String(prediction.home));
      setAway(String(prediction.away));
      setDirty(false);
    }
  }, [prediction]);

  const handleChange = (setter) => (e) => {
    setter(e.target.value);
    setDirty(true);
    setStatus('idle');
  };

  const handleSave = async () => {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a) || home === '' || away === '') return;
    setStatus('saving');
    try {
      await onSave(match.id, h, a);
      setDirty(false);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  // ── Con resultado ya cargado ─────────────────────────────────────────────
  if (hasResult) {
    return (
      <div className="match-card has-result">
        <div className="match-header">
          <span className="match-date">{formatKickoff(match.kickoff)}</span>
          {pts !== null
            ? <span className={`pts-chip pts-${pts === 3 ? 'exact' : pts === 1 ? 'winner' : 'miss'}`}>
                {pts === 3 ? '⚡ +3 exacto' : pts === 1 ? '✓ +1 ganador' : '✗ 0 pts'}
              </span>
            : <span className="pts-chip pts-miss">Sin pronóstico</span>
          }
        </div>
        <div className="match-body">
          <span className="team home">{match.home}<Flag country={match.home} /></span>
          <div className="score-area">
            <div className="final-score">
              <span>{result.home}</span>
              <span className="score-sep">–</span>
              <span>{result.away}</span>
            </div>
          </div>
          <span className="team away"><Flag country={match.away} />{match.away}</span>
        </div>
        {prediction && (
          <div className="my-pred">
            Tu pronóstico: {prediction.home} – {prediction.away}
          </div>
        )}
        <button className="btn-ver-preds" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Ocultar pronósticos ▲' : 'Ver pronósticos de todos ▼'}
        </button>
        {expanded && <MatchPredictions match={match} result={result} currentUid={currentUid} />}
        {currentUser && <MatchComments matchId={match.id} currentUser={currentUser} />}
      </div>
    );
  }

  // ── Cerrado (menos de 2hs para el partido) ───────────────────────────────
  if (closed) {
    return (
      <div className="match-card is-closed">
        <div className="match-header">
          <span className="match-date">{formatKickoff(match.kickoff)}</span>
          <span className="closed-chip">🔒 Cerrado</span>
        </div>
        <div className="match-body">
          <span className="team home">{match.home}<Flag country={match.home} /></span>
          <div className="score-area">
            {prediction
              ? <div className="pred-locked">{prediction.home} – {prediction.away}</div>
              : <div className="pred-locked no-pred">–</div>
            }
          </div>
          <span className="team away"><Flag country={match.away} />{match.away}</span>
        </div>
        {prediction
          ? <div className="my-pred">Tu pronóstico guardado</div>
          : <div className="my-pred no-pred-text">No enviaste pronóstico</div>
        }
      </div>
    );
  }

  // ── Abierto: formulario con botón guardar ────────────────────────────────
  const hasPred = prediction !== undefined && prediction !== null;
  const canSave = home !== '' && away !== '' && dirty;

  return (
    <div className={`match-card ${hasPred ? 'has-pred' : 'no-pred'}`}>
      <div className="match-header">
        <span className="match-date">{formatKickoff(match.kickoff)}</span>
        <div className="match-header-right">
          <Countdown kickoff={match.kickoff} />
          {hasPred && !dirty && <span className="saved-chip">✓ Guardado</span>}
          {dirty && <span className="unsaved-chip">Sin guardar</span>}
        </div>
      </div>

      <div className="match-body">
        <span className="team home">{match.home}<Flag country={match.home} /></span>
        <div className="score-area">
          <div className="score-inputs">
            <input
              type="number" min="0" max="20"
              value={home}
              onChange={handleChange(setHome)}
              placeholder="0"
              aria-label={`Goles ${match.home}`}
            />
            <span className="score-sep">–</span>
            <input
              type="number" min="0" max="20"
              value={away}
              onChange={handleChange(setAway)}
              placeholder="0"
              aria-label={`Goles ${match.away}`}
            />
          </div>
        </div>
        <span className="team away"><Flag country={match.away} />{match.away}</span>
      </div>

      <div className="match-footer">
        <span className="venue-text">{match.venue}</span>
        <button
          className={`btn-enviar ${!canSave ? 'disabled' : ''} ${status === 'saved' ? 'saved' : ''} ${status === 'error' ? 'error' : ''}`}
          onClick={handleSave}
          disabled={!canSave || status === 'saving'}
        >
          {status === 'saving' ? 'Guardando...'
            : status === 'saved' ? '✓ Guardado'
            : status === 'error' ? 'Error, reintentá'
            : hasPred ? 'Actualizar pronóstico'
            : 'Enviar pronóstico'}
        </button>
      </div>
    </div>
  );
}
