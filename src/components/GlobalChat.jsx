import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, addDoc, onSnapshot, orderBy,
  query, limit, serverTimestamp, deleteDoc, doc, getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sendMentionNotification } from '../hooks/useNotifications';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return 'ahora';
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function Avatar({ user, size = 28 }) {
  const style = { width: size, height: size, flexShrink: 0 };
  if (user?.photoURL)
    return <img src={user.photoURL} alt={user.displayName} className="comment-avatar" style={style} referrerPolicy="no-referrer" />;
  const initials = (user?.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="comment-avatar comment-avatar-initials" style={style}>{initials}</div>;
}

// Parsea el texto y resalta las @menciones
function MessageText({ text }) {
  const parts = text.split(/(@\w[\w\s]*?\b(?=\s|$|[^a-zA-Z0-9_]))/g);
  return (
    <div className="comment-text">
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <span key={i} className="chat-mention-tag">{part}</span>
          : part
      )}
    </div>
  );
}

const CHAT_LIMIT = 80;

export default function GlobalChat({ currentUser, isAdmin }) {
  const [messages, setMessages]     = useState([]);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [expanded, setExpanded]     = useState(false);
  const [unread, setUnread]         = useState(0);
  const [users, setUsers]           = useState([]);       // todos los usuarios
  const [mentionQuery, setMentionQuery] = useState('');   // texto después del @
  const [mentionPos, setMentionPos]     = useState(null); // índice del @ en el texto
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownIdx, setDropdownIdx]   = useState(0);

  const bottomRef        = useRef(null);
  const inputRef         = useRef(null);
  const lastSeenCount    = useRef(0);

  // Cargar lista de usuarios una vez
  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      setUsers(snap.docs.map(d => ({
        uid: d.id,
        displayName: d.data().displayName || d.data().email || 'Usuario',
        photoURL: d.data().photoURL || null,
      })));
    });
  }, []);

  // Escuchar mensajes en tiempo real
  useEffect(() => {
    const ref = query(
      collection(db, 'global_chat'),
      orderBy('createdAt', 'asc'),
      limit(CHAT_LIMIT)
    );
    const unsub = onSnapshot(ref, snap => {
      const msgs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toMillis?.() || d.data().createdAt,
      }));
      setMessages(msgs);
      if (!expanded) {
        const newCount = msgs.length - lastSeenCount.current;
        if (newCount > 0) setUnread(prev => prev + newCount);
      }
    });
    return unsub;
  }, []); // solo se ejecuta al montar

  // Scroll al fondo al abrir o recibir mensajes
  useEffect(() => {
    if (expanded) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [messages, expanded]);

  const handleToggle = () => {
    setExpanded(v => {
      if (!v) {
        lastSeenCount.current = messages.length;
        setUnread(0);
      }
      return !v;
    });
  };

  // ── Lógica de @menciones ──────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    u.uid !== currentUser.uid &&
    u.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 6);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Detectar si hay un @ activo (el último @ antes del cursor)
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const atIdx = textBefore.lastIndexOf('@');

    if (atIdx !== -1) {
      const afterAt = textBefore.slice(atIdx + 1);
      // Solo activa si no hay espacio doble (sigue siendo una palabra)
      if (!afterAt.includes('  ') && afterAt.length <= 30) {
        setMentionPos(atIdx);
        setMentionQuery(afterAt);
        setShowDropdown(true);
        setDropdownIdx(0);
        return;
      }
    }
    setShowDropdown(false);
  };

  const insertMention = useCallback((user) => {
    if (mentionPos === null) return;
    const before = text.slice(0, mentionPos);
    const after  = text.slice(mentionPos + 1 + mentionQuery.length);
    const mention = `@${user.displayName}`;
    const newText = `${before}${mention} ${after}`;
    setText(newText);
    setShowDropdown(false);
    setMentionPos(null);
    setMentionQuery('');
    setTimeout(() => {
      inputRef.current?.focus();
      const pos = before.length + mention.length + 1;
      inputRef.current?.setSelectionRange(pos, pos);
    }, 10);
  }, [text, mentionPos, mentionQuery]);

  const handleKeyDown = (e) => {
    if (showDropdown && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setDropdownIdx(i => Math.min(i + 1, filteredUsers.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setDropdownIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filteredUsers[dropdownIdx]); return; }
      if (e.key === 'Escape') { setShowDropdown(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Extraer menciones del texto y notificar ───────────────────────────────
  const extractAndNotify = async (messageText) => {
    const mentionRegex = /@([\w][\w\s]*?\w|\w)/g;
    let match;
    const notified = new Set();
    while ((match = mentionRegex.exec(messageText)) !== null) {
      const name = match[1].trim();
      const mentioned = users.find(u =>
        u.uid !== currentUser.uid &&
        u.displayName.toLowerCase() === name.toLowerCase()
      );
      if (mentioned && !notified.has(mentioned.uid)) {
        notified.add(mentioned.uid);
        await sendMentionNotification({
          toUserId: mentioned.uid,
          fromUser: currentUser,
          messageText,
        });
      }
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'global_chat'), {
        text:        trimmed,
        userId:      currentUser.uid,
        displayName: currentUser.displayName,
        photoURL:    currentUser.photoURL || null,
        createdAt:   serverTimestamp(),
      });
      await extractAndNotify(trimmed);
      setText('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e) { console.error(e); }
    setSending(false);
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm('¿Eliminar este mensaje?')) return;
    try { await deleteDoc(doc(db, 'global_chat', msgId)); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="global-chat-wrap">
      {/* Header toggle */}
      <button className="global-chat-header" onClick={handleToggle}>
        <span className="global-chat-title">
          <span className="global-chat-icon">💬</span>
          Chat general
          {unread > 0 && !expanded && (
            <span className="global-chat-badge">{unread > 9 ? '9+' : unread}</span>
          )}
        </span>
        <span className="global-chat-chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="global-chat-body">
          {/* Mensajes */}
          <div className="global-chat-messages">
            {messages.length === 0 && (
              <div className="global-chat-empty">Nadie habló todavía. ¡Rompé el hielo! 🧊</div>
            )}
            {messages.map((m, idx) => {
              const isMe = m.userId === currentUser.uid;
              const prevSame = idx > 0 && messages[idx - 1].userId === m.userId;
              return (
                <div key={m.id} className={`global-chat-row ${isMe ? 'is-me' : ''} ${prevSame ? 'same-user' : ''}`}>
                  {!isMe && !prevSame && <Avatar user={{ displayName: m.displayName, photoURL: m.photoURL }} />}
                  {!isMe && prevSame  && <div className="global-chat-avatar-spacer" />}
                  <div className="global-chat-bubble">
                    {!prevSame && (
                      <div className="comment-meta">
                        {!isMe && <span className="comment-name">{m.displayName}</span>}
                        <span className="comment-time">{timeAgo(m.createdAt)}</span>
                        {(isAdmin || isMe) && (
                          <button className="comment-delete-btn" onClick={() => handleDelete(m.id)} title="Eliminar">🗑</button>
                        )}
                      </div>
                    )}
                    <MessageText text={m.text} />
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input con dropdown de menciones */}
          <div className="chat-input-wrap">
            {showDropdown && filteredUsers.length > 0 && (
              <div className="chat-mention-dropdown">
                <div className="chat-mention-hint">Usuarios — ↑↓ navegar · Enter o Tab para elegir</div>
                {filteredUsers.map((u, i) => (
                  <button
                    key={u.uid}
                    className={`chat-mention-option ${i === dropdownIdx ? 'active' : ''}`}
                    onMouseDown={e => { e.preventDefault(); insertMention(u); }}
                    onMouseEnter={() => setDropdownIdx(i)}
                  >
                    <Avatar user={u} size={22} />
                    <span>{u.displayName}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="comment-input-row">
              <Avatar user={{ displayName: currentUser.displayName, photoURL: currentUser.photoURL }} />
              <div className="chat-input-inner">
                <input
                  ref={inputRef}
                  className="comment-input"
                  type="text"
                  placeholder="Escribí algo… usá @ para mencionar"
                  value={text}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  maxLength={400}
                  autoFocus
                />
              </div>
              <button
                className={`btn-send-comment ${!text.trim() ? 'disabled' : ''}`}
                onClick={handleSend}
                disabled={!text.trim() || sending}
              >
                {sending ? '…' : '→'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
