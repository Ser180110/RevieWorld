import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId } from "@/lib/data/queries";
import { ActivityFeed, activityHref, type FeedKind } from "@/components/ActivityFeed";

export async function generateMetadata({ params }: PageProps<"/[lang]/activity">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).activity.title };
}

// Same size as the home page, whose "Vedi altre" opens page 2.
const PAGE_SIZE = 10;

async function Feed({
  lang,
  searchParams,
}: {
  lang: Locale;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const dict = await getDictionary(lang);
  const [sp, userId] = await Promise.all([searchParams, getCurrentUserId()]);
  const feed: FeedKind = sp.feed === "all" || !userId ? "all" : "following";
  const n = Number(sp.page);
  const page = Number.isInteger(n) && n > 1 ? Math.min(n, 500) : 1;
  const tabClass = (on: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      on
        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
        : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
    }`;
  return (
    <div className="flex flex-col gap-4">
      {userId && (
        <nav className="flex gap-1 self-start rounded-full bg-zinc-100 p-1 dark:bg-zinc-900" aria-label={dict.activity.title}>
          <Link href={activityHref(lang, "following")} className={tabClass(feed === "following")} aria-current={feed === "following" ? "page" : undefined}>
            {dict.feed.following}
          </Link>
          <Link href={activityHref(lang, "all")} className={tabClass(feed === "all")} aria-current={feed === "all" ? "page" : undefined}>
            {dict.feed.all}
          </Link>
        </nav>
      )}
      <ActivityFeed lang={lang} dict={dict} userId={userId} feed={feed} limit={PAGE_SIZE} page={page} />
    </div>
  );
}

export default async function ActivityPage({ params, searchParams }: PageProps<"/[lang]/activity">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{dict.activity.title}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{dict.activity.subtitleBoth}</p>
      </div>
      <Suspense fallback={<p className="text-zinc-500">{dict.common.loading}</p>}>
        <Feed lang={lang} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
