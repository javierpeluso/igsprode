import React, { useState, useRef, useEffect } from 'react';
import { useUserStats, useGlobalStats } from '../hooks/useProfile';
import { Flag } from '../data/flags';
import { logout } from '../lib/firebase';

function StatBox({ label, value, sub, color }) {
  return (
    <div className="stat-box">
      <div className="stat-value" style={{ color: color || 'var(--c-accent)' }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function ProfilePanel({ user, stats, global, isAdmin, onClose }) {
  const noData = !stats || stats.totalPlayed === 0;

  return (
    <div className="profile-panel">
      {/* Header usuario */}
      <div className="profile-header">
        {user.photoURL
          ? <img src={user.photoURL} alt={user.displayName} className="profile-avatar" referrerPolicy="no-referrer" />
          : <div className="profile-avatar profile-avatar-initials">{(user.displayName || 'U')[0]}</div>
        }
        <div>
          <div className="profile-name">{user.displayName}</div>
          <div className="profile-email">{user.email}</div>
        </div>
      </div>

      {/* Acciones */}
      <div className="profile-actions">
        {isAdmin && (
          <button className="profile-action-btn admin" onClick={() => { window.location.href = '/admin'; onClose(); }}>
            ⚙️ Panel Admin
          </button>
        )}
        <button className="profile-action-btn logout" onClick={() => logout()}>
          🚪 Cerrar sesión
        </button>
      </div>

      <div className="profile-divider" />

      {/* Estadísticas */}
      <div className="profile-stats-title">Mis estadísticas</div>

      {noData ? (
        <div className="profile-no-data">Todavía no hay partidos jugados</div>
      ) : (
        <>
          {/* Fila principal */}
          <div className="stat-grid">
            <StatBox label="Puntos" value={stats.totalPts} />
            <StatBox label="% Aciertos" value={`${stats.pctCorrect}%`} color="var(--c-green)" />
            <StatBox label="Exactos" value={stats.exact} color="var(--c-exact)" sub={`${stats.pctExact}%`} />
            <StatBox label="Ganador" value={stats.winner} color="var(--c-winner)" sub={`${stats.pctWinner}%`} />
          </div>

          {/* Rachas */}
          <div className="profile-section-title">Rachas</div>
          <div className="stat-grid">
            <StatBox
              label="Mejor racha"
              value={`${stats.bestStreak} ✓`}
              color="var(--c-green)"
              sub="consecutivos"
            />
            <StatBox
              label="Peor racha"
              value={`${stats.worstStreak} ✗`}
              color="var(--c-red)"
              sub="sin acertar"
            />
            <StatBox
              label="Racha actual"
              value={stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak}
              color={stats.currentStreak > 0 ? 'var(--c-green)' : stats.currentStreak < 0 ? 'var(--c-red)' : 'var(--c-muted)'}
              sub={stats.currentStreak > 0 ? 'ganando' : stats.currentStreak < 0 ? 'perdiendo' : 'neutral'}
            />
            <StatBox label="Sin pred." value={stats.noPred} color="var(--c-muted)" sub="partidos" />
          </div>

          {/* Comparación vs promedio */}
          {global && (
            <>
              <div className="profile-section-title">vs Promedio global</div>
              <div className="vs-global">
                <div className="vs-row">
                  <span className="vs-label">% Aciertos</span>
                  <span className="vs-me" style={{ color: stats.pctCorrect >= global.avgPctCorrect ? 'var(--c-green)' : 'var(--c-red)' }}>
                    {stats.pctCorrect}%
                  </span>
                  <span className="vs-sep">vs</span>
                  <span className="vs-global-val">{global.avgPctCorrect}% global</span>
                  <span className="vs-diff" style={{ color: stats.pctCorrect >= global.avgPctCorrect ? 'var(--c-green)' : 'var(--c-red)' }}>
                    {stats.pctCorrect >= global.avgPctCorrect ? `+${stats.pctCorrect - global.avgPctCorrect}` : `${stats.pctCorrect - global.avgPctCorrect}`}
                  </span>
                </div>
                <div className="vs-row">
                  <span className="vs-label">Puntos</span>
                  <span className="vs-me" style={{ color: stats.totalPts >= global.avgPts ? 'var(--c-green)' : 'var(--c-red)' }}>
                    {stats.totalPts}
                  </span>
                  <span className="vs-sep">vs</span>
                  <span className="vs-global-val">{global.avgPts} global</span>
                  <span className="vs-diff" style={{ color: stats.totalPts >= global.avgPts ? 'var(--c-green)' : 'var(--c-red)' }}>
                    {stats.totalPts >= global.avgPts ? `+${stats.totalPts - global.avgPts}` : `${stats.totalPts - global.avgPts}`}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Top equipos */}
          {stats.topTeams?.length > 0 && (
            <>
              <div className="profile-section-title">Equipos que mejor predico</div>
              <div className="top-teams">
                {stats.topTeams.map((t, i) => (
                  <div key={t.team} className="top-team-row">
                    <span className="top-team-rank">#{i + 1}</span>
                    <Flag country={t.team} size={18} />
                    <span className="top-team-name">{t.team}</span>
                    <span className="top-team-pct" style={{ color: 'var(--c-green)' }}>{t.pct}%</span>
                    <span className="top-team-total">({t.total} partidos)</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function ProfileMenu({ user, isAdmin, unread = 0, onOpen }) {
  const [open, setOpen] = useState(false);
  const handleOpen = () => { setOpen(v => !v); if (!open && onOpen) onOpen(); };
  const ref = useRef(null);
  const { stats } = useUserStats(user.uid);
  const global = useGlobalStats();

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="profile-menu-wrap" ref={ref}>
      <button className="profile-trigger" onClick={handleOpen}>
        <div className="profile-trigger-wrap">
          {user.photoURL
            ? <img src={user.photoURL} alt={user.displayName} className="user-photo" referrerPolicy="no-referrer" />
            : <div className="user-initials">{(user.displayName || 'U')[0]}</div>
          }
          {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
        </div>
      </button>

      {open && (
        <div className="profile-dropdown">
          <ProfilePanel
            user={user}
            stats={stats}
            global={global}
            isAdmin={isAdmin}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
