PSL2 — Visual-First Sprint Plan (48 Hours)



Goal: Deliver a pixel-perfect cockpit dashboard that mirrors the reference image as the first-glance view, with framework stubs for data, AI, and state. Visuals first; functions scaffolded. This aligns with our previously scoped prototype directions and file framework and keeps room for modular complexity (slide-outs, codex cards, strategist panel).



Window: Sun 5:00 PM → Tue 5:00 PM (48h)

Mantra: Cockpit of Light — where spectrum meets survival.



Definition of Done (DoD)



The UI at http://localhost:3000 visually matches the reference at first glance (header, crew gauges, plant bars, spectrum panels, energy HUD, strategist chip, 30-day timeline).



Smooth cockpit animations (glow, pulsing, subtle gauge sweeps) in place; no jank.



Slide-out panels exist as stubs for future complexity.



Backend/API stubs return realistic mock data and are wired to UI (no 404s).



State memory scaffold exists (events JSONL).



README includes one-command dev instructions.



(These map to the capabilities and polish we evolved through v1.6–v1.9.2 in PSL1: animations, status chip, lunar HUD, strategist dials, spectral waveforms).



Team \& Roles (PSL2)



Prism (Riley) — Frontend: cockpit shell, SpectralWave, HUDs, Timeline, slide-out stubs.



Lumen (Mira) — Design/UX: tokens (color/typography/gradients), glow \& motion timings.



Forge (Kai) — Backend: Fastify stubs /status, /time/lunar, /history, /lights/plan (mock).



Aurora (Nova) — AI Logic: mock planner + /explain summary now; future swap to gpt-4o-mini.



Mirror (Jules) — QA: visual parity checklist + snapshots.



Polaris — Vision alignment check Mon 5 PM (“North Star Check”).



Pulse / Flare — Improvements \& urgency cadence.



High-Level UI (Visual First)



Header HUD: Base title, Lunar HUD (day/night %, days remaining), Time (tabular digits).



Left Stack: Crew Status (3 neon ring gauges), Plant Zones (3 thin bars).



Center Stack: Spectrum Overview (top \& bottom panels), mode label (e.g., “Active: WAKE SYNC”).



Right Stack: Energy HUD (semi-circular KW dial), AI Strategist chip.



Footer: 30-day timeline with “YOU ARE HERE” marker.



These match the “first-glance cockpit” you approved and our earlier UI directions (waveform sculpting, mission sequencer, strategist).



Repository Tree (Markdown, matches your current layout + adds essentials)

C:\\psl2

├─ frontend\\                         # Next.js 14 (App Router) + Tailwind + shadcn/ui + Framer Motion

│  ├─ app\\

│  │  ├─ layout.tsx

│  │  └─ page.tsx                    # Cockpit shell (default first-glance view)

│  ├─ components\\

│  │  ├─ SpectralWave.tsx

│  │  ├─ EnergyHUD.tsx

│  │  ├─ LunarHUD.tsx

│  │  ├─ StatusChip.tsx

│  │  ├─ CrewSidebar.tsx

│  │  ├─ PlantSidebar.tsx

│  │  ├─ Timeline30.tsx

│  │  └─ Slideouts\\

│  │     ├─ CrewDetail.tsx          # stub (future)

│  │     └─ PlantDetail.tsx         # stub (future)

│  ├─ lib\\

│  │  ├─ state\\useCockpit.ts         # zustand store (visual data + API wiring)

│  │  ├─ api\\client.ts               # fetch helpers (to backend stubs)

│  │  └─ utils\\format.ts

│  ├─ appStyles\\globals.css

│  └─ public\\                        # icons, fonts

│

├─ backend\\                          # Fastify + TypeScript (stubs now)

│  ├─ src\\

│  │  ├─ server.ts

│  │  ├─ routes\\

│  │  │  ├─ status.ts                # GET /status   → cockpit payload

│  │  │  ├─ lunar.ts                 # GET /time/lunar

│  │  │  ├─ history.ts               # GET/POST /history (JSONL)

│  │  │  ├─ plan.ts                  # POST /lights/plan (mock AI planner)

│  │  │  └─ explain.ts               # POST /explain (mock summary)

│  │  ├─ services\\

