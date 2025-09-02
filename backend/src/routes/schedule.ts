// backend/src/routes/schedule.ts
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

function tryLoad(path: string) {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    const json = JSON.parse(raw);
    if (json && json.human && json.plant && json.meta?.bands === 12) return json;
  } catch { /* ignore */ }
  return null;
}

export default async function scheduleRoutes(fastify: any) {
  fastify.get("/schedule/30d", async () => {
    // Prefer top-level: C:\psl2\data\mock\daily.json (matches our generator)
    const topLevel = resolve(process.cwd(), "..", "data", "mock", "daily.json");
    const local     = resolve(process.cwd(), "data", "mock", "daily.json"); // fallback

    const loaded = tryLoad(topLevel) || tryLoad(local);
    if (loaded) return loaded;

    // Final fallback: small in-memory sample
    return {
      human: [
        { day: 0, keyframes: [
          { tod: 0.00, bands:[0.05,0.10,0.25,0.35,0.45,0.40,0.30,0.22,0.18,0.15,0.10,0.08], mode:"SLEEP" },
          { tod: 0.25, bands:[0.10,0.25,0.55,0.65,0.60,0.50,0.35,0.24,0.20,0.16,0.10,0.08], mode:"WAKE SYNC" },
          { tod: 0.50, bands:[0.08,0.20,0.45,0.55,0.58,0.52,0.40,0.28,0.22,0.18,0.12,0.10], mode:"WORK" },
          { tod: 0.75, bands:[0.06,0.12,0.22,0.32,0.40,0.38,0.30,0.22,0.18,0.15,0.12,0.18], mode:"WIND DOWN" }
        ]},
      ],
      plant: [
        { day: 0, keyframes: [
          { tod: 0.00, bands:[0.50,0.70,0.60,0.40,0.30,0.40,0.65,0.80,0.90,1.00,0.95,0.75], mode:"NIGHT" },
          { tod: 0.30, bands:[0.55,0.75,0.62,0.42,0.32,0.42,0.70,0.85,0.96,1.00,0.98,0.80], mode:"GROWTH SURGE" },
          { tod: 0.65, bands:[0.48,0.70,0.58,0.40,0.30,0.40,0.65,0.82,0.92,0.98,0.96,0.78], mode:"MAINTAIN" }
        ]},
      ],
      meta: { bands: 12, wavelengthsNm: [400,430,460,490,520,550,580,610,630,660,690,730] }
    };
  });
}
