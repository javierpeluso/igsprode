import React, { useState } from 'react';
import { GROUPS } from '../data/fixture';
import { Flag } from '../data/flags';
import { calcGroupStandings } from '../data/knockout';
import { BRACKET_MATCHES, resolveSlot } from '../data/bracket';
import { calcAllStandings, useManualThirds } from '../hooks/useBracket';

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

// ─── Construye partidos de rondas posteriores a R32 desde resultados reales ──
function buildLaterRoundMatches(knockoutResults) {
  const getWinner = (matchId) => {
    const r = knockoutResults[matchId];
    if (!r) return null;
    if (r.home > r.away) return r.homeTeam || null;
    if (r.away > r.home) return r.awayTeam || null;
    if (r.penaltyWinner) return r.penaltyWinner;
    return null;
  };
  const getLoser = (matchId) => {
    const r = knockoutResults[matchId];
    if (!r) return null;
    if (r.home > r.away) return r.awayTeam || null;
    if (r.away > r.home) return r.homeTeam || null;
    if (r.penaltyWinner) {
      return r.penaltyWinner === r.homeTeam ? r.awayTeam : r.homeTeam;
    }
    return null;
  };

  const r16 = [
    // Lado izquierdo del bracket (slice 0-3)
    { id: 'R16_M89',  home: getWinner('R32_M74'), away: getWinner('R32_M77'), date: '4 jul',  label: 'M89',  kickoff: '2026-07-04T18:00:00-03:00' },
    { id: 'R16_M90',  home: getWinner('R32_M73'), away: getWinner('R32_M75'), date: '4 jul',  label: 'M90',  kickoff: '2026-07-04T14:00:00-03:00' },
    { id: 'R16_M93',  home: getWinner('R32_M83'), away: getWinner('R32_M84'), date: '6 jul',  label: 'M93',  kickoff: '2026-07-06T16:00:00-03:00' },
    { id: 'R16_M94',  home: getWinner('R32_M81'), away: getWinner('R32_M82'), date: '6 jul',  label: 'M94',  kickoff: '2026-07-06T21:00:00-03:00' },
    // Lado derecho del bracket (slice 4-7)
    { id: 'R16_M91',  home: getWinner('R32_M76'), away: getWinner('R32_M78'), date: '5 jul',  label: 'M91',  kickoff: '2026-07-05T17:00:00-03:00' },
    { id: 'R16_M92',  home: getWinner('R32_M79'), away: getWinner('R32_M80'), date: '5 jul',  label: 'M92',  kickoff: '2026-07-05T21:00:00-03:00' },
    { id: 'R16_M95',  home: getWinner('R32_M86'), away: getWinner('R32_M88'), date: '7 jul',  label: 'M95',  kickoff: '2026-07-07T13:00:00-03:00' },
    { id: 'R16_M96',  home: getWinner('R32_M85'), away: getWinner('R32_M87'), date: '7 jul',  label: 'M96',  kickoff: '2026-07-07T17:00:00-03:00' },
  ];
  const qf = [
    { id: 'QF_M97',  home: getWinner('R16_M89'), away: getWinner('R16_M90'), date: '9 jul',  label: 'M97',  kickoff: '2026-07-09T17:00:00-03:00' },
    { id: 'QF_M98',  home: getWinner('R16_M91'), away: getWinner('R16_M92'), date: '10 jul', label: 'M98',  kickoff: '2026-07-10T16:00:00-03:00' },
    { id: 'QF_M99',  home: getWinner('R16_M93'), away: getWinner('R16_M94'), date: '11 jul', label: 'M99',  kickoff: '2026-07-11T18:00:00-03:00' },
    { id: 'QF_M100', home: getWinner('R16_M95'), away: getWinner('R16_M96'), date: '11 jul', label: 'M100', kickoff: '2026-07-11T22:00:00-03:00' },
  ];
  const sf = [
    { id: 'SF_M101', home: getWinner('QF_M97'),  away: getWinner('QF_M98'),  date: '14 jul', label: 'M101', kickoff: '2026-07-14T16:00:00-03:00' },
    { id: 'SF_M102', home: getWinner('QF_M99'),  away: getWinner('QF_M100'), date: '15 jul', label: 'M102', kickoff: '2026-07-15T16:00:00-03:00' },
  ];
  const tp = [
    { id: 'TP_M103', home: getLoser('SF_M101'),  away: getLoser('SF_M102'),  date: '18 jul', label: 'M103', kickoff: '2026-07-18T18:00:00-03:00' },
  ];
  const finalMatch = [
    { id: 'F_M104',  home: getWinner('SF_M101'), away: getWinner('SF_M102'), date: '19 jul', label: 'M104', kickoff: '2026-07-19T16:00:00-03:00' },
  ];
  return { r16, qf, sf, tp, finalMatch };
}

