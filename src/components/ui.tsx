/** Presentational building blocks. No data fetching here. */
import type { ReactNode } from "react";
import type { CourseStatus } from "@/lib/rules";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "li";
} & Record<string, unknown>) {
  return (
    <Tag className={cx("rounded-2xl border border-border bg-surface p-4 sm:p-5", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Section heading with an optional superscript count, e.g. "Courses ⁽³⁾". */
export function SectionTitle({
  children,
  count,
  id,
  as: Tag = "h2",
}: {
  children: ReactNode;
  count?: number;
  id?: string;
  as?: "h2" | "h3";
}) {
  return (
    <Tag id={id} className="text-lg font-semibold tracking-tight">
      {children}
      {count !== undefined && <sup className="ml-0.5 text-xs font-normal text-muted">({count})</sup>}
    </Tag>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-xs font-medium text-muted", className)}>{children}</p>;
}

// ---------------------------------------------------------------------------
// Icons (decorative; meaning is always also in text)
// ---------------------------------------------------------------------------

const iconProps = { width: 14, height: 14, viewBox: "0 0 16 16", "aria-hidden": true, fill: "none" } as const;

export const CheckIcon = () => (
  <svg {...iconProps}>
    <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const AlertIcon = () => (
  <svg {...iconProps}>
    <path d="M8 1.8l6.5 12H1.5L8 1.8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M8 6.5v3.2M8 11.6v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
export const LockIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
export const ClockIcon = () => (
  <svg {...iconProps}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 4.8V8l2.2 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
export const PlusIcon = () => (
  <svg {...iconProps}>
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
export const ArrowIcon = () => (
  <svg {...iconProps}>
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const ChevronIcon = ({ open }: { open?: boolean }) => (
  <svg {...iconProps} className={cx("transition-transform duration-200", open && "rotate-180")}>
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const StarIcon = () => (
  <svg {...iconProps}>
    <path
      d="M8 1.8l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.2l-3.7 2.1.8-4.2L2 6.2l4.2-.5L8 1.8z"
      fill="currentColor"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// Badges: always icon + text, never colour alone
// ---------------------------------------------------------------------------

type Tone = "success" | "warning" | "danger" | "neutral" | "ink";

const toneClass: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-muted text-muted",
  ink: "bg-inverse text-inverse-fg",
};

export function Badge({ tone, icon, children }: { tone: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClass[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function StatusBadge({ status, daysInactive }: { status: CourseStatus | "pending"; daysInactive?: number }) {
  switch (status) {
    case "on-track":
      return (
        <Badge tone="success" icon={<CheckIcon />}>
          On track
        </Badge>
      );
    case "at-risk":
      return (
        <Badge tone="danger" icon={<AlertIcon />}>
          At risk{daysInactive !== undefined ? ` · ${daysInactive}d idle` : ""}
        </Badge>
      );
    case "completed":
      return (
        <Badge tone="neutral" icon={<CheckIcon />}>
          Completed
        </Badge>
      );
    case "pending":
      return (
        <Badge tone="ink" icon={<ClockIcon />}>
          Enrolling…
        </Badge>
      );
  }
}

/** A coloured dot that always comes with a text label next to it or in sr-only text. */
export function StatusDot({ atRisk, className }: { atRisk: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-block size-2 shrink-0 rounded-full", atRisk ? "bg-danger" : "bg-success", className)}
    />
  );
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/**
 * Thin progress bar. `marker` draws the 80% "skill earned" threshold tick so the
 * reader can see how far the learner is from earning the skill.
 */
export function ProgressBar({
  percent,
  label,
  tone = "ink",
  marker,
  size = "md",
}: {
  percent: number;
  label: string;
  tone?: "ink" | "danger" | "success" | "muted" | "inverse";
  marker?: number;
  size?: "sm" | "md";
}) {
  const fill = {
    ink: "bg-foreground",
    danger: "bg-danger",
    success: "bg-success",
    muted: "bg-muted",
    inverse: "bg-inverse-fg",
  }[tone];
  return (
    <div className="relative">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cx(
          "w-full overflow-hidden rounded-full",
          tone === "inverse" ? "bg-inverse-border" : "bg-surface-muted ring-1 ring-inset ring-border",
          size === "sm" ? "h-1.5" : "h-2",
        )}
      >
        <div
          className={cx("h-full rounded-full transition-[width] duration-700 ease-out", fill)}
          style={{ width: `${percent}%` }}
        />
      </div>
      {marker !== undefined && (
        <span
          aria-hidden
          title={`${marker}%: skill earned`}
          className={cx(
            "absolute -top-1 h-[calc(100%+8px)] w-0.5 rounded-full",
            tone === "inverse" ? "bg-inverse-muted" : "bg-border-strong",
          )}
          style={{ left: `${marker}%` }}
        />
      )}
    </div>
  );
}

/** Circular progress ring for the learning-path nodes. */
export function Ring({
  percent,
  tone,
  size = 52,
  children,
}: {
  percent: number;
  tone: "ink" | "success" | "muted";
  size?: number;
  children?: ReactNode;
}) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const stroke = { ink: "var(--foreground)", success: "var(--success)", muted: "var(--border-strong)" }[tone];
  return (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold tabular-nums">{children}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Buttons and pills
// ---------------------------------------------------------------------------

export const buttonClass = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-inverse px-5 text-sm font-medium text-inverse-fg transition hover:opacity-85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  /** For use on an inverse (dark) surface. */
  onInverse:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-inverse-fg px-5 text-sm font-medium text-inverse transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  onInverseOutline:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-inverse-border px-5 text-sm font-medium text-inverse-fg transition hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border-strong bg-surface px-5 text-sm font-medium text-foreground transition hover:bg-surface-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground transition hover:bg-surface-muted",
};

/** The floating dark segmented pill (filters, switchers). Items are links or buttons. */
export function PillBar({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0", className)}>
      <div
        role="group"
        aria-label={label}
        className="inline-flex gap-0.5 rounded-xl bg-inverse p-1 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.45)]"
      >
        {children}
      </div>
    </div>
  );
}

export function pillItemClass(active: boolean) {
  return cx(
    "inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm transition",
    active ? "bg-inverse-fg font-medium text-inverse shadow-sm" : "text-inverse-muted hover:text-inverse-fg",
  );
}

// ---------------------------------------------------------------------------
// Explainers: native popover, no JS needed
// ---------------------------------------------------------------------------

export function InfoTip({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={`What does "${label}" mean?`}
        className="inline-grid size-5 place-items-center rounded-full border border-border-strong text-[11px] font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
      >
        ?
      </button>
      <div
        id={id}
        popover="auto"
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 text-sm text-foreground shadow-2xl"
      >
        <p className="font-semibold">{label}</p>
        <div className="mt-1 text-muted">{children}</div>
        <button
          type="button"
          popoverTarget={id}
          popoverTargetAction="hide"
          className={cx(buttonClass.ghost, "-ml-3 mt-2")}
        >
          Got it
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-border/70", className)} />;
}

export function ErrorState({ title, reason, onRetry }: { title: string; reason: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-danger">
      <p className="flex items-center gap-2 font-semibold">
        <AlertIcon /> {title}
      </p>
      <p className="mt-1 text-sm">{reason}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={cx(buttonClass.secondary, "mt-3")}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong p-5 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

/** "less than a day ago", "yesterday", "5 days ago". */
export function relativeDays(days: number | null): string {
  if (days === null) return "never";
  if (days === 0) return "less than a day ago";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ name, atRisk }: { name: string; atRisk?: boolean }) {
  return (
    <span className="relative inline-grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-sm font-semibold ring-1 ring-border">
      {initials(name)}
      {atRisk !== undefined && (
        <StatusDot atRisk={atRisk} className="absolute -right-0.5 -top-0.5 size-3 ring-2 ring-surface" />
      )}
    </span>
  );
}

/** Seven small squares, one per day, oldest first. */
export function ActivityStrip({
  days,
  size = "md",
  showLabels = false,
}: {
  days: { date: string; active: boolean }[];
  size?: "sm" | "md";
  showLabels?: boolean;
}) {
  const fmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const letter = new Intl.DateTimeFormat("en-IN", { weekday: "narrow", timeZone: "UTC" });
  const activeLabels = days.filter((d) => d.active).map((d) => fmt.format(new Date(`${d.date}T00:00:00Z`)));
  return (
    <span
      role="img"
      aria-label={activeLabels.length ? `Active on ${activeLabels.join(", ")}` : "No activity in the last 7 days"}
      className="inline-flex gap-1"
    >
      {days.map((d) => {
        const date = new Date(`${d.date}T00:00:00Z`);
        return (
          <span key={d.date} className="group relative flex flex-col items-center gap-1">
            <span
              className={cx(
                "rounded-[4px] transition-transform group-hover:scale-110",
                size === "sm" ? "size-2.5" : "size-5",
                d.active ? "bg-foreground" : "bg-surface-muted ring-1 ring-inset ring-border",
              )}
            />
            {showLabels && <span className="text-[10px] text-muted">{letter.format(date)}</span>}
            <span className="pointer-events-none absolute bottom-full mb-1.5 hidden whitespace-nowrap rounded-md bg-inverse px-2 py-1 text-[11px] text-inverse-fg group-hover:block">
              {fmt.format(date)} · {d.active ? "active" : "no activity"}
            </span>
          </span>
        );
      })}
    </span>
  );
}
