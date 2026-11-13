import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Five stars for a 1-10 rating, drawn as SVG (fonts may lack ★). */
function OgStars({ rating }: { rating: number }) {
  const stars = rating / 2;
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = stars >= i ? 1 : stars >= i - 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width="56" height="56" viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`g${i}`}>
                <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
                <stop offset={`${fill * 100}%`} stopColor="#d4d4d8" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#g${i})`}
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        );
      })}
    </div>
  );
}

/** The share-preview picture: optional photo on the left, text on the right. */
export function ogCard({
  kicker,
  title,
  rating,
  body,
  footer,
  photo,
}: {
  kicker?: string;
  title: string;
  rating?: number;
  body?: string | null;
  footer?: string;
  photo?: string | null;
}) {
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fafafa", fontFamily: "sans-serif" }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={photo} width={420} height={630} style={{ objectFit: "cover" }} />
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {kicker && <div style={{ fontSize: 30, color: "#71717a" }}>{clip(kicker, 50)}</div>}
            <div style={{ fontSize: photo ? 60 : 72, fontWeight: 700, color: "#18181b", lineHeight: 1.1 }}>
              {clip(title, 60)}
            </div>
            {rating !== undefined && <OgStars rating={rating} />}
            {body && (
              <div style={{ fontSize: 30, color: "#3f3f46", lineHeight: 1.35 }}>{`“${clip(body, photo ? 120 : 160)}”`}</div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28 }}>
            <div style={{ color: "#71717a" }}>{footer ? clip(footer, 40) : ""}</div>
            <div style={{ display: "flex", fontWeight: 700, color: "#18181b" }}>RevieWorld</div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
