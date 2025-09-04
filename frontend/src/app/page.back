// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import { HeaderHUD } from "@/components/HeaderHUD";
import { CrewSidebar } from "@/components/CrewSidebar";
import { PlantSidebar } from "@/components/PlantSidebar";
import SpectralWave from "@/components/SpectralWave";
import { EnergyHUD } from "@/components/EnergyHUD";
import { Timeline30 } from "@/components/Timeline30";
import AIStrategistChip from "@/components/AIStrategistChip";

import { useCockpit } from "@/lib/useCockpit";
import { toDaySegments } from "@/lib/illumination";

export default function Page() {
  const {
    status,
    effTod,
    humanBands,
    plantBands,
    humanMode,
    plantMode,
    illumMask,
    illumMode,

    // EDGE
    edge,          // { decisionId, ruleFamily, rationale, expiresAt, ... }
    edgeActive,    // boolean: active until expiresAt
    edgePulse,     // boolean: true ~1.2s after new decision

    // thought stream (we'll show only the latest line under the chip)
    ticker,
  } = useCockpit();

  // --- helpers / fallbacks
  const FALLBACK_BANDS = [0.2, 0.35, 0.45, 0.25, 0.15, 0.1, 0.2, 0.4, 0.55, 0.7, 0.9, 0.75];
  const PLANT_FALLBACK = [0.55, 0.75, 0.62, 0.42, 0.32, 0.42, 0.70, 0.85, 0.96, 1.0, 0.98, 0.80];
  const hasSignal = (b?: number[]) => Array.isArray(b) && b.some((v) => (v ?? 0) > 1e-3);

  const illumSegs = useMemo(
    () => (illumMask ? toDaySegments(illumMask, 30) : []),
    [illumMask]
  );

  const kw = status?.energyKw ?? 0;
  const breakdown = status?.energyBreakdown;
  const mode = status?.energyMode;
  const humanIntensity = status?.humanIntensityHint;

  // Dev inspect
  useEffect(() => {
    // @ts-ignore
    window.__EDGE = edge ?? null;
    if (edge?.decisionId) {
      // eslint-disable-next-line no-console
      console.log("[EDGE] active:", {
        decisionId: edge.decisionId,
        ruleFamily: edge.ruleFamily,
        rationale: edge.rationale,
        expiresAt: edge.expiresAt,
      });
    }
  }, [edge?.decisionId]);

  // Compact expiry countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const expiresIn = edge?.expiresAt ? Math.max(0, Math.floor((Date.parse(edge.expiresAt) - now) / 1000)) : 0;

  // Show EDGE pill only on the appropriate panel
  const rule = edge?.ruleFamily ?? "";
  const isHumanRule = edgeActive && (rule === "wake_boost" || rule === "night_protect");
  const isPlantRule = edgeActive && (rule === "plant_bias" || rule === "plant_catchup" || rule === "energy_trim" || rule === "overlay_guard");

  const humanEdge = isHumanRule
    ? { active: edgeActive, pulse: edgePulse, rule: edge?.ruleFamily, rationale: edge?.rationale }
    : undefined;

  const plantEdge = isPlantRule
    ? { active: edgeActive, pulse: edgePulse, rule: edge?.ruleFamily, rationale: edge?.rationale }
    : undefined;

  // Latest thought (concise line that can reference crew/plant/energy)
  const latestThought =
    ticker?.length ? ticker[ticker.length - 1]?.text : "All systems nominal — monitoring light-health balance.";

  return (
    <main className="min-h-screen p-6 bg-[#0A0F14] text-white">
      <div className="mx-auto max-w-[1440px] space-y-6">
        {/* If your HeaderHUD also shows a lunar strip, you can add a prop there later to hide it if desired */}
        <HeaderHUD />

        <div className="grid grid-cols-12 gap-6">
          {/* Left: Crew + Plants */}
          <aside className="col-span-12 md:col-span-3 space-y-6">
            <CrewSidebar />
            <PlantSidebar />
          </aside>

          {/* Center: Spectrum panels */}
          <section className="col-span-12 md:col-span-6 space-y-6">
            <SpectralWave
              title="Circadian Spectrum"
              mode={humanMode || "WAKE SYNC"}
              bands={hasSignal(humanBands) ? humanBands! : FALLBACK_BANDS}
              className="h-[160px]"
              edge={humanEdge}
            />
            <SpectralWave
              title="Growth Spectrum"
              mode={plantMode || "GROWTH SURGE"}
              bands={hasSignal(plantBands) ? plantBands! : PLANT_FALLBACK}
              className="h-[160px]"
              edge={plantEdge}
            />

            {/* ✅ EDGE DEBUG — compact (≈4 lines). Full JSON on hover. No scrollbar. */}
            <div
              className="mt-2 rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5"
              title={edge?.decisionId ? JSON.stringify(edge, null, 2) : "No edge decision yet"}
            >
              <div className="mb-1 font-semibold tracking-wide text-white/80">EDGE DEBUG</div>
              {edge?.decisionId ? (
                <div className="space-y-0.5 max-h-16 overflow-hidden">
                  <div>
                    status:{" "}
                    <span className={edgeActive ? "text-emerald-300" : "text-zinc-400"}>
                      {edgeActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <div>rule: <span className="text-white/90">{edge?.ruleFamily ?? "—"}</span></div>
                  <div>rationale: <span className="text-white/80">{edge?.rationale ?? "—"}</span></div>
                  <div>expires in: <span className="text-white/90">{expiresIn}s</span></div>
                </div>
              ) : (
                <div className="text-white/60">No edge decision yet</div>
              )}
            </div>
          </section>

          {/* Right: Energy + EDGE Analytics + thought line */}
          <aside className="col-span-12 md:col-span-3 space-y-3">
            <EnergyHUD
              kw={kw}
              maxKw={24}
              label="Energy HUD"
              breakdown={breakdown}
              mode={mode}
              humanIntensity={humanIntensity}
            />

            {/* Keep the original EDGE ANALYTICS chip (blinking blue light) */}
            <div className="flex items-center justify-center">
              <AIStrategistChip active />
            </div>

            {/* Thought line under the chip (no second 'Edge Analytics' heading) */}
            <div
              className={[
                "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] leading-5",
                "backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
                edgePulse ? "animate-[edgepulse_1200ms_ease-out_1]" : ""
              ].join(" ")}
            >
              {latestThought}
            </div>
          </aside>
        </div>

        {/* Keep ONLY the meter (no duplicate 'Lunar Synodic Cycle' header) */}
        <Timeline30
          day={status?.sol ?? 0}
          tod={effTod ?? 0}
          illum={illumSegs}
          label="CURRENT"
          totalDays={30}
          dayLabel="Mission Day"
          showPercent
        />

        {/* Big fixed badge so it’s impossible to miss */}
        {edgeActive && (
          <div
            title={edge?.rationale || "EDGE decision active"}
            className="fixed bottom-3 right-3 rounded-md px-3 py-1 text-xs bg-black/60 text-white border border-white/10 shadow-[0_0_20px_rgba(0,255,200,0.35)] animate-[edgepulse_1200ms_ease-out_1] z-[9999]"
          >
            EDGE ACTIVE — {edge?.ruleFamily ?? "—"}
          </div>
        )}
      </div>
    </main>
  );
}
