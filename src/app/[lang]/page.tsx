import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.home;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 px-4 py-16 sm:py-24">
      <section className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.headline}</h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">{t.subheadline}</p>
      </section>

      {/* The search will suggest existing categories and items (phase 1). */}
      <form role="search" className="flex flex-col gap-2 sm:flex-row" action={`/${lang}`}>
        <label htmlFor="q" className="sr-only">
          {t.searchLabel}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          placeholder={t.searchPlaceholder}
          className="h-12 flex-1 rounded-full border border-zinc-300 bg-transparent px-5 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
        />
        <button
          type="submit"
          className="h-12 rounded-full bg-zinc-900 px-6 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {t.searchButton}
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t.howTitle}</h2>
        <ol className="list-decimal space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
          {t.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
