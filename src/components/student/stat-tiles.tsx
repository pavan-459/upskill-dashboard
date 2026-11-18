import type { StudentDashboardDto } from "@/lib/dto";
import { ActivityStrip, AlertIcon, InfoTip, cx } from "../ui";

function Tile({ label, children, footer, tip }: { label: string; children: React.ReactNode; footer?: React.ReactNode; tip?: React.ReactNode }) {
  return (
    <div className="flex min-h-32 flex-col justify-between rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {tip}
      </div>
      <div className="mt-3">{children}</div>
      {footer && <div className="mt-2 text-xs text-muted">{footer}</div>}
    </div>
  );
}

/** Hero numbers. Text stays in ink; colour only where it carries status. */
export function StatTiles({ data }: { data: StudentDashboardDto }) {
  const earnedGoals = data.goals.filter((g) => g.earned).length;
  const atRisk = data.courses.filter((c) => c.status === "at-risk" && !c.pending).length;
  const active = data.courses.filter((c) => c.status !== "completed").length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="Active days"
        tip={
          <InfoTip id="tip-active" label="Active days">
            Days in the last 7 (India time, today included) with any learning activity. Hover a square to see the day.
          </InfoTip>
        }
        footer="Last 7 days"
      >
        <p className="text-3xl font-semibold tabular-nums tracking-tight">
          {data.activeDays7}
          <span className="text-base font-normal text-muted">/7</span>
        </p>
        <div className="mt-2">
          <ActivityStrip days={data.activityStrip} size="sm" />
        </div>
      </Tile>

      <Tile label="Goals reached" footer={data.goals.length ? data.goals.map((g) => g.skill).join(" · ") : "No goals set"}>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">
          {earnedGoals}
          <span className="text-base font-normal text-muted">/{data.goals.length}</span>
        </p>
      </Tile>

      <Tile
        label="Skills earned"
        tip={
          <InfoTip id="tip-skills" label="Skills earned">
            A skill is earned once a course that teaches it is at least 80% complete.
          </InfoTip>
        }
        footer={data.earnedSkills.length ? data.earnedSkills.join(" · ") : "Earn one at 80% of a course"}
      >
        <p className="text-3xl font-semibold tabular-nums tracking-tight">{data.earnedSkills.length}</p>
      </Tile>

      <Tile
        label="Courses in progress"
        tip={
          <InfoTip id="tip-risk" label="At risk">
            An unfinished course with no activity for more than 3 days. Finished courses are never at risk.
          </InfoTip>
        }
        footer={
          atRisk > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-danger">
              <AlertIcon /> {atRisk} at risk
            </span>
          ) : (
            "None at risk"
          )
        }
      >
        <p className={cx("text-3xl font-semibold tabular-nums tracking-tight")}>{active}</p>
      </Tile>
    </div>
  );
}
