import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId, getReview } from "@/lib/data/queries";
import { DeleteReviewButton } from "@/components/DeleteReviewButton";
import { ReviewForm } from "@/components/ReviewForm";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/r/[id]/edit">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).editReview.title };
}

async function EditReview({
  lang,
  id,
  back,
}: {
  lang: Locale;
  id: string;
  back: string | null;
}) {
  const dict = await getDictionary(lang);
  const [review, userId] = await Promise.all([
    getReview(id),
    getCurrentUserId(),
  ]);
  if (!review) notFound();
  const item = review.item;
  const category = item?.category;
  if (!item || !category) notFound();
  const itemHref = `/${lang}/c/${category.slug}/${item.slug}`;
  if (review.user_id !== userId) redirect(itemHref);
  const target = back ?? itemHref;

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link href={target} className="text-sm text-zinc-500 hover:underline">
          {dict.editReview.back}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          {dict.editReview.title}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          <Link href={itemHref} className="font-medium hover:underline">
            {item.name}
          </Link>{" "}
          · {category.name}
        </p>
      </div>
      <ReviewForm
            userId={userId!}
        lang={lang}
        categoryId={review.category_id}
        categorySlug={category.slug}
        item={{ id: review.item_id, name: item.name }}
        existing={review}
        back={target}
        t={dict.reviewForm}
        common={dict.common}
      />
      <DeleteReviewButton
        reviewId={review.id}
        lang={lang}
        back={target}
        label={dict.reviewCard.delete}
        confirmText={dict.reviewCard.confirmDelete}
      />
    </>
  );
}

export default async function EditReviewPage({
  params,
  searchParams,
}: PageProps<"/[lang]/r/[id]/edit">) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {Promise.all([params, searchParams]).then(([{ lang, id }, sp]) => {
          if (!hasLocale(lang)) notFound();
          const back =
            typeof sp.back === "string" && sp.back.startsWith(`/${lang}/`)
              ? sp.back
              : null;
          return <EditReview lang={lang} id={id} back={back} />;
        })}
      </Suspense>
    </div>
  );
}
