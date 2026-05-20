import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return 'ahora';
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function Avatar({ user }) {
  if (user.photoURL) return <img src={user.photoURL} alt={user.displayName} className="comment-avatar" referrerPolicy="no-referrer" />;
  const initials = (user.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="comment-avatar comment-avatar-initials">{initials}</div>;
}

export default function FeedComments({ eventId, currentUser }) {
  if (!currentUser) return null;
  const [comments, setComments] = useState([]);
  const [count, setCount]       = useState(0);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);

  // Conteo liviano
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'feed_comment_counts', eventId), snap => {
      setCount(snap.exists() ? snap.data().count || 0 : 0);
    });
    return unsub;
  }, [eventId]);

  // Cargar comentarios solo cuando está expandido
  useEffect(() => {
    if (!expanded) return;
    const ref = query(
      collection(db, 'feed_comments', eventId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(ref, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [eventId, expanded]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'feed_comments', eventId, 'messages'), {
        text: trimmed,
        userId: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL || null,
        createdAt: serverTimestamp(),
      });

      // Actualizar contador
      const countRef  = doc(db, 'feed_comment_counts', eventId);
      const countSnap = await getDoc(countRef);
      await setDoc(countRef, { count: (countSnap.exists() ? countSnap.data().count || 0 : 0) + 1 });

      setText('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e) { console.error(e); }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="feed-comments">
      <button
        className="feed-comments-toggle"
        onClick={() => setExpanded(v => !v)}
      >
        {count > 0
          ? `💬 ${count} comentario${count !== 1 ? 's' : ''}`
          : '💬 Comentar'
        } {expanded ? '▲' : '▼'}
      </button>

      {expanded && (
        <div className="feed-comments-body">
          {comments.length === 0 && (
            <div className="feed-comments-empty">Sé el primero en comentar 👇</div>
          )}
          <div className="feed-comments-list">
            {comments.map(c => (
              <div key={c.id} className={`feed-comment-row ${c.userId === currentUser.uid ? 'is-me' : ''}`}>
                <Avatar user={{ displayName: c.displayName, photoURL: c.photoURL }} />
                <div className="feed-comment-bubble">
                  <div className="comment-meta">
                    <span className="comment-name">{c.displayName}</span>
                    <span className="comment-time">{timeAgo(c.createdAt?.toMillis?.() || c.createdAt)}</span>
                  </div>
                  <div className="comment-text">{c.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="comment-input-row">
            <Avatar user={{ displayName: currentUser.displayName, photoURL: currentUser.photoURL }} />
            <input
              ref={inputRef}
              className="comment-input"
              type="text"
              placeholder="Escribí un comentario..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={300}
              autoFocus
            />
            <button
              className={`btn-send-comment ${!text.trim() ? 'disabled' : ''}`}
              onClick={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending ? '...' : '→'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
