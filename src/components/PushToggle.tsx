"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/lib/push/actions";

type State = "loading" | "unsupported" | "ios" | "off" | "on" | "blocked";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function detect(): Promise<State> {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return Promise.resolve(ios && !standalone ? "ios" : "unsupported");
  }
  if (Notification.permission === "denied") return Promise.resolve("blocked");
  return navigator.serviceWorker.getRegistration().then(async (reg) => {
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === "granted" ? "on" : "off";
  });
}

/** "Turn on phone notifications": asks permission and saves this device. */
export function PushToggle({
  publicKey,
  t,
}: {
  publicKey: string;
  t: { on: string; hint: string; active: string; disable: string; blocked: string; ios: string; error: string };
}) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    detect().then(
      (s) => live && setState(s),
      () => live && setState("unsupported"),
    );
    return () => {
      live = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const ok = await savePushSubscription(sub.toJSON());
      if (!ok) throw new Error("save");
      setState("on");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {state === "on" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">📲 {t.active}</span>
          <button type="button" onClick={disable} disabled={busy} className="cursor-pointer text-sm text-zinc-500 hover:underline disabled:opacity-50">
            {t.disable}
          </button>
        </div>
      ) : state === "off" ? (
        <>
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="h-11 cursor-pointer rounded-full bg-red-600 px-5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            📲 {t.on}
          </button>
          <p className="text-sm text-zinc-500">{t.hint}</p>
        </>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">📲 {state === "ios" ? t.ios : t.blocked}</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {t.error}
        </p>
      )}
    </div>
  );
}
