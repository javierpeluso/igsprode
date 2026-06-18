import React, { useState, useRef, useEffect } from 'react';
import { useUserStats } from '../hooks/useProfile';
import { logout } from '../lib/firebase';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return 'ahora';
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function MiniAvatar({ photoURL, displayName }) {
  if (photoURL)
    return <img src={photoURL} alt={displayName} className="notif-from-avatar" referrerPolicy="no-referrer" />;
  const initials = (displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="notif-from-avatar notif-from-initials">{initials}</div>;
}

export default function ProfileMenu({ user, isAdmin, unread = 0, items = [], onOpen, onShowStats = () => {}, onShowPlayerStats = () => {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { stats } = useUserStats(user.uid);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open && onOpen) onOpen();
  };

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

            {/* Quick stats */}
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

            {/* Notificaciones de menciones */}
            {items.length > 0 && (
              <>
                <div className="profile-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🔔 Menciones</span>
                  {unread > 0 && <span style={{ fontSize: 10, background: 'var(--c-red)', color: '#fff', borderRadius: 8, padding: '1px 6px' }}>{unread} nuevas</span>}
                </div>
                <div className="notif-list">
                  {items.map(n => (
                    <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                      <MiniAvatar photoURL={n.fromPhotoURL} displayName={n.fromName} />
                      <div className="notif-item-body">
                        <div className="notif-item-title">
                          <span className="notif-from-name">{n.fromName}</span>
                          {' '}te mencionó en el chat
                        </div>
                        <div className="notif-item-preview">"{n.messageText?.slice(0, 60)}{n.messageText?.length > 60 ? '…' : ''}"</div>
                        <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="profile-divider" />
              </>
            )}

            {/* Acciones */}
            <div className="profile-actions">
              {isAdmin
                ? <button className="profile-action-btn stats" onClick={() => { setOpen(false); onShowPlayerStats(); }}>
                    📊 Ver estadísticas de jugadores
                  </button>
                : <button className="profile-action-btn stats" onClick={() => { setOpen(false); onShowStats(); }}>
                    📊 Ver mis estadísticas
                  </button>
              }
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
