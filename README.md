# PSL2 Cockpit — Full Setup, Run, and Troubleshooting

A monorepo for the PSL2 cockpit: a mission-style UI that renders Circadian (humans) and Growth (plants) spectra, responds to **Edge Decisions** (AI plan deltas), and adapts to the Shackleton site illumination (synodic month) while tracking mission progress.

This README assumes a fresh clone.

---

## ⚡ TL;DR (Windows Quickstart)

```powershell
# From repo root (C:\psl2)

# 1) Generate 30-day schedule (Python)
python .\tools\generate_schedule.py --out .\data\mock\daily.json

# 2) Start backend (dev)
cd .\backend
npm install
npm run dev
# Verify: irm http://localhost:5000/status | ConvertTo-Json -Depth 6

# 3) Start frontend (dev)
cd ..\frontend
npm install
npm run dev
# Open http://localhost:3000 (or 3001 if 3000 is busy)
# Demo flags: http://localhost:3000/?fast_tod=1&ai=1

🔑 Prerequisites

Node.js 20+ (LTS) — recommended via nvm-windows

npm (built-in) or pnpm 10+ (optional)

Python 3.9+ (for schedule generator)

Git

Optional:

PowerShell 7+

Docker Desktop (for containerized runs later)

📂 Monorepo Layout
C:\psl2
├─ backend\                 # Fastify + TypeScript (API)
│  └─ src\routes\           # status, schedule, plan, illumination, presence
├─ frontend\                # Next.js + Tailwind + shadcn/ui + Framer Motion
│  ├─ app\                  # layout & pages (App Router)
│  ├─ appStyles\            # globals.css, tokens, utilities
│  ├─ components\           # SpectralWave, Timeline30, HUDs, cockpit/PresenceDrawer, etc.
│  └─ lib\                  # useCockpit, schedule, illumination helpers, sim/human
├─ config\                  # JSON configs
│  ├─ zones\*.json          # zone definitions (deck, stream, etc.)
│  └─ roster.json           # crew (2 members by default)
├─ data\
│  └─ mock\daily.json       # generated 30-day SPD schedule
├─ tools\
│  └─ generate_schedule.py  # Python generator
└─ README.md                # this file

⚙️ Configuration
Zones & Roster

config/zones/*.json — zone ids, names, deck, stream (human/plant), fixture counts, greenhouse overlay defaults.

config/roster.json — crew list with id, name, zoneId, phase (SLEEP/WAKE/WORK/WIND DOWN), driftMin.

Environment

No root .env required for dev. Defaults:

Frontend expects NEXT_PUBLIC_API_BASE=http://localhost:5000 (already coded).

🧪 Data Generation (Python)
cd C:\psl2
python .\tools\generate_schedule.py --out .\data\mock\daily.json
Produces data/mock/daily.json, consumed by /schedule/30d.

🔌 Backend (API)

Stack: Fastify + TypeScript

Key routes:

GET /status → clock, lunar, energy, zones[], crew[], presence overrides

GET /schedule/30d → 30-day SPD cycles (human + plant)

GET /illumination/30d → 30-day site illumination mask (hourly)

POST /lights/plan → Edge Decisions (wake_boost, night_protect, plant_bias, energy_trim, plant_catchup)

POST /presence/move → demo presence override (real habitat uses sensors)

GET /health → ok

Run:
cd backend
npm install
npm run dev

Verify endpoints with PowerShell:

irm http://localhost:5000/status | ConvertTo-Json -Depth 6
irm http://localhost:5000/schedule/30d | ConvertTo-Json -Depth 6
irm http://localhost:5000/illumination/30d | ConvertTo-Json -Depth 3

🖥️ Frontend (UI)

Stack: Next.js (App Router) + Tailwind + shadcn/ui + Framer Motion

Run:
cd frontend
npm install
npm run dev

Open http://localhost:3000
 (Next auto-switches to :3001 if busy).

Demo flags:

?fast_tod=1 — accelerates TOD morphing

?ai=1 — enables AI deltas via /lights/plan

🚀 Current Baseline (Build 7)

Human-aware dosing: planner guards wake_boost / night_protect using live mEDI targets.

Re-Light catch-up: chip shows % canopy recovery based on worst DLI gap.

Presence drawer: move crew between zones; updates rings + ThoughtLine in <2s. Tooltip clarifies: real deployments use sensors.

Edge Decisions copy unify: chip + panel now consistently say Edge Decisions.

Stable core from Build-6: micro-dark sync, Pre-Dark chip, Timeline slivers, ThoughtLine cues, unified timebase heartbeat.

🛰️ What You Should See (demo)

Header HUD: UTC/local, lunar % and days remaining.

Crew Sidebar: two sync rings, color coded by circadian alignment.

Plant Sidebar: 3 plant bars with DLI progress.

Spectral panels: Circadian & Growth waves with pills when rules apply.

Right column: Energy HUD dial, Edge Decisions chip, ThoughtLine, Re-Light/Pre-Dark chips.

Edge Decisions panel: status, rule, rationale, expires in. Full JSON on hover.

Timeline30: lunar cycle band with CURRENT marker + dark slivers.

Fixed badge: “EDGE ACTIVE — {ruleFamily}” bottom-right.

🔄 Common Tasks

Regenerate schedule:
python .\tools\generate_schedule.py --out .\data\mock\daily.json

Adjust crew:
Edit config/roster.json → restart backend.

Add a zone:
Edit config/zones/*.json → restart backend.

Demo presence:
Use Presence drawer dropdown. Tooltip notes sensors would replace this in reality.

🛠️ Troubleshooting (Windows)

Port 3000 busy → Next auto-switches to 3001.

pnpm workspace issues → use npm (npm install, npm run dev).

Backend missing deps → cd backend && npm install fastify @fastify/cors.

Type errors → use npm run dev with ts-node --transpile-only.

Waves static → add ?fast_tod=1.

No AI effect → add ?ai=1 and check /lights/plan in Network tab.

📜 License & Contributions

Default: MIT

PRs welcome — keep commits small and update CHANGELOG.md.

📡 Contact

The Edge Decisions chip pulses with activity; rationale comes from /lights/plan.
For issues, open a GitHub issue with console output + OS/Node versions.


---

Do you want me to also create a **CHANGELOG entry (v0.7.0)** alongside this so Polaris/Pulse can log Build-7 baseline right away?
