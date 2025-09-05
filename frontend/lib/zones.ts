// frontend/lib/zones.ts
type Zone = { id: string; name: string; stream: "human" | "plant" };

export function partitionZones(zones: Zone[]) {
  const human = zones.filter(z => z.stream === "human");
  const plant = zones.filter(z => z.stream === "plant");
  return { human, plant };
}

export function visibleHumanZones(
  allHuman: Zone[],
  humanTargetZoneId?: { A: string | null; B: string | null },
  showAll: boolean = false
) {
  if (showAll) return allHuman;
  const ids = Array.from(new Set([humanTargetZoneId?.A, humanTargetZoneId?.B].filter(Boolean) as string[]));
  return ids.length === 0 ? allHuman : allHuman.filter(z => ids.includes(z.id));
}

export function visiblePlantZones(
  allPlant: Zone[],
  plantTargetZoneId?: string | null,
  showAll: boolean = false
) {
  if (showAll || !plantTargetZoneId) return allPlant;
  return allPlant.filter(z => z.id === plantTargetZoneId);
}
