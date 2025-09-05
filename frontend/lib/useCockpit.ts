// frontend/lib/useCockpit.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { sampleBands, type Schedule, type Bands } from "./schedule";
import { computeCrewSync, syncColor, type Phase } from "./sim/human";
import {
  type IllumMask,
  type IllumMode,
  modeFromWindows,
  darkWindowsForDay,
  minutesUntilNextDark,
} from "./illumination";
import { mediFromBands, type HumanTargets } from "./humanDose";

// ---------- API / math helpers ----------
const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const applyDelta = (base: Bands, delta?: Bands): Bands =>
  !delta || delta.length !== base.length ? base : base.map((v, i) => clamp01(v * (1 + (delta[i] ?? 0))));

// ---------- Types from /status ----------
export type Zone = { id: string; name: string; deck: number; stream: "human" | "plant" };
export type Crew = { id: "A" | "B"; name: string; zoneId: string; phase: Phase; driftMin: number };

type EnergyBreakdown = {
  humanKW: number;
  greenhouseKW: number;
  algaeKW: number;
  overlaysKW: number;
  marginKW: number;
};

type PlantZone = {
  id: string;
  name: string;
  ppfdSet: number;
  ppfdNow: number;
  dliTarget: number;
  dliProgress: number; // 0..1
  energyKW: number;
  overlay: { on: boolean; untilUtc: string | null };
};

type Status = {
  sol: number;
  tod: number;
  energyKw: number;
  energyBreakdown?: EnergyBreakdown;
  energyMode?: string;
  humanIntensityHint?: number;
  local?: string;
  utc?: string;
  lunar?: { pct: number; daysRemaining: number };
  zones?: Zone[];
  crew?: Crew[];
  plantZones?: PlantZone[];
  // Build 7 fields:
  humanTargets?: HumanTargets;
  humanDose?: { mediLux?: number };
};

// ---------- EDGE decision (from /lights/plan) ----------
type EdgeDecision = {
  applied?: boolean;
  decisionId?: string;
  expiresAt?: string;      // ISO
  ruleFamily?: string;     // "night_protect" | "wake_boost" | "energy_trim" | "plant_bias" | ...
  humanDelta?: number[];   // 12-length
  plantDelta?: number[];   // 12-length
  rationale?: string;
  // Batch 3: optional targeting echo from BE
  zoneId?: string | null;
};

function isEdgeActive(edge: EdgeDecision | null) {
  if (!edge?.applied || !edge.expiresAt) return false;
  const exp = Date.parse(edge.expiresAt);
  return Number.isFinite(exp) && Date.now() < exp;
}

// Allow legacy planner shapes to still drive UI
function synthesizeDecision(_sol: number, _effTod: number, _energyKw: number, d: any): EdgeDecision | null {
  const hasLegacy = Array.isArray(d?.humanDelta) || Array.isArray(d?.plantDelta);
  if (!hasLegacy) return null;
  const now = Date.now();
  return {
    applied: true,
    decisionId: `legacy-${now}-${Math.floor(Math.random() * 1e6)}`,
    expiresAt: new Date(now + 5 * 60 * 1000).toISOString(),
    ruleFamily: "legacy",
    humanDelta: d.humanDelta ?? new Array(12).fill(0),
    plantDelta: d.plantDelta ?? new Array(12).fill(0),
    rationale: d.rationale ?? "Legacy EDGE deltas applied.",
  };
}

// ---------- Thought stream ----------
type Tone = "info" | "wake" | "sleep" | "trim" | "plant";
type Thought = { id: string; text: string; tone?: Tone; ts?: number };

