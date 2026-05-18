import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import FeedReactions from './FeedReactions';
import FeedComments from './FeedComments';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return 'ahora';
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

const EVENT_CONFIG = {
  exact:   { icon: '⚡', color: 'var(--c-exact)',  label: 'acertó exacto en' },
  winner:  { icon: '✅', color: 'var(--c-winner)', label: 'acertó el ganador en' },
  miss:    { icon: '❌', color: 'var(--c-red)',    label: 'falló en' },
  no_pred: { icon: '😶', color: 'var(--c-muted)',  label: 'no pronosticó' },
  result:  { icon: '🏆', color: 'var(--c-accent)', label: 'Resultado cargado:' },
  joined:  { icon: '👤', color: 'var(--c-blue)',   label: 'se unió al prode' },
  rank_up: { icon: '📈', color: 'var(--c-green)',  label: 'subió al' },
};

function FeedEvent({ event, currentUserId, currentUserName, currentUser }) {
  const cfg = EVENT_CONFIG[event.type] || { icon: '•', color: 'var(--c-muted)', label: '' };

  return (
    <div className="feed-event">
      <div className="feed-icon" style={{ background: `${cfg.color}18`, color: cfg.color }}>
        {cfg.icon}
      </div>
      <div className="feed-content">
        <div className="feed-text">
          {event.type === 'result' ? (
            <span>
              <span className="feed-highlight" style={{ color: cfg.color }}>Resultado cargado: </span>
              {event.matchHome} {event.scoreHome}–{event.scoreAway} {event.matchAway}
            </span>
          ) : event.type === 'joined' ? (
            <span><span className="feed-name">{event.displayName}</span> {cfg.label}</span>
          ) : event.type === 'rank_up' ? (
            <span>
              <span className="feed-name">{event.displayName}</span> {cfg.label}{' '}
              <span className="feed-highlight" style={{ color: cfg.color }}>puesto {event.position}° del ranking</span>
            </span>
          ) : (
            <span>
              <span className="feed-name">{event.displayName}</span>{' '}
              <span style={{ color: cfg.color }}>{cfg.label}</span>{' '}
              {event.matchHome} vs {event.matchAway}
              {event.pts > 0 && <span className="feed-pts" style={{ color: cfg.color }}> +{event.pts}pts</span>}
            </span>
          )}
        </div>
        <div className="feed-time">{timeAgo(event.createdAt)}</div>
        <FeedReactions eventId={event.id} currentUserId={currentUserId} currentUserName={currentUserName} />
        <FeedComments eventId={event.id} currentUser={currentUser} />
      </div>
    </div>
  );
}

export default function FeedTab({ currentUserId, currentUserName, currentUser }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = query(collection(db, 'feed'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(ref, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toMillis?.() || d.data().createdAt })));
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <div className="empty-state">Cargando actividad...</div>;
  if (events.length === 0) {
    return (
      <div className="tab-content">
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          Todavía no hay actividad
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="feed-list">
        {events.map(e => <FeedEvent key={e.id} event={e} currentUserId={currentUserId} currentUserName={currentUserName} currentUser={currentUser} />)}
      </div>
    </div>
  );
}
