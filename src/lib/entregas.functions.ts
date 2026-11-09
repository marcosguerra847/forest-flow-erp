import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { acessoQrSchema } from "@/lib/rastreio.functions";

const schema = acessoQrSchema.extend({
  recebedor_nome: z.string().min(2).max(120),
  foto_url: z.string().url().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  observacao: z.string().max(500).nullable().optional(),
});

// Endpoint público: confirma a entrega de uma carga (ou item) pelo cliente,
// registrando um evento no timeline público e atualizando cargas.entregue_em/recebedor_nome
// quando o código pertencer a uma carga.
export const confirmarEntrega = createServerFn({ method: "POST" })
  .inputValidator((raw) => schema.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const codigo = data.codigo.trim().toUpperCase();
    const prefix = codigo.split("-")[0] ?? "";
    const { data: acesso } = await supabaseAdmin.from("qr_acessos").select("codigo")
      .eq("codigo", codigo).eq("token", data.token).maybeSingle();
    if (!acesso || !["CG", "PA"].includes(prefix)) throw new Error("QR inválido.");
    const agora = new Date().toISOString();

    // Se for uma carga, marca como entregue
    if (prefix === "CG") {
      const { data: carga } = await supabaseAdmin.from("cargas").select("id,entregue_em").eq("codigo", codigo).maybeSingle();
      if (!carga) throw new Error("Carga não encontrada para este código.");
      if (carga.entregue_em) throw new Error("Esta carga já foi confirmada anteriormente.");
      const upd = await supabaseAdmin.from("cargas")
        .update({ recebedor_nome: data.recebedor_nome, entregue_em: agora })
        .eq("id", carga.id).is("entregue_em", null).select("id");
      if (upd.error) throw upd.error;
      if (!upd.data?.length) throw new Error("Esta carga já foi confirmada anteriormente.");
    } else {
      const { data: produto } = await supabaseAdmin.from("produtos_acabados").select("id").eq("codigo", codigo).maybeSingle();
      if (!produto) throw new Error("Produto não encontrado.");
      const { data: evento } = await supabaseAdmin.from("eventos_qr").select("id").eq("codigo", codigo).eq("etapa", "entregue").limit(1);
      if (evento?.length) throw new Error("Esta entrega já foi confirmada anteriormente.");
    }

    // Registra o evento no timeline público (SEM usuário — assinatura do cliente final)
    const ins = await supabaseAdmin.from("eventos_qr").insert({
      codigo,
      tipo: prefix,
      etapa: "entregue",
      descricao: `Entrega confirmada por ${data.recebedor_nome}`,
      observacao: data.observacao ?? null,
      usuario_id: null,
      usuario_nome: data.recebedor_nome,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      foto_url: data.foto_url ?? null,
      criado_em: agora,
    });
    if (ins.error) throw ins.error;

    return { ok: true, entregue_em: agora };
  });
