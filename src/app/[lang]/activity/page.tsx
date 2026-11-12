import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId } from "@/lib/data/queries";
import { ActivityFeed } from "@/components/ActivityFeed";

export async function generateMetadata({ params }: PageProps<"/[lang]/activity">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).activity.title };
}

async function Feed({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);
  const userId = await getCurrentUserId();
  if (!userId) {
    return (
      <Link href={`/${lang}/login`} className="underline">
        {dict.activity.signIn}
      </Link>
    );
  }
  return <ActivityFeed lang={lang} dict={dict} userId={userId} limit={100} />;
}

export default async function ActivityPage({ params }: PageProps<"/[lang]/activity">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{dict.activity.title}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{dict.activity.subtitle}</p>
      </div>
      <Suspense fallback={<p className="text-zinc-500">{dict.common.loading}</p>}>
        <Feed lang={lang} />
      </Suspense>
    </div>
  );
}
