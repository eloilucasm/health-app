import type { Metadata } from "next";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Pacientes" };

export default function Page() {
  return <EmConstrucao titulo="Pacientes" dia={3} />;
}
