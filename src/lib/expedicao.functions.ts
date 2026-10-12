import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const base = z.object({ codigo: z.string().min(3).max(40), token: z.string().min(8).max(64) });

// Público (sem login): o token secreto impresso no QR autoriza a leitura/baixa do pacote.
export const obterPacote = createServerFn({ method: "POST" })
  .inputValidator((raw) => base.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("pacotes_expedicao" as never)
      .select("codigo,token,descricao,cliente_nome,qtd_blocos,qtd_pecas,volume_m3,qtd_blocos_expedida,qtd_pecas_expedida,volume_expedido_m3,status,operador_nome,expedido_em,observacoes")
      .eq("codigo", data.codigo.toUpperCase())
      .maybeSingle();
    const row = p as Record<string, unknown> | null;
    if (!row || row.token !== data.token) return { ok: false as const };
    const { token: _t, ...rest } = row;
    void _t;
    return { ok: true as const, pacote: rest as Record<string, string | number | null> };
  });

export const expedirPacote = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    base.extend({
      operador_nome: z.string().trim().min(2).max(120),
      qtd_blocos: z.number().int().min(0).max(100000),
      qtd_pecas: z.number().int().min(0).max(1000000),
      volume_m3: z.number().min(0).max(100000),
      observacao: z.string().max(500).nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const codigo = data.codigo.toUpperCase();
    const { data: p } = await supabaseAdmin
      .from("pacotes_expedicao" as never).select("id,token,status").eq("codigo", codigo).maybeSingle();
    const row = p as { id: string; token: string; status: string } | null;
    if (!row || row.token !== data.token) throw new Error("QR inválido.");
    if (row.status !== "pronto") throw new Error("Este pacote já teve baixa de saída.");
    const agora = new Date().toISOString();
    const upd = await supabaseAdmin.from("pacotes_expedicao" as never).update({
      status: "expedido", operador_nome: data.operador_nome, expedido_em: agora,
      qtd_blocos_expedida: data.qtd_blocos, qtd_pecas_expedida: data.qtd_pecas,
      volume_expedido_m3: data.volume_m3, observacoes: data.observacao ?? null,
    } as never).eq("id", row.id);
    if (upd.error) throw new Error(upd.error.message);
    await supabaseAdmin.from("eventos_qr").insert({
      codigo, tipo: "PX", etapa: "em_entrega",
      descricao: `Saída para o cliente: ${data.qtd_blocos} blocos · ${data.qtd_pecas} peças · ${data.volume_m3} m³`,
      observacao: data.observacao ?? null, usuario_id: null, usuario_nome: data.operador_nome,
      latitude: data.latitude ?? null, longitude: data.longitude ?? null, criado_em: agora,
    });
    return { ok: true, expedido_em: agora };
  });
