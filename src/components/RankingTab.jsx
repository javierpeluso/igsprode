import React, { useState } from 'react';

const MEDAL_CONFIG = [
  { emoji: '🥇', label: '1°', glow: '#f0b429', bg: 'linear-gradient(135deg, rgba(240,180,41,0.25) 0%, rgba(240,180,41,0.08) 100%)', border: 'rgba(240,180,41,0.5)', size: 'podium-first' },
  { emoji: '🥈', label: '2°', glow: '#9ca3af', bg: 'linear-gradient(135deg, rgba(156,163,175,0.2) 0%, rgba(156,163,175,0.06) 100%)', border: 'rgba(156,163,175,0.4)', size: 'podium-second' },
  { emoji: '🥉', label: '3°', glow: '#cd7f32', bg: 'linear-gradient(135deg, rgba(205,127,50,0.2) 0%, rgba(205,127,50,0.06) 100%)', border: 'rgba(205,127,50,0.4)', size: 'podium-third' },
];

function TrendIcon({ trend }) {
  if (trend === 'up')   return <span className="rank-trend rank-trend--up" title="Subió">↑</span>;
  if (trend === 'down') return <span className="rank-trend rank-trend--down" title="Bajó">↓</span>;
  return <span className="rank-trend rank-trend--same" title="Sin cambios">·</span>;
}

function Avatar({ user, size = 40 }) {
  if (user.photoURL) {
    return <img src={user.photoURL} alt={user.displayName} className="rank-avatar" style={{ width: size, height: size }} referrerPolicy="no-referrer" />;
  }
  const initials = (user.displayName || user.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="rank-avatar rank-avatar-initials" style={{ width: size, height: size, fontSize: size * 0.35 }}>{initials}</div>;
}

function PodiumCard({ entry, idx, isMe, maxPts }) {
  const cfg = MEDAL_CONFIG[idx];
  const pct = maxPts > 0 ? Math.round((entry.pts / maxPts) * 100) : 0;
  return (
    <div
      className={`podium-card ${cfg.size} ${isMe ? 'is-me' : ''}`}
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <div className="podium-medal">{cfg.emoji}</div>
      <div className="podium-avatar-wrap" style={{ '--glow': cfg.glow }}>
        <Avatar user={entry} size={idx === 0 ? 64 : 52} />
        {isMe && <span className="podium-you">vos</span>}
      </div>
      <div className="podium-name">{entry.displayName || entry.email}</div>
      <div className="podium-pts">
        <span className="podium-pts-num">{entry.pts}</span>
        <span className="podium-pts-label">pts</span>
      </div>
      <div className="podium-bar-wrap">
        <div className="podium-bar" style={{ width: `${pct}%`, background: cfg.glow }} />
      </div>
      <div className="podium-detail">
        <span className="podium-stat exact-stat">{entry.exact}🎯</span>
        <span className="podium-stat">{entry.winner}✅</span>
      </div>
    </div>
  );
}

function RankRow({ entry, idx, isMe, maxPts }) {
  const pct = maxPts > 0 ? Math.round((entry.pts / maxPts) * 100) : 0;
  return (
    <div className={`rank-row-modern ${isMe ? 'is-me' : ''}`}>
      <div className="rank-pos-modern">
        <span className="rank-num-modern">{idx + 1}</span>
      </div>
      <Avatar user={entry} size={38} />
      <div className="rank-info-modern">
        <div className="rank-name-modern">
          <span className="rank-name-text">{entry.displayName || entry.email}</span>
          {isMe && <span className="you-badge">vos</span>}
          <TrendIcon trend={entry.trend} />
        </div>
        <div className="rank-bar-row">
          <div className="rank-mini-bar-bg">
            <div className="rank-mini-bar" style={{ width: `${pct}%` }} />
          </div>
          <span className="rank-mini-stats">{entry.exact}🎯 · {entry.winner}✅ · {entry.played} jugados</span>
        </div>
      </div>
      <div className="rank-pts-modern">
        <span className="rank-pts-num">{entry.pts}</span>
        <span className="rank-pts-lbl">pts</span>
      </div>
    </div>
  );
}

export default function RankingTab({ ranking, loading, currentUid, adminUids = [] }) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="ranking-loading">
        <div className="ranking-spinner" />
        <p>Calculando ranking…</p>
      </div>
    );
  }

  const filteredRanking = ranking.filter(entry => !adminUids.includes(entry.uid));

  if (!filteredRanking.length) {
    return <div className="empty-state">Aún no hay participantes</div>;
  }

  const top3 = filteredRanking.slice(0, 3);
  const rest = filteredRanking.slice(3);
  const maxPts = filteredRanking[0]?.pts || 1;
  const visibleRest = showAll ? rest : rest.slice(0, 7);

  // reorder podium: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumIdx   = [1, 0, 2];

  const myRank = filteredRanking.findIndex(e => e.uid === currentUid);

  return (
    <div className="ranking-modern-wrap">

      {/* ── Legend ── */}
      <div className="pts-legend">
        <span className="legend-item exact">🎯 3 pts exacto</span>
        <span className="legend-item winner">✅ 1 pt ganador</span>
        <span className="legend-item miss">❌ 0 pts</span>
      </div>

      {/* ── Mi posición ── */}
      {myRank >= 3 && (
        <div className="my-position-banner">
          <span className="my-pos-label">Tu posición</span>
          <span className="my-pos-num">#{myRank + 1}</span>
          <span className="my-pos-sep">·</span>
          <span className="my-pos-pts">{filteredRanking[myRank]?.pts ?? 0} pts</span>
        </div>
      )}

      {/* ── Podium ── */}
      {top3.length > 0 && (
        <div className="podium-wrap">
          {podiumOrder.map((entry, i) => (
            <PodiumCard
              key={entry.uid}
              entry={entry}
              idx={podiumIdx[i]}
              isMe={entry.uid === currentUid}
              maxPts={maxPts}
            />
          ))}
        </div>
      )}

      {/* ── Rest of ranking ── */}
      {rest.length > 0 && (
        <div className="ranking-rest">
          <div className="ranking-rest-header">
            <span>Resto del ranking</span>
            <span className="ranking-rest-count">{filteredRanking.length} participantes</span>
          </div>
          <div className="ranking-list-modern">
            {visibleRest.map((entry, i) => (
              <RankRow
                key={entry.uid}
                entry={entry}
                idx={i + 3}
                isMe={entry.uid === currentUid}
                maxPts={maxPts}
              />
            ))}
          </div>
          {rest.length > 7 && (
            <button
              className="ranking-show-more"
              onClick={() => setShowAll(v => !v)}
            >
              {showAll ? 'Ver menos ▲' : `Ver todos (${rest.length - 7} más) ▼`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
