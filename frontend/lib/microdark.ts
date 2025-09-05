// frontend/lib/microdark.ts
export type IllumMask = { stepHours: number; samples: { lit: 0|1 }[] };

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
      const s = i; while (i < day.length && day[i].lit === 0) i++;
      const e = i;
      wins.push({ startTod: (s * step) / 24, endTod: (e * step) / 24 });
    } else i++;
  }
  return wins;
}

export function minutesUntilNextDark(tod: number, wins: { startTod: number; endTod: number }[]) {
  if (wins.some(w => tod >= w.startTod && tod < w.endTod)) return 0;
  const ahead = wins.map(w => w.startTod).filter(s => s > tod).sort((a,b)=>a-b);
  if (ahead.length === 0) return null;
  return Math.max(0, Math.round((ahead[0] - tod) * 24 * 60));
}
