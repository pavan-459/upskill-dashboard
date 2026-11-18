"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useApi } from "@/hooks/use-api";
import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import type { CenterDto, CoachLearnerDto, CoachLearnersDto, CoachListItem, MoveResultDto } from "@/lib/dto";
import { AT_RISK_INACTIVE_DAYS } from "@/lib/rules/constants";
import { useToast } from "../toast";
import {
  ActivityStrip,
  AlertIcon,
  ArrowIcon,
  Avatar,
  Badge,
  buttonClass,
  Card,
  CheckIcon,
  ChevronIcon,
  cx,
  EmptyState,
  ErrorState,
  PillBar,
  pillItemClass,
  ProgressBar,
  relativeDays,
  Skeleton,
  StatusBadge,
} from "../ui";

export function CoachSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4">
      <span className="sr-only">Loading learners…</span>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-12 w-80 max-w-full" />
      <Skeleton className="h-11 w-72 max-w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-36 rounded-2xl" />
      ))}
    </div>
  );
}

const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });

export function CoachDashboard() {
  const params = useSearchParams();
  const coaches = useApi<CoachListItem[]>("/api/coaches");
  const centers = useApi<CenterDto[]>("/api/centers");
  const selectedId = params.get("coach") ?? coaches.data?.[0]?.id ?? null;
  const list = useApi<CoachLearnersDto>(selectedId ? `/api/coaches/${encodeURIComponent(selectedId)}/learners` : null);

  if (coaches.error) return <ErrorState title="Couldn't load coaches" reason={coaches.error.message} onRetry={coaches.reload} />;
  if (coaches.loading || !coaches.data) return <CoachSkeleton />;
  if (coaches.data.length === 0) return <EmptyState title="No coaches yet">Seed the database first.</EmptyState>;

  const switcher = (
    <PillBar label="Signed in as coach" className="mt-6">
      {coaches.data.map((c) => (
        <Link
          key={c.id}
          href={`/coach?coach=${encodeURIComponent(c.id)}`}
          scroll={false}
          replace
          aria-current={c.id === selectedId ? "page" : undefined}
          className={pillItemClass(c.id === selectedId)}
        >
          {c.name}
          <span className={cx("text-xs", c.id === selectedId ? "text-muted" : "opacity-70")}>
            {c.centerName.replace(/\s*\(.*\)/, "")}
          </span>
        </Link>
      ))}
    </PillBar>
  );

  if (list.error) {
    return (
      <>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">Who needs a nudge</h1>
        {switcher}
        <div className="mt-6">
          <ErrorState
            title={list.error.status === 404 ? "Coach not found" : "Couldn't load learners"}
            reason={list.error.message}
            onRetry={list.error.status === 404 ? undefined : list.reload}
          />
        </div>
      </>
    );
  }
  if (!list.data) return <CoachSkeleton />;

  return (
    <CoachView key={list.data.coach.id} data={list.data} centers={centers.data ?? []} onUpdate={list.setData} switcher={switcher} />
  );
}

type Filter = "all" | "at-risk" | "on-track";

