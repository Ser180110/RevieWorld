"use client";

import { useState } from "react";

/**
 * Opens the phone's share sheet (WhatsApp, Telegram, …) or, where that is not
 * available, copies the link.
 */
export function ShareButton({
  path,
  title,
  text,
  label,
  copiedLabel,
  variant = "icon",
}: {
  /** Site path, e.g. /it/r/123 */
  path: string;
  title: string;
  text: string;
  label: string;
  copiedLabel: string;
  variant?: "icon" | "pill";
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
    } catch {
      window.prompt(label, url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={share}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
      >
        <ShareIcon /> {copied ? copiedLabel : label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={share}
      title={label}
      aria-label={label}
      className="inline-flex cursor-pointer items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
    >
      <ShareIcon />
      {copied && <span className="text-xs">{copiedLabel}</span>}
    </button>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v13" />
    </svg>
  );
}
