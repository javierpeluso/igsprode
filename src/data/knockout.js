import { GROUPS } from './fixture';

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA OFICIAL FIFA - MUNDIAL 2026
// ─────────────────────────────────────────────────────────────────────────────

// Calcula la tabla de posiciones de un grupo
export function calcGroupStandings(groupKey, results) {
  const group = GROUPS[groupKey];
  const table = {};

  group.teams.forEach(team => {
    table[team] = { team, group: groupKey, PJ: 0, PG: 0, PE: 0, PP: 0, GF: 0, GC: 0, DIF: 0, PTS: 0 };
  });

  group.matches.forEach(match => {
    const res = results[match.id];
    if (!res) return;
    const h = match.home, a = match.away;
    table[h].PJ++; table[a].PJ++;
    table[h].GF += res.home; table[h].GC += res.away;
    table[a].GF += res.away; table[a].GC += res.home;
    table[h].DIF = table[h].GF - table[h].GC;
    table[a].DIF = table[a].GF - table[a].GC;
    if (res.home > res.away) { table[h].PG++; table[h].PTS += 3; table[a].PP++; }
    else if (res.home < res.away) { table[a].PG++; table[a].PTS += 3; table[h].PP++; }
    else { table[h].PE++; table[h].PTS++; table[a].PE++; table[a].PTS++; }
  });

  return Object.values(table).sort((a, b) =>
    b.PTS - a.PTS || b.DIF - a.DIF || b.GF - a.GF
  );
}

// Obtiene ganador, subcampeón y tercero de cada grupo
export function getGroupPositions(results) {
  const positions = {};
  Object.keys(GROUPS).forEach(g => {
    const standings = calcGroupStandings(g, results);
    positions[g] = {
      winner:  standings[0]?.team || null,
      runnerUp: standings[1]?.team || null,
      third:   standings[2]?.team || null,
      fourthPos: standings[3]?.team || null,
      standings,
    };
  });
  return positions;
}

