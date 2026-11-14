import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId } from "@/lib/data/queries";
import { NewPasswordForm } from "@/components/NewPasswordForm";

export async function generateMetadata({ params }: PageProps<"/[lang]/reset-password">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).auth.newPasswordTitle };
}

/** Reached from the reset email (already signed in by the link) or from the settings. */
async function Content({ lang }: { lang: Locale }) {
  const t = (await getDictionary(lang)).auth;
  const userId = await getCurrentUserId();
  if (!userId) redirect(`/${lang}/forgot-password?expired=1`);
  return <NewPasswordForm lang={lang} t={t} />;
}

export default async function Page({ params }: PageProps<"/[lang]/reset-password">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = (await getDictionary(lang)).auth;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t.newPasswordTitle}</h1>
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        <Content lang={lang} />
      </Suspense>
    </div>
  );
}
