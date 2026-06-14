import React, { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GROUPS, calcPoints } from '../data/fixture';
import { Flag } from '../data/flags';

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user }) {
  if (user.photoURL)
    return <img src={user.photoURL} alt={user.displayName} className="pred-avatar" referrerPolicy="no-referrer" />;
  const initials = (user.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pred-avatar pred-avatar-initials">{initials}</div>;
}

// ── Panel de pronósticos para el admin (no necesita result) ──────────────────
function AdminAllPredictions({ match, result }) {
  const [allPreds, setAllPreds] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, 'users'));
      const results = await Promise.all(
        usersSnap.docs.map(async (userDoc) => {
          const uid      = userDoc.id;
          const userData = userDoc.data();
          const predSnap = await getDoc(doc(db, 'predictions', uid));
          const preds    = predSnap.exists() ? predSnap.data() : {};
          return {
            uid,
            displayName: userData.displayName || userData.email,
            photoURL:    userData.photoURL,
            prediction:  preds[match.id] || null,
          };
        })
      );
      // Primero los que pronosticaron, luego los que no
      results.sort((a, b) => {
        if (a.prediction && !b.prediction) return -1;
        if (!a.prediction && b.prediction) return 1;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });
      if (!cancelled) { setAllPreds(results); setLoading(false); }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [match.id]);

  if (loading) return <div className="preds-loading">Cargando pronósticos...</div>;

  return (
    <div className="match-predictions">
      <div className="preds-title">Pronósticos de todos</div>
      <div className="preds-list">
        {allPreds.map(({ uid, displayName, photoURL, prediction }) => {
          const pts = result ? calcPoints(prediction, result) : null;
          return (
            <div key={uid} className="pred-row">
              <Avatar user={{ displayName, photoURL }} />
              <span className="pred-name">{displayName}</span>
              <span className="pred-score">
                {prediction
                  ? `${prediction.home} – ${prediction.away}`
                  : <span className="pred-none">Sin pronóstico</span>
                }
              </span>
              {result && (
                <span className={`pred-pts ${pts === 3 ? 'exact' : pts === 1 ? 'winner' : pts === 0 ? 'miss' : 'no-pred'}`}>
                  {pts === 3 ? '⚡ +3' : pts === 1 ? '✓ +1' : pts === 0 ? '✗ 0' : '–'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Fila de partido ───────────────────────────────────────────────────────────
function AdminMatchRow({ match, result, onSave }) {
  const [home,     setHome]     = useState('');
  const [away,     setAway]     = useState('');
  const [status,   setStatus]   = useState('idle'); // idle | saving | saved | error
  const [expanded, setExpanded] = useState(false);

  const hasResult = !!result;

  useEffect(() => {
    if (result) {
      setHome(String(result.home));
      setAway(String(result.away));
    }
  }, [result]);

  const handleSave = async () => {
    if (hasResult) return;
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

      {/* Botón siempre visible para el admin — con o sin resultado */}
      <button className="btn-ver-preds" onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Ocultar pronósticos ▲' : 'Ver pronósticos de todos ▼'}
      </button>
      {expanded && <AdminAllPredictions match={match} result={result} />}
    </div>
  );
}

// ── Tab principal ─────────────────────────────────────────────────────────────
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
