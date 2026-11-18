import { connection } from "next/server";
import { errorResponse } from "@/lib/errors";
import { learnersVisibleToCoach } from "@/lib/queries";
import { getNow } from "@/lib/time";

/** GET /api/coaches/:id/learners: only learners whose open membership is at the coach's center. */
export async function GET(_req: Request, ctx: RouteContext<"/api/coaches/[id]/learners">) {
  await connection();
  try {
    const { id } = await ctx.params;
    return Response.json(await learnersVisibleToCoach(id, getNow()));
  } catch (err) {
    return errorResponse(err);
  }
}
