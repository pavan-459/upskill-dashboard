"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { HowItWorks } from "./how-it-works";
import { cx } from "./ui";

const LINKS = [
  { href: "/", label: "Learner" },
  { href: "/coach", label: "Coach" },
];

function useSection() {
  const pathname = usePathname();
  return pathname.startsWith("/coach") ? "Coach" : "Learner";
}

/** "Upskill / Learner": brand plus where you are. */
export function Breadcrumb() {
  const section = useSection();
  return (
    <Link href="/" className="whitespace-nowrap text-sm font-medium">
      Upskill <span className="hidden text-muted sm:inline">/ {section}</span>
    </Link>
  );
}

/** Role switcher (stands in for auth) and the rules explainer. */
export function AppNav() {
  const section = useSection();
  return (
    <nav aria-label="Main" className="flex items-center gap-2 whitespace-nowrap text-sm sm:gap-3">
      {LINKS.map((l) => (
        <Fragment key={l.href}>
          <Link
            href={l.href}
            aria-current={section === l.label ? "page" : undefined}
            className={cx(
              "transition",
              section === l.label ? "font-medium text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
          <span aria-hidden className="text-border-strong">
            /
          </span>
        </Fragment>
      ))}
      <HowItWorks />
    </nav>
  );
}
