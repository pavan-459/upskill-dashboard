"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useApi } from "@/hooks/use-api";
import { ApiError, apiPost } from "@/lib/api-client";
import type { CourseProgressDto, RecommendationDto, StudentDashboardDto, StudentListItem } from "@/lib/dto";
import { Card, CardTitle, EmptyState, ErrorState, Skeleton } from "../ui";
import { CourseCard } from "./course-card";
import { LockedList } from "./locked-list";
import { RecommendCard } from "./recommend-card";
import { SummaryCard } from "./summary-card";

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

export function PickerSkeleton() {
  return (
    <div aria-hidden className="mb-4">
      <Skeleton className="mb-1.5 h-4 w-20" />
      <Skeleton className="h-11 w-full sm:w-96" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="grid gap-4 md:grid-cols-5">
      <span className="sr-only">Loading dashboard…</span>
      <div className="grid content-start gap-4 md:col-span-2">
        <Card>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-4 w-16" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-4 w-24" />
          <Skeleton className="mt-2 h-6 w-full" />
          <Skeleton className="mt-4 h-8 w-48" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-4 h-11 w-28" />
        </Card>
      </div>
      <div className="grid content-start gap-3 md:col-span-3">
        <Skeleton className="h-4 w-28" />
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <div className="flex justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
            <Skeleton className="mt-2 h-4 w-44" />
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function StudentDashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const students = useApi<StudentListItem[]>("/api/students");
  const requested = params.get("student");
  const selectedId = requested ?? students.data?.[0]?.id ?? null;
  const dashboard = useApi<StudentDashboardDto>(selectedId ? `/api/students/${encodeURIComponent(selectedId)}` : null);

  if (students.error) {
    return <ErrorState title="Couldn't load learners" reason={students.error.message} onRetry={students.reload} />;
  }

  return (
    <>
      {students.loading || !students.data ? (
        <PickerSkeleton />
      ) : students.data.length === 0 ? (
        <EmptyState title="No learners yet">
          Seed the database with <code className="font-mono">npm run db:seed</code>.
        </EmptyState>
      ) : (
        <div className="mb-4">
          <label htmlFor="student-picker" className="mb-1.5 block text-sm font-medium">
            Learner
          </label>
          <select
            id="student-picker"
            value={selectedId ?? ""}
            onChange={(e) => router.replace(`/?student=${encodeURIComponent(e.target.value)}`, { scroll: false })}
            className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base sm:w-96"
          >
            {requested && !students.data.some((s) => s.id === requested) && (
              <option value={requested}>Unknown learner ({requested})</option>
            )}
            {students.data.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.centerName ? ` · ${s.centerName}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {dashboard.error ? (
        <ErrorState
          title={dashboard.error.status === 404 ? "Learner not found" : "Couldn't load this learner"}
          reason={
            dashboard.error.status === 404
              ? "This learner doesn't exist. Pick someone from the list above."
              : dashboard.error.message
          }
          onRetry={dashboard.error.status === 404 ? undefined : dashboard.reload}
        />
      ) : dashboard.data ? (
        <StudentView key={dashboard.data.learner.id} data={dashboard.data} onUpdate={dashboard.setData} />
      ) : (
        selectedId && <DashboardSkeleton />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// One learner, with optimistic enroll
// ---------------------------------------------------------------------------

function optimisticCourse(rec: RecommendationDto): CourseProgressDto {
  const now = new Date().toISOString();
  return {
    courseId: rec.courseId!,
    title: rec.courseTitle ?? "New course",
    skills: rec.courseSkills,
    completedLessons: 0,
    totalLessons: rec.courseTotalLessons ?? 1,
    percent: 0,
    status: "on-track",
    daysInactive: 0,
    lastActivityAt: now,
    enrolledAt: now,
    prerequisiteWarning: null,
    pending: true,
  };
}

function StudentView({ data, onUpdate }: { data: StudentDashboardDto; onUpdate: (d: StudentDashboardDto) => void }) {
  const [, startTransition] = useTransition();
  const [enrollError, setEnrollError] = useState<{ title: string; reason: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Switching learners unmounts this view (it is keyed by learner id). A response
  // that lands after that must not overwrite the next learner's data.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // While the request is in flight the new course shows immediately. If the request
  // fails, the transition ends without a new base state and React drops it: rollback.
  const [view, addPending] = useOptimistic(data, (current, rec: RecommendationDto) => ({
    ...current,
    courses: [optimisticCourse(rec), ...current.courses],
  }));
  const pendingCourseId = view.courses.find((c) => c.pending)?.courseId ?? null;

  function handleEnroll(rec: RecommendationDto) {
    if (!rec.courseId) return;
    setEnrollError(null);
    setAnnouncement(`Enrolling in ${rec.courseTitle}…`);
    startTransition(async () => {
      addPending(rec);
      try {
        const fresh = await apiPost<StudentDashboardDto>("/api/enrollments", {
          studentId: data.learner.id,
          courseId: rec.courseId,
        });
        if (!mounted.current) return;
        startTransition(() => onUpdate(fresh));
        setAnnouncement(`Enrolled in ${rec.courseTitle}. Recommendation updated.`);
      } catch (err) {
        const reason = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        setEnrollError({ title: rec.courseTitle ?? "this course", reason });
        setAnnouncement(`Couldn't enroll in ${rec.courseTitle}. ${reason}`);
      }
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="grid content-start gap-4 md:col-span-2">
        <SummaryCard data={view} />
        <RecommendCard
          recommendation={view.recommendation}
          alternative={view.alternative}
          pendingCourseId={pendingCourseId}
          enrollError={enrollError}
          onEnroll={handleEnroll}
          onDismissError={() => setEnrollError(null)}
        />
      </div>

      <section aria-labelledby="courses-title" className="grid content-start gap-3 md:col-span-3">
        <div className="flex items-baseline justify-between">
          <CardTitle id="courses-title">My courses ({view.courses.length})</CardTitle>
          {view.courses.some((c) => c.status === "at-risk" && !c.pending) && (
            <p className="text-sm text-danger">
              {view.courses.filter((c) => c.status === "at-risk").length} at risk
            </p>
          )}
        </div>
        {view.courses.length === 0 ? (
          <EmptyState title="No courses yet">
            Start with the recommended course. It&apos;s picked from your goals and what you can take now.
          </EmptyState>
        ) : (
          <ul className="grid gap-3">
            {view.courses.map((c) => (
              <CourseCard key={c.courseId} course={c} />
            ))}
          </ul>
        )}
        <LockedList locked={view.locked} />
      </section>
    </div>
  );
}
