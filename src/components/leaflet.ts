"use client";

import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

/** Leaflet touches `window`, so it is loaded only in the browser. */
export async function loadLeaflet(): Promise<typeof Leaflet> {
  const mod = await import("leaflet");
  return (mod as unknown as { default?: typeof Leaflet }).default ?? mod;
}

/** Free OpenStreetMap tiles (with the credit line their rules ask for). */
export function addTiles(L: typeof Leaflet, map: Leaflet.Map) {
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}

/** A round pin with an emoji inside. */
export function emojiIcon(L: typeof Leaflet, emoji: string, highlight = false) {
  const span = document.createElement("span");
  span.className = `rw-pin${highlight ? " rw-pin-on" : ""}`;
  const inner = document.createElement("span");
  inner.textContent = emoji;
  span.appendChild(inner);
  return L.divIcon({ html: span, className: "", iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -32] });
}

/** Rome, when we don't know where the user is. */
export const DEFAULT_CENTER: [number, number] = [41.8986, 12.4768];
