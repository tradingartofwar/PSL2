"use client";
import { memo, useMemo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type EdgeBadge = {
  active: boolean;
  pulse: boolean;
  rule?: string;
  rationale?: string;
};

type Props = {
  bands: number[];
  mode?: string;
  title?: string;
  height?: number;
  className?: string;
  /** ✅ optional EDGE status to display the pill + micro-pulse */
  edge?: EdgeBadge;
};

const W = 720;
const SAMPLES = 140;
const SPEED_CYCLES_PER_SEC = 0.35; // adjust 0.25–0.6 for slower/faster vertical motion

const STOPS: [string, string][] = [
  ["#2F80ED", "0%"],
  ["#39D7F6", "20%"],
  ["#43F3A1", "40%"],
  ["#FFC857", "60%"],
  ["#FF7A3A", "80%"],
  ["#FF4B4B", "100%"],
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function envAt(bands: number[], x: number) {
  const n = Math.max(1, bands.length);
  const f = x * (n - 1);
  const i = Math.floor(f);
  const j = Math.min(n - 1, i + 1);
  return lerp(bands[i], bands[j], f - i);
}

function buildY(h: number, t: number, phase: number, env: number) {
  const yNorm =
    Math.sin(t * 2 * Math.PI + phase) * 0.55 +
    Math.sin(t * 6 * Math.PI + phase * 1.6) * 0.25 +
    Math.sin(t * 10 * Math.PI + phase * 2.3) * 0.12;
  const amp = 0.92;
  return h * 0.55 - (yNorm * env * amp * (h * 0.45));
}

function makeStrokePath(h: number, bands: number[], phase: number) {
  const pts: string[] = [];
  for (let k = 0; k <= SAMPLES; k++) {
    const t = k / SAMPLES;
    const env = envAt(bands, t);
    const y = buildY(h, t, phase, env);
    const x = t * W;
    pts.push(`${k === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
}

function makeAreaPath(h: number, bands: number[], phase: number) {
  const top = makeStrokePath(h, bands, phase);
  const lastX = W.toFixed(2);
  const baseY = (h * 0.65).toFixed(2);
  return `${top} L${lastX},${baseY} L0,${baseY} Z`;
}

function SpectralWave({
  bands,
  mode = "WAKE SYNC",
  title = "SPECTRUM OVERVIEW",
  height = 160,
  className = "",
  edge,
}: Props) {
  const h = height;

  // RAF-driven phase
  const [phase, setPhase] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    let lastTs = performance.now();
    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      setPhase((p) => (p + dt * SPEED_CYCLES_PER_SEC * 2 * Math.PI) % (Math.PI * 2));
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  // Recompute paths when bands/phase change
  const areaPath = useMemo(() => makeAreaPath(h, bands, phase), [h, bands, phase]);
  const strokePath = useMemo(() => makeStrokePath(h, bands, phase), [h, bands, phase]);

  // Edge-derived classes (subtle but visible)
  const edgeWrapperClass = edge?.pulse ? "animate-[edgepulse_1200ms_ease-out_1]" : "";

  // Optional: color accent per rule (kept simple)
  const ruleColor =
    edge?.rule === "wake_boost" ? "emerald" :
    edge?.rule === "energy_trim" ? "amber" :
    edge?.rule === "night_protect" ? "sky" :
    "emerald";

  const pillClassByRule =
    ruleColor === "amber"
      ? "bg-amber-500/20 border-amber-300/40 text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.55)]"
      : ruleColor === "sky"
      ? "bg-sky-500/20 border-sky-300/40 text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.55)]"
      : "bg-emerald-500/20 border-emerald-300/40 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.55)]";

  return (
    <div
      className={[
        "relative rounded-2xl border border-[#1C2933] bg-[#0E141B] overflow-hidden",
        edgeWrapperClass,
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-1 text-[10px] tracking-[0.2em] text-white/70">
        {title}
      </div>

      {/* EDGE badge (top-right) */}
      {edge?.active && (
        <div
          title={edge?.rationale || "EDGE decision active"}
          className={[
            "absolute right-3 top-3 z-[999] select-none",
            "rounded-md px-2 py-1 text-[10px] font-medium tracking-wide",
            "backdrop-blur-sm border",
            pillClassByRule,
            edge?.pulse ? "animate-[edgepulse_1200ms_ease-out_1]" : ""
          ].join(" ")}
        >
          EDGE ACTIVE{edge?.rule ? ` — ${edge.rule}` : ""}
        </div>
      )}

      {/* faint grid */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-2 top-6 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, #FFFFFF10 1px, transparent 1px), linear-gradient(to right, #FFFFFF10 1px, transparent 1px)",
          backgroundSize: "24px 24px, 24px 24px",
          maskImage: "linear-gradient(to bottom, transparent, black 16%, black 90%, transparent)",
        }}
      />

      <svg viewBox={`0 0 ${W} ${h}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="specFill" x1="0%" y1="0%" x2="100%" y2="0%">
            {STOPS.map(([c, o], i) => (<stop key={i} offset={o} stopColor={c} />))}
          </linearGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" /><feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0.25" />
            <stop offset="50%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0.25" />
          </linearGradient>
          <mask id="shimmerMask">
            <motion.rect
              x="-30%" y="0" width="60%" height={h}
              fill="url(#shimmer)"
              animate={{ x: ["-30%", "130%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
          </mask>
        </defs>

        {/* filled area */}
        <path
          d={areaPath}
          fill="url(#specFill)"
          opacity={0.85}
          style={{ filter: "url(#softGlow)" }}
          mask="url(#shimmerMask)"
        />

        {/* bright stroke */}
        <path
          d={strokePath}
          fill="none"
          stroke="url(#specFill)"
          strokeWidth={3.5}
          style={{ filter: "url(#softGlow)" }}
        >
          <animate attributeName="stroke-width" values="3;4;3" dur="6s" repeatCount="indefinite" />
        </path>
      </svg>

      {/* footer */}
      <div className="px-4 pb-4 pt-1 text-white/70">
        <div className="text-[10px] uppercase tracking-wider">Active Mode</div>
        <div className="mt-1 text-2xl font-semibold tracking-[0.15em] text-white">
          {mode}
        </div>
      </div>
    </div>
  );
}

export default memo(SpectralWave);
