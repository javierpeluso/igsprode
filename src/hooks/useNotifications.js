import { useState, useEffect } from 'react';
import {
  doc, onSnapshot, setDoc, updateDoc, getDoc,
  collection, addDoc, query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Envía una notificación de mención a un usuario
export async function sendMentionNotification({ toUserId, fromUser, messageText }) {
  // Agregar al subcolección de notificaciones detalladas
  await addDoc(collection(db, 'notifications', toUserId, 'items'), {
    type: 'mention',
    fromUid:         fromUser.uid,
    fromName:        fromUser.displayName,
    fromPhotoURL:    fromUser.photoURL || null,
    messageText,
    createdAt:       serverTimestamp(),
    read:            false,
  });

  // Incrementar contador unread en el doc raíz
  const rootRef = doc(db, 'notifications', toUserId);
  const snap = await getDoc(rootRef);
  const current = snap.exists() ? (snap.data().unread || 0) : 0;
  await setDoc(rootRef, { unread: current + 1 }, { merge: true });
}

export function useNotifications(userId) {
  const [unread, setUnread]       = useState(0);
  const [items, setItems]         = useState([]);
  const [lastFrom, setLastFrom]   = useState('');

  // Contador raíz (liviano, siempre activo)
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

  // Notificaciones detalladas (últimas 20)
  useEffect(() => {
    if (!userId) return;
    const ref = query(
      collection(db, 'notifications', userId, 'items'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(ref, snap => {
      setItems(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toMillis?.() || d.data().createdAt,
      })));
    });
    return unsub;
  }, [userId]);

  const markRead = async () => {
    await setDoc(doc(db, 'notifications', userId), { unread: 0 }, { merge: true });
    setUnread(0);
  };

  return { unread, lastFrom, items, markRead };
}
