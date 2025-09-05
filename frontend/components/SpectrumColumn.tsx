// frontend/components/SpectrumColumn.tsx
"use client";

import SpectralWave from "@/components/SpectralWave";

const FALLBACK_BANDS = [0.2, 0.35, 0.45, 0.25, 0.15, 0.1, 0.2, 0.4, 0.55, 0.7, 0.9, 0.75];
const PLANT_FALLBACK = [0.55, 0.75, 0.62, 0.42, 0.32, 0.42, 0.70, 0.85, 0.96, 1.0, 0.98, 0.80];

type Zone = { id: string; name: string; stream: "human" | "plant" };

export default function SpectrumColumn({
  type, zones, titlePrefix, mode, bands, edge, plantTargetZoneId,
}: {
  type: "human" | "plant";
  zones: Zone[];
  titlePrefix: string;
  mode: string;
  bands?: number[];
  edge?: any;
  plantTargetZoneId?: string;
}) {
  const hasSignal = (b?: number[]) => Array.isArray(b) && b.some((v) => (v ?? 0) > 1e-3);
  const baseBands = type === "plant" ? (hasSignal(bands) ? bands! : PLANT_FALLBACK) : (hasSignal(bands) ? bands! : FALLBACK_BANDS);

  if (zones.length === 0) {
    return (
      <SpectralWave
        title={`${titlePrefix}`}
        mode={mode}
        bands={baseBands}
        className="h-[160px]"
        edge={edge}
        zoneId={undefined}
        plantTargetZoneId={type === "plant" ? plantTargetZoneId : undefined}
      />
    );
  }

  return (
    <div className="space-y-3">
      {zones.map((z) => (
        <SpectralWave
          key={z.id}
          title={`${titlePrefix} • ${z.name}`}
          mode={mode}
          bands={baseBands}
          className="h-[140px]"
          edge={edge}
          zoneId={z.id}
          plantTargetZoneId={type === "plant" ? plantTargetZoneId : undefined}
        />
      ))}
    </div>
  );
}
