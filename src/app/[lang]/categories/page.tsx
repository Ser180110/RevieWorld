import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getAllCategories } from "@/lib/data/queries";
import { CategoryTile } from "@/components/CategoryTile";

export async function generateMetadata({ params }: PageProps<"/[lang]/categories">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).explore.title };
}

async function Grid({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);
  const categories = await getAllCategories();
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((c) => (
        <CategoryTile key={c.id} category={c} lang={lang} reviewsLabel={dict.common.reviews} />
      ))}
    </div>
  );
}

export default async function CategoriesPage({ params }: PageProps<"/[lang]/categories">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">{dict.explore.title}</h1>
          <p className="text-zinc-600 dark:text-zinc-400">{dict.explore.subtitle}</p>
        </div>
        <Link
          href={`/${lang}/new`}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {dict.explore.create}
        </Link>
      </div>
      <Suspense fallback={<p className="text-zinc-500">{dict.common.loading}</p>}>
        <Grid lang={lang} />
      </Suspense>
    </div>
  );
}
