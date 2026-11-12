/**
 * Key used to detect duplicate categories and items:
 * lowercase, no accents, no punctuation, single spaces.
 * "Tombìni!!" -> "tombini".
 * Singular/plural ("tombino" vs "tombini") is caught by fuzzy search instead.
 */
export function normalizeName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** URL slug: "Tombini di Roma" -> "tombini-di-roma". */
export function slugify(input: string): string {
  return normalizeName(input).replace(/ /g, "-").slice(0, 80);
}
