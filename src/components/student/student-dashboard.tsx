"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useApi } from "@/hooks/use-api";
import { ApiError, apiPost } from "@/lib/api-client";
import type { CourseProgressDto, StudentDashboardDto, StudentListItem } from "@/lib/dto";
import { useToast } from "../toast";
import {
  AlertIcon,
  Card,
  CheckIcon,
  cx,
  EmptyState,
  ErrorState,
  PillBar,
  pillItemClass,
  relativeDays,
  Skeleton,
  StatusDot,
} from "../ui";
import { CourseList, type CourseFilter } from "./course-list";
import { GoalsCard } from "./goals-card";
import { LearningPath } from "./learning-path";
import { RecommendCard } from "./recommend-card";
import { StatTiles } from "./stat-tiles";
import type { EnrollTarget } from "./types";

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

export function PickerSkeleton() {
  return (
    <div aria-hidden className="mb-8">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-12 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-64 max-w-full" />
      <Skeleton className="mt-6 h-11 w-80 max-w-full rounded-xl" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4">
      <span className="sr-only">Loading dashboard…</span>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-5">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <div className="grid content-start gap-3 lg:col-span-7">
          <Skeleton className="h-6 w-40" />
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <div className="flex justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-5 h-2 w-full rounded-full" />
              <Skeleton className="mt-2 h-3 w-44" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function LearnerSwitcher({ students, selectedId }: { students: StudentListItem[]; selectedId: string | null }) {
  const router = useRouter();
  // Pills read best for a handful of learners; a long list falls back to a select.
  if (students.length > 6) {
    return (
      <div className="mt-6">
        <label htmlFor="student-picker" className="mb-1.5 block text-sm font-medium">
          Learner
        </label>
        <select
          id="student-picker"
          value={selectedId ?? ""}
          onChange={(e) => router.replace(`/?student=${encodeURIComponent(e.target.value)}`, { scroll: false })}
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base sm:w-96"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.atRisk ? " (at risk)" : ""}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <PillBar label="Choose a learner" className="mt-6">
      {students.map((s) => (
        <Link
          key={s.id}
          href={`/?student=${encodeURIComponent(s.id)}`}
          scroll={false}
          replace
          aria-current={s.id === selectedId ? "page" : undefined}
          className={pillItemClass(s.id === selectedId)}
        >
          <StatusDot atRisk={s.atRisk} />
          <span className="sm:hidden">{s.name.split(" ")[0]}</span>
          <span className="hidden sm:inline">{s.name}</span>
          <span className="sr-only">{s.atRisk ? "(at risk)" : "(on track)"}</span>
        </Link>
      ))}
    </PillBar>
  );
}

export function StudentDashboard() {
  const params = useSearchParams();
  const students = useApi<StudentListItem[]>("/api/students");
  const requested = params.get("student");
  const selectedId = requested ?? students.data?.[0]?.id ?? null;
  const dashboard = useApi<StudentDashboardDto>(selectedId ? `/api/students/${encodeURIComponent(selectedId)}` : null);

  if (students.error) {
    return <ErrorState title="Couldn't load learners" reason={students.error.message} onRetry={students.reload} />;
  }
  if (students.loading || !students.data) {
    return (
      <>
        <PickerSkeleton />
        <DashboardSkeleton />
      </>
    );
  }
  if (students.data.length === 0) {
    return (
      <EmptyState title="No learners yet">
        Seed the database with <code className="font-mono">npm run db:seed</code>.
      </EmptyState>
    );
  }

  if (dashboard.error) {
    return (
      <>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">Learners</h1>
        <LearnerSwitcher students={students.data} selectedId={selectedId} />
        <div className="mt-6">
          <ErrorState
            title={dashboard.error.status === 404 ? "Learner not found" : "Couldn't load this learner"}
            reason={
              dashboard.error.status === 404
                ? "This learner doesn't exist. Pick someone from the list above."
                : dashboard.error.message
            }
            onRetry={dashboard.error.status === 404 ? undefined : dashboard.reload}
          />
        </div>
      </>
    );
  }

  if (!dashboard.data) {
    return (
      <>
        <PickerSkeleton />
        <DashboardSkeleton />
      </>
    );
  }

  return (
    <StudentView key={dashboard.data.learner.id} data={dashboard.data} students={students.data} onUpdate={dashboard.setData} />
  );
}

// ---------------------------------------------------------------------------
// One learner, with optimistic enroll
// ---------------------------------------------------------------------------

function optimisticCourse(t: EnrollTarget): CourseProgressDto {
  const now = new Date().toISOString();
  return {
    courseId: t.courseId,
    title: t.title,
    skills: t.skills,
    completedLessons: 0,
    totalLessons: t.totalLessons,
    percent: 0,
    status: "on-track",
    daysInactive: 0,
    lastActivityAt: now,
    enrolledAt: now,
    prerequisiteWarning: null,
    pending: true,
  };
}

const longDate = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Kolkata",
});

function StudentView({
  data,
  students,
  onUpdate,
}: {
  data: StudentDashboardDto;
  students: StudentListItem[];
  onUpdate: (d: StudentDashboardDto) => void;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

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
  const [view, addPending] = useOptimistic(data, (current, t: EnrollTarget) => ({
    ...current,
    courses: [optimisticCourse(t), ...current.courses],
  }));
  const pendingCourseId = view.courses.find((c) => c.pending)?.courseId ?? null;

  function openCourse(courseId: string) {
    setFilter("all");
    setExpanded((s) => new Set(s).add(courseId));
    requestAnimationFrame(() => {
      const el = document.getElementById(`course-${courseId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.focus({ preventScroll: true });
    });
  }

  function handleEnroll(t: EnrollTarget) {
    startTransition(async () => {
      addPending(t);
      try {
        const fresh = await apiPost<StudentDashboardDto>("/api/enrollments", {
          studentId: data.learner.id,
          courseId: t.courseId,
        });
        if (!mounted.current) return;
        startTransition(() => onUpdate(fresh));
        toast({ tone: "success", title: `Enrolled in ${t.title}`, body: "Your recommendation has been updated." });
      } catch (err) {
        const reason = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        toast({ tone: "error", title: `Couldn't enroll in ${t.title}`, body: reason });
      }
    });
  }

  const { status } = view;
  const recommendedIds = [view.recommendation.courseId, view.alternative?.courseId].filter((x): x is string =>
    Boolean(x),
  );

  return (
    <>
      <header>
        <p className="font-serif text-xl italic text-muted">
          {longDate.format(new Date(view.generatedAt))} · {view.learner.centerName ?? "No center"}
        </p>
        <h1 className="mt-1 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          {view.learner.name}
          <sup className="ml-1 align-super text-sm font-normal tracking-normal text-muted sm:text-base">
            ({view.courses.length} course{view.courses.length === 1 ? "" : "s"})
          </sup>
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:text-base">
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium",
              status.atRisk ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
            )}
          >
            {status.atRisk ? <AlertIcon /> : <CheckIcon />}
            {status.atRisk ? "Needs attention" : "On track"}
          </span>
          <span className="text-muted">
            {status.reason} · last active {relativeDays(status.daysInactive)}
          </span>
        </p>
        <LearnerSwitcher students={students} selectedId={view.learner.id} />
      </header>

      <div className="mt-6 grid gap-4">
        <StatTiles data={view} />

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="grid content-start gap-4 lg:col-span-5">
            <RecommendCard
              recommendation={view.recommendation}
              alternative={view.alternative}
              pendingCourseId={pendingCourseId}
              onEnroll={handleEnroll}
              onOpenCourse={openCourse}
            />
            <GoalsCard goals={view.goalProgress} onOpenCourse={openCourse} />
          </div>
          <div className="grid content-start gap-4 lg:col-span-7">
            <CourseList
              courses={view.courses}
              filter={filter}
              onFilter={setFilter}
              expanded={expanded}
              onToggle={(id) =>
                setExpanded((s) => {
                  const next = new Set(s);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
            />
            <LearningPath
              tracks={view.path}
              recommendedIds={recommendedIds}
              pendingCourseId={pendingCourseId}
              onEnroll={handleEnroll}
              onOpenCourse={openCourse}
            />
          </div>
        </div>
      </div>
    </>
  );
}
