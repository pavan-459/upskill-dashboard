import { isEligible, lockedHint, missingPrerequisites } from "./eligibility";
import { isComplete, isFinished, percentComplete } from "./progress";
import type { CourseCatalog, EnrollmentInfo } from "./types";

/**
 * Learning-path map: the learner's courses laid out as prerequisite tracks.
 * Pure, so the UI only draws what this returns.
 */
export type PathNodeState =
  | "finished" // 100%
  | "earned" // >= threshold: skills earned, unlocks the next course
  | "in-progress" // enrolled, below threshold
  | "available" // not enrolled, every prerequisite complete
  | "locked"; // not enrolled, a prerequisite is missing

export interface PathNode {
  courseId: string;
  title: string;
  state: PathNodeState;
  percent: number;
  completedLessons: number;
  totalLessons: number;
  skills: string[];
  prerequisites: string[];
  /** Longest prerequisite chain below this course (0 = no prerequisites). */
  depth: number;
  teachesGoal: boolean;
  /** Why-locked text for locked nodes. */
  hint: string | null;
}

export interface PathTrack {
  id: string;
  nodes: PathNode[];
}

function depthOf(id: string, catalog: CourseCatalog, memo: Map<string, number>, seen = new Set<string>()): number {
  if (memo.has(id)) return memo.get(id)!;
  if (seen.has(id)) throw new Error(`Prerequisite cycle at ${id}`);
  seen.add(id);
  const prereqs = catalog.get(id)?.prerequisites ?? [];
  const d = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map((p) => depthOf(p, catalog, memo, seen)));
  memo.set(id, d);
  return d;
}

/** Courses linked by prerequisites (in either direction) form one track. */
function tracksOf(catalog: CourseCatalog): string[][] {
  const neighbours = new Map<string, Set<string>>();
  for (const c of catalog.values()) neighbours.set(c.id, new Set());
  for (const c of catalog.values()) {
    for (const p of c.prerequisites) {
      neighbours.get(c.id)?.add(p);
      neighbours.get(p)?.add(c.id);
    }
  }
  const seen = new Set<string>();
  const tracks: string[][] = [];
  for (const id of [...catalog.keys()].sort()) {
    if (seen.has(id)) continue;
    const stack = [id];
    const track: string[] = [];
    seen.add(id);
    while (stack.length) {
      const cur = stack.pop()!;
      track.push(cur);
      for (const n of neighbours.get(cur) ?? []) {
        if (seen.has(n)) continue;
        seen.add(n);
        stack.push(n);
      }
    }
    tracks.push(track);
  }
  return tracks;
}

/**
 * Tracks relevant to this learner: any track holding an enrolled course, a course
 * that teaches a goal skill, or one of `alsoInclude` (e.g. the recommendations).
 * Not a catalog: unrelated tracks are left out.
 */
export function learningPath(
  catalog: CourseCatalog,
  enrollments: EnrollmentInfo[],
  goals: string[],
  alsoInclude: (string | null)[] = [],
): PathTrack[] {
  const byCourse = new Map(enrollments.map((e) => [e.courseId, e]));
  const goalSet = new Set(goals);
  const memo = new Map<string, number>();
  const relevant = new Set<string>([...byCourse.keys(), ...alsoInclude.filter((x): x is string => Boolean(x))]);
  for (const c of catalog.values()) if (c.skills.some((s) => goalSet.has(s))) relevant.add(c.id);

  return tracksOf(catalog)
    .filter((track) => track.some((id) => relevant.has(id)))
    .map((track) => {
      const nodes: PathNode[] = track.map((id) => {
        const course = catalog.get(id)!;
        const e = byCourse.get(id);
        const done = e?.completedLessons ?? 0;
        let state: PathNodeState;
        let hint: string | null = null;
        if (e) {
          state = isFinished(done, course.totalLessons)
            ? "finished"
            : isComplete(done, course.totalLessons)
              ? "earned"
              : "in-progress";
        } else if (isEligible(id, catalog, enrollments)) {
          state = "available";
        } else {
          state = "locked";
          hint = lockedHint(missingPrerequisites(id, catalog, enrollments));
        }
        return {
          courseId: id,
          title: course.title,
          state,
          percent: percentComplete(done, course.totalLessons),
          completedLessons: done,
          totalLessons: course.totalLessons,
          skills: course.skills,
          prerequisites: course.prerequisites,
          depth: depthOf(id, catalog, memo),
          teachesGoal: course.skills.some((s) => goalSet.has(s)),
          hint,
        };
      });
      nodes.sort((a, b) => a.depth - b.depth || a.courseId.localeCompare(b.courseId));
      return { id: nodes[0].courseId, nodes };
    });
}
