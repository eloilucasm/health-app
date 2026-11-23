import type { Metadata, Viewport } from "next";
import { Figtree, Quicksand } from "next/font/google";
import "./globals.css";

const display = Quicksand({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Consultório no Bolso", template: "%s · Consultório no Bolso" },
  description: "Agenda, pacientes, evolução, pacotes e financeiro do seu consultório, no celular.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF5F6" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1215" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
