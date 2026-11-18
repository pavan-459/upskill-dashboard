"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { useApi } from "@/hooks/use-api";
import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import type { CenterDto, CoachLearnerDto, CoachLearnersDto, CoachListItem, MoveResultDto } from "@/lib/dto";
import {
  AlertIcon,
  Badge,
  buttonClass,
  Card,
  CheckIcon,
  cx,
  EmptyState,
  ErrorState,
  relativeDays,
  Skeleton,
} from "../ui";

export function CoachSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-3">
      <span className="sr-only">Loading learners…</span>
      <Skeleton className="h-11 w-full sm:w-72" />
      <Skeleton className="h-24 w-full rounded-xl" />
      {[0, 1].map((i) => (
        <Card key={i}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </Card>
      ))}
    </div>
  );
}

export function CoachDashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const coaches = useApi<CoachListItem[]>("/api/coaches");
  const centers = useApi<CenterDto[]>("/api/centers");
  const selectedId = params.get("coach") ?? coaches.data?.[0]?.id ?? null;
  const list = useApi<CoachLearnersDto>(selectedId ? `/api/coaches/${encodeURIComponent(selectedId)}/learners` : null);

  if (coaches.error) return <ErrorState title="Couldn't load coaches" reason={coaches.error.message} onRetry={coaches.reload} />;
  if (coaches.loading || !coaches.data) return <CoachSkeleton />;
  if (coaches.data.length === 0) return <EmptyState title="No coaches yet">Seed the database first.</EmptyState>;

  return (
    <div className="grid gap-4">
      <div>
        <label htmlFor="coach-picker" className="mb-1.5 block text-sm font-medium">
          Signed in as coach
        </label>
        <select
          id="coach-picker"
          value={selectedId ?? ""}
          onChange={(e) => router.replace(`/coach?coach=${encodeURIComponent(e.target.value)}`, { scroll: false })}
          className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base sm:w-80"
        >
          {coaches.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.centerName}
            </option>
          ))}
        </select>
      </div>

      {list.error ? (
        <ErrorState
          title={list.error.status === 404 ? "Coach not found" : "Couldn't load learners"}
          reason={list.error.message}
          onRetry={list.error.status === 404 ? undefined : list.reload}
        />
      ) : list.data ? (
        <CoachView key={list.data.coach.id} data={list.data} centers={centers.data ?? []} onUpdate={list.setData} />
      ) : (
        <CoachSkeleton />
      )}
    </div>
  );
}

function CoachView({
  data,
  centers,
  onUpdate,
}: {
  data: CoachLearnersDto;
  centers: CenterDto[];
  onUpdate: (data: CoachLearnersDto) => void;
}) {
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  // Optimistically hide a learner the moment they are moved; rolls back on failure.
  const [learners, hide] = useOptimistic(data.learners, (current, id: string) => current.filter((l) => l.id !== id));
  const atRisk = learners.filter((l) => l.atRisk).length;

  function move(learner: CoachLearnerDto, centerId: string) {
    setMessage(null);
    startTransition(async () => {
      hide(learner.id);
      try {
        const res = await apiPost<MoveResultDto>(`/api/learners/${encodeURIComponent(learner.id)}/move`, {
          centerId,
          coachId: data.coach.id,
        });
        setMessage({
          tone: "success",
          text: `${learner.name} moved to ${res.to.name}. Their courses and progress moved with them; they now appear for that center's coach.`,
        });
        // Fetch the new list inside the same transition, so the row never flickers back.
        const fresh = await apiGet<CoachLearnersDto>(`/api/coaches/${encodeURIComponent(data.coach.id)}/learners`);
        startTransition(() => onUpdate(fresh));
      } catch (err) {
        const reason = err instanceof ApiError ? err.message : "Something went wrong.";
        setMessage({ tone: "error", text: `Couldn't move ${learner.name}. ${reason}` });
      }
    });
  }

  return (
    <>
      <section aria-labelledby="center-title" className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <h2 id="center-title" className="text-sm text-muted">
          {data.coach.centerName}
        </h2>
        <div className="mt-1 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className={cx("text-3xl font-semibold tabular-nums", atRisk > 0 ? "text-danger" : "text-success")}>
            {atRisk} <span className="text-base font-medium">at risk</span>
          </p>
          <p className="pb-1 text-sm text-muted">
            of {learners.length} learner{learners.length === 1 ? "" : "s"} · sorted by days inactive
          </p>
        </div>
        <p className="mt-2 text-xs text-muted">
          You only see learners currently at your center. At risk = an unfinished course idle for more than 3 days, or no
          activity at all for more than 3 days.
        </p>
      </section>

      <div aria-live="polite">
        {message && (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            className={cx(
              "rounded-lg p-3 text-sm",
              message.tone === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            {message.text}
          </p>
        )}
      </div>

      {learners.length === 0 ? (
        <EmptyState title="No learners at this center">
          When a learner joins {data.coach.centerName}, they will show up here.
        </EmptyState>
      ) : (
        <ul className="grid gap-3" aria-label={`Learners at ${data.coach.centerName}`}>
          {learners.map((l) => (
            <LearnerRow
              key={l.id}
              learner={l}
              targets={centers.filter((c) => c.id !== data.coach.centerId)}
              onMove={(centerId) => move(l, centerId)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function LearnerRow({
  learner: l,
  targets,
  onMove,
}: {
  learner: CoachLearnerDto;
  targets: CenterDto[];
  onMove: (centerId: string) => void;
}) {
  const [moving, setMoving] = useState(false);
  const [target, setTarget] = useState(targets[0]?.id ?? "");
  const selectId = `move-${l.id}`;

  return (
    <Card as="li" className={cx(l.atRisk && "border-danger/40")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          href={`/?student=${encodeURIComponent(l.id)}`}
          className="font-semibold text-accent underline-offset-2 hover:underline"
        >
          {l.name}
        </Link>
        {l.atRisk ? (
          <Badge tone="danger" icon={<AlertIcon />}>
            At risk
          </Badge>
        ) : (
          <Badge tone="success" icon={<CheckIcon />}>
            On track
          </Badge>
        )}
      </div>
      <p className={cx("mt-1 text-sm", l.atRisk ? "text-danger" : "text-muted")}>{l.reason}</p>
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <div className="flex gap-1">
          <dt>Last active</dt>
          <dd className="font-medium text-foreground">{relativeDays(l.daysInactive)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Active days</dt>
          <dd className="font-medium tabular-nums text-foreground">{l.activeDays7}/7</dd>
        </div>
        <div className="flex gap-1">
          <dt>Courses in progress</dt>
          <dd className="font-medium tabular-nums text-foreground">{l.activeCourses}</dd>
        </div>
      </dl>

      {targets.length > 0 &&
        (moving ? (
          <form
            className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              onMove(target);
            }}
          >
            <div className="grow">
              <label htmlFor={selectId} className="mb-1 block text-xs font-medium text-muted">
                Move {l.name} to
              </label>
              <select
                id={selectId}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base"
              >
                {targets.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={buttonClass.primary}>
              Confirm move
            </button>
            <button type="button" onClick={() => setMoving(false)} className={buttonClass.secondary}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="mt-2">
            <button type="button" onClick={() => setMoving(true)} className={buttonClass.ghost}>
              Move to another center…
            </button>
          </div>
        ))}
    </Card>
  );
}
