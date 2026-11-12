/** Profile picture, or the first letter of the name on a colored circle. */
export function Avatar({
  url,
  name,
  size = 40,
}: {
  url: string | null | undefined;
  name: string;
  size?: number;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (url) {
    return (
      // Avatars come from the user's storage bucket: a plain img avoids remote-image config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        style={style}
        className="shrink-0 rounded-full bg-zinc-200 object-cover dark:bg-zinc-800"
      />
    );
  }
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span
      aria-hidden
      style={{ ...style, backgroundColor: `hsl(${hue} 55% 45%)` }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase text-white"
    >
      {name.slice(0, 1)}
    </span>
  );
}
