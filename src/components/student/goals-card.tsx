import type { GoalProgressDto } from "@/lib/dto";
import { COMPLETE_THRESHOLD_PCT } from "@/lib/rules/constants";
import { Badge, Card, CheckIcon, ProgressBar, SectionTitle } from "../ui";

/** Each goal, the course that gets the learner there, and the distance to the 80% line. */
export function GoalsCard({ goals, onOpenCourse }: { goals: GoalProgressDto[]; onOpenCourse: (id: string) => void }) {
  return (
    <Card aria-labelledby="goals-title">
      <SectionTitle id="goals-title" count={goals.length}>
        Goals
      </SectionTitle>
      {goals.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No goals yet. Goals drive the recommendation, so ask your coach to add one.</p>
      ) : (
        <ul className="mt-4 grid gap-5">
          {goals.map((g) => (
            <li key={g.skill}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{g.skill}</p>
                {g.earned ? (
                  <Badge tone="success" icon={<CheckIcon />}>
                    Earned
                  </Badge>
                ) : g.course ? (
                  <span className="text-xs text-muted">
                    {g.course.lessonsToEarn} lesson{g.course.lessonsToEarn === 1 ? "" : "s"} to go
                  </span>
                ) : (
                  <span className="text-xs text-muted">No course teaches this yet</span>
                )}
              </div>
              {g.course && (
                <>
                  <div className="mt-2">
                    <ProgressBar
                      percent={g.course.percent}
                      marker={COMPLETE_THRESHOLD_PCT}
                      tone={g.earned ? "success" : "ink"}
                      label={`${g.skill} goal via ${g.course.title}`}
                    />
                  </div>
                  <p className="mt-1.5 flex justify-between gap-2 text-xs text-muted">
                    <span>
                      via{" "}
                      {g.course.enrolled ? (
                        <button
                          type="button"
                          onClick={() => onOpenCourse(g.course!.courseId)}
                          className="font-medium text-foreground underline decoration-border-strong underline-offset-2 hover:decoration-foreground"
                        >
                          {g.course.title}
                        </button>
                      ) : (
                        <span className="font-medium text-foreground">{g.course.title}</span>
                      )}
                      {!g.course.enrolled && " (not started)"}
                    </span>
                    <span className="tabular-nums">{g.course.percent}%</span>
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-muted">
        <span aria-hidden className="inline-block h-3 w-0.5 rounded-full bg-border-strong" /> {COMPLETE_THRESHOLD_PCT}% line:
        skill earned
      </p>
    </Card>
  );
}
