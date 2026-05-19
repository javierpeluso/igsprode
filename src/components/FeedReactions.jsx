import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const EMOJIS = ['🔥', '😂', '😭', '👏', '⚡', '❤️​','😎​'];

function ReactionTooltip({ names }) {
  if (!names || names.length === 0) return null;
  const text = names.length <= 3
    ? names.join(', ')
    : `${names.slice(0, 3).join(', ')} y ${names.length - 3} más`;
  return <div className="reaction-tooltip">{text}</div>;
}

export default function FeedReactions({ eventId, currentUserId, currentUserName }) {
  const [reactions, setReactions] = useState({});   // { emoji: count }
  const [userMap, setUserMap]     = useState({});   // { emoji: [name, ...] }
  const [myReaction, setMyReaction] = useState(null);
  const [tooltip, setTooltip]     = useState(null); // emoji activo para tooltip

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'feed_reactions', eventId), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setReactions(data.counts || {});
        setUserMap(data.names  || {});
        setMyReaction(data.users?.[currentUserId] || null);
      }
    });
    return unsub;
  }, [eventId, currentUserId]);

  const handleReact = async (emoji) => {
    const ref  = doc(db, 'feed_reactions', eventId);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : { counts: {}, users: {}, names: {} };

    const counts = { ...data.counts };
    const users  = { ...data.users  };
    const names  = { ...data.names  };
    const prev   = users[currentUserId];

    if (prev === emoji) {
      // Quitar reacción
      counts[prev] = Math.max(0, (counts[prev] || 1) - 1);
      if (counts[prev] === 0) delete counts[prev];
      delete users[currentUserId];
      names[prev] = (names[prev] || []).filter(n => n !== currentUserName);
      if (!names[prev]?.length) delete names[prev];
      setMyReaction(null);
    } else {
      // Quitar anterior
      if (prev) {
        counts[prev] = Math.max(0, (counts[prev] || 1) - 1);
        if (counts[prev] === 0) delete counts[prev];
        names[prev] = (names[prev] || []).filter(n => n !== currentUserName);
        if (!names[prev]?.length) delete names[prev];
      }
      // Agregar nueva
      counts[emoji] = (counts[emoji] || 0) + 1;
      users[currentUserId] = emoji;
      names[emoji] = [...new Set([...(names[emoji] || []), currentUserName])];
      setMyReaction(emoji);
    }

    await setDoc(ref, { counts, users, names }, { merge: false });
  };

  return (
    <div className="feed-reactions">
      {EMOJIS.map(e => (
        <div key={e} className="reaction-wrap"
          onMouseEnter={() => setTooltip(e)}
          onMouseLeave={() => setTooltip(null)}
        >
          <button
            className={`reaction-btn ${myReaction === e ? 'active' : ''}`}
            onClick={() => handleReact(e)}
          >
            {e}
            {reactions[e] > 0 && <span className="reaction-count">{reactions[e]}</span>}
          </button>
          {tooltip === e && userMap[e]?.length > 0 && (
            <ReactionTooltip names={userMap[e]} />
          )}
        </div>
      ))}
    </div>
  );
}
