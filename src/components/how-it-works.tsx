"use client";

import { useRef } from "react";
import { ACTIVE_DAYS_WINDOW, AT_RISK_INACTIVE_DAYS, COMPLETE_THRESHOLD_PCT } from "@/lib/rules/constants";
import { AlertIcon, buttonClass, CheckIcon, LockIcon, StarIcon, cx } from "./ui";

const RULES = [
  {
    icon: <CheckIcon />,
    title: `A skill is earned at ${COMPLETE_THRESHOLD_PCT}%`,
    body: `Reach ${COMPLETE_THRESHOLD_PCT}% of the lessons in a course and you earn every skill it teaches. The same ${COMPLETE_THRESHOLD_PCT}% counts as "complete" for unlocking the next course.`,
  },
  {
    icon: <LockIcon />,
    title: "Courses unlock in order",
    body: "A course opens only when all of its prerequisites are complete. Locked courses tell you exactly what's missing and how many lessons are left.",
  },
  {
    icon: <AlertIcon />,
    title: `At risk = more than ${AT_RISK_INACTIVE_DAYS} days idle`,
    body: `An unfinished course with no activity for more than ${AT_RISK_INACTIVE_DAYS} days is at risk. A finished course never is. A learner is at risk if any course is, or if they haven't been active at all for more than ${AT_RISK_INACTIVE_DAYS} days.`,
  },
  {
    icon: <StarIcon />,
    title: "One recommendation, with a reason",
    body: "First, an open course that teaches one of your goals. Otherwise, finish the course you're on that teaches a goal. Otherwise, the open course that unlocks the most.",
  },
  {
    icon: <span className="text-[11px] font-semibold">7d</span>,
    title: "Active days",
    body: `Distinct calendar days (India time) with any activity in the last ${ACTIVE_DAYS_WINDOW} days, today included.`,
  },
];

/** "How it works" link in the header, opening a dialog that explains every rule. */
export function HowItWorks() {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-sm text-muted transition hover:text-foreground"
      >
        How it works
      </button>
      <dialog
        ref={ref}
        aria-labelledby="how-title"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] whitespace-normal rounded-3xl border border-border bg-surface p-0 text-left text-foreground shadow-2xl"
      >
        <div className="p-6">
          <p className="font-serif text-lg italic text-muted">The rules, in plain words</p>
          {/* Initial focus on the heading so the dialog opens at the top, not scrolled to the button. */}
          <h2 id="how-title" tabIndex={-1} autoFocus className="text-2xl font-semibold tracking-tight outline-none">
            How Upskill decides
          </h2>
          <ul className="mt-5 grid gap-4">
            {RULES.map((r) => (
              <li key={r.title} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted ring-1 ring-border">
                  {r.icon}
                </span>
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-muted">{r.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <form method="dialog" className="mt-6">
            <button className={cx(buttonClass.primary, "w-full")}>Got it</button>
          </form>
        </div>
      </dialog>
    </>
  );
}
