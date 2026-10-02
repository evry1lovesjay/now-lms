import "server-only";
import { db } from "@/lib/db";
import { canManageContent } from "@/lib/roles";
import type { SessionUser } from "@/lib/auth";

/**
 * Can this user watch lessons in this course?
 * Admins: always. Tutors: if assigned to the course. Students: if enrolled.
 */
export async function canAccessCourse(user: SessionUser, courseId: string): Promise<boolean> {
  if (canManageContent(user.role)) return true;
  if (user.role === "TUTOR") {
    return !!(await db.courseTutor.findUnique({
      where: { tutorId_courseId: { tutorId: user.id, courseId } },
      select: { id: true },
    }));
  }
  return !!(await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  }));
}
