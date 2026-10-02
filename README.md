# NowLMS

A simple, scalable ed-tech LMS built with **Next.js 16 (App Router)**, **Prisma 7**, **Tailwind CSS 4** and TypeScript.

Courses offered: **Software Quality Assurance**, **Data Analytics**, **Product Management** and **Product Design** — and admins can add more.

Light and dark themes are built in: the 🖥️/☀️/🌙 button in the header cycles System → Light → Dark and remembers the choice per browser.

## Roles & permissions

| Capability | Super Admin | Content Admin | Tutor | Student |
|---|:-:|:-:|:-:|:-:|
| Block / unblock **content admins** | ✅ | – | – | – |
| Block / unblock **tutors & students** | ✅ | ✅ | – | – |
| Create content admin accounts | ✅ | – | – | – |
| Create tutor / student accounts | ✅ | ✅ | – | – |
| Create courses | ✅ | ✅ | – | – |
| Edit course details and cover image | ✅ | ✅ | – | – |
| Add, edit, reorder and delete lessons; upload videos | all courses | all courses | assigned courses | – |
| Post to course outline / materials / resources | all courses | all courses | – | – |
| Post, delete and grade assignments | all courses | all courses | assigned courses | – |
| Assign tutors to courses | ✅ | ✅ | – | – |
| View audit log | ✅ | – | – | – |
| Watch lessons | all courses | all courses | assigned courses | enrolled courses |
| See students' progress | via admin | via admin | assigned courses | – |
| Self sign-up, enroll, mark lessons complete | – | – | – | ✅ |
| See assignments, submit work, see grades & feedback | – | – | – | enrolled courses |

Nobody can block a super admin, and nobody can change their own status. The rules live in one place: [`src/lib/roles.ts`](src/lib/roles.ts).

**Blocking is immediate**: every page, server action and API route re-reads the user from the database, so a blocked user is signed out on their next request (including mid-video — the stream stops authorising).

## Course outline, materials & resources

Every course — existing or newly created — has the same three fixed sections, shown colour-coded **above the lessons**:

| Section | Colour | Accepts |
|---|---|---|
| 📋 Course outline | amber | PDF, Word (.doc/.docx), slides (.ppt/.pptx) or a link |
| 📚 Course materials | blue | PDF or a link |
| 🔗 Resources | green | Links (e.g. Google Meet live class, YouTube recordings) |

All three are optional and can hold multiple items. Super admins and content admins post from the course page with a **"What do you want to add?"** dropdown. Links are labelled automatically (Google Meet/Zoom/Teams → *Live class*, YouTube/Vimeo/Loom → *Video*, Google Drive). The outline is visible to anyone browsing a published course; materials and resources need course access. The sections are defined once in [`src/lib/course-content.ts`](src/lib/course-content.ts), which is what keeps every course consistent.

## Lessons

Admins manage lessons on the admin course page; tutors do the same for their assigned courses from **Manage lessons** (on the course page or the tutor dashboard, at `/courses/<slug>/manage`). Lessons can be added with a video, edited (title and description), reordered, given a new video, or deleted.

## Course cover images

Every course card and course page shows a cover. The four original courses ship with small SVG illustrations (`public/course-covers/`, about 2 KB each), and new courses without an upload get a generic one. Admins can upload a cover when creating a course or later in its details (JPEG, PNG, WebP, GIF or AVIF, up to 5 MB). Uploads are resized to 960×540 and re-encoded as WebP with `sharp` (typically 15–90 KB), stored in `COVER_STORAGE_DIR`, and served with long-lived cache headers. Card images are lazy-loaded with fixed dimensions, so they never shift the layout.

## Assignments

Tutors (for their courses), content admins and super admins post assignments with instructions, an optional due date and a max score. Enrolled students submit an answer, a link and/or a file (PDF, Word, slides, Excel, ZIP or image, up to 25 MB), and can update it until it's graded. Teachers see every enrolled student's submission and grade it with feedback; students see their grades per course and across all courses on **My assignments & grades**. Late submissions are flagged; submission files are only visible to the student and the course's teachers.

## Video protection (non-downloadable)

- Videos are stored **outside `/public`** and are only reachable through `/api/videos/[lessonId]`, which checks the session, the user's status and course access on every request.
- Each stream URL carries a **short-lived token bound to the user and lesson**, so a copied link is useless to anyone else.
- Opening the video URL directly in a tab (to "Save as…") is rejected (`Sec-Fetch-Dest: document` → 403); responses are `Cache-Control: no-store`, `Content-Disposition: inline`, and range requests are capped at 2 MB per chunk.
- The player hides the download / picture-in-picture / cast controls and disables right-click and drag.
- A **moving watermark** with the viewer's email overlays the video so screen recordings are traceable.

> No web video can be made 100% capture-proof (screen recorders always work). For stronger protection in production, move videos to a streaming service with DRM (e.g. Mux, Cloudflare Stream, AWS MediaConvert + Widevine/FairPlay) — only `src/lib/storage.ts` and the streaming route need to change.

## Getting started

Requires Node.js 20+.

```bash
npm install
cp .env.example .env        # then set AUTH_SECRET to a long random string
npm run setup               # generate Prisma client, create DB, seed courses & accounts
npm run dev                 # http://localhost:3000
```

