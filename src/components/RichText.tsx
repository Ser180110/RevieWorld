import Link from "next/link";
import { parse, type RichNode } from "@/lib/richtext";
import { Spoiler } from "./Spoiler";

/** A review's text with its formatting: bold, italic, underline, spoilers, links and @mentions. */
export function RichText({
  text,
  lang,
  spoilerLabel,
  spoilerHint,
}: {
  text: string;
  lang: string;
  spoilerLabel: string;
  spoilerHint?: string;
}) {
  const render = (nodes: RichNode[]): React.ReactNode[] =>
    nodes.map((n, i) => {
      switch (n.type) {
        case "text":
          return n.text;
        case "bold":
          return <strong key={i}>{render(n.children)}</strong>;
        case "italic":
          return <em key={i}>{render(n.children)}</em>;
        case "underline":
          return (
            <span key={i} className="underline underline-offset-2">
              {render(n.children)}
            </span>
          );
        case "spoiler":
          return (
            <Spoiler key={i} label={spoilerLabel} hint={spoilerHint}>
              {render(n.children)}
            </Spoiler>
          );
        case "link":
          return (
            <a
              key={i}
              href={n.href}
              target="_blank"
              rel="nofollow ugc noopener noreferrer"
              className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
            >
              {render(n.children)}
            </a>
          );
        case "mention":
          return (
            <Link
              key={i}
              href={`/${lang}/u/${n.username}`}
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              @{n.username}
            </Link>
          );
      }
    });
  return <>{render(parse(text))}</>;
}