│  │  │  ├─ planner.ts               # returns bands\[12], intensity, rationale

│  │  │  ├─ dataset.ts               # loads from ../data (top-level) or local

│  │  │  └─ logger.ts                # append events JSONL

│  │  └─ utils\\time.ts

│  ├─ data\\                          # (present now; can later point to ..\\data)

│  │  └─ mock.json                   # fallback sample payload(s)

│  └─ tsconfig.json

│

├─ config\\                           # tokens, scenarios, zones

│  ├─ tokens.json                    # design/brand tokens (colors, radii, shadows)

│  ├─ scenarios\\lunar\_night\_demo.json

│  └─ zones\\habitat\_a.json

│

├─ data\\                             # canonical data (preferred for dev)

│  ├─ mock\\                          # Shekelton sample feeds

│  │  ├─ daily.json                  # 30-day daily snapshots

│  │  └─ now.json                    # current cockpit payload

│  ├─ runs\\                          # runtime event logs (JSONL)

│  └─ snapshots\\                     # QA screenshots

│

├─ docker\\                           # optional (day-2)

│  ├─ docker-compose.yml

│  ├─ frontend.Dockerfile

│  └─ backend.Dockerfile

│

├─ snapshots\\                        # (alternate place for QA; Mirror can choose)

├─ README.md

├─ .gitignore

└─ up.ps1                            # one-command dev (Windows)





Note: You currently have both C:\\psl2\\data and C:\\psl2\\backend\\data. That’s okay for now. In dev, prefer reading/writing to top-level C:\\psl2\\data\\… and keep backend\\data\\mock.json as a local fallback.



This structure is a trimmed, visual-first adaptation of our full framework, keeping the same philosophy (frontend components, backend routes, logs/history, configs, Docker).



Component Specs (Props \& Behaviors)



<HeaderHUD />

Props: { time: string, lunar: { pct:number, daysRemaining:number } }

Behavior: time ticks; lunar values from /time/lunar.



<CrewStatus />

Props: { crew: Array<{name:string, sync:number, color:"cyan"|"yellow"|"orange"}> }

3 neon ring gauges; percent labels inside.



<PlantZones />

Props: { zones: Array<{label:string, pct:number, color:string}> }

Thin gradient bars; label left, % right.



<SpectrumOverview />

Props: { mode:string, bands:number\[] } (12 bands)

Top+bottom panels; gentle shimmer; label “Active: {mode}”.



<EnergyHUD />

Props: { kw:number }

Semi-circular gauge; center numeric (e.g., 16.2 KW).



<AIStrategist />

Props: { active:boolean }

Avatar chip; pulsing ring when active.



<Timeline30 />

Props: { day:number, bands:Array<{start:number,end:number,color:string}> }

30-day gradient bar with “YOU ARE HERE” marker.



Slide-outs (stubs this sprint):

CrewDetail, PlantDetail, bottom ActionJournal drawer (future codex cards, strategist dials).



Backend Endpoints (stubs now, expandable later)



GET /status → cockpit payload (time/lunar/crew/plants/spectrum/energy/timeline).



GET /time/lunar → { pct:72, daysRemaining:19 } (mocked from dataset).



POST /lights/plan → { bands:\[12], intensity, rationale } (mock planner now; GPT later).



GET|POST /history → append/fetch events JSONL.



POST /explain → 1–2 paragraph summary from last N events (mock now).



These mirror the PSL1 contract so we can later turn on the full plan/critic/revise/simulate flow if desired, and reflect enhancements we made (lunar context, strategist dials, spectral wave).



Sample Cockpit Payload (for /status)

{

&nbsp; "time": "14:47",

&nbsp; "lunar": { "pct": 72, "daysRemaining": 19 },

&nbsp; "crew": \[

&nbsp;   { "name": "A", "sync": 0, "color": "cyan" },

&nbsp;   { "name": "B", "sync": 6, "color": "yellow" },

&nbsp;   { "name": "C", "sync": 89, "color": "orange" }

&nbsp; ],

&nbsp; "plants": \[

&nbsp;   { "label": "Lettuce", "pct": 8, "color": "#35E1F2" },

&nbsp;   { "label": "Tomatoes", "pct": 89, "color": "#FF7A3A" },

&nbsp;   { "label": "Algae", "pct": 80, "color": "#35E1F2" }

&nbsp; ],

&nbsp; "spectrum": { "mode": "WAKE SYNC", "bands": \[0.2,0.35,0.45,0.25,0.15,0.1,0.2,0.4,0.55,0.7,0.9,0.75] },

&nbsp; "energy": { "kw": 16.2 },

&nbsp; "timeline": { "day": 12, "bands": \[] }

}



