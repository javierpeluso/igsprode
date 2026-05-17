import React, { useState } from 'react';
import { GROUPS } from '../data/fixture';
import MatchCard from './MatchCard';
import ProgressBar from './ProgressBar';

export default function PronosticosTab({ predictions, results, onSave, currentUid }) {
  const [activeGroup, setActiveGroup] = useState('A');

  const goToMatch = (match) => {
    // Extraer el grupo del id del partido (ej: "J_2" → "J")
    const group = match.id.split('_')[0];
    setActiveGroup(group);
    // Scroll al partido después de que React renderice el nuevo grupo
    setTimeout(() => {
      const el = document.getElementById(`match-${match.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div className="tab-content">
      <ProgressBar predictions={predictions} onGoToMatch={goToMatch} />

      <div className="group-nav">
        {Object.keys(GROUPS).map((g) => (
          <button
            key={g}
            className={`group-btn ${activeGroup === g ? 'active' : ''}`}
            onClick={() => setActiveGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="matches-list">
        {GROUPS[activeGroup].matches.map((match) => (
          <div id={`match-${match.id}`} key={match.id}>
            <MatchCard
              match={match}
              prediction={predictions[match.id]}
              result={results[match.id]}
              onSave={onSave}
              currentUid={currentUid}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
