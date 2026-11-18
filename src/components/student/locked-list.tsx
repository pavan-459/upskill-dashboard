import type { LockedCourseDto } from "@/lib/dto";
import { Card, LockIcon, ProgressBar } from "../ui";

/** Why-locked add-on: exactly which prerequisites are missing and how far along each is. */
export function LockedList({ locked }: { locked: LockedCourseDto[] }) {
  if (locked.length === 0) return null;
  return (
    <Card aria-labelledby="locked-title">
      <details className="group">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 rounded-md">
          <h2 id="locked-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <LockIcon /> Locked for now ({locked.length})
          </h2>
          <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <ul className="mt-3 grid gap-3">
          {locked.map((c) => (
            <li key={c.courseId} className="rounded-lg bg-surface-muted p-3">
              <p className="flex items-center gap-1.5 font-medium">
                <LockIcon /> {c.title}
              </p>
              <p className="mt-0.5 text-sm text-muted">{c.hint}</p>
              <ul className="mt-2 grid gap-2">
                {c.missing.map((m) => (
                  <li key={m.courseId} className="text-xs">
                    <div className="mb-1 flex justify-between gap-2 text-muted">
                      <span>{m.title}</span>
                      <span className="tabular-nums">
                        {m.enrolled ? `${m.completedLessons}/${m.totalLessons} lessons` : "not started"}
                      </span>
                    </div>
                    <ProgressBar percent={m.percent} label={`${m.title} progress`} size="sm" tone="muted" />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
