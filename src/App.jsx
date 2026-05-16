import React, { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { usePredictions, useResults, useRanking, registerUser } from './hooks/useProde';
import { logout } from './lib/firebase';
import LoginPage from './components/LoginPage';
import PronosticosTab from './components/PronosticosTab';
import RankingTab from './components/RankingTab';
import AdminTab from './components/AdminTab';

// ─────────────────────────────────────────────────────────────────────────────
// Panel de admin: accedé a /admin en la URL para cargar resultados reales.
// Ejemplo: http://localhost:3000/admin  o  https://tu-app.vercel.app/admin
// ─────────────────────────────────────────────────────────────────────────────
const IS_ADMIN_ROUTE = window.location.pathname === '/admin';
console.log("pathname:", window.location.pathname);
console.log("IS_ADMIN_ROUTE:", IS_ADMIN_ROUTE);
const ADMIN_UIDS = [
  "NtYr9rClPcRoAfnTaaLNI6JYXqM2",
];
export default function App() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState(0);

  const { predictions, savePrediction } = usePredictions(user?.uid);
  const { results, saveResult } = useResults();
  const { ranking, loading: rankLoading } = useRanking();

  useEffect(() => {
    if (user) registerUser(user);
  }, [user]);

  if (loading) return <div className="splash">⚽</div>;
  if (!user) return <LoginPage />;

  console.log("UID del usuario logueado:", user.uid);
console.log("¿Es admin?:", ADMIN_UIDS.includes(user.uid));

  // ── Vista admin (/admin) ──────────────────────────────────────────────────
    if (IS_ADMIN_ROUTE && !ADMIN_UIDS.includes(user.uid)) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center', color: '#888' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontFamily: 'Bebas Neue, sans-serif', color: '#e8c84a', letterSpacing: '0.04em' }}>Acceso restringido</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>No tenés permiso para ver esta página.</div>
          <button onClick={() => window.location.href = '/'} style={{ marginTop: 20, padding: '8px 20px', border: '1px solid #3a3a3a', borderRadius: 8, background: '#1e1e1e', color: '#f0f0f0', cursor: 'pointer', fontSize: 13 }}>
            Volver al prode
          </button>
        </div>
      </div>
    );
  }

  if (IS_ADMIN_ROUTE) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-brand">
            <span className="header-logo">⚽</span>
            <div>
              <div className="header-title">Admin — Cargar Resultados</div>
              <div className="header-sub">Solo vos ves esta pantalla</div>
            </div>
          </div>
          <div className="header-user">
            {user.photoURL
              ? <img src={user.photoURL} alt={user.displayName} className="user-photo" referrerPolicy="no-referrer" />
              : <div className="user-initials">{(user.displayName || 'U')[0]}</div>
            }
            <button className="btn-logout" onClick={logout} title="Salir">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </header>
        <main className="app-main">
          <AdminTab results={results} onSave={saveResult} />
        </main>
      </div>
    );
  }

  // ── Vista usuario normal ──────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo">⚽</span>
          <div>
            <div className="header-title">Prode Mundial 2026</div>
            <div className="header-sub">11 jun – 19 jul · EE.UU., México y Canadá</div>
          </div>
        </div>
        <div className="header-user">
          {user.photoURL
            ? <img src={user.photoURL} alt={user.displayName} className="user-photo" referrerPolicy="no-referrer" />
            : <div className="user-initials">{(user.displayName || 'U')[0]}</div>
          }
          {ADMIN_UIDS.includes(user.uid) && (
            <button onClick={() => window.location.href = '/admin'}
              style={{ padding: '6px 12px', border: '1px solid #e8c84a', borderRadius: 8, background: 'transparent', color: '#e8c84a', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            title="Panel de admin">
              Admin
            </button>
      )}
          <button className="btn-logout" onClick={logout} title="Salir">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <nav className="tab-nav">
        {['Pronósticos', 'Ranking'].map((t, i) => (
          <button
            key={t}
            className={`tab-btn ${tab === i ? 'active' : ''}`}
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 0 && (
          <PronosticosTab
            predictions={predictions}
            results={results}
            onSave={savePrediction}
          />
        )}
        {tab === 1 && (
          <RankingTab
            ranking={ranking}
            loading={rankLoading}
            currentUid={user.uid}
          />
        )}
      </main>
    </div>
  );
}
