import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

function Avatar({ user }) {
  if (user.photoURL) return <img src={user.photoURL} alt={user.displayName} className="pred-avatar" referrerPolicy="no-referrer" />;
  const initials = (user.displayName || user.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pred-avatar pred-avatar-initials">{initials}</div>;
}

function Badge({ label, color }) {
  return <span className="user-badge" style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>{label}</span>;
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">⚠️</div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="confirm-btn cancel" onClick={onCancel}>Cancelar</button>
          <button className="confirm-btn ok" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function UserRow({ user, adminUids, onAction }) {
  const [expanded, setExpanded]     = useState(false);
  const [ptsInput, setPtsInput]     = useState('');
  const [emailInput, setEmailInput] = useState(user.email || '');
  const [status, setStatus]         = useState('idle');
  const [confirm, setConfirm]       = useState(null);

  const isAdmin   = adminUids.includes(user.uid);
  const isBlocked = user.blocked || false;

  const act = async (fn, successMsg) => {
    setStatus('saving');
    try { await fn(); setStatus('saved'); setTimeout(() => setStatus('idle'), 2000); onAction(); }
    catch (e) { console.error(e); setStatus('error'); setTimeout(() => setStatus('idle'), 3000); }
  };

  const handleResetPts = () => setConfirm({
    message: `¿Resetear todos los puntos de ${user.displayName}? Esta acción no se puede deshacer.`,
    onConfirm: () => { setConfirm(null); act(async () => {
      await setDoc(doc(db, 'scores', user.uid), { pts: 0, exact: 0, winner: 0, played: 0, displayName: user.displayName, email: user.email, photoURL: user.photoURL || '' });
      await setDoc(doc(db, 'stats', user.uid), { totalPts: 0, exact: 0, winner: 0, miss: 0, noPred: 0, predSent: 0, totalPlayed: 0, pctExact: 0, pctWinner: 0, pctCorrect: 0, bestStreak: 0, worstStreak: 0, currentStreak: 0, topTeams: [] });
    }); }
  });

  const handleAddPts = () => act(async () => {
    const pts = parseInt(ptsInput, 10);
    if (isNaN(pts)) throw new Error('Invalid pts');
    const snap = await getDoc(doc(db, 'scores', user.uid));
    const cur  = snap.exists() ? snap.data().pts || 0 : 0;
    await updateDoc(doc(db, 'scores', user.uid), { pts: cur + pts });
    setPtsInput('');
  });

  const handleBlock = () => setConfirm({
    message: isBlocked ? `¿Desbloquear a ${user.displayName}?` : `¿Bloquear a ${user.displayName}? No podrá acceder a la app.`,
    onConfirm: () => { setConfirm(null); act(async () => {
      const newBlocked = !isBlocked;
      // Escribir en users/
      if (user.uid && !user.pending) {
        await updateDoc(doc(db, 'users', user.uid), { blocked: newBlocked });
      }
      // Escribir en allowed_emails/ con setDoc+merge para que funcione aunque no tenga el campo
      if (user.email) {
        await setDoc(doc(db, 'allowed_emails', user.email.toLowerCase()), { blocked: newBlocked }, { merge: true });
      }
    }); }
  });

  const handleMakeAdmin = () => setConfirm({
    message: isAdmin ? `¿Quitar permisos de admin a ${user.displayName}?` : `¿Hacer admin a ${user.displayName}? Podrá cargar resultados.`,
    onConfirm: () => { setConfirm(null); act(() => updateDoc(doc(db, 'users', user.uid), { isAdmin: !isAdmin })); }
  });

  const handleUpdateEmail = () => act(() => updateDoc(doc(db, 'users', user.uid), { email: emailInput }));

  const handleDelete = () => setConfirm({
    message: `¿Eliminar a ${user.displayName} del prode? Se borrarán sus datos y no podrá volver a ingresar. Esta acción no se puede deshacer.`,
    onConfirm: () => { setConfirm(null); act(async () => {
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteDoc(doc(db, 'scores', user.uid));
      await deleteDoc(doc(db, 'stats', user.uid));
      await deleteDoc(doc(db, 'predictions', user.uid));
      await deleteDoc(doc(db, 'campeon', user.uid));
      // Quitar de allowed_emails para que no pueda volver a entrar
      if (user.email) {
        await deleteDoc(doc(db, 'allowed_emails', user.email.toLowerCase()));
      }
    }); }
  });

  return (
    <>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      <div className={`admin-user-card ${isBlocked ? 'blocked' : ''} ${user.pending ? 'pending' : ''}`}>
        <div className="admin-user-header" onClick={() => setExpanded(v => !v)}>
          <Avatar user={user} />
          <div className="admin-user-info">
            <div className="admin-user-name">
              {user.displayName}
              {isAdmin   && <Badge label="Admin"    color="#e8c84a" />}
              {isBlocked && <Badge label="Bloqueado" color="#f45a5a" />}
            </div>
            <div className="admin-user-email">{user.email}</div>
          </div>
          <div className="admin-user-pts">
            <span className="admin-user-pts-val">{user.pts ?? '–'}</span>
            <span className="admin-user-pts-label">pts</span>
          </div>
          <span className="admin-user-toggle">{expanded ? '▲' : '▼'}</span>
        </div>

        {expanded && (
          <div className="admin-user-body">

            {/* Email */}
            <div className="admin-user-section">
              <div className="admin-user-section-title">Email</div>
              <div className="admin-user-row">
                <input
                  className="admin-third-select"
                  style={{ flex: 1 }}
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  type="email"
                />
                <button className={`btn-save ${status === 'saved' ? 'saved' : ''}`} onClick={handleUpdateEmail}>
                  {status === 'saving' ? '...' : status === 'saved' ? '✓' : 'Actualizar'}
                </button>
              </div>
            </div>

            {/* Puntos manuales */}
            <div className="admin-user-section">
              <div className="admin-user-section-title">Agregar puntos manualmente</div>
              <div className="admin-user-row">
                <input
                  className="admin-third-select"
                  style={{ width: 80 }}
                  type="number"
                  placeholder="ej: 5"
                  value={ptsInput}
                  onChange={e => setPtsInput(e.target.value)}
                />
                <button className={`btn-save ${status === 'saved' ? 'saved' : ''}`} onClick={handleAddPts} disabled={!ptsInput}>
                  {status === 'saving' ? '...' : '+ Agregar'}
                </button>
              </div>
            </div>

            {/* Acciones */}
            <div className="admin-user-section">
              <div className="admin-user-section-title">Acciones</div>
              <div className="admin-user-actions">
                <button className="admin-action-btn reset"  onClick={handleResetPts}>🔄 Resetear puntos</button>
                <button className="admin-action-btn block"  onClick={handleBlock}>{isBlocked ? '🔓 Desbloquear' : '🔒 Bloquear'}</button>
                <button className="admin-action-btn admin-toggle" onClick={handleMakeAdmin}>{isAdmin ? '⬇️ Quitar admin' : '⬆️ Hacer admin'}</button>
                <button className="admin-action-btn delete" onClick={handleDelete}>🗑️ Eliminar usuario</button>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}

export default function AdminUsers({ adminUids }) {
  const [users, setUsers]   = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail]       = useState('');
  const [addStatus, setAddStatus]     = useState('idle');

  const fetchUsers = async () => {
    setLoading(true);
    const [usersSnap, scoresSnap, allowedSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'scores')),
      getDocs(collection(db, 'allowed_emails')),
    ]);
    const scoresMap = {};
    scoresSnap.docs.forEach(d => { scoresMap[d.id] = d.data().pts || 0; });
    setScores(scoresMap);

    const registeredEmails = new Set(usersSnap.docs.map(d => d.data().email));
    const list = usersSnap.docs.map(d => ({ uid: d.id, ...d.data(), pts: scoresMap[d.id] ?? 0, registered: true }));

    // Agregar emails pre-autorizados que aún no se loguearon
    allowedSnap.docs.forEach(d => {
      const email = d.data().email;
      if (!registeredEmails.has(email)) {
        list.push({ uid: `pending_${email}`, email, displayName: email, pts: 0, registered: false, pending: true });
      }
    });

    list.sort((a, b) => (b.pts || 0) - (a.pts || 0));
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAddUser = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setAddStatus('saving');
    try {
      await setDoc(doc(db, 'allowed_emails', email), { email, addedAt: Date.now() });
      setNewEmail('');
      setAddStatus('saved');
      setShowAddForm(false);
      setTimeout(() => setAddStatus('idle'), 2000);
      fetchUsers();
    } catch (e) { console.error(e); setAddStatus('error'); setTimeout(() => setAddStatus('idle'), 3000); }
  };

  const filtered = users.filter(u =>
    (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="empty-state">Cargando usuarios...</div>;

  return (
    <div className="tab-content">
      {/* Stats rápidas */}
      <div className="admin-users-summary">
        <div className="admin-users-stat">
          <span className="admin-users-stat-val">{users.length}</span>
          <span className="admin-users-stat-label">usuarios</span>
        </div>
        <div className="admin-users-stat">
          <span className="admin-users-stat-val">{users.filter(u => !u.blocked).length}</span>
          <span className="admin-users-stat-label">activos</span>
        </div>
        <div className="admin-users-stat">
          <span className="admin-users-stat-val">{users.filter(u => u.blocked).length}</span>
          <span className="admin-users-stat-label">bloqueados</span>
        </div>
        <div className="admin-users-stat">
          <span className="admin-users-stat-val">{users.length > 0 ? Math.round(users.reduce((s, u) => s + (u.pts || 0), 0) / users.length) : 0}</span>
          <span className="admin-users-stat-label">pts prom.</span>
        </div>
      </div>

      {/* Buscar + agregar */}
      <div className="admin-users-toolbar">
        <input
          className="campeon-search"
          style={{ margin: 0, flex: 1, width: 'auto' }}
          placeholder="Buscar usuario..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn-save" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowAddForm(v => !v)}>
          + Agregar email
        </button>
      </div>

      {/* Formulario agregar */}
      {showAddForm && (
        <div className="admin-row" style={{ marginBottom: 12 }}>
          <div className="admin-notice" style={{ marginBottom: 8 }}>
            Agregá el email que querés autorizar. El usuario podrá entrar cuando se loguee con esa cuenta de Google.
          </div>
          <div className="admin-user-row">
            <input
              className="admin-third-select"
              style={{ flex: 1 }}
              type="email"
              placeholder="email@empresa.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddUser()}
            />
            <button
              className={`btn-save ${addStatus === 'saved' ? 'saved' : addStatus === 'error' ? 'error' : ''}`}
              onClick={handleAddUser}
              disabled={!newEmail.trim() || addStatus === 'saving'}
            >
              {addStatus === 'saving' ? '...' : addStatus === 'saved' ? '✓ Agregado' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="admin-users-list">
        {filtered.length === 0 && <div className="empty-state">No se encontraron usuarios</div>}
        {filtered.map(u => (
          <UserRow key={u.uid} user={u} adminUids={adminUids} onAction={fetchUsers} />
        ))}
      </div>
    </div>
  );
}
