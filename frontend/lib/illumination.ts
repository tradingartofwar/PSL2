export type IllumSample = { t: string; lit: 0 | 1 };
export type IllumMask = { site: string; stepHours: number; samples: IllumSample[] };
export type IllumMode = "Sunlit" | "PreDark" | "Dark" | "ReLight";

export function maskIndex(sol: number, tod: number, stepHours: number) {
  const hour = Math.floor(tod * 24);
  return sol * (24 / stepHours) + Math.floor(hour / stepHours);
}

export function modeAt(sol: number, tod: number, mask: IllumMask): IllumMode {
  const step = mask.stepHours || 1;
  const idx = Math.max(0, Math.min(mask.samples.length - 1, maskIndex(sol, tod, step)));
  const cur = mask.samples[idx]?.lit ?? 1;
  if (cur === 1) {
    const ahead2h = Math.min(mask.samples.length - 1, idx + Math.ceil(2 / step));
    const ahead4h = Math.min(mask.samples.length - 1, idx + Math.ceil(4 / step));
    const soonDark = mask.samples.slice(ahead2h, ahead4h + 1).some(s => s.lit === 0);
    return soonDark ? "PreDark" : "Sunlit";
  }
  // cur = dark
  const prev = mask.samples[idx - 1]?.lit ?? 0;
  return prev === 0 ? "Dark" : "ReLight";
}

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
