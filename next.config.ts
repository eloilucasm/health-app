import type { NextConfig } from "next";

// cacheComponents desligado de propósito (D-07): quase toda página lê a sessão
// e dados de saúde por pessoa; renderização a cada requisição é mais simples e
// evita cache de dados sensíveis no servidor.
const nextConfig: NextConfig = {
  // O backup do protótipo é enviado a uma Server Action (padrão: 1 MB).
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
