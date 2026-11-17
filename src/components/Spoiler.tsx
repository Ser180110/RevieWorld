"use client";

import { useState, type ReactNode } from "react";

/** Hidden text (">!…!<"): a "🙈 Spoiler" tag and blurred words until someone taps it; another tap hides it again. */
export function Spoiler({
  children,
  label,
  hint,
}: {
  children: ReactNode;
  label: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  if (open) {
    // Tap again to hide it (e.g. after opening it by mistake).
    const hide =
      typeof document !== "undefined" && document.documentElement.lang === "en"
        ? "Tap to hide it again"
        : "Tocca per nasconderlo di nuovo";
    return (
      <span
        role="button"
        tabIndex={0}
        title={hide}
        aria-label={hide}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(false);
          }
        }}
        className="cursor-pointer rounded bg-zinc-200/70 px-0.5 ring-1 ring-violet-300/50 hover:bg-zinc-300/70 dark:bg-zinc-700/70 dark:ring-violet-700/50 dark:hover:bg-zinc-600/70"
      >
        {children}
      </span>
    );
  }
  return (
    <span
      role="button"
      tabIndex={0}
      title={hint ?? label}
      aria-label={hint ?? label}
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
      className="group inline cursor-pointer select-none rounded-md px-1 py-0.5 ring-1 ring-violet-300/70 transition hover:bg-violet-500/10 dark:ring-violet-700/70"
    >
      <span className="mr-1 inline-flex items-center gap-0.5 rounded bg-violet-600 px-1 text-[11px] font-semibold uppercase tracking-wide text-white align-[1px]">
        🙈 {label}
      </span>
      <span aria-hidden className="pointer-events-none opacity-80 blur-[3px]">
        {children}
      </span>
    </span>
  );
}
