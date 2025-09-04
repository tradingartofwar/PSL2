// frontend/lib/useCockpit.ts
"use client";

import { useEffect, useState } from "react";
import { sampleBands, type Schedule, type Bands } from "./schedule";
import { computeCrewSync, syncColor, type Phase } from "./sim/human";
import type { EdgeThought } from "@/components/EdgeTicker";

// ---------- Illumination helpers ----------
type IllumSample = { t: string; lit: 0 | 1 };
type IllumMask = { site: string; stepHours: number; samples: IllumSample[] };
type IllumMode = "Sunlit" | "PreDark" | "Dark" | "ReLight";

function maskIndex(sol: number, tod: number, stepHours: number) {
  const hour = Math.floor(tod * 24);
  return sol * (24 / stepHours) + Math.floor(hour / stepHours);
}
function modeAt(sol: number, tod: number, mask: IllumMask): IllumMode {
  const step = mask.stepHours || 1;
  const idx = Math.max(0, Math.min(mask.samples.length - 1, maskIndex(sol, tod, step)));
  const cur = mask.samples[idx]?.lit ?? 1;
  if (cur === 1) {
    const ahead2h = Math.min(mask.samples.length - 1, idx + Math.ceil(2 / step));
    const ahead4h = Math.min(mask.samples.length - 1, idx + Math.ceil(4 / step));
    const soonDark = mask.samples.slice(ahead2h, ahead4h + 1).some((s) => s.lit === 0);
    return soonDark ? "PreDark" : "Sunlit";
  }
  const prev = mask.samples[idx - 1]?.lit ?? 0;
  return prev === 0 ? "Dark" : "ReLight";
}

// optional DLI progress estimator for fast demo
function dliProgressFromMask(mask: IllumMask, sol: number, effTod: number) {
  if (!mask?.samples?.length) return 0;
  const step = mask.stepHours || 1;
  const stepsPerSol = Math.round(24 / step);
  const start = sol * stepsPerSol;
  const end = start + stepsPerSol;
  const idxNow = start + Math.min(stepsPerSol - 1, Math.floor((effTod * 24) / step));
  const todays = mask.samples.slice(start, end);
  const litTotal = todays.reduce((s, smp) => s + (smp.lit ? 1 : 0), 0);
  if (litTotal <= 0) return 0;
  const litSoFar = todays.slice(0, Math.max(0, idxNow - start + 1)).reduce((s, smp) => s + (smp.lit ? 1 : 0), 0);
  return Math.max(0, Math.min(1, litSoFar / litTotal));
}

// ---------- API / math helpers ----------
const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const applyDelta = (base: Bands, delta?: Bands): Bands =>
  !delta || delta.length !== base.length ? base : base.map((v, i) => clamp01(v * (1 + (delta[i] ?? 0))));

// ---------- Types from /status ----------
export type Zone = { id: string; name: string; deck: number; stream: "human" | "plant" };
export type Crew = { id: string; name: string; zoneId: string; phase: Phase; driftMin: number };

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
};

function isEdgeActive(edge: EdgeDecision | null) {
  if (!edge?.applied || !edge?.expiresAt) return false;
  const exp = Date.parse(edge.expiresAt);
  return Number.isFinite(exp) && Date.now() < exp;
}

// Synthesize decision if backend returns legacy shape
function synthesizeDecision(sol: number, effTod: number, energyKw: number, d: any): EdgeDecision | null {
  const hasLegacy = Array.isArray(d?.humanDelta) || Array.isArray(d?.plantDelta);
  if (!hasLegacy) return null;
  const now = Date.now();
  const ttlMs = 5 * 60 * 1000;
  return {
    applied: true,
    decisionId: `legacy-${now}-${Math.floor(Math.random() * 1e6)}`,
    expiresAt: new Date(now + ttlMs).toISOString(),
    ruleFamily: "legacy",
    humanDelta: d.humanDelta ?? new Array(12).fill(0),
    plantDelta: d.plantDelta ?? new Array(12).fill(0),
    rationale: d.rationale ?? "Legacy EDGE deltas applied.",
  };
}

