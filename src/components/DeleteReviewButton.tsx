"use client";

import { deleteReview } from "@/lib/social/actions";

/** Deletes one of your reviews after a confirmation, then goes back to `back`. */
export function DeleteReviewButton({
  reviewId,
  lang,
  back,
  label,
  confirmText,
}: {
  reviewId: string;
  lang: string;
  back: string;
  label: string;
  confirmText: string;
}) {
  return (
    <form
      action={deleteReview}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="back" value={back} />
      <button type="submit" className="cursor-pointer text-sm text-zinc-500 hover:text-red-600 hover:underline">
        {label}
      </button>
    </form>
  );
}
