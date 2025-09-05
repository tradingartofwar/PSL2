// frontend/components/cockpit/PresenceDrawer.tsx
"use client";

import { useState } from "react";

type Zone = { id: string; name: string; stream: "human" | "plant"; deck?: number };
type Crew = { id: string; name: string; zoneId: string };

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function PresenceDrawer({
  crew = [],
  zones = [],
}: {
  crew: Crew[];
  zones: Zone[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const humanZones = zones.filter(z => z.stream === "human");

  async function move(crewId: string, zoneId: string) {
    try {
      setBusy(crewId);
      await fetch(`${API}/presence/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewId, zoneId }),
      });
    } catch (e) {
      console.warn("presence/move failed", e);
    } finally {
      setBusy(null);
    }
  }

  if (!crew.length || !humanZones.length) return null;

  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3">
      {/* Header + hover help */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold tracking-wide text-white/80">
          Presence
        </div>

        {/* Info tooltip on hover/focus */}
        <div className="relative group inline-flex items-center">
          <button
            type="button"
            className="h-5 w-5 rounded-full border border-white/20 text-[11px] leading-5 text-white/70 hover:text-white/90"
            aria-describedby="presence-help"
            title="What is this?"
          >
            i
          </button>
          {/* Tooltip bubble */}
          <div
            role="tooltip"
            id="presence-help"
            className="pointer-events-none absolute right-0 top-6 z-50 w-64 rounded-md border border-white/10 bg-[#0B1117]/95 p-3 text-[11px] leading-5 text-white/80 opacity-0 shadow-[0_0_24px_rgba(0,0,0,0.35)]
                       transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <div className="mb-1 font-semibold text-white/90">Presence</div>
            <ul className="list-disc pl-4 space-y-1">
              <li>Select a zone to move each crew member.</li>
              <li>Changes reflect in ~2s (rings + ThoughtLine).</li>
              <li>Human-stream zones adjust <em>human</em> lighting.</li>
              <li>Plant areas use a low-power walkway overlay (no plant SPD change).</li>
              <li className="opacity-80"><strong>Note:</strong> In a real habitat, sensors track crew location automatically. This dropdown is for demo control.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Control list */}
      <div className="space-y-2">
        {crew.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <div className="min-w-24 text-[12px] text-white/80">{c.name}</div>
            <select
              className="flex-1 rounded bg-black/30 px-2 py-1 text-[12px] outline-none ring-1 ring-white/10"
              value={c.zoneId}
              onChange={(e) => move(c.id, e.target.value)}
              disabled={busy === c.id}
              title="Move crew to zone"
            >
              {humanZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            {busy === c.id && <span className="text-[11px] text-cyan-300">moving…</span>}
          </div>
        ))}
      </div>

      <div className="mt-2 text-[11px] text-white/50">
        Tip: use this to demo per-zone Edge Decisions.
      </div>
    </div>
  );
}
