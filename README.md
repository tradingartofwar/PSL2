# PSL2 Cockpit — Full Setup, Run, and Troubleshooting

A monorepo for the **PSL2 cockpit**: a mission‑style UI that renders **Circadian** (humans) and **Growth** (plants) spectra, responds to **EDGE Analytics** (AI plan deltas), and adapts to the **Shackleton site illumination** (synodic month) while tracking mission progress.

This README is **exhaustive** and assumes a fresh clone.

---

## TL;DR (Windows Quickstart)

```powershell
# From repo root (C:\psl2)

# 1) Generate 30‑day schedule (Python)
python .\tools\generate_schedule.py --out .\data\mock\daily.json

# 2) Start backend (dev)
cd .\backend
pnpm dlx nodemon --watch src --ext ts --exec "pnpm dlx ts-node --transpile-only src/server.ts"
# Verify: irm http://localhost:5000/status | ConvertTo-Json -Depth 6

# 3) Start frontend (dev)
cd ..\frontend
pnpm dev   # or npm run dev
# Open http://localhost:3000 (or 3001 if 3000 is busy)
# Demo flags: http://localhost:3000/?fast_tod=1&ai=1
```

> If `pnpm` acts up, use `npm` (instructions below) and see **Troubleshooting**.

---

## Prerequisites

* **Node.js 20+** (LTS) — recommended via nvm-windows
* **pnpm 10+** *(preferred)* or **npm** *(fallback)*
* **Python 3.9+** (for the schedule generator)
* **Git**

Optional (nice to have):

* PowerShell 7+
* Docker Desktop (for containerized runs later)

---

## Monorepo Layout

```
C:\psl2
├─ backend\                 # Fastify + TypeScript (API)
│  └─ src\routes\           # status, schedule, plan, illumination
├─ frontend\                # Next.js + Tailwind + shadcn/ui + Framer Motion
│  ├─ app\                  # pages + layout
│  ├─ components\           # SpectralWave, Timeline30, HeaderHUD, CrewSidebar, etc.
│  └─ lib\                  # useCockpit, schedule, illumination helpers, sim/human
├─ config\                  # JSON configs
│  ├─ zones.json            # zones (3 decks + greenhouse)
│  └─ roster.json           # crew (2 members by default)
├─ data\
│  └─ mock\daily.json       # generated 30‑day SPD schedule (humans/plants)
├─ tools\
│  └─ generate_schedule.py  # Python generator for daily.json
└─ README.md                # this file
```

---

## Configuration

### Zones & Roster

* **`config/zones.json`** — zone ids, names, deck, stream (human/plant), fixture counts, greenhouse overlay defaults.
* **`config/roster.json`** — crew list with `id`, `name`, `zoneId`, `phase` (SLEEP/WAKE SYNC/WORK/WIND DOWN), `driftMin`.

> The backend `/status` route reads these files and returns them to the UI.

### Environment (optional)

Root `.env` is not required for dev. Defaults:

* **Frontend** expects `NEXT_PUBLIC_API_BASE` = `http://localhost:5000` (already defaulted in code).
* Demo switches via URL query:

  * `?fast_tod=1` — accelerate time‑of‑day morphing in the spectra (visible changes).
  * `?ai=1` — enable EDGE AI override calls (`/lights/plan`).

---

## Data Generation (Python)

We render with a 12‑band SPD array per stream (human/plant) over a **30‑day** window. Generate once:

```powershell
cd C:\psl2
python .\tools\generate_schedule.py --out .\data\mock\daily.json
```

This produces `data/mock/daily.json` consumed by `/schedule/30d`.

---

## Backend (API)

**Stack:** Fastify + TypeScript (no build needed for dev).

**Key routes:**

* `GET /status` — clock, lunar, energy, **zones\[]**, \*\*crew\[]\`
* `GET /schedule/30d` — 30-day SPD cycles (human + plant)
* `GET /illumination/30d` — 30-day site illumination mask (hourly)
* `POST /lights/plan` — EDGE AI deltas (human/plant) + greenhouse overlay
* `GET /health` — ok

**Dev run:**

```powershell
cd C:\psl2\backend
pnpm dlx nodemon --watch src --ext ts --exec "pnpm dlx ts-node --transpile-only src/server.ts"
```

**Verify:**

```powershell
irm http://localhost:5000/status | ConvertTo-Json -Depth 6
irm http://localhost:5000/schedule/30d | ConvertTo-Json -Depth 6
irm http://localhost:5000/illumination/30d | ConvertTo-Json -Depth 3
```

> If you prefer npm scripts, add to `backend/package.json`:
>
> ```json
> { "scripts": {
>   "dev": "nodemon --watch src --ext ts --exec \"ts-node src/server.ts\"",
>   "build": "tsc", "start": "node dist/src/server.js" } }
> ```

---

## Frontend (UI)

**Stack:** Next.js (App Router) + Tailwind + shadcn/ui + Framer Motion.

**Dev run:**

```powershell
cd C:\psl2\frontend
pnpm dev   # or npm run dev
# Next will use :3000 or auto switch to :3001 if busy
```

Open: `http://localhost:3000` (or `3001`).

**Demo flags:**

* `?fast_tod=1` — accelerates time‑of‑day morphing.
* `?ai=1` — enables AI deltas (`/lights/plan`).

---

## What You Should See

