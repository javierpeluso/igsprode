import React, { useState } from 'react';
import { GROUPS } from '../data/fixture';
import { Flag } from '../data/flags';

function calcStandings(group, results) {
  const table = {};

  group.teams.forEach(team => {
    table[team] = { PJ: 0, PG: 0, PE: 0, PP: 0, GF: 0, GC: 0, DIF: 0, PTS: 0 };
  });

  group.matches.forEach(match => {
    const res = results[match.id];
    if (!res) return;

    const h = match.home;
    const a = match.away;
    const gh = res.home;
    const ga = res.away;

    table[h].PJ++; table[a].PJ++;
    table[h].GF += gh; table[h].GC += ga;
    table[a].GF += ga; table[a].GC += gh;
    table[h].DIF = table[h].GF - table[h].GC;
    table[a].DIF = table[a].GF - table[a].GC;

    if (gh > ga) {
      table[h].PG++; table[h].PTS += 3;
      table[a].PP++;
    } else if (gh < ga) {
      table[a].PG++; table[a].PTS += 3;
      table[h].PP++;
    } else {
      table[h].PE++; table[h].PTS++;
      table[a].PE++; table[a].PTS++;
    }
  });

  return Object.entries(table)
    .map(([team, stats]) => ({ team, ...stats }))
    .sort((a, b) =>
      b.PTS - a.PTS ||
      b.DIF - a.DIF ||
      b.GF  - a.GF  ||
      a.team.localeCompare(b.team)
    );
}

const POS_COLORS = ['#e8c84a', '#aaaaaa', '', ''];
const POS_LABELS = ['1°', '2°', '3°', '4°'];

export default function TablaTab({ results }) {
  const [activeGroup, setActiveGroup] = useState('A');

  const hasAnyResult = Object.keys(results).length > 0;

  return (
    <div className="tab-content">
      {!hasAnyResult && (
        <div className="tabla-empty-notice">
          Las posiciones se actualizarán cuando se carguen los primeros resultados
        </div>
      )}

      <div className="group-nav">
        {Object.keys(GROUPS).map(g => (
          <button
            key={g}
            className={`group-btn ${activeGroup === g ? 'active' : ''}`}
            onClick={() => setActiveGroup(g)}
          >
            Grupo {g}
          </button>
        ))}
      </div>

      {(() => {
        const group = GROUPS[activeGroup];
        const standings = calcStandings(group, results);
        const playedInGroup = group.matches.filter(m => results[m.id]).length;

        return (
          <div className="tabla-card">
            <div className="tabla-group-title">
              Grupo {activeGroup}
              <span className="tabla-played">{playedInGroup}/{group.matches.length} partidos jugados</span>
            </div>

            <div className="tabla-header-row">
              <span className="tabla-pos">#</span>
              <span className="tabla-team-col">Selección</span>
              <span className="tabla-stat">PJ</span>
              <span className="tabla-stat">PG</span>
              <span className="tabla-stat">PE</span>
              <span className="tabla-stat">PP</span>
              <span className="tabla-stat">GF</span>
              <span className="tabla-stat">GC</span>
              <span className="tabla-stat">DIF</span>
              <span className="tabla-stat pts-col">PTS</span>
            </div>

            {standings.map((row, idx) => (
              <div
                key={row.team}
                className={`tabla-row ${idx < 2 ? 'clasificado' : ''}`}
                style={{ borderLeftColor: POS_COLORS[idx] || 'transparent' }}
              >
                <span className="tabla-pos" style={{ color: POS_COLORS[idx] || 'var(--c-muted)' }}>
                  {POS_LABELS[idx]}
                </span>
                <span className="tabla-team-col">
                  <Flag country={row.team} size={18} />
                  <span className="tabla-team-name">{row.team}</span>
                </span>
                <span className="tabla-stat">{row.PJ}</span>
                <span className="tabla-stat">{row.PG}</span>
                <span className="tabla-stat">{row.PE}</span>
                <span className="tabla-stat">{row.PP}</span>
                <span className="tabla-stat">{row.GF}</span>
                <span className="tabla-stat">{row.GC}</span>
                <span className={`tabla-stat ${row.DIF > 0 ? 'pos' : row.DIF < 0 ? 'neg' : ''}`}>
                  {row.DIF > 0 ? `+${row.DIF}` : row.DIF}
                </span>
                <span className="tabla-stat pts-col">{row.PTS}</span>
              </div>
            ))}

            <div className="tabla-legend">
              <span className="legend-dot gold" />clasifican a octavos
            </div>
          </div>
        );
      })()}
    </div>
  );
}
