// backend/src/routes/plan.ts
import { FastifyInstance } from "fastify";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

type PlanBody = {
  sol?: number;            // 0..29
  tod?: number;            // 0..1
  energyKw?: number;       // present load
  zoneId?: string | null;  // optional for per-zone deltas later
  demo?: boolean;          // prime path
  // optional hints from FE (if you wire them later)
  humanDose?: { mediLux?: number };
};

type Decision = {
  applied: boolean;
  decisionId: string;
  expiresAt: string;
  ruleFamily?: "wake_boost" | "night_protect" | "plant_bias" | "energy_trim" | "plant_catchup";
  humanDelta?: number[]; // 12
  plantDelta?: number[]; // 12
  rationale?: string;
  zoneId?: string | null;
};

const N = 12;
const zeros = () => new Array(N).fill(0);
const decision = (d: Partial<Decision>): Decision => ({
  applied: !!d.applied,
  decisionId: d.decisionId || `dec-${Date.now()}-${Math.floor(Math.random()*1e6)}`,
  expiresAt: d.expiresAt || new Date(Date.now() + 60_000).toISOString(),
  ruleFamily: d.ruleFamily,
  humanDelta: d.humanDelta,
  plantDelta: d.plantDelta,
  rationale: d.rationale,
  zoneId: d.zoneId ?? null
});

function loadHumanTargets(cfgDir: string) {
  const p = join(cfgDir, "human_params.json");
  if (existsSync(p)) {
    try { return JSON.parse(readFileSync(p, "utf-8")).targets || {}; } catch {}
  }
  return { morning_medi_lux: 250, day_medi_lux: 250, evening_cap_medi_lux: 50, sleep_cap_medi_lux: 10 };
}

// simple window helpers (can be replaced with mission clock windows later)
function isMorning(tod: number) { return tod >= 0.20 && tod < 0.40; }   // ~05:00–10:00 equiv (demo)
function isEvening(tod: number) { return tod >= 0.70 && tod < 0.90; }   // ~17:00–22:00 equiv (demo)
function isDark(tod: number)    { return tod >= 0.83 || tod < 0.05; }   // aligns with synthetic dark in status.ts

// tiny spectral nudges
function deltaBlueBoost(intensity=0.08) {
  const d = zeros(); [2,3,4].forEach(i => d[i] = intensity); return d;
}
function deltaBlueProtect(amount=0.10) {
  const d = zeros(); [2,3,4].forEach(i => d[i] = -amount); return d;
}
function deltaPlantBias(fr=0.06, r=0.04) {
  const d = zeros(); d[10] = r; d[11] = fr; return d;
}
function deltaEnergyTrim(all=-0.06) {
  const d = new Array(N).fill(all); return d;
}
function deltaPlantCatchup(fr=0.08, r=0.06) {
  const d = zeros(); d[10] = r; d[11] = fr; return d;
}

export default async function planRoutes(app: FastifyInstance) {
  const CFG_DIR = resolve(process.cwd(), "..", "config");
  const targets = loadHumanTargets(CFG_DIR);

  app.post<{ Body: PlanBody }>("/lights/plan", async (req) => {
    const b = req.body || {};
    const tod = typeof b.tod === "number" ? b.tod : 0;
    const energyKw = typeof b.energyKw === "number" ? b.energyKw : 10;
    const zoneId = b.zoneId ?? null;

    // prime path for UI (keeps panel non-empty) — unchanged behavior from Build 5.5
    if (b.demo) {
      return decision({
        applied: true,
        ruleFamily: "plant_bias",
        plantDelta: deltaPlantBias(),
        rationale: "Demo prime — biasing canopy slightly for visibility.",
        expiresAt: new Date(Date.now() + 90_000).toISOString(),
      });
    }

    // read FE-provided mEDI if present; else fall back to intensity heuristic (keeps UX coherent until full BE calc is added)
    const mediLux = Math.max(0, Math.round(b.humanDose?.mediLux ?? 0));

    // --- HUMAN RULE GUARDS (Build 7) ---
    if (isMorning(tod) && mediLux > 0 && mediLux < (targets.morning_medi_lux ?? 250)) {
      return decision({
        applied: true,
        ruleFamily: "wake_boost",
        humanDelta: deltaBlueBoost(),
        rationale: `mEDI ${mediLux} < morning target ${(targets.morning_medi_lux ?? 250)} — boosting blue.`,
        zoneId,
      });
    }
    if ((isEvening(tod) || isDark(tod)) && mediLux > (targets.evening_cap_medi_lux ?? 50)) {
      return decision({
        applied: true,
        ruleFamily: "night_protect",
        humanDelta: deltaBlueProtect(),
        rationale: `mEDI ${mediLux} > evening cap ${(targets.evening_cap_medi_lux ?? 50)} — suppressing blue.`,
        zoneId,
      });
    }

    // --- PLANT/ENERGY (carry from Build 6 behavior) ---
    // Prefer gentle plant bias in Pre-Dark/Re-Light (you’re deriving mode client-side); here we use tod as a proxy:
    if (tod >= 0.75 && tod < 0.83) {
      return decision({
        applied: true,
        ruleFamily: "plant_bias",
        plantDelta: deltaPlantBias(),
        rationale: "Pre-Dark — banking canopy photons.",
        zoneId,
      });
    }
    if (tod >= 0.95 || tod < 0.05) {
      return decision({
        applied: true,
        ruleFamily: "plant_catchup",
        plantDelta: deltaPlantCatchup(),
        rationale: "Re-Light — mild canopy catch-up.",
        zoneId,
      });
    }
    if (energyKw > 18) {
      return decision({
        applied: true,
        ruleFamily: "energy_trim",
        humanDelta: deltaEnergyTrim(-0.05),
        plantDelta: deltaEnergyTrim(-0.04),
        rationale: "Energy pressure — trimming both streams.",
        zoneId,
      });
    }

    // no-op (keep last active via keepalive TTL on FE side)
    return decision({ applied: false, rationale: "No rule change at this moment.", zoneId });
  });
}
