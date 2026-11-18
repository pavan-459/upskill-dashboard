"use client";

import { useState } from "react";
import type { PathNode, PathNodeState, PathTrack } from "@/lib/rules";
import { COMPLETE_THRESHOLD_PCT } from "@/lib/rules/constants";
import {
  ArrowIcon,
  Badge,
  buttonClass,
  Card,
  CheckIcon,
  ClockIcon,
  cx,
  LockIcon,
  PlusIcon,
  ProgressBar,
  Ring,
  SectionTitle,
  StarIcon,
} from "../ui";
import type { EnrollTarget } from "./types";

const STATE: Record<PathNodeState, { label: string; tone: "ink" | "success" | "muted" }> = {
  finished: { label: "Finished", tone: "success" },
  earned: { label: "Skills earned", tone: "success" },
  "in-progress": { label: "In progress", tone: "ink" },
  available: { label: "Open to you", tone: "muted" },
  locked: { label: "Locked", tone: "muted" },
};

function NodeGlyph({ node }: { node: PathNode }) {
  if (node.state === "finished") return <CheckIcon />;
  if (node.state === "locked") return <LockIcon />;
  if (node.state === "available") return <PlusIcon />;
  return <>{node.percent}%</>;
}

/**
 * Learning-path map: prerequisite tracks as connected nodes. Selecting a node shows
 * its details and the right action: enroll (open), go to the course (enrolled), or
 * exactly what is missing (locked: the why-locked add-on).
 */