Design Tokens (starter)



Typography: Orbitron (700) for HUDs; Inter (400/600) for body; tabular digits for time.



Radii: card 16px; inner 12px.



Key Colors:

\#0A0F14 bg, #0E141B panel, #1C2933 line, cyan #39D7F6, green #43F3A1, yellow #FFC857, orange #FF7A3A, red #FF4B4B.



Spectrum Gradient: blue→cyan→green→yellow→orange→red.



Effects: Thin border line + soft outer shadow; inner glow on active; subtle shimmer.



(These match the cockpit aesthetic upgrades we landed in v1.9–v1.9.2).



Animations (Framer Motion)



Gauge sweep: 600ms easeOut.



Strategist chip: 2s pulse loop.



Spectral shimmer: slow 6s noise translate.



StatusChip: 3s breathing opacity.



Timeline pointer: gentle bounce on day change.



48-Hour Milestones



Sun 5–10 PM



Prism: Next.js app, layout grid, header + panels skeleton.



Lumen: tokens (colors/gradients/typography) committed; motion timings.



Forge: Fastify project; GET /status → sample payload.



Mon 8 AM–12 PM



Prism: Crew/Plant modules + top Spectrum panel.



Lumen: Energy HUD dial geometry; glow tuning.



Forge: /time/lunar, /history append.



Mon 1–5 PM



Prism: Footer Timeline30; bottom Spectrum panel; StatusChip.



Aurora: mock /lights/plan + /explain.



Mirror: first visual parity pass; list diffs.



Polaris: North Star Check 5 PM.



Tue 8 AM–1 PM



Prism: polish; micro-animations; 1366–1920 widths.



Forge: wire UI to /status; events on user actions.



Tue 1–5 PM



Mirror: acceptance checklist; snapshots.



Prism/Lumen: final nits; deliver.



Acceptance Checklist (Mirror)



&nbsp;Header placements \& weights match reference.



&nbsp;Time numerals use tabular digits; size ratio ≥ 56px.



&nbsp;Cards: radius 16px; border #1C2933; shadows per tokens.



&nbsp;Crew gauges: ring thickness, glow, % labels.



&nbsp;Plant bars: thin gradient lines, label spacing exact.



&nbsp;Spectrum panels (top + bottom) peaks \& label copy match.



&nbsp;Energy HUD: semi-dial geometry + “16.2 KW” style.



&nbsp;AI Strategist chip: pulse alignment.



&nbsp;Timeline: 1..30 ticks, “YOU ARE HERE” marker, gradient flow.



&nbsp;60fps feel; no visible layout shift.



One-Command Dev (Windows PowerShell)



up.ps1 (place at repo root):



\# Frontend

if (-not (Test-Path "frontend")) { Write-Host "Missing frontend/"; exit 1 }

Start-Process powershell -ArgumentList 'cd frontend; pnpm i; pnpm dev' -NoNewWindow



\# Backend

if (-not (Test-Path "backend")) { Write-Host "Missing backend/"; exit 1 }

Start-Process powershell -ArgumentList 'cd backend; pnpm i; pnpm dlx nodemon --watch src --exec "pnpm dlx ts-node src/server.ts"' -NoNewWindow





.gitignore essentials:



node\_modules/

.next/

dist/

coverage/

.env

data/runs/

snapshots/



Notes \& Future-Ready Hooks



Keep PSL2 visual-first, but the endpoint contract mirrors PSL1 so we can add plan/critic/revise/simulate later without reshuffling folders.



The aesthetic (neon gradients, glow, pulsing HUDs, strategist dials, lunar HUD, spectral waveforms) matches our v1.9.x polish track.



Slide-outs will host Light Codex cards, waveform editor, and mission sequencer after the 48-hour sprint.

