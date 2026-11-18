/** What the UI needs to enroll in a course and draw it optimistically. */
export interface EnrollTarget {
  courseId: string;
  title: string;
  totalLessons: number;
  skills: string[];
}
