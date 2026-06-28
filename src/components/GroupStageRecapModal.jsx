import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ALL_MATCHES, calcPoints } from '../data/fixture';

// Clave en Firestore donde se guarda si el usuario ya vio el recap
const RECAP_DOC = (uid) => doc(db, '_meta_recap', uid);
const RECAP_VERSION = 'grupos_v1'; // cambiar si querés mostrar el recap de nuevo

export function useGroupStageRecap(userId, predictions, results) {
  const [shouldShow, setShouldShow] = useState(false);
  const [recapData, setRecapData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Evita que el cálculo se repita si ya completó (predictions/results son objetos
  // nuevos en cada snapshot de Firestore, lo que re-dispararía el effect sin este ref)
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    if (checkedRef.current) return;

    // Esperar a que haya al menos 1 resultado de fase de grupos cargado
    const groupResultKeys = Object.keys(results || {}).filter(
      k => !k.startsWith('R32') && !k.startsWith('R16') &&
           !k.startsWith('QF')  && !k.startsWith('SF')  &&
           !k.startsWith('TP')  && !k.startsWith('F_')
    );

    console.log('[recap] effect — groupResults:', groupResultKeys.length, '| predictions keys:', Object.keys(predictions || {}).length);

    if (groupResultKeys.length === 0) {
      // Resultados aún no cargaron, esperamos al próximo render
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const snap = await getDoc(RECAP_DOC(userId));
        if (cancelled) return;

        if (snap.exists() && snap.data().version === RECAP_VERSION) {
          console.log('[recap] ya visto, no mostrar');
          checkedRef.current = true;
          setLoading(false);
          return;
        }

        // Calcular estadísticas de fase de grupos
        let exact = 0, winner = 0, miss = 0, played = 0;
        const bestMatches = [];
        const missedMatches = [];

        ALL_MATCHES.forEach(m => {
          const res = (results || {})[m.id];
          if (!res) return; // partido sin resultado aún
          played++;
          const pred = (predictions || {})[m.id];
          if (!pred) { miss++; return; } // sin pronóstico = errado
          const pts = calcPoints(pred, res);
          if (pts === 3) {
            exact++;
            bestMatches.push({ match: m, pred, res, pts });
          } else if (pts === 1) {
            winner++;
          } else {
            miss++;
            missedMatches.push({ match: m, pred, res, pts });
          }
        });

        if (cancelled) return;

        console.log('[recap] calculado — played:', played, 'exact:', exact, 'winner:', winner, 'miss:', miss);

        if (played === 0) {
          // ALL_MATCHES no matcheó ningún resultado — IDs no coinciden
          console.warn('[recap] played=0, los IDs de ALL_MATCHES no matchean results. Ejemplo result key:', groupResultKeys[0]);
          checkedRef.current = true;
          setLoading(false);
          return;
        }

        const totalPts = exact * 3 + winner;
        const accuracy = Math.round((exact / played) * 100);

        checkedRef.current = true;
        setRecapData({
          played,
          exact,
          winner,
          miss,
          totalPts,
          accuracy,
          bestMatches: bestMatches.slice(0, 3),
          missedMatches: missedMatches.slice(0, 2),
        });
        setShouldShow(true);
        setLoading(false);
      } catch (e) {
        console.error('[recap] error en getDoc:', e);
        setLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [userId, predictions, results]);

  const markSeen = useCallback(async () => {
    setShouldShow(false);
    if (!userId) return;
    await setDoc(RECAP_DOC(userId), { version: RECAP_VERSION, seenAt: Date.now() });
  }, [userId]);

  return { shouldShow, recapData, loading, markSeen };
}

// ─── Cards individuales ───────────────────────────────────────────────────────

function CardIntro({ data }) {
  const level = data.accuracy >= 60 ? '🔥 Ojo clínico' : data.accuracy >= 40 ? '👀 Buen ojo' : '📈 Hay margen';
  return (
    <div style={cardBase}>
      <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 8 }}>
        Tu fase de grupos
      </div>
      <div style={{ fontSize: 56, margin: '8px 0 4px', lineHeight: 1 }}>⚽</div>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 34, letterSpacing: '0.06em', color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>
        Recap de<br />Fase de Grupos
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
        {data.played} partidos jugados • Mundial 2026
      </div>
      <div style={{
        display: 'inline-block',
        background: 'rgba(99,207,139,0.15)',
        border: '1px solid rgba(99,207,139,0.3)',
        borderRadius: 20, padding: '6px 16px',
        fontFamily: 'Bebas Neue, sans-serif', fontSize: 15, letterSpacing: '0.1em', color: '#63cf8b',
      }}>
        {level}
      </div>
    </div>
  );
}

