import type { ItemRomaneioNota, PacoteNota } from "./nota-expedicao";
import { medidasProduto } from "./medidas-romaneio.ts";

/** Medidas do produto na etiqueta, todas em metros. */
export function dimensoesProdutoEtiqueta(
  produto: ItemRomaneioNota,
  cilindrica: boolean,
) {
  return medidasProduto(
    produto.comprimento_m,
    produto.espessura_m,
    produto.largura_m,
    cilindrica,
  );
}

export function descricaoProdutoEtiqueta(
  produto: ItemRomaneioNota,
  cilindrica: boolean,
) {
  return `${produto.descricao} — ${dimensoesProdutoEtiqueta(produto, cilindrica)}`;
}

/** Monta uma nota individual sem alterar o romaneio completo aberto pelo QR. */
export function selecionarProdutoRomaneio(
  pacote: PacoteNota,
  produto: ItemRomaneioNota | null | undefined,
): PacoteNota {
  if (!produto) return pacote;

  return {
    ...pacote,
    descricao: produto.descricao,
    espessura_cm: produto.espessura_m * 100,
    largura_cm: produto.largura_m * 100,
    comprimento_m: produto.comprimento_m,
    qtd_blocos: produto.qtd_blocos,
    pecas_por_pacote: produto.pecas_por_pacote,
    qtd_pecas: produto.qtd_pecas,
    volume_m3: produto.volume_m3,
    quantidade_venda: produto.volume_m3,
    valor_unitario: produto.valor_unitario,
    valor_total: produto.valor_total,
    valor_previsto: produto.valor_total,
    // A baixa é registrada no romaneio inteiro; não inventamos uma baixa por produto.
    qtd_blocos_expedida: null,
    qtd_pecas_expedida: null,
    volume_expedido_m3: null,
    quantidade_expedida: null,
    itens: [produto],
  };
}
