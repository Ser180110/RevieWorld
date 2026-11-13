"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Install the app" button: on Android/desktop Chrome it opens the browser's
 * install dialog, on iPhone it explains Share → Add to Home Screen.
 * Hidden when the app is already installed.
 */
export function InstallApp({ t }: { t: { button: string; iosHint: string } }) {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const timer = isIos ? setTimeout(() => setIos(true), 0) : null;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!deferred && !ios) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={async () => {
          if (deferred) {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          } else {
            setShowHint((v) => !v);
          }
        }}
        className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:border-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-100"
      >
        📲 {t.button}
      </button>
      {showHint && <p className="max-w-xs text-xs">{t.iosHint}</p>}
    </div>
  );
}
