/** "Quando l'hai provato?": a date picker that can't go past today. */
export function DayInput({
  label,
  hint,
  today,
  value,
  name = "experiencedOn",
}: {
  label: string;
  hint?: string;
  /** Today in Italy ("2026-11-17"): the default and the latest allowed day. */
  today: string;
  value?: string | null;
  name?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="date"
        name={name}
        required
        defaultValue={value ?? today}
        max={today}
        min="1900-01-01"
        className="h-11 w-full max-w-56 rounded-lg border border-zinc-300 bg-transparent px-3 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
      />
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}
