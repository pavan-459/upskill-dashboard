-- CreateEnum
CREATE TYPE "activity_kind" AS ENUM ('ENROLLED', 'PROGRESS');

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "total_lessons" INTEGER NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_skills" (
    "course_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,

    CONSTRAINT "course_skills_pkey" PRIMARY KEY ("course_id","skill_id")
);

-- CreateTable
CREATE TABLE "course_prerequisites" (
    "course_id" TEXT NOT NULL,
    "prerequisite_course_id" TEXT NOT NULL,

    CONSTRAINT "course_prerequisites_pkey" PRIMARY KEY ("course_id","prerequisite_course_id")
);

-- CreateTable
CREATE TABLE "centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_center_memberships" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "learner_center_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_goals" (
    "learner_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,

    CONSTRAINT "learner_goals_pkey" PRIMARY KEY ("learner_id","skill_id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_lessons" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "kind" "activity_kind" NOT NULL DEFAULT 'PROGRESS',
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "course_skills_skill_id_idx" ON "course_skills"("skill_id");

-- CreateIndex
CREATE INDEX "course_prerequisites_prerequisite_course_id_idx" ON "course_prerequisites"("prerequisite_course_id");

-- CreateIndex
CREATE UNIQUE INDEX "centers_name_key" ON "centers"("name");

-- CreateIndex
CREATE INDEX "coaches_center_id_idx" ON "coaches"("center_id");

-- CreateIndex
CREATE INDEX "learner_center_memberships_open_by_center" ON "learner_center_memberships"("center_id") WHERE (ended_at IS NULL);

-- CreateIndex
CREATE INDEX "learner_center_memberships_learner_id_started_at_idx" ON "learner_center_memberships"("learner_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "learner_center_memberships_one_open_per_learner" ON "learner_center_memberships"("learner_id") WHERE (ended_at IS NULL);

-- CreateIndex
CREATE INDEX "learner_goals_skill_id_idx" ON "learner_goals"("skill_id");

-- CreateIndex
CREATE INDEX "enrollments_course_id_idx" ON "enrollments"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_learner_id_course_id_key" ON "enrollments"("learner_id", "course_id");

-- CreateIndex
CREATE INDEX "activity_events_learner_id_occurred_at_idx" ON "activity_events"("learner_id", "occurred_at");

-- CreateIndex
CREATE INDEX "activity_events_learner_id_course_id_occurred_at_idx" ON "activity_events"("learner_id", "course_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "course_skills" ADD CONSTRAINT "course_skills_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_skills" ADD CONSTRAINT "course_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_prerequisite_course_id_fkey" FOREIGN KEY ("prerequisite_course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_center_memberships" ADD CONSTRAINT "learner_center_memberships_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_center_memberships" ADD CONSTRAINT "learner_center_memberships_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_goals" ADD CONSTRAINT "learner_goals_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_goals" ADD CONSTRAINT "learner_goals_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written constraints (Prisma schema language cannot express CHECKs)
-- ---------------------------------------------------------------------------

-- A course cannot be its own prerequisite.
ALTER TABLE "course_prerequisites"
  ADD CONSTRAINT "course_prerequisites_no_self_reference"
  CHECK ("course_id" <> "prerequisite_course_id");

ALTER TABLE "courses"
  ADD CONSTRAINT "courses_total_lessons_positive"
  CHECK ("total_lessons" > 0);

-- Upper bound (<= courses.total_lessons) is cross-table; enforced in the write path.
ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_completed_lessons_non_negative"
  CHECK ("completed_lessons" >= 0);

ALTER TABLE "learner_center_memberships"
  ADD CONSTRAINT "learner_center_memberships_valid_range"
  CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at");
