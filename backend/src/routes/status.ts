// backend/src/routes/status.ts
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

// ---------- helpers ----------
function loadJson<T>(p: string, fallback: T): T {
  try { if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8")) as T; } catch {}
  return fallback;
}

type Zone = { id: string; name: string; deck: number; stream: "human" | "plant"; [k: string]: any };
type Crew = { id: string; name: string; zoneId: string; phase: string; driftMin: number };

const CFG_DIR     = resolve(process.cwd(), "..", "config");   // <repo>/config
const ZONES_DIR   = join(CFG_DIR, "zones");                   // <repo>/config/zones/*.json
const ROSTER_PATH = join(CFG_DIR, "roster.json");             // <repo>/config/roster.json

function loadZonesFromFolder(dir: string): Zone[] {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter(f => f.toLowerCase().endsWith(".json"));
  const out: Zone[] = [];
  for (const f of files) {
    const p = join(dir, f);
    const data = loadJson<any>(p, []);
    if (Array.isArray(data)) out.push(...data);
    else if (data && typeof data === "object") {
      if (Array.isArray((data as any).zones)) out.push(...(data as any).zones);
      else if ((data as any).id && (data as any).name) out.push(data as Zone);
    }
  }
  return out;
}

// ---------- simple energy model (tunable) ----------
type IllumMode = "Sunlit" | "PreDark" | "Dark" | "ReLight";

function ppfdForMode(mode: IllumMode) {
  if (mode === "PreDark") return 300;
  if (mode === "Dark")    return 100;
  if (mode === "ReLight") return 280;
  return 250; // Sunlit
}

function greenhouseCanopyKW(area_m2: number, ppfd: number, efficacy_umol_per_J: number) {
  const watts = (ppfd * area_m2) / efficacy_umol_per_J;
  return watts / 1000; // kW
}

function humanZonesKW(numZones: number, fixturesPerZone: number, fixtureW: number, intensity: number) {
  const perZoneW = fixturesPerZone * fixtureW * intensity;
  return (numZones * perZoneW) / 1000;
}

function overlayKW(canopyKW: number, frac: number) {
  return canopyKW * Math.min(0.10, Math.max(0, frac)); // ≤10%
}

function applyMargin(kW: number, frac = 0.12) {
  return kW * (1 + frac);
}

export default async function statusRoutes(fastify: any) {
  fastify.get("/status", async () => {
    const now = new Date();

    // Real tod for timeline/clock (0..1 across 24h)
    const todReal = ((now.getUTCHours() * 60 + now.getUTCMinutes()) / (24 * 60));

    // Demo clock for fast energy/mode cycling (0..1 each minute)
    const sec = now.getSeconds() + now.getMilliseconds() / 1000;
    const todDemo = sec / 60;

    // load config-driven topology
    const zones  = loadZonesFromFolder(ZONES_DIR);
    const roster = loadJson<{ crew: Crew[] }>(ROSTER_PATH, { crew: [] });

    // ----- ENERGY INPUTS (edit here to tune) -----
    const HUMAN_ZONES = zones.filter(z => z.stream === "human").length || 12;
    const FIXTURES_PER_ZONE = 3;
    const HUMAN_FIXTURE_W = 45;          // W per fixture
    const GH_AREA_M2 = 10;               // greenhouse canopy area
    const GH_EFFICACY = 2.6;             // µmol/J
    const ALGAE_KW = 0.25;               // steady lighting for algae
    const OVERLAY_FRAC = 0.0;            // 0..0.10 (hook to /lights/plan overlays later)

    // Illumination mode from demo day (fast animation)
    const illumMode: IllumMode =
      (todDemo < 0.05 || todDemo >= 0.95) ? "ReLight" :
      (todDemo < 0.75)                    ? "Sunlit" :
      (todDemo < 0.83)                    ? "PreDark" :
      (todDemo < 0.95)                    ? "Dark"    : "ReLight";

    // Human intensity (cosine across the day): 0.30..0.60
    const phase = 2 * Math.PI * todDemo;
    const humanIntensity = Math.max(0.30, Math.min(0.60, 0.45 + 0.15 * Math.cos(phase - Math.PI / 3)));

    // Greenhouse canopy by mode
    const ppfd =
      illumMode === "PreDark" ? 300 :
      illumMode === "Dark"    ? 100 :
      illumMode === "ReLight" ? 280 : 250;

    const greenhouseKW = greenhouseCanopyKW(GH_AREA_M2, ppfd, GH_EFFICACY);
    const humanKW      = humanZonesKW(HUMAN_ZONES, FIXTURES_PER_ZONE, HUMAN_FIXTURE_W, humanIntensity);
    const overlaysKW   = overlayKW(greenhouseKW, OVERLAY_FRAC);

    // Subtotal + margin
    const subtotalKW = humanKW + greenhouseKW + ALGAE_KW + overlaysKW;
    const totalKW    = applyMargin(subtotalKW, 0.12);

    // ---- plantZones synthesis (three zones: MicroGreens, Sprouts, Algae) ----
    const MG_AREA_M2 = 6;  // MicroGreens
    const SP_AREA_M2 = 4;  // Sprouts

    const MG_DLI_TARGET = 10;
    const SP_DLI_TARGET = 8;
    const AL_DLI_TARGET = 5;

    const mg_ppfdSet = ppfd;
    const sp_ppfdSet = Math.max(180, Math.min(260, ppfd - 20));
    const al_ppfdSet = 150;

    const mg_kW = greenhouseCanopyKW(MG_AREA_M2, mg_ppfdSet, GH_EFFICACY);
    const sp_kW = greenhouseCanopyKW(SP_AREA_M2, sp_ppfdSet, GH_EFFICACY);

    const secondsPerDay = 86400;
    // Use real day fraction (todReal) so DLI fills over the actual day, not each minute
    const mg_dli_so_far = (mg_ppfdSet * todReal * secondsPerDay) / 1e6;
    const sp_dli_so_far = (sp_ppfdSet * todReal * secondsPerDay) / 1e6;
    const al_dli_so_far = (al_ppfdSet * todReal * secondsPerDay) / 1e6;

    const plantZones = [
      {
        id: "microgreens",
        name: "MicroGreens",
        ppfdSet: mg_ppfdSet,
        ppfdNow: mg_ppfdSet,
        dliTarget: MG_DLI_TARGET,
        dliProgress: Number(Math.max(0, Math.min(1, mg_dli_so_far / MG_DLI_TARGET)).toFixed(2)),
        energyKW: Number(mg_kW.toFixed(2)),
        overlay: { on: OVERLAY_FRAC > 0, untilUtc: null }
      },
      {
        id: "sprouts",
        name: "Sprouts",
        ppfdSet: sp_ppfdSet,
        ppfdNow: sp_ppfdSet,
        dliTarget: SP_DLI_TARGET,
        dliProgress: Number(Math.max(0, Math.min(1, sp_dli_so_far / SP_DLI_TARGET)).toFixed(2)),
        energyKW: Number(sp_kW.toFixed(2)),
        overlay: { on: OVERLAY_FRAC > 0, untilUtc: null }
      },
      {
        id: "algae",
        name: "Algae Bioreactor",
        ppfdSet: al_ppfdSet,
        ppfdNow: al_ppfdSet,
        dliTarget: AL_DLI_TARGET,
        dliProgress: Number(Math.max(0, Math.min(1, al_dli_so_far / AL_DLI_TARGET)).toFixed(2)),
        energyKW: Number(ALGAE_KW.toFixed(2)),
        overlay: { on: false, untilUtc: null }
      }
    ];

    return {
      time:  { utc: now.toISOString(), local: now.toLocaleTimeString("en-US", { hour12: false }), sol: 12, tod: todReal },
      lunar: { pct: 72, daysRemaining: 19 },
      energy: {
        kw: Number(totalKW.toFixed(2)),
        breakdown: {
          humanKW: Number(humanKW.toFixed(2)),
          greenhouseKW: Number(greenhouseKW.toFixed(2)),
          algaeKW: Number(ALGAE_KW.toFixed(2)),
          overlaysKW: Number(overlaysKW.toFixed(2)),
          marginKW: Number((totalKW - subtotalKW).toFixed(2))
        },
        mode: illumMode,
        humanIntensity: Number(humanIntensity.toFixed(2))
      },
      zones,
      crew: (roster.crew ?? []).slice(0, 2),
      plantZones
    };
  });
}
