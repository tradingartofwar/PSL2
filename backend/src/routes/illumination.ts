// backend/src/routes/illumination.ts
import { FastifyInstance } from "fastify";

export default async function illuminationRoutes(app: FastifyInstance) {
  app.get("/illumination/30d", async () => {
    const stepHours = 1;
    const hours = 30 * 24;
    const now = new Date();
    const start = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0
    ));
    const samples: { t: string; lit: 0 | 1 }[] = [];

    // Synthetic south-pole pattern: mostly lit; periodic dark windows + rare blips.
    let cursor = new Date(start);
    let i = 0;
    let nextDarkStart = 36; // first dark ~hour 36

    while (i < hours) {
      if (i === nextDarkStart) {
        const darkLen = 6 + Math.floor(Math.random() * 7); // 6–12h dark
        for (let k = 0; k < darkLen && i < hours; k++, i++) {
          samples.push({ t: cursor.toISOString(), lit: 0 });
          cursor = new Date(cursor.getTime() + 3600_000);
        }
        nextDarkStart = i + 72 + Math.floor(Math.random() * 24); // next dark in 72–96h
        continue;
      }
      const lit = Math.random() < 0.025 ? 0 : 1; // rare short blips
      samples.push({ t: cursor.toISOString(), lit });
      cursor = new Date(cursor.getTime() + 3600_000);
      i++;
    }

    return { site: "shackleton_ridge", stepHours, samples };
  });
}
