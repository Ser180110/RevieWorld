/**
 * Guesses whether a review is written in Italian or English (the two
 * languages of the site) from the little words every sentence has. Returns
 * null when it can't tell (too short, emoji only, another language).
 */
const IT = new Set(
  "il lo la i gli le un una uno di da del della dei delle dello al alla ai alle nel nella nei con su per tra fra che non è e ed ma anche come più molto poco tutto tutti sono sei siamo era ho hai ha abbiamo hanno questo questa questi quello quella qui qua mi ti si ci vi ne se perché quando dove cosa però proprio ancora già sempre mai bene buono buona buonissimo bello bella bellissimo brutto brutta ottimo ottima davvero niente nulla po troppo".split(" "),
);
const EN = new Set(
  "the a an of to in on at for with from by and but or not is are was were be been am i you he she it we they my your his her its our their this that these those there here what when where why how very really so too just also all some any no yes good great nice bad best worst love like loved liked would could should will can do does did have has had place food again definitely amazing awesome pretty".split(" "),
);

export type SiteLang = "it" | "en";

export function detectLang(text: string | null | undefined): SiteLang | null {
  if (!text) return null;
  const words = text
    .toLowerCase()
    .replace(/https?:\/\/\S+|@[a-z0-9_]+/g, " ")
    .split(/[^a-zà-ÿ']+/)
    .flatMap((w) => w.split("'"))
    .filter(Boolean);
  if (words.length < 2) return null;
  let it = 0;
  let en = 0;
  for (const w of words) {
    if (IT.has(w)) it++;
    if (EN.has(w)) en++;
  }
  // Accents are a strong Italian hint ("è", "più", "perché").
  if (/[àèéìòù]/.test(text)) it += 2;
  if (it === 0 && en === 0) {
    // No little words: Italian words end in a vowel, English ones mostly don't.
    const long = words.filter((w) => w.length >= 3);
    if (long.length < 2) return null;
    const vowel = long.filter((w) => /[aeiouàèéìòù]$/.test(w)).length / long.length;
    if (vowel === 1) return "it";
    if (vowel <= 0.2 && long.length >= 3) return "en";
    return null;
  }
  if (it === en) return null;
  const best = Math.max(it, en);
  if (best < 2 && words.length > 3) return null;
  if (best < 1) return null;
  return it > en ? "it" : "en";
}
