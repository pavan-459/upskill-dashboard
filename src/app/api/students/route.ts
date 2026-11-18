import { connection } from "next/server";
import { errorResponse } from "@/lib/errors";
import { listStudents } from "@/lib/queries";
import { getNow } from "@/lib/time";

/** GET /api/students: everyone, for the student picker. */
export async function GET() {
  await connection();
  try {
    return Response.json(await listStudents(getNow()));
  } catch (err) {
    return errorResponse(err);
  }
}
