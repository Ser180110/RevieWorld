"use client";

import { deleteReview } from "@/lib/social/actions";
import { ConfirmButton } from "./ConfirmButton";

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
    <form action={deleteReview}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="back" value={back} />
      <ConfirmButton
        label={label}
        confirmText={confirmText}
        className="cursor-pointer text-sm text-zinc-500 hover:text-red-600 hover:underline"
      />
    </form>
  );
}
