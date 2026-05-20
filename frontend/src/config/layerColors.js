// Single source of truth for all ODIN map colors
// Palette reverse-engineered from OpenGridWorks

export const POWER_PLANT_COLORS = {
  SOLAR:            { fill: '#FFD700', stroke: '#FFE55C', glow: '#FFD70066' },
  WIND:             { fill: '#00E5FF', stroke: '#5FFFFF', glow: '#00E5FF55' },
  'OFFSHORE WIND':  { fill: '#00BFFF', stroke: '#44DDFF', glow: '#00BFFF55' },
  HYDRO:            { fill: '#0077FF', stroke: '#44AAFF', glow: '#0077FF66' },
  NUCLEAR:          { fill: '#CC44FF', stroke: '#EE88FF', glow: '#CC44FF77' },
  GAS:              { fill: '#FF8C00', stroke: '#FFAA44', glow: '#FF8C0055' },
  COAL:             { fill: '#8B7355', stroke: '#AABB66', glow: '#8B735544' },
  OIL:              { fill: '#FF4422', stroke: '#FF7766', glow: '#FF442244' },
  BIOMASS:          { fill: '#66BB44', stroke: '#99DD66', glow: '#66BB4444' },
  GEOTHERMAL:       { fill: '#FF6633', stroke: '#FF9966', glow: '#FF663344' },
  STORAGE:          { fill: '#FF44AA', stroke: '#FF88CC', glow: '#FF44AA55' },
  WASTE:            { fill: '#AABB00', stroke: '#CCDD33', glow: '#AABB0033' },
  COGENERATION:     { fill: '#FFAA33', stroke: '#FFCC66', glow: '#FFAA3344' },
  PETCOKE:          { fill: '#A0855B', stroke: '#C4A870', glow: '#A0855B33' },
  'WAVE AND TIDAL': { fill: '#00CCAA', stroke: '#44EEDD', glow: '#00CCAA33' },
  OTHER:            { fill: '#888899', stroke: '#AAAACC', glow: '#88889933' },
};

export const TRANSMISSION_COLORS = {
  // kV threshold keys — data stores voltage in kV (115, 230, 345, 500, 765)
  765: { stroke: '#FFFFFF', width: 2.5, opacity: 0.95, glow: '#FFFFFF88' },
  500: { stroke: '#00D4FF', width: 2.0, opacity: 0.90, glow: '#00D4FF66' },
  345: { stroke: '#4488EE', width: 1.6, opacity: 0.85, glow: '#4488EE55' },
  230: { stroke: '#7766CC', width: 1.3, opacity: 0.80, glow: '#7766CC44' },
  138: { stroke: '#AA88DD', width: 1.0, opacity: 0.70, glow: '#AA88DD33' },
  115: { stroke: '#AA88DD', width: 0.9, opacity: 0.65, glow: '#AA88DD22' },
    0: { stroke: '#554466', width: 0.6, opacity: 0.40, glow: '#55446611' },
};

export const SUBSTATION_COLORS = {
  765: { fill: '#FFFFFF', glow: '#FFFFFFCC', size: 9   },
  500: { fill: '#00E5FF', glow: '#00E5FFAA', size: 8   },
  345: { fill: '#4499FF', glow: '#4499FF99', size: 7   },
  230: { fill: '#8866FF', glow: '#8866FF88', size: 5.5 },
  138: { fill: '#BB99FF', glow: '#BB99FF66', size: 4   },
  115: { fill: '#BB99FF', glow: '#BB99FF55', size: 3.5 },
    0: { fill: '#665577', glow: '#66557733', size: 2.5 },
};

export const DATACENTER_COLORS = {
  fill: '#818cf8', glow: '#818cf899', stroke: '#a5b4fc',
};

export const CABLE_COLORS = {
  line:    { stroke: '#e879f9', width: 1.2, glow: '#e879f966' },
  landing: { fill: '#ffffff',  glow: '#ffffff88', size: 5 },
};

export const WILDFIRE_COLORS = {
  active:    { fill: '#FF3300', glow: '#FF330099' },
  contained: { fill: '#FF7700', glow: '#FF770055' },
};

// Voltage in kV → nearest threshold key (data is in kV, not V)
export function voltageToKey(kv) {
  const v = parseInt(kv) || 0;
  for (const t of [765, 500, 345, 230, 138, 115]) {
    if (v >= t) return t;
  }
  return 0;
}

// MW → pixel radius (logarithmic)
export function capacityToRadius(mw, base = 3, max = 14) {
  if (!mw || mw <= 0) return base;
  return Math.min(max, base * (1 + Math.log10(Math.max(1, mw)) / 2.5));
}
