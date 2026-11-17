"use client";

import { useState } from "react";
import type { SiteLang } from "@/lib/translate/detect";
import { translateReview } from "@/lib/translate/actions";
import { RichText } from "./RichText";

type BrowserTranslator = {
  availability(o: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<string>;
  create(o: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<{ translate(text: string): Promise<string> }>;
};

/** Gives up on `promise` after `ms` (null instead). */
function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/** Chrome's built-in, on-device translator (free, no limits), when there is one. */
async function translateInBrowser(
  text: string,
  from: string,
  to: string,
): Promise<string | null> {
  const T = (globalThis as { Translator?: BrowserTranslator }).Translator;
  if (!T) return null;
  try {
    const opts = { sourceLanguage: from, targetLanguage: to };
    const availability = await within(T.availability(opts), 3000);
    if (
      availability !== "available" &&
      availability !== "downloadable" &&
      availability !== "downloading"
    )
      return null;
    const translator = await within(T.create(opts), 15000);
    if (!translator) return null;
    return await within(translator.translate(text), 15000);
  } catch {
    return null;
  }
}

/**
 * A review's text with "🌐 Traduci" when it is written in the other
 * language of the site (`from` ≠ `to`), and "Mostra originale" to go back.
 */
export function ReviewText({
  text,
  reviewId,
  from,
  to,
  lang,
  t,
}: {
  text: string;
  /** The site's language (for @mention links). */
  lang: string;
  reviewId: string;
  /** The review's language, or null when unknown (no button). */
  from: SiteLang | null;
  /** The reader's language (the site's). */
  to: SiteLang;
  t: {
    translate: string;
    showOriginal: string;
    translating: string;
    translated: string;
    failed: string;
    google: string;
    spoiler: string;
  };
}) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Free quota used up: a link to Google Translate (a tap, so no popup blocker).
  const [google, setGoogle] = useState<string | null>(null);
  const canTranslate = from !== null && from !== to;

  async function toggle() {
    if (showing) return setShowing(false);
    if (translated) return setShowing(true);
    setBusy(true);
    setFailed(false);
    try {
      const local = await translateInBrowser(text, from!, to);
      if (local) {
        setTranslated(local);
        setShowing(true);
        return;
      }
      const result = await translateReview(reviewId, to);
      if (result && "text" in result) {
        setTranslated(result.text);
        setShowing(true);
      } else if (result && "fallback" in result) {
        setGoogle(result.fallback);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <p
        className="whitespace-pre-line text-zinc-800 dark:text-zinc-200"
        lang={showing ? to : (from ?? undefined)}
      >
        <RichText text={showing && translated ? translated : text} lang={lang} spoilerLabel={t.spoiler} />
      </p>
      {canTranslate && (
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
          {showing && <span>{t.translated} ·</span>}
          {!google && (
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              className="font-medium text-sky-700 hover:underline disabled:opacity-60 dark:text-sky-400"
            >
              {busy
                ? t.translating
                : showing
                  ? t.showOriginal
                  : `🌐 ${t.translate}`}
            </button>
          )}
          {failed && (
            <span className="text-red-600 dark:text-red-400">{t.failed}</span>
          )}
          {google && !showing && (
            <a
              href={google}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              {t.google} ↗
            </a>
          )}
        </span>
      )}
    </div>
  );
}
