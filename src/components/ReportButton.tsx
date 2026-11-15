"use client";

import { useActionState, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { reportContent } from "@/lib/moderation/actions";
import { REPORT_REASONS, type ReportTarget } from "@/lib/moderation/reasons";

/** "🚩 Segnala": a small window to pick why, sent to the founders. */
export function ReportButton({
  lang,
  targetType,
  targetId,
  t,
  compact = false,
}: {
  lang: string;
  targetType: ReportTarget;
  targetId: string;
  t: Dictionary["report"];
  /** Only the flag, for tight spots (comments). */
  compact?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(reportContent, {});
  const [reason, setReason] = useState<string>("");

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        title={t.button}
        aria-label={t.button}
        className={
          compact
            ? "cursor-pointer rounded-full px-1.5 text-xs text-zinc-400 hover:text-red-600"
            : "inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
        }
      >
        🚩{compact ? "" : ` ${t.button}`}
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {state.ok ? (
          <div className="flex flex-col gap-4 p-5">
            <p className="text-base font-medium">✅ {t.thanks}</p>
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              className="cursor-pointer self-end rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {t.close}
            </button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4 p-5">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={targetId} />
            <p className="text-base font-semibold">🚩 {t.title}</p>
            <div className="flex flex-col gap-2">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                  {t.reasons[r]}
                </label>
              ))}
            </div>
            <textarea
              name="note"
              maxLength={500}
              rows={2}
              placeholder={t.notePlaceholder}
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700"
            />
            {state.error && <p className="text-sm text-red-600">{t.errors[state.error]}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={!reason || pending}
                className="cursor-pointer rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? t.sending : t.send}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
