"use client";
import { motion } from "framer-motion";

type Props = {
  active?: boolean;
  label?: string;      // main label (default: EDGE Analytics)
  sublabel?: string;   // small line under main label
  className?: string;
};

export default function AIStrategistChip({
  active = true,
  label = "EDGE Analytics",
  sublabel = "Adaptive Light Strategist",
  className = "",
}: Props) {
  return (
    <div
      className={`relative inline-flex items-center gap-3 px-3 py-2 rounded-full border border-[#1C2933] bg-[#0E141B] ${className}`}
      aria-live="polite"
    >
      {/* LED + pulsing glow (same behavior as your original) */}
      <div className="relative">
        <motion.span
          className="absolute inset-0 rounded-full"
          animate={active ? { scale: [1, 1.25, 1], opacity: [0.6, 0.05, 0.6] } : { opacity: 0 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 18px 2px rgba(57,215,246,0.6)" }}
        />
        <span
          className={`relative inline-block w-3 h-3 rounded-full ${
            active ? "bg-cyan-400 shadow-[0_0_10px_rgba(57,215,246,0.9)]" : "bg-[#394957]"
          }`}
          aria-label={active ? `${label} active` : `${label} idle`}
          title={label}
        />
      </div>

      {/* Text block: main label + small sublabel */}
      <div className="leading-tight">
        <div className="text-xs uppercase tracking-wider text-white/85">{label}</div>
        <div className="text-[10px] tracking-wider text-white/55">{sublabel}</div>
      </div>
    </div>
  );
}
