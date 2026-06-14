import React, { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GROUPS, ALL_MATCHES, isClosed, formatKickoff, calcPoints } from '../data/fixture';
import { Flag } from '../data/flags';

// ── Helpers de tiempo ────────────────────────────────────────────────────────
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

// Partido finalizado = ya pasaron al menos 140 min desde el kickoff
const isFinished = (match) => {
  const kickoff = new Date(match.kickoff).getTime();
  return Date.now() > kickoff + 140 * 60_000;
};

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user }) {
  if (user.photoURL)
    return <img src={user.photoURL} alt={user.displayName} className="pred-avatar" referrerPolicy="no-referrer" />;
  const initials = (user.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pred-avatar pred-avatar-initials">{initials}</div>;
}

// ── Panel de pronósticos para el admin ──────────────────────────────────────
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
  const [status,   setStatus]   = useState('idle');
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

      <button className="btn-ver-preds" onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Ocultar pronósticos ▲' : 'Ver pronósticos de todos ▼'}
      </button>
      {expanded && <AdminAllPredictions match={match} result={result} />}
    </div>
  );
}

// ── Filtros (igual que PronosticosTab) ───────────────────────────────────────
const FILTERS = [
  { key: 'live',     label: '🔴 En vivo' },
  { key: 'all',      label: 'Todos' },
  { key: 'upcoming', label: 'Próximos' },
];

// ── Tab principal: carga de resultados ───────────────────────────────────────
export default function AdminTab({ results, onSave }) {
  const [activeGroup, setActiveGroup] = useState('A');
  const [filter, setFilter]           = useState('all');
  const [now, setNow]                 = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const liveMatches     = ALL_MATCHES.filter(m => isLiveNow(m));
  const upcomingMatches = ALL_MATCHES
    .filter(m => isUpcoming72h(m))
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  const getFilteredMatches = () => {
    if (filter === 'live')     return liveMatches;
    if (filter === 'upcoming') return upcomingMatches;
    return GROUPS[activeGroup].matches;
  };

  const hideGroupNav = filter === 'live' || filter === 'upcoming';
  const filteredMatches = getFilteredMatches();

  const emptyMsg = () => {
    if (filter === 'live')     return 'No hay partidos en vivo ahora mismo';
    if (filter === 'upcoming') return 'No hay partidos en las próximas 72 horas';
    return 'No hay partidos en este grupo';
  };

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

      {/* Filtros */}
      <div className="match-filters">
        {FILTERS.map(f => {
          const count =
            f.key === 'live'     ? liveMatches.length :
            f.key === 'upcoming' ? upcomingMatches.length : null;
          return (
            <button
              key={f.key}
              className={`filter-btn ${filter === f.key ? 'active' : ''} ${f.key === 'live' && liveMatches.length > 0 ? 'filter-btn--live' : ''}`}
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
        <div className="admin-list">
          {filteredMatches.map((match) => (
            <AdminMatchRow
              key={match.id}
              match={match}
              result={results[match.id]}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Partidos Finalizados sin resultado ───────────────────────────────────
export function AdminFinalizadosTab({ results, onSave }) {
  // Partidos cuyo tiempo ya pasó (≥140 min post-kickoff) y NO tienen resultado cargado
  const pendingMatches = ALL_MATCHES
    .filter(m => isFinished(m) && !results[m.id])
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  return (
    <div className="tab-content">
      <div className="admin-notice">
        Partidos que ya finalizaron pero <strong>no tienen resultado cargado</strong>.
        Cargá el resultado para que se calculen los puntos.
      </div>

      {pendingMatches.length === 0 ? (
        <div className="empty-state" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--c-muted)', fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          Todos los partidos finalizados tienen resultado cargado.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 12, paddingLeft: 4 }}>
            {pendingMatches.length} partido{pendingMatches.length > 1 ? 's' : ''} sin resultado
          </div>
          <div className="admin-list">
            {pendingMatches.map((match) => (
              <AdminMatchRow
                key={match.id}
                match={match}
                result={results[match.id]}
                onSave={onSave}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
