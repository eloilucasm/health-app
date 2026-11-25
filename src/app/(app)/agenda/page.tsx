import type { Metadata } from "next";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Agenda" };

export default function Page() {
  return <EmConstrucao titulo="Agenda" dia={3} />;
}
