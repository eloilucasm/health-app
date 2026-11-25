"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Ícones do protótipo (legacy/index.html, linhas 236–240).
const traco = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const ABAS = [
  { href: "/", nome: "Hoje", icone: <path {...traco} d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /> },
  {
    href: "/agenda",
    nome: "Agenda",
    icone: (
      <g {...traco}>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </g>
    ),
  },
  {
    href: "/pacientes",
    nome: "Pacientes",
    icone: (
      <g {...traco}>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
      </g>
    ),
  },
  {
    href: "/pacotes",
    nome: "Pacotes",
    icone: (
      <g fill="currentColor">
        <circle cx="9" cy="4" r="1.3" />
        <circle cx="10" cy="8.2" r="1.8" />
        <circle cx="11.6" cy="13" r="2.3" />
        <circle cx="14.3" cy="18.6" r="2.8" />
      </g>
    ),
  },
  {
    href: "/financeiro",
    nome: "Financeiro",
    icone: (
      <g {...traco}>
        <rect x="3" y="6" width="18" height="13" rx="2.5" />
        <path d="M3 10h18M16.5 14.5h1" />
      </g>
    ),
  },
];

export function TabBar() {
  const caminho = usePathname();
  return (
    <nav className="tabs" aria-label="Seções">
      <div>
        {ABAS.map((aba) => {
          const ativa = aba.href === "/" ? caminho === "/" : caminho.startsWith(aba.href);
          return (
            <Link key={aba.href} href={aba.href} aria-current={ativa ? "page" : undefined}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {aba.icone}
              </svg>
              {aba.nome}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
