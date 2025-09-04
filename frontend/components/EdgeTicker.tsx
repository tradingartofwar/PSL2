// frontend/components/EdgeTicker.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type EdgeThought = {
  id: string;
  text: string;
  ts: number;                 // Date.now()
  tone?: "info" | "wake" | "sleep" | "trim" | "plant";
};

const toneClass: Record<NonNullable<EdgeThought["tone"]>, string> = {
  info:  "bg-white/10 border-white/20 text-white/80",
  wake:  "bg-emerald-500/15 border-emerald-400/30 text-emerald-100",
  sleep: "bg-sky-500/15 border-sky-400/30 text-sky-100",
  trim:  "bg-amber-500/15 border-amber-400/30 text-amber-100",
  plant: "bg-lime-500/15 border-lime-400/30 text-lime-100",
};

export default function EdgeTicker({
  items,
  intervalMs = 3000,
  maxLines = 1,
}: {
  items: EdgeThought[];
  intervalMs?: number;
  maxLines?: number;
}) {
  const [idx, setIdx] = useState(0);
  const visible = useMemo(() => items.slice(-10), [items]); // keep last 10 in memory

  useEffect(() => {
    if (visible.length === 0) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % visible.length), intervalMs);
    return () => clearInterval(t);
  }, [visible.length, intervalMs]);

  const current = visible.length ? visible[idx] : undefined;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] tracking-wider uppercase text-white/60">Edge Analytics</span>
        <span className="h-[6px] w-[6px] rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
      </div>

      <div className="relative min-h-[42px]">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className={[
                "inline-flex items-center gap-2",
                "rounded-md border px-2.5 py-1.5 text-xs",
                toneClass[current.tone ?? "info"],
                "backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
              ].join(" ")}
              style={{ maxWidth: "100%" }}
              title={new Date(current.ts).toLocaleTimeString()}
            >
              <span className="truncate">{current.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
