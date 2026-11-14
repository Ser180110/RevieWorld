"use client";

import { useState, type RefObject } from "react";

const GROUPS: { icon: string; list: string }[] = [
  { icon: "😀", list: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😛 😜 🤪 😎 🤩 🥳 😏 😌 🤔 🤨 😐 😑 😶 🙄 😬 😴 🤤 😮 😯 😲 😳 🥺 😢 😭 😤 😠 😡 🤬 🤯 😱 😨 🥶 🥵 🤢 🤮 🤧 😷 🤠 🤡 💩 👻 💀 😈 🙈 🙉 🙊" },
  { icon: "👍", list: "👍 👎 👌 🤌 ✌️ 🤞 🤟 🤘 👏 🙌 🙏 💪 👀 🫶 👋 🤙 👉 👈 ☝️ 🫡 🤝 ✍️ 💅 🤷 🤦 🙋 💃 🕺" },
  { icon: "❤️", list: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 💕 💞 💖 💘 💯 🔥 ✨ ⭐ 🌟 💫 ⚡ 💥 🎉 🎊 🏆 🥇 👑 💎 💸 💰 🚫 ✅ ❌ ‼️ ❓" },
  { icon: "🍕", list: "🍕 🍔 🍟 🌭 🥙 🌮 🌯 🥪 🍝 🍣 🍜 🍤 🥩 🍗 🥗 🍳 🥐 🍩 🍪 🎂 🍰 🍫 🍦 🍨 🍿 ☕ 🍵 🍺 🍻 🍷 🥂 🍸 🍹 🧃 🍓 🍑 🍋 🥑" },
  { icon: "🌍", list: "🌍 🏖️ 🏔️ 🏙️ 🏛️ 🏟️ 🎡 🎢 🚗 🚕 🚲 🛵 ✈️ 🚆 🚢 🏠 🏨 ⛪ 🌳 🌸 🌻 🌈 ☀️ 🌧️ ❄️ 🌙 🐶 🐱 🐻 🐼 🦁 🐸 🐵 🦄 🐝 🦋 🎬 🎵 🎮 📚 ⚽ 🏀 🎨 📸 🛍️" },
];

/**
 * 😊 button: a panel of popular emoji (like in chat apps) that are inserted
 * at the cursor of the given text box.
 */
export function QuickEmoji({ target, label }: { target: RefObject<HTMLTextAreaElement | null>; label: string }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(0);

  function insert(e: string) {
    const el = target.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + e + el.value.slice(end);
    if (next.length > el.maxLength && el.maxLength > 0) return;
    // Set the value the way typing does, so React state stays in sync.
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.setSelectionRange(start + e.length, start + e.length);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        😊
      </button>
      {open && (
        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex gap-1 border-b border-zinc-200 pb-1 dark:border-zinc-800">
            {GROUPS.map((g, i) => (
              <button
                key={g.icon}
                type="button"
                onClick={() => setGroup(i)}
                aria-pressed={i === group}
                className={`flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg text-xl ${i === group ? "bg-zinc-100 dark:bg-zinc-800" : "opacity-60"}`}
              >
                {g.icon}
              </button>
            ))}
          </div>
          <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto sm:grid-cols-10">
            {GROUPS[group].list.split(" ").map((e) => (
              <button
                key={e}
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => insert(e)}
                className="flex aspect-square cursor-pointer items-center justify-center rounded-lg text-2xl transition hover:scale-125 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
