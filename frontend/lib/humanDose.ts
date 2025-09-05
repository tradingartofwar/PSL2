// frontend/lib/humanDose.ts
// Quick mEDI (melanopic EDI, lux) estimator from 12-band SPD.
// bands: 12-length array (0..1), intensityLux: overall lux hint for human stream.

const MEL_WEIGHTS = [0.10, 0.55, 1.00, 0.60, 0.22, 0.08, 0.04, 0.02, 0.01, 0.006, 0.004, 0.003];

function normalize(arr: number[]) {
  const mx = Math.max(...arr, 1e-6);
  return arr.map(v => v / mx);
}

export function mediFromBands(bands: number[], intensityLux: number): number {
  if (!Array.isArray(bands) || bands.length !== 12) return 0;
  const w = normalize(MEL_WEIGHTS);
  // Normalize bands so shape drives mEDI; scale with intensityLux
  const bmx = Math.max(...bands, 1e-6);
  const b = bands.map(v => v / bmx);

  let dot = 0;
  for (let i = 0; i < 12; i++) dot += b[i] * w[i];

  // Empirical scale: dot∈[0..1] → fraction of intensityLux that is melanopic-effective.
  // You can tune k once you measure; start with k = 0.9 so peak-blue shapes ~≈ intensityLux.
  const k = 0.9;
  return Math.max(0, intensityLux * k * dot);
}

export type HumanTargets = {
  morning_medi_lux: number;
  day_medi_lux: number;
  evening_cap_medi_lux: number;
  sleep_cap_medi_lux: number;
};
