import type { CourseProgressDto } from "@/lib/dto";
import { AlertIcon, Badge, Card, ProgressBar, StatusBadge, cx, relativeDays } from "../ui";

export function CourseCard({ course }: { course: CourseProgressDto }) {
  const { status, pending } = course;
  return (
    <Card
      as="li"
      id={`course-${course.courseId}`}
      tabIndex={-1}
      aria-busy={pending || undefined}
      className={cx(
        "scroll-mt-20",
        status === "at-risk" && !pending && "border-danger/40",
        pending && "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">{course.title}</h3>
        <StatusBadge status={pending ? "pending" : status} daysInactive={course.daysInactive} />
      </div>

      <div className="mt-3">
        <ProgressBar
          percent={course.percent}
          label={`${course.title} progress`}
          tone={status === "at-risk" ? "danger" : status === "completed" ? "success" : "accent"}
        />
        <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-sm text-muted">
          <span className="tabular-nums">
            {course.completedLessons} of {course.totalLessons} lessons ·{" "}
            <strong className="font-semibold text-foreground">{course.percent}%</strong>
          </span>
          <span>{pending ? "Just now" : `Last active ${relativeDays(course.daysInactive)}`}</span>
        </p>
      </div>

      {status === "at-risk" && !pending && (
        <p className="mt-2 text-sm text-danger">
          No activity for {course.daysInactive} days. One lesson today puts this back on track.
        </p>
      )}

      {course.prerequisiteWarning && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-warning">
          <AlertIcon />
          <span>
            <strong className="font-semibold">Prerequisite not finished.</strong> {course.prerequisiteWarning}
          </span>
        </p>
      )}

      {course.skills.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-1">
          <span className="sr-only">Teaches:</span>
          {course.skills.map((s) => (
            <Badge key={s} tone="neutral">
              {s}
            </Badge>
          ))}
        </p>
      )}
    </Card>
  );
}
