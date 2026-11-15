import { setBlock } from "@/lib/moderation/actions";
import { ConfirmButton } from "./ConfirmButton";

/** Block / unblock someone from their profile (asks first when blocking). */
export function BlockButton({
  userId,
  blocked,
  path,
  t,
}: {
  userId: string;
  blocked: boolean;
  path: string;
  t: { block: string; unblock: string; blockConfirm: string };
}) {
  const cls =
    "inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800";
  return (
    <form action={setBlock}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="block" value={blocked ? "0" : "1"} />
      <input type="hidden" name="path" value={path} />
      {blocked ? (
        <button type="submit" className={cls}>
          🔓 {t.unblock}
        </button>
      ) : (
        <ConfirmButton label={`🚫 ${t.block}`} okLabel={t.block} confirmText={t.blockConfirm} className={cls} />
      )}
    </form>
  );
}
