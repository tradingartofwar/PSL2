import Fastify from "fastify";
import cors from "@fastify/cors";
import statusRoutes from "./routes/status";
import scheduleRoutes from "./routes/schedule";
import planRoutes from "./routes/plan"; // ✅ NEW

async function start() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(statusRoutes as any);
  await app.register(scheduleRoutes as any);
  await app.register(planRoutes as any); // ✅ NEW

  app.get("/health", async () => ({ ok: true }));

  await app.listen({ port: 5000, host: "0.0.0.0" });
}
start().catch((err) => { console.error(err); process.exit(1); });
