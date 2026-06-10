import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GROUPS } from '../data/fixture';
import { Flag } from '../data/flags';

const DEADLINE = new Date('2026-06-11T16:00:00-03:00'); // primer partido
const isClosed = () => Date.now() >= DEADLINE.getTime();

// Todos los equipos del fixture
const ALL_TEAMS = [...new Set(
  Object.values(GROUPS).flatMap(g => g.teams)
)].sort((a, b) => a.localeCompare(b));

export default function CampeonModal({ user, onClose }) {
  const [selected, setSelected]   = useState(null);
  const [saved, setSaved]         = useState(null);
  const [status, setStatus]       = useState('idle');
  const [search, setSearch]       = useState('');

  const closed = isClosed();

  useEffect(() => {
    const ref = doc(db, 'campeon', user.uid);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setSaved(snap.data().team);
        setSelected(snap.data().team);
      }
    });
    return unsub;
  }, [user.uid]);

  const handleSave = async () => {
    if (!selected || closed) return;
    setStatus('saving');
    try {
      await setDoc(doc(db, 'campeon', user.uid), {
        team: selected,
        userId: user.uid,
        displayName: user.displayName,
        savedAt: Date.now(),
      });
      setSaved(selected);
      setStatus('saved');
      setTimeout(() => { setStatus('idle'); onClose(); }, 1500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const filtered = ALL_TEAMS.filter(t =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="campeon-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="campeon-modal">

        <div className="campeon-hero">
          <div className="campeon-trophy">🏆</div>
          <h2 className="campeon-title">¿Quién va a salir<br />CAMPEÓN?</h2>
          <p className="campeon-sub">
            {closed
              ? 'El pronóstico está cerrado'
              : saved
              ? 'Podés cambiar tu pronóstico hasta el 11 de junio'
              : 'Elegí tu campeón antes del 11 de junio · Vale 10 puntos'}
          </p>
        </div>

        {saved && (
          <div className="campeon-current">
            <span className="campeon-current-label">Tu pronóstico actual</span>
            <div className="campeon-current-team">
              <Flag country={saved} size={28} />
              <span>{saved}</span>
            </div>
          </div>
        )}

        {!closed && (
          <>
            <input
              className="campeon-search"
              type="text"
              placeholder="Buscar selección..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus={!saved}
            />

            <div className="campeon-grid">
              {filtered.map(team => (
                <button
                  key={team}
                  className={`campeon-team-btn ${selected === team ? 'selected' : ''}`}
                  onClick={() => setSelected(team)}
                >
                  <Flag country={team} size={22} />
                  <span>{team}</span>
                </button>
              ))}
            </div>

            <div className="campeon-actions">
              <button className="btn-campeon-cancel" onClick={onClose}>
                {saved ? 'Cerrar' : 'Más tarde'}
              </button>
              <button
                className={`btn-campeon-save ${!selected || selected === saved ? 'disabled' : ''} ${status === 'saved' ? 'saved' : ''}`}
                onClick={handleSave}
                disabled={!selected || selected === saved || status === 'saving'}
              >
                {status === 'saving' ? 'Guardando...'
                  : status === 'saved' ? '✓ ¡Guardado!'
                  : status === 'error' ? 'Error, reintentá'
                  : saved ? 'Actualizar pronóstico'
                  : '¡Confirmar campeón!'}
              </button>
            </div>
          </>
        )}

        {closed && (
          <button className="btn-campeon-cancel" onClick={onClose} style={{ width: '100%' }}>
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
}

// Banner pequeño que se muestra en el header para abrir el modal
export function CampeonBanner({ user, onClick }) {
  const [campeon, setCampeon] = useState(null);
  const [loaded, setLoaded]   = useState(false);
  const closed = isClosed();

  useEffect(() => {
    const ref = doc(db, 'campeon', user.uid);
    const unsub = onSnapshot(ref, snap => {
      setCampeon(snap.exists() ? snap.data().team : null);
      setLoaded(true);
    });
    return unsub;
  }, [user.uid]);

  if (!loaded) return null;

  return (
    <button className={`campeon-banner ${!campeon && !closed ? 'pulse' : ''}`} onClick={onClick}>
      <span className="campeon-banner-trophy">🏆</span>
      <span className="campeon-banner-text">
        {campeon
          ? <><Flag country={campeon} size={16} /> {campeon}</>
          : closed ? 'Sin campeón' : '¡Elegí tu campeón!'}
      </span>
      {!campeon && !closed && <span className="campeon-banner-dot" />}
    </button>
  );
}
