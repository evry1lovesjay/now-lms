import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assignTutor, unassignTutor } from "@/actions/content";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/badges";
import { CourseForm } from "./course-form";
import { LessonManager } from "@/components/lessons/lesson-manager";

export default async function AdminCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["SUPERADMIN", "CONTENT_ADMIN"]);
  const { id } = await params;

  const course = await db.course.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: { position: "asc" } },
      tutors: { include: { tutor: { select: { id: true, name: true, email: true, status: true } } } },
    },
  });
  if (!course) notFound();

  const assigned = new Set(course.tutors.map((t) => t.tutorId));
  const availableTutors = await db.user.findMany({
    where: { role: "TUTOR", status: "ACTIVE", id: { notIn: [...assigned] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{course.title}</h2>
        <div className="flex flex-wrap gap-2">
          <Link href={`/courses/${course.slug}`} className="btn-secondary">
            Outline, materials & resources
          </Link>
          <Link href={`/courses/${course.slug}/assignments`} className="btn-secondary">
            Assignments
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LessonManager course={course} lessons={course.lessons} />
        </div>

        <div className="space-y-6">
          <section className="card space-y-3">
            <h3 className="font-semibold">Tutors</h3>
            {course.tutors.length === 0 && <p className="text-sm text-slate-500">No tutors assigned.</p>}
            <ul className="space-y-2">
              {course.tutors.map(({ tutor }) => (
                <li key={tutor.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <div className="font-medium">{tutor.name}</div>
                    <div className="text-xs text-slate-500">{tutor.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={tutor.status} />
                    <form action={unassignTutor}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="tutorId" value={tutor.id} />
                      <SubmitButton className="btn-secondary px-2 py-1" pendingText="…">Remove</SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            {availableTutors.length > 0 && (
              <form action={assignTutor} className="flex gap-2">
                <input type="hidden" name="courseId" value={course.id} />
                <select name="tutorId" className="input" required>
                  {availableTutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
                <SubmitButton pendingText="…">Assign</SubmitButton>
              </form>
            )}
          </section>

          <section className="card space-y-3">
            <h3 className="font-semibold">Course details</h3>
            <CourseForm course={course} />
          </section>
        </div>
      </div>
    </div>
  );
}
