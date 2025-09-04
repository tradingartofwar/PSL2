// frontend/lib/sim/human.ts
export type Phase = "SLEEP" | "WAKE SYNC" | "WORK" | "WIND DOWN";
export type SPD12 = number[]; // length 12

const N = 12;

function normalize(a: SPD12): SPD12 {
  const m = Math.max(...a, 0.0001);
  return a.map(v => Math.min(1, Math.max(0, v / m)));
}

function cosine(a: SPD12, b: SPD12): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < N; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  if (na === 0 || nb === 0) return 0;
  return Math.max(0, Math.min(1, dot / (Math.sqrt(na)*Math.sqrt(nb))));
}

function targetForPhase(phase: Phase): SPD12 {
  const base: SPD12 = [0.10,0.18,0.35,0.50,0.55,0.50,0.35,0.25,0.20,0.16,0.12,0.10];
  const mul = (mask: SPD12) => normalize(base.map((v,i)=> v * mask[i]));
  const boostBlue: SPD12  = [0.9,1.0,1.25,1.15,1.05,1.0,0.95,0.9,0.9,0.85,0.8,0.75];
  const warmShift: SPD12  = [0.8,0.8,0.7,0.75,0.8,0.85,0.95,1.05,1.10,1.15,1.20,1.25];
  const steadyWork: SPD12 = [0.9,0.95,1.05,1.05,1.0,1.0,0.98,0.95,0.95,0.92,0.90,0.90];
  switch (phase) {
    case "WAKE SYNC": return mul(boostBlue);
    case "WORK":      return mul(steadyWork);
    case "WIND DOWN": return mul(warmShift);
    case "SLEEP":     return mul(warmShift);
    default:          return normalize(base);
  }
}

export function computeCrewSync(spd: SPD12, phase: Phase, driftMin = 0): number {
  let target = targetForPhase(phase);
  if (phase === "SLEEP") {
    const antiBlue: SPD12 = [0.9,0.9,0.7,0.75,0.85,0.9,1.0,1.05,1.10,1.15,1.2,1.25];
    target = normalize(target.map((v,i)=> v * antiBlue[i]));
  }
  const a = normalize(spd);
  const b = normalize(target);
  let score = cosine(a, b);
  const driftBonus = Math.max(0, Math.min(0.08, Math.abs(driftMin) / 90 * 0.08));
  score = Math.min(1, score + driftBonus);
  return Math.round(score * 100);
}

export function syncColor(pct: number): "cyan" | "yellow" | "orange" {
  if (pct >= 67) return "cyan";
  if (pct >= 34) return "yellow";
  return "orange";
}
