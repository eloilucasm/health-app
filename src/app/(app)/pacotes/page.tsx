import type { Metadata } from "next";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Pacotes" };

export default function Page() {
  return <EmConstrucao titulo="Pacotes" dia={4} />;
}
