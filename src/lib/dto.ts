/**
 * JSON shapes returned by the API. Shared by route handlers and client components
 * (type-only), so the UI and server cannot drift. Dates are ISO strings.
 */
import type { CourseStatus, PathTrack, RecommendationKind } from "./rules";

export interface StudentListItem {
  id: string;
  name: string;
  centerName: string | null;
  atRisk: boolean;
}

export interface CourseProgressDto {
  courseId: string;
  title: string;
  skills: string[];
  completedLessons: number;
  totalLessons: number;
  percent: number;
  status: CourseStatus;
  daysInactive: number;
  lastActivityAt: string;
  enrolledAt: string;
  /** Set when the learner is enrolled but a prerequisite is not complete (data drift). */
  prerequisiteWarning: string | null;
  /** Client-only: true while an optimistic enroll is in flight. */
  pending?: boolean;
}

export interface RecommendationDto {
  kind: RecommendationKind;
  courseId: string | null;
  courseTitle: string | null;
  /** Lets the client render an optimistic course card before the server answers. */
  courseTotalLessons: number | null;
  courseSkills: string[];
  reason: string;
  goalSkills: string[];
  canEnroll: boolean;
}

export interface LockedCourseDto {
  courseId: string;
  title: string;
  hint: string;
  missing: {
    courseId: string;
    title: string;
    enrolled: boolean;
    completedLessons: number;
    totalLessons: number;
    lessonsLeft: number;
    percent: number;
  }[];
}

export interface GoalProgressDto {
  skill: string;
  earned: boolean;
  /** The course that best gets the learner to this skill (enrolled first, then open, then any). */
  course: {
    courseId: string;
    title: string;
    percent: number;
    enrolled: boolean;
    /** Lessons until the skill is earned (the 80% threshold). */
    lessonsToEarn: number;
  } | null;
}

export interface StudentDashboardDto {
  learner: { id: string; name: string; centerName: string | null };
  /** Learner-level status (same rule the coach sees). */
  status: { atRisk: boolean; reason: string; daysInactive: number | null };
  goals: { skill: string; earned: boolean }[];
  goalProgress: GoalProgressDto[];
  /** Prerequisite tracks relevant to this learner, for the learning-path map. */
  path: PathTrack[];
  earnedSkills: string[];
  activeDays7: number;
  /** One entry per day in the window, oldest first: { date: YYYY-MM-DD, active }. */
  activityStrip: { date: string; active: boolean }[];
  courses: CourseProgressDto[];
  recommendation: RecommendationDto;
  alternative: RecommendationDto | null;
  locked: LockedCourseDto[];
  generatedAt: string;
}

export interface CoachListItem {
  id: string;
  name: string;
  centerId: string;
  centerName: string;
}

export interface CoachLearnerDto {
  id: string;
  name: string;
  atRisk: boolean;
  reason: string;
  daysInactive: number | null;
  lastActivityAt: string | null;
  activeDays7: number;
  activeCourses: number;
  atRiskCourses: string[];
  memberSince: string;
  activityStrip: { date: string; active: boolean }[];
  courses: { courseId: string; title: string; percent: number; status: CourseStatus; daysInactive: number }[];
}

export interface CoachLearnersDto {
  coach: CoachListItem;
  atRiskCount: number;
  learners: CoachLearnerDto[];
  generatedAt: string;
}

export interface CenterDto {
  id: string;
  name: string;
}

export interface MoveResultDto {
  learnerId: string;
  from: CenterDto | null;
  to: CenterDto;
  movedAt: string;
}

export interface ApiErrorBody {
  error: string;
  reason: string;
}
