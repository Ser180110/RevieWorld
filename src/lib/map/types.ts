/** One review on the map. */
export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  rating: number;
  item: string;
  itemHref: string;
  category: string;
  emoji: string;
  author: string;
};

export type MapFeed = "all" | "following";

export type MapResult = { pins: MapPin[]; error?: "unavailable" | "auth" };
