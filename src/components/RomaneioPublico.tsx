import { useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gerarNotaPacote, type PacoteNota } from "@/lib/nota-expedicao";

const numero = (v: number | null | undefined, casas = 3) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: casas });
const moeda = (v: number | null | undefined) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (v: string | null | undefined) => !v ? "—" : /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : new Date(v).toLocaleString("pt-BR");
const formas: Record<string, string> = { pix: "PIX", dinheiro: "Dinheiro", transferencia: "Transferência", cartao: "Cartão", boleto: "Boleto", prazo: "A prazo", outro: "Outro" };

export function RomaneioPublico({ pacote: p, link }: { pacote: PacoteNota; link: string }) {
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const pdf = async (imprimir: boolean) => {
    setBusy(true);
    setErro("");
    try { await gerarNotaPacote(p, link, imprimir); }
    catch { setErro("Não foi possível gerar a nota. Tente novamente."); }
    finally { setBusy(false); }
  };
  const cavaco = (p.tipo_carga === "cavaco" || p.tipo_carga === "po_serra");
  return <section className="space-y-4 border-y border-border py-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="font-display text-xl font-semibold">Nota de carga / Romaneio</h1><p className="font-mono text-sm text-primary">{p.codigo}</p></div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void pdf(false)}><FileDown className="mr-2 h-4 w-4" />Baixar PDF</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void pdf(true)}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
      </div>
    </header>
    {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {[["Cliente / destino", p.cliente_nome ?? "—"], ["Data de registro", data(p.criado_em)], ["Expedição", p.status === "pronto" ? "Não expedido" : "Expedido"], ["Data de saída", data(p.data_saida_carga || p.expedido_em)], ["Placa do caminhão", p.placa_caminhao ?? "—"]].map(([label, valor]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-medium">{valor}</dd></div>)}
    </dl>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs text-muted-foreground"><tr>
          {(cavaco ? ["Produto", "Quantidade", "Preço unitário", "Valor total"] : ["Produto", "C × E × L (m)", "Pacotes", "Peças/pacote", "Peças", "m³", "Preço/m³", "Valor total"]).map(label => <th className="whitespace-nowrap px-2 py-3" key={label}>{label}</th>)}
        </tr></thead>
        <tbody>{cavaco ? <tr className="border-b border-border">
          <td className="px-2 py-3">{p.descricao}</td><td className="whitespace-nowrap px-2 py-3">{numero(p.quantidade_venda)} {p.unidade_venda === "ton" ? "t" : "m³"}</td><td className="whitespace-nowrap px-2 py-3">{moeda(p.valor_unitario)}</td><td className="whitespace-nowrap px-2 py-3">{moeda(p.valor_total ?? p.valor_previsto)}</td>
        </tr> : (p.itens?.length ? p.itens : [{ descricao: p.descricao, comprimento_m: p.comprimento_m ?? 0, espessura_m: Number(p.espessura_cm ?? 0) / 100, largura_m: Number(p.largura_cm ?? 0) / 100, qtd_blocos: p.qtd_blocos, pecas_por_pacote: p.pecas_por_pacote ?? 0, qtd_pecas: p.qtd_pecas, volume_m3: p.volume_m3, valor_unitario: p.valor_unitario ?? 0, valor_total: p.valor_total ?? p.valor_previsto ?? 0 }]).map((i, index) => <tr key={index} className="border-b border-border">
          {[i.descricao, `${numero(i.comprimento_m, 4)} × ${numero(i.espessura_m, 4)} × ${numero(i.largura_m, 4)}`, numero(i.qtd_blocos, 0), numero(i.pecas_por_pacote, 0), numero(i.qtd_pecas, 0), numero(i.volume_m3, 5), moeda(i.valor_unitario), moeda(i.valor_total)].map((v, col) => <td key={col} className="px-2 py-3">{v}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="space-y-2 text-sm">
      {!cavaco && <p>{numero(p.qtd_blocos, 0)} pacotes · {numero(p.qtd_pecas, 0)} peças · {numero(p.volume_m3, 5)} m³</p>}
      <p className="text-lg font-semibold">Valor total: {moeda(p.valor_previsto ?? p.valor_total)}</p>
      <p>Forma de pagamento: {formas[p.forma_pagamento ?? ""] ?? "Não informado"}</p>
      <p>Situação do pagamento: {p.situacao_pagamento === "pago" ? "Pago" : "Pendente"}</p>
      {p.observacoes && <p className="whitespace-pre-wrap break-words">Observações: {p.observacoes}</p>}
    </div>
  </section>;
}