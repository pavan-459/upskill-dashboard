/**
 * Seeds Postgres from /seed/*.json. Idempotent: wipes and rewrites every table.
 *
 * Timestamp decision: every seed timestamp is shifted by the same whole number of
 * days so the latest one lands within the 24h before "now" (see seedShiftMs).
 * Re-run `npm run db:seed` to refresh the demo after a few days.
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/db";
import { seedShiftMs, shift } from "../src/lib/rules/seed-shift";
import { loadSeed } from "../src/lib/seed-data";
import { getNow } from "../src/lib/time";

const prisma = createPrismaClient();

async function main() {
  const data = loadSeed();
  const now = getNow();

  const allTimestamps = [
    ...data.enrollments.map((e) => new Date(e.enrolledAt)),
    ...data.progress.map((p) => new Date(p.lastActiveAt)),
  ];
  const offset = seedShiftMs(allTimestamps, now);
  const at = (iso: string) => shift(new Date(iso), offset);

  await prisma.$transaction(async (tx) => {
    // Children first.
    await tx.activityEvent.deleteMany();
    await tx.enrollment.deleteMany();
    await tx.learnerGoal.deleteMany();
    await tx.learnerCenterMembership.deleteMany();
    await tx.learner.deleteMany();
    await tx.coach.deleteMany();
    await tx.center.deleteMany();
    await tx.coursePrerequisite.deleteMany();
    await tx.courseSkill.deleteMany();
    await tx.course.deleteMany();
    await tx.skill.deleteMany();

    // Shared catalog.
    const skillNames = new Set<string>([
      ...data.courses.flatMap((c) => c.skills),
      ...data.students.flatMap((s) => s.goals),
    ]);
    await tx.skill.createMany({ data: [...skillNames].sort().map((name) => ({ name })) });
    const skillId = new Map((await tx.skill.findMany()).map((s) => [s.name, s.id]));

    await tx.course.createMany({
      data: data.courses.map((c) => ({ id: c.id, title: c.title, totalLessons: c.totalLessons })),
    });
    await tx.courseSkill.createMany({
      data: data.courses.flatMap((c) => c.skills.map((s) => ({ courseId: c.id, skillId: skillId.get(s)! }))),
    });
    await tx.coursePrerequisite.createMany({
      data: data.courses.flatMap((c) =>
        c.prerequisites.map((p) => ({ courseId: c.id, prerequisiteCourseId: p })),
      ),
    });

    // Centers and coaches (added by us; not in the original seed).
    await tx.center.createMany({ data: data.centers.centers });
    await tx.coach.createMany({ data: data.centers.coaches });

    // Learners, goals, memberships.
    await tx.learner.createMany({ data: data.students.map((s) => ({ id: s.id, name: s.name })) });
    await tx.learnerGoal.createMany({
      data: data.students.flatMap((s) => s.goals.map((g) => ({ learnerId: s.id, skillId: skillId.get(g)! }))),
    });
    await tx.learnerCenterMembership.createMany({
      data: data.centers.memberships.map((m) => {
        const firstEnrollment = data.enrollments
          .filter((e) => e.studentId === m.studentId)
          .map((e) => at(e.enrolledAt).getTime());
        const startedAt = firstEnrollment.length ? new Date(Math.min(...firstEnrollment)) : now;
        return { learnerId: m.studentId, centerId: m.centerId, startedAt };
      }),
    });

    // Progress.
    const progressFor = (studentId: string, courseId: string) =>
      data.progress.find((p) => p.studentId === studentId && p.courseId === courseId);
    await tx.enrollment.createMany({
      data: data.enrollments.map((e) => ({
        learnerId: e.studentId,
        courseId: e.courseId,
        enrolledAt: at(e.enrolledAt),
        completedLessons: progressFor(e.studentId, e.courseId)?.completedLessons ?? 0,
      })),
    });
    // One activity event per progress row (the seed has no activity log).
    await tx.activityEvent.createMany({
      data: data.progress.map((p) => ({
        learnerId: p.studentId,
        courseId: p.courseId,
        kind: "PROGRESS" as const,
        occurredAt: at(p.lastActiveAt),
      })),
    });
  });

  const days = Math.round(offset / 86_400_000);
  console.log(
    `Seeded ${data.students.length} learners, ${data.courses.length} courses, ` +
      `${data.centers.centers.length} centers. Timestamps shifted by ${days} days (now = ${now.toISOString()}).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
