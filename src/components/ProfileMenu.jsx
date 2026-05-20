import React, { useState, useRef, useEffect } from 'react';
import { useUserStats, useGlobalStats } from '../hooks/useProfile';
import { logout } from '../lib/firebase';

export default function ProfileMenu({ user, isAdmin, unread = 0, onOpen, onShowStats }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { stats } = useUserStats(user.uid);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => { setOpen(v => !v); if (!open && onOpen) onOpen(); };

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
          <div className="profile-panel">
            {/* Header */}
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

            {/* Resumen rápido de puntos */}
            {stats && (
              <div className="profile-quick-stats">
                <div className="profile-quick-item">
                  <span className="profile-quick-val">{stats.totalPts}</span>
                  <span className="profile-quick-label">pts</span>
                </div>
                <div className="profile-quick-sep" />
                <div className="profile-quick-item">
                  <span className="profile-quick-val">{stats.pctCorrect}%</span>
                  <span className="profile-quick-label">aciertos</span>
                </div>
                <div className="profile-quick-sep" />
                <div className="profile-quick-item">
                  <span className="profile-quick-val">{stats.exact}</span>
                  <span className="profile-quick-label">exactos</span>
                </div>
              </div>
            )}

            <div className="profile-divider" />

            {/* Acciones */}
            <div className="profile-actions">
              <button className="profile-action-btn stats" onClick={() => { setOpen(false); onShowStats(); }}>
                📊 Ver mis estadísticas
              </button>
              {isAdmin && (
                window.location.pathname === '/admin'
                  ? <button className="profile-action-btn admin" onClick={() => { window.location.href = '/'; setOpen(false); }}>
                      ← Volver al prode
                    </button>
                  : <button className="profile-action-btn admin" onClick={() => { window.location.href = '/admin'; setOpen(false); }}>
                      ⚙️ Panel Admin
                    </button>
              )}
              <button className="profile-action-btn logout" onClick={() => logout()}>
                🚪 Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
