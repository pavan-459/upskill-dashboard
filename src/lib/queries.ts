/**
 * The only module that talks to Prisma. Route handlers call these functions; rule
 * logic stays in src/lib/rules (pure). Every function takes `now` explicitly.
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import type {
  CenterDto,
  GoalProgressDto,
  CoachLearnerDto,
  CoachLearnersDto,
  CoachListItem,
  CourseProgressDto,
  LockedCourseDto,
  MoveResultDto,
  RecommendationDto,
  StudentDashboardDto,
  StudentListItem,
} from "./dto";
import { alreadyEnrolled, conflict, forbidden, ineligible, isUniqueViolation, notFound } from "./errors";
import {
  activeDaysInWindow,
  activityStrip,
  catalogFrom,
  courseRisk,
  DAY_MS,
  earnedSkills,
  isEligible,
  learnerRisk,
  learningPath,
  lessonsToComplete,
  lockedHint,
  missingPrerequisites,
  percentComplete,
  recommendAlternative,
  recommendNext,
  type CourseCatalog,
  type CourseInfo,
  type CourseStatus,
  type EnrollmentInfo,
  type Recommendation,
} from "./rules";

/** Only events this recent can count towards "active days" (8 days covers any IST offset). */
const ACTIVITY_LOOKBACK_MS = 8 * DAY_MS;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export async function loadCatalog(): Promise<CourseCatalog> {
  const courses = await prisma.course.findMany({
    orderBy: { id: "asc" },
    include: {
      skills: { include: { skill: true }, orderBy: { skill: { name: "asc" } } },
      prerequisites: { orderBy: { prerequisiteCourseId: "asc" } },
    },
  });
  return catalogFrom(
    courses.map(
      (c): CourseInfo => ({
        id: c.id,
        title: c.title,
        totalLessons: c.totalLessons,
        skills: c.skills.map((s) => s.skill.name),
        prerequisites: c.prerequisites.map((p) => p.prerequisiteCourseId),
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

const openMembership = { where: { endedAt: null }, include: { center: true } } as const;

export async function listStudents(now: Date): Promise<StudentListItem[]> {
  const learners = await prisma.learner.findMany({
    orderBy: { name: "asc" },
    include: { memberships: openMembership, enrollments: true },
  });
  const [catalog, lastByCourse] = await Promise.all([loadCatalog(), lastActivityByCourse(learners.map((l) => l.id))]);
  return learners.map((l) => {
    const enrollments: EnrollmentInfo[] = l.enrollments.map((e) => ({
      courseId: e.courseId,
      completedLessons: e.completedLessons,
      enrolledAt: e.enrolledAt,
      lastActivityAt: lastByCourse.get(`${l.id}:${e.courseId}`) ?? null,
    }));
    return {
      id: l.id,
      name: l.name,
      centerName: l.memberships[0]?.center.name ?? null,
      atRisk: learnerRisk(catalog, enrollments, null, now).atRisk,
    };
  });
}

/** Latest activity per (learner, course) for a set of learners. */
async function lastActivityByCourse(learnerIds: string[]) {
  const rows = await prisma.activityEvent.groupBy({
    by: ["learnerId", "courseId"],
    where: { learnerId: { in: learnerIds } },
    _max: { occurredAt: true },
  });
  const map = new Map<string, Date>();
  for (const r of rows) if (r._max.occurredAt) map.set(`${r.learnerId}:${r.courseId}`, r._max.occurredAt);
  return map;
}

async function recentEventTimes(learnerIds: string[], now: Date) {
  const rows = await prisma.activityEvent.findMany({
    where: { learnerId: { in: learnerIds }, occurredAt: { gte: new Date(now.getTime() - ACTIVITY_LOOKBACK_MS) } },
    select: { learnerId: true, occurredAt: true },
  });
  const map = new Map<string, Date[]>();
  for (const r of rows) map.set(r.learnerId, [...(map.get(r.learnerId) ?? []), r.occurredAt]);
  return map;
}

function toRecommendationDto(r: Recommendation, catalog: CourseCatalog): RecommendationDto {
  const course = r.courseId ? catalog.get(r.courseId) : undefined;
  return {
    ...r,
    courseTitle: course?.title ?? null,
    courseTotalLessons: course?.totalLessons ?? null,
    courseSkills: course?.skills ?? [],
  };
}

const STATUS_ORDER: Record<CourseStatus, number> = { "at-risk": 0, "on-track": 1, completed: 2 };

export async function getStudentDashboard(learnerId: string, now: Date): Promise<StudentDashboardDto> {
  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
    include: {
      memberships: openMembership,
      goals: { include: { skill: true } },
      enrollments: true,
    },
  });
  if (!learner) throw notFound("Student");

  const [catalog, lastByCourse, recent] = await Promise.all([
    loadCatalog(),
    lastActivityByCourse([learnerId]),
    recentEventTimes([learnerId], now),
  ]);

  const enrollments: EnrollmentInfo[] = learner.enrollments.map((e) => ({
    courseId: e.courseId,
    completedLessons: e.completedLessons,
    enrolledAt: e.enrolledAt,
    lastActivityAt: lastByCourse.get(`${learnerId}:${e.courseId}`) ?? null,
  }));
  const goals = learner.goals.map((g) => g.skill.name).sort();
  const earned = earnedSkills(catalog, enrollments);
  const earnedSet = new Set(earned);
  const events = recent.get(learnerId) ?? [];

  const courses: CourseProgressDto[] = enrollments
    .filter((e) => catalog.has(e.courseId))
    .map((e) => {
      const course = catalog.get(e.courseId)!;
      const risk = courseRisk(e, course.totalLessons, now);
      return {
        courseId: course.id,
        title: course.title,
        skills: course.skills,
        completedLessons: e.completedLessons,
        totalLessons: course.totalLessons,
        percent: percentComplete(e.completedLessons, course.totalLessons),
        status: risk.status,
        daysInactive: risk.daysInactive,
        lastActivityAt: risk.lastActivityAt.toISOString(),
        enrolledAt: e.enrolledAt.toISOString(),
        prerequisiteWarning: lockedHint(missingPrerequisites(course.id, catalog, enrollments)),
      };
    })
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.enrolledAt.localeCompare(a.enrolledAt),
    );

  const input = { catalog, goals, enrollments };
  const recommendation = recommendNext(input);
  const alternative = recommendAlternative(input, recommendation);

  const enrolledIds = new Set(enrollments.map((e) => e.courseId));
  const locked: LockedCourseDto[] = [...catalog.values()]
    .filter((c) => !enrolledIds.has(c.id))
    .map((c) => ({ c, missing: missingPrerequisites(c.id, catalog, enrollments) }))
    .filter(({ missing }) => missing.length > 0)
    .map(({ c, missing }) => ({
      courseId: c.id,
      title: c.title,
      hint: lockedHint(missing)!,
      missing: missing.map((m) => ({ ...m, percent: percentComplete(m.completedLessons, m.totalLessons) })),
    }));

  const risk = learnerRisk(catalog, enrollments, null, now);
  const byCourse = new Map(enrollments.map((e) => [e.courseId, e]));
  const goalProgress: GoalProgressDto[] = goals.map((skill) => {
    // Best route to the skill: an enrolled course (most progress), else an open one, else any.
    const teaching = [...catalog.values()].filter((c) => c.skills.includes(skill));
    const score = (id: string) => {
      const e = byCourse.get(id);
      if (e) return 2 + e.completedLessons / catalog.get(id)!.totalLessons;
      return isEligible(id, catalog, enrollments) ? 1 : 0;
    };
    const pick = teaching.sort((a, b) => score(b.id) - score(a.id) || a.id.localeCompare(b.id))[0];
    const done = pick ? (byCourse.get(pick.id)?.completedLessons ?? 0) : 0;
    return {
      skill,
      earned: earnedSet.has(skill),
      course: pick
        ? {
            courseId: pick.id,
            title: pick.title,
            percent: percentComplete(done, pick.totalLessons),
            enrolled: byCourse.has(pick.id),
            lessonsToEarn: lessonsToComplete(done, pick.totalLessons),
          }
        : null,
    };
  });

  return {
    learner: { id: learner.id, name: learner.name, centerName: learner.memberships[0]?.center.name ?? null },
    status: { atRisk: risk.atRisk, reason: risk.reason, daysInactive: risk.daysInactive },
    goals: goals.map((skill) => ({ skill, earned: earnedSet.has(skill) })),
    goalProgress,
    path: learningPath(catalog, enrollments, goals, [recommendation.courseId, alternative?.courseId ?? null]),
    earnedSkills: earned,
    activeDays7: activeDaysInWindow(events, now),
    activityStrip: activityStrip(events, now),
    courses,
    recommendation: toRecommendationDto(recommendation, catalog),
    alternative: alternative ? toRecommendationDto(alternative, catalog) : null,
    locked,
    generatedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Enroll
// ---------------------------------------------------------------------------

/**
 * Enroll a learner. Eligibility is checked on the server inside the transaction.
 * 404 unknown learner/course, 409 already enrolled, 400 ineligible (with the why-locked hint).
 */
export async function enroll(learnerId: string, courseId: string, now: Date): Promise<void> {
  const catalog = await loadCatalog();
  if (!catalog.has(courseId)) throw notFound("Course");
  try {
    await prisma.$transaction(async (tx) => {
      const learner = await tx.learner.findUnique({ where: { id: learnerId }, include: { enrollments: true } });
      if (!learner) throw notFound("Student");
      if (learner.enrollments.some((e) => e.courseId === courseId)) throw alreadyEnrolled();

      const missing = missingPrerequisites(
        courseId,
        catalog,
        learner.enrollments.map((e) => ({ ...e, lastActivityAt: null })),
      );
      if (missing.length > 0) throw ineligible(lockedHint(missing)!);

      await tx.enrollment.create({ data: { learnerId, courseId, enrolledAt: now, completedLessons: 0 } });
      await tx.activityEvent.create({ data: { learnerId, courseId, kind: "ENROLLED", occurredAt: now } });
    });
  } catch (err) {
    // Two concurrent enrolls: the unique (learner_id, course_id) key decides.
    if (isUniqueViolation(err)) throw alreadyEnrolled();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Coaches (center-scoped)
// ---------------------------------------------------------------------------

/**
 * THE coach scoping filter. Every query that returns learners to a coach must use
 * it: a learner is visible only while their open membership is at the coach's center.
 */
export function visibleToCoachWhere(centerId: string): Prisma.LearnerWhereInput {
  return { memberships: { some: { centerId, endedAt: null } } };
}

async function getCoach(coachId: string): Promise<CoachListItem> {
  const coach = await prisma.coach.findUnique({ where: { id: coachId }, include: { center: true } });
  if (!coach) throw notFound("Coach");
  return { id: coach.id, name: coach.name, centerId: coach.centerId, centerName: coach.center.name };
}

export async function listCoaches(): Promise<CoachListItem[]> {
  const coaches = await prisma.coach.findMany({ orderBy: { name: "asc" }, include: { center: true } });
  return coaches.map((c) => ({ id: c.id, name: c.name, centerId: c.centerId, centerName: c.center.name }));
}

export async function learnersVisibleToCoach(coachId: string, now: Date): Promise<CoachLearnersDto> {
  const coach = await getCoach(coachId);
  const learners = await prisma.learner.findMany({
    where: visibleToCoachWhere(coach.centerId),
    include: { enrollments: true, memberships: { where: { endedAt: null } } },
  });
  const ids = learners.map((l) => l.id);
  const [catalog, lastByCourse, recent] = await Promise.all([
    loadCatalog(),
    lastActivityByCourse(ids),
    recentEventTimes(ids, now),
  ]);

  const rows: CoachLearnerDto[] = learners.map((l) => {
    const enrollments: EnrollmentInfo[] = l.enrollments.map((e) => ({
      courseId: e.courseId,
      completedLessons: e.completedLessons,
      enrolledAt: e.enrolledAt,
      lastActivityAt: lastByCourse.get(`${l.id}:${e.courseId}`) ?? null,
    }));
    const risk = learnerRisk(catalog, enrollments, null, now);
    const activeCourses = enrollments.filter(
      (e) => catalog.has(e.courseId) && courseRisk(e, catalog.get(e.courseId)!.totalLessons, now).status !== "completed",
    ).length;
    return {
      id: l.id,
      name: l.name,
      atRisk: risk.atRisk,
      reason: risk.reason,
      daysInactive: risk.daysInactive,
      lastActivityAt: risk.lastActivityAt?.toISOString() ?? null,
      activeDays7: activeDaysInWindow(recent.get(l.id) ?? [], now),
      activeCourses,
      atRiskCourses: risk.atRiskCourseIds.map((id) => catalog.get(id)!.title),
      memberSince: l.memberships[0].startedAt.toISOString(),
      activityStrip: activityStrip(recent.get(l.id) ?? [], now),
      courses: enrollments
        .filter((e) => catalog.has(e.courseId))
        .map((e) => {
          const c = catalog.get(e.courseId)!;
          const r = courseRisk(e, c.totalLessons, now);
          return {
            courseId: c.id,
            title: c.title,
            percent: percentComplete(e.completedLessons, c.totalLessons),
            status: r.status,
            daysInactive: r.daysInactive,
          };
        })
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.title.localeCompare(b.title)),
    };
  });

  // At-risk first, then longest inactive (never active counts as most inactive), then name.
  const inactivity = (r: CoachLearnerDto) => r.daysInactive ?? Number.POSITIVE_INFINITY;
  rows.sort(
    (a, b) =>
      Number(b.atRisk) - Number(a.atRisk) || inactivity(b) - inactivity(a) || a.name.localeCompare(b.name),
  );

  return { coach, atRiskCount: rows.filter((r) => r.atRisk).length, learners: rows, generatedAt: now.toISOString() };
}

// ---------------------------------------------------------------------------
// Centers and moves
// ---------------------------------------------------------------------------

export async function listCenters(): Promise<CenterDto[]> {
  return prisma.center.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

/**
 * Move a learner to another center: close the open membership and open a new one,
 * in one transaction. History is kept; enrollments and activity do not change.
 * When `actingCoachId` is given, the coach must currently see the learner (403).
 */
export async function moveLearner(
  learnerId: string,
  centerId: string,
  now: Date,
  actingCoachId?: string,
): Promise<MoveResultDto> {
  try {
    return await prisma.$transaction(async (tx) => {
      const learner = await tx.learner.findUnique({ where: { id: learnerId } });
      if (!learner) throw notFound("Student");
      const to = await tx.center.findUnique({ where: { id: centerId }, select: { id: true, name: true } });
      if (!to) throw notFound("Center");

      const open = await tx.learnerCenterMembership.findFirst({
        where: { learnerId, endedAt: null },
        include: { center: { select: { id: true, name: true } } },
      });

      if (actingCoachId) {
        const coach = await tx.coach.findUnique({ where: { id: actingCoachId } });
        if (!coach) throw notFound("Coach");
        if (open?.centerId !== coach.centerId) throw forbidden("This learner is not at your center");
      }
      if (open?.centerId === centerId) throw conflict(`${learner.name} is already at ${to.name}`);

      if (open) {
        await tx.learnerCenterMembership.update({ where: { id: open.id }, data: { endedAt: now } });
      }
      await tx.learnerCenterMembership.create({ data: { learnerId, centerId, startedAt: now } });
      return { learnerId, from: open?.center ?? null, to, movedAt: now.toISOString() };
    });
  } catch (err) {
    // A concurrent move already opened a membership: the partial unique index decides.
    if (isUniqueViolation(err)) throw conflict("This learner was just moved. Refresh and try again.");
    throw err;
  }
}
