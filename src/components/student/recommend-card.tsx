import type { RecommendationDto } from "@/lib/dto";
import { buttonClass, Card, CardTitle, ClockIcon, cx, EmptyState } from "../ui";

interface Props {
  recommendation: RecommendationDto;
  alternative: RecommendationDto | null;
  pendingCourseId: string | null;
  enrollError: { title: string; reason: string } | null;
  onEnroll: (rec: RecommendationDto) => void;
  onDismissError: () => void;
}

function EnrollButton({
  rec,
  pendingCourseId,
  onEnroll,
  variant,
}: {
  rec: RecommendationDto;
  pendingCourseId: string | null;
  onEnroll: (rec: RecommendationDto) => void;
  variant: "primary" | "secondary";
}) {
  const pending = pendingCourseId === rec.courseId;
  return (
    <button
      type="button"
      onClick={() => onEnroll(rec)}
      disabled={pendingCourseId !== null}
      aria-label={pending ? `Enrolling in ${rec.courseTitle}` : `Enroll in ${rec.courseTitle}`}
      className={cx(buttonClass[variant], "w-full sm:w-auto")}
    >
      {pending ? (
        <>
          <ClockIcon /> Enrolling…
        </>
      ) : (
        "Enroll"
      )}
    </button>
  );
}

export function RecommendCard({ recommendation: rec, alternative, pendingCourseId, enrollError, onEnroll, onDismissError }: Props) {
  return (
    <Card aria-labelledby="rec-title" className="border-accent/40">
      <CardTitle id="rec-title">Recommended next</CardTitle>

      {rec.kind === "none" ? (
        <div className="mt-3">
          <EmptyState title="No recommendation right now">{rec.reason}</EmptyState>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-lg font-semibold leading-snug">{rec.courseTitle}</p>
          <p className="mt-1 text-sm text-muted">{rec.reason}</p>
          <div className="mt-3">
            {rec.canEnroll ? (
              <EnrollButton rec={rec} pendingCourseId={pendingCourseId} onEnroll={onEnroll} variant="primary" />
            ) : (
              <a
                href={`#course-${rec.courseId}`}
                onClick={() => {
                  // Move focus with the scroll so keyboard and screen-reader users follow.
                  requestAnimationFrame(() => document.getElementById(`course-${rec.courseId}`)?.focus());
                }}
                className={cx(buttonClass.primary, "w-full sm:w-auto")}
              >
                Continue {rec.courseTitle}
              </a>
            )}
          </div>
        </div>
      )}

      {alternative && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Or start something new</p>
          <p className="mt-1 font-medium">{alternative.courseTitle}</p>
          <p className="text-sm text-muted">{alternative.reason}</p>
          <div className="mt-2">
            <EnrollButton rec={alternative} pendingCourseId={pendingCourseId} onEnroll={onEnroll} variant="secondary" />
          </div>
        </div>
      )}

      {enrollError && (
        <div role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          <p>
            <strong className="font-semibold">Couldn&apos;t enroll in {enrollError.title}.</strong> {enrollError.reason}
          </p>
          <button type="button" onClick={onDismissError} className="mt-1 font-semibold underline underline-offset-2">
            Dismiss
          </button>
        </div>
      )}
    </Card>
  );
}
