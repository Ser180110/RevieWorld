/** Header search: a plain GET form to the results page (works without JavaScript). */
export function SearchBox({
  lang,
  label,
  placeholder,
  className = "",
  id,
}: {
  id: string;
  lang: string;
  label: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <form action={`/${lang}/search`} role="search" className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
        🔍
      </span>
      <input
        id={id}
        name="q"
        type="search"
        required
        minLength={2}
        placeholder={placeholder}
        className="h-9 w-full rounded-full border border-zinc-300 bg-transparent pl-9 pr-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
      />
    </form>
  );
}
