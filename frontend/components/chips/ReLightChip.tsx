// frontend/components/chips/ReLightChip.tsx
"use client";

export default function ReLightChip({ active, pct }: { active: boolean; pct: number }) {
  if (!active || !pct || pct <= 0) return null;
  return (
    <div
      className="mx-2 mt-1 inline-flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300"
      title="Re-Light window — planned DLI catch-up across canopy"
      role="status"
      aria-live="polite"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
      Re-Light catch-up {Math.round(pct)}%
    </div>
  );
}
