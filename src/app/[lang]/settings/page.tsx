import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId, getProfileById } from "@/lib/data/queries";
import { ProfileForm } from "@/components/ProfileForm";
import { DeleteAccount } from "@/components/DeleteAccount";

export async function generateMetadata({ params }: PageProps<"/[lang]/settings">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).settings.title };
}

async function SettingsContent({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);
  const userId = await getCurrentUserId();
  if (!userId) redirect(`/${lang}/login`);
  const profile = await getProfileById(userId);
  if (!profile) notFound();
  return (
    <>
      <ProfileForm lang={lang} profile={profile} t={dict.settings} />
      <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">{dict.auth.changePassword}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{dict.auth.changePasswordHint}</p>
        <Link
          href={`/${lang}/reset-password`}
          className="self-start rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          🔑 {dict.auth.changePassword}
        </Link>
      </section>
      <DeleteAccount
        lang={lang}
        username={profile.username}
        special={Boolean(profile.badge)}
        t={dict.settings.deleteAccount}
      />
    </>
  );
}

export default async function SettingsPage({ params }: PageProps<"/[lang]/settings">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{dict.settings.title}</h1>
      <Suspense fallback={<p className="text-zinc-500">{dict.common.loading}</p>}>
        <SettingsContent lang={lang} />
      </Suspense>
    </div>
  );
}
