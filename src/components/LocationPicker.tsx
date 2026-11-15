"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Dictionary } from "@/i18n/dictionaries";
import { addTiles, DEFAULT_CENTER, emojiIcon, loadLeaflet } from "./leaflet";

type Point = { lat: number; lng: number };
type Place = { name: string; lat: number; lng: number };

/**
 * Optional "📍 where is it?" for a review: tap the map, use your current
 * position or search a place. Sends "lat"/"lng" only once touched (or when the
 * review already had a position), so an untouched form never erases one.
 */
export function LocationPicker({
  initial,
  lang,
  t,
}: {
  initial?: Point | null;
  lang: string;
  t: Dictionary["location"];
}) {
  const [point, setPoint] = useState<Point | null>(initial ?? null);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState<"gps" | "search" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const L = useRef<typeof Leaflet | null>(null);

  function place(p: Point, zoom?: number) {
    setPoint(p);
    setTouched(true);
    setProblem(null);
    if (!L.current || !map.current) return;
    if (marker.current) marker.current.setLatLng(p);
    else marker.current = L.current.marker(p, { icon: emojiIcon(L.current, "📍", true) }).addTo(map.current);
    if (zoom) map.current.setView(p, zoom);
  }

  useEffect(() => {
    if (!open || !box.current) return;
    let cancelled = false;
    loadLeaflet().then((lib) => {
      if (cancelled || !box.current) return;
      L.current = lib;
      const start = point ?? initial ?? null;
      const m = lib.map(box.current).setView(start ?? DEFAULT_CENTER, start ? 16 : 5);
      addTiles(lib, m);
      if (start) marker.current = lib.marker(start, { icon: emojiIcon(lib, "📍", true) }).addTo(m);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => place({ lat: e.latlng.lat, lng: e.latlng.lng }));
      map.current = m;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // The map is built once per opening; later changes go through place().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function locateMe() {
    if (!("geolocation" in navigator)) return setProblem(t.gpsError);
    setBusy("gps");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(null);
        place({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 17);
      },
      () => {
        setBusy(null);
        setProblem(t.gpsError);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function search() {
    const q = query.trim();
    if (q.length < 3) return;
    setBusy("search");
    setProblem(null);
    try {
      // OpenStreetMap's free search: one request per press, as its rules ask.
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=${lang}&q=${encodeURIComponent(q)}`,
      );
      const list = (await res.json()) as { display_name: string; lat: string; lon: string }[];
      setPlaces(list.map((p) => ({ name: p.display_name, lat: Number(p.lat), lng: Number(p.lon) })));
    } catch {
      setProblem(t.searchError);
    } finally {
      setBusy(null);
    }
  }

  const send = touched || Boolean(initial);
  const btn =
    "cursor-pointer rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-100";

  return (
    <div className="flex flex-col gap-2">
      {send && <input type="hidden" name="lat" value={point ? String(point.lat) : ""} />}
      {send && <input type="hidden" name="lng" value={point ? String(point.lng) : ""} />}
      <span className="text-sm font-medium">{t.label}</span>

      {!open && (
        <div className="flex flex-wrap items-center gap-2">
          {point ? (
            <>
              <span className="text-sm">📍 {t.added}</span>
              <button type="button" onClick={() => setOpen(true)} className={btn}>
                {t.change}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPoint(null);
                  setTouched(true);
                }}
                className="cursor-pointer text-sm text-zinc-500 hover:text-red-600 hover:underline"
              >
                {t.remove}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setOpen(true)} className={btn}>
              📍 {t.add}
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
              placeholder={t.searchPlaceholder}
              className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
            />
            <button type="button" onClick={search} disabled={busy !== null} className={btn}>
              {busy === "search" ? "…" : t.search}
            </button>
          </div>
          {places && (
            <ul className="flex flex-col gap-1 text-sm">
              {places.length === 0 && <li className="text-zinc-500">{t.noResults}</li>}
              {places.map((p) => (
                <li key={`${p.lat},${p.lng}`}>
                  <button
                    type="button"
                    onClick={() => {
                      place(p, 17);
                      setPlaces(null);
                    }}
                    className="cursor-pointer text-left hover:underline"
                  >
                    📍 {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={locateMe} disabled={busy !== null} className={`${btn} self-start`}>
            {busy === "gps" ? t.locating : `🎯 ${t.here}`}
          </button>
          <div ref={box} className="h-64 w-full overflow-hidden rounded-xl" />
          <p className="text-xs text-zinc-500">{t.hint}</p>
          {problem && <p className="text-sm text-red-600 dark:text-red-400">{problem}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {t.done}
            </button>
            {point && (
              <button
                type="button"
                onClick={() => {
                  setPoint(null);
                  setTouched(true);
                  marker.current?.remove();
                  marker.current = null;
                }}
                className="cursor-pointer text-sm text-zinc-500 hover:text-red-600 hover:underline"
              >
                {t.remove}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
