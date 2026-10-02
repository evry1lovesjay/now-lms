import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }) });

const COURSES = [
  {
    slug: "software-quality-assurance",
    title: "Software Quality Assurance",
    summary: "Manual and automated testing, test planning and QA processes for modern software teams.",
    description:
      "Learn how to plan, design and execute tests that keep software reliable. Covers the software testing life cycle, writing test cases, bug reporting, API testing, test automation fundamentals and working in agile teams.",
  },
  {
    slug: "data-analytics",
    title: "Data Analytics",
    summary: "Turn raw data into decisions with spreadsheets, SQL, visualisation and storytelling.",
    description:
      "Build a practical analytics toolkit: cleaning and exploring data in spreadsheets, querying databases with SQL, building dashboards, basic statistics and presenting insights that stakeholders act on.",
  },
  {
    slug: "product-management",
    title: "Product Management",
    summary: "Discover, prioritise and ship products customers love.",
    description:
      "Understand the product lifecycle end to end: user research, defining problems, roadmaps and prioritisation, writing requirements, working with engineering and design, metrics and go-to-market.",
  },
  {
    slug: "product-design",
    title: "Product Design",
    summary: "UX research, UI design and prototyping for digital products.",
    description:
      "Learn the design process from research to high-fidelity prototypes: user flows, wireframing, visual design principles, design systems, usability testing and collaborating with product and engineering.",
  },
];

async function upsertUser(email: string, name: string, role: string, password: string) {
  return db.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash: await bcrypt.hash(password, 10) },
  });
}

async function main() {
  for (const course of COURSES) {
    await db.course.upsert({ where: { slug: course.slug }, update: {}, create: course });
  }

  const email = (process.env.SEED_SUPERADMIN_EMAIL ?? "superadmin@nowlms.local").toLowerCase();
  const password = process.env.SEED_SUPERADMIN_PASSWORD ?? "ChangeMe123!";
  await upsertUser(email, "Super Admin", "SUPERADMIN", password);
  console.log(`Super admin: ${email}`);

  // Demo accounts for local development only.
  if (process.env.NODE_ENV !== "production") {
    await upsertUser("content@nowlms.local", "Content Admin", "CONTENT_ADMIN", "Password123!");
    const tutor = await upsertUser("tutor@nowlms.local", "Demo Tutor", "TUTOR", "Password123!");
    await upsertUser("student@nowlms.local", "Demo Student", "STUDENT", "Password123!");

    const sqa = await db.course.findUniqueOrThrow({ where: { slug: "software-quality-assurance" } });
    await db.courseTutor.upsert({
      where: { tutorId_courseId: { tutorId: tutor.id, courseId: sqa.id } },
      update: {},
      create: { tutorId: tutor.id, courseId: sqa.id },
    });
    console.log("Demo accounts (password: Password123!): content@, tutor@, student@nowlms.local");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
