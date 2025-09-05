"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type ThoughtItem = {
  id: string;
  text: string;
  tone?: "info" | "wake" | "sleep" | "trim" | "plant"; // aligns with EdgeThought
};

export default function ThoughtLine({
  items,
  periodMs = 3000,
  maxItems = 5,
}: {
  items: ThoughtItem[];
  periodMs?: number;
  maxItems?: number;
}) {
  // limit to last N items; fallback nominal message
  const history = useMemo<ThoughtItem[]>(() => {
    const src = items?.length ? items.slice(-maxItems) : [{ id: "nominal", text: "All systems nominal — monitoring light-health balance.", tone: "info" }];
    // ensure unique keys across cycles
    return src.map((it, i) => ({ ...it, id: `${it.id}-${i}` }));
  }, [items, maxItems]);

  // rotate index
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx((v) => (v >= history.length ? 0 : v)); // clamp if list shrank
  }, [history.length]);
  useEffect(() => {
    const id = setInterval(() => setIdx((v) => (v + 1) % history.length), periodMs);
    return () => clearInterval(id);
  }, [periodMs, history.length]);

  const current = history[idx];

  // color / glow by tone
  const toneClass =
    current?.tone === "wake"
      ? "text-cyan-300"
      : current?.tone === "sleep"
      ? "text-amber-300 thought-glow-amber"
      : current?.tone === "trim"
      ? "text-yellow-300"
      : current?.tone === "plant"
      ? "text-green-400 thought-glow-green"
      : "text-zinc-200";

  return (
    <div className="mt-2 text-sm leading-tight thought-pulse">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current?.id ?? "nominal"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28 }}
          className={`flex items-center gap-2 ${toneClass}`}
        >
          <span className="inline-block align-middle h-1.5 w-1.5 rounded-full bg-current opacity-90" />
          <span className="align-middle">{current?.text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
