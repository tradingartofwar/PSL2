// frontend/components/CrewSidebar.tsx
"use client";

import { User } from "lucide-react";
import { useCockpit } from "@/lib/useCockpit";

type GaugeProps = {
  pct: number;
  hue: "cyan" | "yellow" | "orange";
  title: string;        // short header (e.g., "A • WORK")
  subtitle: string;     // zone name
  details: string;      // description text
};

function Ring({ pct, hue, title, subtitle, details }: GaugeProps) {
  const radius = 28;
  const c = 2 * Math.PI * radius;
  const pctClamped = Math.max(0, Math.min(100, pct));
  const dash = (pctClamped / 100) * c;

  const color =
    hue === "cyan" ? "var(--hud-cyan)" :
    hue === "yellow" ? "var(--hud-yellow)" :
                       "var(--hud-orange)";

  const glow =
    hue === "cyan"
      ? "0 0 18px rgba(57,215,246,0.45)"
      : hue === "yellow"
      ? "0 0 18px rgba(255,200,87,0.35)"
      : "0 0 18px rgba(255,122,58,0.35)";

  // end-cap position
  const angle = (-90 + (pctClamped / 100) * 360) * (Math.PI / 180);
  const endcap = {
    cx: 40 + radius * Math.cos(angle),
    cy: 40 + radius * Math.sin(angle),
  };

  // ticks at 0/25/50/75/100
  const ticks = [0, 25, 50, 75, 100].map((t) => {
    const a = (-90 + (t / 100) * 360) * (Math.PI / 180);
    const rOuter = radius + 2;
    const rInner = radius - 4;
    return {
      key: t,
      x1: 40 + rInner * Math.cos(a),
      y1: 40 + rInner * Math.sin(a),
      x2: 40 + rOuter * Math.cos(a),
      y2: 40 + rOuter * Math.sin(a),
    };
  });

  return (
    <div className="relative group w-20 h-20">
      <svg viewBox="0 0 80 80" className="pslglow block">
        {/* track */}
        <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" opacity=".35" />

        {/* ticks */}
        {ticks.map(({ key, x1, y1, x2, y2 }) => (
          <line
            key={key}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="var(--line)"
            strokeWidth={key % 50 === 0 ? 2 : 1}
            opacity={key % 50 === 0 ? 0.5 : 0.25}
          />
        ))}

        {/* progress arc */}
        <circle
          cx="40" cy="40" r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ filter: `drop-shadow(${glow})` }}
        />

        {/* end-cap "comet" */}
        <circle cx={endcap.cx} cy={endcap.cy} r="3.5" fill={color} style={{ filter: `drop-shadow(${glow})` }} />
      </svg>

      {/* centered silhouette */}
      <User
        className="absolute inset-0 m-auto opacity-80"
        style={{ width: 26, height: 26, color: "rgba(255,255,255,0.9)" }}
        aria-hidden
      />

      {/* hover tooltip (styled) */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full
                   opacity-0 group-hover:opacity-100 transition-opacity duration-150
                   bg-[#0E141B] text-white text-[11px] rounded-lg border border-[#1C2933]
                   shadow-lg px-3 py-2 w-56 z-10"
        role="tooltip"
      >
        <div className="font-semibold mb-0.5">{title}</div>
        <div className="text-white/70 mb-1">{subtitle}</div>
        <div className="text-white/80">{details}</div>
        <div className="mt-1 text-white/60">Sync: {pctClamped}% • Ring = alignment • Dot = current</div>
      </div>
    </div>
  );
}

export function CrewSidebar() {
  const { crew } = useCockpit(); // { name, phase, zoneName, sync, color }

  return (
    <div className="pslcard p-4">
      <div className="text-sm opacity-80 mb-3 tracking-widest">CREW STATUS</div>

      <div className="grid grid-cols-2 gap-4 items-center">
        {crew.slice(0, 2).map((c) => (
          <div key={c.id} className="flex flex-col items-center gap-1">
            <Ring
              pct={c.sync}
              hue={c.color}
              title={`${c.name} • ${c.phase}`}
              subtitle={c.zoneName}
              details="Ring fill shows circadian sync vs. ideal lighting. Color tier: cyan (good), yellow (fair), orange (low)."
            />
            <div className="text-[11px] text-white/70 text-center leading-tight">
              {c.name} • {c.phase}
              <br />
              <span className="opacity-70">{c.zoneName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CrewSidebar;