function CardPoints({ data }) {
  return (
    <div style={cardBase}>
      <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 20 }}>
        Tus puntos
      </div>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 88, color: '#fff', lineHeight: 0.9, marginBottom: 4 }}>
        {data.totalPts}
      </div>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>
        PUNTOS TOTALES
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <StatPill value={data.exact} label="Exactos 🎯" color="#63cf8b" />
        <StatPill value={data.winner} label="Ganador ✅" color="#f0b429" />
        <StatPill value={data.miss} label="Errados ❌" color="rgba(255,255,255,0.3)" />
      </div>
    </div>
  );
}

function CardAccuracy({ data }) {
  const bar = Math.min(data.accuracy, 100);
  const color = bar >= 60 ? '#63cf8b' : bar >= 35 ? '#f0b429' : '#f87171';
  return (
    <div style={cardBase}>
      <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 20 }}>
        Precisión exacta
      </div>
      <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 24px' }}>
        <svg viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
          <circle
            cx="70" cy="70" r="60" fill="none"
            stroke={color} strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 60}`}
            strokeDashoffset={`${2 * Math.PI * 60 * (1 - bar / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 38, color, lineHeight: 1 }}>{bar}%</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>EXACTOS</span>
        </div>
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
        {data.exact} de {data.played} partidos pronosticados exactos
      </div>
    </div>
  );
}