* **Header HUD:** live local time (ticks with `/status`), **LUNAR DAY** % and days remaining.
* **Crew Sidebar:** two circular gauges with **sync %** per member (color‑coded: cyan ≥67, yellow 34–66, orange ≤33). Sync computed from their zone’s **human SPD** vs their current phase target.
* **Center Spectra:**

  * **Circadian Spectrum** (top): human 12‑band wave, animated + shimmer.
  * **Growth Spectrum** (bottom): plant 12‑band wave, plant‑emphasized rendering.
  * With `?fast_tod=1`, both **morph** shape visibly; with `?ai=1`, you’ll see additional deltas.
* **Right Column:** Energy HUD + **EDGE Analytics** chip (pulsing when active). Optional **Greenhouse Visitor Overlay** card (2/5/10 min, low neutral‑white aisle/task light; plant SPD unchanged).
* **Mission Timeline:** green progress fill + neon **CURRENT** marker and **Mission Day X / 30**. Beneath the bar: **illumination band** (green lit / gray dark windows) from `/illumination/30d`.

---

## Illumination‑Aware Blend (How the Waves Are Computed)

At each tick (\~5 s):

1. Baselines from `/schedule/30d` → `H_base`, `P_base`
2. AI from `/lights/plan` → `H_ai = applyDelta(H_base)`, `P_ai = applyDelta(P_base)`
3. Illumination mode from `/illumination/30d` → `Sunlit | PreDark | Dark | ReLight`
4. Mode scalers → `H_final`, `P_final` (humans bias blue/warm & cap intensity; plants flex PPFD to track DLI)
5. Panels render `H_final` and `P_final` as animated waves

This is visible even without sensors; later you can add *measured* PPFD/lux to close the loop.

---

## Common Tasks

### Regenerate schedule

```powershell
python .\tools\generate_schedule.py --out .\data\mock\daily.json
```

### Adjust crew of two

Edit `config/roster.json` and restart the backend. The sidebar will follow.

### Add a zone

Edit `config/zones.json` (id/name/deck/stream), restart backend.

### Trigger greenhouse overlay (demo)

Open the optional Greenhouse card and start a 2/5/10 min overlay. This will not change the plant SPD panel; it only turns on low‑power neutral‑white aisle/task fixtures.

---

## Troubleshooting (Windows‑centric)

### Port 3000 in use → Next switches to 3001

That’s normal. Watch the console for the URL it prints.

### pnpm “manifest undefined” / workspace confusion

Symptoms: `Cannot destructure property 'manifest' ...` or Turbopack warning about multiple lockfiles.

**Fix (root):**

```powershell
# Ensure one root workspace
Set-Content C:\psl2\pnpm-workspace.yaml "packages:`n  - 'frontend'`n  - 'backend'"
# Remove extra lockfile in frontend (leave only root lockfile)
Remove-Item C:\psl2\frontend\pnpm-lock.yaml -Force -ErrorAction SilentlyContinue
# Optional: pnpm install at root
cd C:\psl2; pnpm install
```

Or just use **npm** in the frontend:

```powershell
cd C:\psl2\frontend
if (!(Test-Path package.json)) { npm init -y }
npm install --no-audit --no-fund --ignore-scripts next react react-dom framer-motion
npm run dev
```

### Backend: "Cannot find module 'fastify'"

Install runtime deps in **backend/**:

```powershell
cd C:\psl2\backend
if (!(Test-Path package.json)) { npm init -y }
npm install fastify @fastify/cors
```

Then re‑run the nodemon/ts‑node command.

### TypeScript complains about `require` or Node types

We use ESM imports. Use the `--transpile-only` ts‑node run above, or add `@types/node` and a `tsconfig.json`.

### Animated waves move but shape doesn’t morph

Add `?fast_tod=1` to speed up time‑of‑day. Ensure the backend is running and `/schedule/30d` returns 200.

### AI not affecting spectra

Add `?ai=1` to the URL. Watch Network for `/lights/plan`. You can make energy vary (already wired in `/status`) to see plant trims/boosts.

---

## Design Notes (what we’ve encoded)

* **EDGE Analytics**: small, explainable deltas (sleep protection, morning blue, energy trims); greenhouse overlay timers that don’t touch plant SPD.
* **Synodic Month**: 30‑day rolling mask drives mode (Sunlit/PreDark/Dark/ReLight) and biases intensity/blue or PPFD/DLI.
* **Crew of Two**: fewer conflicts; zone setpoints usually serve both; use task/wearable light for exceptions.
* **Greenhouse**: independent plant stream; brief visits use low‑power neutral‑white overlay (≤10% power cap) via timer.

---

## Roadmap (optional)

* Replace synthetic illumination with horizon‑derived mask (same API)
* Per‑zone EDGE deltas (currently global) when multi‑occupancy conflicts matter
* Zone telemetry badges (lux/melanopic; PPFD/DLI) and small error corrector
* Presence drawer (UI) → swap for sensors later (BLE/PIR)
* Docker compose for one‑command up

---

## License & Contributions

* Default: MIT 
* PRs welcome — keep commits small and update `CHANGELOG.md` with user‑visible changes.

---

## Contact

* **EDGE Analytics** chip in UI shows activity; planner rationale is returned from `/lights/plan` for explainability.
* For help, file an issue with the exact console output and OS/Node versions.
