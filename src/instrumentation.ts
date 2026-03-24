export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getMongoDb } = await import("@/lib/mongodb");
    const { ensureStudyIndexes } = await import("@/modules/instrumentation/server");

    // Warm up MongoDB connection + ensure indexes on server start
    // so the first user request doesn't pay the cold-start cost.
    try {
      await getMongoDb();
      await ensureStudyIndexes();
    } catch {
      // Non-fatal — will retry on first request
    }
  }
}
