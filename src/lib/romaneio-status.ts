type Totais = { qtd_blocos: number; qtd_pecas: number; volume_m3: number; quantidade_venda: number };
type Existente = {
  status: string;
  expedido_em: string | null;
  qtd_blocos_expedida: number | null;
  qtd_pecas_expedida: number | null;
  volume_expedido_m3: number | null;
  quantidade_expedida?: number | null;
};

export function estadoExpedicao(status: "pronto" | "expedido", totais: Totais, agora: string, existente?: Existente) {
  if (status === "expedido" && existente?.status === "expedido") {
    return {
      status,
      expedido_em: existente.expedido_em,
      qtd_blocos_expedida: existente.qtd_blocos_expedida,
      qtd_pecas_expedida: existente.qtd_pecas_expedida,
      volume_expedido_m3: existente.volume_expedido_m3,
      quantidade_expedida: existente.quantidade_expedida ?? null,
    };
  }
  const expedido = status === "expedido";
  return {
    status,
    expedido_em: expedido ? agora : null,
    qtd_blocos_expedida: expedido ? totais.qtd_blocos : null,
    qtd_pecas_expedida: expedido ? totais.qtd_pecas : null,
    volume_expedido_m3: expedido ? totais.volume_m3 : null,
    quantidade_expedida: expedido ? totais.quantidade_venda : null,
  };
}