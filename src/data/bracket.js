// Cruces oficiales del Round of 32 — FIFA World Cup 2026
// Fuente: Wikipedia / Reglamento oficial FIFA Anexo C
// Los espacios de 3ros se cargan manualmente desde el admin

// Cada match tiene:
//   id: identificador único
//   slot1: { type: '1' | '2' | '3', group: 'A'...'L', label }
//   slot2: { type: '1' | '2' | '3', group: 'A'...'L', label }
//   matchNum: número de partido oficial FIFA (73-88)
//   date: fecha estimada

export const BRACKET_MATCHES = [

  { id: 'R32_M73', matchNum: 73, slot1: { type: '2', group: 'A', label: '2° Grupo A' }, slot2: { type: '2', group: 'B', label: '2° Grupo B' }, date: '28 jun', kickoff: '2026-06-28T16:00:00-03:00' },
  
  { id: 'R32_M76', matchNum: 76, slot1: { type: '1', group: 'C', label: '1° Grupo C' }, slot2: { type: '2', group: 'F', label: '2° Grupo F' }, date: '29 jun', kickoff: '2026-06-29T14:00:00-03:00' },
  { id: 'R32_M74', matchNum: 74, slot1: { type: '1', group: 'E', label: '1° Grupo E' }, slot2: { type: '3', group: null, label: 'Mejor 3° (A/B/C/D/F)' }, date: '29 jun', kickoff: '2026-06-29T17:30:00-03:00' },
  { id: 'R32_M75', matchNum: 75, slot1: { type: '1', group: 'F', label: '1° Grupo F' }, slot2: { type: '2', group: 'C', label: '2° Grupo C' }, date: '29 jun', kickoff: '2026-06-29T22:00:00-03:00' },

  { id: 'R32_M78', matchNum: 78, slot1: { type: '2', group: 'E', label: '2° Grupo E' }, slot2: { type: '2', group: 'I', label: '2° Grupo I' }, date: '30 jun', kickoff: '2026-06-30T14:00:00-03:00' },
  { id: 'R32_M77', matchNum: 77, slot1: { type: '1', group: 'I', label: '1° Grupo I' }, slot2: { type: '3', group: null, label: 'Mejor 3° (C/D/F/G/H)' }, date: '30 jun', kickoff: '2026-06-30T18:00:00-03:00' },
  { id: 'R32_M79', matchNum: 79, slot1: { type: '1', group: 'A', label: '1° Grupo A' }, slot2: { type: '3', group: null, label: 'Mejor 3° (C/E/F/H/I)'  }, date: '30 jun', kickoff: '2026-06-30T22:00:00-03:00' },

  { id: 'R32_M80', matchNum: 80, slot1: { type: '1', group: 'L', label: '1° Grupo L' }, slot2: { type: '3', group: null, label: 'Mejor 3° (E/H/I/J/K)'  }, date: '1 jul',  kickoff: '2026-07-01T13:00:00-03:00' },
  { id: 'R32_M82', matchNum: 82, slot1: { type: '1', group: 'G', label: '1° Grupo G' }, slot2: { type: '3', group: null, label: 'Mejor 3° (A/E/H/I/J)'  }, date: '1 jul',  kickoff: '2026-07-01T17:00:00-03:00' },
  { id: 'R32_M81', matchNum: 81, slot1: { type: '1', group: 'D', label: '1° Grupo D' }, slot2: { type: '3', group: null, label: 'Mejor 3° (B/E/F/I/J)'  }, date: '1 jul',  kickoff: '2026-07-01T21:00:00-03:00' },

  { id: 'R32_M84', matchNum: 84, slot1: { type: '1', group: 'H', label: '1° Grupo H' }, slot2: { type: '2', group: 'J', label: '2° Grupo J' }, date: '2 jul',  kickoff: '2026-07-02T16:00:00-03:00' },
  { id: 'R32_M83', matchNum: 83, slot1: { type: '2', group: 'K', label: '2° Grupo K' }, slot2: { type: '2', group: 'L', label: '2° Grupo L' }, date: '2 jul',  kickoff: '2026-07-02T20:00:00-03:00' },

  { id: 'R32_M88', matchNum: 88, slot1: { type: '2', group: 'D', label: '2° Grupo D' }, slot2: { type: '2', group: 'G', label: '2° Grupo G' }, date: '3 jul',  kickoff: '2026-07-03T15:00:00-03:00' },
  { id: 'R32_M86', matchNum: 86, slot1: { type: '1', group: 'J', label: '1° Grupo J' }, slot2: { type: '2', group: 'H', label: '2° Grupo H' }, date: '3 jul',  kickoff: '2026-07-03T19:00:00-03:00' },
  { id: 'R32_M87', matchNum: 87, slot1: { type: '1', group: 'K', label: '1° Grupo K' }, slot2: { type: '3', group: null, label: 'Mejor 3° (D/E/I/J/L)'  }, date: '3 jul',  kickoff: '2026-07-03T22:30:00-03:00' },
  { id: 'R32_M85', matchNum: 85, slot1: { type: '1', group: 'B', label: '1° Grupo B' }, slot2: { type: '3', group: null, label: 'Mejor 3° (E/F/G/I/J)'  }, date: '3 jul',  kickoff: '2026-07-03T00:00:00-03:00' },
];

