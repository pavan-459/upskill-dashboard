/** Small presentational building blocks. No data fetching here. */
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
    <Tag className={cx("rounded-xl border border-border bg-surface p-4 shadow-sm", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-sm font-semibold uppercase tracking-wide text-muted">
      {children}
    </h2>
  );
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

// ---------------------------------------------------------------------------
// Badges: always icon + text, never colour alone
// ---------------------------------------------------------------------------

type Tone = "success" | "warning" | "danger" | "neutral" | "accent";

const toneClass: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-muted text-muted",
  accent: "bg-accent-soft text-accent",
};

export function Badge({ tone, icon, children }: { tone: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold",
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
        <Badge tone="accent" icon={<ClockIcon />}>
          Enrolling…
        </Badge>
      );
  }
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export function ProgressBar({
  percent,
  label,
  tone = "accent",
  size = "md",
}: {
  percent: number;
  label: string;
  tone?: "accent" | "danger" | "success" | "muted";
  size?: "sm" | "md";
}) {
  const fill = {
    accent: "bg-accent",
    danger: "bg-danger",
    success: "bg-success",
    muted: "bg-muted",
  }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx("w-full overflow-hidden rounded-full bg-surface-muted", size === "sm" ? "h-1.5" : "h-2.5")}
    >
      <div className={cx("h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${percent}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export const buttonClass = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60",
  ghost:
    "inline-flex min-h-9 items-center justify-center gap-1 rounded-md px-2 text-sm font-medium text-accent hover:bg-accent-soft",
};

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-surface-muted", className)} />;
}

export function ErrorState({ title, reason, onRetry }: { title: string; reason: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger-soft p-4 text-danger">
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
    <div className="rounded-lg border border-dashed border-border bg-surface-muted/50 p-4 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

/** "today", "yesterday", "5 days ago". */
export function relativeDays(days: number | null): string {
  if (days === null) return "never";
  if (days === 0) return "less than a day ago";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
