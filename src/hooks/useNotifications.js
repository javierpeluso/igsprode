import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useNotifications(userId) {
  const [unread, setUnread] = useState(0);
  const [lastFrom, setLastFrom] = useState('');

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'notifications', userId), snap => {
      if (snap.exists()) {
        setUnread(snap.data().unread || 0);
        setLastFrom(snap.data().lastFrom || '');
      } else {
        setUnread(0);
      }
    });
    return unsub;
  }, [userId]);

  const markRead = async () => {
    await setDoc(doc(db, 'notifications', userId), { unread: 0 }, { merge: true });
    setUnread(0);
  };

  return { unread, lastFrom, markRead };
}
