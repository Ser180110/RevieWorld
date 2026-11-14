import type { MetadataRoute } from "next";

/** Makes the site installable ("Add to Home screen") and gives the app its name, icon and splash screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "RevieWorld",
    short_name: "RevieWorld",
    description: "Recensisci qualsiasi cosa: crea categorie, vota, segui gli amici.",
    lang: "it",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#18181b",
    categories: ["social", "lifestyle", "entertainment"],
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nuova recensione", short_name: "Recensisci", url: "/it/new", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
      { name: "Cerca", url: "/it/search", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
