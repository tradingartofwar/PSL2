// backend/src/server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";

import statusRoutes from "./routes/status";
import scheduleRoutes from "./routes/schedule";
import planRoutes from "./routes/plan";
import illuminationRoutes from "./routes/illumination";
import debugRoutes from "./routes/debug";
import presenceRoutes from "./routes/presence"; // ✅ NEW

// Load env (optional if you already load elsewhere)
import "dotenv/config";

// (Optional) pull through audit/debug context so we can print it on boot
import { EDGE_DEBUG } from "./services/audit/logger";

async function start() {
  const PORT = Number(process.env.PORT ?? 5000);
  const HOST = process.env.HOST ?? "0.0.0.0";
  const DATA_DIR = process.env.DATA_DIR || "/app/data";
  const RUN_ID = process.env.RUN_ID || "dev";

  const app = Fastify({
    logger: true, // set LOG_LEVEL in env if you want to tune
  });

  // CORS for local dev (adjust for prod as needed)
  await app.register(cors, { origin: true });

  // If your illuminationRoutes decorates illumMask, it will be visible to /status
  await app.register(illuminationRoutes as any);
  await app.register(presenceRoutes as any);   // ✅ presence overlay
  await app.register(statusRoutes as any);
  await app.register(scheduleRoutes as any);
  await app.register(planRoutes as any);
  await app.register(debugRoutes as any);      // ✅ expose /debug/edge

  // Health
  app.get("/health", async () => ({ ok: true }));

  // Root ping
  app.get("/", async () => ({
    ok: true,
    service: "psl2-backend",
    time: new Date().toISOString(),
  }));

  // Start
  await app.listen({ port: PORT, host: HOST });

  // Friendly startup log
  app.log.info(
    {
      PORT,
      HOST,
      DATA_DIR,
      RUN_ID,
      EDGE_DEBUG,
      endpoints: [
        "/health",
        "/status",
        "/schedule/30d",
        "/illumination/30d",
        "/lights/plan",
        "/presence/move",     // ✅ NEW
        "/debug/edge?limit=50",
      ],
    },
    "PSL2 backend started",
  );

  // Graceful shutdown
  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info({ signal }, "Shutting down…");
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
