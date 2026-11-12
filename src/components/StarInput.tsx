"use client";

import { useState } from "react";

/** Star picker with half stars. Submits `name` = 1..10. */
export function StarInput({
  name,
  label,
  defaultValue = 0,
}: {
  name: string;
  label: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-3">
        <div className="flex text-3xl leading-none" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => {
            const full = i * 2;
            const half = full - 1;
            const fill = shown >= full ? 100 : shown >= half ? 50 : 0;
            return (
              <span key={i} className="relative inline-block text-zinc-300 dark:text-zinc-700">
                ★
                <span className="pointer-events-none absolute inset-0 overflow-hidden text-amber-500" style={{ width: `${fill}%` }}>
                  ★
                </span>
                <button
                  type="button"
                  aria-label={`${half / 2}`}
                  className="absolute inset-y-0 left-0 w-1/2"
                  onMouseEnter={() => setHover(half)}
                  onClick={() => setValue(half)}
                />
                <button
                  type="button"
                  aria-label={`${full / 2}`}
                  className="absolute inset-y-0 right-0 w-1/2"
                  onMouseEnter={() => setHover(full)}
                  onClick={() => setValue(full)}
                />
              </span>
            );
          })}
        </div>
        <span className="w-8 text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
          {shown ? (shown / 2).toFixed(1) : ""}
        </span>
      </div>
      <input type="hidden" name={name} value={value || ""} />
    </fieldset>
  );
}
