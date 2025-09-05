// frontend/components/EdgeDecisionsPanel.tsx
"use client";

type EdgeLite = {
  decisionId?: string;
  ruleFamily?: string;
  rationale?: string;
  zoneId?: string | null;
};

export default function EdgeDecisionsPanel({
  edge,
  edgeActive,
  expiresInSec,
  showHeader = true,
  className = "",
}: {
  edge?: EdgeLite | null;
  edgeActive: boolean;
  expiresInSec: number;
  showHeader?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        "mt-2 rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5",
        className,
      ].join(" ").trim()}
      title={edge?.decisionId ? JSON.stringify(edge, null, 2) : "No edge decision yet"}
    >
      {showHeader && (
        <div className="mb-1 font-semibold tracking-wide text-white/80">EDGE DECISIONS</div>
      )}
      {edge?.decisionId ? (
        <div className="space-y-0.5 max-h-16 overflow-hidden">
          <div>
            status:{" "}
            <span className={edgeActive ? "text-emerald-300" : "text-zinc-400"}>
              {edgeActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <div>rule: <span className="text-white/90">{edge?.ruleFamily ?? "—"}</span></div>
          <div>zone: <span className="text-white/80">{edge?.zoneId ?? "—"}</span></div>
          <div>rationale: <span className="text-white/80">{edge?.rationale ?? "—"}</span></div>
          <div>expires in: <span className="text-white/90">{expiresInSec}s</span></div>
        </div>
      ) : (
        <div className="text-white/60 italic">waiting for EDGE decision…</div>
      )}
    </div>
  );
}
