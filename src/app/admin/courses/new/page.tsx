import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { SECTIONS } from "@/lib/course-content";
import { NewCourseForm } from "./new-course-form";

export default async function NewCoursePage() {
  await requireUser(["SUPERADMIN", "CONTENT_ADMIN"]);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="card lg:col-span-2">
        <Link href="/admin/courses" className="text-sm text-brand-700 hover:underline">
          ← Courses
        </Link>
        <h2 className="mt-1 mb-4 text-xl font-semibold">New course</h2>
        <NewCourseForm />
      </section>
      <aside className="card h-fit space-y-2 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Every course includes</p>
        <ul className="space-y-1">
          {SECTIONS.map((s) => (
            <li key={s.key}>
              {s.icon} {s.label}
            </li>
          ))}
          <li>🎬 Lessons</li>
          <li>📝 Assignments</li>
        </ul>
        <p>After creating it, add lessons and assign tutors. Content sections can be filled in from the course page.</p>
      </aside>
    </div>
  );
}
