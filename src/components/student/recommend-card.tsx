import type { RecommendationDto } from "@/lib/dto";
import { ArrowIcon, buttonClass, ClockIcon, cx, PlusIcon, StarIcon } from "../ui";
import type { EnrollTarget } from "./types";

interface Props {
  recommendation: RecommendationDto;
  alternative: RecommendationDto | null;
  pendingCourseId: string | null;
  onEnroll: (target: EnrollTarget) => void;
  onOpenCourse: (courseId: string) => void;
}

const toTarget = (r: RecommendationDto): EnrollTarget => ({
  courseId: r.courseId!,
  title: r.courseTitle ?? "this course",
  totalLessons: r.courseTotalLessons ?? 1,
  skills: r.courseSkills,
});

function EnrollButton({
  rec,
  pendingCourseId,
  onEnroll,
  variant,
}: {
  rec: RecommendationDto;
  pendingCourseId: string | null;
  onEnroll: (t: EnrollTarget) => void;
  variant: "onInverse" | "onInverseOutline";
}) {
  const pending = pendingCourseId === rec.courseId;
  return (
    <button
      type="button"
      onClick={() => onEnroll(toTarget(rec))}
      disabled={pendingCourseId !== null}
      aria-label={pending ? `Enrolling in ${rec.courseTitle}` : `Enroll in ${rec.courseTitle}`}
      className={cx(buttonClass[variant], "w-full sm:w-auto")}
    >
      {pending ? (
        <>
          <ClockIcon /> Enrolling…
        </>
      ) : (
        <>
          <PlusIcon /> Enroll
        </>
      )}
    </button>
  );
}

/** The dark focal card: one next step, why, and one click to act. */
export function RecommendCard({ recommendation: rec, alternative, pendingCourseId, onEnroll, onOpenCourse }: Props) {
  return (
    <section
      aria-labelledby="rec-title"
      className="relative overflow-hidden rounded-3xl bg-inverse p-5 text-inverse-fg shadow-[0_24px_48px_-24px_rgb(0_0_0/0.6)] sm:p-6"
    >
      <p id="rec-title" className="flex items-center gap-1.5 text-xs font-medium text-inverse-muted">
        <StarIcon /> Recommended next
      </p>

      {rec.kind === "none" ? (
        <div className="mt-3">
          <p className="font-serif text-2xl italic">Nothing to suggest right now</p>
          <p className="mt-1 text-sm text-inverse-muted">{rec.reason}</p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-2xl font-semibold leading-tight tracking-tight">{rec.courseTitle}</p>
          <p className="mt-2 text-sm text-inverse-muted">{rec.reason}</p>
          {rec.goalSkills.length > 0 && (
            <p className="mt-3 flex flex-wrap gap-1.5">
              {rec.goalSkills.map((s) => (
                <span key={s} className="rounded-full border border-inverse-border px-2.5 py-0.5 text-xs">
                  Goal · {s}
                </span>
              ))}
            </p>
          )}
          <div className="mt-5">
            {rec.canEnroll ? (
              <EnrollButton rec={rec} pendingCourseId={pendingCourseId} onEnroll={onEnroll} variant="onInverse" />
            ) : (
              <button
                type="button"
                onClick={() => onOpenCourse(rec.courseId!)}
                className={cx(buttonClass.onInverse, "w-full sm:w-auto")}
              >
                Continue {rec.courseTitle} <ArrowIcon />
              </button>
            )}
          </div>
        </div>
      )}

      {alternative && (
        <div className="mt-6 border-t border-inverse-border pt-4">
          <p className="text-xs font-medium text-inverse-muted">Or start something new</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{alternative.courseTitle}</p>
              <p className="text-sm text-inverse-muted">{alternative.reason}</p>
            </div>
            <EnrollButton
              rec={alternative}
              pendingCourseId={pendingCourseId}
              onEnroll={onEnroll}
              variant="onInverseOutline"
            />
          </div>
        </div>
      )}
    </section>
  );
}
