import Link from "next/link";
import { db } from "@/lib/db";
import { CourseCard } from "@/components/course-card";

export default async function HomePage() {
  const courses = await db.course.findMany({
    where: { published: true },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { lessons: true } } },
  });

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-14 text-white">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight">Launch your tech career with expert-led courses.</h1>
        <p className="mt-4 max-w-xl text-white/80">
          Learn Software Quality Assurance, Data Analytics, Product Management and Product Design from experienced tutors.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/register" className="btn bg-white text-brand-600 hover:bg-white/90">
            Get started
          </Link>
          <Link href="/courses" className="btn border border-white/40 text-white hover:bg-white/10">
            Browse courses
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Our courses</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </div>
  );
}
