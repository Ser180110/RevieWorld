import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UserMenu } from "@/components/UserMenu";
import "../globals.css";

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
      <body className="flex min-h-full flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href={`/${lang}`} className="text-lg font-semibold tracking-tight">
              RevieWorld
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href={`/${lang}/new`}
                className="rounded-full px-3 py-1 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                + {dict.nav.newReview}
              </Link>
              {/* usePathname() is request data on dynamic routes: keep it out of the static shell. */}
              <Suspense fallback={<span className="w-36" />}>
                <LanguageSwitcher current={lang} label={dict.nav.language} />
              </Suspense>
              <Suspense fallback={null}>
                <UserMenu lang={lang} t={dict.nav} />
              </Suspense>
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
