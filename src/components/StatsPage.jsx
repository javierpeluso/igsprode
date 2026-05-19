import React from 'react';
import { useUserStats, useGlobalStats } from '../hooks/useProfile';
import { Flag } from '../data/flags';

function StatCard({ label, value, sub, color, icon }) {
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

export default function StatsPage({ user, onBack }) {
  const { stats, loading } = useUserStats(user.uid);
  const global = useGlobalStats();

  return (
    <div className="stats-page">
      {/* Header */}
      <div className="stats-page-header">
        <button className="stats-back-btn" onClick={onBack}>← Volver</button>
        <div className="stats-page-user">
          {user.photoURL
            ? <img src={user.photoURL} alt={user.displayName} className="stats-page-avatar" referrerPolicy="no-referrer" />
            : <div className="stats-page-avatar stats-page-avatar-initials">{(user.displayName || 'U')[0]}</div>
          }
          <div>
            <div className="stats-page-name">{user.displayName}</div>
            <div className="stats-page-subtitle">Mis estadísticas</div>
          </div>
        </div>
      </div>

      <div className="stats-page-content">
        {loading && <div className="stats-page-loading">Cargando estadísticas...</div>}

        {!loading && !stats && (
          <div className="stats-page-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontFamily: 'Bebas Neue, sans-serif', color: 'var(--c-accent)', letterSpacing: '0.04em', marginBottom: 8 }}>
              Todavía no hay estadísticas
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-muted)', lineHeight: 1.6 }}>
              Las estadísticas se generan automáticamente cuando el admin cargue los primeros resultados y vos hayas enviado tus pronósticos.
            </div>
          </div>
        )}

        {!loading && stats && stats.totalPlayed === 0 && (
          <div className="stats-page-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 16, fontFamily: 'Bebas Neue, sans-serif', color: 'var(--c-accent)', letterSpacing: '0.04em', marginBottom: 8 }}>Esperando resultados</div>
            <div style={{ fontSize: 13, color: 'var(--c-muted)', lineHeight: 1.6 }}>Tus estadísticas aparecerán cuando se carguen los primeros resultados.</div>
          </div>
        )}
        {!loading && stats && stats.totalPlayed > 0 && (
          <>
            {/* Puntos destacados */}
            <div className="stats-section-title">Resumen general</div>
            <div className="stats-page-grid-4">
              <StatCard icon="🏆" label="Puntos totales" value={stats.totalPts} />
              <StatCard icon="🎯" label="% Aciertos" value={`${stats.pctCorrect}%`} color="var(--c-green)" />
              <StatCard icon="⚡" label="Exactos" value={stats.exact} color="var(--c-exact)" sub={`${stats.pctExact}% de tus pred.`} />
              <StatCard icon="✅" label="Ganador" value={stats.winner} color="var(--c-winner)" sub={`${stats.pctWinner}% de tus pred.`} />
            </div>

            {/* Participación */}
            <div className="stats-section-title">Participación</div>
            <div className="stats-page-grid-3">
              <StatCard label="Partidos jugados" value={stats.totalPlayed} icon="⚽" />
              <StatCard label="Pronósticos enviados" value={stats.predSent} icon="📨" />
              <StatCard label="Sin pronosticar" value={stats.noPred} color="var(--c-muted)" icon="😶" />
            </div>

            {/* Rachas */}
            <div className="stats-section-title">Rachas</div>
            <div className="stats-page-rachas">
              <StreakBar
                label="Mejor racha"
                value={stats.bestStreak}
                max={Math.max(stats.bestStreak, stats.worstStreak, 1)}
                color="var(--c-green)"
              />
              <StreakBar
                label="Peor racha"
                value={stats.worstStreak}
                max={Math.max(stats.bestStreak, stats.worstStreak, 1)}
                color="var(--c-red)"
              />
              <div className="current-streak-box">
                <span className="current-streak-label">Racha actual</span>
                <span
                  className="current-streak-val"
                  style={{ color: stats.currentStreak > 0 ? 'var(--c-green)' : stats.currentStreak < 0 ? 'var(--c-red)' : 'var(--c-muted)' }}
                >
                  {stats.currentStreak > 0 ? `+${stats.currentStreak} ✓` : stats.currentStreak < 0 ? `${Math.abs(stats.currentStreak)} ✗` : 'Neutral'}
                </span>
                <span className="current-streak-sub">
                  {stats.currentStreak > 0 ? 'consecutivos acertados' : stats.currentStreak < 0 ? 'consecutivos fallados' : ''}
                </span>
              </div>
            </div>

            {/* vs Promedio global */}
            {global && (
              <>
                <div className="stats-section-title">vs Promedio global</div>
                <div className="stats-page-vs">
                  <div className="vs-page-row">
                    <div className="vs-page-label">% Aciertos</div>
                    <div className="vs-page-values">
                      <span className="vs-page-me" style={{ color: stats.pctCorrect >= global.avgPctCorrect ? 'var(--c-green)' : 'var(--c-red)' }}>
                        Vos: {stats.pctCorrect}%
                      </span>
                      <span className="vs-page-global">Global: {global.avgPctCorrect}%</span>
                      <span className="vs-page-diff" style={{ color: stats.pctCorrect >= global.avgPctCorrect ? 'var(--c-green)' : 'var(--c-red)' }}>
                        {stats.pctCorrect >= global.avgPctCorrect ? `+${stats.pctCorrect - global.avgPctCorrect}` : `${stats.pctCorrect - global.avgPctCorrect}`}
                      </span>
                    </div>
                    <div className="vs-page-bar-wrap">
                      <div className="vs-page-bar-me" style={{ width: `${stats.pctCorrect}%` }} />
                      <div className="vs-page-bar-global" style={{ left: `${global.avgPctCorrect}%` }} />
                    </div>
                  </div>

                  <div className="vs-page-row">
                    <div className="vs-page-label">Puntos</div>
                    <div className="vs-page-values">
                      <span className="vs-page-me" style={{ color: stats.totalPts >= global.avgPts ? 'var(--c-green)' : 'var(--c-red)' }}>
                        Vos: {stats.totalPts}
                      </span>
                      <span className="vs-page-global">Global: {global.avgPts}</span>
                      <span className="vs-page-diff" style={{ color: stats.totalPts >= global.avgPts ? 'var(--c-green)' : 'var(--c-red)' }}>
                        {stats.totalPts >= global.avgPts ? `+${stats.totalPts - global.avgPts}` : `${stats.totalPts - global.avgPts}`}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Top equipos */}
            {stats.topTeams?.length > 0 && (
              <>
                <div className="stats-section-title">Equipos que mejor predico</div>
                <div className="stats-top-teams">
                  {stats.topTeams.map((t, i) => (
                    <div key={t.team} className="stats-top-team-row">
                      <span className="stats-top-rank">#{i + 1}</span>
                      <Flag country={t.team} size={22} />
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
          </>
        )}
      </div>
    </div>
  );
}
