"use client";
import { useCockpit } from "@/lib/useCockpit";

export function HeaderHUD() {
  const { status } = useCockpit();

  const lunarPct = Math.round(status?.lunar?.pct ?? 0);
  const lunarDays = status?.lunar?.daysRemaining ?? 0;

  // Backend returns a time string; show HH:MM
  const raw = status?.local || status?.utc || "";
  const clock = raw ? String(raw).slice(0, 5) : "--:--";

  return (
    <header className="pslcard h-20 px-6 grid grid-cols-12 items-center">
      {/* left: base title */}
      <div className="col-span-4 font-semibold tracking-wide uppercase text-sm">
        SHACKLETON CRATER SOUTH BASE
      </div>

      {/* center: lunar day (live) */}
      <div className="col-span-4 justify-self-center text-xs md:text-sm opacity-80">
        LUNAR DAY <span className="font-semibold">{lunarPct}%</span> —{" "}
        <span className="font-semibold">{lunarDays}</span> Earth Days Remaining
      </div>

      {/* right: time (live) */}
      <div className="col-span-4 justify-self-end text-4xl md:text-5xl tabularnums">
        {clock}
      </div>
    </header>
  );
}

export default HeaderHUD;
