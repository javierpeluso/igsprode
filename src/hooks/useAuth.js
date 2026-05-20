import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logout } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useAuth() {
  const [user, setUser]           = useState(undefined);
  const [isAllowed, setIsAllowed] = useState(undefined);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    let emailUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (u) => {
      if (emailUnsub) { emailUnsub(); emailUnsub = null; }

      if (!u) {
        setUser(null);
        setIsAllowed(null);
        return;
      }

      setUser(u);

      // onSnapshot se reconecta automáticamente cuando el token está listo
      emailUnsub = onSnapshot(
        doc(db, 'allowed_emails', u.email),
        (snap) => {
          if (!snap.exists()) {
            setIsAllowed(false);
            return;
          }
          const { blocked } = snap.data();
          if (blocked) {
            setIsBlocked(true);
            setIsAllowed(false);
            logout();
          } else {
            setIsAllowed(true);
            setIsBlocked(false);
          }
        },
        (_err) => { setIsAllowed(false); }
      );
    });

    return () => {
      authUnsub();
      if (emailUnsub) emailUnsub();
    };
  }, []);

  const loading = user === undefined || isAllowed === undefined;
  return { user, loading, isAllowed, isBlocked };
}