import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  codigo: z.string().min(3),
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
    const agora = new Date().toISOString();

    // Se for uma carga, marca como entregue
    if (prefix === "CG") {
      const { data: carga } = await supabaseAdmin.from("cargas").select("id,entregue_em").eq("codigo", codigo).maybeSingle();
      if (!carga) throw new Error("Carga não encontrada para este código.");
      if (carga.entregue_em) throw new Error("Esta carga já foi confirmada anteriormente.");
      const upd = await supabaseAdmin.from("cargas")
        .update({ recebedor_nome: data.recebedor_nome, entregue_em: agora })
        .eq("id", carga.id);
      if (upd.error) throw upd.error;
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
