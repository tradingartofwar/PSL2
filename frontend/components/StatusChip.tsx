"use client";
import { motion } from "framer-motion";

type Props = { active?: boolean; label?: string; className?: string; };
export default function AIStrategistChip({ active=true, label="AI Strategist", className="" }: Props){
  return (
    <div className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[#1C2933] bg-[#0E141B] ${className}`}>
      <div className="relative">
        <motion.span
          className="absolute inset-0 rounded-full"
          animate={active ? { scale: [1,1.2,1], opacity:[0.6,0.1,0.6] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 18px 2px rgba(57,215,246,0.6)" }}
        />
        <span className="relative inline-block w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(57,215,246,0.9)]"/>
      </div>
      <span className="text-xs uppercase tracking-wider text-white/80">{label}</span>
    </div>
  );
}
