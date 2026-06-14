import React from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

function TrendIcon({ trend }) {
  if (trend === 'up')   return <span className="rank-trend rank-trend--up"   title="Subió">▲</span>;
  if (trend === 'down') return <span className="rank-trend rank-trend--down" title="Bajó">▼</span>;
  return                       <span className="rank-trend rank-trend--same" title="Sin cambios">—</span>;
}

function Avatar({ user }) {
  if (user.photoURL) {
    return <img src={user.photoURL} alt={user.displayName} className="rank-avatar" referrerPolicy="no-referrer" />;
  }
  const initials = (user.displayName || user.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="rank-avatar rank-avatar-initials">{initials}</div>;
}

export default function RankingTab({ ranking, loading, currentUid, adminUids = [] }) {
  if (loading) {
    return <div className="empty-state">Calculando ranking...</div>;
  }

  const filteredRanking = ranking.filter(entry => !adminUids.includes(entry.uid));

  if (!filteredRanking.length) {
    return <div className="empty-state">Aún no hay participantes</div>;
  }

  return (
    <div className="tab-content">
      <div className="pts-legend">
        <span className="legend-item exact">3 pts exacto</span>
        <span className="legend-item winner">1 pt ganador</span>
        <span className="legend-item miss">0 pts</span>
      </div>

      <div className="ranking-list">
        {filteredRanking.map((entry, idx) => (
          <div
            key={entry.uid}
            className={`rank-row ${entry.uid === currentUid ? 'is-me' : ''}`}
          >
            <div className="rank-pos">
              {MEDALS[idx] || <span className="rank-num">{idx + 1}</span>}
            </div>
            <Avatar user={entry} />
            <div className="rank-info">
              <div className="rank-name">
                {entry.displayName || entry.email}
                {entry.uid === currentUid && <span className="you-badge">vos</span>}
                <TrendIcon trend={entry.trend} />
              </div>
              <div className="rank-stats">
                {entry.exact} exactos · {entry.winner} ganador · {entry.played} jugados
              </div>
            </div>
            <div className="rank-pts">
              <span className="pts-number">{entry.pts}</span>
              <span className="pts-label">pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
