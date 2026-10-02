import { db } from "@/lib/db";
import { CourseCard } from "@/components/course-card";

export default async function CoursesPage() {
  const courses = await db.course.findMany({
    where: { published: true },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { lessons: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">All courses</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
