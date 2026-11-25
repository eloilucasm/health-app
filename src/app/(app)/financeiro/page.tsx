import type { Metadata } from "next";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Financeiro" };

export default function Page() {
  return <EmConstrucao titulo="Financeiro" dia={5} />;
}
