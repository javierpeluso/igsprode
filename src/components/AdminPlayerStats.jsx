import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Flag } from '../data/flags';

const DEFAULT_STATS = {
  totalPlayed: 0, predSent: 0, exact: 0, winner: 0, miss: 0, noPred: 0,
  totalPts: 0, pctExact: 0, pctWinner: 0, pctCorrect: 0,
  bestStreak: 0, worstStreak: 0, currentStreak: 0, topTeams: [],
};

const SORT_OPTIONS = [
  { key: 'totalPts',      label: 'Puntos' },
  { key: 'pctCorrect',    label: '% Aciertos' },
  { key: 'pctExact',      label: '% Exactos' },
  { key: 'pctMiss',       label: '% Derrotas' },
  { key: 'currentStreak', label: 'Racha actual' },
  { key: 'bestStreak',    label: 'Mejor racha' },
  { key: 'totalPlayed',   label: 'Partidos jugados' },
];

function initialsOf(p) {
  return (p.displayName || p.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ player, size = 40 }) {
  if (player.photoURL) {
    return (
      <img
        src={player.photoURL}
        alt={player.displayName}
        className="pstats-avatar"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className="pstats-avatar pstats-avatar-initials" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initialsOf(player)}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stats-page-card">
      {icon && <div className="stats-page-icon">{icon}</div>}
      <div className="stats-page-value" style={{ color: color || 'var(--c-accent)' }}>{value}</div>
      <div className="stats-page-label">{label}</div>
      {sub && <div className="stats-page-sub">{sub}</div>}
    </div>
  );
}

function StreakBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="streak-bar-row">
      <span className="streak-bar-label">{label}</span>
      <div className="streak-bar-wrap">
        <div className="streak-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="streak-bar-val" style={{ color }}>{value}</span>
    </div>
  );
}

function RecordCard({ icon, label, player, valueKey, suffix = '', formatter }) {
  if (!player) return null;
  const raw = player[valueKey];
  const value = formatter ? formatter(raw) : `${raw}${suffix}`;
  return (
    <div className="pstats-record-card">
      <div className="pstats-record-top">
        <span className="pstats-record-icon">{icon}</span>
        <span className="pstats-record-label">{label}</span>
      </div>
      <div className="pstats-record-value">{value}</div>
      <div className="pstats-record-player">
        <Avatar player={player} size={20} />
        <span className="pstats-record-name">{player.displayName || player.email}</span>
      </div>
    </div>
  );
}

