import { promises as fs } from "fs";
import { join } from "path";

const dataDir = process.env.DATA_DIR || "/app/data";
const runId = process.env.RUN_ID || "dev";
const runDir = join(dataDir, "runs", runId);
const eventsPath = join(runDir, "events.jsonl");

export const EDGE_DEBUG = (process.env.EDGE_DEBUG || "0") === "1";

export async function appendJsonl(type: string, payload: unknown) {
  await fs.mkdir(runDir, { recursive: true });
  const line = JSON.stringify({ type, ts: new Date().toISOString(), ...payload }) + "\n";
  await fs.appendFile(eventsPath, line, "utf8");
}

export async function tailJsonl(limit = 200) {
  try {
    const buf = await fs.readFile(eventsPath, "utf8");
    const lines = buf.trim().split("\n");
    const tail = lines.slice(-limit);
    return tail.map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}
