"use server";

import { fetchGiphy, type GiphyItem } from "./fetch";

export type { GiphyItem };

/**
 * GIF and sticker search via GIPHY (free API key: developers.giphy.com).
 * The key stays on the server (env GIPHY_API_KEY); without it this returns
 * null and only our own stickers are offered.
 */
export async function searchGiphy(
  kind: "gif" | "gsticker",
  query: string,
  lang: string,
): Promise<GiphyItem[] | null> {
  if (!process.env.GIPHY_API_KEY) return null;
  const q = String(query ?? "").trim().toLowerCase().slice(0, 50);
  try {
    return await fetchGiphy(kind === "gif" ? "gifs" : "stickers", q, lang === "en" ? "en" : "it");
  } catch (e) {
    console.error("searchGiphy", e);
    return [];
  }
}
