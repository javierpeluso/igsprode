import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// 👉 PASO 1: Reemplazá estos valores con los de tu proyecto Firebase
//    Ir a: https://console.firebase.google.com → Tu proyecto → Configuración del proyecto → SDK
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCw4iYINzl0y2GSVVPljIZiAuxv2evet7w",
  authDomain: "igsprode.firebaseapp.com",
  projectId: "igsprode",
  storageBucket: "igsprode.firebasestorage.app",
  messagingSenderId: "341053597339",
  appId: "1:341053597339:web:8162ae4c6cfcbef3fec83e",
  measurementId: "G-4T09WE9JKY"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
