import { ImageResponse } from "next/og";
import type { CategoryColor } from "@/lib/categoryStyle";
import { OG_LOGO, OG_LOGO_SIZE } from "./logo";

/** Instagram / WhatsApp story size. */
export const STORY_SIZE = { width: 1080, height: 1920 };

/** Background (light → strong) per category colour. */
const STORY_COLORS: Record<CategoryColor, [string, string]> = {
  amber: ["#fef3c7", "#f59e0b"],
  rose: ["#ffe4e6", "#f43f5e"],
  sky: ["#e0f2fe", "#0ea5e9"],
  emerald: ["#d1fae5", "#10b981"],
  violet: ["#ede9fe", "#8b5cf6"],
  orange: ["#ffedd5", "#f97316"],
  teal: ["#ccfbf1", "#14b8a6"],
  fuchsia: ["#fae8ff", "#d946ef"],
  lime: ["#ecfccb", "#84cc16"],
  indigo: ["#e0e7ff", "#6366f1"],
};

function Stars({ rating }: { rating: number }) {
  const stars = rating / 2;
  return (
    <div style={{ display: "flex", gap: 14 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = stars >= i ? 1 : stars >= i - 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width="96" height="96" viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`s${i}`}>
                <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
                <stop offset={`${fill * 100}%`} stopColor="#d4d4d8" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#s${i})`}
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        );
      })}
    </div>
  );
}

/** Twemoji's address for an emoji (the one ImageResponse uses). */
function twemojiUrl(emoji: string): string {
  const points = [...emoji].map((c) => c.codePointAt(0)!.toString(16));
  const code = (emoji.includes("\u200d") ? points : points.filter((p) => p !== "fe0f")).join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${code}.svg`;
}

/** Can we draw emoji (the emoji CDN answers)? If not, the picture is made without them. */
async function emojiAvailable(emoji: string): Promise<boolean> {
  try {
    const res = await fetch(twemojiUrl(emoji), { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

const noEmoji = (s: string) => s.replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u200d|\ufe0f/gu, "").trim();

/**
 * A review as a 9:16 picture for stories: category colour, emoji, photo,
 * stars, the text and who wrote it, with the logo and the site address.
 */
export async function storyCard({
  emoji,
  color,
  category,
  item,
  rating,
  body,
  author,
  photo,
  cta,
  site,
}: {
  emoji: string;
  color: CategoryColor;
  category: string;
  item: string;
  rating: number;
  body: string | null;
  author: string;
  photo: string | null;
  cta: string;
  site: string;
}) {
  const [light, strong] = STORY_COLORS[color];
  const withEmoji = await emojiAvailable(emoji);
  if (!withEmoji) {
    emoji = "";
    category = noEmoji(category);
    item = noEmoji(item);
    body = body ? noEmoji(body) || null : null;
    author = noEmoji(author);
  }
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "110px 80px 90px",
          background: `linear-gradient(180deg, ${light} 0%, ${strong} 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={OG_LOGO} width={OG_LOGO_SIZE.width * 2} height={OG_LOGO_SIZE.height * 2} alt="RevieWorld" />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 36,
            width: "100%",
            padding: "64px 56px",
            borderRadius: 64,
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 30px 60px rgba(0,0,0,0.18)",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img src={photo} width={760} height={560} style={{ objectFit: "cover", borderRadius: 40 }} />
          ) : (
            emoji && <div style={{ fontSize: 220, lineHeight: 1 }}>{emoji}</div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40, color: "#52525b" }}>
            {photo ? `${emoji} ` : ""}
            {clip(category, 40)}
          </div>
          <div style={{ fontSize: 84, fontWeight: 700, color: "#18181b", lineHeight: 1.1, textAlign: "center" }}>
            {clip(item, 50)}
          </div>
          <Stars rating={rating} />
          {body && (
            <div style={{ fontSize: 46, color: "#3f3f46", lineHeight: 1.35, textAlign: "center" }}>
              {`“${clip(body, photo ? 140 : 220)}”`}
            </div>
          )}
          <div style={{ fontSize: 40, color: "#71717a" }}>{clip(author, 40)}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#18181b" }}>{cta}</div>
          <div style={{ fontSize: 40, color: "#27272a" }}>{site}</div>
        </div>
      </div>
    ),
    withEmoji ? { ...STORY_SIZE, emoji: "twemoji" } : STORY_SIZE,
  );
}
