// frontend/components/PlantSidebar.tsx
"use client";

import { useCockpit } from "@/lib/useCockpit";

function Bar({
  label,
  pct,
  grad,
  tooltip,
}: {
  label: string;
  pct: number; // 0..100
  grad: string;
  tooltip?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] opacity-80">
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="relative group">
        <div className="h-[6px] rounded-full bg-[#0b1218] border border-[var(--line)] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: grad, transition: "width 220ms ease-out" }}
          />
        </div>
        {tooltip && (
          <div
            className="pointer-events-none absolute left-0 -top-2 -translate-y-full opacity-0 group-hover:opacity-100
                       bg-[#0E141B] text-white text-[11px] rounded-lg border border-[#1C2933]
                       shadow-lg px-3 py-2 w-[300px] z-10"
            role="tooltip"
          >
            {tooltip}
          </div>
        )}
      </div>
    </div>
  );
}

export function PlantSidebar() {
  const { plantZones } = useCockpit();

  if (!plantZones || plantZones.length === 0) {
    return (
      <div className="pslcard p-4">
        <div className="text-sm opacity-80 mb-3">Plant Zones</div>
        <div className="text-[11px] text-white/60">
          No plant zones from <code>/status</code>. Add a greenhouse canopy to <code>config/zones</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="pslcard p-4">
      <div className="text-sm opacity-80 mb-3 tracking-widest">PLANT ZONES</div>
      <div className="space-y-3">
        {plantZones.map((z) => {
          const pct = Math.round(Math.max(0, Math.min(1, z.dliProgress)) * 100);
          const meetsPPFD = z.ppfdNow >= z.ppfdSet * 0.98;
          const ppfdColor = meetsPPFD ? "#43F3A1" : "#FFC857";
          const grad = "linear-gradient(90deg,#35E1F2,#43F3A1)";

          return (
            <Bar
              key={z.id}
              label={z.name}
              pct={pct}
              grad={grad}
              tooltip={
                <div>
                  <div className="font-semibold mb-1">{z.name}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <span className="text-white/70">DLI progress</span>
                    <span className="text-right tabular-nums">{pct}%</span>

                    <span className="text-white/70">Target DLI</span>
                    <span className="text-right tabular-nums">{z.dliTarget.toFixed(0)} mol·m⁻²·d⁻¹</span>

                    <span className="text-white/70">PPFD set</span>
                    <span className="text-right tabular-nums">{z.ppfdSet} µmol·m⁻²·s⁻¹</span>

                    <span className="text-white/70">PPFD now</span>
                    <span className="text-right tabular-nums" style={{ color: ppfdColor }}>
                      {z.ppfdNow} µmol·m⁻²·s⁻¹
                    </span>

                    <span className="text-white/70">Energy</span>
                    <span className="text-right tabular-nums">{z.energyKW.toFixed(2)} kW</span>
                  </div>

                  {z.overlay?.on && (
                    <div className="mt-2 text-[11px] text-white/80">
                      Overlay: aisle/task lights active (≤10% canopy power)
                    </div>
                  )}
                </div>
              }
            />
          );
        })}
      </div>
    </div>
  );
}

export default PlantSidebar;
