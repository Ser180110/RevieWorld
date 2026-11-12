import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getActivity, getViewer } from "@/lib/data/queries";
import { ReviewCard } from "./ReviewCard";

/** Reviews from the people the user follows (home section and /activity). */
export async function ActivityFeed({
  lang,
  dict,
  userId,
  limit,
  compact = false,
}: {
  lang: Locale;
  dict: Dictionary;
  userId: string;
  limit: number;
  compact?: boolean;
}) {
  const t = dict.activity;
  const { reviews, following } = await getActivity(userId, limit);
  if (compact && reviews.length === 0) return null;
  const viewer = await getViewer(reviews);

  if (following === 0) {
    return (
      <p className="text-zinc-500">
        {t.noFollows}{" "}
        <Link href={`/${lang}/people`} className="underline">
          {t.peopleLink}
        </Link>
        .
      </p>
    );
  }
  if (reviews.length === 0) return <p className="text-zinc-500">{t.empty}</p>;

  return (
    <div className="flex flex-col">
      {reviews.map((r) => (
        <ReviewCard
          key={r.id}
          review={r}
          lang={lang}
          showItem
          viewer={viewer}
          back={compact ? `/${lang}` : `/${lang}/activity`}
          t={dict.reviewCard}
          spoilerLabel={dict.reviewForm.spoiler}
        />
      ))}
      {compact && (
        <Link href={`/${lang}/activity`} className="mt-2 text-sm font-medium hover:underline">
          {t.seeAll}
        </Link>
      )}
    </div>
  );
}