// ─── Componente de slot de equipo para el bracket ────────────────────────────
function TeamSlot({ name, isPlaceholder }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '5px 8px',
      borderRadius: 6,
      background: isPlaceholder ? 'var(--c-surface2)' : 'var(--c-surface)',
      border: '1px solid var(--c-border2)',
      minWidth: 140,
      maxWidth: 160,
      height: 32,
    }}>
      {!isPlaceholder && name && (
        <Flag country={name} size={14} />
      )}
      <span style={{
        fontSize: 11,
        fontWeight: isPlaceholder ? 400 : 600,
        color: isPlaceholder ? 'var(--c-muted)' : 'var(--c-text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {name || '—'}
      </span>
    </div>
  );
}

// ─── Partido individual en el bracket ────────────────────────────────────────
function BracketMatch({ match, knockoutResults }) {
  const res = knockoutResults?.[match.id];
  const homeWon = res && (res.home > res.away || (res.home === res.away && res.penaltyWinner === match.home));
  const awayWon = res && (res.away > res.home || (res.home === res.away && res.penaltyWinner === match.away));

  const isPlaceholderHome = !match.home;
  const isPlaceholderAway = !match.away;

  const homeName = match.home || (match.homeLabel || '?');
  const awayName = match.away || (match.awayLabel || '?');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Fecha/hora pequeña sobre el partido */}
      {match.date && (
        <div style={{ fontSize: 9, color: 'var(--c-muted)', textAlign: 'center', marginBottom: 1 }}>
          {match.date}{match.kickoff ? ' · ' + new Date(match.kickoff).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) + 'hs' : ''}
        </div>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 8px',
        borderRadius: '6px 6px 0 0',
        background: homeWon ? 'rgba(232,200,74,0.15)' : isPlaceholderHome ? 'var(--c-surface2)' : 'var(--c-surface)',
        border: '1px solid var(--c-border2)',
        borderBottom: '1px solid var(--c-border)',
        minWidth: 140,
        maxWidth: 160,
        height: 30,
      }}>
        {!isPlaceholderHome && match.home && <Flag country={match.home} size={13} />}
        <span style={{ fontSize: 11, fontWeight: homeWon ? 700 : 500, color: isPlaceholderHome ? 'var(--c-muted)' : homeWon ? '#e8c84a' : 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {homeName}
        </span>
        {res && <span style={{ fontSize: 11, fontWeight: 700, color: homeWon ? '#e8c84a' : 'var(--c-muted)', marginLeft: 'auto' }}>{res.home}</span>}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 8px',
        borderRadius: '0 0 6px 6px',
        background: awayWon ? 'rgba(232,200,74,0.15)' : isPlaceholderAway ? 'var(--c-surface2)' : 'var(--c-surface)',
        border: '1px solid var(--c-border2)',
        minWidth: 140,
        maxWidth: 160,
        height: 30,
      }}>
        {!isPlaceholderAway && match.away && <Flag country={match.away} size={13} />}
        <span style={{ fontSize: 11, fontWeight: awayWon ? 700 : 500, color: isPlaceholderAway ? 'var(--c-muted)' : awayWon ? '#e8c84a' : 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {awayName}
        </span>
        {res && <span style={{ fontSize: 11, fontWeight: 700, color: awayWon ? '#e8c84a' : 'var(--c-muted)', marginLeft: 'auto' }}>{res.away}</span>}
      </div>
      {res?.penaltyWinner && (
        <div style={{ fontSize: 9, color: 'var(--c-muted)', textAlign: 'center', marginTop: 1 }}>
          ⚽ pen: {res.penaltyWinner}
        </div>
      )}
    </div>
  );
}

// ─── Columna de partidos del bracket ─────────────────────────────────────────
function BracketColumn({ matches, label, knockoutResults, spacing }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing, justifyContent: 'space-around', flex: 1 }}>
        {matches.map(m => (
          <BracketMatch key={m.id} match={m} knockoutResults={knockoutResults} />
        ))}
      </div>
    </div>
  );
}

// ─── Líneas conectoras simples entre columnas ─────────────────────────────────
function ConnectorLines({ count, direction }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-around',
      width: 10,
      alignSelf: 'stretch',
      gap: 0,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          flex: 1,
          borderTop: '1px solid var(--c-border2)',
          width: '100%',
        }} />
      ))}
    </div>
  );
}

