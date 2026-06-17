import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteField,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Flag } from '../data/flags';
import { BRACKET_MATCHES, resolveSlot } from '../data/bracket';
import { calcAllStandings, useManualThirds } from '../hooks/useBracket';
import { logPredictionChange } from '../hooks/usePredictionHistory';

// ── Rondas ───────────────────────────────────────────────────────────────────
const ROUNDS = [
  { key: 'R32', label: '16avos' },
  { key: 'R16', label: '8vos'   },
  { key: 'QF',  label: 'Cuartos'},
  { key: 'SF',  label: 'Semis'  },
  { key: 'TP',  label: '3er Pto.'},
  { key: 'F',   label: 'Final'  },
];

// ── Helpers para construir cruces posteriores a R32 ──────────────────────────
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
    if (r.penaltyWinner)
      return r.penaltyWinner === r.homeTeam ? r.awayTeam : r.homeTeam;
    return `P ${matchId}`;
  };
  return {
    R16: [
      { id:'R16_M89',  home:getWinner('R32_M73'), away:getWinner('R32_M74'), label:'8vos M89',  date:'4 jul'  },
      { id:'R16_M90',  home:getWinner('R32_M75'), away:getWinner('R32_M76'), label:'8vos M90',  date:'4 jul'  },
      { id:'R16_M91',  home:getWinner('R32_M77'), away:getWinner('R32_M78'), label:'8vos M91',  date:'5 jul'  },
      { id:'R16_M92',  home:getWinner('R32_M79'), away:getWinner('R32_M80'), label:'8vos M92',  date:'5 jul'  },
      { id:'R16_M93',  home:getWinner('R32_M81'), away:getWinner('R32_M82'), label:'8vos M93',  date:'6 jul'  },
      { id:'R16_M94',  home:getWinner('R32_M83'), away:getWinner('R32_M84'), label:'8vos M94',  date:'6 jul'  },
      { id:'R16_M95',  home:getWinner('R32_M85'), away:getWinner('R32_M86'), label:'8vos M95',  date:'7 jul'  },
      { id:'R16_M96',  home:getWinner('R32_M87'), away:getWinner('R32_M88'), label:'8vos M96',  date:'7 jul'  },
    ],
    QF: [
      { id:'QF_M97',  home:getWinner('R16_M89'), away:getWinner('R16_M90'), label:'Cuartos M97',  date:'9 jul'  },
      { id:'QF_M98',  home:getWinner('R16_M91'), away:getWinner('R16_M92'), label:'Cuartos M98',  date:'9 jul'  },
      { id:'QF_M99',  home:getWinner('R16_M93'), away:getWinner('R16_M94'), label:'Cuartos M99',  date:'10 jul' },
      { id:'QF_M100', home:getWinner('R16_M95'), away:getWinner('R16_M96'), label:'Cuartos M100', date:'10 jul' },
    ],
    SF: [
      { id:'SF_M101', home:getWinner('QF_M97'), away:getWinner('QF_M98'),   label:'Semi M101', date:'14 jul' },
      { id:'SF_M102', home:getWinner('QF_M99'), away:getWinner('QF_M100'),  label:'Semi M102', date:'15 jul' },
    ],
    TP: [
      { id:'TP_M103', home:getLoser('SF_M101'), away:getLoser('SF_M102'),   label:'3er Puesto', date:'18 jul' },
    ],
    F: [
      { id:'F_M104',  home:getWinner('SF_M101'), away:getWinner('SF_M102'), label:'Final',      date:'19 jul' },
    ],
  };
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user }) {
  if (user.photoURL)
    return <img src={user.photoURL} alt={user.displayName} className="pred-avatar" referrerPolicy="no-referrer" />;
  const initials = (user.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pred-avatar pred-avatar-initials">{initials}</div>;
}

// ── Modal editar / crear pronóstico eliminatoria ─────────────────────────────
function EditKnockoutModal({ match, user, currentPred, onSave, onCancel }) {
  const homeLabel = match.home || '?';
  const awayLabel = match.away || '?';
  const isPending = homeLabel.startsWith('G ') || homeLabel.startsWith('P ');

  const [home, setHome] = useState(currentPred ? String(currentPred.home) : '');
  const [away, setAway] = useState(currentPred ? String(currentPred.away) : '');
  const [penaltyWinner, setPenaltyWinner] = useState(currentPred?.penaltyWinner || '');
  const [showPenalty, setShowPenalty]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const isCreating = !currentPred;

  // Auto-mostrar penales si hay empate
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

  const handleSave = async () => {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError('Ingresá números válidos (≥ 0).');
      return;
    }
    const isDraw = h === a;
    if (isDraw && !penaltyWinner) {
      setError('Seleccioná el ganador por penales.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(user.uid, match.id, h, a, isDraw ? penaltyWinner : null, homeLabel, awayLabel);
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
          {user.displayName} · {match.label}
        </div>

        {isPending ? (
          <div style={{ color: 'var(--c-muted)', fontSize: 13, textAlign: 'center', margin: '12px 0' }}>
            Este cruce aún no está confirmado.
          </div>
        ) : (
          <>
            <div className="admin-edit-pred-inputs">
              <div className="admin-edit-pred-team">
                <Flag country={homeLabel} size={20} />
                <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{homeLabel}</span>
                <input
                  type="number" min="0" max="20" value={home}
                  onChange={e => setHome(e.target.value)}
                  className="admin-edit-pred-input"
                  placeholder="0" autoFocus
                />
              </div>
              <span className="admin-edit-pred-separator">–</span>
              <div className="admin-edit-pred-team">
                <input
                  type="number" min="0" max="20" value={away}
                  onChange={e => setAway(e.target.value)}
                  className="admin-edit-pred-input"
                  placeholder="0"
                />
                <Flag country={awayLabel} size={20} />
                <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{awayLabel}</span>
              </div>
            </div>

            {/* Selector de penales */}
            {showPenalty && (
              <div className="knockout-penalty-box" style={{ margin: '10px 0 4px' }}>
                <span className="knockout-penalty-label">⚽ Empate — ¿quién pasa por penales?</span>
                <div className="knockout-penalty-options">
                  <button
                    className={`knockout-penalty-btn ${penaltyWinner === homeLabel ? 'selected' : ''}`}
                    onClick={() => setPenaltyWinner(homeLabel)}
                  >
                    <Flag country={homeLabel} /> {homeLabel}
                  </button>
                  <button
                    className={`knockout-penalty-btn ${penaltyWinner === awayLabel ? 'selected' : ''}`}
                    onClick={() => setPenaltyWinner(awayLabel)}
                  >
                    <Flag country={awayLabel} /> {awayLabel}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {error && <div className="admin-edit-pred-error">{error}</div>}

        <div className="confirm-actions" style={{ marginTop: 16 }}>
          <button className="confirm-btn cancel" onClick={onCancel} disabled={saving}>Cancelar</button>
          {!isPending && (
            <button
              className="confirm-btn ok"
              style={{ background: 'var(--accent, #3b82f6)' }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Guardando…' : (isCreating ? 'Asignar' : 'Guardar')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal confirmar eliminación ───────────────────────────────────────────────
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

// ── Fila de un partido con lista de usuarios expandible ───────────────────────
function KnockoutMatchPredRow({ match, users, predictions, onSavePrediction, onDeletePrediction }) {
  const [open, setOpen]     = useState(false);
  const [editing, setEditing]   = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [deleting, setDeleting] = useState(null);

  const homeLabel = match.home || '?';
  const awayLabel = match.away || '?';
  const isPending = homeLabel.startsWith('G ') || homeLabel.startsWith('P ');

  const preds = users.map(u => ({
    ...u,
    pred: predictions[u.uid]?.[match.id] || null,
  }));

  const sent    = preds.filter(p => p.pred).length;
  const pending = preds.filter(p => !p.pred).length;

  const handleEditSave = async (uid, matchId, home, away, penaltyWinner, homeTeam, awayTeam) => {
    await onSavePrediction(uid, matchId, home, away, penaltyWinner, homeTeam, awayTeam, match.label);
    setEditing(null);
  };

  const handleDeleteClick = (uid, displayName) => {
    setConfirm({
      uid,
      message: `¿Eliminar el pronóstico de ${displayName} para ${match.label}?`,
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

  return (
    <div className="admin-pred-match">
      <button className="admin-pred-match-header" onClick={() => setOpen(v => !v)}>
        <div className="admin-pred-match-teams">
          {isPending ? (
            <span className="admin-pred-team" style={{ color: 'var(--c-muted)', fontStyle: 'italic' }}>
              {homeLabel}
            </span>
          ) : (
            <span className="admin-pred-team"><Flag country={homeLabel} size={16} /> {homeLabel}</span>
          )}
          <span className="admin-pred-vs">vs</span>
          {isPending ? (
            <span className="admin-pred-team" style={{ color: 'var(--c-muted)', fontStyle: 'italic' }}>
              {awayLabel}
            </span>
          ) : (
            <span className="admin-pred-team"><Flag country={awayLabel} size={16} /> {awayLabel}</span>
          )}
        </div>
        <div className="admin-pred-match-meta">
          <span className="admin-pred-date">{match.label} · {match.date}</span>
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

              {pred ? (
                <span className="admin-pred-score">
                  {pred.home} – {pred.away}
                  {pred.penaltyWinner && (
                    <span className="admin-pred-penalty"> (pen: {pred.penaltyWinner})</span>
                  )}
                </span>
              ) : (
                <span className="admin-pred-missing">Sin pronóstico</span>
              )}

              {/* Editar / Asignar */}
              <button
                className="admin-pred-edit-btn"
                title={pred ? 'Editar pronóstico' : 'Asignar pronóstico'}
                disabled={deleting === uid}
                onClick={() => setEditing({ uid, displayName, photoURL, pred })}
              >
                {pred ? '✏️' : '➕'}
              </button>

              {/* Eliminar — solo si tiene pronóstico */}
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

      {editing && (
        <EditKnockoutModal
          match={match}
          user={editing}
          currentPred={editing.pred}
          onSave={handleEditSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function AdminKnockoutPredictions({ results }) {
  const [users, setUsers]             = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading]         = useState(true);
  const [activeRound, setActiveRound] = useState('R32');

  const { manualThirds } = useManualThirds();
  const standings = React.useMemo(() => calcAllStandings(results), [results]);

  // Cargar usuarios y sus pronósticos
  useEffect(() => {
    (async () => {
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
      setLoading(false);
    })();
  }, []);

  // Construir partidos de la ronda activa
  const r32Matches = BRACKET_MATCHES.map(m => ({
    ...m,
    home: resolveSlot(m.slot1, standings, manualThirds) || m.slot1.label,
    away: resolveSlot(m.slot2, standings, manualThirds) || m.slot2.label,
    label: `16avos M${m.matchNum}`,
  }));

  const laterRounds = buildLaterRoundMatches(results);
  const matchesByRound = { R32: r32Matches, ...laterRounds };
  const currentMatches = matchesByRound[activeRound] || [];

  // ── Guardar / crear pronóstico eliminatoria ──────────────────────────────
  const handleSavePrediction = async (uid, matchId, home, away, penaltyWinner, homeTeam, awayTeam, roundLabel) => {
    const previous = predictions[uid]?.[matchId] || null;

    const payload = { home, away, homeTeam, awayTeam };
    if (penaltyWinner) payload.penaltyWinner = penaltyWinner;
    else payload.penaltyWinner = null;

    await setDoc(doc(db, 'predictions', uid), { [matchId]: payload }, { merge: true });

    const u = users.find(x => x.uid === uid);
    await logPredictionChange({
      userId: uid,
      userName: u?.displayName,
      userEmail: u?.email,
      matchId,
      matchLabel: homeTeam && awayTeam
        ? `${roundLabel ? roundLabel + ': ' : ''}${homeTeam} vs ${awayTeam}`
        : matchId,
      previous,
      current: { home, away, penaltyWinner: penaltyWinner || null },
      source: 'admin',
    });

    setPredictions(prev => ({
      ...prev,
      [uid]: { ...(prev[uid] || {}), [matchId]: payload },
    }));
  };

  // ── Eliminar pronóstico eliminatoria ─────────────────────────────────────
  const handleDeletePrediction = async (uid, matchId, match) => {
    const previous = predictions[uid]?.[matchId] || null;

    await updateDoc(doc(db, 'predictions', uid), { [matchId]: deleteField() });

    const u = users.find(x => x.uid === uid);
    await logPredictionChange({
      userId: uid,
      userName: u?.displayName,
      userEmail: u?.email,
      matchId,
      matchLabel: match ? `${match.label}: ${match.home} vs ${match.away}` : matchId,
      previous,
      current: null,
      source: 'admin',
    });

    setPredictions(prev => {
      const updated = { ...prev, [uid]: { ...(prev[uid] || {}) } };
      delete updated[uid][matchId];
      return updated;
    });
  };

  if (loading) return <div className="empty-state">Cargando pronósticos eliminatoria…</div>;

  return (
    <div className="tab-content">
      <div className="admin-notice">
        Pronósticos de fase eliminatoria de todos los participantes. Expandí cada partido para ver, editar (<strong>✏️</strong>) o eliminar pronósticos, y asignar uno (<strong>➕</strong>) a quien no pronosticó. Los cruces pendientes de confirmar se muestran en gris.
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

      <div className="admin-pred-matches">
        {currentMatches.map(match => (
          <KnockoutMatchPredRow
            key={match.id}
            match={match}
            users={users}
            predictions={predictions}
            onSavePrediction={handleSavePrediction}
            onDeletePrediction={handleDeletePrediction}
          />
        ))}
      </div>
    </div>
  );
}
