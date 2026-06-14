/**
 * useLiveDetails — datos en vivo detallados usando el endpoint summary de ESPN
 * Devuelve: goles (autor + minuto), tarjetas, y estadísticas del partido
 * No requiere API key.
 */

import { useState, useEffect, useRef } from 'react';

const POLL_MS      = 45_000;
const POLL_HT_MS   = 20_000;

// Usamos el endpoint summary que trae goles, tarjetas y stats del match
const SUMMARY_URL = (eventId) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}`;

// Mapeo nombres locales → nombres/abreviaturas ESPN (igual que useLiveScore)
const TEAM_MAP = {
  'México':          ['Mexico', 'MEX'],
  'Sudáfrica':       ['South Africa', 'RSA'],
  'Corea del Sur':   ['South Korea', 'Korea Republic', 'KOR'],
  'Rep. Checa':      ['Czech Republic', 'CZE', 'Czechia'],
  'Canadá':          ['Canada', 'CAN'],
  'Bosnia y Herz.':  ['Bosnia and Herzegovina', 'BIH'],
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
  const en = (espnName || '').toLowerCase();
  return aliases.some(a => en.includes(a.toLowerCase()) || a.toLowerCase().includes(en));
}

/**
 * Parsea los datos del endpoint /summary
 * Devuelve { goals, cards, matchStats, venue, attendance }
 */
function parseSummary(data, localMatch) {
  const comp = data?.header?.competitions?.[0] || data?.gamepackageJSON?.header?.competitions?.[0];
  const competitors = comp?.competitors || [];

  // Identificar qué competitor es home/away
  let homeComp = null, awayComp = null;
  competitors.forEach(c => {
    const name = c.team?.displayName || c.team?.abbreviation || '';
    if (matchesTeam(name, localMatch.home)) homeComp = c;
    else if (matchesTeam(name, localMatch.away)) awayComp = c;
  });
  // Fallback por orden (ESPN: [0]=home, [1]=away según homeAway field)
  competitors.forEach(c => {
    if (!homeComp && c.homeAway === 'home') homeComp = c;
    if (!awayComp && c.homeAway === 'away') awayComp = c;
  });
  if (!homeComp) homeComp = competitors[0] || {};
  if (!awayComp) awayComp = competitors[1] || {};

  // ── Goles ──────────────────────────────────────────────────────────────────
  const scoringPlays = data?.scoringPlays || [];
  const goals = scoringPlays.map(play => {
    const text    = play.text || play.shortText || '';
    const clock   = play.clock?.displayValue || '';
    const period  = play.period?.number || 1;
    // Determinar side
    const teamId  = play.team?.id;
    let side = 'home';
    if (homeComp?.team?.id && teamId === homeComp.team.id) side = 'home';
    else if (awayComp?.team?.id && teamId === awayComp.team.id) side = 'away';
    return { text, clock, period, side, type: play.scoringType?.displayName || 'Gol' };
  });

  // ── Tarjetas ───────────────────────────────────────────────────────────────
  // ESPN las manda en keyPlays o en los plays generales con type.id
  const keyPlays = data?.keyPlays || [];
  const cards = keyPlays
    .filter(p => {
      const typeId = p.type?.id;
      // ESPN: type id 15 = yellow card, 16 = red card, 17 = yellow-red
      return ['15', '16', '17'].includes(String(typeId));
    })
    .map(p => {
      const typeId = String(p.type?.id);
      const clock  = p.clock?.displayValue || '';
      const text   = p.text || p.shortText || '';
      const teamId = p.team?.id;
      let side = 'home';
      if (homeComp?.team?.id && teamId === homeComp.team.id) side = 'home';
      else if (awayComp?.team?.id && teamId === awayComp.team.id) side = 'away';
      return {
        type: typeId === '16' ? 'red' : typeId === '17' ? 'yr' : 'yellow',
        clock,
        text,
        side,
      };
    });

  // ── Estadísticas del partido ───────────────────────────────────────────────
  const boxTeams = data?.boxscore?.teams || [];
  const matchStats = [];

  const STAT_LABELS = {
    possessionPct:            { label: 'Posesión', suffix: '%' },
    shotsOnTarget:            { label: 'Tiros al arco' },
    shots:                    { label: 'Tiros totales' },
    cornersWon:               { label: 'Córners' },
    foulsCommitted:           { label: 'Faltas' },
    yellowCards:              { label: 'Amarillas' },
    redCards:                 { label: 'Rojas' },
    offsides:                 { label: 'Offside' },
    saves:                    { label: 'Atajadas' },
    blockedShots:             { label: 'Tiros bloqueados' },
    goalKicks:                { label: 'Saques de arco' },
    passesMade:               { label: 'Pases completados' },
    passAccuracyPct:          { label: 'Precisión de pases', suffix: '%' },
  };

  if (boxTeams.length >= 2) {
    // Identificar cuál team box es home/away
    let homeBox = null, awayBox = null;
    boxTeams.forEach(bt => {
      const name = bt.team?.displayName || '';
      if (matchesTeam(name, localMatch.home)) homeBox = bt;
      else if (matchesTeam(name, localMatch.away)) awayBox = bt;
    });
    if (!homeBox) homeBox = boxTeams[0];
    if (!awayBox) awayBox = boxTeams[1];

    const homeStats = {};
    const awayStats = {};
    (homeBox?.statistics || []).forEach(s => { homeStats[s.name] = s.displayValue; });
    (awayBox?.statistics || []).forEach(s => { awayStats[s.name] = s.displayValue; });

    Object.entries(STAT_LABELS).forEach(([key, { label, suffix }]) => {
      if (homeStats[key] !== undefined || awayStats[key] !== undefined) {
        matchStats.push({
          label,
          home: (homeStats[key] ?? '–') + (suffix || ''),
          away: (awayStats[key] ?? '–') + (suffix || ''),
        });
      }
    });
  }

  // ── Venue / Asistencia ────────────────────────────────────────────────────
  const gameInfo = data?.gameInfo || {};
  const venue      = gameInfo.venue?.fullName || gameInfo.venue?.address?.city || '';
  const attendance = gameInfo.attendance ? gameInfo.attendance.toLocaleString('es-AR') : null;

  return { goals, cards, matchStats, venue, attendance };
}

export function useLiveDetails(match) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const timerRef  = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    if (!match?.espnId) {
      setDetails(null);
      return;
    }

    const poll = async () => {
      setLoading(true);
      try {
        const res = await fetch(SUMMARY_URL(match.espnId), { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`ESPN summary error: ${res.status}`);
        const data = await res.json();
        const parsed = parseSummary(data, match);
        setDetails(parsed);
        setError(null);

        // Detectar estado para ajustar polling
        const state = data?.header?.competitions?.[0]?.status?.type?.state;
        statusRef.current = state;
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [match?.espnId, match?.id]);

  return { details, loading, error };
}
