// backend/src/routes/presence.ts
import { FastifyInstance } from "fastify";
import { join } from "node:path";
import { appendFileSync, mkdirSync, existsSync } from "node:fs";

type PresenceUpdate = { crewId: string; zoneId: string };

function appendJsonl(event: string, payload: any, dataDir: string, runId: string) {
  const dir = join(dataDir, "runs", runId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const line = JSON.stringify({ event, payload, ts: new Date().toISOString() }) + "\n";
  appendFileSync(join(dir, "events.jsonl"), line, { encoding: "utf-8" });
}

export default async function presenceRoutes(app: FastifyInstance) {
  // in-memory presence store + accessor
  if (!(app as any).presence) (app as any).presence = new Map<string, string>();
  app.decorate("getPresenceZone", (crewId: string) => ((app as any).presence as Map<string,string>).get(crewId) ?? null);

  app.post<{ Body: PresenceUpdate }>("/presence/move", async (req, reply) => {
    const { crewId, zoneId } = req.body ?? ({} as PresenceUpdate);
    if (!crewId || !zoneId) return reply.code(400).send({ ok: false, error: "crewId and zoneId required" });

    ((app as any).presence as Map<string,string>).set(crewId, zoneId);

    const DATA_DIR = process.env.DATA_DIR || "/app/data";
    const RUN_ID = process.env.RUN_ID || "dev";
    appendJsonl("presence_move", { crewId, zoneId }, DATA_DIR, RUN_ID);

    return { ok: true };
  });
}
