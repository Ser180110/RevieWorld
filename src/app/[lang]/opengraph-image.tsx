import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { OG_SIZE, ogCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "RevieWorld";

/** Default share picture for every page that has no more specific one. */
export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(hasLocale(lang) ? lang : "it");
  return ogCard({ title: dict.home.headline, body: null, kicker: "RevieWorld", footer: dict.meta.description });
}
