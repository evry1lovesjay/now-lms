"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

/** The link whose href is the longest prefix of the current path is the active one. */
export function activeHref(links: NavLink[], pathname: string) {
  return links
    .filter((l) => pathname === l.href || pathname.startsWith(l.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Main navigation; the current section is highlighted and marked aria-current="page". */
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const active = activeHref(links, pathname);

  return (
    <ul className="flex flex-wrap items-center gap-1 text-sm">
      {links.map((link) => {
        const isActive = link.href === active;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "rounded-lg bg-brand-600 px-3 py-1.5 font-semibold text-white shadow-sm"
                  : "rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
