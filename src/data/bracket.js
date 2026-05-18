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
  // ── Matches sin terceros (se resuelven solos) ────────────────────────────
  { id: 'R32_M73', matchNum: 73, slot1: { type: '2', group: 'A', label: '2° Grupo A' }, slot2: { type: '2', group: 'B', label: '2° Grupo B' }, date: '28 jun' },
  { id: 'R32_M75', matchNum: 75, slot1: { type: '1', group: 'F', label: '1° Grupo F' }, slot2: { type: '2', group: 'C', label: '2° Grupo C' }, date: '29 jun' },
  { id: 'R32_M76', matchNum: 76, slot1: { type: '1', group: 'C', label: '1° Grupo C' }, slot2: { type: '2', group: 'F', label: '2° Grupo F' }, date: '29 jun' },
  { id: 'R32_M78', matchNum: 78, slot1: { type: '2', group: 'E', label: '2° Grupo E' }, slot2: { type: '2', group: 'I', label: '2° Grupo I' }, date: '30 jun' },
  { id: 'R32_M83', matchNum: 83, slot1: { type: '2', group: 'K', label: '2° Grupo K' }, slot2: { type: '2', group: 'L', label: '2° Grupo L' }, date: '2 jul'  },
  { id: 'R32_M84', matchNum: 84, slot1: { type: '1', group: 'H', label: '1° Grupo H' }, slot2: { type: '2', group: 'J', label: '2° Grupo J' }, date: '2 jul'  },
  { id: 'R32_M86', matchNum: 86, slot1: { type: '1', group: 'J', label: '1° Grupo J' }, slot2: { type: '2', group: 'H', label: '2° Grupo H' }, date: '3 jul'  },
  { id: 'R32_M88', matchNum: 88, slot1: { type: '2', group: 'D', label: '2° Grupo D' }, slot2: { type: '2', group: 'G', label: '2° Grupo G' }, date: '3 jul'  },

  // ── Matches con terceros (slot2 se carga manualmente) ────────────────────
  { id: 'R32_M74', matchNum: 74, slot1: { type: '1', group: 'E', label: '1° Grupo E' }, slot2: { type: '3', group: null, label: 'Mejor 3° (A/B/C/D/F)' }, date: '29 jun' },
  { id: 'R32_M77', matchNum: 77, slot1: { type: '1', group: 'I', label: '1° Grupo I' }, slot2: { type: '3', group: null, label: 'Mejor 3° (C/D/F/G/H)' }, date: '30 jun' },
  { id: 'R32_M79', matchNum: 79, slot1: { type: '1', group: 'A', label: '1° Grupo A' }, slot2: { type: '3', group: null, label: 'Mejor 3° (C/E/F/H/I)'  }, date: '30 jun' },
  { id: 'R32_M80', matchNum: 80, slot1: { type: '1', group: 'L', label: '1° Grupo L' }, slot2: { type: '3', group: null, label: 'Mejor 3° (E/H/I/J/K)'  }, date: '1 jul'  },
  { id: 'R32_M81', matchNum: 81, slot1: { type: '1', group: 'D', label: '1° Grupo D' }, slot2: { type: '3', group: null, label: 'Mejor 3° (B/E/F/I/J)'  }, date: '1 jul'  },
  { id: 'R32_M82', matchNum: 82, slot1: { type: '1', group: 'G', label: '1° Grupo G' }, slot2: { type: '3', group: null, label: 'Mejor 3° (A/E/H/I/J)'  }, date: '1 jul'  },
  { id: 'R32_M85', matchNum: 85, slot1: { type: '1', group: 'B', label: '1° Grupo B' }, slot2: { type: '3', group: null, label: 'Mejor 3° (E/F/G/I/J)'  }, date: '2 jul'  },
  { id: 'R32_M87', matchNum: 87, slot1: { type: '1', group: 'K', label: '1° Grupo K' }, slot2: { type: '3', group: null, label: 'Mejor 3° (D/E/I/J/L)'  }, date: '3 jul'  },
];

// Resuelve un slot contra la tabla de posiciones y los terceros manuales
export function resolveSlot(slot, standings, manualThirds) {
  if (slot.type === '3') {
    return manualThirds?.[slot.group] || null;
  }
  const pos = slot.type === '1' ? 0 : 1;
  return standings?.[slot.group]?.[pos]?.team || null;
}
