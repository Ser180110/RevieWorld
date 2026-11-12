import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { supabaseEnv } from "@/lib/supabase/env";
import { signIn } from "@/lib/auth/actions";
import { AuthForm } from "@/components/AuthForm";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.auth.signInTitle };
}

export default async function Page({ params }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = (await getDictionary(lang)).auth;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t.signInTitle}</h1>
      {supabaseEnv() ? (
        <AuthForm mode="signIn" lang={lang} t={t} action={signIn} />
      ) : (
        <p className="rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-900">{t.notConfigured}</p>
      )}
    </div>
  );
}
