/**
 * Look of a category: an emoji and a colour from a fixed palette.
 * Categories without a saved style get one derived from their name.
 */

export const COLORS = ["amber", "rose", "sky", "emerald", "violet", "orange", "teal", "fuchsia", "lime", "indigo"] as const;
export type CategoryColor = (typeof COLORS)[number];

/** Tailwind classes per colour (literal strings so Tailwind keeps them). */
export const COLOR_CLASSES: Record<CategoryColor, { tile: string; banner: string; swatch: string }> = {
  amber: {
    tile: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
    banner: "from-amber-200 to-amber-50 dark:from-amber-900 dark:to-zinc-950",
    swatch: "bg-amber-400",
  },
  rose: {
    tile: "bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100",
    banner: "from-rose-200 to-rose-50 dark:from-rose-900 dark:to-zinc-950",
    swatch: "bg-rose-400",
  },
  sky: {
    tile: "bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100",
    banner: "from-sky-200 to-sky-50 dark:from-sky-900 dark:to-zinc-950",
    swatch: "bg-sky-400",
  },
  emerald: {
    tile: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100",
    banner: "from-emerald-200 to-emerald-50 dark:from-emerald-900 dark:to-zinc-950",
    swatch: "bg-emerald-400",
  },
  violet: {
    tile: "bg-violet-100 text-violet-950 dark:bg-violet-950 dark:text-violet-100",
    banner: "from-violet-200 to-violet-50 dark:from-violet-900 dark:to-zinc-950",
    swatch: "bg-violet-400",
  },
  orange: {
    tile: "bg-orange-100 text-orange-950 dark:bg-orange-950 dark:text-orange-100",
    banner: "from-orange-200 to-orange-50 dark:from-orange-900 dark:to-zinc-950",
    swatch: "bg-orange-400",
  },
  teal: {
    tile: "bg-teal-100 text-teal-950 dark:bg-teal-950 dark:text-teal-100",
    banner: "from-teal-200 to-teal-50 dark:from-teal-900 dark:to-zinc-950",
    swatch: "bg-teal-400",
  },
  fuchsia: {
    tile: "bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-950 dark:text-fuchsia-100",
    banner: "from-fuchsia-200 to-fuchsia-50 dark:from-fuchsia-900 dark:to-zinc-950",
    swatch: "bg-fuchsia-400",
  },
  lime: {
    tile: "bg-lime-100 text-lime-950 dark:bg-lime-950 dark:text-lime-100",
    banner: "from-lime-200 to-lime-50 dark:from-lime-900 dark:to-zinc-950",
    swatch: "bg-lime-400",
  },
  indigo: {
    tile: "bg-indigo-100 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-100",
    banner: "from-indigo-200 to-indigo-50 dark:from-indigo-900 dark:to-zinc-950",
    swatch: "bg-indigo-400",
  },
};

/** Keyword (in the normalized name) -> emoji. First match wins. */
const EMOJI_HINTS: [string[], string][] = [
  [["tombin", "chiusin", "manhole"], "🕳️"],
  [["panin", "sandwich", "piadin", "tramezzin"], "🥪"],
  [["pizz"], "🍕"],
  [["gelat", "ice cream"], "🍦"],
  [["caff", "coffee", "espresso", "cappuccin"], "☕"],
  [["cornett", "brioche", "croissant"], "🥐"],
  [["birr", "beer"], "🍺"],
  [["vin", "wine"], "🍷"],
  [["sushi"], "🍣"],
  [["kebab"], "🥙"],
  [["hamburger", "burger"], "🍔"],
  [["pasta", "carbonar", "amatrician"], "🍝"],
  [["dolc", "torta", "cake", "pasticc"], "🍰"],
  [["bagn", "toilet", "wc"], "🚻"],
  [["distributor", "vending", "macchinett"], "🍫"],
  [["panchin", "bench"], "🪑"],
  [["fontan", "nason"], "⛲"],
  [["parc", "giardin", "park"], "🌳"],
  [["spiagg", "beach", "mare"], "🏖️"],
  [["montagn", "sentier", "hike", "trekking"], "🥾"],
  [["tramont", "sunset", "alba"], "🌅"],
  [["tren", "train"], "🚆"],
  [["stazion", "station"], "🚉"],
  [["autobus", "bus", "tram"], "🚌"],
  [["aeroport", "airport", "aere", "voli"], "✈️"],
  [["parchegg", "parking"], "🅿️"],
  [["ascensor", "elevator"], "🛗"],
  [["muse", "museum", "mostr"], "🏛️"],
  [["chies", "church", "cattedral"], "⛪"],
  [["piazz", "square"], "🏙️"],
  [["film", "movie", "cinema"], "🎬"],
  [["libr", "book", "romanz"], "📚"],
  [["videogioc", "videogame", "game"], "🎮"],
  [["serie", "tv", "show"], "📺"],
  [["album", "disc", "music", "canzon", "song"], "💿"],
  [["concert", "festival"], "🎤"],
  [["can", "dog"], "🐕"],
  [["gatt", "cat"], "🐈"],
  [["scarp", "sneaker", "shoe"], "👟"],
  [["auto", "macchin", "car"], "🚗"],
  [["bici", "bike"], "🚲"],
  [["telefon", "smartphone", "phone"], "📱"],
  [["hotel", "albergh", "b b"], "🏨"],
  [["ristorant", "trattori", "osteri", "restaurant"], "🍽️"],
  [["bar", "pub", "cocktail"], "🍸"],
  [["profum", "perfume"], "🌸"],
  [["piant", "fior", "flower", "plant"], "🪴"],
];

export function hashOf(text: string): number {
  return [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}

export function guessEmoji(normalizedName: string): string {
  const words = ` ${normalizedName} `;
  for (const [keys, emoji] of EMOJI_HINTS) {
    if (keys.some((k) => words.includes(` ${k}`))) return emoji;
  }
  return "⭐";
}

export function guessColor(normalizedName: string): CategoryColor {
  return COLORS[hashOf(normalizedName) % COLORS.length];
}

export function isColor(value: unknown): value is CategoryColor {
  return typeof value === "string" && (COLORS as readonly string[]).includes(value);
}

/** Saved style, or one derived from the name. */
export function styleOf(category: { icon?: string | null; color?: string | null; normalized_name?: string; name: string }) {
  const key = category.normalized_name ?? category.name.toLowerCase();
  const color = isColor(category.color) ? category.color : guessColor(key);
  return { emoji: category.icon || guessEmoji(key), color, classes: COLOR_CLASSES[color] };
}
