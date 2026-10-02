import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canTeachCourse } from "@/lib/access";
import { LessonManager } from "@/components/lessons/lesson-manager";

/** Lesson management for everyone who teaches the course: admins and its assigned tutors. */
export default async function ManageLessonsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(["SUPERADMIN", "CONTENT_ADMIN", "TUTOR"]);

  const course = await db.course.findUnique({
    where: { slug },
    include: { lessons: { orderBy: { position: "asc" } } },
  });
  if (!course) notFound();
  if (!(await canTeachCourse(user, course.id))) redirect(`/courses/${slug}`);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/courses/${slug}`} className="text-sm text-brand-700 hover:underline">
          ← {course.title}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Manage lessons</h1>
        <p className="text-sm text-slate-600">Upload videos, edit lesson details and set the order learners see.</p>
      </div>
      <LessonManager course={course} lessons={course.lessons} />
    </div>
  );
}
