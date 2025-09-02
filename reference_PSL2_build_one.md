# PSL2 Build 2 — Context Package

## 🌌 PSL Build 1 — Key Context to Carry Forward

### **Core Vision**
- Goal: *“Cockpit of Light — where spectrum meets survival.”*【402†source】  
- A **futuristic, cockpit-style dashboard** for Precision Spectrum Lighting that optimizes both human circadian rhythms and plant growth.  
- First-glance view must *mirror the approved reference image* — header HUD, crew gauges, plant bars, spectrum panels, energy HUD, strategist chip, and 30-day timeline【402†source】.

---

### **UI Evolution**
- **Prototype Concepts**: waveform sculpting (“EQ for light”), mission timeline sequencer, AI Light Strategist, and Light Codex protocol cards【403†source】.
- **PSL1 Visual Track** (CHANGELOG):
  - v1.6 → Framer Motion animations & protocol cards【401†source】  
  - v1.7 → StatusChip + header gradient【401†source】  
  - v1.9 → cockpit alive with gradient bars, pulsing chips【401†source】  
  - v1.9.2 → strategist dials, Lunar HUD, spectral waveforms, neon cockpit aesthetic【401†source】  
- **PSL2 Sprint Plan**: lock visuals first (48h), smooth animations, slide-out stubs, realistic API mocks【402†source】.

---

### **Architecture / File System**
- **Frontend**: Next.js 14 (App Router), Tailwind v4, shadcn/ui, Framer Motion.  
  Components include: `HeaderHUD`, `CrewSidebar`, `PlantSidebar`, `SpectralWave`, `EnergyHUD`, `StatusChip`, `Timeline30`, slide-outs【402†source】.  
- **Backend**: Fastify + TypeScript, with stubs: `/status`, `/time/lunar`, `/history`, `/lights/plan`, `/explain`【402†source】.  
- **Shared**: `data/` (Shekelton sample feeds, runs, snapshots), `config/` (tokens, scenarios, zones)【402†source】.  
- **Docker/Dev**: optional for now, but frameworks from PSL1 were Docker-first【399†source】.

---

### **Team & Roles**
- **Helios (Vance)** — Vision & integration【400†source】  
- **Prism (Riley)** — Frontend cockpit UI【402†source】  
- **Lumen (Mira)** — Design/UX, tokens & glow【402†source】  
- **Forge (Kai)** — Backend stubs & data orchestration【402†source】  
- **Aurora (Nova)** — AI logic (mock → GPT-4o mini)【402†source】  
- **Mirror (Jules)** — QA & parity checks【402†source】  
- **Polaris** — Vision alignment (North Star checks)【400†source】  
- **Pulse / Flare** — Improvement & urgency agents【400†source】  

---

### **Sample Data Payloads**
- **Cockpit /status**:
```json
{
  "time": "14:47",
  "lunar": { "pct": 72, "daysRemaining": 19 },
  "crew": [
    { "name": "A", "sync": 0, "color": "cyan" },
    { "name": "B", "sync": 6, "color": "yellow" },
    { "name": "C", "sync": 89, "color": "orange" }
  ],
  "plants": [
    { "label": "Lettuce", "pct": 8, "color": "#35E1F2" },
    { "label": "Tomatoes", "pct": 89, "color": "#FF7A3A" },
    { "label": "Algae", "pct": 80, "color": "#35E1F2" }
  ],
  "spectrum": {
    "mode": "WAKE SYNC",
    "bands": [0.2,0.35,0.45,0.25,0.15,0.1,0.2,0.4,0.55,0.7,0.9,0.75]
  },
  "energy": { "kw": 16.2 },
  "timeline": { "day": 12, "bands": [] }
}
```
【402†source】

---

### **Design Tokens**
- Colors: `#0A0F14` bg, `#0E141B` panel, `#1C2933` line, neon cyan/green/yellow/orange/red【402†source】.  
- Typography: Orbitron for HUDs, Inter for body, tabular numerals for time【402†source】.  
- Effects: neon gradients, subtle shimmer, pulsing chips, 16px radii【402†source】.

---

### **Acceptance Checklist (Mirror)**
- Header spacing & weights match reference.  
- Crew gauges glow + % labels accurate.  
- Plant bars are thin gradient lines, correct spacing.  
- Spectral panels shimmer, match peaks/labels.  
- Energy HUD semi-dial geometry correct.  
- Strategist chip pulses at 2s loop.  
- Timeline ticks 1–30 with “YOU ARE HERE”.  
- 60fps feel, no layout shift【402†source】.  

---

✅ With this package, PSL2 Build 2 can:  
- Reference **PSL1’s polish track** (v1.6 → v1.9.2) for inspiration.  
- Re-use the **team role assignments** and working cadence.  
- Lean on **sample payloads + API contracts** already proven.  
- Preserve the **design tokens + acceptance checklist** as non-negotiables.
