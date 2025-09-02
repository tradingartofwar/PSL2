// backend/src/routes/plan.ts
export default async function planRoutes(fastify: any) {
  fastify.post("/lights/plan", async (req: any) => {
    const body = (req.body ?? {}) as { sol?: number; tod?: number; energyKw?: number };
    const tod = Number(body.tod ?? 0);
    const sol = Number(body.sol ?? 0);
    const energyKw = Number(body.energyKw ?? 12);

    const N = 12;
    const humanDelta = Array(N).fill(0); // per-band multipliers: base * (1 + delta[i])
    const plantDelta = Array(N).fill(0);

    // --- Human circadian tuning ---
    // Night (protect melatonin): suppress blue/cyan, warm slightly
    if (tod < 0.15 || tod > 0.85) {
      humanDelta[2] -= 0.35; // ~460nm
      humanDelta[3] -= 0.30; // ~490nm
      humanDelta[4] -= 0.15; // ~520nm
      humanDelta[9] += 0.08; // ~660nm (warm)
      humanDelta[10] += 0.10; // ~690nm
      humanDelta[11] += 0.12; // ~730nm (very warm)
    }
    // Morning WAKE SYNC: boost blue/cyan a bit, de-emphasize warm
    else if (tod >= 0.20 && tod <= 0.40) {
      humanDelta[2] += 0.25;
      humanDelta[3] += 0.20;
      humanDelta[4] += 0.10;
      humanDelta[9] -= 0.05;
      humanDelta[10] -= 0.05;
    }

    // --- Plant energy-aware tuning ---
    // High load → shave ~10% across
    if (energyKw > 18) {
      for (let i = 0; i < N; i++) plantDelta[i] -= 0.10;
    }
    // Low load → allow a small FAR-RED/RED preference (efficiency at lower PPFD)
    else if (energyKw < 10) {
      plantDelta[9] += 0.06;  // ~660nm
      plantDelta[11] += 0.08; // ~730nm
    }

    const rationale = `sol=${sol} tod=${tod.toFixed(2)} energy=${energyKw}kW → human ${
      tod < 0.15 || tod > 0.85 ? "night" : tod <= 0.40 ? "morning" : "day"
    } tuning; plant energy tuning`;

    return { humanDelta, plantDelta, rationale };
  });
}
