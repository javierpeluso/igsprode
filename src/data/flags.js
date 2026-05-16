// Códigos ISO 3166-1 alpha-2 para usar con flag-icons CSS
// Uso: <span className={`fi fi-${getCode(country)}`} />
const CODES = {
  'México':           'mx',
  'Sudáfrica':        'za',
  'Corea del Sur':    'kr',
  'Rep. Checa':       'cz',
  'Canadá':           'ca',
  'Bosnia y Herz.':   'ba',
  'Catar':            'qa',
  'Suiza':            'ch',
  'Brasil':           'br',
  'Marruecos':        'ma',
  'Haití':            'ht',
  'Escocia':          'gb-sct',
  'Estados Unidos':   'us',
  'Paraguay':         'py',
  'Australia':        'au',
  'Turquía':          'tr',
  'Alemania':         'de',
  'Ecuador':          'ec',
  'Costa de Marfil':  'ci',
  'Curazao':          'cw',
  'Países Bajos':     'nl',
  'Japón':            'jp',
  'Túnez':            'tn',
  'Suecia':           'se',
  'Bélgica':          'be',
  'Egipto':           'eg',
  'Irán':             'ir',
  'Nueva Zelanda':    'nz',
  'España':           'es',
  'Uruguay':          'uy',
  'Arabia Saudita':   'sa',
  'Cabo Verde':       'cv',
  'Francia':          'fr',
  'Senegal':          'sn',
  'Noruega':          'no',
  'Irak':             'iq',
  'Argentina':        'ar',
  'Argelia':          'dz',
  'Austria':          'at',
  'Jordania':         'jo',
  'Portugal':         'pt',
  'Colombia':         'co',
  'Uzbekistán':       'uz',
  'R.D. Congo':       'cd',
  'Inglaterra':       'gb-eng',
  'Croacia':          'hr',
  'Ghana':            'gh',
  'Panamá':           'pa',
};

export const getCode = (country) => CODES[country] ?? 'un';

// Componente bandera listo para usar
export function Flag({ country, size = 20 }) {
  const code = getCode(country);
  return (
    <span
      className={`fi fi-${code}`}
      style={{ width: size * 1.33, height: size, borderRadius: 3, flexShrink: 0, display: 'inline-block' }}
      title={country}
    />
  );
}
