import { connection } from "next/server";
import { errorResponse } from "@/lib/errors";
import { listStudents } from "@/lib/queries";

/** GET /api/students: everyone, for the student picker. */
export async function GET() {
  await connection();
  try {
    return Response.json(await listStudents());
  } catch (err) {
    return errorResponse(err);
  }
}
