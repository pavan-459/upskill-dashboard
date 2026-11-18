import type { CourseProgressDto } from "@/lib/dto";
import { COMPLETE_THRESHOLD_PCT } from "@/lib/rules/constants";
import { AlertIcon, Badge, Card, ChevronIcon, cx, EmptyState, ProgressBar, SectionTitle, StatusBadge, relativeDays } from "../ui";

export type CourseFilter = "all" | "at-risk" | "in-progress" | "completed";

const FILTERS: { id: CourseFilter; label: string; match: (c: CourseProgressDto) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "at-risk", label: "At risk", match: (c) => c.status === "at-risk" && !c.pending },
  { id: "in-progress", label: "In progress", match: (c) => c.status !== "completed" },
  { id: "completed", label: "Completed", match: (c) => c.status === "completed" },
];

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function lessonsToEarn(c: CourseProgressDto) {
  return Math.max(0, Math.ceil((COMPLETE_THRESHOLD_PCT * c.totalLessons) / 100) - c.completedLessons);
}

function CourseItem({ course: c, open, onToggle }: { course: CourseProgressDto; open: boolean; onToggle: () => void }) {
  const panelId = `course-panel-${c.courseId}`;
  const toEarn = lessonsToEarn(c);
  return (
    <li
      id={`course-${c.courseId}`}
      tabIndex={-1}
      aria-busy={c.pending || undefined}
      className={cx(
        "scroll-mt-24 rounded-2xl border bg-surface transition-shadow hover:shadow-[0_8px_24px_-16px_rgb(0_0_0/0.35)]",
        c.status === "at-risk" && !c.pending ? "border-danger/40" : "border-border",
        c.pending && "opacity-80",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full rounded-2xl p-4 text-left sm:p-5"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-semibold leading-snug">{c.title}</span>
            <span className="mt-1 block text-xs text-muted">
              {c.pending ? "Just now" : `Last active ${relativeDays(c.daysInactive)}`}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <StatusBadge status={c.pending ? "pending" : c.status} daysInactive={c.daysInactive} />
            <span className="text-muted">
              <ChevronIcon open={open} />
            </span>
          </span>
        </span>
        <span className="mt-4 flex items-end gap-3">
          <span className="grow">
            <ProgressBar
              percent={c.percent}
              marker={COMPLETE_THRESHOLD_PCT}
              label={`${c.title} progress`}
              tone={c.status === "at-risk" ? "danger" : c.status === "completed" ? "success" : "ink"}
            />
          </span>
          <span className="-mb-1 text-2xl font-semibold tabular-nums tracking-tight">
            {c.percent}
            <span className="text-sm font-normal text-muted">%</span>
          </span>
        </span>
        <span className="mt-1.5 block text-xs text-muted">
          {c.completedLessons} of {c.totalLessons} lessons
          {toEarn > 0 ? ` · ${toEarn} more to earn ${c.skills.join(", ")}` : c.status !== "completed" ? " · skills earned" : ""}
        </span>
      </button>

      {/* Animated disclosure: grid-rows trick, no measuring. */}
      <div
        id={panelId}
        className={cx("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-4 pb-4 pt-3 sm:px-5">
            {c.status === "at-risk" && !c.pending && (
              <p className="mb-3 flex items-start gap-1.5 rounded-xl bg-danger-soft p-3 text-sm text-danger">
                <AlertIcon />
                <span>No activity for {c.daysInactive} days. One lesson today puts this back on track.</span>
              </p>
            )}
            {c.prerequisiteWarning && (
              <p className="mb-3 flex items-start gap-1.5 rounded-xl bg-warning-soft p-3 text-sm text-warning">
                <AlertIcon />
                <span>
                  <strong className="font-semibold">Prerequisite not finished.</strong> {c.prerequisiteWarning}
                </span>
              </p>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Enrolled</dt>
                <dd>{dateFmt.format(new Date(c.enrolledAt))}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Last activity</dt>
                <dd>{dateFmt.format(new Date(c.lastActivityAt))}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Lessons left</dt>
                <dd className="tabular-nums">{c.totalLessons - c.completedLessons}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Teaches</dt>
                <dd className="flex flex-wrap gap-1">
                  {c.skills.map((s) => (
                    <Badge key={s} tone="neutral">
                      {s}
                    </Badge>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </li>
  );
}

export function CourseList({
  courses,
  filter,
  onFilter,
  expanded,
  onToggle,
}: {
  courses: CourseProgressDto[];
  filter: CourseFilter;
  onFilter: (f: CourseFilter) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const active = FILTERS.find((f) => f.id === filter)!;
  const shown = courses.filter(active.match);
  return (
    <section aria-labelledby="courses-title" className="grid content-start gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle id="courses-title" count={courses.length}>
          My courses
        </SectionTitle>
        <div role="group" aria-label="Filter courses" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const n = courses.filter(f.match).length;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => onFilter(f.id)}
                className={cx(
                  "min-h-8 rounded-full px-3 text-xs font-medium transition",
                  filter === f.id
                    ? "bg-inverse text-inverse-fg"
                    : "border border-border bg-surface text-muted hover:text-foreground",
                )}
              >
                {f.label} <span className="tabular-nums opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState title="No courses yet">
          Start with the recommended course above. It&apos;s picked from your goals and what you can take now.
        </EmptyState>
      ) : shown.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No {active.label.toLowerCase()} courses.{" "}
            <button type="button" onClick={() => onFilter("all")} className="font-medium text-foreground underline underline-offset-2">
              Show all
            </button>
          </p>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {shown.map((c) => (
            <CourseItem key={c.courseId} course={c} open={expanded.has(c.courseId)} onToggle={() => onToggle(c.courseId)} />
          ))}
        </ul>
      )}
    </section>
  );
}