function ScoreChip({ home, away, accent }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: accent ? 'rgba(99,207,139,0.15)' : 'rgba(255,255,255,0.07)',
      border: `1px solid ${accent ? 'rgba(99,207,139,0.3)' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: 8, padding: '3px 10px',
      fontFamily: 'Bebas Neue, sans-serif', fontSize: 18,
      color: accent ? '#63cf8b' : 'rgba(255,255,255,0.7)',
      letterSpacing: '0.04em',
    }}>
      {home} – {away}
    </div>
  );
}

function CardBestMoments({ data }) {
  if (!data.bestMatches.length) return (
    <div style={cardBase}>
      <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 20 }}>Tus mejores aciertos</div>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🤞</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>No hubo resultados exactos esta vez, ¡pero queda la eliminatoria!</div>
    </div>
  );
  return (
    <div style={cardBase}>
      <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 16 }}>
        🎯 Mejores aciertos
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        {data.bestMatches.map(({ match, pred, res }) => (
          <div key={match.id} style={{
            background: 'rgba(99,207,139,0.08)',
            border: '1px solid rgba(99,207,139,0.2)',
            borderRadius: 14, padding: '12px 14px', textAlign: 'left',
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.06em' }}>
              {match.home} vs {match.away}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScoreChip home={pred.home} away={pred.away} accent />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>pronosticaste</span>
              <span style={{ fontSize: 11, color: '#63cf8b' }}>✓ exacto</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardRanking({ ranking, currentUid }) {
  const myPos = ranking.findIndex(r => r.uid === currentUid);
  const me = ranking[myPos];
  if (!me) return (
    <div style={cardBase}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
        Cargando ranking...
      </div>
    </div>
  );
  const pos = myPos + 1;
  const total = ranking.length;
  const top = Math.round((pos / total) * 100);
  const emoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos <= Math.ceil(total * 0.25) ? '🔝' : '📊';
  const msg = pos === 1 ? '¡Líder absoluto!' : pos <= 3 ? `Top 3 de ${total} participantes` : `Top ${top}% del grupo`;

  return (
    <div style={cardBase}>
      <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 16 }}>
        Tu posición en el ranking
      </div>
      <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 72, color: '#fff', lineHeight: 1, marginBottom: 4 }}>
        #{pos}
      </div>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 14, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
        DE {total} PARTICIPANTES
      </div>
      <div style={{
        background: 'rgba(99,207,139,0.12)',
        border: '1px solid rgba(99,207,139,0.25)',
        borderRadius: 12, padding: '10px 20px',
        fontFamily: 'Bebas Neue, sans-serif', fontSize: 15, letterSpacing: '0.08em', color: '#63cf8b',
      }}>
        {msg}
      </div>
    </div>
  );
}

function CardOutro({ onClose }) {
  return (
    <div style={cardBase}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 30, letterSpacing: '0.06em', color: '#fff', lineHeight: 1.15, marginBottom: 10 }}>
        ¡Que empiece<br />la eliminatoria!
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 28, lineHeight: 1.6 }}>
        Los grupos terminaron. Ahora viene lo bueno —<br />cada partido puede cambiar todo.
      </div>
      <button
        onClick={onClose}
        style={{
          padding: '14px 0', width: '100%', borderRadius: 14,
          border: 'none', background: '#63cf8b', color: '#0a1a0f',
          fontFamily: 'Bebas Neue, sans-serif', fontSize: 17, letterSpacing: '0.08em',
          cursor: 'pointer', transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.target.style.opacity = '0.85'}
        onMouseLeave={e => e.target.style.opacity = '1'}
      >
        ¡Vamos!
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GroupStageRecapModal({ data, ranking, currentUid, onClose }) {
  const [current, setCurrent] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // CardRanking maneja internamente el estado de carga (muestra "Cargando...")
  // así nunca queda una card vacía/negra
  const cards = [
    <CardIntro data={data} />,
    <CardPoints data={data} />,
    <CardAccuracy data={data} />,
    <CardBestMoments data={data} />,
    <CardRanking ranking={ranking} currentUid={currentUid} />,
    <CardOutro onClose={onClose} />,
  ].filter(Boolean);

  const total = cards.length;

  const go = useCallback((dir) => {
    setDirection(dir);
    setExiting(true);
    setTimeout(() => {
      setCurrent(c => c + dir);
      setExiting(false);
    }, 220);
  }, []);

  const next = () => { if (current < total - 1) go(1); };
  const prev = () => { if (current > 0) go(-1); };

  // Swipe support
  useEffect(() => {
    let startX = null;
    const onTouchStart = e => { startX = e.touches[0].clientX; };
    const onTouchEnd = e => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -40) next();
      else if (dx > 40) prev();
      startX = null;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [current, total]);

  // Block scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const isLast = current === total - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6 }}>
          {cards.map((_, i) => (
            <div key={i} style={{
              height: 3, borderRadius: 2,
              background: i <= current ? '#63cf8b' : 'rgba(255,255,255,0.2)',
              width: i === current ? 24 : 8,
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />
          ))}
        </div>

        {/* Card */}
        <div style={{
          width: '100%',
          opacity: exiting ? 0 : 1,
          transform: exiting
            ? `translateX(${direction * -40}px) scale(0.96)`
            : 'translateX(0) scale(1)',
          transition: 'opacity 0.22s ease, transform 0.22s ease',
        }}>
          {cards[current]}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          {current > 0 && (
            <button onClick={prev} style={navBtn('secondary')}>← Anterior</button>
          )}
          {!isLast && (
            <button onClick={next} style={{ ...navBtn('primary'), flex: 1 }}>
              {current === 0 ? 'Ver mi recap →' : 'Siguiente →'}
            </button>
          )}

        </div>
      </div>

      <style>{`
        @keyframes recapIn {
          from { opacity:0; transform: scale(0.9) translateY(16px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Estilos base ─────────────────────────────────────────────────────────────

const cardBase = {
  background: 'linear-gradient(160deg, #0f2a1a 0%, #091a10 100%)',
  border: '1px solid rgba(99,207,139,0.15)',
  borderRadius: 24,
  padding: '36px 24px 32px',
  textAlign: 'center',
  boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
  animation: 'recapIn 0.3s cubic-bezier(.34,1.3,.64,1)',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  minHeight: 360,
};

function StatPill({ value, label, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '10px 14px', textAlign: 'center', minWidth: 72,
    }}>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3, letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}

function navBtn(variant) {
  const base = {
    padding: '12px 16px', borderRadius: 12, fontSize: 14,
    cursor: 'pointer', fontWeight: 600, transition: 'opacity 0.15s',
    border: 'none',
  };
  if (variant === 'primary') return { ...base, background: '#63cf8b', color: '#071a0e' };
  if (variant === 'secondary') return { ...base, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' };
  return { ...base, background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 13 };
}
