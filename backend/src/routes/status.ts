// backend/src/routes/status.ts
export default async function statusRoutes(fastify: any) {
  fastify.get("/status", async () => {
    const now = new Date();

    // tod in [0..1]
    const tod = ((now.getUTCHours() * 60 + now.getUTCMinutes()) / (24 * 60));

    // 👇 oscillate energy between ~8 kW and ~20 kW over ~90 seconds
    const t = now.getTime() / 1000;                 // seconds
    const wave = (Math.sin((2 * Math.PI * t) / 90) + 1) / 2;  // 0..1
    const energyKw = 8 + wave * 12;                 // 8..20 — crosses our 10 & 18 kW thresholds

    return {
      time: { utc: now.toISOString(), local: now.toLocaleTimeString("en-US", { hour12: false }), sol: 12, tod },
      lunar: { pct: 72, daysRemaining: 19 },
      energy: { kw: Number(energyKw.toFixed(1)) },   // 🔸 varies continuously
      spectrum: { modeHuman: "WAKE SYNC", modePlant: "GROWTH SURGE" }
    };
  });
}
