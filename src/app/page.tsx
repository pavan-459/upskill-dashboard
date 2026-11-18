import { Suspense } from "react";
import { DashboardSkeleton, PickerSkeleton, StudentDashboard } from "@/components/student/student-dashboard";

/**
 * Learner view. The shell is prerendered; the dashboard is a client component that
 * reads ?student= and talks to the API (so enroll can be optimistic).
 */
export default function Home() {
  return (
    <Suspense
      fallback={
        <>
          <PickerSkeleton />
          <DashboardSkeleton />
        </>
      }
    >
      <StudentDashboard />
    </Suspense>
  );
}
