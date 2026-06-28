import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Firestore ──────────────────────────────────────────────────────────────────
const TUTORIAL_DOC = (uid) => doc(db, '_meta_tutorial', uid);
const TUTORIAL_KEY = 'knockoutTutorial_v1';

export function useKnockoutTutorial(userId) {
  const [shouldShow, setShouldShow] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!userId || checkedRef.current) return;
    checkedRef.current = true;
    async function check() {
      try {
        const snap = await getDoc(TUTORIAL_DOC(userId));
        if (!snap.exists() || !snap.data()[TUTORIAL_KEY]) setShouldShow(true);
      } catch (e) {
        console.error('[knockoutTutorial]', e);
      }
    }
    check();
  }, [userId]);

  const markSeen = useCallback(async () => {
    setShouldShow(false);
    if (!userId) return;
    try {
      await setDoc(TUTORIAL_DOC(userId), { [TUTORIAL_KEY]: true, seenAt: Date.now() }, { merge: true });
    } catch (e) {
      console.error('[knockoutTutorial] markSeen', e);
    }
  }, [userId]);

  return { shouldShow, markSeen };
}

// ─── Pasos ──────────────────────────────────────────────────────────────────────
// pointer: { desktop, mobile }
//   cada uno: { selector, side }
//   side: 'right' = flecha viene de la derecha apuntando hacia la izquierda (→ ←)
//         'left'  = flecha viene de la izquierda apuntando hacia la derecha (← →)
//         'top'   = flecha viene de arriba apuntando hacia abajo
//         'bottom'= flecha viene de abajo apuntando hacia arriba
const STEPS = [
  {
    nav: null,
    icon: '⚡',
    title: 'Llegó la fase eliminatoria',
    body: 'En 4 pasos rápidos verás las novedades.',
    cta: 'Empezar',
    pointer: null,
  },
  {
    // Tab "Tabla" activa en el menú lateral / toggle
    nav: { tab: 2, view: 'grupos' },
    icon: '📊',
    title: 'Estás en la Tab Tabla',
    body: 'Fijate en el filtro de arriba: hay una sección nueva, ⚡ Eliminatoria.',
    cta: 'Siguiente',
    pointer: {
      desktop: { selector: '.tab-btn.active', side: 'right' },   // apunta al ítem del sidebar desde la derecha
      mobile:  { selector: '.tab-nav-toggle',  side: 'right' },  // apunta al toggle del menú
    },
  },
  {
    // Filtro Eliminatoria dentro de TablaTab
    nav: { tab: 2, view: 'eliminatoria' },
    icon: '⚡',
    title: 'Clasificados y cruces',
    body: 'Con ese filtro activo ves los equipos que avanzaron y los cruces.',
    cta: 'Siguiente',
    pointer: {
      desktop: { selector: '.tab-content',  side: 'top' },
      mobile:  { selector: '.tab-content',  side: 'top' },
    },
  },
  {
    // Primera card de pronóstico
    nav: { tab: 3, view: undefined },
    icon: '🏆',
    title: 'Cards de pronóstico nuevas',
    body: 'Una card por partido. Elegís ganador, resultado y penales si hay definición.',
    cta: 'Siguiente',
    pointer: {
      desktop: { selector: '.kmc-card', side: 'top' },
      mobile:  { selector: '.kmc-card', side: 'top' },
    },
  },
  {
    nav: { tab: 3, view: undefined },
    icon: '🔒',
    title: 'Sin modificaciones',
    body: 'Los resultados una vez cargados no se pueden modificar. Cada partido se cierra 10 min antes del inicio.',
    cta: '¡Entendido!',
    warning: true,
    pointer: {
      desktop: { selector: '.kmc-card', side: 'top' },
      mobile:  { selector: '.kmc-card', side: 'top' },
    },
  },
];

// ─── Hook: detecta si es desktop (≥900px) ──────────────────────────────────────
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900);
  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 900);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isDesktop;
}

// ─── Hook: posición del puntero ────────────────────────────────────────────────
function usePointerPos(pointer, idx) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!pointer?.selector) { setPos(null); return; }
    let cancelled = false;

    function compute() {
      if (cancelled) return;
      const el = document.querySelector(pointer.selector);
      if (!el) { setPos(null); return; }
      const r = el.getBoundingClientRect();
      setPos({ top: r.top, left: r.left, width: r.width, height: r.height, side: pointer.side });
    }

    compute();
    const t1 = setTimeout(compute, 150);
    const t2 = setTimeout(compute, 450);
    return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); };
  }, [pointer?.selector, pointer?.side, idx]);

  return pos;
}

