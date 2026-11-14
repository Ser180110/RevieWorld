"use client";

import { useRef } from "react";

/**
 * Submit button (inside a server-action form) that first asks "are you
 * sure?" in a small window of our own, which also works in the installed app.
 */
export function ConfirmButton({
  label,
  confirmText,
  okLabel,
  className,
}: {
  label: string;
  confirmText: string;
  /** Text of the confirm button (default: the button's own label). */
  okLabel?: string;
  className?: string;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const en = typeof document !== "undefined" && document.documentElement.lang === "en";

  return (
    <>
      <button ref={button} type="button" className={className} onClick={() => dialog.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => {
          // Tap outside the box = cancel.
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex flex-col gap-5 p-5">
          <p className="text-base font-medium">{confirmText}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {en ? "Cancel" : "Annulla"}
            </button>
            <button
              type="button"
              onClick={() => {
                dialog.current?.close();
                button.current?.form?.requestSubmit();
              }}
              className="cursor-pointer rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              {okLabel ?? label}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
