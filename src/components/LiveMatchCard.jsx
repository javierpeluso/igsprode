import React, { useState, useEffect } from 'react';
import { formatKickoff } from '../data/fixture';
import { Flag } from '../data/flags';
import { useLiveScore } from '../hooks/useLiveScore';
import { useLiveDetails } from '../hooks/useLiveDetails';

const isLiveNow = (match) => {
  const now     = Date.now();
  const kickoff = new Date(match.kickoff).getTime();
  return now >= kickoff && now <= kickoff + 140 * 60_000; // 130 min partido + 10 min buffer
};

// ── Evento: gol ──────────────────────────────────────────────────────────────
function GoalEvent({ goal }) {
  const icon =
    goal.type?.toLowerCase().includes('penalty') ? '⚽ (P)' :
    goal.type?.toLowerCase().includes('own')     ? '⚽ (a.p.)' : '⚽';
  return (
    <div className={`lmc-event lmc-event--goal lmc-event--${goal.side}`}>
      <span className="lmc-event-clock">{goal.clock}'</span>
      <span className="lmc-event-icon">{icon}</span>
      <span className="lmc-event-text">{goal.text}</span>
    </div>
  );
}

// ── Evento: tarjeta ──────────────────────────────────────────────────────────
function CardEvent({ card }) {
  const icon = card.type === 'red' ? '🟥' : card.type === 'yr' ? '🟨🟥' : '🟨';
  return (
    <div className={`lmc-event lmc-event--card lmc-event--${card.side}`}>
      <span className="lmc-event-clock">{card.clock}'</span>
      <span className="lmc-event-icon">{icon}</span>
      <span className="lmc-event-text">{card.text}</span>
    </div>
  );
}

// ── Timeline (goles + tarjetas ordenados por minuto) ─────────────────────────
function LiveTimeline({ goals, cards }) {
  const all = [
    ...goals.map(g => ({ ...g, kind: 'goal' })),
    ...cards.map(c => ({ ...c, kind: 'card' })),
  ].sort((a, b) => {
    const am = parseInt((a.clock || '0').replace(/\D/g, '')) || 0;
    const bm = parseInt((b.clock || '0').replace(/\D/g, '')) || 0;
    return am - bm;
  });

  if (all.length === 0) return (
    <div className="lmc-no-events">Sin eventos registrados aún</div>
  );

  return (
    <div className="lmc-timeline">
      {all.map((ev, i) =>
        ev.kind === 'goal'
          ? <GoalEvent key={i} goal={ev} />
          : <CardEvent key={i} card={ev} />
      )}
    </div>
  );
}

// ── Estadísticas del partido ─────────────────────────────────────────────────
function MatchStatsLive({ stats, homeTeam, awayTeam }) {
  if (!stats || stats.length === 0) return null;
  return (
    <div className="lmc-stats">
      <div className="lmc-stats-teams">
        <span>{homeTeam}</span>
        <span>{awayTeam}</span>
      </div>
      {stats.map((s, i) => (
        <div key={i} className="lmc-stats-row">
          <span className="lmc-stats-val lmc-stats-val--home">{s.home}</span>
          <span className="lmc-stats-label">{s.label}</span>
          <span className="lmc-stats-val lmc-stats-val--away">{s.away}</span>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function LiveMatchCard({ match, prediction }) {
  const [showStats, setShowStats] = useState(false);
  const [finishedAt, setFinishedAt] = useState(null); // timestamp cuando se detectó FINISHED

  const live = isLiveNow(match);

  const { liveScore, status: liveStatus, minute: liveMinute } = useLiveScore(live ? match : null);
  const { details } = useLiveDetails(live ? match : null);

  // Registrar cuándo finalizó el partido
  useEffect(() => {
    if (liveStatus === 'FINISHED' && !finishedAt) {
      setFinishedAt(Date.now());
    }
    if (liveStatus !== 'FINISHED') {
      setFinishedAt(null);
    }
  }, [liveStatus]);

  const isHT       = liveStatus === 'HALFTIME';
  const isFinished = liveStatus === 'FINISHED';

  // Mostrar card de partido finalizado hasta 10 min después
  const showFinished = isFinished && finishedAt && (Date.now() - finishedAt < 10 * 60_000);

  const scoreHome  = liveScore?.home ?? '?';
  const scoreAway  = liveScore?.away ?? '?';

  // Extraer solo número de minuto desde ESPN (ej: "45'" → "45")
  const minNum = liveMinute ? liveMinute.toString().replace(/\D/g, '') : null;

  let chipContent;
  if (isHT) {
    chipContent = <><span className="live-dot" />⏸ Entretiempo</>;
  } else if (showFinished) {
    chipContent = <>✓ Finalizado {minNum ? `${minNum}'` : ''}</>;
  } else if (minNum) {
    chipContent = <><span className="live-dot" />{minNum}'</>;
  } else {
    chipContent = <><span className="live-dot" />EN VIVO</>;
  }

  const goals   = details?.goals      || [];
  const cards   = details?.cards      || [];
  const stats   = details?.matchStats || [];
  const venue   = details?.venue      || match.venue || '';
  const attend  = details?.attendance || null;

  return (
    <div className={`lmc-card${isHT ? ' lmc-card--ht' : ''}${isFinished ? ' lmc-card--done' : ''}`}>

      {/* ── Header ── */}
      <div className="lmc-header">
        <span className="lmc-date">{formatKickoff(match.kickoff)}</span>
        <span className={`lmc-chip${isHT ? ' lmc-chip--ht' : isFinished ? ' lmc-chip--done' : ''}`}>
          {chipContent}
        </span>
      </div>

      {/* ── Marcador ── */}
      <div className="lmc-score-row">
        <div className="lmc-team lmc-team--home">
          <Flag country={match.home} />
          <span className="lmc-team-name">{match.home}</span>
        </div>
        <div className={`lmc-scoreboard${isFinished ? ' lmc-scoreboard--final' : ''}`}>
          <span>{scoreHome}</span>
          <span className="lmc-score-sep">–</span>
          <span>{scoreAway}</span>
        </div>
        <div className="lmc-team lmc-team--away">
          <span className="lmc-team-name">{match.away}</span>
          <Flag country={match.away} />
        </div>
      </div>

      {/* ── Venue / Asistencia ── */}
      {(venue || attend) && (
        <div className="lmc-venue">
          {venue && <span>📍 {venue}</span>}
          {attend && <span> · 👥 {attend}</span>}
        </div>
      )}

      {/* ── Pronóstico del usuario ── */}
      <div className="lmc-pred">
        {prediction
          ? <>Tu pronóstico: <strong>{prediction.home} – {prediction.away}</strong></>
          : <span className="lmc-pred--none">No enviaste pronóstico</span>
        }
      </div>

      {/* ── Divider ── */}
      <div className="lmc-divider" />

      {/* ── Eventos del partido ── */}
      <div className="lmc-section-title">Eventos</div>
      <LiveTimeline goals={goals} cards={cards} />

      {/* ── Estadísticas ── */}
      {stats.length > 0 && (
        <>
          <button className="lmc-toggle-btn" onClick={() => setShowStats(s => !s)}>
            {showStats ? 'Ocultar estadísticas ▲' : 'Ver estadísticas del partido ▼'}
          </button>
          {showStats && (
            <MatchStatsLive stats={stats} homeTeam={match.home} awayTeam={match.away} />
          )}
        </>
      )}
    </div>
  );
}
