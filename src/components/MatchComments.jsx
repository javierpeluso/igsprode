import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const EMOJIS = ['🔥', '😂', '😭', '👏', '⚡', '🤌'];

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

function CommentReactions({ commentId, matchId, currentUserId, currentUserName }) {
  const [reactions, setReactions] = useState({});
  const [userMap, setUserMap]     = useState({});
  const [myReaction, setMyReaction] = useState(null);
  const [tooltip, setTooltip]     = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'comment_reactions', `${matchId}_${commentId}`), snap => {
      if (snap.exists()) {
        setReactions(snap.data().counts || {});
        setUserMap(snap.data().names   || {});
        setMyReaction(snap.data().users?.[currentUserId] || null);
      }
    });
    return unsub;
  }, [commentId, matchId, currentUserId]);

  const handleReact = async (emoji) => {
    const ref  = doc(db, 'comment_reactions', `${matchId}_${commentId}`);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : { counts: {}, users: {}, names: {} };
    const counts = { ...data.counts };
    const users  = { ...data.users  };
    const names  = { ...data.names  };
    const prev   = users[currentUserId];

    if (prev === emoji) {
      counts[prev] = Math.max(0, (counts[prev] || 1) - 1);
      if (counts[prev] === 0) delete counts[prev];
      delete users[currentUserId];
      names[prev] = (names[prev] || []).filter(n => n !== currentUserName);
      if (!names[prev]?.length) delete names[prev];
      setMyReaction(null);
    } else {
      if (prev) {
        counts[prev] = Math.max(0, (counts[prev] || 1) - 1);
        if (counts[prev] === 0) delete counts[prev];
        names[prev] = (names[prev] || []).filter(n => n !== currentUserName);
        if (!names[prev]?.length) delete names[prev];
      }
      counts[emoji] = (counts[emoji] || 0) + 1;
      users[currentUserId] = emoji;
      names[emoji] = [...new Set([...(names[emoji] || []), currentUserName])];
      setMyReaction(emoji);
    }
    await setDoc(ref, { counts, users, names }, { merge: false });
  };

  return (
    <div className="comment-reactions">
      {EMOJIS.map(e => (
        <div key={e} className="reaction-wrap"
          onMouseEnter={() => setTooltip(e)}
          onMouseLeave={() => setTooltip(null)}
        >
          <button className={`reaction-btn small ${myReaction === e ? 'active' : ''}`} onClick={() => handleReact(e)}>
            {e}{reactions[e] > 0 && <span className="reaction-count">{reactions[e]}</span>}
          </button>
          {tooltip === e && userMap[e]?.length > 0 && (
            <div className="reaction-tooltip">
              {userMap[e].length <= 3
                ? userMap[e].join(', ')
                : `${userMap[e].slice(0,3).join(', ')} y ${userMap[e].length - 3} más`}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function MatchComments({ matchId, currentUser }) {
  const [comments, setComments]   = useState([]);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [expanded, setExpanded]   = useState(false);
  const [count, setCount]         = useState(0);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  // Conteo sin cargar todos los comentarios
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'comment_counts', matchId), snap => {
      setCount(snap.exists() ? snap.data().count || 0 : 0);
    });
    return unsub;
  }, [matchId]);

  useEffect(() => {
    if (!expanded) return;
    const ref = query(collection(db, 'comments', matchId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(ref, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 100);
    });
    return unsub;
  }, [matchId, expanded]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'comments', matchId, 'messages'), {
        text: trimmed,
        userId: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL || null,
        createdAt: serverTimestamp(),
      });

      // Actualizar contador
      const countRef = doc(db, 'comment_counts', matchId);
      const countSnap = await getDoc(countRef);
      await setDoc(countRef, { count: (countSnap.exists() ? countSnap.data().count || 0 : 0) + 1 });

      // Notificaciones: avisar a los que comentaron antes (excepto yo)
      const snap = await getDocs(collection(db, 'comments', matchId, 'messages'));
      const notified = new Set();
      snap.docs.forEach(d => {
        const uid = d.data().userId;
        if (uid !== currentUser.uid && !notified.has(uid)) {
          notified.add(uid);
          const notifRef = doc(db, 'notifications', uid);
          getDoc(notifRef).then(ns => {
            setDoc(notifRef, {
              unread: (ns.exists() ? ns.data().unread || 0 : 0) + 1,
              lastFrom: currentUser.displayName,
              lastMatch: matchId,
              updatedAt: Date.now(),
            });
          });
        }
      });

      setText('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e) { console.error(e); }
    setSending(false);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <div className="match-comments">
      <button className="btn-comments-toggle" onClick={() => setExpanded(v => !v)}>
        💬 {count > 0 ? `${count} comentario${count !== 1 ? 's' : ''}` : 'Comentarios'} {expanded ? '▲' : '▼'}
      </button>

      {expanded && (
        <div className="comments-body">
          {comments.length === 0 && (
            <div className="comments-empty">Sé el primero en comentar 👇</div>
          )}
          <div className="comments-list" ref={listRef}>
            {comments.map(c => (
              <div key={c.id} className={`comment-row ${c.userId === currentUser.uid ? 'is-me' : ''}`}>
                <Avatar user={{ displayName: c.displayName, photoURL: c.photoURL }} />
                <div className="comment-bubble">
                  <div className="comment-meta">
                    <span className="comment-name">{c.displayName}</span>
                    <span className="comment-time">{timeAgo(c.createdAt?.toMillis?.() || c.createdAt)}</span>
                  </div>
                  <div className="comment-text">{c.text}</div>
                  <CommentReactions commentId={c.id} matchId={matchId} currentUserId={currentUser.uid} currentUserName={currentUser.displayName} />
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
