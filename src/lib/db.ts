import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * pg currently treats sslmode=prefer/require/verify-ca as verify-full, warns about
 * it, and will weaken them in its next major version. Hosted URLs (e.g. Neon's)
 * ship with sslmode=require, so pin today's strict behaviour explicitly.
 */
export function normalizeSslMode(url: string): string {
  try {
    const u = new URL(url);
    const mode = u.searchParams.get("sslmode");
    if (mode && ["prefer", "require", "verify-ca"].includes(mode)) u.searchParams.set("sslmode", "verify-full");
    return u.toString();
  } catch {
    return url;
  }
}

export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: normalizeSslMode(connectionString) }) });
}

// Reuse one client (one pool) per process; survive Next.js dev hot reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function client(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

/**
 * Created on first use, not at import. `next build` imports route modules to collect
 * their config, and the build must not need a database (e.g. a first Vercel deploy
 * before the database is attached). A missing DATABASE_URL surfaces at request time
 * as a 500, which the UI shows as an error state with retry.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
