"use client";

import { useState, type ReactNode } from "react";

/** Hidden text (">!…!<"): a dark bar until someone taps it. */
export function Spoiler({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return <span className="rounded bg-zinc-200/70 px-0.5 dark:bg-zinc-700/70">{children}</span>;
  }
  return (
    <span
      role="button"
      tabIndex={0}
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
        }
      }}
      className="cursor-pointer select-none rounded bg-zinc-800 px-0.5 text-transparent transition hover:bg-zinc-700 dark:bg-zinc-300 dark:hover:bg-zinc-400"
    >
      <span aria-hidden className="pointer-events-none">{children}</span>
    </span>
  );
}
