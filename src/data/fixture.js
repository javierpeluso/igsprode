// Fixture completo de la fase de grupos del Mundial 2026
// Las fechas/horas son en UTC-3 (Argentina / hora local del usuario)

export const GROUPS = {
  A: {
    name: 'Grupo A',
    teams: ['México', 'Sudáfrica', 'Corea del Sur', 'Rep. Checa'],
    matches: [
      { id: 'A_0', home: 'México',        away: 'Sudáfrica',     kickoff: '2026-06-11T16:00:00-03:00', venue: 'Estadio Azteca, CDMX' },
      { id: 'A_1', home: 'Corea del Sur', away: 'Rep. Checa',    kickoff: '2026-06-11T23:00:00-03:00', venue: 'Estadio Akron, Guadalajara' },
      { id: 'A_2', home: 'México',        away: 'Corea del Sur', kickoff: '2026-06-18T22:00:00-03:00', venue: 'Estadio Azteca, CDMX' },
      { id: 'A_3', home: 'Rep. Checa',    away: 'Sudáfrica',     kickoff: '2026-06-18T13:00:00-03:00', venue: 'Mercedes-Benz, Atlanta' },
      { id: 'A_4', home: 'Sudáfrica',     away: 'Corea del Sur', kickoff: '2026-06-24T22:00:00-03:00', venue: 'Estadio BBVA, Monterrey' },
      { id: 'A_5', home: 'Rep. Checa',    away: 'México',        kickoff: '2026-06-24T22:00:00-03:00', venue: 'Mercedes-Benz, Atlanta' },
    ],
  },
  B: {
    name: 'Grupo B',
    teams: ['Canadá', 'Bosnia y Herz.', 'Catar', 'Suiza'],
    matches: [
      { id: 'B_0', home: 'Canadá',         away: 'Bosnia y Herz.', kickoff: '2026-06-12T16:00:00-03:00', venue: 'BMO Field, Toronto' },
      { id: 'B_1', home: 'Catar',          away: 'Suiza',          kickoff: '2026-06-13T16:00:00-03:00', venue: "Levi's Stadium, San Francisco" },
      { id: 'B_2', home: 'Canadá',         away: 'Catar',          kickoff: '2026-06-18T19:00:00-03:00', venue: 'BC Place, Vancouver' },
      { id: 'B_3', home: 'Suiza',          away: 'Bosnia y Herz.', kickoff: '2026-06-18T16:00:00-03:00', venue: 'SoFi Stadium, Los Ángeles' },
      { id: 'B_4', home: 'Bosnia y Herz.', away: 'Catar',          kickoff: '2026-06-24T16:00:00-03:00', venue: 'Lumen Field, Seattle' },
      { id: 'B_5', home: 'Suiza',          away: 'Canadá',         kickoff: '2026-06-24T16:00:00-03:00', venue: 'SoFi Stadium, Los Ángeles' },
    ],
  },
  C: {
    name: 'Grupo C',
    teams: ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
    matches: [
      { id: 'C_0', home: 'Brasil',    away: 'Marruecos', kickoff: '2026-06-13T19:00:00-03:00', venue: 'MetLife Stadium, Nueva York' },
      { id: 'C_1', home: 'Haití',     away: 'Escocia',   kickoff: '2026-06-13T22:00:00-03:00', venue: 'Gillette Stadium, Boston' },
      { id: 'C_2', home: 'Brasil',    away: 'Haití',     kickoff: '2026-06-19T21:30:00-03:00', venue: 'Lincoln Financial, Filadelfia' },
      { id: 'C_3', home: 'Escocia',   away: 'Marruecos', kickoff: '2026-06-19T19:00:00-03:00', venue: 'Hard Rock Stadium, Miami' },
      { id: 'C_4', home: 'Marruecos', away: 'Haití',     kickoff: '2026-06-24T19:00:00-03:00', venue: 'Mercedes-Benz, Atlanta' },
      { id: 'C_5', home: 'Escocia',   away: 'Brasil',    kickoff: '2026-06-24T19:00:00-03:00', venue: 'MetLife Stadium, Nueva York' },
    ],
  },
  D: {
    name: 'Grupo D',
    teams: ['Estados Unidos', 'Paraguay', 'Australia', 'Turquía'],
    matches: [
      { id: 'D_0', home: 'Estados Unidos', away: 'Paraguay',       kickoff: '2026-06-12T22:00:00-03:00', venue: 'SoFi Stadium, Los Ángeles' },
      { id: 'D_1', home: 'Australia',      away: 'Turquía',        kickoff: '2026-06-14T01:00:00-03:00', venue: 'Lumen Field, Seattle' },
      { id: 'D_2', home: 'Estados Unidos', away: 'Australia',      kickoff: '2026-06-19T16:00:00-03:00', venue: "Levi's Stadium, San Francisco" },
      { id: 'D_3', home: 'Turquía',        away: 'Paraguay',       kickoff: '2026-06-20T00:00:00-03:00', venue: 'BC Place, Vancouver' },
      { id: 'D_4', home: 'Paraguay',       away: 'Australia',      kickoff: '2026-06-25T23:00:00-03:00', venue: 'SoFi Stadium, Los Ángeles' },
      { id: 'D_5', home: 'Turquía',        away: 'Estados Unidos', kickoff: '2026-06-25T23:00:00-03:00', venue: 'Lumen Field, Seattle' },
    ],
  },
  E: {
    name: 'Grupo E',
    teams: ['Alemania', 'Ecuador', 'Costa de Marfil', 'Curazao'],
    matches: [
      { id: 'E_0', home: 'Alemania',        away: 'Curazao',         kickoff: '2026-06-14T14:00:00-03:00', venue: 'NRG Stadium, Houston' },
      { id: 'E_1', home: 'Costa de Marfil', away: 'Ecuador',         kickoff: '2026-06-14T20:00:00-03:00', venue: 'Lincoln Financial, Filadelfia' },
      { id: 'E_2', home: 'Alemania',        away: 'Costa de Marfil', kickoff: '2026-06-20T17:00:00-03:00', venue: 'BMO Field, Toronto' },
      { id: 'E_3', home: 'Ecuador',         away: 'Curazao',         kickoff: '2026-06-20T21:00:00-03:00', venue: 'Arrowhead Stadium, Kansas City' },
      { id: 'E_4', home: 'Ecuador',         away: 'Alemania',        kickoff: '2026-06-25T17:00:00-03:00', venue: 'MetLife Stadium, Nueva York' },
      { id: 'E_5', home: 'Curazao',         away: 'Costa de Marfil', kickoff: '2026-06-25T17:00:00-03:00', venue: 'NRG Stadium, Houston' },
    ],
  },
  F: {
    name: 'Grupo F',
    teams: ['Países Bajos', 'Japón', 'Túnez', 'Suecia'],
    matches: [
      { id: 'F_0', home: 'Países Bajos', away: 'Japón',        kickoff: '2026-06-14T17:00:00-03:00', venue: 'AT&T Stadium, Dallas' },
      { id: 'F_1', home: 'Túnez',        away: 'Suecia',       kickoff: '2026-06-14T23:00:00-03:00', venue: 'Estadio BBVA, Monterrey' },
      { id: 'F_5', home: 'Suecia',       away: 'Países Bajos', kickoff: '2026-06-20T14:00:00-03:00', venue: 'Estadio BBVA, Monterrey' },
      { id: 'F_4', home: 'Japón',        away: 'Túnez',        kickoff: '2026-06-21T01:00:00-03:00', venue: 'AT&T Stadium, Dallas' },
      { id: 'F_2', home: 'Países Bajos', away: 'Túnez',        kickoff: '2026-06-25T20:00:00-03:00', venue: 'NRG Stadium, Houston' },
      { id: 'F_3', home: 'Suecia',       away: 'Japón',        kickoff: '2026-06-25T20:00:00-03:00', venue: 'Arrowhead Stadium, Kansas City' },
    ],
  },
  G: {
    name: 'Grupo G',
    teams: ['Bélgica', 'Egipto', 'Irán', 'Nueva Zelanda'],
    matches: [
      { id: 'G_0', home: 'Bélgica',       away: 'Egipto',        kickoff: '2026-06-15T16:00:00-03:00', venue: 'Mercedes-Benz, Atlanta' },
      { id: 'G_1', home: 'Irán',          away: 'Nueva Zelanda', kickoff: '2026-06-15T22:00:00-03:00', venue: 'Hard Rock Stadium, Miami' },
      { id: 'G_2', home: 'Bélgica',       away: 'Irán',          kickoff: '2026-06-21T16:00:00-03:00', venue: 'NRG Stadium, Houston' },
      { id: 'G_3', home: 'Nueva Zelanda', away: 'Egipto',        kickoff: '2026-06-21T22:00:00-03:00', venue: 'Estadio Akron, Guadalajara' },
      { id: 'G_4', home: 'Egipto',        away: 'Irán',          kickoff: '2026-06-27T00:00:00-03:00', venue: 'Hard Rock Stadium, Miami' },
      { id: 'G_5', home: 'Nueva Zelanda', away: 'Bélgica',       kickoff: '2026-06-27T00:00:00-03:00', venue: 'Mercedes-Benz, Atlanta' },
    ],
  },
  H: {
    name: 'Grupo H',
    teams: ['España', 'Uruguay', 'Arabia Saudita', 'Cabo Verde'],
    matches: [
      { id: 'H_5', home: 'Cabo Verde',     away: 'España',         kickoff: '2026-06-15T13:00:00-03:00', venue: 'Lincoln Financial, Filadelfia' },
      { id: 'H_4', home: 'Uruguay',        away: 'Arabia Saudita', kickoff: '2026-06-15T19:00:00-03:00', venue: 'Gillette Stadium, Boston' },
      { id: 'H_2', home: 'España',         away: 'Arabia Saudita', kickoff: '2026-06-21T13:00:00-03:00', venue: 'Lincoln Financial, Filadelfia' },
      { id: 'H_3', home: 'Cabo Verde',     away: 'Uruguay',        kickoff: '2026-06-21T19:00:00-03:00', venue: 'Hard Rock Stadium, Miami' },
      { id: 'H_0', home: 'España',         away: 'Uruguay',        kickoff: '2026-06-26T21:00:00-03:00', venue: 'MetLife Stadium, Nueva York' },
      { id: 'H_1', home: 'Arabia Saudita', away: 'Cabo Verde',     kickoff: '2026-06-26T21:00:00-03:00', venue: 'Gillette Stadium, Boston' },
    ],
  },
  I: {
    name: 'Grupo I',
    teams: ['Francia', 'Senegal', 'Noruega', 'Irak'],
    matches: [
      { id: 'I_0', home: 'Francia',  away: 'Senegal', kickoff: '2026-06-16T16:00:00-03:00', venue: 'NRG Stadium, Houston' },
      { id: 'I_1', home: 'Noruega',  away: 'Irak',    kickoff: '2026-06-16T19:00:00-03:00', venue: 'Estadio Azteca, CDMX' },
      { id: 'I_5', home: 'Irak',     away: 'Francia', kickoff: '2026-06-22T18:00:00-03:00', venue: 'Mercedes-Benz, Atlanta' },
      { id: 'I_4', home: 'Senegal',  away: 'Noruega', kickoff: '2026-06-22T21:00:00-03:00', venue: 'Hard Rock Stadium, Miami' },
      { id: 'I_2', home: 'Francia',  away: 'Noruega', kickoff: '2026-06-26T16:00:00-03:00', venue: 'NRG Stadium, Houston' },
      { id: 'I_3', home: 'Irak',     away: 'Senegal', kickoff: '2026-06-26T16:00:00-03:00', venue: 'Estadio Akron, Guadalajara' },
    ],
  },
  J: {
    name: 'Grupo J',
    teams: ['Argentina', 'Argelia', 'Austria', 'Jordania'],
    matches: [
      { id: 'J_0', home: 'Argentina', away: 'Argelia',   kickoff: '2026-06-16T22:00:00-03:00', venue: 'AT&T Stadium, Dallas' },
      { id: 'J_1', home: 'Austria',   away: 'Jordania',  kickoff: '2026-06-17T01:00:00-03:00', venue: "Levi's Stadium, San Francisco" },
      { id: 'J_2', home: 'Argentina', away: 'Austria',   kickoff: '2026-06-22T14:00:00-03:00', venue: 'AT&T Stadium, Dallas' },
      { id: 'J_3', home: 'Jordania',  away: 'Argelia',   kickoff: '2026-06-23T00:00:00-03:00', venue: 'Arrowhead Stadium, Kansas City' },
      { id: 'J_4', home: 'Argelia',   away: 'Austria',   kickoff: '2026-06-27T23:00:00-03:00', venue: 'AT&T Stadium, Dallas' },
      { id: 'J_5', home: 'Jordania',  away: 'Argentina', kickoff: '2026-06-27T23:00:00-03:00', venue: "Levi's Stadium, San Francisco" },
    ],
  },
  K: {
    name: 'Grupo K',
    teams: ['Portugal', 'Colombia', 'Uzbekistán', 'R.D. Congo'],
    matches: [
      { id: 'K_0', home: 'Portugal',   away: 'R.D. Congo', kickoff: '2026-06-17T14:00:00-03:00', venue: 'NRG Stadium, Houston' },
      { id: 'K_1', home: 'Uzbekistán', away: 'Colombia',   kickoff: '2026-06-17T23:00:00-03:00', venue: 'Estadio Azteca, CDMX' },
      { id: 'K_2', home: 'Portugal',   away: 'Uzbekistán', kickoff: '2026-06-23T14:00:00-03:00', venue: 'BMO Field, Toronto' },
      { id: 'K_3', home: 'Colombia',   away: 'R.D. Congo', kickoff: '2026-06-23T23:00:00-03:00', venue: 'Gillette Stadium, Boston' },
      { id: 'K_4', home: 'Colombia',   away: 'Portugal',   kickoff: '2026-06-27T20:30:00-03:00', venue: 'MetLife Stadium, Nueva York' },
      { id: 'K_5', home: 'R.D. Congo', away: 'Uzbekistán', kickoff: '2026-06-27T20:30:00-03:00', venue: 'Lincoln Financial, Filadelfia' },
    ],
  },
  L: {
    name: 'Grupo L',
    teams: ['Inglaterra', 'Croacia', 'Ghana', 'Panamá'],
    matches: [
      { id: 'L_2', home: 'Inglaterra', away: 'Croacia',    kickoff: '2026-06-17T17:00:00-03:00', venue: 'Lincoln Financial, Filadelfia' },
      { id: 'L_3', home: 'Panamá',     away: 'Ghana',      kickoff: '2026-06-17T20:00:00-03:00', venue: 'Hard Rock Stadium, Miami' },
      { id: 'L_0', home: 'Inglaterra', away: 'Ghana',      kickoff: '2026-06-23T17:00:00-03:00', venue: 'MetLife Stadium, Nueva York' },
      { id: 'L_1', home: 'Croacia',    away: 'Panamá',     kickoff: '2026-06-23T20:00:00-03:00', venue: 'Gillette Stadium, Boston' },
      { id: 'L_4', home: 'Ghana',      away: 'Croacia',    kickoff: '2026-06-27T18:00:00-03:00', venue: 'Lincoln Financial, Filadelfia' },
      { id: 'L_5', home: 'Panamá',     away: 'Inglaterra', kickoff: '2026-06-27T18:00:00-03:00', venue: 'MetLife Stadium, Nueva York' },
    ],
  },
};

export const ALL_MATCHES = Object.values(GROUPS).flatMap(g => g.matches);

// Devuelve true si ya pasaron las 2hs previas al partido (pronóstico cerrado)
export const isClosed = (match) => {
  const cutoff = new Date(match.kickoff).getTime() - 10 * 60 * 1000;
  return Date.now() >= cutoff;
};

// Texto legible de la fecha/hora
export const formatKickoff = (kickoff) => {
  const d = new Date(kickoff);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs';
};

export const calcPoints = (prediction, result) => {
  if (!prediction || !result) return null;
  if (prediction.home === result.home && prediction.away === result.away) return 3;
  const predWinner = prediction.home > prediction.away ? 'H' : prediction.home < prediction.away ? 'A' : 'D';
  const resWinner  = result.home  > result.away  ? 'H' : result.home  < result.away  ? 'A' : 'D';
  if (predWinner === resWinner) return 1;
  return 0;
};
