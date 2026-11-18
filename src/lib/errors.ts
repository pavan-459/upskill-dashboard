import { ZodError } from "zod";
import type { ApiErrorBody } from "./dto";

/** An error with an HTTP status and a reason that is safe to show to users. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    reason: string,
  ) {
    super(reason);
    this.name = "AppError";
  }
}

export const notFound = (what: string) => new AppError(404, "not_found", `${what} not found`);
export const ineligible = (reason: string) => new AppError(400, "ineligible", reason);
export const alreadyEnrolled = () => new AppError(409, "already_enrolled", "Already enrolled in this course");
export const conflict = (reason: string) => new AppError(409, "conflict", reason);
export const forbidden = (reason: string) => new AppError(403, "forbidden", reason);

/** Prisma unique-constraint violation, detected without importing runtime internals. */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

export function errorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json({ error: err.code, reason: err.message } satisfies ApiErrorBody, { status: err.status });
  }
  if (err instanceof ZodError) {
    const reason = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    return Response.json({ error: "invalid_request", reason } satisfies ApiErrorBody, { status: 400 });
  }
  if (err instanceof SyntaxError) {
    return Response.json({ error: "invalid_request", reason: "Body must be valid JSON" } satisfies ApiErrorBody, {
      status: 400,
    });
  }
  console.error(err);
  return Response.json({ error: "internal", reason: "Something went wrong. Please try again." } satisfies ApiErrorBody, {
    status: 500,
  });
}