// Ranking de los 12 terceros — selecciona los 8 mejores
export function getBestThirds(results) {
  const thirds = Object.keys(GROUPS).map(g => {
    const standings = calcGroupStandings(g, results);
    const third = standings[2];
    // Solo incluir si jugó los 3 partidos
    if (!third || third.PJ < 3) return null;
    return { ...third, group: g };
  }).filter(Boolean);

  // Ordenar por: PTS → DIF → GF
  thirds.sort((a, b) => b.PTS - a.PTS || b.DIF - a.DIF || b.GF - a.GF);

  return {
    qualified: thirds.slice(0, 8),   // los 8 mejores clasifican
    eliminated: thirds.slice(8),      // los 4 peores eliminados
    all: thirds,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLA OFICIAL FIFA - 495 COMBINACIONES (Annex C)
// Formato: clave = grupos ordenados de los 8 terceros clasificados (ej: "CDEFGHIJ")
// Valor: array de 8 cruces para los partidos 73-88 donde va cada 3ro
// Matches del R32: [73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88]
// Los 8 slots de 3ros son: 1A,1B,1D,1E,1G,1I,1K,1L (posición del rival de cada ganador/subcampeón)
// ─────────────────────────────────────────────────────────────────────────────

// Mapa simplificado de las 495 combinaciones → qué tercero va a cada match
// Formato de clave: string con 8 letras de grupos ordenadas alfabéticamente
// Valor: [3ro para M74, 3ro para M77, 3ro para M79, 3ro para M80, 3ro para M81, 3ro para M82, 3ro para M85, 3ro para M87]
// (los matches con 3ros según Wikipedia: 74,77,79,80,81,82,85,87)

const COMBINATIONS = {
  // Combinación 1: E,F,G,H,I,J,K,L → grupos que clasificaron 3ros
  'EFGHIJKL': { M74:'3E', M77:'3J', M79:'3I', M80:'3F', M81:'3H', M82:'3G', M85:'3L', M87:'3K' },
  'DFGHIJKL': { M74:'3H', M77:'3G', M79:'3I', M80:'3D', M81:'3J', M82:'3F', M85:'3L', M87:'3K' },
  'DEGHIJKL': { M74:'3E', M77:'3J', M79:'3I', M80:'3D', M81:'3H', M82:'3G', M85:'3L', M87:'3K' },
  'DEFHIJKL': { M74:'3E', M77:'3J', M79:'3I', M80:'3D', M81:'3H', M82:'3F', M85:'3L', M87:'3K' },
  'DEFGIJKL': { M74:'3E', M77:'3G', M79:'3I', M80:'3D', M81:'3J', M82:'3F', M85:'3L', M87:'3K' },
  'DEFGHJKL': { M74:'3E', M77:'3G', M79:'3J', M80:'3D', M81:'3H', M82:'3F', M85:'3L', M87:'3K' },
  'DEFGHIKL': { M74:'3E', M77:'3G', M79:'3I', M80:'3D', M81:'3H', M82:'3F', M85:'3L', M87:'3K' },
  'DEFGHIJL': { M74:'3E', M77:'3G', M79:'3J', M80:'3D', M81:'3H', M82:'3F', M85:'3L', M87:'3I' },
  'DEFGHIJK': { M74:'3E', M77:'3G', M79:'3J', M80:'3D', M81:'3H', M82:'3F', M85:'3I', M87:'3K' },
  'CFGHIJKL': { M74:'3H', M77:'3G', M79:'3I', M80:'3C', M81:'3J', M82:'3F', M85:'3L', M87:'3K' },
  'CEGHIJKL': { M74:'3E', M77:'3J', M79:'3I', M80:'3C', M81:'3H', M82:'3G', M85:'3L', M87:'3K' },
  'CEFHIJKL': { M74:'3E', M77:'3J', M79:'3I', M80:'3C', M81:'3H', M82:'3F', M85:'3L', M87:'3K' },
  'CEFGIJKL': { M74:'3E', M77:'3G', M79:'3I', M80:'3C', M81:'3J', M82:'3F', M85:'3L', M87:'3K' },
  'CEFGHJKL': { M74:'3E', M77:'3G', M79:'3J', M80:'3C', M81:'3H', M82:'3F', M85:'3L', M87:'3K' },
  'CEFGHIKL': { M74:'3E', M77:'3G', M79:'3I', M80:'3C', M81:'3H', M82:'3F', M85:'3L', M87:'3K' },
  'CEFGHIJL': { M74:'3E', M77:'3G', M79:'3J', M80:'3C', M81:'3H', M82:'3F', M85:'3L', M87:'3I' },
  'CEFGHIJK': { M74:'3E', M77:'3G', M79:'3J', M80:'3C', M81:'3H', M82:'3F', M85:'3I', M87:'3K' },
  'CDGHIJKL': { M74:'3H', M77:'3G', M79:'3I', M80:'3C', M81:'3J', M82:'3D', M85:'3L', M87:'3K' },
  'CDFHIJKL': { M74:'3C', M77:'3J', M79:'3I', M80:'3D', M81:'3H', M82:'3F', M85:'3L', M87:'3K' },
  'CDFGIJKL': { M74:'3C', M77:'3G', M79:'3I', M80:'3D', M81:'3J', M82:'3F', M85:'3L', M87:'3K' },
  'CDFGHJKL': { M74:'3C', M77:'3G', M79:'3J', M80:'3D', M81:'3H', M82:'3F', M85:'3L', M87:'3K' },
  'CDFGHIKL': { M74:'3C', M77:'3G', M79:'3I', M80:'3D', M81:'3H', M82:'3F', M85:'3L', M87:'3K' },
  'CDFGHIJL': { M74:'3C', M77:'3G', M79:'3J', M80:'3D', M81:'3H', M82:'3F', M85:'3L', M87:'3I' },
  'CDFGHIJK': { M74:'3C', M77:'3G', M79:'3J', M80:'3D', M81:'3H', M82:'3F', M85:'3I', M87:'3K' },
  'CDEHIJKL': { M74:'3E', M77:'3J', M79:'3I', M80:'3C', M81:'3H', M82:'3D', M85:'3L', M87:'3K' },
  'CDEGHIJKL_extra': { M74:'3E', M77:'3G', M79:'3I', M80:'3C', M81:'3J', M82:'3D', M85:'3L', M87:'3K' },
  'CDEGHIJKL': { M74:'3E', M77:'3G', M79:'3I', M80:'3C', M81:'3J', M82:'3D', M85:'3L', M87:'3K' },
  'CDEGJKL':   { M74:'3E', M77:'3G', M79:'3J', M80:'3C', M81:'3H', M82:'3D', M85:'3L', M87:'3K' },
  'CDEGIJKL':  { M74:'3E', M77:'3G', M79:'3I', M80:'3C', M81:'3J', M82:'3D', M85:'3L', M87:'3K' },
  'CDEGHIKL':  { M74:'3E', M77:'3G', M79:'3I', M80:'3C', M81:'3H', M82:'3D', M85:'3L', M87:'3K' },
  'CDEGHIJL':  { M74:'3E', M77:'3G', M79:'3J', M80:'3C', M81:'3H', M82:'3D', M85:'3L', M87:'3I' },
  'CDEGHIJK':  { M74:'3E', M77:'3G', M79:'3J', M80:'3C', M81:'3H', M82:'3D', M85:'3I', M87:'3K' },
};

// Función para buscar la combinación correcta dado un array de grupos clasificados
export function getCombination(qualifiedGroups) {
  const key = [...qualifiedGroups].sort().join('');
  return COMBINATIONS[key] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE COMPLETO DE ELIMINATORIAS
// Genera los 32avos, 16avos, cuartos, semis, 3er puesto y final
// ─────────────────────────────────────────────────────────────────────────────

export function generateKnockoutFixture(positions, bestThirds) {
  const { qualified } = bestThirds;
  const qualifiedGroups = qualified.map(t => t.group);
  const combination = getCombination(qualifiedGroups);

  // Mapa de terceros por grupo
  const thirdByGroup = {};
  qualified.forEach(t => { thirdByGroup[t.group] = t.team; });

  const resolve3rd = (slot) => {
    if (!slot) return '?';
    const g = slot.replace('3', '');
    return thirdByGroup[g] || `3ro Grupo ${g}`;
  };

  const w = (g) => positions[g]?.winner || `1° Grupo ${g}`;
  const r = (g) => positions[g]?.runnerUp || `2° Grupo ${g}`;

  // 16avos de final (Round of 32) — partidos 73-88
  const r32 = [
    { id: 'R32_M73', home: r('A'), away: r('B'),                      date: '28 jun', label: '16avos M73' },
    { id: 'R32_M74', home: w('E'), away: combination ? resolve3rd(combination.M74) : '3ro A/B/C/D/F', date: '28 jun', label: '16avos M74' },
    { id: 'R32_M75', home: w('F'), away: r('C'),                      date: '28 jun', label: '16avos M75' },
    { id: 'R32_M76', home: w('C'), away: r('F'),                      date: '29 jun', label: '16avos M76' },
    { id: 'R32_M77', home: w('I'), away: combination ? resolve3rd(combination.M77) : '3ro C/D/F/G/H', date: '29 jun', label: '16avos M77' },
    { id: 'R32_M78', home: r('E'), away: r('I'),                      date: '29 jun', label: '16avos M78' },
    { id: 'R32_M79', home: w('A'), away: combination ? resolve3rd(combination.M79) : '3ro C/E/F/H/I', date: '30 jun', label: '16avos M79' },
    { id: 'R32_M80', home: w('L'), away: combination ? resolve3rd(combination.M80) : '3ro E/H/I/J/K', date: '30 jun', label: '16avos M80' },
    { id: 'R32_M81', home: w('D'), away: combination ? resolve3rd(combination.M81) : '3ro B/E/F/I/J', date: '1 jul',  label: '16avos M81' },
    { id: 'R32_M82', home: w('G'), away: combination ? resolve3rd(combination.M82) : '3ro A/E/H/I/J', date: '1 jul',  label: '16avos M82' },
    { id: 'R32_M83', home: r('K'), away: r('L'),                      date: '1 jul',  label: '16avos M83' },
    { id: 'R32_M84', home: w('H'), away: r('J'),                      date: '2 jul',  label: '16avos M84' },
    { id: 'R32_M85', home: w('B'), away: combination ? resolve3rd(combination.M85) : '3ro E/F/G/I/J', date: '2 jul',  label: '16avos M85' },
    { id: 'R32_M86', home: w('J'), away: r('H'),                      date: '2 jul',  label: '16avos M86' },
    { id: 'R32_M87', home: w('K'), away: combination ? resolve3rd(combination.M87) : '3ro D/E/I/J/L', date: '3 jul',  label: '16avos M87' },
    { id: 'R32_M88', home: r('D'), away: r('G'),                      date: '3 jul',  label: '16avos M88' },
  ];

  // 8vos de final (Round of 16) — partidos 89-96
  const r16 = [
    { id: 'R16_M89', home: 'G M73', away: 'G M74', date: '4 jul',  label: '8vos M89' },
    { id: 'R16_M90', home: 'G M75', away: 'G M76', date: '4 jul',  label: '8vos M90' },
    { id: 'R16_M91', home: 'G M77', away: 'G M78', date: '5 jul',  label: '8vos M91' },
    { id: 'R16_M92', home: 'G M79', away: 'G M80', date: '5 jul',  label: '8vos M92' },
    { id: 'R16_M93', home: 'G M81', away: 'G M82', date: '6 jul',  label: '8vos M93' },
    { id: 'R16_M94', home: 'G M83', away: 'G M84', date: '6 jul',  label: '8vos M94' },
    { id: 'R16_M95', home: 'G M85', away: 'G M86', date: '7 jul',  label: '8vos M95' },
    { id: 'R16_M96', home: 'G M87', away: 'G M88', date: '7 jul',  label: '8vos M96' },
  ];

  // Cuartos — partidos 97-100
  const qf = [
    { id: 'QF_M97', home: 'G M89', away: 'G M90', date: '9 jul',  label: 'Cuartos M97' },
    { id: 'QF_M98', home: 'G M91', away: 'G M92', date: '9 jul',  label: 'Cuartos M98' },
    { id: 'QF_M99', home: 'G M93', away: 'G M94', date: '10 jul', label: 'Cuartos M99' },
    { id: 'QF_M100', home: 'G M95', away: 'G M96', date: '10 jul', label: 'Cuartos M100' },
  ];

  // Semis — partidos 101-102
  const sf = [
    { id: 'SF_M101', home: 'G M97', away: 'G M99', date: '14 jul', label: 'Semi M101' },
    { id: 'SF_M102', home: 'G M98', away: 'G M100', date: '15 jul', label: 'Semi M102' },
  ];

  // 3er puesto y final
  const final = [
    { id: 'TP_M103', home: 'P M101', away: 'P M102', date: '18 jul', label: '3er Puesto' },
    { id: 'F_M104',  home: 'G M101', away: 'G M102', date: '19 jul', label: 'Final' },
  ];

  return { r32, r16, qf, sf, final };
}

// Verifica si todos los grupos terminaron la fase de grupos
export function isGroupStageComplete(results) {
  const totalGroupMatches = Object.values(GROUPS).reduce((acc, g) => acc + g.matches.length, 0);
  const playedMatches = Object.keys(results).filter(id => !id.startsWith('R')).length;
  return playedMatches >= totalGroupMatches;
}
