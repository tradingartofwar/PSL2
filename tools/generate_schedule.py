#!/usr/bin/env python3
"""
Generate 30-day SPD schedules for Humans (Circadian) and Plants (Growth)
Output matches our /schedule/30d contract used by the frontend hook.
No external dependencies; pure Python.

Schema emitted:
{
  "human": [{"day": int, "keyframes":[{"tod":float, "bands":[...], "mode":str}, ...]}, ...],
  "plant": [{"day": int, "keyframes":[ ... ]}, ...],
  "meta": { "bands": 12, "wavelengthsNm": [400,430,...,730] }
}
"""
import json, math, argparse, os
from typing import List, Dict

WAVELENGTHS = [400,430,460,490,520,550,580,610,630,660,690,730]  # 12 bands
BANDS = len(WAVELENGTHS)

def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))

def normalize(bands: List[float], maxv: float = 1.0) -> List[float]:
    m = max(bands) if bands else 1.0
    if m <= 0: return [0.0]*len(bands)
    s = maxv / m
    return [clamp01(v*s) for v in bands]

def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a)*t

def morph(a: List[float], b: List[float], t: float) -> List[float]:
    n = min(len(a), len(b))
    return [lerp(a[i], b[i], t) for i in range(n)]

# --- Human / Circadian bands (blue-cyan daytime, warm evening) ---
HUMAN_SLEEP   = [0.05,0.08,0.12,0.18,0.22,0.20,0.16,0.12,0.10,0.08,0.06,0.06]  # warm/dim
HUMAN_WAKE    = [0.06,0.12,0.28,0.48,0.58,0.52,0.36,0.24,0.18,0.14,0.10,0.08]  # blue-cyan bump
HUMAN_WORK    = [0.05,0.10,0.24,0.40,0.50,0.46,0.34,0.26,0.20,0.16,0.12,0.10]  # steady
HUMAN_WIND    = [0.04,0.06,0.12,0.18,0.26,0.26,0.22,0.18,0.16,0.14,0.12,0.14]  # warmer

# --- Plant / Growth bands (blue + red + far-red) ---
PLANT_NIGHT   = [0.35,0.50,0.45,0.28,0.18,0.22,0.45,0.60,0.75,0.88,0.85,0.70]  # low, but emphasize red tail
PLANT_SURGE   = [0.50,0.72,0.62,0.40,0.30,0.40,0.66,0.82,0.92,1.00,0.98,0.82]  # growth surge (red + far-red)
PLANT_MAINT   = [0.44,0.64,0.56,0.38,0.28,0.36,0.60,0.78,0.88,0.96,0.94,0.80]  # maintain

def day_mod(day: int) -> float:
    """Slow 30-day modulation (e.g., energy or mission-phase trend)."""
    # sinusoidal across 30 days: in [0.9 .. 1.1]
    return 1.0 + 0.1*math.sin(2*math.pi*day/30.0)

def apply_day_mod(bands: List[float], factor: float) -> List[float]:
    return normalize([clamp01(v*factor) for v in bands])

def human_keyframes_for_day(day: int) -> List[Dict]:
    f = day_mod(day)
    sleep = apply_day_mod(HUMAN_SLEEP, f*0.95)
    wake  = apply_day_mod(HUMAN_WAKE,  f*1.00)
    work  = apply_day_mod(HUMAN_WORK,  f*0.98)
    wind  = apply_day_mod(HUMAN_WIND,  f*0.96)
    return [
        {"tod": 0.00, "bands": sleep, "mode": "SLEEP"},
        {"tod": 0.25, "bands": wake,  "mode": "WAKE SYNC"},
        {"tod": 0.50, "bands": work,  "mode": "WORK"},
        {"tod": 0.75, "bands": wind,  "mode": "WIND DOWN"},
    ]

def plant_keyframes_for_day(day: int) -> List[Dict]:
    f = day_mod(day)
    night = apply_day_mod(PLANT_NIGHT, f*0.96)
    surge = apply_day_mod(PLANT_SURGE, f*1.00)
    maint = apply_day_mod(PLANT_MAINT, f*0.98)
    return [
        {"tod": 0.00, "bands": night, "mode": "NIGHT"},
        {"tod": 0.30, "bands": surge, "mode": "GROWTH SURGE"},
        {"tod": 0.65, "bands": maint, "mode": "MAINTAIN"},
    ]

def build_schedule(days: int = 30) -> Dict:
    human = [{"day": d, "keyframes": human_keyframes_for_day(d)} for d in range(days)]
    plant = [{"day": d, "keyframes": plant_keyframes_for_day(d)} for d in range(days)]
    return {
        "human": human,
        "plant": plant,
        "meta": { "bands": BANDS, "wavelengthsNm": WAVELENGTHS }
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="Path to write JSON (e.g., ..\\data\\mock\\daily.json)")
    args = ap.parse_args()

    sched = build_schedule(days=30)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(sched, f, ensure_ascii=False, separators=(",", ":"), indent=2)
    print(f"[ok] wrote {args.out}")

if __name__ == "__main__":
    main()
