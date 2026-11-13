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

/**
 * Keyword (start of a word in the normalized name) -> emoji. First match wins,
 * so more specific keywords come first.
 */
const EMOJI_HINTS: [string[], string][] = [
  // Food and drink
  [["tombin", "chiusin", "manhole"], "🕳️"],
  [["panin", "sandwich", "piadin", "tramezzin", "toast"], "🥪"],
  [["pizz"], "🍕"],
  [["gelat", "ice cream", "granit"], "🍦"],
  [["caff", "coffee", "espresso", "cappuccin"], "☕"],
  [["te$", "the$", "tea$", "tisan"], "🍵"],
  [["cornett", "brioche", "croissant", "colazion", "breakfast"], "🥐"],
  [["birr", "beer"], "🍺"],
  [["vino", "vini", "wine", "cantin"], "🍷"],
  [["cocktail", "spritz", "aperitiv"], "🍹"],
  [["acqua", "water", "bottigli"], "💧"],
  [["bibit", "soda", "lattin", "energy drink"], "🥤"],
  [["succ", "juice", "spremut"], "🧃"],
  [["sushi", "ramen", "giappones"], "🍣"],
  [["kebab"], "🥙"],
  [["hamburger", "burger", "fast food", "mcdonald"], "🍔"],
  [["patatin", "fries", "patat"], "🍟"],
  [["pasta", "carbonar", "amatrician", "lasagn", "spaghett"], "🍝"],
  [["risott", "riso", "rice"], "🍚"],
  [["dolc", "torta", "cake", "pasticc", "biscott", "cookie"], "🍰"],
  [["cioccolat", "chocolate", "nutella"], "🍫"],
  [["caramell", "candy", "merendin", "snack"], "🍬"],
  [["frutt", "fruit", "mela", "mele", "banan"], "🍎"],
  [["formagg", "cheese", "mozzarell"], "🧀"],
  [["carn", "bistecc", "steak", "salum", "prosciutt"], "🥩"],
  [["pesc", "fish", "frittur"], "🐟"],
  [["insalat", "salad", "vegan", "veget"], "🥗"],
  [["supermercat", "supermarket", "spesa", "mercat"], "🛒"],
  [["ristorant", "trattori", "osteri", "restaurant", "mensa", "cena", "pranz"], "🍽️"],
  [["bar$", "bari$", "pub", "locali", "discotec", "club"], "🍸"],
  // Places
  [["bagn", "toilet", "wc", "gabinett"], "🚻"],
  [["distributor", "vending", "macchinett"], "🎰"],
  [["panchin", "bench"], "🪑"],
  [["sedi", "sedia", "poltron", "divan", "sofa", "chair"], "🪑"],
  [["lett", "materass", "cuscin", "bed"], "🛏️"],
  [["piscin", "pool", "nuot"], "🏊"],
  [["palestr", "gym", "fitness"], "🏋️"],
  [["calc", "football", "soccer", "stadi"], "⚽"],
  [["basket", "pallacanestr"], "🏀"],
  [["tennis", "padel"], "🎾"],
  [["sport"], "🏅"],
  [["fontan", "nason"], "⛲"],
  [["parco", "parchi", "giardin", "park", "villa"], "🌳"],
  [["spiagg", "beach", "mare", "lido"], "🏖️"],
  [["lago", "laghi", "lake", "fium", "river"], "🏞️"],
  [["montagn", "sentier", "hike", "trekking", "rifug"], "🥾"],
  [["sci$", "sciare", "ski", "neve", "snow"], "⛷️"],
  [["tramont", "sunset", "alba"], "🌅"],
  [["citta", "city", "paes", "borg", "quartier"], "🏘️"],
  [["piazz", "square"], "🏙️"],
  [["strad", "via$", "vie$", "road", "street"], "🛣️"],
  [["pont", "bridge"], "🌉"],
  [["muse", "museum", "mostr", "galleri"], "🏛️"],
  [["chies", "church", "cattedral", "basilic"], "⛪"],
  [["castell", "castle"], "🏰"],
  [["universit", "facolt", "aul", "lezion", "professor", "prof"], "🎓"],
  [["scuol", "school", "liceo", "class"], "🏫"],
  [["ufficio", "uffic", "office", "lavor", "job"], "💼"],
  [["ospedal", "hospital", "medic", "dottor", "farmaci"], "🏥"],
  [["hotel", "albergh", "b b", "ostell", "airbnb"], "🏨"],
  [["negoz", "shop", "store", "centro commerc"], "🛍️"],
  [["cinema", "sala$"], "🎟️"],
  // Getting around
  [["tren", "train", "frecciaross", "italo"], "🚆"],
  [["stazion", "station"], "🚉"],
  [["metro", "metropolit", "subway"], "🚇"],
  [["autobus", "bus", "tram", "pullman"], "🚌"],
  [["aeroport", "airport", "aere", "voli", "volo", "flight"], "✈️"],
  [["parchegg", "parking"], "🅿️"],
  [["ascensor", "elevator", "scal"], "🛗"],
  [["benzin", "carburant", "distributor di benzin", "gas station"], "⛽"],
  [["auto", "macchin", "car$", "cars$"], "🚗"],
  [["moto", "scooter", "vesp"], "🛵"],
  [["bici", "bike", "monopattin"], "🚲"],
  [["nave", "navi", "traghett", "barc", "boat", "ferry"], "⛴️"],
  [["viagg", "travel", "vacanz", "holiday", "gita"], "🧳"],
  // Media and culture
  [["film", "movie"], "🎬"],
  [["libr", "book", "romanz", "fumett", "manga"], "📚"],
  [["videogioc", "videogame", "game", "giochi", "gioco", "playstation", "xbox", "nintendo"], "🎮"],
  [["giochi da tavol", "board game"], "🎲"],
  [["serie", "tv$", "show", "netflix", "anime"], "📺"],
  [["podcast", "radio"], "🎙️"],
  [["album", "disc", "music", "canzon", "song", "rap$", "trap$", "rock"], "🎧"],
  [["concert", "festival", "event", "cantant", "singer", "karaoke"], "🎤"],
  [["teatr", "theatre", "theater"], "🎭"],
  [["arte$", "art$", "quadr", "dipint"], "🎨"],
  [["foto", "photo"], "📷"],
  [["meme", "barzellett", "battut", "joke"], "😂"],
  // Communication and tech
  [["messagg", "message", "chat", "whatsapp", "sms"], "💬"],
  [["email", "mail", "lettera", "letter", "poste"], "✉️"],
  [["social", "instagram", "tiktok", "facebook", "post$"], "📲"],
  [["telefon", "smartphone", "phone", "cellular", "iphone"], "📱"],
  [["computer", "pc$", "laptop", "portatil"], "💻"],
  [["app$", "apps", "sito", "siti", "website", "software"], "🧑‍💻"],
  [["cuffi", "auricolar", "headphone"], "🎧"],
  // People, animals, things
  [["cane", "cani", "canil", "dog", "cuccioli"], "🐕"],
  [["gatt", "cat"], "🐈"],
  [["animal", "zoo", "pet"], "🐾"],
  [["uccell", "bird", "piccion"], "🐦"],
  [["amic", "friend", "person", "gente"], "🧑‍🤝‍🧑"],
  [["professor", "insegnant", "teacher"], "🧑‍🏫"],
  [["appuntament", "date$", "dating", "amor", "love", "ex$"], "💘"],
  [["scarp", "sneaker", "shoe"], "👟"],
  [["vestit", "magliett", "abbigliament", "cloth", "outfit", "felp"], "👕"],
  [["occhial", "glasses"], "👓"],
  [["profum", "perfume", "cosmet", "trucc", "makeup"], "💄"],
  [["capell", "barbier", "parrucch", "hair"], "💇"],
  [["piant", "fior", "flower", "plant"], "🪴"],
  [["meteo", "tempo$", "weather", "pioggi", "sole$"], "🌦️"],
  [["sonn", "dormir", "sleep", "pisolin"], "😴"],
  [["sogn", "dream"], "💭"],
  [["regal", "gift", "natal", "christmas"], "🎁"],
  [["compleann", "birthday", "fest"], "🎂"],
  [["soldi", "money", "banca", "banche", "prezz", "offert"], "💰"],
  [["giocattol", "toy", "lego"], "🧸"],
  [["casa", "case", "home", "appartament", "stanz", "camer"], "🏠"],
  [["cucin", "kitchen", "ricett", "recipe"], "🍳"],
];

