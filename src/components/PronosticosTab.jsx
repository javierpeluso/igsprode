import React, { useState } from 'react';
import { GROUPS } from '../data/fixture';
import MatchCard from './MatchCard';

export default function PronosticosTab({ predictions, results, onSave }) {
  const [activeGroup, setActiveGroup] = useState('A');

  return (
    <div className="tab-content">
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
          <MatchCard
            key={match.id}
            match={match}
            prediction={predictions[match.id]}
            result={results[match.id]}
            onSave={onSave}
          />
        ))}
      </div>
    </div>
  );
}
