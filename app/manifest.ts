import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scrollabus",
    short_name: "Scrollabus",
    description: "Doomscroll your syllabus. Let the algorithm teach you.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF8F0",
    theme_color: "#FFF8F0",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
