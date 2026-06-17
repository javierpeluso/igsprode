import React, { useState, useMemo } from 'react';
import { usePredictionHistory } from '../hooks/usePredictionHistory';

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pred-avatar pred-avatar-initials">{initials}</div>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatDateTime = (timestamp) => {
  if (!timestamp) return 'Procesando…';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 'hs';
};

const scoreLabel = (v) => {
  if (!v) return 'Sin pronóstico';
  return `${v.home} – ${v.away}${v.penaltyWinner ? ` (pen: ${v.penaltyWinner})` : ''}`;
};

const eventType = (entry) => {
  if (!entry.previous && entry.current) return 'create';
  if (entry.previous && !entry.current) return 'delete';
  return 'update';
};

const EVENT_LABELS = {
  create: { icon: '🆕', text: 'Primer pronóstico' },
  update: { icon: '✏️', text: 'Modificado' },
  delete: { icon: '🗑️', text: 'Eliminado' },
};

const SOURCE_FILTERS = [
  { key: 'all',   label: 'Todos' },
  { key: 'user',  label: '👤 Usuario' },
  { key: 'admin', label: '🛠️ Admin' },
];

const TYPE_FILTERS = [
  { key: 'all',    label: 'Todos' },
  { key: 'update', label: '✏️ Modificados' },
  { key: 'create', label: '🆕 Primera vez' },
  { key: 'delete', label: '🗑️ Eliminados' },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPredictionHistory() {
  const { history, loading, error } = usePredictionHistory();
  const [search, setSearch]             = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter]     = useState('all');

  const filtered = useMemo(() => {
    return history.filter(h => {
      if (sourceFilter !== 'all' && h.source !== sourceFilter) return false;
      if (typeFilter !== 'all' && eventType(h) !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${h.userName || ''} ${h.userEmail || ''} ${h.matchLabel || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [history, search, sourceFilter, typeFilter]);

  const totalModificaciones = useMemo(
    () => history.filter(h => eventType(h) === 'update').length,
    [history]
  );
  const usuariosInvolucrados = useMemo(
    () => new Set(history.map(h => h.userId)).size,
    [history]
  );

  if (loading) return <div className="empty-state">Cargando historial de pronósticos...</div>;

  return (
    <div className="tab-content">
      <div className="admin-notice">
        Cada vez que un usuario crea, modifica o borra su pronóstico para un partido queda
        registrado acá: el resultado anterior, el nuevo, quién lo hizo (el usuario o un admin
        desde el panel) y la fecha y hora exactas del cambio.
      </div>

      {error && (
        <div className="admin-perms-hint">
          No se pudo cargar el historial. Si el error persiste: Firebase Console → Firestore → Reglas
          → asegurate de tener <code>allow read, create: if request.auth != null;</code> en la
          colección <code>predictionHistory</code>.
        </div>
      )}

      <div className="predhist-summary">
        <div className="predhist-stat">
          <span className="predhist-stat-val">{history.length}</span>
          <span className="predhist-stat-label">cambios totales</span>
        </div>
        <div className="predhist-stat">
          <span className="predhist-stat-val">{totalModificaciones}</span>
          <span className="predhist-stat-label">modificaciones</span>
        </div>
        <div className="predhist-stat">
          <span className="predhist-stat-val">{usuariosInvolucrados}</span>
          <span className="predhist-stat-label">usuarios involucrados</span>
        </div>
      </div>

      <div className="admin-users-toolbar">
        <input
          className="campeon-search"
          style={{ margin: 0, flex: 1, width: 'auto' }}
          placeholder="Buscar por usuario, email o partido..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="match-filters">
        {SOURCE_FILTERS.map(f => (
          <button
            key={f.key}
            className={`filter-btn ${sourceFilter === f.key ? 'active' : ''}`}
            onClick={() => setSourceFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="match-filters" style={{ marginTop: 8 }}>
        {TYPE_FILTERS.map(f => (
          <button
            key={f.key}
            className={`filter-btn ${typeFilter === f.key ? 'active' : ''}`}
            onClick={() => setTypeFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--c-muted)', fontSize: 14 }}>
          {history.length === 0
            ? 'Todavía no se registró ningún cambio de pronóstico.'
            : 'No se encontraron resultados para este filtro.'}
        </div>
      ) : (
        <div className="predhist-list">
          {filtered.map(entry => {
            const type = eventType(entry);
            const ev = EVENT_LABELS[type];
            return (
              <div key={entry.id} className="predhist-row">
                <Avatar name={entry.userName || entry.userEmail} />
                <div className="predhist-main">
                  <div className="predhist-top">
                    <span className="predhist-username">
                      {entry.userName || entry.userEmail || 'Usuario desconocido'}
                    </span>
                    <span className={`predhist-badge type-${type}`}>{ev.icon} {ev.text}</span>
                    <span className={`predhist-badge source-${entry.source}`}>
                      {entry.source === 'admin' ? '🛠️ Admin' : '👤 Usuario'}
                    </span>
                  </div>
                  <div className="predhist-match">{entry.matchLabel}</div>
                  <div className="predhist-change">
                    <span className="predhist-score-old">{scoreLabel(entry.previous)}</span>
                    <span className="predhist-arrow">→</span>
                    <span className="predhist-score-new">{scoreLabel(entry.current)}</span>
                  </div>
                  <div className="predhist-time">🕒 {formatDateTime(entry.changedAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