// Resuelve un slot contra la tabla de posiciones y los terceros manuales
// matchId es necesario para los slots de tipo '3' (terceros clasificados)
export function resolveSlot(slot, standings, manualThirds, matchId) {
  if (slot.type === '3') {
    // Los terceros se guardan en Firestore con clave = matchId del partido
    return (matchId && manualThirds?.[matchId]) || null;
  }
  const pos = slot.type === '1' ? 0 : 1;
  return standings?.[slot.group]?.[pos]?.team || null;
}

// ─── Fixture de 8vos en adelante (fuente única para toda la app) ─────────────
// Kickoffs de R16 en adelante (equipos aún no resueltos hasta que avancen los R32)
export const LATER_ROUND_KICKOFFS = {
  'R16_M89':  '2026-07-04T18:00:00-03:00',
  'R16_M90':  '2026-07-04T14:00:00-03:00',
  'R16_M91':  '2026-07-05T17:00:00-03:00',
  'R16_M92':  '2026-07-05T21:00:00-03:00',
  'R16_M93':  '2026-07-06T16:00:00-03:00',
  'R16_M94':  '2026-07-06T21:00:00-03:00',
  'R16_M95':  '2026-07-07T13:00:00-03:00',
  'R16_M96':  '2026-07-07T17:00:00-03:00',
  'QF_M97':   '2026-07-09T17:00:00-03:00',
  'QF_M98':   '2026-07-10T16:00:00-03:00',
  'QF_M99':   '2026-07-11T18:00:00-03:00',
  'QF_M100':  '2026-07-11T22:00:00-03:00',
  'SF_M101':  '2026-07-14T16:00:00-03:00',
  'SF_M102':  '2026-07-15T16:00:00-03:00',
  'TP_M103':  '2026-07-18T18:00:00-03:00',
  'F_M104':   '2026-07-19T16:00:00-03:00',
};

export const LATER_ROUND_LABELS = {
  R16: '8vos de Final',
  QF:  'Cuartos de Final',
  SF:  'Semifinal',
  TP:  '3er Puesto',
  F:   'Final',
};

