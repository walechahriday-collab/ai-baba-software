/* astrology.js — Zodiac and planetary calculations */

const SIGNS = [
  { name: 'Aries',       symbol: '♈', emoji: '🐏', start: [3,21], end: [4,19],  element: 'Fire',  modality: 'Cardinal', ruler: 'Mars' },
  { name: 'Taurus',      symbol: '♉', emoji: '🐂', start: [4,20], end: [5,20],  element: 'Earth', modality: 'Fixed',    ruler: 'Venus' },
  { name: 'Gemini',      symbol: '♊', emoji: '👯', start: [5,21], end: [6,20],  element: 'Air',   modality: 'Mutable',  ruler: 'Mercury' },
  { name: 'Cancer',      symbol: '♋', emoji: '🦀', start: [6,21], end: [7,22],  element: 'Water', modality: 'Cardinal', ruler: 'Moon' },
  { name: 'Leo',         symbol: '♌', emoji: '🦁', start: [7,23], end: [8,22],  element: 'Fire',  modality: 'Fixed',    ruler: 'Sun' },
  { name: 'Virgo',       symbol: '♍', emoji: '👩', start: [8,23], end: [9,22],  element: 'Earth', modality: 'Mutable',  ruler: 'Mercury' },
  { name: 'Libra',       symbol: '♎', emoji: '⚖️', start: [9,23], end: [10,22], element: 'Air',   modality: 'Cardinal', ruler: 'Venus' },
  { name: 'Scorpio',     symbol: '♏', emoji: '🦂', start: [10,23],end: [11,21], element: 'Water', modality: 'Fixed',    ruler: 'Pluto' },
  { name: 'Sagittarius', symbol: '♐', emoji: '🏹', start: [11,22],end: [12,21], element: 'Fire',  modality: 'Mutable',  ruler: 'Jupiter' },
  { name: 'Capricorn',   symbol: '♑', emoji: '🐐', start: [12,22],end: [1,19],  element: 'Earth', modality: 'Cardinal', ruler: 'Saturn' },
  { name: 'Aquarius',    symbol: '♒', emoji: '🏺', start: [1,20], end: [2,18],  element: 'Air',   modality: 'Fixed',    ruler: 'Uranus' },
  { name: 'Pisces',      symbol: '♓', emoji: '🐠', start: [2,19], end: [3,20],  element: 'Water', modality: 'Mutable',  ruler: 'Neptune' },
];

const CHINESE_ZODIAC = [
  'Rat','Ox','Tiger','Rabbit','Dragon','Snake',
  'Horse','Goat','Monkey','Rooster','Dog','Pig'
];

export function getSunSign(dateStr) {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  for (const sign of SIGNS) {
    const [sm, sd] = sign.start;
    const [em, ed] = sign.end;
    if (sm > em) {
      if ((month === sm && day >= sd) || (month === em && day <= ed) ||
          (month > sm) || (month < em)) return sign;
    } else {
      if ((month === sm && day >= sd) || (month === em && day <= ed) ||
          (month > sm && month < em)) return sign;
    }
  }
  return SIGNS[11];
}

export function getMoonSign(dateStr) {
  // Reference: New Moon epoch Jan 6, 2000 00:00 UTC = 0° Capricorn
  // Moon moves ~13.176° per day, completing 360° in 27.32 days
  const refDate = new Date('2000-01-06T00:00:00Z');
  const d = new Date(dateStr);
  const daysDiff = (d - refDate) / (1000 * 60 * 60 * 24);
  const moonDegrees = ((daysDiff * 13.176) % 360 + 360) % 360;
  // Capricorn starts at 0° in our reference
  const signIndex = (Math.floor(moonDegrees / 30) + 9) % 12;
  return SIGNS[signIndex];
}

export function getRisingSign(dateStr, timeStr, lat, lon) {
  if (!timeStr || !lat || !lon) return null;

  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr + 'T' + timeStr + ':00');
  const ut = h + m / 60;

  // Julian Day Number
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const mo = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * mo + 2) / 5) + 365 * y +
              Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  const jd = jdn + (ut - 12) / 24;

  // Greenwich Mean Sidereal Time
  const T = (jd - 2451545.0) / 36525;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545) +
             0.000387933 * T * T;
  gmst = ((gmst % 360) + 360) % 360;

  // Local Sidereal Time
  const lst = ((gmst + parseFloat(lon)) % 360 + 360) % 360;

  // Ascendant calculation (simplified planar approximation)
  const latRad = parseFloat(lat) * Math.PI / 180;
  const lstRad = lst * Math.PI / 180;
  const eclipticObliquity = 23.4367 * Math.PI / 180;
  const ascendantRad = Math.atan2(
    Math.cos(lstRad),
    -(Math.sin(lstRad) * Math.cos(eclipticObliquity) + Math.tan(latRad) * Math.sin(eclipticObliquity))
  );
  let ascDeg = (ascendantRad * 180 / Math.PI + 360) % 360;

  const signIndex = Math.floor(ascDeg / 30) % 12;
  return SIGNS[signIndex];
}

export function getChineseZodiac(year) {
  return CHINESE_ZODIAC[(year - 1900) % 12];
}

export function getLifePathNumber(dateStr) {
  const digits = dateStr.replace(/-/g, '').split('').map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split('').map(Number).reduce((a, b) => a + b, 0);
  }
  return sum;
}

export function getPlanetaryContext(dateStr) {
  const sun = getSunSign(dateStr);
  const moon = getMoonSign(dateStr);
  const elements = [sun.element, moon.element];
  const elementCount = {};
  elements.forEach(e => elementCount[e] = (elementCount[e] || 0) + 1);
  const dominant = Object.keys(elementCount).sort((a,b) => elementCount[b]-elementCount[a])[0];
  return `Dominant element: ${dominant}. Sun modality: ${sun.modality}. Moon modality: ${moon.modality}.`;
}

export function getSignEmoji(signName) {
  const sign = SIGNS.find(s => s.name === signName);
  return sign ? sign.emoji : '✨';
}

export function getSignByName(name) {
  return SIGNS.find(s => s.name === name) || null;
}

export { SIGNS };
