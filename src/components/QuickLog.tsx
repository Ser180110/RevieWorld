"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { quickLog } from "@/lib/reviews/actions";
import { DayInput } from "./DayInput";
import { StarInput } from "./StarInput";

/**
 * "⚡ Log veloce" (first time: a review with only the stars) or
 * "🔁 Riprovato" (one more diary entry for something already reviewed).
 */
export function QuickLog({
  lang,
  itemId,
  back,
  again,
  today,
  ratingLabel,
  t,
}: {
  lang: string;
  itemId: string;
  back: string;
  /** Already reviewed: this is a "Riprovato". */
  again: boolean;
  today: string;
  ratingLabel: string;
  t: Dictionary["quickLog"];
}) {
  const [state, action, pending] = useActionState(quickLog, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="back" value={back} />
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">{again ? t.titleAgain : t.titleFirst}</h3>
        <p className="text-sm text-zinc-500">{again ? t.hintAgain : t.hintFirst}</p>
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <StarInput name="rating" label={ratingLabel} />
        <DayInput label={t.day} today={today} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error === "auth" ? (
            <Link href={`/${lang}/login`} className="underline">
              {t.errors.auth}
            </Link>
          ) : (
            t.errors[state.error]
          )}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-10 self-start rounded-full border border-zinc-300 px-5 text-sm font-medium hover:border-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-100"
      >
        {pending ? t.saving : again ? t.submitAgain : t.submitFirst}
      </button>
    </form>
  );
}
