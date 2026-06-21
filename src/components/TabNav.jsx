import React, { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TabNav — reemplaza la barra de tabs horizontal.
// • En PC/escritorio (≥900px): panel lateral fijo a la izquierda.
// • En smartphone/tablet (<900px): botón que despliega un menú tipo acordeón.
//
// Props:
//   tabs        Array<{ label: string, badge?: boolean }>
//   activeIndex number
//   onChange    (index: number) => void
//   extra       ReactNode opcional (ej: botón "Publicar versión" del admin)
// ─────────────────────────────────────────────────────────────────────────────
export default function TabNav({ tabs, activeIndex, onChange, extra }) {
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cierra el menú desplegable (mobile) al cambiar de tamaño a desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 900) setOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleSelect = (i) => {
    onChange(i);
    setOpen(false);
  };

  const activeTab = tabs[activeIndex];

  return (
    <nav className={`tab-nav ${open ? 'tab-nav-open' : ''}`} ref={navRef}>
      <button
        type="button"
        className="tab-nav-toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label="Abrir menú de secciones"
      >
        <svg className="tab-nav-toggle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span className="tab-nav-toggle-label">
          {activeTab?.label}
          {activeTab?.badge && <span className="tab-badge" />}
        </span>
        <svg className="tab-nav-toggle-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className="tab-nav-list">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            className={`tab-btn ${activeIndex === i ? 'active' : ''}`}
            onClick={() => handleSelect(i)}
          >
            {t.label}{t.badge && <span className="tab-badge" />}
          </button>
        ))}
        {extra}
      </div>
    </nav>
  );
}
