import React from 'react';
import { calcPoints } from '../data/fixture';
import { useAllPredictions } from '../hooks/useAllPredictions';

function Avatar({ user }) {
  if (user.photoURL) {
    return <img src={user.photoURL} alt={user.displayName} className="pred-avatar" referrerPolicy="no-referrer" />;
  }
  const initials = (user.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pred-avatar pred-avatar-initials">{initials}</div>;
}

export default function MatchPredictions({ match, result, currentUid }) {
  const { allPreds, loading } = useAllPredictions(match.id, !!result);

  if (!result) return null;
  if (loading) return <div className="preds-loading">Cargando pronósticos...</div>;

  return (
    <div className="match-predictions">
      <div className="preds-title">Pronósticos de todos</div>
      <div className="preds-list">
        {allPreds.map(({ uid, displayName, photoURL, prediction }) => {
          const pts = calcPoints(prediction, result);
          const isMe = uid === currentUid;

          return (
            <div key={uid} className={`pred-row ${isMe ? 'is-me' : ''}`}>
              <Avatar user={{ displayName, photoURL }} />
              <span className="pred-name">
                {displayName}
                {isMe && <span className="you-badge">vos</span>}
              </span>
              <span className="pred-score">
                {prediction
                  ? `${prediction.home} – ${prediction.away}`
                  : <span className="pred-none">–</span>
                }
              </span>
              <span className={`pred-pts ${pts === 3 ? 'exact' : pts === 1 ? 'winner' : pts === 0 ? 'miss' : 'no-pred'}`}>
                {pts === 3 ? '⚡ +3' : pts === 1 ? '✓ +1' : pts === 0 ? '✗ 0' : '–'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
