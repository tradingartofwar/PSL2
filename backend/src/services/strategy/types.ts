export type RuleFamily =
  | "night_protect"   // lower blue while crew sleeping
  | "wake_boost"      // morning blue bump
  | "energy_trim"     // shave kW when budget tight
  | "plant_catchup"   // PPFD bump to hit DLI target
  | "overlay_guard";  // neutral-white overlay safety cap

export interface EdgeDecision {
  decisionId: string;
  createdAt: string;     // ISO
  expiresAt: string;     // ISO (e.g., +5 min)
  ruleFamily: RuleFamily;
  deltas: Record<string, number>; // e.g., {"band_460nm": -0.12}
  rationale: string;
  context: {
    sol: number; tod: number;
    illumMode: "Sunlit" | "Pre-dark" | "Dark" | "Re-light";
    zone?: string;
    energyKw?: number;
    dli?: Record<string, number>;  // per plant zone %
    crewSync?: Record<string, number>;
  };
  applied: boolean;
}
