import { cacheLife } from "next/cache";

/**
 * Free translation through MyMemory (no key, no card: a few thousand words a
 * day). Results are cached on the server for good, so each review is
 * translated once for everyone. Throws when the daily quota is used up
 * (errors are not cached).
 */
export async function translateWithMyMemory(text: string, from: string, to: string): Promise<string> {
  "use cache";
  cacheLife("max");
  const out: string[] = [];
  for (const chunk of chunks(text, 400)) {
    if (!chunk.trim()) {
      out.push(chunk);
      continue;
    }
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${from}|${to}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`mymemory ${res.status}`);
    const data = (await res.json()) as {
      responseStatus?: number | string;
      quotaFinished?: boolean;
      responseData?: { translatedText?: string };
    };
    const translated = data.responseData?.translatedText ?? "";
    if (Number(data.responseStatus) !== 200 || data.quotaFinished || !translated || /MYMEMORY WARNING/i.test(translated)) {
      throw new Error(`mymemory refused: ${data.responseStatus}`);
    }
    out.push(decodeEntities(translated));
  }
  return out.join("");
}

/** Splits on line breaks and sentence ends, keeping each piece under `max` characters. */
function chunks(text: string, max: number): string[] {
  const pieces = text.split(/(\n+|(?<=[.!?…])\s+)/);
  const out: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (/^\s+$/.test(piece)) {
      if (current) out.push(current);
      out.push(piece);
      current = "";
      continue;
    }
    if ((current + piece).length > max && current) {
      out.push(current);
      current = "";
    }
    if (piece.length > max) {
      for (let i = 0; i < piece.length; i += max) out.push(piece.slice(i, i + max));
    } else {
      current += piece;
    }
  }
  if (current) out.push(current);
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
