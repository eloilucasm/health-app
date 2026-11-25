import type { MetadataRoute } from "next";

// App instalável (RF-04). Sem service worker: nada de dados de saúde guardado para uso offline.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Consultório no Bolso",
    short_name: "Consultório",
    description: "Agenda, pacientes e financeiro do seu consultório.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf5f6",
    theme_color: "#fbf5f6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
