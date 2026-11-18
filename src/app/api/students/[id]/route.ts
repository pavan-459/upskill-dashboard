import { connection } from "next/server";
import { errorResponse } from "@/lib/errors";
import { getStudentDashboard } from "@/lib/queries";
import { getNow } from "@/lib/time";

/** GET /api/students/:id: goals, earned skills, active days, courses, recommendation, locked. */
export async function GET(_req: Request, ctx: RouteContext<"/api/students/[id]">) {
  await connection();
  try {
    const { id } = await ctx.params;
    return Response.json(await getStudentDashboard(id, getNow()));
  } catch (err) {
    return errorResponse(err);
  }
}
