// POST /presence/move { crewId, zoneId }
fastify.post("/presence/move", async (req: any) => {
  const { crewId, zoneId } = req.body ?? {};
  // persist a tiny presence map in memory for now
  presence.set(crewId, zoneId);
  await appendJsonl("presence_move", { crewId, zoneId, at: new Date().toISOString() });
  return { ok: true };
});
