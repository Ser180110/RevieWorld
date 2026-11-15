"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Dictionary } from "@/i18n/dictionaries";
import { reviewsInArea } from "@/lib/map/actions";
import type { MapFeed, MapPin } from "@/lib/map/types";
import { addTiles, DEFAULT_CENTER, emojiIcon, loadLeaflet } from "./leaflet";

function stars(rating: number) {
  return "★".repeat(Math.floor(rating / 2)) + (rating % 2 ? "½" : "");
}

/** Popup built with DOM nodes (names come from users: never as HTML). */
function popup(pin: MapPin, t: Dictionary["map"]) {
  const box = document.createElement("div");
  box.className = "flex flex-col gap-1 text-sm";
  const title = document.createElement("a");
  title.href = pin.itemHref;
  title.textContent = `${pin.emoji} ${pin.item}`;
  title.className = "font-semibold";
  const meta = document.createElement("span");
  meta.textContent = `${pin.category} · @${pin.author}`;
  meta.style.color = "#71717a";
  const rate = document.createElement("span");
  rate.textContent = stars(pin.rating);
  rate.style.color = "#f59e0b";
  const open = document.createElement("a");
  open.href = `${pin.itemHref.split("/c/")[0]}/r/${pin.id}`;
  open.textContent = `${t.open} →`;
  box.append(title, rate, meta, open);
  return box;
}

/**
 * Full-page map of the reviews that have a position. Loads the pins of the
 * visible area each time the map stops moving.
 */
export function ReviewMap({
  lang,
  signedIn,
  start,
  focus,
  t,
}: {
  lang: string;
  signedIn: boolean;
  /** ?lat=…&lng=… from a review's "see on the map". */
  start: { lat: number; lng: number } | null;
  /** The review to highlight. */
  focus: string | null;
  t: Dictionary["map"];
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const me = useRef<Leaflet.CircleMarker | null>(null);
  const [feed, setFeed] = useState<MapFeed>("all");
  const feedRef = useRef<MapFeed>("all");
  const [count, setCount] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);

  async function load() {
    const m = map.current;
    const lib = L.current;
    if (!m || !lib || !layer.current) return;
    const b = m.getBounds();
    const id = ++request.current;
    const res = await reviewsInArea(
      { south: b.getSouth(), north: b.getNorth(), west: Math.max(-180, b.getWest()), east: Math.min(180, b.getEast()) },
      feedRef.current,
      lang,
    );
    if (id !== request.current || !layer.current) return;
    layer.current.clearLayers();
    for (const pin of res.pins) {
      lib
        .marker([pin.lat, pin.lng], { icon: emojiIcon(lib, pin.emoji, pin.id === focus), title: pin.item })
        .bindPopup(popup(pin, t))
        .addTo(layer.current);
    }
    setCount(res.pins.length);
    setNote(res.error === "unavailable" ? t.unavailable : res.error === "auth" ? t.signIn : null);
  }

  function scheduleLoad() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, 250);
  }

  function nearMe(quiet = false) {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const here: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        if (!map.current || !L.current) return;
        map.current.setView(here, 15);
        if (me.current) me.current.setLatLng(here);
        else
          me.current = L.current
            .circleMarker(here, { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 })
            .addTo(map.current);
      },
      () => {
        setLocating(false);
        if (!quiet) setNote(t.gpsError);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((lib) => {
      if (cancelled || !box.current) return;
      L.current = lib;
      const m = lib.map(box.current).setView(start ? [start.lat, start.lng] : DEFAULT_CENTER, start ? 16 : 6);
      addTiles(lib, m);
      layer.current = lib.layerGroup().addTo(m);
      map.current = m;
      m.on("moveend", scheduleLoad);
      load();
      // Without a place to show, start from where the user is (if they allow it).
      if (!start) nearMe(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
      me.current = null;
    };
    // Built once; the handlers read the latest feed from feedRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(next: MapFeed) {
    setFeed(next);
    feedRef.current = next;
    load();
  }

  const tab = (on: boolean) =>
    `cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition ${
      on
        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
        : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
    }`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {signedIn && (
          <div className="flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
            <button type="button" onClick={() => pick("all")} className={tab(feed === "all")} aria-pressed={feed === "all"}>
              {t.all}
            </button>
            <button
              type="button"
              onClick={() => pick("following")}
              className={tab(feed === "following")}
              aria-pressed={feed === "following"}
            >
              {t.following}
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => nearMe()}
          disabled={locating}
          className="cursor-pointer rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:border-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-100"
        >
          {locating ? t.locating : `🎯 ${t.nearMe}`}
        </button>
        {count !== null && (
          <span className="text-sm text-zinc-500">{(count === 1 ? t.countOne : t.count).replace("{n}", String(count))}</span>
        )}
      </div>
      {note && <p className="text-sm text-amber-700 dark:text-amber-400">{note}</p>}
      <div ref={box} className="h-[70vh] min-h-80 w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800" />
      <p className="text-xs text-zinc-500">{t.hint}</p>
    </div>
  );
}