export function LearningPath({
  tracks,
  recommendedIds,
  pendingCourseId,
  onEnroll,
  onOpenCourse,
}: {
  tracks: PathTrack[];
  recommendedIds: string[];
  pendingCourseId: string | null;
  onEnroll: (t: EnrollTarget) => void;
  onOpenCourse: (id: string) => void;
}) {
  const all = tracks.flatMap((t) => t.nodes);
  const firstInteresting =
    all.find((n) => n.state === "locked") ?? all.find((n) => recommendedIds.includes(n.courseId)) ?? all[0];
  const [selectedId, setSelectedId] = useState<string | null>(firstInteresting?.courseId ?? null);
  const selected = all.find((n) => n.courseId === selectedId) ?? null;
  const byId = new Map(all.map((n) => [n.courseId, n]));

  if (tracks.length === 0) return null;

  return (
    <Card aria-labelledby="path-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionTitle id="path-title">Learning path</SectionTitle>
        <p className="text-xs text-muted">Tap a course to see what it unlocks or why it&apos;s locked</p>
      </div>

      <div className="mt-4 grid gap-3">
        {tracks.map((track) => (
          <ol
            key={track.id}
            aria-label={`Track starting with ${track.nodes[0].title}`}
            className="flex items-start gap-0.5 overflow-x-auto rounded-2xl bg-surface-muted px-2 pb-3 pt-4 sm:gap-2 sm:px-3"
          >
            {track.nodes.map((n, i) => {
              const isSel = n.courseId === selectedId;
              const rec = recommendedIds.includes(n.courseId);
              return (
                <li key={n.courseId} className="flex items-start">
                  {i > 0 && (
                    <span aria-hidden className="mt-[32px] h-0.5 w-2.5 shrink-0 rounded-full bg-border-strong sm:w-8" />
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedId(n.courseId)}
                    aria-pressed={isSel}
                    aria-label={`${n.title}: ${STATE[n.state].label}, ${n.percent}%${rec ? ", recommended" : ""}`}
                    className={cx(
                      "relative flex w-[84px] flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 text-center transition sm:w-28",
                      isSel ? "bg-surface shadow-[0_6px_18px_-10px_rgb(0_0_0/0.4)] ring-1 ring-border-strong" : "hover:bg-surface/70",
                      n.state === "locked" && "text-muted",
                    )}
                  >
                    {rec && (
                      <span className="absolute -top-2 right-1 rounded-full bg-inverse px-1.5 py-px text-[10px] font-medium text-inverse-fg">
                        Next
                      </span>
                    )}
                    <Ring percent={n.state === "available" || n.state === "locked" ? 0 : n.percent} tone={STATE[n.state].tone}>
                      <NodeGlyph node={n} />
                    </Ring>
                    <span className="line-clamp-2 text-xs font-medium leading-tight">{n.title}</span>
                    {n.teachesGoal && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted">
                        <StarIcon /> Goal
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        ))}
      </div>

      {selected && (
        <div aria-live="polite" className="mt-4 rounded-2xl border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{selected.title}</p>
              <p className="text-xs text-muted">Teaches {selected.skills.join(", ")}</p>
            </div>
            {selected.state === "locked" ? (
              <Badge tone="neutral" icon={<LockIcon />}>
                Locked
              </Badge>
            ) : selected.state === "available" ? (
              <Badge tone="neutral" icon={<PlusIcon />}>
                Open to you
              </Badge>
            ) : (
              <Badge tone={selected.state === "in-progress" ? "ink" : "success"} icon={selected.state === "in-progress" ? <ClockIcon /> : <CheckIcon />}>
                {STATE[selected.state].label}
              </Badge>
            )}
          </div>

          {selected.state === "locked" && (
            <div className="mt-3">
              <p className="text-sm">
                <span className="font-medium">Why it&apos;s locked:</span> {selected.hint}
              </p>
              <ul className="mt-3 grid gap-3">
                {selected.prerequisites.map((pid) => {
                  const p = byId.get(pid);
                  if (!p) return null;
                  const done = p.state === "finished" || p.state === "earned";
                  return (
                    <li key={pid} className="text-xs">
                      <div className="mb-1 flex justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(pid)}
                          className="font-medium underline decoration-border-strong underline-offset-2 hover:decoration-foreground"
                        >
                          {p.title}
                        </button>
                        <span className="tabular-nums text-muted">
                          {done
                            ? "complete"
                            : p.state === "available" || p.state === "locked"
                              ? "not started"
                              : `${p.completedLessons}/${p.totalLessons} lessons`}
                        </span>
                      </div>
                      <ProgressBar percent={p.percent} marker={COMPLETE_THRESHOLD_PCT} size="sm" tone={done ? "success" : "ink"} label={`${p.title} progress`} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {(selected.state === "in-progress" || selected.state === "earned" || selected.state === "finished") && (
            <div className="mt-3">
              <ProgressBar percent={selected.percent} marker={COMPLETE_THRESHOLD_PCT} label={`${selected.title} progress`} tone={selected.state === "in-progress" ? "ink" : "success"} />
              <p className="mt-1.5 text-xs text-muted">
                {selected.completedLessons} of {selected.totalLessons} lessons · {selected.percent}%
                {selected.state === "in-progress" ? "" : " · unlocks the next course"}
              </p>
              <button type="button" onClick={() => onOpenCourse(selected.courseId)} className={cx(buttonClass.ghost, "-ml-3 mt-2")}>
                Open in My courses <ArrowIcon />
              </button>
            </div>
          )}

          {selected.state === "available" && (
            <div className="mt-3">
              <p className="text-sm text-muted">All prerequisites are done. You can start this now.</p>
              <button
                type="button"
                disabled={pendingCourseId !== null}
                onClick={() =>
                  onEnroll({
                    courseId: selected.courseId,
                    title: selected.title,
                    totalLessons: selected.totalLessons,
                    skills: selected.skills,
                  })
                }
                aria-label={`Enroll in ${selected.title}`}
                className={cx(buttonClass.primary, "mt-3 w-full sm:w-auto")}
              >
                {pendingCourseId === selected.courseId ? (
                  <>
                    <ClockIcon /> Enrolling…
                  </>
                ) : (
                  <>
                    <PlusIcon /> Enroll
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
