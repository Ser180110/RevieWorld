import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UserMenu } from "@/components/UserMenu";
import { SearchBox } from "@/components/SearchBox";
import "../globals.css";

const navLink = "whitespace-nowrap rounded-full px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: { default: dict.meta.title, template: `%s · ${dict.meta.title}` },
    description: dict.meta.description,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html lang={lang} className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link
              href={`/${lang}`}
              className="flex items-center gap-1.5 text-lg font-bold tracking-tight"
            >
              <span aria-hidden className="text-xl">🌍</span>
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
                RevieWorld
              </span>
            </Link>
            {/* Desktop: everything in one row. */}
            <div className="hidden items-center justify-end gap-3 lg:flex">
              <SearchBox id="search-desktop" lang={lang} label={dict.search.label} placeholder={dict.search.short} className="w-44 xl:w-56" />
              <Link href={`/${lang}/new`} className={`${navLink} font-medium`}>
                + {dict.nav.newReview}
              </Link>
              <Link href={`/${lang}/categories`} className={navLink}>
                {dict.nav.explore}
              </Link>
              <Link href={`/${lang}/people`} className={navLink}>
                {dict.nav.people}
              </Link>
              {/* usePathname() is request data on dynamic routes: keep it out of the static shell. */}
              <Suspense fallback={<span className="w-36" />}>
                <LanguageSwitcher current={lang} label={dict.nav.language} />
              </Suspense>
              <Suspense fallback={null}>
                <UserMenu lang={lang} t={dict.nav} />
              </Suspense>
            </div>
            {/* Mobile: "+ Recensisci" and a menu. */}
            <div className="flex items-center gap-1 lg:hidden">
              <Link
                href={`/${lang}/search`}
                aria-label={dict.search.title}
                title={dict.search.title}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                🔍
              </Link>
              <Link href={`/${lang}/new`} className={`${navLink} font-medium`}>
                + {dict.nav.newReview}
              </Link>
              <details className="group relative">
                <summary
                  aria-label={dict.nav.menu}
                  className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden"
                >
                  <span className="group-open:hidden">☰</span>
                  <span className="hidden group-open:inline">✕</span>
                </summary>
                <div className="absolute right-0 z-20 mt-2 flex w-64 flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                  <SearchBox id="search-mobile" lang={lang} label={dict.search.label} placeholder={dict.search.short} className="w-full" />
                  <Link href={`/${lang}/categories`} className={navLink}>
                    {dict.nav.explore}
                  </Link>
                  <Link href={`/${lang}/people`} className={navLink}>
                    {dict.nav.people}
                  </Link>
                  <Suspense fallback={null}>
                    <UserMenu lang={lang} t={dict.nav} column />
                  </Suspense>
                  <Suspense fallback={null}>
                    <LanguageSwitcher current={lang} label={dict.nav.language} />
                  </Suspense>
                </div>
              </details>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
          {dict.footer.tagline}
        </footer>
      </body>
    </html>
  );
}
