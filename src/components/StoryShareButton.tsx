"use client";

import { useState } from "react";

/**
 * "📸 Condividi nelle storie": makes the 9:16 picture of the review and opens
 * the phone's share sheet (Instagram, WhatsApp…), or downloads it on a computer.
 */
export function StoryShareButton({
  lang,
  reviewId,
  label,
  busyLabel,
  errorLabel,
  compact = false,
  shortLabel,
}: {
  lang: string;
  reviewId: string;
  label: string;
  busyLabel: string;
  errorLabel: string;
  compact?: boolean;
  /** Text of the small button on the review cards. */
  shortLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function share() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/${lang}/r/${reviewId}/story`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], `revieworld-${reviewId.slice(0, 8)}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] }).catch((e: unknown) => {
          // Closing the share sheet is not an error.
          if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={share}
        disabled={busy}
        title={label}
        className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 px-2.5 py-0.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        <span aria-hidden>{busy ? "⏳" : failed ? "⚠️" : "📸"}</span>
        {shortLabel ?? label}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="cursor-pointer rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
      >
        📸 {busy ? busyLabel : label}
      </button>
      {failed && <span className="text-xs text-red-600 dark:text-red-400">{errorLabel}</span>}
    </span>
  );
}
