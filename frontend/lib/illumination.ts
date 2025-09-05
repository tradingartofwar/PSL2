// frontend/lib/illumination.ts
export type IllumSample = { t: string; lit: 0 | 1 };
export type IllumMask = { site: string; stepHours: number; samples: IllumSample[] };
export type IllumMode = "Sunlit" | "PreDark" | "Dark" | "ReLight";

export function maskIndex(sol: number, tod: number, stepHours: number) {
  const hour = Math.floor(tod * 24);
  return sol * (24 / stepHours) + Math.floor(hour / stepHours);
}

// Legacy mode estimator (kept for reference)
export function modeAt(sol: number, tod: number, mask: IllumMask): IllumMode {
  const step = mask.stepHours || 1;
  const idx = Math.max(0, Math.min(mask.samples.length - 1, maskIndex(sol, tod, step)));
  const cur = mask.samples[idx]?.lit ?? 1;
  if (cur === 1) {
    const ahead2h = Math.min(mask.samples.length - 1, idx + Math.ceil(2 / step));
    const ahead4h = Math.min(mask.samples.length - 1, idx + Math.ceil(4 / step));
    const soonDark = mask.samples.slice(ahead2h, ahead4h + 1).some((s) => s.lit === 0);
    return soonDark ? "PreDark" : "Sunlit";
  }
  const prev = mask.samples[idx - 1]?.lit ?? 0;
  return prev === 0 ? "Dark" : "ReLight";
}

// Convert the entire mask into day segments (for the 30-day strip)
export function toDaySegments(mask: IllumMask, totalDays = 30) {
  const out: { start: number; end: number; lit: boolean }[] = [];
  const hours = Math.min(totalDays * 24, mask.samples.length);
  if (!hours) return out;
  let curLit = mask.samples[0].lit === 1;
  let start = 0;
  for (let h = 1; h < hours; h++) {
    const lit = mask.samples[h].lit === 1;
    if (lit !== curLit) {
      out.push({ start: start / 24, end: h / 24, lit: curLit });
      curLit = lit;
      start = h;
    }
  }
  out.push({ start: start / 24, end: hours / 24, lit: curLit });
  return out;
}

// Today’s dark windows for a given sol (0..29); outputs 0..1 fractions within the day
export function darkWindowsForDay(mask: IllumMask, sol: number) {
  const step = mask.stepHours || 1;
  const stepsPerSol = Math.round(24 / step);
  const start = sol * stepsPerSol;
  const end = start + stepsPerSol;
  const day = mask.samples.slice(start, end);
  const wins: { startTod: number; endTod: number }[] = [];
  let i = 0;
  while (i < day.length) {
    if (day[i].lit === 0) {
      const s = i;
      while (i < day.length && day[i].lit === 0) i++;
      const e = i;
      wins.push({ startTod: (s * step) / 24, endTod: (e * step) / 24 });
    } else i++;
  }
  return wins;
}

// Minutes until next dark window (0 if in one; null if none ahead today)
export function minutesUntilNextDark(tod: number, wins: { startTod: number; endTod: number }[]) {
  if (wins.some((w) => tod >= w.startTod && tod < w.endTod)) return 0;
  const ahead = wins.map((w) => w.startTod).filter((s) => s > tod).sort((a, b) => a - b);
  if (!ahead.length) return null;
  return Math.max(0, Math.round((ahead[0] - tod) * 24 * 60));
}

// Robust mode that *matches the windows used by the UI*
export function modeFromWindows(tod: number, wins: { startTod: number; endTod: number }[]): IllumMode {
  // Inside any window → Dark
  if (wins.some((w) => tod >= w.startTod && tod < w.endTod)) return "Dark";

  const starts = wins.map((w) => w.startTod).sort((a, b) => a - b);
  const ends = wins.map((w) => w.endTod).sort((a, b) => a - b);

  const nextStart = starts.find((s) => s > tod);
  const prevEnd = [...ends].reverse().find((e) => e <= tod);

  // PreDark: within 2h before the next dark start
  if (nextStart != null && (nextStart - tod) <= 2 / 24) return "PreDark";

  // ReLight: within 2h after leaving a dark window
  if (prevEnd != null && (tod - prevEnd) <= 2 / 24) return "ReLight";

  return "Sunlit";
}
