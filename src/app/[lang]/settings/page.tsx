import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId, getProfileById } from "@/lib/data/queries";
import { ProfileForm } from "@/components/ProfileForm";

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
  return <ProfileForm lang={lang} profile={profile} t={dict.settings} />;
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
