import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId } from "@/lib/data/queries";
import { ListForm } from "@/components/ListForm";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/lists/new">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).lists.createTitle };
}

async function NewListForm({
  lang,
  itemId,
  back,
}: {
  lang: Locale;
  itemId?: string;
  back: string;
}) {
  const dict = await getDictionary(lang);
  if (!(await getCurrentUserId())) redirect(`/${lang}/login`);
  return (
    <ListForm lang={lang} t={dict.lists} itemId={itemId} cancelHref={back} />
  );
}

export default async function NewListPage({
  params,
  searchParams,
}: PageProps<"/[lang]/lists/new">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        {dict.lists.createTitle}
      </h1>
      <Suspense
        fallback={<p className="text-zinc-500">{dict.common.loading}</p>}
      >
        {searchParams.then((sp) => {
          const item = typeof sp.item === "string" ? sp.item : undefined;
          const back =
            typeof sp.back === "string" && sp.back.startsWith(`/${lang}/`)
              ? sp.back
              : `/${lang}`;
          return <NewListForm lang={lang} itemId={item} back={back} />;
        })}
      </Suspense>
    </div>
  );
}
