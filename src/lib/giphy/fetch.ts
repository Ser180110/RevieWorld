import { cacheLife } from "next/cache";

export type GiphyItem = { id: string; w: number; h: number; title: string };

type GiphyResponse = {
  data?: {
    id: string;
    title?: string;
    images?: { fixed_width?: { width?: string; height?: string } };
  }[];
};

const ID = /^[A-Za-z0-9]{5,40}$/;

/**
 * One GIPHY search (or trending list), cached for an hour and shared by
 * everyone, so the free API quota lasts. Throws on errors (not cached).
 */
export async function fetchGiphy(type: "gifs" | "stickers", q: string, lang: string): Promise<GiphyItem[]> {
  "use cache";
  cacheLife("hours");
  const base = process.env.GIPHY_API_BASE ?? "https://api.giphy.com";
  const params = new URLSearchParams({
    api_key: process.env.GIPHY_API_KEY ?? "",
    limit: "24",
    rating: "pg-13",
    bundle: "fixed_width",
  });
  if (q) {
    params.set("q", q);
    params.set("lang", lang);
  }
  const res = await fetch(`${base}/v1/${type}/${q ? "search" : "trending"}?${params}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`GIPHY ${res.status}`);
  const json = (await res.json()) as GiphyResponse;
  return (json.data ?? [])
    .filter((d) => ID.test(d.id))
    .map((d) => ({
      id: d.id,
      title: d.title ?? "",
      w: Number(d.images?.fixed_width?.width) || 200,
      h: Number(d.images?.fixed_width?.height) || 200,
    }));
}