// ─── Puntero animado ────────────────────────────────────────────────────────────
function Pointer({ pos }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    if (!pos) return;
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, [pos]);

  if (!pos) return null;

  const { top, left, width, height, side } = pos;
  const SIZE = 44;   // tamaño del área SVG
  const GAP  = 10;   // espacio entre punta y borde del elemento

  // El contenedor se posiciona de modo que la PUNTA de la flecha toque el elemento
  let cx = 0, cy = 0;
  // rotación de la flecha SVG:
  // base: flecha apunta hacia ABAJO (↓)
  // right → la flecha viene de la derecha y apunta hacia la izquierda (←) = rotate -90
  // left  → flecha apunta a la derecha (→) = rotate 90
  // top   → flecha apunta hacia abajo (↓) = rotate 0
  // bottom→ flecha apunta hacia arriba (↑) = rotate 180
  let rotate = 0;

  if (side === 'top') {
    // Flecha encima del elemento, apuntando hacia abajo
    rotate = 0;
    cx = left + width / 2 - SIZE / 2;
    cy = top - SIZE - GAP;
  } else if (side === 'bottom') {
    rotate = 180;
    cx = left + width / 2 - SIZE / 2;
    cy = top + height + GAP;
  } else if (side === 'right') {
    // Flecha a la DERECHA del elemento, apuntando hacia la izquierda (←)
    rotate = 90;  // rotamos ↓ → apunta a la izquierda cuando el usuario ve la pantalla normal
    cx = left + width + GAP;
    cy = top + height / 2 - SIZE / 2;
  } else if (side === 'left') {
    rotate = -90;
    cx = left - SIZE - GAP;
    cy = top + height / 2 - SIZE / 2;
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: cx,
        top: cy,
        width: SIZE,
        height: SIZE,
        zIndex: 10001,
        pointerEvents: 'none',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.3s ease, left 0.25s ease, top 0.25s ease',
      }}
    >
      {/* Halo pulsante centrado en el área */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 36, height: 36,
        marginTop: -18, marginLeft: -18,
        borderRadius: '50%',
        background: 'rgba(99,207,139,0.18)',
        animation: 'tut-halo 1.5s ease-out infinite',
      }} />

      {/* Flecha SVG */}
      <svg
        width={SIZE} height={SIZE}
        viewBox="0 0 44 44"
        style={{
          position: 'relative',
          transform: `rotate(${rotate}deg)`,
          filter: 'drop-shadow(0 1px 6px rgba(99,207,139,0.7))',
          animation: `tut-nudge-${side} 0.9s ease-in-out infinite`,
        }}
      >
        {/* Cuerpo de la flecha apuntando hacia abajo */}
        <line x1="22" y1="8"  x2="22" y2="32" stroke="#63cf8b" strokeWidth="4" strokeLinecap="round" />
        <polyline points="13,23 22,34 31,23" stroke="#63cf8b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>

      <style>{`
        @keyframes tut-halo {
          0%   { transform: scale(0.5); opacity: 0.8; }
          80%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes tut-nudge-top    { 0%,100%{transform:rotate(0deg)   translateY(0)}   50%{transform:rotate(0deg)   translateY(4px)} }
        @keyframes tut-nudge-bottom { 0%,100%{transform:rotate(180deg) translateY(0)}   50%{transform:rotate(180deg) translateY(4px)} }
        @keyframes tut-nudge-right  { 0%,100%{transform:rotate(90deg)  translateY(0)}   50%{transform:rotate(90deg)  translateY(4px)} }
        @keyframes tut-nudge-left   { 0%,100%{transform:rotate(-90deg) translateY(0)}   50%{transform:rotate(-90deg) translateY(4px)} }
      `}</style>
    </div>
  );
}

// ─── Highlight outline ──────────────────────────────────────────────────────────
function useHighlight(selector, active) {
  useEffect(() => {
    if (!selector || !active) return;
    const el = document.querySelector(selector);
    if (!el) return;
    const prev = { outline: el.style.outline, outlineOffset: el.style.outlineOffset, transition: el.style.transition };
    el.style.transition = 'outline 0.2s';
    el.style.outline = '2px solid rgba(99,207,139,0.7)';
    el.style.outlineOffset = '3px';
    return () => Object.assign(el.style, prev);
  }, [selector, active]);
}

// ─── Contenido del paso ─────────────────────────────────────────────────────────
function StepContent({ step, idx, total, onNext, onPrev }) {
  const isFirst = idx === 0;
  return (
    <>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            height: 3, flex: 1, borderRadius: 2,
            background: i < idx ? '#63cf8b' : i === idx ? 'rgba(99,207,139,0.55)' : 'rgba(255,255,255,0.08)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{step.icon}</span>
        <div style={{ flex: 1, fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, letterSpacing: '0.05em', lineHeight: 1.2, color: 'var(--c-text, #f0ead6)' }}>
          {step.title}
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginTop: 4 }}>
          {idx + 1}/{total}
        </span>
      </div>

      <div style={{ fontSize: 14, color: 'var(--c-muted, rgba(255,255,255,0.55))', lineHeight: 1.65, marginBottom: 14, paddingLeft: 32 }}>
        {step.body}
      </div>

      {step.warning && (
        <div style={{ marginLeft: 32, marginBottom: 14, padding: '7px 12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.28)', borderRadius: 8, fontSize: 12, color: '#fca5a5', fontWeight: 500 }}>
          ⚠️ Cierre automático — sin excepciones
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, paddingLeft: 32 }}>
        {!isFirst && <button onClick={onPrev} style={btnBase('back')}>←</button>}
        <button onClick={onNext} style={btnBase(step.warning ? 'warn' : 'primary')}>{step.cta}</button>
      </div>
    </>
  );
}

