// Accounts created by prisma/seed.ts (demo accounts are seeded outside production).
export const PASSWORD = "Password123!";

export const accounts = {
  superadmin: { email: "superadmin@nowlms.local", password: "ChangeMe123!" },
  contentAdmin: { email: "content@nowlms.local", password: PASSWORD },
  tutor: { email: "tutor@nowlms.local", password: PASSWORD },
  student: { email: "student@nowlms.local", password: PASSWORD },
} as const;

export type AccountName = keyof typeof accounts;

export const COURSE_TITLES = [
  "Software Quality Assurance",
  "Data Analytics",
  "Product Management",
  "Product Design",
];

/** SQA lesson with a real video, created by tests/support/reset-db.ts. */
export const SEEDED_LESSON_TITLE = "Seeded video lesson";
