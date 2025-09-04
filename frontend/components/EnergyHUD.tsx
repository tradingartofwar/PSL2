// frontend/components/EnergyHUD.tsx
"use client";
import { motion } from "framer-motion";

type EnergyBreakdown = {
  humanKW: number;
  greenhouseKW: number;
  algaeKW: number;
  overlaysKW: number;
  marginKW: number;
};

type Props = {
  kw?: number;            // current power (e.g., 16.2). Defaults to 0.
  maxKw?: number;         // capacity for arc sweep (default 24)
  label?: string;         // "Energy HUD"
  unit?: string;          // "KW" (can be changed to W, kWh, etc.)
  className?: string;
  breakdown?: EnergyBreakdown; // ✅ NEW: hover tooltip data
  mode?: string;               // ✅ NEW: illumination mode label
  humanIntensity?: number;     // ✅ NEW: 0..1 hint
};

function clamp01(v: number) {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function EnergyHUD({
  kw = 0,
  maxKw = 24,
  label = "Energy HUD",
  unit = "KW",
  className = "",
  breakdown,
  mode,
  humanIntensity,
}: Props) {
  const safeMax = maxKw > 0 ? maxKw : 1;
  const pct = clamp01(kw / safeMax);

  const R = 80;
  const C = Math.PI * R;
  const dash = C * pct;

  const kwDisplay = Number.isFinite(kw) ? kw.toFixed(2) : "0.00";
  const pctDisplay = (pct * 100).toFixed(0);

  const total = breakdown
    ? breakdown.humanKW + breakdown.greenhouseKW + breakdown.algaeKW + breakdown.overlaysKW + breakdown.marginKW
    : kw;

  return (
    <div
      className={`relative rounded-2xl border border-[#1C2933] bg-[#0E141B] p-4 group ${className}`}
      role="group"
      aria-label={`${label}: ${kwDisplay} ${unit}, ${pctDisplay}% load`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-white/60">{label}</div>
        {mode && (
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-[#1C2933] bg-[#0E141B]">
            Illumination: {mode}
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-center">
        <svg viewBox="-100 -100 200 120" className="w-full max-w-[320px]" aria-hidden="true">
          <defs>
            <linearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#43F3A1" />
              <stop offset="50%" stopColor="#FFC857" />
              <stop offset="100%" stopColor="#FF4B4B" />
            </linearGradient>
          </defs>

          {/* base arc */}
          <path d="M -80 0 A 80 80 0 0 1 80 0" fill="none" stroke="#1C2933" strokeWidth="10" strokeLinecap="round" />

          {/* usage arc */}
          <motion.path
            d="M -80 0 A 80 80 0 0 1 80 0"
            fill="none"
            stroke="url(#loadGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C - dash}`}
            initial={false}
            animate={{ strokeDasharray: [`${dash} ${C - dash}`] }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.6 }}
            style={{ filter: "drop-shadow(0 0 8px rgba(67,243,161,0.65))" }}
          />

          {/* HUD frame line */}
          <path
            d="M -85 0 A 85 85 0 0 1 85 0"
            fill="none"
            stroke="#39D7F6"
            strokeOpacity="0.6"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* tick marks */}
          {Array.from({ length: 11 }).map((_, i) => {
            const t = i / 10; // 0..1
            const a = Math.PI * (1 - t);
            const x1 = Math.cos(a) * 70, y1 = Math.sin(a) * 70;
            const x2 = Math.cos(a) * 80, y2 = Math.sin(a) * 80;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#22313D" strokeWidth={2} />;
          })}
        </svg>

        {/* center readout */}
        <div className="absolute top-1/2 -translate-y-1/2 text-center">
          <div className="text-4xl font-semibold font-[Orbitron] tabular-nums text-cyan-300 drop-shadow-[0_0_12px_rgba(57,215,246,0.5)]">
            {kwDisplay}
            <span className="text-white/60 text-lg ml-1">{unit}</span>
          </div>
          <div className="mt-1 text-white/60 text-xs">
            Load {pctDisplay}%{typeof humanIntensity === "number" ? ` • Human ${Math.round(humanIntensity * 100)}%` : ""}
          </div>
        </div>

        {/* hover tooltip: breakdown */}
        {breakdown && (
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full
                       opacity-0 group-hover:opacity-100 transition-opacity duration-150
                       bg-[#0E141B] text-white text-[11px] rounded-lg border border-[#1C2933]
                       shadow-lg px-3 py-2 w-64 z-10"
            role="tooltip"
          >
            <div className="font-semibold mb-1">Power Breakdown</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <span className="text-white/70">Human zones</span>
              <span className="text-right tabular-nums">{breakdown.humanKW.toFixed(2)} kW</span>

              <span className="text-white/70">Greenhouse canopy</span>
              <span className="text-right tabular-nums">{breakdown.greenhouseKW.toFixed(2)} kW</span>

              <span className="text-white/70">Algae</span>
              <span className="text-right tabular-nums">{breakdown.algaeKW.toFixed(2)} kW</span>

              <span className="text-white/70">Overlays</span>
              <span className="text-right tabular-nums">{breakdown.overlaysKW.toFixed(2)} kW</span>

              <span className="text-white/70">Margin</span>
              <span className="text-right tabular-nums">{breakdown.marginKW.toFixed(2)} kW</span>
            </div>

            <div className="mt-2 border-t border-[#1C2933] pt-1 flex items-center justify-between">
              <span className="text-white/70">Total</span>
              <span className="text-right tabular-nums font-medium">{total.toFixed(2)} kW</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { EnergyHUD };
export default EnergyHUD;
