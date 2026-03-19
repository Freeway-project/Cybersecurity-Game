import { MongoClient } from "mongodb";

import { getServerEnv } from "@/config/env";

const globalForMongo = globalThis as typeof globalThis & {
  __mongoClientPromise?: Promise<MongoClient>;
};

export async function getMongoDb() {
  const env = getServerEnv();

  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!globalForMongo.__mongoClientPromise) {
    const client = new MongoClient(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    globalForMongo.__mongoClientPromise = client.connect();
  }

  const mongoClient = await globalForMongo.__mongoClientPromise;
  return mongoClient.db(env.MONGODB_DB_NAME);
}
