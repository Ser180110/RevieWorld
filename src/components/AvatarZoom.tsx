"use client";

import { useRef } from "react";
import { Avatar } from "./Avatar";

/** Profile picture that opens big when tapped (tap anywhere to close). */
export function AvatarZoom({ url, name, size }: { url: string | null | undefined; name: string; size: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (!url) return <Avatar url={url} name={name} size={size} />;
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={name}
        className="shrink-0 cursor-zoom-in rounded-full transition hover:opacity-90"
      >
        <Avatar url={url} name={name} size={size} />
      </button>
      <dialog
        ref={dialog}
        onClick={() => dialog.current?.close()}
        className="m-auto cursor-zoom-out bg-transparent p-0 backdrop:bg-black/80"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          className="max-h-[80vh] w-[min(80vw,28rem)] rounded-full object-cover shadow-2xl"
          style={{ aspectRatio: "1 / 1" }}
        />
      </dialog>
    </>
  );
}
