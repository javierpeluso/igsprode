import React, { useState } from 'react';
import { BRACKET_MATCHES } from '../data/bracket';
import { useManualThirds } from '../hooks/useBracket';
import { Flag } from '../data/flags';
import { GROUPS } from '../data/fixture';

const ALL_TEAMS = [...new Set(Object.values(GROUPS).flatMap(g => g.teams))].sort();

function ThirdRow({ match, manualThirds, onSave }) {
  const current = manualThirds?.[match.id] || '';
  const [selected, setSelected] = useState(current);
  const [status, setStatus] = useState('idle');

  const handleSave = async () => {
    if (!selected) return;
    setStatus('saving');
    try {
      await onSave(match.id, selected);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="admin-row">
      <div className="admin-thirds-header">
        <span className="admin-match-num">Partido {match.matchNum}</span>
        <span className="admin-third-label">{match.slot2.label}</span>
      </div>
      <div className="admin-thirds-body">
        <div className="admin-third-vs">
          <span className="admin-third-team">1° Grupo {match.slot1.group}</span>
          <span style={{ color: 'var(--c-muted)', fontSize: 12 }}>vs</span>
          <select
            className="admin-third-select"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            <option value="">-- Elegir 3° clasificado --</option>
            {ALL_TEAMS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button
          className={`btn-save ${status === 'saved' ? 'saved' : ''} ${status === 'error' ? 'error' : ''}`}
          onClick={handleSave}
          disabled={!selected || status === 'saving'}
        >
          {status === 'saving' ? 'Guardando...' : status === 'saved' ? '✓ Guardado' : status === 'error' ? '✗ Error' : 'Guardar'}
        </button>
      </div>
      {current && (
        <div className="admin-third-current">
          Actual: <Flag country={current} size={14} /> {current}
        </div>
      )}
    </div>
  );
}

export default function AdminThirds() {
  const { manualThirds, saveManualThird } = useManualThirds();
  const thirdMatches = BRACKET_MATCHES.filter(m => m.slot2.type === '3');

  return (
    <div className="tab-content">
      <div className="admin-notice">
        Cargá los 8 mejores terceros clasificados para completar los cruces de 16avos.
        Estos se determinan al terminar la fase de grupos.
      </div>
      <div className="admin-list">
        {thirdMatches.map(m => (
          <ThirdRow
            key={m.id}
            match={m}
            manualThirds={manualThirds}
            onSave={saveManualThird}
          />
        ))}
      </div>
    </div>
  );
}
