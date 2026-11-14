import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mee: Myanmar fire calendar",
    short_name: "Mee",
    description: "When and where Myanmar burns, township by township, from NASA satellite fire data.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F7F4",
    theme_color: "#F6F7F4",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