function CoachView({
  data,
  centers,
  onUpdate,
  switcher,
}: {
  data: CoachLearnersDto;
  centers: CenterDto[];
  onUpdate: (data: CoachLearnersDto) => void;
  switcher: React.ReactNode;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [moving, setMoving] = useState<CoachLearnerDto | null>(null);
  // Optimistically hide a learner the moment they are moved; rolls back on failure.
  const [learners, hide] = useOptimistic(data.learners, (current, id: string) => current.filter((l) => l.id !== id));

  const atRisk = learners.filter((l) => l.atRisk).length;
  const avgActive = learners.length ? learners.reduce((n, l) => n + l.activeDays7, 0) / learners.length : 0;
  const inProgress = learners.reduce((n, l) => n + l.activeCourses, 0);
  const shown = learners
    .filter((l) => (filter === "all" ? true : filter === "at-risk" ? l.atRisk : !l.atRisk))
    .filter((l) => l.name.toLowerCase().includes(query.trim().toLowerCase()));
  const maxDays = Math.max(14, ...learners.map((l) => l.daysInactive ?? 0));

  function move(learner: CoachLearnerDto, centerId: string) {
    startTransition(async () => {
      hide(learner.id);
      try {
        const res = await apiPost<MoveResultDto>(`/api/learners/${encodeURIComponent(learner.id)}/move`, {
          centerId,
          coachId: data.coach.id,
        });
        // Fetch the new list inside the same transition, so the row never flickers back.
        const fresh = await apiGet<CoachLearnersDto>(`/api/coaches/${encodeURIComponent(data.coach.id)}/learners`);
        startTransition(() => onUpdate(fresh));
        toast({
          tone: "success",
          title: `${learner.name} moved to ${res.to.name}`,
          body: "Their courses and progress moved with them. They now appear for that center's coach.",
        });
      } catch (err) {
        const reason = err instanceof ApiError ? err.message : "Something went wrong.";
        toast({ tone: "error", title: `Couldn't move ${learner.name}`, body: reason });
      }
    });
  }

  return (
    <>
      <header>
        <p className="font-serif text-xl italic text-muted">{longDate.format(new Date(data.generatedAt))}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          Who needs a nudge
          <sup className="ml-1 align-super text-sm font-normal tracking-normal text-muted sm:text-base">({atRisk})</sup>
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          {data.coach.name} · {data.coach.centerName}. You only see learners currently at your center.
        </p>
        {switcher}
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={cx("rounded-2xl border p-4", atRisk > 0 ? "border-danger/30 bg-danger-soft" : "border-border bg-surface")}>
          <p className={cx("flex items-center gap-1.5 text-xs font-medium", atRisk > 0 ? "text-danger" : "text-muted")}>
            {atRisk > 0 ? <AlertIcon /> : <CheckIcon />} At risk
          </p>
          <p className={cx("mt-3 text-4xl font-semibold tabular-nums tracking-tight", atRisk > 0 && "text-danger")}>{atRisk}</p>
          <p className={cx("mt-1 text-xs", atRisk > 0 ? "text-danger" : "text-muted")}>of {learners.length} learners</p>
        </div>
        <Kpi label="Learners" value={String(learners.length)} foot={data.coach.centerName} />
        <Kpi label="Avg active days" value={avgActive.toFixed(1)} unit="/7" foot="Last 7 days" />
        <Kpi label="Courses in progress" value={String(inProgress)} foot="Across all learners" />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter learners" className="inline-flex gap-0.5 rounded-xl bg-inverse p-1">
          {(
            [
              ["all", "All", learners.length],
              ["at-risk", "At risk", atRisk],
              ["on-track", "On track", learners.length - atRisk],
            ] as const
          ).map(([id, label, n]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={pillItemClass(filter === id)}>
              {label} <span className="tabular-nums opacity-70">{n}</span>
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Search learners</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search learners…"
            className="min-h-11 w-full rounded-full border border-border bg-surface px-4 text-sm placeholder:text-muted"
          />
        </label>
      </div>

      <div className="mt-4">
        {learners.length === 0 ? (
          <EmptyState title="No learners at this center">When a learner joins {data.coach.centerName}, they will show up here.</EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState title="No learners match">
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
              className="font-medium text-foreground underline underline-offset-2"
            >
              Clear filters
            </button>
          </EmptyState>
        ) : (
          <ul className="grid gap-3" aria-label={`Learners at ${data.coach.centerName}`}>
            {shown.map((l) => (
              <LearnerRow key={l.id} learner={l} maxDays={maxDays} canMove={centers.length > 1} onMove={() => setMoving(l)} />
            ))}
          </ul>
        )}
      </div>

      {moving && (
        <MoveDialog
          key={moving.id}
          learner={moving}
          targets={centers.filter((c) => c.id !== data.coach.centerId)}
          fromName={data.coach.centerName}
          onClose={() => setMoving(null)}
          onConfirm={(centerId) => {
            setMoving(null);
            move(moving, centerId);
          }}
        />
      )}
    </>
  );
}

function Kpi({ label, value, unit, foot }: { label: string; value: string; unit?: string; foot: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight">
        {value}
        {unit && <span className="text-base font-normal text-muted">{unit}</span>}
      </p>
      <p className="mt-1 truncate text-xs text-muted">{foot}</p>
    </div>
  );
}

/** Bullet-style meter: days since last activity against the 3-day at-risk line. */
function InactivityMeter({ days, max }: { days: number | null; max: number }) {
  const value = days ?? max;
  const over = days === null || days > AT_RISK_INACTIVE_DAYS;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">Days since last activity</span>
        <span className={cx("font-medium tabular-nums", over ? "text-danger" : "text-foreground")}>
          {days === null ? "never active" : `${days} day${days === 1 ? "" : "s"}`}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Days since last activity"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="relative mt-1.5 h-2 rounded-full bg-surface-muted ring-1 ring-inset ring-border"
      >
        <div
          className={cx("h-full rounded-full transition-[width] duration-700", over ? "bg-danger" : "bg-foreground")}
          style={{ width: `${Math.max(3, (Math.min(value, max) / max) * 100)}%` }}
        />
        <span
          aria-hidden
          title={`${AT_RISK_INACTIVE_DAYS}-day line`}
          className="absolute -top-1 h-4 w-0.5 rounded-full bg-border-strong"
          style={{ left: `${(AT_RISK_INACTIVE_DAYS / max) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted" style={{ paddingLeft: `calc(${(AT_RISK_INACTIVE_DAYS / max) * 100}% - 1.5rem)` }}>
        {AT_RISK_INACTIVE_DAYS}-day line
      </p>
    </div>
  );
}

function LearnerRow({
  learner: l,
  maxDays,
  canMove,
  onMove,
}: {
  learner: CoachLearnerDto;
  maxDays: number;
  canMove: boolean;
  onMove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `learner-panel-${l.id}`;
  return (
    <Card
      as="li"
      className={cx(
        "transition-shadow hover:shadow-[0_8px_24px_-16px_rgb(0_0_0/0.35)]",
        l.atRisk && "border-danger/40",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={l.name} atRisk={l.atRisk} />
        <div className="min-w-0 grow">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/?student=${encodeURIComponent(l.id)}`}
              className="text-lg font-semibold tracking-tight underline-offset-4 hover:underline"
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
          <p className={cx("mt-0.5 text-sm", l.atRisk ? "text-danger" : "text-muted")}>{l.reason}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <InactivityMeter days={l.daysInactive} max={maxDays} />
        <div>
          <p className="mb-1.5 text-xs text-muted">
            Active {l.activeDays7}/7 days
          </p>
          <ActivityStrip days={l.activityStrip} size="sm" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className={buttonClass.ghost}
        >
          {l.courses.length} course{l.courses.length === 1 ? "" : "s"} <ChevronIcon open={open} />
        </button>
        <Link href={`/?student=${encodeURIComponent(l.id)}`} className={buttonClass.ghost}>
          Open profile <ArrowIcon />
        </Link>
        {canMove && (
          <button type="button" onClick={onMove} className={cx(buttonClass.ghost, "ml-auto text-muted")}>
            Move center…
          </button>
        )}
      </div>

      <div
        id={panelId}
        className={cx("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="overflow-hidden">
          <ul className="grid gap-3 pt-3">
            {l.courses.length === 0 && <li className="text-sm text-muted">Not enrolled in any course.</li>}
            {l.courses.map((c) => (
              <li key={c.courseId} className="rounded-xl bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{c.title}</span>
                  <StatusBadge status={c.status} daysInactive={c.daysInactive} />
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="grow">
                    <ProgressBar
                      percent={c.percent}
                      size="sm"
                      tone={c.status === "at-risk" ? "danger" : c.status === "completed" ? "success" : "ink"}
                      label={`${c.title} progress`}
                    />
                  </span>
                  <span className="text-xs tabular-nums text-muted">{c.percent}%</span>
                </div>
                <p className="mt-1 text-xs text-muted">Last active {relativeDays(c.daysInactive)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

/** Confirm a move in a native modal dialog: focus-trapped, Esc closes. Mounted per move. */
function MoveDialog({
  learner,
  targets,
  fromName,
  onClose,
  onConfirm,
}: {
  learner: CoachLearnerDto;
  targets: CenterDto[];
  fromName: string;
  onClose: () => void;
  onConfirm: (centerId: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState<string>(targets[0]?.id ?? "");
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="move-title"
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-3xl border border-border bg-surface p-0 text-foreground shadow-2xl"
    >
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (target) onConfirm(target);
        }}
      >
        <p className="font-serif text-lg italic text-muted">Change center</p>
        <h2 id="move-title" className="text-2xl font-semibold tracking-tight">
          Move {learner.name}
        </h2>
        <p className="mt-1 text-sm text-muted">From {fromName} to:</p>

        <fieldset className="mt-4 grid gap-2">
          <legend className="sr-only">New center</legend>
          {targets.map((c) => (
            <label
              key={c.id}
              className={cx(
                "flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition",
                target === c.id ? "border-foreground bg-surface-muted" : "border-border hover:bg-surface-muted",
              )}
            >
              <input
                type="radio"
                name="center"
                value={c.id}
                checked={target === c.id}
                onChange={() => setTarget(c.id)}
                className="size-4 accent-[var(--foreground)]"
              />
              <span className="font-medium">{c.name}</span>
            </label>
          ))}
        </fieldset>

        <ul className="mt-4 grid gap-1.5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          <li className="flex gap-2">
            <CheckIcon /> Courses and progress move with them
          </li>
          <li className="flex gap-2">
            <CheckIcon /> Their center history is kept
          </li>
          <li className="flex gap-2">
            <AlertIcon /> You will no longer see them in your list
          </li>
        </ul>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button type="submit" className={buttonClass.primary}>
            Confirm move
          </button>
        </div>
      </form>
    </dialog>
  );
}