// ─── MOBILE: bottom sheet ───────────────────────────────────────────────────────
function MobileSheet({ step, idx, total, onNext, onPrev, visible }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 9999,
      transform: visible ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
      background: 'var(--c-surface, #0d1a10)',
      borderTop: '1px solid rgba(99,207,139,0.4)',
      boxShadow: '0 -16px 56px rgba(0,0,0,0.85)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #63cf8b 40%, transparent)', opacity: 0.6 }} />
      <div style={{ padding: '16px 20px 20px' }}>
        <StepContent step={step} idx={idx} total={total} onNext={onNext} onPrev={onPrev} />
      </div>
    </div>
  );
}

// ─── DESKTOP: card centrada ─────────────────────────────────────────────────────
function DesktopCard({ step, idx, total, onNext, onPrev, visible }) {
  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: visible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -48%) scale(0.96)',
      opacity: visible ? 1 : 0,
      zIndex: 9999, width: 380,
      transition: 'transform 0.28s cubic-bezier(.34,1.2,.64,1), opacity 0.2s ease',
      background: 'var(--c-surface, #0d1a10)',
      border: '1px solid rgba(99,207,139,0.5)',
      borderRadius: 18,
      boxShadow: '0 12px 64px rgba(0,0,0,0.85), 0 0 40px rgba(99,207,139,0.07)',
      overflow: 'hidden',
    }}>
      <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, #63cf8b 50%, transparent)', opacity: 0.8 }} />
      <div style={{ padding: '20px 22px 22px' }}>
        <StepContent step={step} idx={idx} total={total} onNext={onNext} onPrev={onPrev} />
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────
export default function KnockoutTutorialModal({ onClose, onNavigate }) {
  const [idx, setIdx]               = useState(0);
  const [visible, setVisible]       = useState(false);
  const [animKey, setAnimKey]       = useState(0);
  const [cardVisible, setCardVisible] = useState(true);
  const isDesktop                   = useIsDesktop();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Bloquear scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const noTouch = (e) => e.preventDefault();
    document.addEventListener('touchmove', noTouch, { passive: false });
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('touchmove', noTouch);
    };
  }, []);

  const step  = STEPS[idx];
  const total = STEPS.length;

  // Resolver puntero según dispositivo
  const rawPointer = step.pointer
    ? (isDesktop ? step.pointer.desktop : step.pointer.mobile)
    : null;

  const pointerPos = usePointerPos(rawPointer, idx);

  useHighlight(idx === 1 ? '.tab-btn.active' : null, true);

  const goTo = useCallback((next) => {
    const s = STEPS[next];
    if (s?.nav && onNavigate) onNavigate(s.nav.tab, s.nav.view);
    setTimeout(() => {
      const main = document.querySelector('.app-main');
      if (main) main.scrollTo({ top: 0, behavior: 'instant' });
    }, 60);
    if (isDesktop) {
      setCardVisible(false);
      setTimeout(() => { setIdx(next); setCardVisible(true); setAnimKey(k => k + 1); }, 150);
    } else {
      setIdx(next);
    }
  }, [onNavigate, isDesktop]);

  const next = () => idx < total - 1 ? goTo(idx + 1) : onClose();
  const prev = () => { if (idx > 0) goTo(idx - 1); };

  const props = { step, idx, total, onNext: next, onPrev: prev };

  return (
    <>
      {/* Overlay bloqueador */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.10)',
        pointerEvents: 'all', touchAction: 'none',
        userSelect: 'none', WebkitUserSelect: 'none',
      }} />

      {/* Puntero */}
      <Pointer pos={pointerPos} />

      {isDesktop
        ? <DesktopCard key={animKey} {...props} visible={cardVisible} />
        : <MobileSheet {...props} visible={visible} />
      }
    </>
  );
}

// ─── Estilos de botón ───────────────────────────────────────────────────────────
function btnBase(variant) {
  const base = { borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', transition: 'opacity 0.15s' };
  if (variant === 'primary') return { ...base, flex: 1, padding: '11px 0', background: '#63cf8b', color: '#071a0e', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em', fontSize: 16 };
  if (variant === 'warn')    return { ...base, flex: 1, padding: '11px 0', background: '#f87171', color: '#1a0000', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em', fontSize: 16 };
  return { ...base, padding: '11px 16px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' };
}
