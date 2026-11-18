/** CLI entry for `npm run db:seed`. Re-run any time; see src/lib/seed-db.ts. */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/db";
import { seedDatabase } from "../src/lib/seed-db";
import { getNow } from "../src/lib/time";

const prisma = createPrismaClient();

seedDatabase(prisma, getNow())
  .then((summary) => console.log(summary))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
