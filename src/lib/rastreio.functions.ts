import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const acessoQrSchema = z.object({ codigo: z.string().trim().min(3).max(40), token: z.string().uuid() });

export const obterRastreio = createServerFn({ method: "POST" })
  .inputValidator((raw) => acessoQrSchema.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const codigo = data.codigo.toUpperCase();
    const { data: acesso, error } = await supabaseAdmin.from("qr_acessos")
      .select("codigo").eq("codigo", codigo).eq("token", data.token).maybeSingle();
    if (error || !acesso) return { ok: false as const };
    let entidade: { titulo: string; linhas: { label: string; value: string }[] } | null = null;
    const linhas = (values: [string, unknown][]) => values.map(([label, value]) => ({ label, value: value == null ? "—" : String(value) }));
    const tipo = codigo.split("-")[0];
    if (tipo === "CG") {
      const { data: row } = await supabaseAdmin.from("cargas").select("codigo,placa_veiculo,motorista,volume_carregado_m3,qtd_toras,status,ordens_colheita(talhoes(codigo,especie,fazendas(nome)))").eq("codigo", codigo).maybeSingle();
      if (row) entidade = { titulo: `Carga ${codigo}`, linhas: linhas([["Placa", row.placa_veiculo], ["Motorista", row.motorista], ["Volume", `${Number(row.volume_carregado_m3).toFixed(2)} m³`], ["Toras", row.qtd_toras], ["Origem", row.ordens_colheita?.talhoes?.fazendas?.nome], ["Talhão", row.ordens_colheita?.talhoes?.codigo], ["Espécie", row.ordens_colheita?.talhoes?.especie], ["Status", row.status]]) };
    } else if (tipo === "LP") {
      const { data: row } = await supabaseAdmin.from("lotes_patio").select("especie,volume_m3,qtd_toras,status,localizacao").eq("codigo", codigo).maybeSingle();
      if (row) entidade = { titulo: `Lote ${codigo}`, linhas: linhas([["Espécie", row.especie], ["Volume", `${Number(row.volume_m3).toFixed(2)} m³`], ["Toras", row.qtd_toras], ["Localização", row.localizacao], ["Status", row.status]]) };
    } else if (tipo === "PA") {
      const { data: row } = await supabaseAdmin.from("produtos_acabados").select("descricao,dimensoes,qtd_pecas,volume_m3,status").eq("codigo", codigo).maybeSingle();
      if (row) entidade = { titulo: `Produto ${codigo}`, linhas: linhas([["Descrição", row.descricao], ["Dimensões", row.dimensoes], ["Peças", row.qtd_pecas], ["Volume", `${Number(row.volume_m3).toFixed(2)} m³`], ["Status", row.status]]) };
    } else if (tipo === "OC") {
      const { data: row } = await supabaseAdmin.from("ordens_colheita").select("status,volume_previsto_m3,volume_colhido_m3,talhoes(codigo,especie,fazendas(nome))").eq("codigo", codigo).maybeSingle();
      if (row) entidade = { titulo: `Ordem de Colheita ${codigo}`, linhas: linhas([["Status", row.status], ["Vol. previsto", `${Number(row.volume_previsto_m3).toFixed(2)} m³`], ["Vol. colhido", `${Number(row.volume_colhido_m3).toFixed(2)} m³`], ["Fazenda", row.talhoes?.fazendas?.nome], ["Talhão", row.talhoes?.codigo], ["Espécie", row.talhoes?.especie]]) };
    } else if (tipo === "OP") {
      const { data: row } = await supabaseAdmin.from("ordens_producao").select("status,volume_entrada_m3,volume_produzido_m3,rendimento_pct").eq("codigo", codigo).maybeSingle();
      if (row) entidade = { titulo: `Ordem de Produção ${codigo}`, linhas: linhas([["Status", row.status], ["Vol. entrada", `${Number(row.volume_entrada_m3).toFixed(2)} m³`], ["Vol. produzido", `${Number(row.volume_produzido_m3).toFixed(2)} m³`], ["Rendimento", `${Number(row.rendimento_pct).toFixed(1)}%`]]) };
    }
    if (!entidade) return { ok: false as const };
    const { data: eventos } = await supabaseAdmin.from("eventos_qr")
      .select("id,etapa,descricao,observacao,usuario_nome,latitude,longitude,foto_url,criado_em")
      .eq("codigo", codigo).order("criado_em", { ascending: true });
    return { ok: true as const, entidade, eventos: eventos ?? [] };
  });

export const enviarFotoEntrega = createServerFn({ method: "POST" })
  .inputValidator((raw) => acessoQrSchema.extend({ imagem: z.string().max(7_000_000), mime: z.enum(["image/jpeg", "image/png", "image/webp"]) }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const codigo = data.codigo.toUpperCase();
    const { data: acesso } = await supabaseAdmin.from("qr_acessos").select("codigo").eq("codigo", codigo).eq("token", data.token).maybeSingle();
    if (!acesso || !["CG", "PA"].includes(codigo.split("-")[0] ?? "")) throw new Error("QR inválido.");
    const bytes = Uint8Array.from(atob(data.imagem), (c) => c.charCodeAt(0));
    if (bytes.length > 5_000_000) throw new Error("A foto deve ter até 5 MB.");
    const path = `entregas/${codigo}/${crypto.randomUUID()}.${data.mime.split("/")[1]}`;
    const { error } = await supabaseAdmin.storage.from("qr-eventos").upload(path, bytes, { contentType: data.mime });
    if (error) throw new Error("Não foi possível salvar a foto.");
    const { data: signed } = await supabaseAdmin.storage.from("qr-eventos").createSignedUrl(path, 60 * 60 * 24 * 365);
    return { foto_url: signed?.signedUrl ?? null };
  });