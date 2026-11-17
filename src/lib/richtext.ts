/**
 * Reddit-style formatting in reviews, stored as plain text:
 *   **grassetto**  *corsivo*  __sottolineato__  >!spoiler!<  [parole](https://link)
 * plus @menzioni. Parsed into nodes (never HTML), so nothing can be injected.
 */
export type RichNode =
  | { type: "text"; text: string }
  | { type: "bold" | "italic" | "underline" | "spoiler"; children: RichNode[] }
  | { type: "link"; href: string; children: RichNode[] }
  | { type: "mention"; username: string };

type Rule = { re: RegExp; make: (m: RegExpExecArray, inLink: boolean) => RichNode | null };

const RULES: Rule[] = [
  { re: />!([\s\S]+?)!</, make: (m, l) => ({ type: "spoiler", children: parse(m[1], l) }) },
  {
    re: /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/,
    make: (m, l) => (l ? null : { type: "link", href: m[2], children: parse(m[1], true) }),
  },
  { re: /\*\*(?!\s)([\s\S]+?)\*\*/, make: (m, l) => ({ type: "bold", children: parse(m[1], l) }) },
  { re: /__(?!\s)([\s\S]+?)__/, make: (m, l) => ({ type: "underline", children: parse(m[1], l) }) },
  { re: /\*(?![\s*])([^*\n]+?)\*/, make: (m, l) => ({ type: "italic", children: parse(m[1], l) }) },
  { re: /(?<![\w@])@([A-Za-z0-9_]{3,30})/, make: (m, l) => (l ? { type: "text", text: m[0] } : { type: "mention", username: m[1] }) },
];

export function parse(text: string, inLink = false): RichNode[] {
  const out: RichNode[] = [];
  let rest = text;
  while (rest) {
    let best: { m: RegExpExecArray; rule: Rule } | null = null;
    for (const rule of RULES) {
      const m = rule.re.exec(rest);
      if (m && (!best || m.index < best.m.index)) best = { m, rule };
    }
    if (!best) {
      out.push({ type: "text", text: rest });
      break;
    }
    const node = best.rule.make(best.m, inLink);
    const cut = best.m.index + (node ? best.m[0].length : 1);
    const before = rest.slice(0, best.m.index) + (node ? "" : rest.slice(best.m.index, cut));
    if (before) out.push({ type: "text", text: before });
    if (node) out.push(node);
    rest = rest.slice(cut);
  }
  // Merge neighbouring text pieces.
  return out.reduce<RichNode[]>((acc, n) => {
    const last = acc[acc.length - 1];
    if (n.type === "text" && last?.type === "text") last.text += n.text;
    else acc.push(n);
    return acc;
  }, []);
}

/** The text without the marks, spoilers hidden as `hidden` (previews, story image, link cards). */
export function toPlain(text: string, hidden = "▒▒▒"): string {
  const walk = (nodes: RichNode[]): string =>
    nodes
      .map((n) =>
        n.type === "text" ? n.text : n.type === "mention" ? `@${n.username}` : n.type === "spoiler" ? hidden : walk(n.children),
      )
      .join("");
  return walk(parse(text));
}
