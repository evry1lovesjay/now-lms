"use client";

import Link from "next/link";

export type NavLink = { href: string; label: string };

/** The link whose href is the longest prefix of the current path is the active one. */
export function activeHref(links: NavLink[], pathname: string) {
  return links
    .filter((l) => pathname === l.href || pathname.startsWith(l.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Navigation links; the current section is highlighted and marked aria-current="page". */
export function NavLinks({
  links,
  active,
  vertical = false,
  onNavigate,
}: {
  links: NavLink[];
  active: string | undefined;
  vertical?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className={vertical ? "flex flex-col gap-1" : "flex items-center gap-1 text-sm"}>
      {links.map((link) => {
        const isActive = link.href === active;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={`block rounded-lg px-3 ${vertical ? "py-2.5 text-base" : "py-1.5"} ${
                isActive
                  ? "bg-brand-600 font-semibold text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
