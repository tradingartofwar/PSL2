// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import { HeaderHUD } from "@/components/HeaderHUD";
import { CrewSidebar } from "@/components/CrewSidebar";
import { PlantSidebar } from "@/components/PlantSidebar";
import { EnergyHUD } from "@/components/EnergyHUD";
import { Timeline30 } from "@/components/Timeline30";
import AIStrategistChip from "@/components/AIStrategistChip";
import ThoughtLine from "@/components/ThoughtLine";
import PresenceDrawer from "@/components/cockpit/PresenceDrawer";
import SpectrumColumn from "@/components/SpectrumColumn";
import EdgeDecisionsPanel from "@/components/EdgeDecisionsPanel";
import PreDarkChip from "@/components/chips/PreDarkChip";
import ReLightChip from "@/components/chips/ReLightChip";

import { useCockpit } from "@/lib/useCockpit";
import { toDaySegments } from "@/lib/illumination";
import { queryFlag } from "@/lib/query";
import { partitionZones, visibleHumanZones, visiblePlantZones } from "@/lib/zones";

export default function Page() {
  const {
    status, effTod, uiSol,
    humanBands, plantBands, humanMode, plantMode, illumMask,
    nextDarkInMin, darkWindowsToday,
    edge, edgeActive, edgePulse,
    ticker, illumMode,
    humanDose, zones, crew,
    relight, relightCatchupPct,
    humanTargetZoneId, plantTargetZoneId,
  } = useCockpit();

  // Helpers
  const illumSegs = useMemo(() => (illumMask ? toDaySegments(illumMask, 30) : []), [illumMask]);
  const kw = status?.energyKw ?? 0;
  const breakdown = status?.energyBreakdown;
  const humanIntensity = status?.humanIntensityHint;

  // Dev inspect
  useEffect(() => { /* @ts-ignore */ window.__EDGE = edge ?? null; }, [edge?.decisionId]);

  // Expiry countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const expiresIn = edge?.expiresAt ? Math.max(0, Math.floor((Date.parse(edge.expiresAt) - now) / 1000)) : 0;

  // Rule family routing (unchanged)
  const rule = edge?.ruleFamily ?? "";
  const isHumanRule = edgeActive && (rule === "wake_boost" || rule === "night_protect");
  const isPlantRule = edgeActive && (rule === "plant_bias" || rule === "plant_catchup" || rule === "energy_trim" || rule === "overlay_guard");
  const humanEdge = isHumanRule ? { active: edgeActive, pulse: edgePulse, rule: edge?.ruleFamily, rationale: edge?.rationale, zoneId: edge?.zoneId } : undefined;
  const plantEdge = isPlantRule ? { active: edgeActive, pulse: edgePulse, rule: edge?.ruleFamily, rationale: edge?.rationale, zoneId: edge?.zoneId } : undefined;

  // Zone visibility (Batch 3 behavior + debug flag)
  const showAllZones = queryFlag("zones", "all");
  const { human: allHumanZones, plant: allPlantZones } = partitionZones((zones ?? []) as any);
  const humanZones = visibleHumanZones(allHumanZones as any, humanTargetZoneId as any, showAllZones);
  const plantZones = visiblePlantZones(allPlantZones as any, plantTargetZoneId, showAllZones);

  return (
    <main className="min-h-screen p-6 bg-[#0A0F14] text-white">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <HeaderHUD />

        <div className="grid grid-cols-12 gap-6">
          {/* Left: Crew + Presence + Plants */}
          <aside className="col-span-12 md:col-span-3 space-y-6">
            <CrewSidebar />
            <PresenceDrawer crew={(crew as any) ?? []} zones={(zones as any) ?? []} />
            <PlantSidebar />
          </aside>

          {/* Center: Spectrum panels */}
          <section className="col-span-12 md:col-span-6 space-y-6">
            {/* mEDI pill */}
            {humanDose?.mediLux !== undefined && (
              <div className="inline-flex items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-200">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-300" />
                mEDI {Math.round(humanDose.mediLux)} lux
                <span className="opacity-70">&nbsp;• target ≥{humanDose.targets.morning_medi_lux}</span>
              </div>
            )}

            {/* Human stream (only occupied zones unless ?zones=all) */}
            <SpectrumColumn
              type="human"
              zones={humanZones as any}
              titlePrefix="Circadian"
              mode={humanMode || "WAKE SYNC"}
              bands={humanBands}
              edge={humanEdge}
            />

            {/* Plant stream (only worst-gap unless ?zones=all) */}
            <SpectrumColumn
              type="plant"
              zones={plantZones as any}
              titlePrefix="Growth"
              mode={plantMode || "GROWTH SURGE"}
              bands={plantBands}
              edge={plantEdge}
              plantTargetZoneId={plantTargetZoneId ?? undefined}
            />
          </section>

          {/* Right: Energy + chips + rotating Thought Line + compact decisions */}
          <aside className="col-span-12 md:col-span-3 space-y-3">
            <EnergyHUD kw={kw} maxKw={24} label="Energy HUD" breakdown={breakdown} mode={illumMode} humanIntensity={humanIntensity} />
            <PreDarkChip minutes={typeof nextDarkInMin === "number" ? nextDarkInMin : 999} />
            <ReLightChip active={!!relight} pct={relightCatchupPct} />

            <div className="flex items-center justify-center">
              <AIStrategistChip active label="Edge Decisions" sublabel="Stable, explainable choices" />
            </div>

            <div className={["mx-2 -mt-1 pslcard px-3 py-2 text-[12px] leading-5 backdrop-blur-sm", edgePulse ? "animate-[edgepulse_1200ms_ease-out_1]" : ""].join(" ")}>
              <ThoughtLine items={(ticker ?? []).map((t) => ({ id: t.id, text: t.text, tone: t.tone as any }))} periodMs={3000} />
            </div>

            {/* Compact Edge details (no duplicate header) */}
            <EdgeDecisionsPanel
              edge={edge as any}
              edgeActive={!!edgeActive}
              expiresInSec={expiresIn}
              showHeader={false}
              className="mx-2 -mt-1"
            />
          </aside>
        </div>

        {/* Timeline */}
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

        {/* Floating edge badge */}
        {edgeActive && (
          <div
            title={edge?.rationale || "EDGE decision active"}
            className="fixed bottom-3 right-3 rounded-md px-3 py-1 text-xs bg-black/60 text-white border border-white/10 shadow-[0_0_20px_rgba(0,255,200,0.35)] animate-[edgepulse_1200ms_ease-out_1] z-[9999]"
          >
            EDGE ACTIVE — {edge?.ruleFamily ?? "—"} {edge?.zoneId ? `@ ${edge.zoneId}` : ""}
          </div>
        )}
      </div>
    </main>
  );
}