Seeded accounts:

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@nowlms.local` | value of `SEED_SUPERADMIN_PASSWORD` (default `ChangeMe123!`) |
| Content Admin | `content@nowlms.local` | `Password123!` (dev only) |
| Tutor | `tutor@nowlms.local` | `Password123!` (dev only, assigned to SQA) |
| Student | `student@nowlms.local` | `Password123!` (dev only) |

**Change the super admin password / env values before deploying.** Demo accounts are not seeded when `NODE_ENV=production`.

## Testing

End-to-end tests run in **both Playwright and Cypress** against a production build that uses a separate database (`test.db`) and video folder (`storage/test-videos`), so your dev data is never touched. The database is reset and re-seeded before every test, including a lesson with a real video (`tests/fixtures/sample.webm`).

```bash
npm run build                 # tests run against the production build
npx playwright install chromium   # first time only
npm run test:playwright       # Playwright (starts the test server itself)
npm run test:cypress          # Cypress (headless; starts the test server itself)
npm run test:e2e              # both
npm run cypress:open          # Cypress UI — run `npm run test:server` in another terminal first
```

Both suites cover the same scenarios:

| Spec | What it checks |
|---|---|
| `auth` | Student sign-up, login errors, role-based dashboards, anonymous/role redirects, audit log is super-admin only |
| `user-management` | Who can block whom, which roles each admin can create, blocking signs users out immediately and unblocking doesn't revive old sessions, status filter, audit entries |
| `navbar` | Link order (Dashboard first), current-page highlight, first name above a smaller role |
| `lessons` | Tutors upload/edit/reorder lessons in their own courses only, students can't manage lessons, admins edit lessons |
| `covers` | Built-in illustrations, uploaded covers compressed to small 960×540 WebP, replace/reset, non-images rejected |
| `courses` | The 4 courses, lesson create/upload/reorder/delete, tutor assignment, enroll → watch → complete, tutor sees progress |
| `course-creation` | Admins create courses (unique slugs), new and existing courses have identical sections, tutors/students can't create |
| `course-content` | The 3-option dropdown, link-only resources, posting and colour-coded display above lessons, public outline vs. gated materials, tutors can't post (even to their own course), unsafe links rejected, removal |
| `assignments` | Post → submit (text/link/file) → grade → student sees grade & overall score, resubmit before grading, private submission files, access rules |
| `dark-mode` | Toggle cycles and persists, applied before first paint, follows the OS on System |
| `video-protection` | Range streaming with no-store headers, direct-tab access refused, signed-out and copied links refused, non-enrolled students kept out, blocking cuts the stream |

```
tests/
  fixtures/sample.webm    # small video used by uploads and the seeded lesson
  support/                # shared test env, seeded accounts, DB reset, test server
  playwright/*.spec.ts    # Playwright suite (playwright.config.ts)
cypress/
  e2e/*.cy.ts             # Cypress suite (cypress.config.ts)
  support/                # cy.login(), cy.userRow(), cy.enrollInSqa(), … + per-test DB reset
```

CI (`.github/workflows/e2e.yml`) runs type-checking, the build and both suites on every pull request.

## Project structure

```
prisma/
  schema.prisma          # User, Course, Lesson, Enrollment, CourseTutor, LessonProgress, AuditLog
  seed.ts                # 4 courses + super admin (+ demo accounts in dev)
src/
  proxy.ts               # optimistic redirect to /login for protected areas
  lib/
    roles.ts             # role & permission rules (single source of truth)
    auth.ts              # JWT session cookie, getCurrentUser(), requireUser()
    access.ts            # who can watch which course
    storage.ts           # video + document storage (local disk; swap for S3/R2/GCS)
    course-content.ts    # the 3 fixed course sections (outline, materials, resources)
    file-types.ts        # allowed upload types, link validation
    video-token.ts       # short-lived per-user video tokens
  actions/               # server actions: auth, users, content, learning
  app/
    admin/               # overview, users (block/unblock/create), courses, audit log
    tutor/               # tutor dashboard: assigned courses + student progress
    student/             # student dashboard: enrolled courses + progress
    courses/             # public catalog, course page, lesson player
    api/videos/          # authenticated range streaming
    api/lessons/[id]/video  # streaming upload (no in-memory buffering)
```

## Scaling notes

- **Database**: SQLite for development. For production, change `provider = "postgresql"` in `prisma/schema.prisma`, install `@prisma/adapter-pg`, swap the adapter in `src/lib/db.ts`, and set `DATABASE_URL`. Queries are indexed and the user list is paginated.
- **Stateless app servers**: sessions are signed JWT cookies, so you can run many instances behind a load balancer.
- **File storage**: videos and documents go through the small bucket API in `src/lib/storage.ts`; replace it with an object store (S3/R2/GCS) and put a CDN with signed URLs in front — uploads already stream rather than buffer.
- **More courses**: courses are data, not code. The 4 courses are seeded; adding more is an insert (or a small "create course" form) away.
- **Auditing**: block/unblock, user creation and content changes are recorded in `AuditLog`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | Type-check (app, Playwright and Cypress code) |
| `npm run test:e2e` | Run the Playwright and Cypress suites |
| `npm run setup` | Generate client, push schema, seed |
| `npm run db:migrate` | Create a migration (use for Postgres in production) |
| `npm run db:seed` | Re-run the seed (idempotent) |
