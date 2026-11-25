/** Horários e restrições do onboarding (RF-02, RF-03). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { createOrg, createUserClient } from "./helpers";

let ana: SupabaseClient;
let bia: SupabaseClient;
let orgA: string;

const horario = (weekday: number, inicio: string, fim: string) => ({ weekday, inicio, fim, local: "consultorio" });
const salvar = (c: SupabaseClient, org: string, hs: object[]) =>
  c.rpc("salvar_horarios", { p_org: org, p_horarios: hs, p_duracao: 50 });

beforeAll(async () => {
  ({ client: ana } = await createUserClient("ana-onb"));
  ({ client: bia } = await createUserClient("bia-onb"));
  orgA = await createOrg(ana, "Clinica Onb Ana");
  await createOrg(bia, "Clinica Onb Bia");
});

describe("salvar_horarios", () => {
  it("troca a lista inteira", async () => {
    expect((await salvar(ana, orgA, [horario(1, "08:00", "12:00"), horario(3, "08:00", "12:00")])).error).toBeNull();
    expect((await salvar(ana, orgA, [horario(5, "13:00", "18:00")])).error).toBeNull();
    const { data } = await ana.from("working_hours").select("weekday").eq("org_id", orgA);
    expect(data).toEqual([{ weekday: 5 }]);
  });

  it("outra profissional não altera nem apaga", async () => {
    const { error } = await salvar(bia, orgA, []);
    expect(error?.message).toMatch(/Sem permissão/);
    const { data } = await ana.from("working_hours").select("id").eq("org_id", orgA);
    expect(data).toHaveLength(1);
  });

  it("não perde os horários antigos se um novo for inválido", async () => {
    const { error } = await salvar(ana, orgA, [horario(1, "18:00", "08:00")]);
    expect(error).not.toBeNull();
    const { data } = await ana.from("working_hours").select("weekday").eq("org_id", orgA);
    expect(data).toEqual([{ weekday: 5 }]);
  });
});

describe("restrições da organização", () => {
  it("recusa endereço reservado", async () => {
    const { error } = await ana.from("organizations").update({ slug: "login" }).eq("id", orgA);
    expect(error?.message).toMatch(/slug_reservado/);
  });

  it("recusa cor que não seja hexadecimal", async () => {
    const { error } = await ana.from("organizations").update({ tema: { cor: "red;}" } }).eq("id", orgA);
    expect(error?.message).toMatch(/tema_cor/);
  });
});
