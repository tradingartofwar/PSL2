"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";

type TimelineBand = { start: number; end: number; color: string }; // overlays
type IllumSeg = { start: number; end: number; lit: boolean };
type DarkWin = { startTod: number; endTod: number }; // NEW: micro-dark (0..1 within the day)

type Props = {
  day: number;                 // 0..(totalDays-1)
  tod: number;                 // 0..1
  bands?: TimelineBand[];      // optional overlays
  illum?: IllumSeg[];          // illumination segments
  label?: string;              // marker text (default: CURRENT)
  totalDays?: number;          // default 30
  dayLabel?: string;           // default "Mission Day"
  showPercent?: boolean;       // default true
  // NEW (Build 6)
  darkWindowsToday?: DarkWin[];
};

export const Timeline30 = memo(function Timeline30({
  day,
  tod,
  bands = [],
  illum = [],
  label = "CURRENT",
  totalDays = 30,
  dayLabel = "Mission Day",
  showPercent = true,
  darkWindowsToday = [],
}: Props) {
  const dMax = Math.max(1, Math.floor(totalDays));
  const d = Math.max(0, Math.min(dMax - 1, Math.floor(day || 0)));
  const t = Math.max(0, Math.min(1, tod || 0));

  const progress = (d + t) / dMax;
  const progressPct = `${(progress * 100).toFixed(4)}%`;

  const ticks = useMemo(() => Array.from({ length: dMax }, (_, i) => i + 1), [dMax]);
  const gridStyle = { gridTemplateColumns: `repeat(${dMax}, minmax(0, 1fr))` } as const;

  // helper: map [start,end] (days) to CSS %
  const dayToPct = (startDay: number, endDay: number) => {
    const left = `${(Math.max(0, startDay) / dMax) * 100}%`;
    const width = `${((Math.min(dMax, endDay) - Math.max(0, startDay)) / dMax) * 100}%`;
    return { left, width };
  };

  return (
    <div className="rounded-2xl border border-[#1C2933] bg-[#0E141B] p-4" role="region" aria-label="Lunar synodic cycle">
      {/* Title row + info hover */}
      <div className="mb-2 flex items-center justify-between text-xs tracking-widest text-white/70">
        <div className="flex items-center gap-2">
          <span>LUNAR SYNODIC CYCLE</span>
          {/* Info hover (styled tooltip) */}
          <div className="relative group">
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#1C2933] text-white/70 cursor-default select-none"
              style={{ fontSize: 10, lineHeight: "1rem", background: "#0E141B" }}
              aria-describedby="synodic-info"
            >
              i
            </span>
            <div
              id="synodic-info"
              className="pointer-events-none absolute left-0 top-0 -translate-y-full mt-[-8px]
                         opacity-0 group-hover:opacity-100 transition-opacity duration-150
                         bg-[#0E141B] text-white text-[11px] rounded-lg border border-[#1C2933]
                         shadow-lg px-3 py-2 w-[320px] z-10"
              role="tooltip"
            >
              <div className="font-semibold mb-1">What you’re seeing</div>
              <ul className="list-disc pl-4 space-y-1 text-white/80">
                <li><span className="text-white/90">Green segments</span> = site is sunlit; <span className="text-white/90">gray segments</span> = site is dark.</li>
                <li>The thin <span className="text-[#43F3A1]">neon line</span> marks <span className="text-white/90">{label}</span> (current time).</li>
                <li>The <span className="text-[#43F3A1]">green fill</span> shows total progress through the 30-day cycle.</li>
                <li>Thin inner slivers highlight **today’s micro-dark windows**.</li>
              </ul>
              <div className="mt-2 text-white/60">
                Tip: enable <code>?fast_tod=1</code> to see mode flips faster.
              </div>
            </div>
          </div>
        </div>

        <span className="tabular-nums text-white/50">
          {dayLabel} {d + 1} / {dMax}
          {showPercent ? <> • {Math.round(progress * 100)}%</> : null}
        </span>
      </div>

      {/* Scale bar */}
      <div className="relative h-8 rounded bg-[#0A0F14] border border-[#1C2933] overflow-hidden">
        {/* Illumination band (behind progress) */}
        {illum.map((seg, i) => {
          const { left, width } = dayToPct(seg.start, seg.end);
          const color = seg.lit ? "#163B2C" : "#1B2229"; // greenish vs dark gray
          const startDay = Math.max(0, seg.start) + 1;
          const endDay = Math.min(dMax, seg.end);
          const tip = seg.lit
            ? `Sunlit window (Days ${startDay.toFixed(0)}–${endDay.toFixed(0)})`
            : `Dark window (Days ${startDay.toFixed(0)}–${endDay.toFixed(0)})`;
          return (
            <div
              key={`illum-${i}`}
              className="absolute inset-y-0"
              style={{ left, width, background: color, opacity: 0.55 }}
              title={tip}
              aria-label={tip}
            />
          );
        })}

        {/* subtle background gradient */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.10] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(67,243,161,0.16) 0%, rgba(57,215,246,0.12) 50%, rgba(255,120,58,0.10) 100%)",
          }}
        />

        {/* PROGRESS FILL (green) */}
        <motion.div
          aria-hidden
          className="absolute top-0 left-0 bottom-0 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, rgba(67,243,161,0.85) 0%, rgba(67,243,161,0.55) 100%)",
            boxShadow: "0 0 16px rgba(67,243,161,0.25) inset",
            width: progressPct,
          }}
          transition={{ type: "spring", stiffness: 180, damping: 28 }}
        />

        {/* optional overlays */}
        {bands.map((b, idx) => {
          const { left, width } = dayToPct(b.start, b.end);
          return (
            <div
              key={idx}
              className="absolute top-0 bottom-0"
              style={{ left, width, background: b.color, opacity: 0.25 }}
              aria-hidden
            />
          );
        })}

        {/* NEW: today's micro-dark slivers (thin inner bars) */}
        {darkWindowsToday?.map((w, i) => {
          const left = `${((d + Math.max(0, Math.min(1, w.startTod))) / dMax) * 100}%`;
          const widthPct = ((Math.max(0, Math.min(1, w.endTod)) - Math.max(0, Math.min(1, w.startTod))) / dMax) * 100;
          const width = `${Math.max(0.5, widthPct)}%`; // clamp to ≥0.5% so slivers are visible
          const tip = `Dark window • ~${Math.round((w.endTod - w.startTod) * 24 * 60)} min`;
          return (
            <div
              key={`md-${i}`}
              className="absolute top-[2px] bottom-[2px] rounded bg-white/45 dark:bg-zinc-200/45 mix-blend-overlay"
              style={{ left, width }}
              title={tip}
              aria-label={tip}
            />
          );
        })}

        {/* tick grid */}
        <div className="absolute inset-0" style={gridStyle} aria-hidden>
          <div className="grid h-full" style={gridStyle}>
            {ticks.map((_, i) => (
              <div key={i} className="relative" style={{ borderRight: i === dMax - 1 ? "none" : "1px solid #1C2933" }} />
            ))}
          </div>
        </div>

        {/* CURRENT marker */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-[#43F3A1] shadow-[0_0_10px_rgba(67,243,161,0.7)]"
          style={{ left: progressPct, transform: "translateX(-1px)" }}
          key={`marker-${d}`}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          aria-label={`${dayLabel} ${d + 1} at ${Math.round(progress * 100)}%`}
        />

        <div
          className="absolute -top-6 translate-x-[-50%] px-2 py-0.5 rounded-full text-[10px] tracking-wider pointer-events-none"
          style={{ left: progressPct, background: "rgba(67,243,161,0.12)", border: "1px solid #1C2933" }}
        >
          <span className="text-[#43F3A1]">{label}</span>
        </div>
      </div>

      {/* numbers */}
      <div className="mt-2 grid text-[10px] text-white/60" style={gridStyle} aria-hidden>
        {ticks.map((n) => (
          <div key={n} className="text-center tabular-nums">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
});

export default Timeline30;
