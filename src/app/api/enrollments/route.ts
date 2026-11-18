import { connection } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/errors";
import { enroll, getStudentDashboard } from "@/lib/queries";
import { getNow } from "@/lib/time";

const Body = z.object({ studentId: z.string().min(1), courseId: z.string().min(1) });

/**
 * POST /api/enrollments { studentId, courseId }
 * 201 + the refreshed dashboard (so the client gets the recomputed recommendation
 * in one round trip); 400 ineligible (with reason) or bad input; 404; 409 already enrolled.
 */
export async function POST(req: Request) {
  await connection();
  try {
    const { studentId, courseId } = Body.parse(await req.json());
    const now = getNow();
    await enroll(studentId, courseId, now);
    return Response.json(await getStudentDashboard(studentId, now), { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
