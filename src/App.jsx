import React, { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { usePredictions, useResults, useRanking, registerUser } from './hooks/useProde';
import { logout } from './lib/firebase';
import LoginPage from './components/LoginPage';
import PronosticosTab from './components/PronosticosTab';
import RankingTab from './components/RankingTab';
import AdminTab from './components/AdminTab';
import HistorialTab from './components/HistorialTab';
import { useNewResults } from './hooks/useNewResults';
import { useTheme } from './hooks/useTheme';
import CampeonModal, { CampeonBanner } from './components/CampeonModal';
import TablaTab from './components/TablaTab';
import FeedTab from './components/FeedTab';
import BracketTab from './components/BracketTab';
import AdminThirds from './components/AdminThirds';
import ProfileMenu from './components/ProfileMenu';
import { useNotifications } from './hooks/useNotifications';

// ─────────────────────────────────────────────────────────────────────────────
// 👉 USUARIOS PERMITIDOS — solo estos emails pueden ingresar a la app
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_EMAILS = [
  "javee03@gmail.com",
  "dolores.mansilla01@gmail.com",
  "melgarejorf@gmail.com"
];

// ─────────────────────────────────────────────────────────────────────────────
// 👉 ADMINS — estos UIDs pueden acceder al panel /admin para cargar resultados
//    Firebase Console → Authentication → Users → columna User UID
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_UIDS = [
  "NtYr9rClPcRoAfnTaaLNI6JYXqM2",
];

const IS_ADMIN_ROUTE = window.location.pathname === '/admin';

// ─────────────────────────────────────────────────────────────────────────────
// Componente raíz — solo maneja auth, no abre Firestore todavía
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="splash">⚽</div>;
  if (!user)   return <LoginPage />;

  // Si hay lista de emails y el usuario no está → mostrar pantalla de no autorizado
  if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(user.email)) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
          <div style={{ fontSize: 18, fontFamily: 'Bebas Neue, sans-serif', color: 'var(--c-accent)', letterSpacing: '0.04em' }}>
            Acceso no autorizado
          </div>
          <div style={{ fontSize: 13, marginTop: 8, color: 'var(--c-muted)' }}>
            Tu cuenta no está habilitada para participar.
          </div>
          <button
            onClick={() => logout().then(() => window.location.reload())}
            style={{ marginTop: 20, padding: '8px 20px', border: '1px solid var(--c-border2)', borderRadius: 8, background: 'var(--c-surface2)', color: 'var(--c-text)', cursor: 'pointer', fontSize: 13 }}
          >
            Salir
          </button>
        </div>
      </div>
    );
  }

  // Si intenta entrar a /admin sin ser admin → pantalla de acceso restringido
  if (IS_ADMIN_ROUTE && !ADMIN_UIDS.includes(user.uid)) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontFamily: 'Bebas Neue, sans-serif', color: 'var(--c-accent)', letterSpacing: '0.04em' }}>
            Acceso restringido
          </div>
          <div style={{ fontSize: 13, marginTop: 8, color: 'var(--c-muted)' }}>
            No tenés permiso para ver esta página.
          </div>
          <button
            onClick={() => window.location.href = '/'}
            style={{ marginTop: 20, padding: '8px 20px', border: '1px solid var(--c-border2)', borderRadius: 8, background: 'var(--c-surface2)', color: 'var(--c-text)', cursor: 'pointer', fontSize: 13 }}
          >
            Volver al prode
          </button>
        </div>
      </div>
    );
  }

  // Usuario autorizado → montamos los hooks de Firestore recién acá
  return <AuthorizedApp user={user} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Solo se monta si el usuario está autorizado — acá sí abrimos Firestore
// ─────────────────────────────────────────────────────────────────────────────
function AuthorizedApp({ user }) {
  const [tab, setTab] = useState(0);
  const { predictions, savePrediction } = usePredictions(user.uid);
  const { results, saveResult }         = useResults();
  const { ranking, loading: rankLoading } = useRanking();
  const { hasNew, markAsSeen } = useNewResults(user.uid);
  const { theme, toggleTheme } = useTheme();
  const [showCampeon, setShowCampeon] = useState(false);
  const [adminTab, setAdminTab] = useState(0);
  const { unread, markRead } = useNotifications(user.uid);

  useEffect(() => {
    registerUser(user);
  }, [user]);

  const isAdmin = ADMIN_UIDS.includes(user.uid);

  const LogoutBtn = () => (
    <button className="btn-logout" onClick={logout} title="Salir">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </button>
  );

  const UserAvatar = () => user.photoURL
    ? <img src={user.photoURL} alt={user.displayName} className="user-photo" referrerPolicy="no-referrer" />
    : <div className="user-initials">{(user.displayName || 'U')[0]}</div>;

  // ── Vista admin ───────────────────────────────────────────────────────────
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
            <button
              onClick={() => window.location.href = '/'}
              style={{ padding: '6px 12px', border: '1px solid var(--c-border2)', borderRadius: 8, background: 'transparent', color: 'var(--c-muted)', cursor: 'pointer', fontSize: 12 }}
            >
              ← Volver
            </button>
            <button onClick={toggleTheme} className="btn-theme" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <UserAvatar />
            <LogoutBtn />
          </div>
        </header>
        <nav className="tab-nav">
          {['Resultados', 'Terceros'].map((t, i) => (
            <button key={t} className={`tab-btn ${adminTab === i ? 'active' : ''}`} onClick={() => setAdminTab(i)}>{t}</button>
          ))}
        </nav>
        <main className="app-main">
          {adminTab === 0 && <AdminTab results={results} onSave={saveResult} />}
          {adminTab === 1 && <AdminThirds />}
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
          <CampeonBanner user={user} onClick={() => setShowCampeon(true)} />
          <button onClick={toggleTheme} className="btn-theme" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <ProfileMenu user={user} isAdmin={isAdmin} unread={unread} onOpen={markRead} />
        </div>
      </header>

      <nav className="tab-nav">
        {['Pronósticos', 'Resultados', 'Tabla', 'Fase Eliminatoria', 'Ranking', 'Feed'].map((t, i) => (
          <button
            key={t}
            className={`tab-btn ${tab === i ? 'active' : ''}`}
            onClick={() => { setTab(i); if (t === 'Ranking') markAsSeen(); }}
          >
            {t}{t === 'Ranking' && hasNew && <span className="tab-badge"> </span>}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 0 && (
          <PronosticosTab
            predictions={predictions}
            results={results}
            onSave={savePrediction}
            currentUid={user.uid}
            currentUser={user}
          />
        )}
        {tab === 1 && (
          <HistorialTab results={results} predictions={predictions} />
        )}
        {tab === 2 && (
          <TablaTab results={results} />
        )}
        {tab === 3 && (
          <BracketTab results={results} isAdmin={isAdmin} />
        )}
        {tab === 4 && (
          <RankingTab
            ranking={ranking}
            loading={rankLoading}
            currentUid={user.uid}
            currentUser={user}
          />
        )}
        {tab === 5 && <FeedTab currentUserId={user.uid} currentUserName={user.displayName} currentUser={user} />}
      </main>
      {showCampeon && <CampeonModal user={user} onClose={() => setShowCampeon(false)} />}
    </div>
  );
}
