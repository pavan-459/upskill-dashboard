import type { StudentDashboardDto } from "@/lib/dto";
import { Badge, Card, CheckIcon, cx } from "../ui";

const dayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function SummaryCard({ data }: { data: StudentDashboardDto }) {
  const { learner, goals, earnedSkills, activeDays7, activityStrip } = data;
  const activeList = activityStrip.filter((d) => d.active).map((d) => dayLabel.format(new Date(`${d.date}T00:00:00Z`)));

  return (
    <Card aria-labelledby="summary-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="summary-title" className="text-xl font-semibold tracking-tight">
          {learner.name}
        </h2>
        <p className="text-sm text-muted">{learner.centerName ?? "No center"}</p>
      </div>

      <dl className="mt-4 grid gap-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Goals</dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {goals.length === 0 ? (
              <span className="text-sm text-muted">No goals set yet. Ask your coach to add one.</span>
            ) : (
              goals.map((g) =>
                g.earned ? (
                  <Badge key={g.skill} tone="success" icon={<CheckIcon />}>
                    {g.skill} · earned
                  </Badge>
                ) : (
                  <Badge key={g.skill} tone="accent">
                    {g.skill} · in progress
                  </Badge>
                ),
              )
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
            Earned skills <span className="font-normal normal-case">({earnedSkills.length})</span>
          </dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {earnedSkills.length === 0 ? (
              <span className="text-sm text-muted">None yet. A skill is earned at 80% of the course that teaches it.</span>
            ) : (
              earnedSkills.map((s) => (
                <span key={s} className="rounded-md border border-border px-2 py-0.5 text-xs font-medium">
                  {s}
                </span>
              ))
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Active days</dt>
          <dd className="mt-1.5 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold tabular-nums">
              {activeDays7}
              <span className="text-sm font-normal text-muted"> of last 7 days</span>
            </span>
            <span
              role="img"
              aria-label={
                activeList.length ? `Active on ${activeList.join(", ")}` : "No activity in the last 7 days"
              }
              className="flex gap-1"
            >
              {activityStrip.map((d) => (
                <span
                  key={d.date}
                  title={`${dayLabel.format(new Date(`${d.date}T00:00:00Z`))}: ${d.active ? "active" : "no activity"}`}
                  className={cx(
                    "size-3.5 rounded-sm",
                    d.active ? "bg-accent" : "border border-border bg-surface-muted",
                  )}
                />
              ))}
            </span>
          </dd>
        </div>
      </dl>
    </Card>
  );
}
