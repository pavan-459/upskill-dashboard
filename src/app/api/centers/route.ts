import { connection } from "next/server";
import { errorResponse } from "@/lib/errors";
import { listCenters } from "@/lib/queries";

/** GET /api/centers: targets for "move learner". */
export async function GET() {
  await connection();
  try {
    return Response.json(await listCenters());
  } catch (err) {
    return errorResponse(err);
  }
}
