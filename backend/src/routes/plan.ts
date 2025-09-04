// backend/src/routes/plan.ts
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";

type EdgeDecision = {
  decisionId: string;
  createdAt: string;
  expiresAt: string;
  ruleFamily: "night_protect" | "wake_boost" | "energy_trim" | "plant_bias";
  humanDelta: number[];  // 12
  plantDelta: number[];  // 12
  rationale: string;
  context: { sol: number; tod: number; energyKw: number };
  applied: boolean;
};

const MAX_DELTA = 0.12;          // safety cap
const COOLDOWN_MS: Record<string, number> = {
  night_protect: 2 * 60_000,
  wake_boost:    2 * 60_000,
  energy_trim:   2 * 60_000,
  plant_bias:    2 * 60_000,
};
const TTL_MS = 5 * 60_000;       // decision “pulse” lifetime

const lastFired = new Map<string, number>();

function clamp(v: number, lo = -MAX_DELTA, hi = MAX_DELTA) {
  return Math.max(lo, Math.min(hi, v));
}

async function appendJsonl(type: string, payload: unknown) {
  const dataDir = process.env.DATA_DIR || "/app/data";
  const runId = process.env.RUN_ID || "dev";
  const runDir = join(dataDir, "runs", runId);
  await fs.mkdir(runDir, { recursive: true });
  await fs.appendFile(join(runDir, "events.jsonl"), JSON.stringify({ type, ...payload }) + "\n", "utf8");
}

function cooled(rule: keyof typeof COOLDOWN_MS) {
  const t = lastFired.get(rule) ?? 0;
  return Date.now() - t >= (COOLDOWN_MS[rule] ?? 0);
}

export default async function planRoutes(fastify: any) {
  fastify.post("/lights/plan", async (req: any) => {
    const body = (req.body ?? {}) as { sol?: number; tod?: number; energyKw?: number; demo?: boolean; force?: boolean; rule?: EdgeDecision["ruleFamily"] };
    const tod = Number(body.tod ?? 0);       // 0..1
    const sol = Number(body.sol ?? 0);
    const energyKw = Number(body.energyKw ?? 12);
    const { demo, force } = body;

    const N = 12;
    const humanDelta = Array(N).fill(0);
    const plantDelta = Array(N).fill(0);

    // ---------- FAST-PATH (demo / force): return a quick, inexpensive decision ----------
    if (demo || force) {
      const now = new Date();
      const decision: EdgeDecision = {
        decisionId: randomUUID(),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 60_000).toISOString(), // 60s TTL
        ruleFamily: (body.rule === "night_protect" || body.rule === "wake_boost" || body.rule === "energy_trim" || body.rule === "plant_bias")
          ? body.rule
          : "plant_bias",
        humanDelta: Array(12).fill(0),
        plantDelta: [0,0,0,0,0,0, 0.03,0.05,0.07,0.09,0.07,0.04], // gentle visible nudge
        rationale: demo
          ? "Demo/prime response for immediate UI readiness."
          : "Forced quick decision for UI readiness.",
        context: { sol, tod, energyKw },
        applied: true,
      };
      await appendJsonl("edge_decision_prime", decision);
      return decision;
    }

    let ruleFamily: EdgeDecision["ruleFamily"] | null = null;
    let rationale = "";

    // -------- Rule 1: Night protect (crew sleep) --------
    // Night window ~ [0.85..1) ∪ [0..0.15)
    if ((tod < 0.15 || tod > 0.85) && cooled("night_protect")) {
      ruleFamily = "night_protect";
      // suppress blue/cyan, slight warm
      humanDelta[2]  = clamp(-0.12); // ~460nm
      humanDelta[3]  = clamp(-0.10); // ~490nm
      humanDelta[4]  = clamp(-0.06); // ~520nm
      humanDelta[9]  = clamp(+0.05); // ~660nm
      humanDelta[10] = clamp(+0.06); // ~690nm
      humanDelta[11] = clamp(+0.08); // ~730nm
      rationale = "Reduce short wavelengths during crew sleep to protect melatonin.";
    }

    // -------- Rule 2: Wake boost (early day) --------
    // Morning window ~ [0.20..0.40]
    else if (tod >= 0.20 && tod <= 0.40 && cooled("wake_boost")) {
      ruleFamily = "wake_boost";
      humanDelta[2] = clamp(+0.10);
      humanDelta[3] = clamp(+0.08);
      humanDelta[4] = clamp(+0.05);
      humanDelta[9] = clamp(-0.03);
      humanDelta[10] = clamp(-0.03);
      rationale = "Morning blue boost to accelerate circadian alignment.";
    }

    // -------- Rule 3: Energy trim (budget pressure) --------
    else if (energyKw > 18 && cooled("energy_trim")) {
      ruleFamily = "energy_trim";
      for (let i = 0; i < N; i++) plantDelta[i] = clamp(-0.10);
      rationale = "Trim plant power to stay within energy budget without harming targets.";
    }

    // -------- Rule 4: Low-load plant bias (efficiency bias) --------
    else if (energyKw < 10 && cooled("plant_bias")) {
      ruleFamily = "plant_bias";
      plantDelta[9]  = clamp(+0.06); // ~660nm
      plantDelta[11] = clamp(+0.08); // ~730nm
      rationale = "Bias red/far-red at low load for efficiency and plant response.";
    }

    // If no rule fired, say not applied (keeps UI calm)
    if (!ruleFamily) return { applied: false };

    const now = new Date();
    const decision: EdgeDecision = {
      decisionId: randomUUID(),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
      ruleFamily,
      humanDelta,
      plantDelta,
      rationale,
      context: { sol, tod, energyKw },
      applied: true,
    };

    lastFired.set(ruleFamily, Date.now());
    await appendJsonl("edge_decision", decision);

    return decision;
  });
}
