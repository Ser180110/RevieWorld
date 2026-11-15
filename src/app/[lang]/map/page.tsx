import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId } from "@/lib/data/queries";
import { ReviewMap } from "@/components/ReviewMap";

export async function generateMetadata({ params }: PageProps<"/[lang]/map">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).map.title };
}

function coord(v: string | string[] | undefined, max: number): number | null {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return v !== undefined && Number.isFinite(n) && Math.abs(n) <= max ? n : null;
}

async function MapContent({
  lang,
  searchParams,
}: {
  lang: Locale;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [dict, sp, userId] = await Promise.all([getDictionary(lang), searchParams, getCurrentUserId()]);
  const lat = coord(sp.lat, 90);
  const lng = coord(sp.lng, 180);
  const focus = typeof sp.review === "string" ? sp.review : null;
  return (
    <ReviewMap
      lang={lang}
      signedIn={Boolean(userId)}
      start={lat !== null && lng !== null ? { lat, lng } : null}
      focus={focus}
      t={dict.map}
    />
  );
}

export default async function MapPage({ params, searchParams }: PageProps<"/[lang]/map">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">🗺️ {dict.map.title}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{dict.map.subtitle}</p>
      </div>
      <Suspense fallback={<p className="text-zinc-500">{dict.common.loading}</p>}>
        <MapContent lang={lang} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
