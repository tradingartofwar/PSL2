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
import ThoughtLine from "@/components/ThoughtLine";
import PresenceDrawer from "@/components/cockpit/PresenceDrawer";

import { useCockpit } from "@/lib/useCockpit";
import { toDaySegments } from "@/lib/illumination";

export default function Page() {
  const {
    status,
    effTod,
    uiSol,
    humanBands,
    plantBands,
    humanMode,
    plantMode,
    illumMask,

    // Build 6
    nextDarkInMin,
    darkWindowsToday,

    // EDGE
    edge,
    edgeActive,
    edgePulse,

    // ticker
    ticker,

    // client-synced illumination mode for HUD
    illumMode,

    // Build 7 — human melanopic dose
    humanDose,
    zones,
    crew,

    // NEW — Re-Light
    relight,
    relightCatchupPct,
  } = useCockpit();

  // --- helpers / fallbacks
  const FALLBACK_BANDS = [0.2, 0.35, 0.45, 0.25, 0.15, 0.1, 0.2, 0.4, 0.55, 0.7, 0.9, 0.75];
  const PLANT_FALLBACK = [0.55, 0.75, 0.62, 0.42, 0.32, 0.42, 0.70, 0.85, 0.96, 1.0, 0.98, 0.80];
  const hasSignal = (b?: number[]) => Array.isArray(b) && b.some((v) => (v ?? 0) > 1e-3);

  const illumSegs = useMemo(() => (illumMask ? toDaySegments(illumMask, 30) : []), [illumMask]);

  const kw = status?.energyKw ?? 0;
  const breakdown = status?.energyBreakdown;
  const humanIntensity = status?.humanIntensityHint;

  // Dev inspect
  useEffect(() => {
    // @ts-ignore
    window.__EDGE = edge ?? null;
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
  const isPlantRule =
    edgeActive &&
    (rule === "plant_bias" || rule === "plant_catchup" || rule === "energy_trim" || rule === "overlay_guard");

  const humanEdge = isHumanRule
    ? { active: edgeActive, pulse: edgePulse, rule: edge?.ruleFamily, rationale: edge?.rationale }
    : undefined;

  const plantEdge = isPlantRule
    ? { active: edgeActive, pulse: edgePulse, rule: edge?.ruleFamily, rationale: edge?.rationale }
    : undefined;

  return (
    <main className="min-h-screen p-6 bg-[#0A0F14] text-white">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <HeaderHUD />

        <div className="grid grid-cols-12 gap-6">
          {/* Left: Crew + Presence + Plants */}
          <aside className="col-span-12 md:col-span-3 space-y-6">
            <CrewSidebar />
            {/* Presence Drawer (MVP) */}
            <PresenceDrawer crew={(crew as any) ?? []} zones={(zones as any) ?? []} />
            <PlantSidebar />
          </aside>

          {/* Center: Spectrum panels */}
          <section className="col-span-12 md:col-span-6 space-y-6">
            {/* mEDI pill for Circadian (small, unobtrusive) */}
            {humanDose?.mediLux !== undefined && (
              <div className="inline-flex items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-200">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-300" />
                mEDI {Math.round(humanDose.mediLux)} lux
                <span className="opacity-70">
                  &nbsp;• target ≥{humanDose.targets.morning_medi_lux}
                </span>
              </div>
            )}

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

            {/* ✅ EDGE DECISIONS — compact (≈4 lines). Full JSON on hover. */}
            <div
              className="mt-2 rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5"
              title={edge?.decisionId ? JSON.stringify(edge, null, 2) : "No edge decision yet"}
            >
              <div className="mb-1 font-semibold tracking-wide text-white/80">EDGE DECISIONS</div>
              {edge?.decisionId ? (
                <div className="space-y-0.5 max-h-16 overflow-hidden">
                  <div>
                    status:{" "}
                    <span className={edgeActive ? "text-emerald-300" : "text-zinc-400"}>
                      {edgeActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <div>
                    rule: <span className="text-white/90">{edge?.ruleFamily ?? "—"}</span>
                  </div>
                  <div>
                    rationale: <span className="text-white/80">{edge?.rationale ?? "—"}</span>
                  </div>
                  <div>
                    expires in: <span className="text-white/90">{expiresIn}s</span>
                  </div>
                </div>
              ) : (
                <div className="text-white/60 italic">waiting for EDGE decision…</div>
              )}
            </div>
          </section>

          {/* Right: Energy + chips + rotating Thought Line */}
          <aside className="col-span-12 md:col-span-3 space-y-3">
            {/* synced to client clock */}
            <EnergyHUD
              kw={kw}
              maxKw={24}
              label="Energy HUD"
              breakdown={breakdown}
              mode={illumMode}
              humanIntensity={humanIntensity}
            />

            {/* Pre-Dark chip (≤45m; pulse ≤15m) */}
            {typeof nextDarkInMin === "number" && nextDarkInMin <= 45 && (
              <div
                className="mx-2 mt-1 inline-flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-300"
                title="Minutes until the next micro-dark window at Shackleton"
                role="status"
                aria-live="polite"
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    nextDarkInMin <= 15 ? "bg-amber-300 animate-pulse" : "bg-amber-300"
                  }`}
                />
                Pre-Dark in {nextDarkInMin}m
              </div>
            )}

            {/* NEW: Re-Light catch-up chip */}
            {relight && relightCatchupPct > 0 && (
              <div
                className="mx-2 mt-1 inline-flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300"
                title="Re-Light window — planned DLI catch-up across canopy"
                role="status"
                aria-live="polite"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Re-Light catch-up {Math.round(relightCatchupPct)}%
              </div>
            )}

            {/* Unified copy: Edge Decisions chip */}
            <div className="flex items-center justify-center">
              <AIStrategistChip active label="Edge Decisions" sublabel="Stable, explainable choices" />
            </div>

            {/* Thought line — rotator (3s) */}
            <div
              className={[
                "mx-2 -mt-1 pslcard px-3 py-2 text-[12px] leading-5 backdrop-blur-sm",
                edgePulse ? "animate-[edgepulse_1200ms_ease-out_1]" : "",
              ].join(" ")}
            >
              <ThoughtLine
                items={(ticker ?? []).map((t) => ({ id: t.id, text: t.text, tone: t.tone as any }))}
                periodMs={3000}
              />
            </div>
          </aside>
        </div>

        {/* Only the meter (no duplicate header). Pass today's micro-dark slivers. */}
        <Timeline30
          day={uiSol}
          tod={effTod}
          illum={illumSegs}
          darkWindowsToday={darkWindowsToday}
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
