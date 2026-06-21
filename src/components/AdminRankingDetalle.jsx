import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

function Avatar({ user }) {
  if (user.photoURL)
    return <img src={user.photoURL} alt={user.displayName} className="pred-avatar" referrerPolicy="no-referrer" />;
  const initials = (user.displayName || user.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pred-avatar pred-avatar-initials">{initials}</div>;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function AdminRankingDetalle({ adminUids = [] }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [sort, setSort]       = useState('pts'); // 'pts' | 'exact' | 'winner' | 'miss' | 'played'

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      const [usersSnap, scoresSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'scores')),
      ]);

      const scoresMap = {};
      scoresSnap.docs.forEach(d => { scoresMap[d.id] = d.data(); });

      const list = usersSnap.docs
        .filter(d => !adminUids.includes(d.id))
        .map(d => {
          const u  = d.data();
          const sc = scoresMap[d.id] || {};
          const exact  = sc.exact  ?? 0;
          const winner = sc.winner ?? 0;
          const played = sc.played ?? 0;
          const miss   = played - exact - winner;
          const pts    = sc.pts    ?? 0;
          const pctOk  = played > 0 ? Math.round(((exact + winner) / played) * 100) : 0;
          return {
            uid:         d.id,
            displayName: u.displayName || u.email || d.id,
            email:       u.email || '',
            photoURL:    u.photoURL || '',
            pts,
            exact,
            winner,
            miss:        Math.max(miss, 0),
            played,
            pctOk,
            campeonPred:  sc.campeonPred  || '',
            campeonBonus: sc.campeonBonus || 0,
          };
        });

      if (!cancelled) {
        setRows(list);
        setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [adminUids.join(',')]);

  const sorted = [...rows]
    .filter(r =>
      r.displayName.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === 'pts')    return b.pts    - a.pts;
      if (sort === 'exact')  return b.exact  - a.exact;
      if (sort === 'winner') return b.winner - a.winner;
      if (sort === 'miss')   return a.miss   - b.miss;   // menos errores primero
      if (sort === 'played') return b.played - a.played;
      return 0;
    });

  const SortBtn = ({ col, label }) => (
    <button
      className={`admin-sort-btn ${sort === col ? 'active' : ''}`}
      onClick={() => setSort(col)}
    >
      {label}
    </button>
  );

  if (loading) return <div className="empty-state">Cargando ranking...</div>;

  const totalJugados = rows.length > 0 ? Math.max(...rows.map(r => r.played)) : 0;

  return (
    <div className="tab-content">

      {/* Resumen global */}
      <div className="admin-users-summary" style={{ marginBottom: 16 }}>
        <div className="admin-users-stat">
          <span className="admin-users-stat-val">{sorted.length}</span>
          <span className="admin-users-stat-label">jugadores</span>
        </div>
        <div className="admin-users-stat">
          <span className="admin-users-stat-val">{totalJugados}</span>
          <span className="admin-users-stat-label">partidos jugados</span>
        </div>
        <div className="admin-users-stat">
          <span className="admin-users-stat-val">
            {rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.exact, 0) / rows.length) : 0}
          </span>
          <span className="admin-users-stat-label">exactos prom.</span>
        </div>
        <div className="admin-users-stat">
          <span className="admin-users-stat-val">
            {rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.pts, 0) / rows.length) : 0}
          </span>
          <span className="admin-users-stat-label">pts prom.</span>
        </div>
      </div>

      {/* Buscar + ordenar */}
      <div className="admin-users-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <input
          className="campeon-search"
          style={{ margin: 0, flex: 1, minWidth: 140 }}
          placeholder="Buscar usuario..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--c-muted)', alignSelf: 'center', marginRight: 2 }}>Ordenar:</span>
          <SortBtn col="pts"    label="Puntos" />
          <SortBtn col="exact"  label="⚡ Exactos" />
          <SortBtn col="winner" label="✓ Ganador" />
          <SortBtn col="miss"   label="✗ Errores" />
          <SortBtn col="played" label="Jugados" />
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table className="admin-ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th style={{ textAlign: 'left' }}>Usuario</th>
              <th title="Resultado exacto (3 pts)">⚡ Exactos</th>
              <th title="Ganador correcto (1 pt)">✓ Ganador</th>
              <th title="Sin puntos">✗ Errores</th>
              <th title="Partidos con pronóstico enviado">Jugados</th>
              <th title="% de partidos con al menos 1 punto">% Acierto</th>
              <th title="Puntos totales">Pts</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--c-muted)' }}>
                  No se encontraron usuarios
                </td>
              </tr>
            )}
            {sorted.map((r, idx) => {
              const barW = r.played > 0 ? Math.round((r.exact / r.played) * 100) : 0;
              return (
                <tr key={r.uid} className="admin-ranking-row">
                  {/* Posición */}
                  <td className="admin-ranking-pos">
                    {MEDALS[idx] ?? <span className="rank-num">{idx + 1}</span>}
                  </td>

                  {/* Usuario */}
                  <td className="admin-ranking-user">
                    <Avatar user={r} />
                    <div className="admin-ranking-userinfo">
                      <span className="admin-ranking-name">{r.displayName}</span>
                      {r.email && <span className="admin-ranking-email">{r.email}</span>}
                      {r.campeonBonus > 0 && (
                        <span className="admin-ranking-campeon" title={`Pronosticó campeón: ${r.campeonPred}`}>
                          🏆 +{r.campeonBonus} (campeón)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Exactos */}
                  <td className="admin-ranking-cell exact">
                    <span className="admin-ranking-val">{r.exact}</span>
                    <div className="admin-ranking-bar-wrap">
                      <div
                        className="admin-ranking-bar exact-bar"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </td>

                  {/* Ganador */}
                  <td className="admin-ranking-cell winner">
                    <span className="admin-ranking-val">{r.winner}</span>
                  </td>

                  {/* Errores */}
                  <td className="admin-ranking-cell miss">
                    <span className="admin-ranking-val">{r.miss}</span>
                  </td>

                  {/* Jugados */}
                  <td className="admin-ranking-cell">
                    <span className="admin-ranking-val">{r.played}</span>
                  </td>

                  {/* % Acierto */}
                  <td className="admin-ranking-cell">
                    <span
                      className="admin-ranking-pct"
                      style={{
                        color: r.pctOk >= 60 ? 'var(--c-exact, #4ade80)'
                             : r.pctOk >= 35 ? 'var(--c-winner, #facc15)'
                             : 'var(--c-miss, #f87171)',
                      }}
                    >
                      {r.pctOk}%
                    </span>
                  </td>

                  {/* Pts */}
                  <td className="admin-ranking-cell pts">
                    <span className="admin-ranking-pts">{r.pts}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--c-muted)', textAlign: 'center' }}>
        Los datos se calculan a partir de <code>/scores</code> en Firestore. Usá "Recalcular ranking" en la tab Usuarios si ves datos desactualizados.
      </div>
    </div>
  );
}