export function useCockpit() {
  // ---------- Core state ----------
  const [status, setStatus] = useState<Status | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [illumMask, setIllumMask] = useState<IllumMask | null>(null);

  // EDGE
  const [edge, setEdge] = useState<EdgeDecision | null>(null);
  const [edgePulse, setEdgePulse] = useState(false);

  // Thoughts (for ThoughtLine rotator)
  const [ticker, setTicker] = useState<Thought[]>([]);
  const pushThought = (t: Thought) =>
    setTicker((prev) => {
      const next = [...prev, t];
      return next.slice(Math.max(0, next.length - 20));
    });

  // ---------- Dev accelerator via ?fast_tod=1 ----------
  const [fastDemo, setFastDemo] = useState(false);
  const [phase, setPhase] = useState(0); // 0..1 fraction of a day
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setFastDemo(params.has("fast_tod") || process.env.NEXT_PUBLIC_DEV_ACCELERATE_TOD === "1");
    } catch {}
  }, []);
  useEffect(() => {
    if (!fastDemo) return;
    const STEP = 0.02; // ~50s per mission day
    const id = setInterval(() => setPhase((p) => (p + STEP) % 1), 1000);
    return () => clearInterval(id);
  }, [fastDemo]);

  // ---------- Poll /status ----------
  useEffect(() => {
    const fetchStatus = () =>
      fetch(`${API}/status`)
        .then((r) => r.json())
        .then((d) =>
          setStatus({
            sol: d.time.sol,
            tod: d.time.tod,
            energyKw: d.energy?.kw ?? d.energyKw,
            energyBreakdown: d.energy?.breakdown,
            energyMode: d.energy?.mode,
            humanIntensityHint: d.energy?.humanIntensity,
            local: d.time.local,
            utc: d.time.utc,
            lunar: d.lunar,
            zones: d.zones,
            crew: d.crew,
            plantZones: d.plantZones,
            humanTargets: d.humanTargets,
            humanDose: d.humanDose,
          }),
        )
        .catch(() => {});
    fetchStatus();
    const id = setInterval(fetchStatus, 2000);
    return () => clearInterval(id);
  }, []);

  // ---------- Load /schedule/30d & /illumination/30d once ----------
  useEffect(() => { fetch(`${API}/schedule/30d`).then((r) => r.json()).then(setSchedule).catch(() => {}); }, []);
  useEffect(() => { fetch(`${API}/illumination/30d`).then((r) => r.json()).then(setIllumMask).catch(() => {}); }, []);

  // ---------- Unified UI clock ----------
  const baseSol = status?.sol ?? 0;
  const baseTod = status?.tod ?? 0;
  const virt = baseSol + baseTod + phase;            // continuous day position
  const uiSol = ((Math.floor(virt) % 30) + 30) % 30; // 0..29
  const effTod = virt - Math.floor(virt);            // 0..1

  // ---------- Bands (use unified UI clock) ----------
  let humanBands: Bands = new Array(12).fill(0);
  let plantBands: Bands = new Array(12).fill(0);
  let humanMode = "—", plantMode = "—";
  let illumMode: IllumMode = "Sunlit";

  if (status && schedule) {
    const hb = sampleBands(uiSol, effTod, schedule.human);
    const pb = sampleBands(uiSol, effTod, schedule.plant);

    // Demo visibility multiplier for deltas
    const EDGE_DEMO_MULT = 1.5;
    const scaleDelta = (arr?: number[]) => {
      const N = 12, out = new Array(N).fill(0);
      if (Array.isArray(arr)) for (let i = 0; i < Math.min(N, arr.length); i++) out[i] = (arr[i] ?? 0) * EDGE_DEMO_MULT;
      return out as Bands;
    };
    const edgeHuman = isEdgeActive(edge) ? scaleDelta(edge?.humanDelta) : undefined;
    const edgePlant = isEdgeActive(edge) ? scaleDelta(edge?.plantDelta) : undefined;

    let H = edgeHuman ? applyDelta(hb.bands, edgeHuman as any) : hb.bands;
    let P = edgePlant ? applyDelta(pb.bands, edgePlant as any) : pb.bands;

    // Micro-dark windows & mode
    const wins = illumMask ? darkWindowsForDay(illumMask, uiSol) : [];
    illumMode = modeFromWindows(effTod, wins);

    // scalers
    const scaleHuman = (bands: Bands, _label: string, m: IllumMode, energyKw: number): Bands => {
      const out = bands.slice();
      let amp = 1.0;
      if (m === "PreDark") amp = 0.85;
      if (m === "Dark")    amp = 0.70;
      if (m === "ReLight") amp = 0.90;
      if (energyKw > 18) amp *= 0.9;
      if (m !== "Sunlit") {
        const blueIdx = [2,3,4], warmIdx = [9,10,11];
        blueIdx.forEach(i => out[i] *= 0.9);
        warmIdx.forEach(i => out[i] *= 1.05);
      }
      const mx = Math.max(...out, 0.0001);
      return out.map(v => (v / mx) * amp) as Bands;
    };
    const scalePlant = (bands: Bands, m: IllumMode, energyKw: number): Bands => {
      let amp = 1.0;
      if (m === "PreDark") amp = 1.10;
      if (m === "Dark")    amp = 0.40;
      if (m === "ReLight") amp = 1.10;
      if (energyKw > 18) amp *= 0.9;
      const mx = Math.max(...bands, 0.0001);
      return bands.map(v => Math.min(1, (v / mx) * amp)) as Bands;
    };

    H = scaleHuman(H as Bands, hb.mode || "WORK", illumMode, status.energyKw);
    P = scalePlant(P as Bands, illumMode, status.energyKw);

    humanBands = H as Bands;
    plantBands = P as Bands;
    humanMode = hb.mode ?? humanMode;
    plantMode = pb.mode ?? plantMode;
  }

  // ---------- Enrich crew with sync %, color, zoneName ----------
  const crew = (status?.crew ?? []).map((c) => {
    const z = (status?.zones ?? []).find((z) => z.id === c.zoneId);
    const spd = z?.stream === "plant" ? plantBands : humanBands;
    const pct = computeCrewSync(spd as Bands, c.phase, c.driftMin);
    const color = syncColor(pct);
    return { ...c, zoneName: z?.name ?? c.zoneId, sync: pct, color };
  });

  // ---------- Build 6 helpers (chip/slivers) ----------
  const darkWindowsToday = illumMask ? darkWindowsForDay(illumMask, uiSol) : [];
  const nextDarkInMin = illumMask ? minutesUntilNextDark(effTod, darkWindowsToday) : null;

  // ---------- Human dose (mEDI) ----------
  const intensityLux = status?.humanIntensityHint ?? 250;
  const mediLuxComputed = mediFromBands(humanBands, intensityLux);
  const targets: HumanTargets = status?.humanTargets ?? {
    morning_medi_lux: 250, day_medi_lux: 250, evening_cap_medi_lux: 50, sleep_cap_medi_lux: 10,
  };

  const mediRef = useRef<number>(0);
  useEffect(() => { mediRef.current = mediLuxComputed || 0; }, [mediLuxComputed]);

  // ---------- Observer thoughts every ~5s ----------
  useEffect(() => {
    const id = setInterval(() => {
      if (!status) return;
      const tone: Tone =
        status.energyKw > 18 ? "trim" :
        status.energyKw < 8  ? "plant" : "info";

      const msg =
        status.energyKw > 18 ? "Energy pressure rising — trimming where safe." :
        illumMode === "Dark" ? "Dark band — holding human comfort and power reserve." :
        illumMode === "ReLight" ? "Re-Light window — canopy catch-up." :
        "All systems nominal — monitoring light-health balance.";

      pushThought({ id: `obs-${Date.now()}`, text: msg, ts: Date.now(), tone });
    }, 5000);
    return () => clearInterval(id);
  }, [status?.energyKw, illumMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Transition cues for micro-dark buckets (45 → 15 → 0) ----------
  const prevBucketRef = useRef<number>(-999);
  useEffect(() => {
    const nd = nextDarkInMin;
    const bucket = nd === 0 ? 2 : (nd != null && nd <= 15 ? 1 : (nd != null && nd <= 45 ? 0 : -1));
    if (bucket === prevBucketRef.current) return;
    prevBucketRef.current = bucket;
    const now = Date.now();
    if (bucket === 0)      pushThought({ id: `predark-${now}`,     text: "Pre-Dark window — banking DLI.", ts: now, tone: "plant" });
    else if (bucket === 1) pushThought({ id: `predarksoon-${now}`, text: "Dark window in ≤15m — preparing to hold reserves.", ts: now, tone: "trim" });
    else if (bucket === 2) pushThought({ id: `dark-${now}`,        text: "Dark window — holding human comfort and power reserve.", ts: now, tone: "trim" });
    else if (bucket === -1 && nd != null) pushThought({ id: `relight-${now}`, text: "Re-Light window — canopy catch-up underway.", ts: now, tone: "plant" });
  }, [nextDarkInMin]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Fast demo: lift Plant DLI progress with accelerated clock ----------
  const plantZonesView: PlantZone[] = (status?.plantZones ?? []).map((z) => {
    if (!fastDemo || !illumMask) return z;
    const wins = darkWindowsForDay(illumMask, uiSol);
    const litSoFar = wins.reduce((acc, w) => acc - Math.max(0, Math.min(effTod, w.endTod) - Math.min(effTod, w.startTod)), effTod);
    const litFrac = clamp01(litSoFar);
    const lifted = Math.max(z.dliProgress ?? 0, litFrac * 0.9);
    return { ...z, dliProgress: lifted };
  });

  // ---------- Re-Light catch-up (worst DLI gap → % planned catch-up) ----------
  const relight = (illumMode === "ReLight");
  let relightCatchupPct = 0;
  if (Array.isArray(plantZonesView) && plantZonesView.length) {
    const worstGap = plantZonesView.reduce((acc, z) => {
      const gap = Math.max(0, 1 - (z.dliProgress ?? 0));
      return Math.max(acc, gap);
    }, 0);
    relightCatchupPct = Math.round(worstGap * 85);
  }

  // ---------- Batch 3: per-zone targets ----------
  const humanTargetZoneId: Record<"A" | "B", string | null> = {
    A: status?.crew?.find(c => c.id === "A")?.zoneId ?? null,
    B: status?.crew?.find(c => c.id === "B")?.zoneId ?? null,
  };

  const plantTargetZoneId: string | null = (() => {
    if (!plantZonesView?.length) return null;
    let worst = plantZonesView[0];
    for (const z of plantZonesView) if ((z.dliProgress ?? 1) < (worst.dliProgress ?? 1)) worst = z;
    return worst.id;
  })();

  // ---------- Live planner loop (uses unified clock) ----------
  // Always post; backend returns {applied:false} if nothing applies.
  useEffect(() => {
    if (!status) return;

    const body = JSON.stringify({
      sol: uiSol,
      tod: effTod,
      energyKw: status.energyKw,
      humanDose: { mediLux: Math.round(mediRef.current) }, // mEDI guards
      // NOTE: this loop is generic. Per-crew posting uses postHumanPlan below.
    });

    fetch(`${API}/lights/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-psl-demo": fastDemo ? "1" : "0" },
      body,
    })
      .then((r) => r.json())
      .then((d: any) => {
        const incoming: EdgeDecision | null =
          (d && typeof d === "object" && "applied" in d) ? (d as EdgeDecision)
          : synthesizeDecision(uiSol, effTod, status.energyKw, d);

        if (incoming?.applied && incoming.decisionId && incoming.decisionId !== edge?.decisionId) {
          setEdge(incoming);
          setEdgePulse(true);
          setTimeout(() => setEdgePulse(false), 1200);

          const tone: Tone =
            incoming.ruleFamily === "wake_boost"    ? "wake"  :
            incoming.ruleFamily === "night_protect" ? "sleep" :
            incoming.ruleFamily === "energy_trim"   ? "trim"  :
                                                      "plant";

          const text =
            incoming.ruleFamily === "wake_boost"    ? "Morning alignment: boosting blue to accelerate crew wake."
          : incoming.ruleFamily === "night_protect" ? "Quiet hours: suppressing blue to protect melatonin."
          : incoming.ruleFamily === "energy_trim"   ? "Budget guard: trimming spectrum to hold energy line."
                                                    : "Canopy tuning: biasing red/far-red for efficient growth.";

          pushThought({ id: incoming.decisionId!, text, ts: Date.now(), tone });
          console.log("[EDGE][LIVE]", incoming.decisionId, incoming.ruleFamily, incoming.zoneId ?? "(no zone)");
        } else if (!incoming?.applied) {
          setEdge((prev) => prev ?? null);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiSol, status?.energyKw, fastDemo]);

  // ---------- Batch 3: explicit per-crew planner post (includes zoneId) ----------
  async function postHumanPlan(params: {
    crew: "A" | "B";
    sol: number;
    tod: number;
    energyKw: number;
    mediLux: number;
  }) {
    const zoneId = humanTargetZoneId[params.crew];
    const body: any = {
      sol: params.sol,
      tod: params.tod,
      energyKw: params.energyKw,
      humanDose: { mediLux: params.mediLux },
    };
    if (zoneId) body.zoneId = zoneId; // attach for BE echo → FE routing
    const res = await fetch(`${API}/lights/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  return {
    // raw & derived status
    status,
    zones: status?.zones ?? [],
    plantZones: plantZonesView,
    crew,

    // bands & modes
    humanBands,
    plantBands,
    humanMode,
    plantMode,
    illumMode,
    illumMask,

    // unified UI clock
    effTod,
    uiSol,

    // EDGE
    edge,
    edgePulse,
    edgeActive: isEdgeActive(edge),

    // micro-dark helpers
    nextDarkInMin,
    darkWindowsToday,

    // ticker stream for ThoughtLine
    ticker,

    // human dose (mEDI)
    humanDose: { mediLux: mediLuxComputed, targets },

    // Re-Light chip signals
    relight,
    relightCatchupPct,

    // Batch 3 exports
    humanTargetZoneId,  // { A, B }
    plantTargetZoneId,  // worst-gap plant zone
    postHumanPlan,
  };
}
