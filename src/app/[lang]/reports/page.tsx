import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { describeReportTargets, getCurrentUserId, getOpenReports, isModerator } from "@/lib/data/queries";
import { resolveReport } from "@/lib/moderation/actions";
import { formatDate } from "@/lib/format";
import { previewText } from "@/lib/stickers";
import { ConfirmButton } from "@/components/ConfirmButton";

export async function generateMetadata({ params }: PageProps<"/[lang]/reports">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).moderation.reportsTitle };
}

/** Founders only: everything people reported, to remove or keep. */
async function Reports({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);
  const t = dict.moderation;
  const userId = await getCurrentUserId();
  if (!userId) redirect(`/${lang}/login`);
  if (!(await isModerator(userId))) notFound();
  const reports = await getOpenReports();
  const targets = await describeReportTargets(reports);

  // One card per reported thing, with all its reports.
  const groups = new Map<string, typeof reports>();
  for (const r of reports) {
    const key = `${r.target_type}:${r.target_id}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  if (groups.size === 0) return <p className="text-zinc-500">{t.reportsEmpty}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {[...groups.values()].map((list) => {
        const first = list[0];
        const target = targets[first.target_id];
        return (
          <li key={first.id} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                {t.types[first.target_type]}
              </span>
              <span className="font-semibold">{target?.label ?? "—"}</span>
              <span className="text-zinc-500">· 🚩 {list.length}</span>
            </div>
            {target?.excerpt && (
              <p className="line-clamp-3 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
                “{previewText(target.excerpt)}”
              </p>
            )}
            <ul className="flex flex-col gap-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              {list.map((r) => {
                const [reason, ...note] = r.reason.split(": ");
                const label = t.reasons[reason as keyof typeof t.reasons] ?? reason;
                return (
                  <li key={r.id}>
                    <b>{label}</b>
                    {note.length > 0 && ` – ${note.join(": ")}`} · {t.reportedBy} @{r.reporter?.username ?? "?"} ·{" "}
                    {formatDate(r.created_at, lang)}
                  </li>
                );
              })}
            </ul>
            {first.target_type === "user" && <p className="text-xs text-zinc-500">{t.userNote}</p>}
            <div className="flex flex-wrap items-center gap-2">
              {target && (
                <Link
                  href={`/${lang}${target.href}`}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {t.open} →
                </Link>
              )}
              {first.target_type !== "user" && (
                <form action={resolveReport}>
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="reportId" value={first.id} />
                  <input type="hidden" name="action" value="hide" />
                  <ConfirmButton
                    label={`🗑️ ${t.hide}`}
                    okLabel={t.hide}
                    confirmText={t.hideConfirm}
                    className="cursor-pointer rounded-full bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                  />
                </form>
              )}
              <form action={resolveReport}>
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="reportId" value={first.id} />
                <input type="hidden" name="action" value="dismiss" />
                <button
                  type="submit"
                  className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ✓ {t.dismiss}
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function ReportsPage({ params }: PageProps<"/[lang]/reports">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">🚩 {dict.moderation.reportsTitle}</h1>
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        <Reports lang={lang} />
      </Suspense>
    </div>
  );
}
