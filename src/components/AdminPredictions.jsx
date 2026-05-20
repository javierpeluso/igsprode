import React, { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GROUPS, formatKickoff } from '../data/fixture';
import { Flag } from '../data/flags';

function Avatar({ user }) {
  if (user.photoURL) return <img src={user.photoURL} alt={user.displayName} className="pred-avatar" referrerPolicy="no-referrer" />;
  const initials = (user.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pred-avatar pred-avatar-initials">{initials}</div>;
}

function MatchPredRow({ match, users, predictions }) {
  const [open, setOpen] = useState(false);

  const preds = users.map(u => ({
    ...u,
    pred: predictions[u.uid]?.[match.id] || null,
  }));

  const sent     = preds.filter(p => p.pred).length;
  const pending  = preds.filter(p => !p.pred).length;

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPredictions() {
  const [users, setUsers]           = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading]       = useState(true);
  const [activeGroup, setActiveGroup] = useState('A');

  useEffect(() => {
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
    fetchAll();
  }, []);

  if (loading) return <div className="empty-state">Cargando pronósticos...</div>;

  return (
    <div className="tab-content">
      <div className="admin-notice">
        Pronósticos de todos los participantes por partido. Expandí cada partido para verlos.
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
          />
        ))}
      </div>
    </div>
  );
}
