import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { CategoryPicker } from "@/components/CategoryPicker";

export async function generateMetadata({ params }: PageProps<"/[lang]/new">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).newReview.title };
}

export default async function NewReviewPage({ params, searchParams }: PageProps<"/[lang]/new">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{dict.newReview.title}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{dict.newReview.step1}</p>
      </div>
      <Suspense fallback={<p className="text-zinc-500">{dict.common.loading}</p>}>
        {searchParams.then((sp) => (
          <CategoryPicker
            lang={lang}
            initialQuery={typeof sp.q === "string" ? sp.q : ""}
            t={dict.newReview}
            common={dict.common}
            errors={dict.reviewForm.errors}
          />
        ))}
      </Suspense>
    </div>
  );
}
