import { connection } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/errors";
import { moveLearner } from "@/lib/queries";
import { getNow } from "@/lib/time";

const Body = z.object({ centerId: z.string().min(1), coachId: z.string().min(1).optional() });

/**
 * POST /api/learners/:id/move { centerId, coachId? }
 * Closes the open membership and opens one at centerId. With coachId, the coach
 * must currently see the learner (403). 404 unknown ids, 409 already there.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/learners/[id]/move">) {
  await connection();
  try {
    const { id } = await ctx.params;
    const { centerId, coachId } = Body.parse(await req.json());
    return Response.json(await moveLearner(id, centerId, getNow(), coachId));
  } catch (err) {
    return errorResponse(err);
  }
}
