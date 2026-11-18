"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const LINKS = [
  { href: "/", label: "Learner" },
  { href: "/coach", label: "Coach" },
];

/** Role switcher. Stands in for auth (deliberately not built). */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="View as">
      <ul className="flex rounded-lg border border-border bg-surface-muted p-0.5 text-sm">
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "inline-flex min-h-9 items-center rounded-md px-3 font-medium",
                  active ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
