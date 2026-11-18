import { connection } from "next/server";
import { errorResponse } from "@/lib/errors";
import { listCoaches } from "@/lib/queries";

/** GET /api/coaches: for the coach switcher (stands in for auth). */
export async function GET() {
  await connection();
  try {
    return Response.json(await listCoaches());
  } catch (err) {
    return errorResponse(err);
  }
}
