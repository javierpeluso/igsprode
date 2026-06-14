/**
 * useLiveScore — resultado en vivo usando la API pública de ESPN
 * No requiere API key ni proxy CORS — funciona directo desde el browser.
 * Endpoint: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
 */

import { useState, useEffect, useRef } from 'react';

const POLL_LIVE_MS = 45_000;  // en juego: cada 45s
const POLL_HT_MS   = 20_000;  // entretiempo: cada 20s para detectar 2do tiempo rápido

const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// Mapeo nombres locales → nombres/abreviaturas ESPN (en inglés)
const TEAM_MAP = {
  'México':          ['Mexico', 'MEX'],
  'Sudáfrica':       ['South Africa', 'RSA', 'RSA'],
  'Corea del Sur':   ['South Korea', 'Korea Republic', 'KOR'],
  'Rep. Checa':      ['Czech Republic', 'CZE', 'Czechia'],
  'Canadá':          ['Canada', 'CAN'],
  'Bosnia y Herz.':  ['Bosnia and Herzegovina', 'BIH', 'Bosnia'],
  'Catar':           ['Qatar', 'QAT'],
  'Suiza':           ['Switzerland', 'SUI'],
  'Brasil':          ['Brazil', 'BRA'],
  'Marruecos':       ['Morocco', 'MAR'],
  'Haití':           ['Haiti', 'HAI'],
  'Escocia':         ['Scotland', 'SCO'],
  'Estados Unidos':  ['United States', 'USA'],
  'Paraguay':        ['Paraguay', 'PAR'],
  'Australia':       ['Australia', 'AUS'],
  'Turquía':         ['Turkey', 'TUR'],
  'Alemania':        ['Germany', 'GER'],
  'Ecuador':         ['Ecuador', 'ECU'],
  'Costa de Marfil': ["Côte d'Ivoire", 'CIV', 'Ivory Coast'],
  'Curazao':         ['Curaçao', 'CUW', 'Curacao'],
  'España':          ['Spain', 'ESP'],
  'Argentina':       ['Argentina', 'ARG'],
  'Países Bajos':    ['Netherlands', 'NED'],
  'Colombia':        ['Colombia', 'COL'],
  'Portugal':        ['Portugal', 'POR'],
  'Polonia':         ['Poland', 'POL'],
  'Senegal':         ['Senegal', 'SEN'],
  'Croacia':         ['Croatia', 'CRO'],
  'Inglaterra':      ['England', 'ENG'],
  'Irán':            ['Iran', 'IRN'],
  'Japón':           ['Japan', 'JPN'],
  'Serbia':          ['Serbia', 'SRB'],
  'Francia':         ['France', 'FRA'],
  'Dinamarca':       ['Denmark', 'DEN'],
  'Túnez':           ['Tunisia', 'TUN'],
  'Uruguay':         ['Uruguay', 'URU'],
  'Ghana':           ['Ghana', 'GHA'],
  'Camerún':         ['Cameroon', 'CMR'],
  'Gales':           ['Wales', 'WAL'],
  'Arabia Saudita':  ['Saudi Arabia', 'KSA'],
  'Costa Rica':      ['Costa Rica', 'CRC'],
  'Bélgica':         ['Belgium', 'BEL'],
  'Nigeria':         ['Nigeria', 'NGA'],
};

function matchesTeam(espnName, localName) {
  const aliases = TEAM_MAP[localName] || [localName];
  const en = espnName.toLowerCase();
  return aliases.some(a => en.includes(a.toLowerCase()) || a.toLowerCase().includes(en));
}

async function fetchScoreboard() {
  const res = await fetch(ESPN_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`ESPN error: ${res.status}`);
  return res.json();
}

function findEvent(data, localMatch) {
  const events = data?.events || [];
  const kickoffDay = new Date(localMatch.kickoff).toISOString().slice(0, 10);

  return events.find(ev => {
    const evDay = (ev.date || '').slice(0, 10);
    if (evDay !== kickoffDay) return false;
    const comps = ev.competitions?.[0];
    if (!comps) return false;
    const [c1, c2] = comps.competitors || [];
    if (!c1 || !c2) return false;
    const names = [c1.team?.displayName || '', c2.team?.displayName || '',
                   c1.team?.abbreviation || '', c2.team?.abbreviation || ''];
    const homeOk = names.some(n => matchesTeam(n, localMatch.home));
    const awayOk = names.some(n => matchesTeam(n, localMatch.away));
    return homeOk && awayOk;
  });
}

function parseEvent(ev, localMatch) {
  const comp   = ev.competitions?.[0];
  const status = comp?.status;
  const state  = status?.type?.state;       // 'pre' | 'in' | 'post'
  const detail = status?.type?.shortDetail || status?.type?.detail || '';
  const minute = status?.displayClock || null;
  const period = status?.period || null;

  // Determinar status normalizado
  let normalized;
  if (state === 'post')                         normalized = 'FINISHED';
  else if (detail.toLowerCase().includes('half')) normalized = 'HALFTIME';
  else if (state === 'in')                      normalized = 'IN_PLAY';
  else                                          normalized = 'SCHEDULED';

  // Buscar scores — ESPN pone home/away con atributo homeAway
  const competitors = comp?.competitors || [];
  let homeScore = null, awayScore = null;

  // Identificamos cuál competitor es local y cuál visitante
  competitors.forEach(c => {
    const name = c.team?.displayName || c.team?.abbreviation || '';
    const score = parseInt(c.score, 10);
    if (matchesTeam(name, localMatch.home)) homeScore = isNaN(score) ? 0 : score;
    else if (matchesTeam(name, localMatch.away)) awayScore = isNaN(score) ? 0 : score;
  });

  // Fallback: si no matcheó por nombre, usar orden (primer competitor = home según ESPN)
  if (homeScore === null && competitors[0]) homeScore = parseInt(competitors[0].score, 10) || 0;
  if (awayScore === null && competitors[1]) awayScore = parseInt(competitors[1].score, 10) || 0;

  return {
    status:    normalized,
    minute:    minute,
    period:    period,
    liveScore: { home: homeScore ?? 0, away: awayScore ?? 0 },
  };
}

export function useLiveScore(match) {
  const [liveScore, setLiveScore] = useState(null);
  const [status,    setStatus]    = useState(null);
  const [minute,    setMinute]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const timer     = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    if (!match) {
      setLiveScore(null); setStatus(null); setMinute(null); setError(null);
      return;
    }

    const kickoffMs = new Date(match.kickoff).getTime();
    const endMs     = kickoffMs + 130 * 60_000;

    const scheduleNext = () => {
      clearInterval(timer.current);
      const ms = statusRef.current === 'HALFTIME' ? POLL_HT_MS : POLL_LIVE_MS;
      timer.current = setInterval(poll, ms);
    };

    const poll = async () => {
      const now = Date.now();
      if (now < kickoffMs - 5 * 60_000 || now > endMs) return;

      setLoading(true);
      try {
        const data  = await fetchScoreboard();
        const event = findEvent(data, match);

        if (!event) {
          setError('Partido no encontrado en ESPN');
          setLoading(false);
          return;
        }

        const parsed = parseEvent(event, match);
        setStatus(parsed.status);
        setMinute(parsed.minute);
        setLiveScore(parsed.liveScore);
        statusRef.current = parsed.status;
        setError(null);

        scheduleNext();
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    poll();
    timer.current = setInterval(poll, POLL_LIVE_MS);

    return () => {
      clearInterval(timer.current);
      statusRef.current = null;
    };
  }, [match?.id]);

  return { liveScore, status, minute, loading, error };
}
