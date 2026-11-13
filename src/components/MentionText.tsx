import Link from "next/link";

const MENTION = /(@[A-Za-z0-9_]{3,30})/g;

/** Text with every "@username" turned into a link to that profile. */
export function MentionText({ text, lang }: { text: string; lang: string }) {
  const parts = text.split(MENTION);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Link key={i} href={`/${lang}/u/${part.slice(1)}`} className="font-medium text-violet-600 hover:underline dark:text-violet-400">
            {part}
          </Link>
        ) : (
          part
        ),
      )}
    </>
  );
}
