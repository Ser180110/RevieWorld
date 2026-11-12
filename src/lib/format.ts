/** Rating stored 1-10, shown as 0.5-5 stars. */
export const toStars = (rating: number) => rating / 2;

export function formatStars(avg10: number | string | null | undefined): string {
  if (avg10 === null || avg10 === undefined) return "–";
  return (Number(avg10) / 2).toFixed(1);
}

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

/** Replaces {name} placeholders in a dictionary string. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

/** "1 recensione" / "3 recensioni". */
export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
