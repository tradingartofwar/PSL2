// frontend/components/chips/PreDarkChip.tsx
"use client";

export default function PreDarkChip({ minutes }: { minutes: number }) {
  if (typeof minutes !== "number" || minutes > 45) return null;
  return (
    <div
      className="mx-2 mt-1 inline-flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-300"
      title="Minutes until the next micro-dark window at Shackleton"
      role="status"
      aria-live="polite"
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${minutes <= 15 ? "bg-amber-300 animate-pulse" : "bg-amber-300"}`} />
      Pre-Dark in {minutes}m
    </div>
  );
}
