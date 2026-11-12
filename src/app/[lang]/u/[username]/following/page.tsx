import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { FollowsContent } from "@/components/FollowsContent";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/u/[username]/following">): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)} · following` };
}

export default async function Page({
  params,
}: PageProps<"/[lang]/u/[username]/following">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {params.then(({ lang, username }) => {
          if (!hasLocale(lang)) notFound();
          return (
            <FollowsContent
              lang={lang}
              username={decodeURIComponent(username)}
              kind="following"
            />
          );
        })}
      </Suspense>
    </div>
  );
}
