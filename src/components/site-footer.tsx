import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { homePathFor } from "@/lib/roles";
import { LogoMark } from "@/components/logo-mark";
import { CurrentYear } from "@/components/current-year";

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@nowlms.local";

type FooterLink = { href: string; label: string };

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-slate-600 transition hover:text-brand-700 hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function SiteFooter() {
  const [user, courses] = await Promise.all([
    getCurrentUser(),
    db.course.findMany({ where: { published: true }, orderBy: { createdAt: "asc" }, select: { slug: true, title: true }, take: 6 }),
  ]);

  const account: FooterLink[] = user
    ? [
        { href: homePathFor(user.role), label: "My dashboard" },
        ...(user.role === "STUDENT" ? [{ href: "/student/assignments", label: "My assignments" }] : []),
      ]
    : [
        { href: "/login", label: "Log in" },
        { href: "/register", label: "Register" },
      ];

  return (
    <footer className="mt-16 border-t border-slate-200 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_2fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold text-brand-700">
            <LogoMark />
            <span>
              Now<span className="text-slate-900">LMS</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-slate-600">
            Practical, tutor-led courses in software quality assurance, data analytics, product management and product design.
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <Column
            title="Courses"
            links={[...courses.map((c) => ({ href: `/courses/${c.slug}`, label: c.title })), { href: "/courses", label: "View all courses" }]}
          />
          <Column title="Account" links={account} />
          <Column
            title="Company"
            links={[
              { href: "/about", label: "About us" },
              { href: "/contact", label: "Contact & support" },
              { href: "/privacy", label: "Privacy policy" },
              { href: "/terms", label: "Terms of use" },
            ]}
          />
        </nav>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CurrentYear serverYear={new Date().getFullYear()} /> NowLMS. All rights reserved.
          </p>
          <p>Course videos are for enrolled learners only and may not be downloaded or shared.</p>
        </div>
      </div>
    </footer>
  );
}
