import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { supabaseEnv } from "@/lib/supabase/env";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export async function generateMetadata({ params }: PageProps<"/[lang]/forgot-password">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).auth.forgotTitle };
}

async function ExpiredNotice({
  searchParams,
  text,
}: {
  searchParams: PageProps<"/[lang]/forgot-password">["searchParams"];
  text: string;
}) {
  const { expired } = await searchParams;
  if (expired !== "1") return null;
  return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{text}</p>;
}

export default async function Page({ params, searchParams }: PageProps<"/[lang]/forgot-password">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = (await getDictionary(lang)).auth;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t.forgotTitle}</h1>
      <Suspense fallback={null}>
        <ExpiredNotice searchParams={searchParams} text={t.linkExpired} />
      </Suspense>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.forgotHint}</p>
      {supabaseEnv() ? (
        <ForgotPasswordForm lang={lang} t={t} />
      ) : (
        <p className="rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-900">{t.notConfigured}</p>
      )}
    </div>
  );
}
