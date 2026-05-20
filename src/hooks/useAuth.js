import { useState, useEffect } from 'react';
import { onAuthStateChanged, getIdToken } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logout } from '../lib/firebase';

export function useAuth() {
  const [user, setUser]           = useState(undefined);
  const [isAllowed, setIsAllowed] = useState(undefined);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    let userUnsub = null;

    const authUnsub = onAuthStateChanged(auth, async (u) => {
      if (userUnsub) { userUnsub(); userUnsub = null; }

      if (!u) {
        setUser(null);
        setIsAllowed(null);
        // NO tocar isBlocked acá — conservarlo para mostrar la pantalla
        return;
      }

      try { await getIdToken(u); } catch (_) {}

      // Leer allowed_emails — cualquier usuario auth puede leerlo
      // Este doc también tiene el campo "blocked" si el admin bloqueó al usuario
      let allowed = false;
      let blocked = false;
      try {
        const allowedSnap = await getDoc(doc(db, 'allowed_emails', u.email));
        if (allowedSnap.exists()) {
          allowed = true;
          blocked = allowedSnap.data().blocked === true;
        }
      } catch (_) {}

      if (blocked) {
        setIsBlocked(true);
        setIsAllowed(false);
        setUser(u); // mantener user para que App muestre pantalla bloqueado, no login
        logout();
        return;
      }

      setIsAllowed(allowed);
      setIsBlocked(false);
      setUser(u);

      // Escuchar cambios en tiempo real sobre allowed_emails para detectar bloqueo
      userUnsub = onSnapshot(
        doc(db, 'allowed_emails', u.email),
        (snap) => {
          if (snap.exists() && snap.data().blocked === true) {
            setIsBlocked(true);
            setIsAllowed(false);
            logout();
          }
        },
        (_err) => {}
      );
    });

    return () => {
      authUnsub();
      if (userUnsub) userUnsub();
    };
  }, []);

  const loading = user === undefined || isAllowed === undefined;
  return { user, loading, isAllowed, isBlocked };
}
