import type { Metadata } from "next";
import { Suspense } from "react";
import { CoachDashboard, CoachSkeleton } from "@/components/coach/coach-dashboard";

export const metadata: Metadata = { title: "Coach · Upskill" };

/** Coach at-risk view. Scoped to the coach's center by the API. */
export default function CoachPage() {
  return (
    <Suspense fallback={<CoachSkeleton />}>
      <CoachDashboard />
    </Suspense>
  );
}
