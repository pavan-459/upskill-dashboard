import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
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
