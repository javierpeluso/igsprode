import React, { useState, useEffect } from 'react';
import { GROUPS } from '../data/fixture';
import { Flag } from '../data/flags';
import MatchPredictions from './MatchPredictions';

function AdminMatchRow({ match, result, onSave }) {
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [expanded, setExpanded] = useState(false);

  const hasResult = !!result;

  // Sync cuando llegan resultados desde Firestore
  useEffect(() => {
    if (result) {
      setHome(String(result.home));
      setAway(String(result.away));
    }
  }, [result]);

  const handleSave = async () => {
    if (hasResult) return; // bloqueado si ya hay resultado
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a)) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
      return;
    }
    setStatus('saving');
    try {
      await onSave(match.id, h, a);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e) {
      console.error('Error guardando resultado:', e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="admin-row">
      <div className="admin-teams">
        <span><Flag country={match.home} /> {match.home}</span>
        <div className="admin-inputs">
          <input
            type="number" min="0" max="20" value={home}
            onChange={e => !hasResult && setHome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="0"
            disabled={hasResult}
            style={hasResult ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          />
          <span>–</span>
          <input
            type="number" min="0" max="20" value={away}
            onChange={e => !hasResult && setAway(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="0"
            disabled={hasResult}
            style={hasResult ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          />
        </div>
        <span><Flag country={match.away} /> {match.away}</span>
      </div>
      <div className="admin-actions">
        <span className="admin-date">{match.date}</span>
        <button
          className={`btn-save ${hasResult ? 'saved' : ''} ${status === 'error' ? 'error' : ''}`}
          onClick={handleSave}
          disabled={hasResult || status === 'saving'}
          title={hasResult ? 'Resultado ya cargado — no se puede modificar' : ''}
          style={hasResult ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
        >
          {hasResult
            ? '🔒 Resultado cargado'
            : status === 'saving' ? 'Guardando...'
            : status === 'saved'  ? '✓ Guardado'
            : status === 'error'  ? '✗ Error — revisá permisos'
            : 'Guardar'}
        </button>
      </div>

      {/* Botón "Ver pronósticos de todos" — siempre visible para el admin cuando hay resultado */}
      {hasResult && (
        <>
          <button className="btn-ver-preds" onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Ocultar pronósticos ▲' : 'Ver pronósticos de todos ▼'}
          </button>
          {expanded && <MatchPredictions match={match} result={result} currentUid={null} />}
        </>
      )}
    </div>
  );
}

export default function AdminTab({ results, onSave }) {
  const [activeGroup, setActiveGroup] = useState('A');

  return (
    <div className="tab-content">
      <div className="admin-notice">
        Cargá los resultados reales. Los puntos se calculan automáticamente para todos.
        <br />
        <strong>Una vez guardado, el resultado queda bloqueado y no se puede modificar.</strong>
      </div>
      <div className="admin-perms-hint">
        Si ves error al guardar: Firebase Console → Firestore → Reglas → asegurate de tener
        <code> allow write: if request.auth != null; </code> en la colección <code>results</code>.
      </div>

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

      <div className="admin-list">
        {GROUPS[activeGroup].matches.map((match) => (
          <AdminMatchRow
            key={match.id}
            match={match}
            result={results[match.id]}
            onSave={onSave}
          />
        ))}
      </div>
    </div>
  );
}
