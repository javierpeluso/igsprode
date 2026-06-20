import React, { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc, updateDoc, deleteField, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GROUPS, formatKickoff, calcPoints, ALL_MATCHES } from '../data/fixture';
import { Flag } from '../data/flags';
import AdminCampeon from './AdminCampeon';
import { logPredictionChange } from '../hooks/usePredictionHistory';
import { recalcUserStats } from '../hooks/useProfile';

function Avatar({ user }) {
  if (user.photoURL) return <img src={user.photoURL} alt={user.displayName} className="pred-avatar" referrerPolicy="no-referrer" />;
  const initials = (user.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pred-avatar pred-avatar-initials">{initials}</div>;
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">⚠️</div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="confirm-btn cancel" onClick={onCancel}>Cancelar</button>
          <button className="confirm-btn ok" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal para editar / crear un pronóstico ──────────────────────────────────
function EditPredModal({ match, user, currentPred, onSave, onCancel }) {
  const [home, setHome] = useState(currentPred ? String(currentPred.home) : '');
  const [away, setAway] = useState(currentPred ? String(currentPred.away) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const isCreating = !currentPred;

  const handleSave = async () => {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError('Ingresá números válidos (≥ 0).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(user.uid, match.id, h, a);
    } catch (e) {
      setError('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal admin-edit-pred-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">{isCreating ? '➕' : '✏️'}</div>
        <div className="confirm-message" style={{ marginBottom: 4 }}>
          <strong>{isCreating ? 'Asignar pronóstico' : 'Editar pronóstico'}</strong>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          {user.displayName} · {match.home} vs {match.away}
        </div>

        <div className="admin-edit-pred-inputs">
          <div className="admin-edit-pred-team">
            <Flag country={match.home} size={20} />
            <span>{match.home}</span>
            <input
              type="number"
              min="0"
              max="99"
              value={home}
              onChange={e => setHome(e.target.value)}
              className="admin-edit-pred-input"
              placeholder="0"
              autoFocus
            />
          </div>
          <span className="admin-edit-pred-separator">–</span>
          <div className="admin-edit-pred-team">
            <input
              type="number"
              min="0"
              max="99"
              value={away}
              onChange={e => setAway(e.target.value)}
              className="admin-edit-pred-input"
              placeholder="0"
            />
            <Flag country={match.away} size={20} />
            <span>{match.away}</span>
          </div>
        </div>

        {error && <div className="admin-edit-pred-error">{error}</div>}

        <div className="confirm-actions" style={{ marginTop: 16 }}>
          <button className="confirm-btn cancel" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button
            className="confirm-btn ok"
            style={{ background: 'var(--accent, #3b82f6)' }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando…' : (isCreating ? 'Asignar' : 'Guardar')}
          </button>
        </div>
      </div>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

function MatchPredRow({ match, users, predictions, onDeletePrediction, onSavePrediction }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [editing, setEditing]   = useState(null); // { uid, displayName, photoURL, pred }

  const preds = users.map(u => ({
    ...u,
    pred: predictions[u.uid]?.[match.id] || null,
  }));

  const sent    = preds.filter(p => p.pred).length;
  const pending = preds.filter(p => !p.pred).length;

  const handleDeleteClick = (uid, displayName) => {
    setConfirm({
      uid,
      message: `¿Eliminar el pronóstico de ${displayName} para ${match.home} vs ${match.away}? Esta acción no se puede deshacer.`,
    });
  };

  const handleConfirm = async () => {
    const { uid } = confirm;
    setConfirm(null);
    setDeleting(uid);
    try {
      await onDeletePrediction(uid, match.id, match);
    } finally {
      setDeleting(null);
    }
  };

  const handleEditSave = async (uid, matchId, home, away) => {
    await onSavePrediction(uid, matchId, home, away, match);
    setEditing(null);
  };

  return (
    <div className="admin-pred-match">
      <button className="admin-pred-match-header" onClick={() => setOpen(v => !v)}>
        <div className="admin-pred-match-teams">
          <span className="admin-pred-team"><Flag country={match.home} size={16} /> {match.home}</span>
          <span className="admin-pred-vs">vs</span>
          <span className="admin-pred-team"><Flag country={match.away} size={16} /> {match.away}</span>
        </div>
        <div className="admin-pred-match-meta">
          <span className="admin-pred-date">{formatKickoff(match.kickoff)}</span>
          <span className="admin-pred-count">
            <span className="count-sent">{sent} enviados</span>
            {pending > 0 && <span className="count-pending"> · {pending} sin enviar</span>}
          </span>
          <span className="admin-pred-toggle">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="admin-pred-list">
          {preds.map(({ uid, displayName, photoURL, pred }) => (
            <div key={uid} className={`admin-pred-row ${!pred ? 'no-pred' : ''}`}>
              <Avatar user={{ displayName, photoURL }} />
              <span className="admin-pred-name">{displayName}</span>

              {pred
                ? <span className="admin-pred-score">{pred.home} – {pred.away}</span>
                : <span className="admin-pred-missing">Sin pronóstico</span>
              }

              {/* Botón editar (siempre visible) */}
              <button
                className="admin-pred-edit-btn"
                title={pred ? 'Editar pronóstico' : 'Asignar pronóstico'}
                disabled={deleting === uid}
                onClick={() => setEditing({ uid, displayName, photoURL, pred })}
              >
                {pred ? '✏️' : '➕'}
              </button>

              {/* Botón eliminar (solo si tiene pronóstico) */}
              {pred && (
                <button
                  className="admin-pred-delete-btn"
                  title="Eliminar pronóstico"
                  disabled={deleting === uid}
                  onClick={() => handleDeleteClick(uid, displayName)}
                >
                  {deleting === uid ? '...' : '🗑️'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {editing && (
        <EditPredModal
          match={match}
          user={editing}
          currentPred={editing.pred}
          onSave={handleEditSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export default function AdminPredictions() {
  const [users, setUsers]             = useState([]);
  const [predictions, setPredictions] = useState({});
  const [results, setResults]         = useState({});
  const [loading, setLoading]         = useState(true);
  const [activeGroup, setActiveGroup] = useState('A');
  const [section, setSection]         = useState('partidos');

  const fetchAll = async () => {
    setLoading(true);
    const usersSnap = await getDocs(collection(db, 'users'));
    const usersList = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
    setUsers(usersList);

    const predsMap = {};
    await Promise.all(usersList.map(async u => {
      const snap = await getDoc(doc(db, 'predictions', u.uid));
      predsMap[u.uid] = snap.exists() ? snap.data() : {};
    }));
    setPredictions(predsMap);

    const resultsSnap = await getDoc(doc(db, 'results', 'all'));
    setResults(resultsSnap.exists() ? resultsSnap.data() : {});

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Eliminar pronóstico ───────────────────────────────────────────────────
  const handleDeletePrediction = async (uid, matchId, match) => {
    const previous = predictions[uid]?.[matchId] || null;

    await updateDoc(doc(db, 'predictions', uid), {
      [matchId]: deleteField(),
    });

    const u = users.find(x => x.uid === uid);
    await logPredictionChange({
      userId: uid,
      userName: u?.displayName,
      userEmail: u?.email,
      matchId,
      matchLabel: match ? `${match.home} vs ${match.away}` : matchId,
      previous,
      current: null,
      source: 'admin',
    });

    setPredictions(prev => {
      const updated = { ...prev };
      if (updated[uid]) {
        updated[uid] = { ...updated[uid] };
        delete updated[uid][matchId];
      }
      return updated;
    });

    // Recalcular score y estadísticas: el pronóstico borrado puede haber
    // estado sumando puntos (exacto/ganador) que ahora deben quitarse.
    const resultsSnap = await getDoc(doc(db, 'results', 'all'));
    const allResults = resultsSnap.exists() ? resultsSnap.data() : {};
    await recalcScore(uid, allResults);
    await recalcUserStats(uid, allResults);
  };

  // ── Guardar / crear pronóstico (admin) ────────────────────────────────────
  const handleSavePrediction = async (uid, matchId, home, away, match) => {
    const previous = predictions[uid]?.[matchId] || null;

    // setDoc con merge = true crea el doc si no existe, o actualiza el campo
    await setDoc(doc(db, 'predictions', uid), { [matchId]: { home, away } }, { merge: true });

    const u = users.find(x => x.uid === uid);
    await logPredictionChange({
      userId: uid,
      userName: u?.displayName,
      userEmail: u?.email,
      matchId,
      matchLabel: match ? `${match.home} vs ${match.away}` : matchId,
      previous,
      current: { home, away },
      source: 'admin',
    });

    // Recalcular score y estadísticas del usuario
    const resultsSnap = await getDoc(doc(db, 'results', 'all'));
    const allResults = resultsSnap.exists() ? resultsSnap.data() : {};
    await recalcScore(uid, allResults);
    await recalcUserStats(uid, allResults);

    // Actualizar estado local
    setPredictions(prev => ({
      ...prev,
      [uid]: { ...(prev[uid] || {}), [matchId]: { home, away } },
    }));
  };

  if (loading) return <div className="empty-state">Cargando pronósticos...</div>;

  return (
    <div className="tab-content">
      {/* Selector de sección */}
      <div className="admin-section-nav">
        <button
          className={`admin-section-btn ${section === 'partidos' ? 'active' : ''}`}
          onClick={() => setSection('partidos')}
        >
          ⚽ Por partido
        </button>
        <button
          className={`admin-section-btn ${section === 'campeon' ? 'active' : ''}`}
          onClick={() => setSection('campeon')}
        >
          🏆 Campeón
        </button>
      </div>

      {section === 'campeon' ? (
        <>
          <div className="admin-notice">
            Pronóstico de campeón de cada participante. Los que aún no eligieron aparecen al final.
          </div>
          <AdminCampeon />
        </>
      ) : (
        <>
          <div className="admin-notice">
            Pronósticos de todos los participantes por partido. Expandí cada partido para ver, editar (<strong>✏️</strong>) o eliminar pronósticos, y asignar uno (<strong>➕</strong>) a quien no pronosticó.
          </div>

          <div className="group-nav">
            {Object.keys(GROUPS).map(g => (
              <button
                key={g}
                className={`group-btn ${activeGroup === g ? 'active' : ''}`}
                onClick={() => setActiveGroup(g)}
              >
                Grupo {g}
              </button>
            ))}
          </div>

          <div className="admin-pred-matches">
            {GROUPS[activeGroup].matches
              .filter(match => !results[match.id])
              .map(match => (
                <MatchPredRow
                  key={match.id}
                  match={match}
                  users={users}
                  predictions={predictions}
                  onDeletePrediction={handleDeletePrediction}
                  onSavePrediction={handleSavePrediction}
                />
              ))
            }
            {GROUPS[activeGroup].matches.every(match => results[match.id]) && (
              <div className="empty-state">Todos los partidos de este grupo ya tienen resultado.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── recalcScore (local, igual que en useProde.js) ────────────────────────────
async function recalcScore(userId, allResults) {
  const predSnap = await getDoc(doc(db, 'predictions', userId));
  const preds = predSnap.exists() ? predSnap.data() : {};

  let pts = 0, exact = 0, winner = 0, played = 0;
  ALL_MATCHES.forEach((m) => {
    const res = allResults[m.id];
    if (!res) return;
    if (!preds[m.id]) return; // sin pronóstico de este usuario -> no cuenta como "jugado"
    played++;
    const p = calcPoints(preds[m.id], res);
    if (p === 3) { pts += 3; exact++; }
    else if (p === 1) { pts += 1; winner++; }
  });

  const userSnap = await getDoc(doc(db, 'users', userId));
  const ud = userSnap.exists() ? userSnap.data() : {};

  const campeonResultSnap = await getDoc(doc(db, '_meta', 'campeonWinner'));
  const campeonWinner = campeonResultSnap.exists() ? campeonResultSnap.data().team : null;
  const campeonPredSnap = await getDoc(doc(db, 'campeon', userId));
  const campeonPred = campeonPredSnap.exists() ? campeonPredSnap.data().team : null;
  const campeonBonus = campeonWinner && campeonPred && campeonWinner === campeonPred ? 10 : 0;

  await setDoc(doc(db, 'scores', userId), {
    pts: pts + campeonBonus, exact, winner, played,
    campeonPred: campeonPred || '',
    campeonBonus,
    displayName: ud.displayName || '',
    email: ud.email || '',
    photoURL: ud.photoURL || '',
  });
}
