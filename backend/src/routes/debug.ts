import { FastifyInstance } from "fastify";
import { tailJsonl } from "../services/audit/logger";

export default async function debugRoutes(f: FastifyInstance) {
  f.get("/debug/edge", async (req, reply) => {
    const limit = Math.max(1, Math.min(1000, Number((req.query as any)?.limit ?? 200)));
    const rows = await tailJsonl(limit);
    // Filter to edge_decision lines only (keep flexible if you log more types later)
    const onlyEdge = rows.filter((r: any) => r?.type === "edge_decision");
    return { count: onlyEdge.length, rows: onlyEdge };
  });
}
