import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId, getList } from "@/lib/data/queries";
import { ListForm } from "@/components/ListForm";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/l/[id]/edit">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).lists.editTitle };
}

async function EditList({ lang, id }: { lang: Locale; id: string }) {
  const dict = await getDictionary(lang);
  const [list, userId] = await Promise.all([getList(id), getCurrentUserId()]);
  if (!list) notFound();
  if (list.user_id !== userId) redirect(`/${lang}/l/${list.id}`);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        {dict.lists.editTitle}
      </h1>
      <ListForm
        lang={lang}
        t={dict.lists}
        existing={list}
        cancelHref={`/${lang}/l/${list.id}`}
      />
    </>
  );
}

export default async function EditListPage({
  params,
}: PageProps<"/[lang]/l/[id]/edit">) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {params.then(({ lang, id }) => {
          if (!hasLocale(lang)) notFound();
          return <EditList lang={lang} id={id} />;
        })}
      </Suspense>
    </div>
  );
}