/** Neutral fallbacks, picked from the name, so new categories don't all look the same. */
const FALLBACK_EMOJI = ["✨", "🎯", "🧩", "💡", "📌", "🔖", "🌀", "🎈", "🪄", "🧭", "🔮", "🏷️"];

export function hashOf(text: string): number {
  return [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}

export function guessEmoji(normalizedName: string): string {
  // The first word that matches decides: "cani del quartiere" is about dogs.
  const words = normalizedName.split(" ");
  for (let i = 0; i < words.length; i++) {
    const rest = ` ${words.slice(i).join(" ")} `;
    for (const [keys, emoji] of EMOJI_HINTS) {
      const hit = keys.some((k) =>
        k.endsWith("$") ? words[i] === k.slice(0, -1) : k.includes(" ") ? rest.startsWith(` ${k}`) : words[i].startsWith(k),
      );
      if (hit) return emoji;
    }
  }
  return FALLBACK_EMOJI[hashOf(normalizedName) % FALLBACK_EMOJI.length];
}

/** Emoji offered in the picker when creating or editing a category. */
export const EMOJI_CHOICES = [
  "🍕", "🍔", "🥪", "🍝", "🍣", "🍦", "☕", "🍺", "🍷", "💧",
  "🚻", "🪑", "🏊", "🏋️", "⚽", "🌳", "🏖️", "🏔️", "🏛️", "🏫",
  "🚆", "🚌", "✈️", "🚗", "🚲", "🅿️", "🛒", "🛍️", "🏨", "🏠",
  "🎬", "📚", "🎮", "📺", "🎧", "🎤", "🎭", "🎨", "📷", "😂",
  "💬", "📱", "💻", "🐕", "🐈", "👟", "👕", "💄", "🪴", "🎁",
  "💘", "😴", "💰", "🧸", "✨", "🎯", "💡", "⭐", "🔥", "🌍",
];

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
  // "⭐" was the old automatic default: guess again with the better hints.
  const icon = category.icon && category.icon !== "⭐" ? category.icon : guessEmoji(key);
  return { emoji: icon, color, classes: COLOR_CLASSES[color] };
}
