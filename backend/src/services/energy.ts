// backend/src/services/energy.ts
export type IllumMode = "Sunlit" | "PreDark" | "Dark" | "ReLight";

export function greenhouseCanopyKW(area_m2: number, ppfd: number, efficacy_umol_per_J: number) {
  const watts = (ppfd * area_m2) / efficacy_umol_per_J;
  return watts / 1000; // kW
}

export function ppfdForMode(mode: IllumMode) {
  if (mode === "PreDark") return 300;
  if (mode === "Dark")    return 100;
  if (mode === "ReLight") return 280;
  return 250; // Sunlit (normal)
}

/** Average of 12-band human spectrum [0..1] */
export function avgIntensity(bands: number[] | undefined) {
  if (!bands || bands.length === 0) return 0.0;
  const s = bands.reduce((a,b)=> a + (b ?? 0), 0);
  return s / bands.length;
}

export function humanZonesKW(numZones: number, fixturesPerZone: number, fixtureW: number, intensity: number) {
  const perZoneW = fixturesPerZone * fixtureW * intensity;
  return (numZones * perZoneW) / 1000;
}

export function overlayKW(canopyKW: number, frac: number) {
  return canopyKW * Math.min(0.10, Math.max(0, frac)); // ≤10%
}

export function applyMargin(kW: number, frac = 0.12) {
  return kW * (1 + frac);
}
