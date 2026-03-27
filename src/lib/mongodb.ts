import { MongoClient } from "mongodb";

import { getServerEnv } from "@/config/env";

const globalForMongo = globalThis as typeof globalThis & {
  __mongoClient?: MongoClient;
  __mongoClientPromise?: Promise<MongoClient>;
};

function isRetryableMongoConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /ECONNRESET|MongoNetworkError|connection|socket|topology/i.test(error.message);
}

async function resetMongoClient() {
  const existingClient = globalForMongo.__mongoClient;
  globalForMongo.__mongoClient = undefined;
  globalForMongo.__mongoClientPromise = undefined;

  if (!existingClient) {
    return;
  }

  try {
    await existingClient.close();
  } catch {
    // Best effort cleanup only.
  }
}

async function connectMongoClient() {
  const env = getServerEnv();

  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!globalForMongo.__mongoClientPromise) {
    const client = new MongoClient(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    globalForMongo.__mongoClientPromise = client
      .connect()
      .then((connectedClient) => {
        globalForMongo.__mongoClient = connectedClient;
        return connectedClient;
      })
      .catch(async (error) => {
        await resetMongoClient();
        throw error;
      });
  }

  return globalForMongo.__mongoClientPromise;
}

export async function getMongoDb() {
  const env = getServerEnv();

  try {
    const mongoClient = await connectMongoClient();
    const db = mongoClient.db(env.MONGODB_DB_NAME);
    await db.command({ ping: 1 });
    return db;
  } catch (error) {
    if (!isRetryableMongoConnectionError(error)) {
      throw error;
    }

    await resetMongoClient();

    const mongoClient = await connectMongoClient();
    const db = mongoClient.db(env.MONGODB_DB_NAME);
    await db.command({ ping: 1 });
    return db;
  }
}
