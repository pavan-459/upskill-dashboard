import { execSync } from "node:child_process";

/** Applies migrations to the test database once per run. Refuses any non-test database. */
export default function setup() {
  const url = process.env.DATABASE_URL ?? "";
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to run integration tests against "${dbName}" (name must end in _test)`);
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
