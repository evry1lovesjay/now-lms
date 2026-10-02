# NowLMS

A simple, scalable ed-tech LMS built with **Next.js 16 (App Router)**, **Prisma 7**, **Tailwind CSS 4** and TypeScript.

Courses offered: **Software Quality Assurance**, **Data Analytics**, **Product Management** and **Product Design**.

## Roles & permissions

| Capability | Super Admin | Content Admin | Tutor | Student |
|---|:-:|:-:|:-:|:-:|
| Block / unblock **content admins** | ✅ | – | – | – |
| Block / unblock **tutors & students** | ✅ | ✅ | – | – |
| Create content admin accounts | ✅ | – | – | – |
| Create tutor / student accounts | ✅ | ✅ | – | – |
| Edit courses, add/reorder/delete lessons, upload videos | ✅ | ✅ | – | – |
| Assign tutors to courses | ✅ | ✅ | – | – |
| View audit log | ✅ | – | – | – |
| Watch lessons | all courses | all courses | assigned courses | enrolled courses |
| See students' progress | via admin | via admin | assigned courses | – |
| Self sign-up, enroll, mark lessons complete | – | – | – | ✅ |

Nobody can block a super admin, and nobody can change their own status. The rules live in one place: [`src/lib/roles.ts`](src/lib/roles.ts).

**Blocking is immediate**: every page, server action and API route re-reads the user from the database, so a blocked user is signed out on their next request (including mid-video — the stream stops authorising).

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
    storage.ts           # video storage (local disk; swap for S3/R2/GCS)
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
- **Video storage**: replace the four functions in `src/lib/storage.ts` with an object store (S3/R2/GCS) and put a CDN with signed URLs in front — uploads already stream rather than buffer.
- **More courses**: courses are data, not code. The 4 courses are seeded; adding more is an insert (or a small "create course" form) away.
- **Auditing**: block/unblock, user creation and content changes are recorded in `AuditLog`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | Type-check |
| `npm run setup` | Generate client, push schema, seed |
| `npm run db:migrate` | Create a migration (use for Postgres in production) |
| `npm run db:seed` | Re-run the seed (idempotent) |
