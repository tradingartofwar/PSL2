// frontend/lib/schedule.ts
export type Bands = number[]; // length 12
export type Keyframe = { tod: number; bands: Bands; mode?: string };
export type DaySchedule = { day: number; keyframes: Keyframe[] };
export type Schedule = { human: DaySchedule[]; plant: DaySchedule[] };

function lerp(a:number,b:number,t:number){ return a + (b-a)*t; }
function lerpBands(a:Bands,b:Bands,t:number): Bands {
  const n = Math.min(a.length, b.length);
  const out = new Array(n);
  for (let i=0;i<n;i++) out[i] = lerp(a[i], b[i], t);
  return out as Bands;
}

export function sampleBands(day: number, tod: number, days: DaySchedule[]): { bands:Bands; mode?:string } {
  const d = Math.max(0, Math.min(days.length-1, day));
  const { keyframes } = days[d] ?? { keyframes: [] };
  if (!keyframes.length) return { bands: new Array(12).fill(0) as Bands };

  const sorted = [...keyframes].sort((a,b)=>a.tod-b.tod);
  if (tod <= sorted[0].tod) return { bands: sorted[0].bands, mode: sorted[0].mode };
  if (tod >= sorted[sorted.length-1].tod) return { bands: sorted[sorted.length-1].bands, mode: sorted[sorted.length-1].mode };

  let i = 0;
  while (i < sorted.length-1 && tod > sorted[i+1].tod) i++;
  const k0 = sorted[i], k1 = sorted[i+1];
  const span = (k1.tod - k0.tod) || 1;
  const t = (tod - k0.tod) / span;
  return { bands: lerpBands(k0.bands, k1.bands, t), mode: t < 0.5 ? k0.mode : k1.mode };
}