function PlayerDetail({ player, groupAvg }) {
  if (!player.hasStats) {
    return (
      <div className="pstats-player-detail">
        <div className="pstats-empty-mini">
          ⏳ {player.displayName || player.email} todavía no tiene pronósticos con resultado cargado.
        </div>
      </div>
    );
  }

  const streakMax = Math.max(player.bestStreak, player.worstStreak, 1);

  return (
    <div className="pstats-player-detail">
      <div className="stats-page-grid-4">
        <StatCard icon="🏆" label="Puntos" value={player.totalPts} />
        <StatCard icon="🎯" label="% Aciertos" value={`${player.pctCorrect}%`} color="var(--c-green)" />
        <StatCard icon="⚡" label="Exactos" value={player.exact} color="var(--c-exact)" sub={`${player.pctExact}% de sus pred.`} />
        <StatCard icon="📉" label="% Derrotas" value={`${player.pctMiss}%`} color="var(--c-red)" sub={`${player.miss} fallados`} />
      </div>

      <div className="stats-page-grid-3" style={{ marginTop: 8 }}>
        <StatCard label="Partidos jugados" value={player.totalPlayed} icon="⚽" />
        <StatCard label="Pronósticos enviados" value={player.predSent} icon="📨" />
        <StatCard label="Sin pronosticar" value={player.noPred} color="var(--c-muted)" icon="😶" />
      </div>

      <div className="stats-page-rachas" style={{ marginTop: 8 }}>
        <StreakBar label="Mejor racha" value={player.bestStreak} max={streakMax} color="var(--c-green)" />
        <StreakBar label="Peor racha" value={player.worstStreak} max={streakMax} color="var(--c-red)" />
        <div className="current-streak-box">
          <span className="current-streak-label">Racha actual</span>
          <span
            className="current-streak-val"
            style={{ color: player.currentStreak > 0 ? 'var(--c-green)' : player.currentStreak < 0 ? 'var(--c-red)' : 'var(--c-muted)' }}
          >
            {player.currentStreak > 0 ? `+${player.currentStreak} ✓` : player.currentStreak < 0 ? `${Math.abs(player.currentStreak)} ✗` : 'Neutral'}
          </span>
        </div>
      </div>

      {groupAvg && (
        <div className="stats-page-vs" style={{ marginTop: 8 }}>
          <div className="vs-page-row">
            <div className="vs-page-label">% Aciertos vs promedio del grupo</div>
            <div className="vs-page-values">
              <span className="vs-page-me" style={{ color: player.pctCorrect >= groupAvg.avgPctCorrect ? 'var(--c-green)' : 'var(--c-red)' }}>
                {player.displayName?.split(' ')[0] || 'Jugador'}: {player.pctCorrect}%
              </span>
              <span className="vs-page-global">Grupo: {groupAvg.avgPctCorrect}%</span>
              <span className="vs-page-diff" style={{ color: player.pctCorrect >= groupAvg.avgPctCorrect ? 'var(--c-green)' : 'var(--c-red)' }}>
                {player.pctCorrect >= groupAvg.avgPctCorrect ? `+${player.pctCorrect - groupAvg.avgPctCorrect}` : `${player.pctCorrect - groupAvg.avgPctCorrect}`}
              </span>
            </div>
            <div className="vs-page-bar-wrap">
              <div className="vs-page-bar-me" style={{ width: `${player.pctCorrect}%` }} />
              <div className="vs-page-bar-global" style={{ left: `${groupAvg.avgPctCorrect}%` }} />
            </div>
          </div>

          <div className="vs-page-row">
            <div className="vs-page-label">Puntos vs promedio del grupo</div>
            <div className="vs-page-values">
              <span className="vs-page-me" style={{ color: player.totalPts >= groupAvg.avgPts ? 'var(--c-green)' : 'var(--c-red)' }}>
                {player.totalPts} pts
              </span>
              <span className="vs-page-global">Grupo: {groupAvg.avgPts} pts</span>
              <span className="vs-page-diff" style={{ color: player.totalPts >= groupAvg.avgPts ? 'var(--c-green)' : 'var(--c-red)' }}>
                {player.totalPts >= groupAvg.avgPts ? `+${player.totalPts - groupAvg.avgPts}` : `${player.totalPts - groupAvg.avgPts}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {player.topTeams?.length > 0 && (
        <>
          <div className="pstats-subtitle">Equipos que mejor predice</div>
          <div className="stats-top-teams">
            {player.topTeams.map((t, i) => (
              <div key={t.team} className="stats-top-team-row">
                <span className="stats-top-rank">#{i + 1}</span>
                <Flag country={t.team} size={20} />
                <span className="stats-top-name">{t.team}</span>
                <div className="stats-top-bar-wrap">
                  <div className="stats-top-bar-fill" style={{ width: `${t.pct}%` }} />
                </div>
                <span className="stats-top-pct">{t.pct}%</span>
                <span className="stats-top-total">({t.total} partidos)</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlayerRow({ player, rank, expanded, onToggle, groupAvg }) {
  return (
    <div className="pstats-player-card">
      <button className="pstats-player-header" onClick={onToggle}>
        <span className="pstats-player-rank">{rank}</span>
        <Avatar player={player} />
        <div className="pstats-player-info">
          <div className="pstats-player-name">{player.displayName || player.email}</div>
          <div className="pstats-player-sub">
            {player.hasStats ? `${player.totalPlayed} jugados · ${player.predSent} enviados` : 'Sin pronósticos aún'}
          </div>
        </div>
        <div className="pstats-player-quick">
          <div className="pstats-mini-stat">
            <span className="pstats-mini-val">{player.totalPts}</span>
            <span className="pstats-mini-label">pts</span>
          </div>
          <div className="pstats-mini-stat">
            <span className="pstats-mini-val" style={{ color: 'var(--c-green)' }}>{player.hasStats ? `${player.pctCorrect}%` : '–'}</span>
            <span className="pstats-mini-label">aciertos</span>
          </div>
          <div className="pstats-mini-stat pstats-mini-stat--streak">
            <span
              className="pstats-mini-val"
              style={{ color: player.currentStreak > 0 ? 'var(--c-green)' : player.currentStreak < 0 ? 'var(--c-red)' : 'var(--c-muted)' }}
            >
              {player.currentStreak > 0 ? `+${player.currentStreak}` : player.currentStreak < 0 ? player.currentStreak : '–'}
            </span>
            <span className="pstats-mini-label">racha</span>
          </div>
        </div>
        <span className="pstats-player-toggle">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && <PlayerDetail player={player} groupAvg={groupAvg} />}
    </div>
  );
}

export default function AdminPlayerStats({ adminUids = [], onBack }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('totalPts');
  const [expandedUid, setExpandedUid] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [usersSnap, statsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'stats')),
      ]);
      const statsMap = {};
      statsSnap.docs.forEach(d => { statsMap[d.id] = d.data(); });

      const list = usersSnap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(u => !adminUids.includes(u.uid) && !u.isAdmin)
        .map(u => {
          const s = statsMap[u.uid];
          const hasStats = !!s && (s.totalPlayed || 0) > 0;
          const merged = { ...DEFAULT_STATS, ...(s || {}) };
          const pctMiss = merged.predSent > 0 ? Math.round((merged.miss / merged.predSent) * 100) : 0;
          return { ...u, ...merged, pctMiss, hasStats };
        });

      if (active) {
        setPlayers(list);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [JSON.stringify(adminUids)]);

  const activePlayers = useMemo(() => players.filter(p => p.hasStats), [players]);

  const groupAvg = useMemo(() => {
    if (activePlayers.length === 0) return null;
    const avg = (key) => Math.round(activePlayers.reduce((sum, p) => sum + (p[key] || 0), 0) / activePlayers.length);
    return {
      avgPts: avg('totalPts'),
      avgPctCorrect: avg('pctCorrect'),
      avgPctExact: avg('pctExact'),
      avgPctMiss: avg('pctMiss'),
    };
  }, [activePlayers]);

  const records = useMemo(() => {
    if (activePlayers.length === 0) return null;
    const top = (key) => activePlayers.reduce((best, p) => (p[key] > (best?.[key] ?? -Infinity) ? p : best), null);
    return {
      pctCorrect: top('pctCorrect'),
      exact: top('exact'),
      currentStreak: top('currentStreak'),
      bestStreak: top('bestStreak'),
    };
  }, [activePlayers]);

  const podium = useMemo(() => (
    [...activePlayers].sort((a, b) => b.totalPts - a.totalPts || b.exact - a.exact).slice(0, 3)
  ), [activePlayers]);

  // Posición fija en el ranking general por puntos, independiente del orden/búsqueda elegidos
  const rankMap = useMemo(() => {
    const ranked = [...players].sort((a, b) => b.totalPts - a.totalPts || b.exact - a.exact);
    const m = {};
    ranked.forEach((p, i) => { m[p.uid] = i + 1; });
    return m;
  }, [players]);

  const filteredSorted = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = players.filter(p =>
      !term ||
      (p.displayName || '').toLowerCase().includes(term) ||
      (p.email || '').toLowerCase().includes(term)
    );
    return [...list].sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0) || b.totalPts - a.totalPts);
  }, [players, search, sortKey]);

  return (
    <div className="stats-page">
      <div className="stats-page-header">
        <button className="stats-back-btn" onClick={onBack}>← Volver</button>
        <div className="stats-page-user">
          <div className="stats-page-avatar stats-page-avatar-initials">📊</div>
          <div>
            <div className="stats-page-name">Estadísticas de jugadores</div>
            <div className="stats-page-subtitle">
              {loading ? 'Cargando...' : `${players.length} participante${players.length === 1 ? '' : 's'} (sin contar admins)`}
            </div>
          </div>
        </div>
      </div>

      <div className="stats-page-content">
        <div className="admin-notice">
          📌 Estos puntos son los de pronósticos (aciertos y exactos) y no incluyen el bonus de campeón ni ajustes manuales. Para el puntaje oficial del torneo, mirá la pestaña Ranking. Los usuarios admin no aparecen en este listado.
        </div>

        {loading && <div className="stats-page-loading">Cargando estadísticas...</div>}

        {!loading && players.length === 0 && (
          <div className="stats-page-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontFamily: 'Bebas Neue, sans-serif', color: 'var(--c-accent)', letterSpacing: '0.04em', marginBottom: 8 }}>
              Todavía no hay jugadores
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-muted)', lineHeight: 1.6 }}>
              Cuando se registren participantes y carguen pronósticos, sus estadísticas van a aparecer acá.
            </div>
          </div>
        )}

        {!loading && players.length > 0 && (
          <>
            {/* Resumen general */}
            <div className="stats-section-title">Resumen general</div>
            <div className="admin-users-summary">
              <div className="admin-users-stat">
                <span className="admin-users-stat-val">{players.length}</span>
                <span className="admin-users-stat-label">jugadores</span>
              </div>
              <div className="admin-users-stat">
                <span className="admin-users-stat-val">{activePlayers.length}</span>
                <span className="admin-users-stat-label">con pronósticos</span>
              </div>
              <div className="admin-users-stat">
                <span className="admin-users-stat-val">{groupAvg ? groupAvg.avgPts : '–'}</span>
                <span className="admin-users-stat-label">pts prom.</span>
              </div>
              <div className="admin-users-stat">
                <span className="admin-users-stat-val">{groupAvg ? `${groupAvg.avgPctCorrect}%` : '–'}</span>
                <span className="admin-users-stat-label">aciertos prom.</span>
              </div>
            </div>

            {/* Podio */}
            {podium.length > 0 && (
              <>
                <div className="stats-section-title">🏆 Podio</div>
                <div className="pstats-podium">
                  {podium.map((p, i) => (
                    <div key={p.uid} className={`pstats-podium-card place-${i + 1}`}>
                      <div className="pstats-podium-medal">{['🥇', '🥈', '🥉'][i]}</div>
                      <Avatar player={p} size={48} />
                      <div className="pstats-podium-name">{p.displayName || p.email}</div>
                      <div className="pstats-podium-pts">{p.totalPts} pts</div>
                      <div className="pstats-podium-sub">{p.pctCorrect}% aciertos · {p.exact} exactos</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Récords destacados */}
            {records && (
              <>
                <div className="stats-section-title">Récords destacados</div>
                <div className="pstats-records-grid">
                  <RecordCard icon="🎯" label="Mejor % de aciertos" player={records.pctCorrect} valueKey="pctCorrect" suffix="%" />
                  <RecordCard icon="⚡" label="Más predicciones exactas" player={records.exact} valueKey="exact" />
                  <RecordCard icon="🔥" label="Mejor racha actual" player={records.currentStreak} valueKey="currentStreak" formatter={v => (v > 0 ? `+${v}` : v)} />
                  <RecordCard icon="📈" label="Mejor racha histórica" player={records.bestStreak} valueKey="bestStreak" />
                </div>
              </>
            )}

            {/* Buscador + orden */}
            <div className="stats-section-title">Todos los jugadores</div>
            <div className="pstats-toolbar">
              <input
                className="campeon-search"
                style={{ margin: 0, flex: 1, width: 'auto' }}
                placeholder="Buscar jugador..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select className="admin-third-select pstats-sort-select" value={sortKey} onChange={e => setSortKey(e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>Ordenar: {o.label}</option>)}
              </select>
            </div>

            <div className="pstats-list">
              {filteredSorted.length === 0 && <div className="empty-state">No se encontraron jugadores</div>}
              {filteredSorted.map(p => (
                <PlayerRow
                  key={p.uid}
                  player={p}
                  rank={rankMap[p.uid]}
                  expanded={expandedUid === p.uid}
                  onToggle={() => setExpandedUid(v => (v === p.uid ? null : p.uid))}
                  groupAvg={groupAvg}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
