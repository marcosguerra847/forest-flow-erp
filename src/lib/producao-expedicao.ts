// Produção da serraria estimada a partir dos romaneios (tudo que sai é encomenda produzida).
export type RomaneioProducao = {
  tipo_carga: string | null; descricao: string | null; cliente_nome: string | null;
  volume_m3: number | null; qtd_pecas: number | null; qtd_blocos: number | null;
  unidade_venda: string | null; quantidade_venda: number | null;
  valor_total: number | null; valor_previsto: number | null;
  data_saida_carga: string | null; expedido_em: string | null; criado_em: string;
};
export type Periodo = "semana" | "mes" | "ano";
export type Dimensao = "periodo" | "produto" | "cliente" | "tipo";

export const ehSerrado = (t: string | null) => t !== "cavaco" && t !== "po_serra";

export function dataProducao(r: RomaneioProducao): string {
  return (r.data_saida_carga ?? r.expedido_em ?? r.criado_em).slice(0, 10);
}

export function chavePeriodo(iso: string, p: Periodo): string {
  const [y, m] = iso.split("-");
  if (p === "ano") return `${y}`;
  if (p === "mes") return `${y}-${m}`;
  const d = new Date(iso + "T00:00:00Z");
  const dia = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dia + 3);
  const ano = d.getUTCFullYear();
  const semana = 1 + Math.floor((d.getTime() - Date.UTC(ano, 0, 1)) / 604800000);
  return `${ano}-S${String(semana).padStart(2, "0")}`;
}

export type Linha = { chave: string; romaneios: number; m3Serrado: number; m3Sub: number; tonSub: number; pecas: number; pacotes: number; valor: number };

export function agruparProducao(rows: RomaneioProducao[], dim: Dimensao, periodo: Periodo): Linha[] {
  const g = new Map<string, Linha>();
  for (const r of rows) {
    const k = dim === "periodo" ? chavePeriodo(dataProducao(r), periodo)
      : dim === "produto" ? (r.descricao?.trim() || "Sem descrição")
      : dim === "cliente" ? (r.cliente_nome?.trim() || "Sem cliente")
      : rotuloTipo(r.tipo_carga);
    const l = g.get(k) ?? { chave: k, romaneios: 0, m3Serrado: 0, m3Sub: 0, tonSub: 0, pecas: 0, pacotes: 0, valor: 0 };
    l.romaneios++;
    l.valor += Number(r.valor_total ?? r.valor_previsto ?? 0);
    if (ehSerrado(r.tipo_carga)) {
      l.m3Serrado += Number(r.volume_m3 || 0); l.pecas += Number(r.qtd_pecas || 0); l.pacotes += Number(r.qtd_blocos || 0);
    } else if (r.unidade_venda === "ton") l.tonSub += Number(r.quantidade_venda || 0);
    else l.m3Sub += Number(r.quantidade_venda ?? r.volume_m3 ?? 0);
    g.set(k, l);
  }
  const out = [...g.values()];
  return dim === "periodo" ? out.sort((a, b) => a.chave.localeCompare(b.chave)) : out.sort((a, b) => b.m3Serrado - a.m3Serrado || b.valor - a.valor);
}

/** Aproveitamento: m³ serrado ÷ (serrado + subprodutos em m³). null sem volume. */
export function aproveitamento(l: Pick<Linha, "m3Serrado" | "m3Sub">): number | null {
  const t = l.m3Serrado + l.m3Sub;
  return t > 0 ? (l.m3Serrado / t) * 100 : null;
}

export function rotuloTipo(t: string | null) {
  return t === "cavaco" ? "Cavaco" : t === "po_serra" ? "Pó de serra" : t === "cilindrica" ? "Eucalipto cilíndrico / roliço" : "Madeira serrada";
}