export function useCockpit() {
  // ---------- Core state ----------
  const [status, setStatus] = useState<Status | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);

  // EDGE decision + a short-lived pulse flag for micro-animations
  const [edge, setEdge] = useState<EdgeDecision | null>(null);
  const [edgePulse, setEdgePulse] = useState(false);

  // Illumination mask
  const [illumMask, setIllumMask] = useState<IllumMask | null>(null);

  // Ticker
  const [ticker, setTicker] = useState<EdgeThought[]>([]);

  // ---------- AI toggle via ?ai=1 ----------
  const [aiActive, setAiActive] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setAiActive(params.has("ai") || process.env.NEXT_PUBLIC_AI_ON === "1");
    } catch {
      setAiActive(false);
    }
  }, []);

  // ---------- PRIME EDGE DECISION ON MOUNT (immediate client call) ----------
  useEffect(() => {
    if (!aiActive || edge?.decisionId) return;
    const body = JSON.stringify({ demo: true });
    fetch(`${API}/lights/plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body })
      .then((r) => r.json())
      .then((d: any) => {
        const incoming: EdgeDecision | null =
          (d && typeof d === "object" && "applied" in d) ? (d as EdgeDecision)
          : synthesizeDecision(0, 0, 0, d);
        if (incoming?.applied && !edge?.decisionId) {
          setEdge(incoming);
          setEdgePulse(true);
          setTimeout(() => setEdgePulse(false), 1200);
          setTicker((prev) => [
            ...prev.slice(-19),
            { id: incoming.decisionId!, text: "Primed UI: awaiting live EDGE.", ts: Date.now(), tone: "info" },
          ]);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiActive]);

  // ---------- One unified timebase ----------
  const TICK_MS = 1000;
  const STATUS_EVERY_TICKS = 2;
  const DEMO_SPEED_STEP = 0.02;

  const [tick, setTick] = useState(0);
  const [fastDemo, setFastDemo] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setFastDemo(params.has("fast_tod") || process.env.NEXT_PUBLIC_DEV_ACCELERATE_TOD === "1");
    } catch {}
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const effTod = (() => {
    const base = status?.tod ?? 0;
    if (!fastDemo) return base;
    const inc = (tick * DEMO_SPEED_STEP) % 1;
    return (base + inc) % 1;
  })();

  // ---------- Poll /status on the unified tick ----------
  useEffect(() => {
    if (tick % STATUS_EVERY_TICKS !== 0) return;
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
        }),
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // ---------- Load /schedule/30d once ----------
  useEffect(() => {
    fetch(`${API}/schedule/30d`).then((r) => r.json()).then(setSchedule).catch(() => {});
  }, []);

  // ---------- Load /illumination/30d once ----------
  useEffect(() => {
    fetch(`${API}/illumination/30d`).then((r) => r.json()).then(setIllumMask).catch(() => {});
  }, []);

  // ---------- Request EDGE plan on the same tick ----------
  useEffect(() => {
    if (!aiActive || !status) return;
    const body = JSON.stringify({ sol: status.sol, tod: effTod, energyKw: status.energyKw });
    fetch(`${API}/lights/plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body })
      .then((r) => r.json())
      .then((d: any) => {
        const incoming: EdgeDecision | null =
          (d && typeof d === "object" && "applied" in d) ? (d as EdgeDecision)
          : synthesizeDecision(status.sol, effTod, status.energyKw, d);

        if (incoming?.applied && incoming.decisionId && incoming.decisionId !== edge?.decisionId) {
          setEdge(incoming);
          setEdgePulse(true);
          setTimeout(() => setEdgePulse(false), 1200);

          const tone: EdgeThought["tone"] =
            incoming.ruleFamily === "wake_boost" ? "wake" :
            incoming.ruleFamily === "night_protect" ? "sleep" :
            incoming.ruleFamily === "energy_trim" ? "trim" :
            "plant";

          const text =
            incoming.ruleFamily === "wake_boost"
              ? "Morning alignment: boosting blue to accelerate crew wake."
              : incoming.ruleFamily === "night_protect"
              ? "Quiet hours: suppressing blue to protect melatonin."
              : incoming.ruleFamily === "energy_trim"
              ? "Budget guard: trimming spectrum to hold energy line."
              : "Canopy tuning: biasing red/far-red for efficient growth.";

          setTicker((prev) => [...prev.slice(-19), { id: incoming.decisionId!, text, ts: Date.now(), tone }]);
        } else if (!incoming?.applied) {
          setEdge((prev) => prev ?? null);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, aiActive, status?.sol, status?.energyKw]);

  // ---------- Band scalers (illumination + energy-aware) ----------
  function scaleHuman(bands: Bands, phaseLabel: string, mode: IllumMode, energyKw: number): Bands {
    const out = bands.slice();
    let amp = 1.0;
    if (mode === "PreDark") amp = 0.85;
    if (mode === "Dark") amp = 0.70;
    if (mode === "ReLight") amp = 0.90;
    if (energyKw > 18) amp *= 0.9;
    if (mode !== "Sunlit") {
      const blueIdx = [2, 3, 4], warmIdx = [9, 10, 11];
      blueIdx.forEach((i) => (out[i] *= 0.9));
      warmIdx.forEach((i) => (out[i] *= 1.05));
    }
    const m = Math.max(...out, 0.0001);
    return out.map((v) => (v / m) * amp) as Bands;
  }

  function scalePlant(bands: Bands, mode: IllumMode, energyKw: number): Bands {
    let amp = 1.0;
    if (mode === "PreDark") amp = 1.10;
    if (mode === "Dark") amp = 0.40;
    if (mode === "ReLight") amp = 1.10;
    if (energyKw > 18) amp *= 0.9;
    const m = Math.max(...bands, 0.0001);
    return bands.map((v) => Math.min(1, (v / m) * amp)) as Bands;
  }

  // ✅ Demo multiplier to make EDGE deltas visually clearer
  const EDGE_DEMO_MULT = 1.5;
  function scaleDelta(arr?: number[]): Bands {
    const N = 12, out = new Array(N).fill(0);
    if (Array.isArray(arr)) {
      for (let i = 0; i < Math.min(N, arr.length); i++) {
        out[i] = (arr[i] ?? 0) * EDGE_DEMO_MULT;
      }
    }
    return out as Bands;
  }

  // ---------- Compute bands with the SAME effTod ----------
  let humanBands: Bands = new Array(12).fill(0);
  let plantBands: Bands = new Array(12).fill(0);
  let humanMode = "—", plantMode = "—";
  let illumMode: IllumMode = "Sunlit";

  if (status && schedule) {
    const hb = sampleBands(status.sol, effTod, schedule.human);
    const pb = sampleBands(status.sol, effTod, schedule.plant);

    const edgeHuman = aiActive ? scaleDelta(edge?.humanDelta) : undefined;
    const edgePlant = aiActive ? scaleDelta(edge?.plantDelta) : undefined;

    let H = aiActive ? applyDelta(hb.bands, edgeHuman as any) : hb.bands;
    let P = aiActive ? applyDelta(pb.bands, edgePlant as any) : pb.bands;

    const mode: IllumMode = illumMask ? modeAt(status.sol, effTod, illumMask) : "Sunlit";
    H = scaleHuman(H as Bands, hb.mode || "WORK", mode, status.energyKw);
    P = scalePlant(P as Bands, mode, status.energyKw);

    humanBands = H as Bands;
    plantBands = P as Bands;
    humanMode = hb.mode ?? humanMode;
    plantMode = pb.mode ?? plantMode;
    illumMode = mode;
  }

  // ---------- Enrich crew with sync %, color, zoneName ----------
  const crew = (status?.crew ?? []).map((c) => {
    const z = (status?.zones ?? []).find((z) => z.id === c.zoneId);
    const spd = z?.stream === "plant" ? plantBands : humanBands;
    const pct = computeCrewSync(spd as Bands, c.phase, c.driftMin);
    const color = syncColor(pct);
    return { ...c, zoneName: z?.name ?? c.zoneId, sync: pct, color };
  });

  // ---------- Observer thoughts aligned to tick ----------
  function pushThought(t: EdgeThought) {
    setTicker((prev) => {
      const next = [...prev, t];
      return next.slice(Math.max(0, next.length - 20));
    });
  }

  useEffect(() => {
    if (!status) return;
    if (tick % 5 !== 0) return; // every ~5s
    const tone: EdgeThought["tone"] =
      status.energyKw > 18 ? "trim" :
      status.energyKw < 8  ? "plant" : "info";

    const dliLag = (status.plantZones ?? []).some(z => (z.dliProgress ?? 0) < 0.35);
    const msg =
      status.energyKw > 18 ? "Energy pressure rising — trimming where safe." :
      (dliLag ? "Re-light window — planning DLI catch-up for canopy." :
      (illumMode === "Dark" ? "Dark band — holding human comfort and power reserve." :
      "All systems nominal — monitoring light-health balance."));

    pushThought({ id: `obs-${Date.now()}`, text: msg, ts: Date.now(), tone });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, status?.energyKw, status?.plantZones, illumMode]);

  // ---------- Fast demo: lift plant DLI progress so bars move with effTod ----------
  const plantZonesView = (status?.plantZones ?? []).map(z => {
    if (!fastDemo || !illumMask || !status) return z;
    const sim = dliProgressFromMask(illumMask, status.sol, effTod);
    return { ...z, dliProgress: Math.max(z.dliProgress ?? 0, sim) };
  });

  return {
    // raw status & derived state
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

    // time (unified)
    effTod,

    // AI / EDGE
    aiActive,
    edge,
    edgePulse,
    edgeActive: isEdgeActive(edge),

    // ticker stream
    ticker,
  };
}
