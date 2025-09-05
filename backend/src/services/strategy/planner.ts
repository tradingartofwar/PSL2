import { EdgeDecision } from "./types";
import { v4 as uuid } from "uuid";

type Signals = {
  sol: number; tod: number;
  illumMode: "Sunlit" | "Pre-dark" | "Dark" | "Re-light";
  energy: { kw: number; breakdown: Record<string, number> };
  plantDliPct: Record<string, number>;   // e.g., {Micro: 42, Sprouts: 58, Algae: 77}
  crewSyncPct: Record<string, number>;   // e.g., {A: 61, B: 74}
  overlayKw: number;
};

const MAX_DELTA = 0.12;     // cap per band (≤12%) — small, frequent nudges:contentReference[oaicite:3]{index=3}
const COOL_MIN = 120000;    // 2 min cooldown per rule family
const TTL_MS = 5 * 60 * 1000;

const lastFired = new Map<string, number>();

function cooldown(rule: string) {
  const t = lastFired.get(rule) ?? 0;
  return Date.now() - t < COOL_MIN;
}

export function plan(signals: Signals): EdgeDecision | null {
  // Priority order
  // 1) Protect sleep in Dark, 2) Wake boost in early Sunlit/Re-light,
  // 3) Plant catch-up in Re-light/Pre-dark, 4) Energy trims when over budget, 5) Overlay guard.
  // NIGHT PROTECT
  if (signals.illumMode === "Dark" && !cooldown("night_protect")) {
    lastFired.set("night_protect", Date.now());
    return mkDecision("night_protect", {
      band_460nm: clamp(-0.12),   // reduce blue
      band_500nm: clamp(-0.06),
      band_630nm: clamp(-0.03)
    }, "Reduce short-wavelength content during crew sleep to protect melatonin.", signals);
  }

  // WAKE BOOST
  const earlyDay = signals.tod >= 6 && signals.tod <= 10;
  if ((signals.illumMode === "Sunlit" || signals.illumMode === "Re-light") && earlyDay && !cooldown("wake_boost")) {
    lastFired.set("wake_boost", Date.now());
    return mkDecision("wake_boost", {
      band_460nm: clamp(+0.10),
      band_500nm: clamp(+0.05)
    }, "Morning blue boost to accelerate circadian alignment.", signals);
  }

  // PLANT CATCH-UP
  const anyLag = Object.values(signals.plantDliPct).some(p => p < 55);
  if ((signals.illumMode === "Re-light" || signals.illumMode === "Pre-dark") && anyLag && !cooldown("plant_catchup")) {
    lastFired.set("plant_catchup", Date.now());
    return mkDecision("plant_catchup", {
      band_660nm: clamp(+0.08),
      band_730nm: clamp(+0.04)   // gentle EoD far-red help
    }, "PPFD bump to catch up DLI before transition.", signals);
  }

  // ENERGY TRIM
  const overBudget = signals.energy.kw > (signals.energy.breakdown["budgetKw"] ?? Infinity);
  if (overBudget && !cooldown("energy_trim")) {
    lastFired.set("energy_trim", Date.now());
    return mkDecision("energy_trim", {
      band_660nm: clamp(-0.06),
      band_530nm: clamp(-0.04)
    }, "Trim total power to stay within budget without harming targets.", signals);
  }

  // OVERLAY GUARD
  if (signals.overlayKw > 0 && !cooldown("overlay_guard")) {
    lastFired.set("overlay_guard", Date.now());
    return mkDecision("overlay_guard", {
      band_460nm: clamp(-0.04)
    }, "Reduce glare while a neutral-white overlay is active.", signals);
  }

  return null;

  function clamp(v: number) { return Math.max(-MAX_DELTA, Math.min(MAX_DELTA, v)); }
  function mkDecision(ruleFamily: EdgeDecision["ruleFamily"], deltas: Record<string, number>, rationale: string, s: Signals): EdgeDecision {
    const now = new Date();
    const exp = new Date(now.getTime() + TTL_MS);
    return {
      decisionId: uuid(),
      createdAt: now.toISOString(),
      expiresAt: exp.toISOString(),
      ruleFamily, deltas, rationale,
      context: {
        sol: s.sol, tod: s.tod, illumMode: s.illumMode,
        energyKw: s.energy.kw, dli: s.plantDliPct, crewSync: s.crewSyncPct
      },
      applied: true
    };
  }
}
