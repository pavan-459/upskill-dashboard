import { describe, expect, it } from "vitest";
import { normalizeSslMode } from "./db";

describe("normalizeSslMode", () => {
  it("pins require/prefer/verify-ca to verify-full and keeps other params", () => {
    expect(normalizeSslMode("postgresql://u:p@h/db?sslmode=require&channel_binding=require")).toBe(
      "postgresql://u:p@h/db?sslmode=verify-full&channel_binding=require",
    );
    expect(normalizeSslMode("postgresql://u:p@h/db?sslmode=prefer")).toContain("sslmode=verify-full");
  });
  it("leaves URLs without sslmode (local dev) and disable alone", () => {
    expect(normalizeSslMode("postgresql://me@localhost:5432/upskill?schema=public")).toBe(
      "postgresql://me@localhost:5432/upskill?schema=public",
    );
    expect(normalizeSslMode("postgresql://h/db?sslmode=disable")).toContain("sslmode=disable");
  });
});
