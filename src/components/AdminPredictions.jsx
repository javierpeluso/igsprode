import React, { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GROUPS, formatKickoff } from '../data/fixture';
import { Flag } from '../data/flags';
import AdminCampeon from './AdminCampeon';

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

function MatchPredRow({ match, users, predictions, onDeletePrediction }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(null); // uid being deleted

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
      await onDeletePrediction(uid, match.id);
    } finally {
      setDeleting(null);
    }
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
    </div>
  );
}

export default function AdminPredictions() {
  const [users, setUsers]             = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading]         = useState(true);
  const [activeGroup, setActiveGroup] = useState('A');
  const [section, setSection]         = useState('partidos'); // 'partidos' | 'campeon'

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
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Elimina un pronóstico específico de un usuario para un partido
  const handleDeletePrediction = async (uid, matchId) => {
    // Usar deleteField() para borrar solo ese campo del documento
    await updateDoc(doc(db, 'predictions', uid), {
      [matchId]: deleteField(),
    });
    // Actualizar estado local para reflejar el cambio de inmediato
    setPredictions(prev => {
      const updated = { ...prev };
      if (updated[uid]) {
        updated[uid] = { ...updated[uid] };
        delete updated[uid][matchId];
      }
      return updated;
    });
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
            Pronósticos de todos los participantes por partido. Expandí cada partido para verlos o eliminar uno.
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
            {GROUPS[activeGroup].matches.map(match => (
              <MatchPredRow
                key={match.id}
                match={match}
                users={users}
                predictions={predictions}
                onDeletePrediction={handleDeletePrediction}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
