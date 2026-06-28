import React, { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { usePredictions, useResults, useRanking, registerUser } from './hooks/useProde';
import { logout, db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import LoginPage from './components/LoginPage';
import PronosticosTab from './components/PronosticosTab';
import RankingTab from './components/RankingTab';
import AdminTab, { AdminFinalizadosTab } from './components/AdminTab';
import HistorialTab from './components/HistorialTab';
import { useNewResults, useAutoRefresh, publishNewVersion } from './hooks/useNewResults';
import { useTheme } from './hooks/useTheme';
import CampeonModal, { CampeonBanner } from './components/CampeonModal';
import TablaTab from './components/TablaTab';
import TabNav from './components/TabNav';
import BracketTab from './components/BracketTab';
import AdminThirds from './components/AdminThirds';
import AdminKnockout from './components/AdminKnockout';
import AdminPredictions from './components/AdminPredictions';
import AdminKnockoutPredictions from './components/AdminKnockoutPredictions';
import AdminPredictionHistory from './components/AdminPredictionHistory';
import AdminUsers from './components/AdminUsers';
import AdminRankingDetalle from './components/AdminRankingDetalle';
import ProfileMenu from './components/ProfileMenu';
import StatsPage from './components/StatsPage';
import AdminPlayerStats from './components/AdminPlayerStats';
import ResultsNotificationModal from './components/ResultsNotificationModal';
import GroupStageRecapModal, { useGroupStageRecap } from './components/GroupStageRecapModal';
import KnockoutTutorialModal, { useKnockoutTutorial } from './components/KnockoutTutorialModal';
import PaymentWarningBanner from './components/PaymentWarningBanner';
import CampeonWarningBanner from './components/CampeonWarningBanner';
import { Analytics } from "@vercel/analytics/react"

// ─────────────────────────────────────────────────────────────────────────────
// 👉 USUARIOS PERMITIDOS — solo estos emails pueden ingresar a la app
// ─────────────────────────────────────────────────────────────────────────────
// ALLOWED_EMAILS ya no se usa — los emails se gestionan desde el panel Admin → Usuarios
// y se guardan en Firestore en /allowed_emails

// ─────────────────────────────────────────────────────────────────────────────
// 👉 ADMINS — estos UIDs pueden acceder al panel /admin para cargar resultados
//    Firebase Console → Authentication → Users → columna User UID
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_UIDS = [
  "NtYr9rClPcRoAfnTaaLNI6JYXqM2" 
];

const IS_ADMIN_ROUTE = window.location.pathname === '/admin';

// ─────────────────────────────────────────────────────────────────────────────
// Componente raíz — solo maneja auth, no abre Firestore todavía
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, isAllowed, isBlocked } = useAuth();

  if (loading) return <div className="splash"><img src="https://res.cloudinary.com/dzof25mgq/image/upload/v1779284221/copa_del_mundo_sfms28.png" alt="Copa del Mundo" className="splash-img" /></div>;

  // Pantalla de cuenta bloqueada — aparece siempre, sin importar el estado de auth
  if (isBlocked) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontFamily: 'Bebas Neue, sans-serif', color: 'var(--c-accent)', letterSpacing: '0.04em' }}>
            Tu cuenta fue bloqueada
          </div>
          <div style={{ fontSize: 13, marginTop: 8, color: 'var(--c-muted)' }}>
            No podés acceder a la app. Contactá al administrador.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '8px 20px', border: '1px solid var(--c-border2)', borderRadius: 8, background: 'var(--c-surface2)', color: 'var(--c-text)', cursor: 'pointer', fontSize: 13 }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  // Si el usuario no está autorizado (no figura en allowed_emails) → pantalla de no autorizado
  if (isAllowed === false) {
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
  return (
    <>
      <AuthorizedApp user={user} />
      <Analytics />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Solo se monta si el usuario está autorizado — acá sí abrimos Firestore
// ─────────────────────────────────────────────────────────────────────────────
function AuthorizedApp({ user }) {
  const [tab, setTab] = useState(0);
  const { predictions, savePrediction, saveKnockoutPrediction } = usePredictions(user);
  const { results, saveResult, saveKnockoutResult } = useResults();
  const { ranking, loading: rankLoading } = useRanking();
  const { hasNew, markAsSeen } = useNewResults(user.uid);
  const { theme, toggleTheme } = useTheme();
  const { newVersionAvailable } = useAutoRefresh();
  const [showCampeon, setShowCampeon] = useState(false);
  const [adminTab, setAdminTab] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [paymentWarning, setPaymentWarning] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [tablaView, setTablaView] = useState('grupos'); // 'grupos' | 'eliminatoria' — controlado desde App para que el tutorial pueda navegarlo

  const { shouldShow: recapShouldShow, recapData, markSeen: markRecapSeen } = useGroupStageRecap(user.uid, predictions, results);
  const { shouldShow: tutorialShouldShow, markSeen: markTutorialSeen } = useKnockoutTutorial(user.uid);

  // Mostrar el modal al entrar si hay resultados nuevos
  // Solo se activa una vez por sesión (cuando hasNew pasa a true por primera vez)

  const [modalShown, setModalShown] = useState(false);
  useEffect(() => {
    if (hasNew && !modalShown) {
      setShowResultsModal(true);
      setModalShown(true);
    }
  }, [hasNew, modalShown]);

  // Mostrar el recap de fase de grupos (una sola vez por sesión)
  // Usamos recapPending para desacoplar el "saber que hay recap" del "mostrarlo":
  // el recap puede estar listo al mismo tiempo que showResultsModal es true,
  // por eso no tomamos la decisión de mostrar en el mismo effect que detecta la condición.
  const [recapPending, setRecapPending] = useState(false);
  const [recapModalShown, setRecapModalShown] = useState(false);

  // Effect 1: detecta cuándo el recap está disponible y lo marca como pendiente
  useEffect(() => {
    if (recapShouldShow && recapData && !recapModalShown) {
      setRecapPending(true);
    }
  }, [recapShouldShow, recapData, recapModalShown]);

  // Effect 2: abre el recap en cuanto no haya otro modal bloqueando
  useEffect(() => {
    if (recapPending && !showResultsModal) {
      setShowRecap(true);
      setRecapModalShown(true);
      setRecapPending(false);
    }
  }, [recapPending, showResultsModal]);

  useEffect(() => {
    registerUser(user);
  }, [user]);

  // Escucha en tiempo real si el admin activó advertencia de pago
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setPaymentWarning(!!snap.data().paymentWarning);
    });
    return () => unsub();
  }, [user.uid]);

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

  // ── Vista estadísticas ───────────────────────────────────────────────────
  if (showStats) return (
    <>
      <StatsPage user={user} onBack={() => setShowStats(false)} />
      <Analytics />
    </>
  );

  // ── Vista estadísticas de jugadores (solo admins) ───────────────────────────
  if (showPlayerStats) return (
    <>
      <AdminPlayerStats adminUids={ADMIN_UIDS} onBack={() => setShowPlayerStats(false)} />
      <Analytics />
    </>
  );

  // ── Vista admin ───────────────────────────────────────────────────────────
  if (IS_ADMIN_ROUTE) {
    return (
      <div className="app">
        {newVersionAvailable && (
          <div className="new-version-banner">
            🔄 Nueva versión detectada — recargando…
          </div>
        )}
        <header className="app-header">
          <div className="header-brand">
            <span className="header-logo"><img src="https://res.cloudinary.com/dzof25mgq/image/upload/v1779283704/ChatGPT_Image_20_may_2026_10_26_56_a.m._va0fay.png" alt="Logo" className="header-logo-img" /></span>
            <div>
              <div className="header-title">Admin — Cargar Resultados</div>
            </div>
          </div>
          <div className="header-user">
            <button onClick={toggleTheme} className="btn-theme" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <ProfileMenu user={user} isAdmin={true} onShowStats={() => {}} onShowPlayerStats={() => setShowPlayerStats(true)} />
          </div>
        </header>
        <div className="app-body">
          <TabNav
            tabs={['Resultados', 'Finalizados', 'Eliminatoria', 'Pronósticos', 'Pron. Elim.', 'Historial', 'Usuarios', 'Terceros', 'Ranking', 'Ranking Admin'].map(t => ({ label: t }))}
            activeIndex={adminTab}
            onChange={setAdminTab}
            extra={
              <button
                className="tab-btn tab-btn-publish"
                title="Fuerza un reload en todos los navegadores que tienen la app abierta"
                onClick={async () => {
                  await publishNewVersion();
                  alert('✅ Versión publicada — todos los clientes recargarán en breve.');
                }}
              >
                🚀 Publicar versión
              </button>
            }
          />
          <main className="app-main">
            {adminTab === 0 && <AdminTab results={results} onSave={saveResult} />}
            {adminTab === 1 && <AdminFinalizadosTab results={results} onSave={saveResult} />}
            {adminTab === 2 && <AdminKnockout results={results} onSaveKnockout={saveKnockoutResult} />}
            {adminTab === 3 && <AdminPredictions />}
            {adminTab === 4 && <AdminKnockoutPredictions results={results} />}
            {adminTab === 5 && <AdminPredictionHistory />}
            {adminTab === 6 && <AdminUsers adminUids={ADMIN_UIDS} />}
            {adminTab === 7 && <AdminThirds />}
            {adminTab === 8 && <RankingTab ranking={ranking} loading={rankLoading} currentUid={user.uid} adminUids={ADMIN_UIDS} />}
            {adminTab === 9 && <AdminRankingDetalle adminUids={ADMIN_UIDS} />}
          </main>
        </div>
        <Analytics />
      </div>
    );
  }

  // ── Vista usuario normal ──────────────────────────────────────────────────
  return (
    <div className="app">
      {newVersionAvailable && (
        <div className="new-version-banner">
          🔄 Nueva versión disponible — recargando…
        </div>
      )}
      {paymentWarning && <PaymentWarningBanner key={String(paymentWarning)} />}
      <CampeonWarningBanner user={user} onSelect={() => setShowCampeon(true)} />
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo"><img src="https://res.cloudinary.com/dzof25mgq/image/upload/v1779283704/ChatGPT_Image_20_may_2026_10_26_56_a.m._va0fay.png" alt="Logo" className="header-logo-img" /></span>
          <div>
            <div className="header-title">Prode Mundial 2026</div>
            <div className="header-sub"><span className="header-sub-date">11 jun – 19 jul</span><span className="header-sub-flags"><span className="fi fi-us" /><span className="fi fi-mx" /><span className="fi fi-ca" /></span></div>
          </div>
        </div>
        <div className="header-user">
          <CampeonBanner user={user} onClick={() => setShowCampeon(true)} />
          <button onClick={toggleTheme} className="btn-theme" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <ProfileMenu user={user} isAdmin={isAdmin} onShowStats={() => setShowStats(true)} onShowPlayerStats={() => setShowPlayerStats(true)} />
        </div>
      </header>

      <div className="app-body">
        <TabNav
          tabs={[
            { label: 'Pronósticos' },
            { label: 'Resultados' },
            { label: 'Tabla' },
            { label: 'Fase Eliminatoria' },
            { label: 'Ranking', badge: hasNew },
          ]}
          activeIndex={tab}
          onChange={(i) => { setTab(i); if (i === 4) markAsSeen(); }}
        />

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
            <TablaTab results={results} view={tablaView} onViewChange={setTablaView} />
          )}
          {tab === 3 && (
            <BracketTab
              results={results}
              isAdmin={isAdmin}
              predictions={predictions}
              onSaveKnockoutPrediction={saveKnockoutPrediction}
            />
          )}
          {tab === 4 && (
            <RankingTab
              ranking={ranking}
              loading={rankLoading}
              currentUid={user.uid}
              currentUser={user}
              adminUids={ADMIN_UIDS}
            />
          )}
        </main>
      </div>
      {showCampeon && <CampeonModal user={user} onClose={() => setShowCampeon(false)} />}
      {showResultsModal && (
        <ResultsNotificationModal
          onClose={() => {
            setShowResultsModal(false);
            markAsSeen();
          }}
          onGoToRanking={() => {
            setShowResultsModal(false);
            markAsSeen();
            setTab(4); // Tab Ranking
          }}
        />
      )}
      {tutorialShouldShow && !showResultsModal && !showRecap && (
        <KnockoutTutorialModal
          onClose={() => markTutorialSeen()}
          onNavigate={(targetTab, targetView) => {
            setTab(targetTab);
            if (targetView !== undefined) setTablaView(targetView);
          }}
        />
      )}
      {showRecap && recapData && !showResultsModal && (
        <GroupStageRecapModal
          data={recapData}
          ranking={ranking}
          currentUid={user.uid}
          onClose={() => {
            setShowRecap(false);
            markRecapSeen();
          }}
        />
      )}
      <Analytics />
    </div>
  );
}
