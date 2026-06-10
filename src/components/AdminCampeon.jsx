import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Flag } from '../data/flags';

function Avatar({ user }) {
  if (user.photoURL)
    return <img src={user.photoURL} alt={user.displayName} className="pred-avatar" referrerPolicy="no-referrer" />;
  const initials = (user.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pred-avatar pred-avatar-initials">{initials}</div>;
}

export default function AdminCampeon() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

      const result = await Promise.all(
        users.map(async u => {
          const snap = await getDoc(doc(db, 'campeon', u.uid));
          const campeon = snap.exists() ? snap.data().team : null;
          return { ...u, campeon };
        })
      );

      // Ordenar: primero los que eligieron (alfabético por equipo), luego los que no
      result.sort((a, b) => {
        if (a.campeon && !b.campeon) return -1;
        if (!a.campeon && b.campeon) return 1;
        if (a.campeon && b.campeon) return a.campeon.localeCompare(b.campeon);
        return (a.displayName || '').localeCompare(b.displayName || '');
      });

      setRows(result);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.displayName || '').toLowerCase().includes(q) ||
      (r.campeon || '').toLowerCase().includes(q)
    );
  });

  const withCampeon    = rows.filter(r => r.campeon).length;
  const withoutCampeon = rows.filter(r => !r.campeon).length;

  // Agrupar los seleccionados por equipo para mostrar el conteo
  const teamCount = rows.reduce((acc, r) => {
    if (r.campeon) acc[r.campeon] = (acc[r.campeon] || 0) + 1;
    return acc;
  }, {});
  const topTeams = Object.entries(teamCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (loading) return <div className="empty-state">Cargando pronósticos de campeón...</div>;

  return (
    <div style={{ marginTop: 16 }}>
      {/* Resumen */}
      <div className="admin-campeon-summary">
        <div className="admin-campeon-stat">
          <span className="admin-campeon-stat-num" style={{ color: 'var(--c-accent)' }}>{withCampeon}</span>
          <span className="admin-campeon-stat-label">Eligieron campeón</span>
        </div>
        <div className="admin-campeon-divider" />
        <div className="admin-campeon-stat">
          <span className="admin-campeon-stat-num" style={{ color: 'var(--c-muted)' }}>{withoutCampeon}</span>
          <span className="admin-campeon-stat-label">Sin selección</span>
        </div>
        {topTeams.length > 0 && (
          <>
            <div className="admin-campeon-divider" />
            <div className="admin-campeon-top-teams">
              <span className="admin-campeon-stat-label" style={{ marginBottom: 4 }}>Más elegidos</span>
              {topTeams.map(([team, count]) => (
                <div key={team} className="admin-campeon-top-team-row">
                  <Flag country={team} size={14} />
                  <span className="admin-campeon-top-team-name">{team}</span>
                  <span className="admin-campeon-top-team-count">{count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Buscador */}
      <input
        className="campeon-search"
        type="text"
        placeholder="Buscar usuario o equipo..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginTop: 12, marginBottom: 8 }}
      />

      {/* Tabla de usuarios */}
      <div className="admin-campeon-list">
        {filtered.map(({ uid, displayName, photoURL, campeon }) => (
          <div key={uid} className={`admin-campeon-row ${!campeon ? 'no-pred' : ''}`}>
            <Avatar user={{ displayName, photoURL }} />
            <span className="admin-pred-name">{displayName}</span>
            {campeon ? (
              <div className="admin-campeon-team">
                <Flag country={campeon} size={18} />
                <span className="admin-campeon-team-name">{campeon}</span>
              </div>
            ) : (
              <span className="admin-campeon-pending">⏳ Sin selección</span>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state" style={{ padding: '24px 0' }}>No se encontraron resultados.</div>
        )}
      </div>
    </div>
  );
}
