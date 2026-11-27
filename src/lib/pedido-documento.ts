import type { Database } from "@/integrations/supabase/types";
import { calcularPedido, produtoPedidoVazio, type ProdutoPedido } from "./pedido-calculo.ts";

export type PedidoDocumento = Pick<Database["public"]["Tables"]["pedidos"]["Row"],
  "codigo" | "cliente_id" | "data" | "data_entrega" | "descricao" | "itens" | "observacoes" |
  "pagamento" | "qtd_blocos" | "qtd_itens" | "qtd_pecas" | "quantidade_venda" |
  "situacao_pagamento" | "status" | "tipo_carga" | "unidade_venda" | "valor_total" |
  "valor_unitario" | "volume_m3">;

export type ClienteDocumento = {
  nome: string; documento?: string | null; telefone?: string | null; email?: string | null;
  endereco?: string | null; cidade?: string | null; uf?: string | null;
};

export const situacoesPedido: Record<string, string> = {
  aberto: "Aberto", em_producao: "Em produção", aguardando_pagamento: "Aguardando pagamento",
  faturado: "Faturado", cancelado: "Cancelado",
};

export function prepararPedidoDocumento(pedido: PedidoDocumento) {
  const granel = pedido.tipo_carga === "cavaco" || pedido.tipo_carga === "po_serra";
  const itens: ProdutoPedido[] = Array.isArray(pedido.itens) ? pedido.itens.map(valor => {
    const item = valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
    return Object.fromEntries(Object.keys(produtoPedidoVazio()).map(chave => [chave, String(item[chave] ?? "")])) as ProdutoPedido;
  }) : [];
  const calculo = calcularPedido(pedido.tipo_carga, itens, pedido.unidade_venda,
    String(pedido.quantidade_venda), String(pedido.valor_unitario));
  // The saved order is authoritative; exporting never converts or updates legacy totals.
  return { granel, legado: !granel && itens.length === 0, produtos: calculo.produtos,
    volume: Number(pedido.volume_m3), pacotes: Number(pedido.qtd_blocos),
    pecas: Number(pedido.qtd_pecas), valor: Number(pedido.valor_total) };
}