// Calcula los cruces de 8vos, cuartos, semis, 3er puesto y final
// en base a los resultados ya cargados de la ronda anterior (knockoutResults).
// Si el partido previo todavía no tiene resultado, el equipo queda como "G <id>" / "P <id>"
// (ganador/perdedor pendiente) para que la UI lo muestre como "?".
export function buildLaterRoundMatches(knockoutResults) {
  const getWinner = (matchId) => {
    const r = knockoutResults?.[matchId];
    if (!r) return `G ${matchId}`;
    if (r.home > r.away) return r.homeTeam || `G ${matchId}`;
    if (r.away > r.home) return r.awayTeam || `G ${matchId}`;
    if (r.penaltyWinner) return r.penaltyWinner;
    return `G ${matchId}`;
  };
  const getLoser = (matchId) => {
    const r = knockoutResults?.[matchId];
    if (!r) return `P ${matchId}`;
    if (r.home > r.away) return r.awayTeam || `P ${matchId}`;
    if (r.away > r.home) return r.homeTeam || `P ${matchId}`;
    if (r.penaltyWinner) return r.penaltyWinner === r.homeTeam ? r.awayTeam : r.homeTeam;
    return `P ${matchId}`;
  };

  const r16 = [
    { id: 'R16_M89',  home: getWinner('R32_M74'), away: getWinner('R32_M77'), label: 'M89', kickoff: LATER_ROUND_KICKOFFS.R16_M89 },
    { id: 'R16_M90',  home: getWinner('R32_M73'), away: getWinner('R32_M75'), label: 'M90', kickoff: LATER_ROUND_KICKOFFS.R16_M90 },
    { id: 'R16_M91',  home: getWinner('R32_M76'), away: getWinner('R32_M78'), label: 'M91', kickoff: LATER_ROUND_KICKOFFS.R16_M91 },
    { id: 'R16_M92',  home: getWinner('R32_M79'), away: getWinner('R32_M80'), label: 'M92', kickoff: LATER_ROUND_KICKOFFS.R16_M92 },
    { id: 'R16_M93',  home: getWinner('R32_M83'), away: getWinner('R32_M84'), label: 'M93', kickoff: LATER_ROUND_KICKOFFS.R16_M93 },
    { id: 'R16_M94',  home: getWinner('R32_M81'), away: getWinner('R32_M82'), label: 'M94', kickoff: LATER_ROUND_KICKOFFS.R16_M94 },
    { id: 'R16_M95',  home: getWinner('R32_M86'), away: getWinner('R32_M88'), label: 'M95', kickoff: LATER_ROUND_KICKOFFS.R16_M95 },
    { id: 'R16_M96',  home: getWinner('R32_M85'), away: getWinner('R32_M87'), label: 'M96', kickoff: LATER_ROUND_KICKOFFS.R16_M96 },
  ];
  const qf = [
    { id: 'QF_M97',  home: getWinner('R16_M89'), away: getWinner('R16_M90'), label: 'M97',  kickoff: LATER_ROUND_KICKOFFS.QF_M97 },
    { id: 'QF_M98',  home: getWinner('R16_M91'), away: getWinner('R16_M92'), label: 'M98',  kickoff: LATER_ROUND_KICKOFFS.QF_M98 },
    { id: 'QF_M99',  home: getWinner('R16_M93'), away: getWinner('R16_M94'), label: 'M99',  kickoff: LATER_ROUND_KICKOFFS.QF_M99 },
    { id: 'QF_M100', home: getWinner('R16_M95'), away: getWinner('R16_M96'), label: 'M100', kickoff: LATER_ROUND_KICKOFFS.QF_M100 },
  ];
  const sf = [
    { id: 'SF_M101', home: getWinner('QF_M97'),  away: getWinner('QF_M98'),  label: 'M101', kickoff: LATER_ROUND_KICKOFFS.SF_M101 },
    { id: 'SF_M102', home: getWinner('QF_M99'),  away: getWinner('QF_M100'), label: 'M102', kickoff: LATER_ROUND_KICKOFFS.SF_M102 },
  ];
  const tp = [
    { id: 'TP_M103', home: getLoser('SF_M101'),  away: getLoser('SF_M102'),  label: 'M103', kickoff: LATER_ROUND_KICKOFFS.TP_M103 },
  ];
  const final = [
    { id: 'F_M104',  home: getWinner('SF_M101'), away: getWinner('SF_M102'), label: 'M104', kickoff: LATER_ROUND_KICKOFFS.F_M104 },
  ];
  return { r16, qf, sf, tp, final };
}

// Devuelve la lista plana de partidos de 8vos en adelante, con home/away
// ya resueltos (o "G/P <id>" si el partido previo todavía no se jugó),
// más su label de ronda (para usar en tarjetas informativas como en "Próximos").
export function buildLaterRoundMatchesFlat(knockoutResults) {
  const { r16, qf, sf, tp, final } = buildLaterRoundMatches(knockoutResults);
  return [
    ...r16.map(m => ({ ...m, label: LATER_ROUND_LABELS.R16 })),
    ...qf.map(m => ({ ...m, label: LATER_ROUND_LABELS.QF })),
    ...sf.map(m => ({ ...m, label: LATER_ROUND_LABELS.SF })),
    ...tp.map(m => ({ ...m, label: LATER_ROUND_LABELS.TP })),
    ...final.map(m => ({ ...m, label: LATER_ROUND_LABELS.F })),
  ];
}