// ─── Vista Fase Eliminatoria ──────────────────────────────────────────────────
function FaseEliminatoria({ results }) {
  const { manualThirds } = useManualThirds();
  const standings = React.useMemo(() => calcAllStandings(results), [results]);

  // R32: resolver slots desde posiciones de grupo + terceros manuales
  const r32Matches = BRACKET_MATCHES.map(m => ({
    ...m,
    home: resolveSlot(m.slot1, standings, manualThirds, m.id) || m.slot1.label,
    away: resolveSlot(m.slot2, standings, manualThirds, m.id) || m.slot2.label,
    homeLabel: m.slot1.label,
    awayLabel: m.slot2.label,
  }));

  // Rondas posteriores: construidas a partir de resultados reales de knockout
  const { r16, qf, sf, tp, finalMatch } = buildLaterRoundMatches(results);

  // Para el bracket visual necesitamos enriquecer con labels cuando el equipo aún no está definido
  const enrichWithLabels = (matches, r32Ref) => matches.map(m => ({
    ...m,
    homeLabel: m.home || '?',
    awayLabel: m.away || '?',
  }));

  const r16Enriched  = enrichWithLabels(r16);
  const qfEnriched   = enrichWithLabels(qf);
  const sfEnriched   = enrichWithLabels(sf);
  const tpEnriched   = enrichWithLabels(tp);
  const finEnriched  = enrichWithLabels(finalMatch);

  // Separar en lado izquierdo y derecho SEGÚN LA MITAD REAL DEL CUADRO
  // (a qué Semifinal alimenta cada partido), no solo por fecha.
  // Mitad A (alimenta SF_M101): M73, M74, M75, M76, M77, M78, M79, M80  → lado DERECHO
  // Mitad B (alimenta SF_M102): M81, M82, M83, M84, M85, M86, M87, M88 → lado IZQUIERDO
  // (Se elige que la Mitad A quede a la derecha porque ahí es donde
  // históricamente se venía mostrando el cruce que incluye a Brasil-Noruega.)
  // OJO: antes de esta corrección, M76/M78/M79/M80 (mitad A) se dibujaban
  // en la columna derecha de 16avos, pero R16_M91/R16_M92/QF_M98 — que
  // dependen de esos mismos partidos — se dibujaban en las columnas
  // IZQUIERDAS de 8vos/cuartos (por el slice(0,4)/slice(0,2) fijo). Por eso
  // un equipo que ganaba un partido "de la derecha" terminaba avanzando
  // y apareciendo del lado izquierdo del cuadro. Ahora ambos lados usan
  // siempre la misma mitad de principio a fin.
  const leftR32  = [r32Matches.find(m=>m.id==='R32_M83'), r32Matches.find(m=>m.id==='R32_M84'), r32Matches.find(m=>m.id==='R32_M81'), r32Matches.find(m=>m.id==='R32_M82'), r32Matches.find(m=>m.id==='R32_M86'), r32Matches.find(m=>m.id==='R32_M88'), r32Matches.find(m=>m.id==='R32_M85'), r32Matches.find(m=>m.id==='R32_M87')].filter(Boolean);
  const rightR32 = [r32Matches.find(m=>m.id==='R32_M74'), r32Matches.find(m=>m.id==='R32_M77'), r32Matches.find(m=>m.id==='R32_M73'), r32Matches.find(m=>m.id==='R32_M75'), r32Matches.find(m=>m.id==='R32_M76'), r32Matches.find(m=>m.id==='R32_M78'), r32Matches.find(m=>m.id==='R32_M79'), r32Matches.find(m=>m.id==='R32_M80')].filter(Boolean);

  // r16Enriched viene en orden oficial [M89,M90,M91,M92, M93,M94,M95,M96].
  // M89-M92 dependen de la Mitad A (73-80) → ahora del lado derecho.
  // M93-M96 dependen de la Mitad B (81-88) → ahora del lado izquierdo.
  const rightR16 = r16Enriched.slice(0, 4);
  const leftR16  = r16Enriched.slice(4, 8);
  const rightQF  = qfEnriched.slice(0, 2);
  const leftQF   = qfEnriched.slice(2, 4);
  const rightSF  = sfEnriched.slice(0, 1);
  const leftSF   = sfEnriched.slice(1, 2);

  const CUP_URL = 'https://res.cloudinary.com/dzof25mgq/image/upload/v1779284221/copa_del_mundo_sfms28.png';

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minWidth: 1100,
          padding: '8px 4px',
        }}>

          {/* ── LADO IZQUIERDO ── */}
          <BracketColumn matches={leftR32} label="16avos" knockoutResults={results} spacing={10} />
          <ConnectorLines count={8} direction="right" />
          <BracketColumn matches={leftR16} label="8vos" knockoutResults={results} spacing={74} />
          <ConnectorLines count={4} direction="right" />
          <BracketColumn matches={leftQF} label="Cuartos" knockoutResults={results} spacing={214} />
          <ConnectorLines count={2} direction="right" />
          <BracketColumn matches={leftSF} label="Semis" knockoutResults={results} spacing={0} />
          <ConnectorLines count={1} direction="right" />

          {/* ── CENTRO: Copa + Final ── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            minWidth: 100,
            flexShrink: 0,
          }}>
            <img
              src={CUP_URL}
              alt="Copa del Mundo"
              style={{ width: 80, height: 'auto', filter: 'drop-shadow(0 0 12px rgba(232,200,74,0.5))' }}
            />
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#e8c84a', textTransform: 'uppercase', textAlign: 'center' }}>
              FINAL · 19 jul 16:00hs
            </div>
            <BracketMatch match={finEnriched[0]} knockoutResults={results} />
            <div style={{ fontSize: 9, color: 'var(--c-muted)', textAlign: 'center' }}>
              🥉 3er Puesto · 18 jul 18:00hs
            </div>
            <BracketMatch match={tpEnriched[0]} knockoutResults={results} />
          </div>

          {/* ── LADO DERECHO ── */}
          <ConnectorLines count={1} direction="left" />
          <BracketColumn matches={rightSF} label="Semis" knockoutResults={results} spacing={0} />
          <ConnectorLines count={2} direction="left" />
          <BracketColumn matches={rightQF} label="Cuartos" knockoutResults={results} spacing={214} />
          <ConnectorLines count={4} direction="left" />
          <BracketColumn matches={rightR16} label="8vos" knockoutResults={results} spacing={74} />
          <ConnectorLines count={8} direction="left" />
          <BracketColumn matches={rightR32} label="16avos" knockoutResults={results} spacing={10} />

        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--c-muted)' }}>
        Las llaves se actualizan automáticamente con los resultados de cada ronda
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TablaTab({ results, view: viewProp, onViewChange }) {
  const groupKeys = Object.keys(GROUPS);
  const [activeGroup, setActiveGroup] = useState('A');
  const [viewInternal, setViewInternal] = useState('grupos'); // 'grupos' | 'eliminatoria'
  // Si viene controlado desde afuera (tutorial), lo usamos; si no, usamos estado interno
  const view = viewProp !== undefined ? viewProp : viewInternal;
  const setView = (v) => { setViewInternal(v); if (onViewChange) onViewChange(v); };

  const hasAnyResult = Object.keys(results).length > 0;

  return (
    <div className="tab-content">
      {!hasAnyResult && (
        <div className="tabla-empty-notice">
          Las posiciones se actualizarán cuando se carguen los primeros resultados
        </div>
      )}

      {/* Filtro principal: Grupos / Eliminatoria */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 12,
      }}>
        <div style={{
          display: 'inline-flex',
          background: 'var(--c-surface2)',
          borderRadius: 10,
          padding: 3,
          gap: 2,
          border: '1px solid var(--c-border2)',
        }}>
          <button
            onClick={() => setView('grupos')}
            style={{
              padding: '7px 22px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              transition: 'all 0.18s',
              background: view === 'grupos' ? 'var(--c-accent)' : 'transparent',
              color: view === 'grupos' ? '#111' : 'var(--c-muted)',
              boxShadow: view === 'grupos' ? '0 1px 6px rgba(232,200,74,0.25)' : 'none',
            }}
          >
            🏟 Grupos
          </button>
          <button
            onClick={() => setView('eliminatoria')}
            style={{
              padding: '7px 22px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              transition: 'all 0.18s',
              background: view === 'eliminatoria' ? 'var(--c-accent)' : 'transparent',
              color: view === 'eliminatoria' ? '#111' : 'var(--c-muted)',
              boxShadow: view === 'eliminatoria' ? '0 1px 6px rgba(232,200,74,0.25)' : 'none',
            }}
          >
            ⚡ Eliminatoria
          </button>
        </div>
      </div>

      {/* Navegación de grupos (solo visible en vista Grupos) */}
      {view === 'grupos' && (
        <div className="group-nav" style={{ flexWrap: 'wrap', gap: 4 }}>
          {groupKeys.map(g => (
            <button
              key={g}
              className={`group-btn ${activeGroup === g ? 'active' : ''}`}
              onClick={() => setActiveGroup(g)}
            >
              Grupo {g}
            </button>
          ))}
        </div>
      )}

      {/* Vista Fase Eliminatoria */}
      {view === 'eliminatoria' ? (
        <FaseEliminatoria results={results} />
      ) : (
        /* Vista tabla de grupo */
        (() => {
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
        })()
      )}
    </div>
  );
}
