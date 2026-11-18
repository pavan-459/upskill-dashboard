import path from "node:path";
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  `postgresql://${process.env.USER}@localhost:5432/upskill_test?schema=public`;

// Set before globalSetup and workers start, so both use the test database.
process.env.DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["test/**/*.int.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    env: { DATABASE_URL: TEST_DATABASE_URL },
    // One shared database: run files serially.
    fileParallelism: false,
  },
});
