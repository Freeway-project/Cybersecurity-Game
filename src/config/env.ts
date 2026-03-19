import { z } from "zod";

const serverEnvSchema = z.object({
  MONGODB_URI: z.string().trim().optional(),
  MONGODB_DB_NAME: z.string().trim().default("cybersecurity_game"),
  ADMIN_SECRET: z.string().trim().optional(),
  APP_BASE_URL: z.string().trim().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_ENABLE_DEV_BYPASS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});

export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}

export function getClientEnv() {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_ENABLE_DEV_BYPASS:
      process.env.NEXT_PUBLIC_ENABLE_DEV_BYPASS ?? "true",
  });
}

export function isDevBypassEnabled() {
  const serverEnv = getServerEnv();
  const clientEnv = getClientEnv();

  return serverEnv.NODE_ENV !== "production" && clientEnv.NEXT_PUBLIC_ENABLE_DEV_BYPASS;
}
