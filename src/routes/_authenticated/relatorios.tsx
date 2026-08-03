import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download, Factory, Boxes, Scissors, AlertTriangle, Package2, Receipt, Wallet, PiggyBank, Users, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · Fazenda Bela Vista" }] }),
  component: Relatorios,
});

type RelKey =
  | "rendimento" | "estoque" | "ocs" | "divergencias" | "produtos"
  | "contas" | "fluxo" | "dre" | "notas" | "faturamento";

type Rel = { key: RelKey; titulo: string; descricao: string; icon: typeof Factory; grupo: "Operacionais" | "Financeiros" };

const RELATORIOS: Rel[] = [
  { key: "rendimento", titulo: "Rendimento da serraria", descricao: "Volume entrada × produzido × perda por OP", icon: Factory, grupo: "Operacionais" },
  { key: "estoque", titulo: "Estoque do pátio", descricao: "Lotes disponíveis com volume e localização", icon: Boxes, grupo: "Operacionais" },
  { key: "ocs", titulo: "Ordens de Colheita", descricao: "Previsto vs colhido por OC", icon: Scissors, grupo: "Operacionais" },
  { key: "divergencias", titulo: "Divergências de carga", descricao: "Histórico completo de alertas", icon: AlertTriangle, grupo: "Operacionais" },
  { key: "produtos", titulo: "Produtos acabados", descricao: "Lotes de PA com volume e peças", icon: Package2, grupo: "Operacionais" },
  { key: "contas", titulo: "Contas a pagar e receber", descricao: "Vencimentos, status, atrasos e saldo em aberto", icon: Wallet, grupo: "Financeiros" },
  { key: "fluxo", titulo: "Fluxo de caixa", descricao: "Entradas, saídas e saldo acumulado por lançamento", icon: PiggyBank, grupo: "Financeiros" },
  { key: "dre", titulo: "DRE por centro de custo", descricao: "Receitas, custos (colheita, transporte, serraria) e resultado", icon: TrendingUp, grupo: "Financeiros" },
  { key: "notas", titulo: "Notas fiscais", descricao: "NFs emitidas/recebidas com valores e impostos", icon: Receipt, grupo: "Financeiros" },
  { key: "faturamento", titulo: "Faturamento por cliente", descricao: "Pedidos, NFs e recebimentos por cliente", icon: Users, grupo: "Financeiros" },
];


const brl = (v: unknown) =>
  Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toCSV(rows: Record<string, unknown>[]) {

  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(";"), ...rows.map(r => cols.map(c => esc(r[c])).join(";"))].join("\n");
}

function downloadCSV(name: string, rows: Record<string, unknown>[]) {
  const csv = toCSV(rows);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function Relatorios() {
  const [ativo, setAtivo] = useState<RelKey | null>(null);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="BI"
        title="Relatórios"
        description="Relatórios operacionais e financeiros conectados aos dados reais. Exporte em CSV (abre no Excel)."
      />

      {(["Operacionais", "Financeiros"] as const).map((grupo) => (
        <section key={grupo} className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{grupo}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {RELATORIOS.filter(r => r.grupo === grupo).map((r) => (
              <button key={r.key} onClick={() => setAtivo(r.key)}
                className={`rounded-xl border p-5 text-left transition-all hover:border-primary/40 ${ativo === r.key ? "border-primary bg-primary/5" : "border-border/60 bg-card"}`}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-[image:var(--gradient-accent)] text-primary-foreground">
                    <r.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-semibold">{r.titulo}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{r.descricao}</p>
              </button>
            ))}
          </div>
        </section>
      ))}


      {ativo && <RelatorioView key={ativo} tipo={ativo} />}
    </div>
  );
}

function RelatorioView({ tipo }: { tipo: RelKey }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["relatorio", tipo],
    queryFn: async () => {
      if (tipo === "rendimento") {
        const { data } = await supabase.from("ordens_producao")
          .select("codigo,volume_entrada_m3,volume_produzido_m3,volume_perda_m3,rendimento_pct,status,data_abertura,data_conclusao")
          .order("data_abertura", { ascending: false });
        return (data ?? []).map(r => ({
          OP: r.codigo,
          "Entrada (m³)": Number(r.volume_entrada_m3 || 0).toFixed(2),
          "Produzido (m³)": Number(r.volume_produzido_m3 || 0).toFixed(2),
          "Perda (m³)": Number(r.volume_perda_m3 || 0).toFixed(2),
          "Rendimento %": Number(r.rendimento_pct || 0).toFixed(1),
          Status: r.status,
          Abertura: r.data_abertura ? new Date(r.data_abertura).toLocaleDateString("pt-BR") : "",
          Conclusão: r.data_conclusao ? new Date(r.data_conclusao).toLocaleDateString("pt-BR") : "",
        }));
      }
      if (tipo === "estoque") {
        const { data } = await supabase.from("lotes_patio")
          .select("codigo,especie,volume_m3,qtd_toras,localizacao,status,criado_em")
          .order("criado_em", { ascending: false });
        return (data ?? []).map(r => ({
          Lote: r.codigo,
          Espécie: r.especie ?? "—",
          "Volume (m³)": Number(r.volume_m3 || 0).toFixed(2),
          Toras: r.qtd_toras,
          Localização: r.localizacao ?? "—",
          Status: r.status,
          Recebido: r.criado_em ? new Date(r.criado_em).toLocaleDateString("pt-BR") : "",
        }));
      }
      if (tipo === "ocs") {
        const { data } = await supabase.from("ordens_colheita")
          .select("codigo,volume_previsto_m3,volume_colhido_m3,status,data_abertura,data_conclusao")
          .order("data_abertura", { ascending: false });
        return (data ?? []).map(r => ({
          OC: r.codigo,
          "Previsto (m³)": Number(r.volume_previsto_m3 || 0).toFixed(2),
          "Colhido (m³)": Number(r.volume_colhido_m3 || 0).toFixed(2),
          "Variação %": Number(r.volume_previsto_m3) > 0
            ? (((Number(r.volume_colhido_m3 || 0) - Number(r.volume_previsto_m3)) / Number(r.volume_previsto_m3)) * 100).toFixed(1)
            : "0.0",
          Status: r.status,
          Abertura: r.data_abertura ? new Date(r.data_abertura).toLocaleDateString("pt-BR") : "",
          Conclusão: r.data_conclusao ? new Date(r.data_conclusao).toLocaleDateString("pt-BR") : "",
        }));
      }
      if (tipo === "divergencias") {
        const { data } = await supabase.from("divergencias")
          .select("codigo,tipo,descricao,diferenca,status,criado_em")
          .order("criado_em", { ascending: false });
        return (data ?? []).map(r => ({
          Divergência: r.codigo,
          Tipo: r.tipo,
          Descrição: r.descricao,
          Diferença: r.diferenca,
          Status: r.status,
          Data: r.criado_em ? new Date(r.criado_em).toLocaleDateString("pt-BR") : "",
        }));
      }
      if (tipo === "produtos") {
        const { data } = await supabase.from("produtos_acabados")
          .select("codigo,descricao,dimensoes,qtd_pecas,volume_m3,status,criado_em")
          .order("criado_em", { ascending: false });
        return (data ?? []).map(r => ({
          PA: r.codigo,
          Descrição: r.descricao,
          Dimensões: r.dimensoes ?? "—",
          Peças: r.qtd_pecas,
          "Volume (m³)": Number(r.volume_m3 || 0).toFixed(2),
          Status: r.status,
          Criado: r.criado_em ? new Date(r.criado_em).toLocaleDateString("pt-BR") : "",
        }));
      }
      if (tipo === "contas") {
        const { data } = await supabase.from("contas_financeiras")
          .select("tipo,descricao,categoria,valor,vencimento,data_pagamento,status,fornecedor,clientes(nome),centros_custo(nome)")
          .order("vencimento", { ascending: true });
        const hoje = new Date().toISOString().slice(0, 10);
        return (data ?? []).map(r => ({
          Tipo: r.tipo === "receber" ? "A receber" : "A pagar",
          Descrição: r.descricao,
          Categoria: r.categoria ?? "—",
          "Cliente/Fornecedor": r.clientes?.nome ?? r.fornecedor ?? "—",
          "Centro de custo": r.centros_custo?.nome ?? "—",
          "Valor (R$)": brl(r.valor),
          Vencimento: r.vencimento ? new Date(r.vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "",
          Status: r.status,
          "Dias em atraso": r.status !== "pago" && r.vencimento && r.vencimento < hoje
            ? Math.floor((Date.parse(hoje) - Date.parse(r.vencimento)) / 86400000)
            : 0,
          Pagamento: r.data_pagamento ? new Date(r.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR") : "—",
        }));
      }
      if (tipo === "fluxo") {
        const { data } = await supabase.from("movimentacoes_caixa")
          .select("data,tipo,descricao,categoria,valor,forma_pagamento,conciliado_em,contas_bancarias(banco),centros_custo(nome)")
          .order("data", { ascending: true });
        let saldo = 0;
        return (data ?? []).map(r => {
          const v = Number(r.valor || 0);
          saldo += r.tipo === "entrada" ? v : -v;
          return {
            Data: r.data ? new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR") : "",
            Tipo: r.tipo === "entrada" ? "Entrada" : "Saída",
            Descrição: r.descricao,
            Categoria: r.categoria ?? "—",
            "Centro de custo": r.centros_custo?.nome ?? "—",
            Conta: r.contas_bancarias?.banco ?? "—",
            Forma: r.forma_pagamento ?? "—",
            "Valor (R$)": brl(v),
            "Saldo acumulado (R$)": brl(saldo),
            Conciliado: r.conciliado_em ? "Sim" : "Não",
          };
        });
      }
      if (tipo === "dre") {
        const { data } = await supabase.from("movimentacoes_caixa")
          .select("tipo,valor,categoria,centros_custo(nome,tipo)");
        const grupos = new Map<string, { entradas: number; saidas: number }>();
        for (const r of data ?? []) {
          const nome = r.centros_custo?.nome ?? r.categoria ?? "Sem centro de custo";
          const g = grupos.get(nome) ?? { entradas: 0, saidas: 0 };
          const v = Number(r.valor || 0);
          if (r.tipo === "entrada") g.entradas += v; else g.saidas += v;
          grupos.set(nome, g);
        }
        const rows = [...grupos.entries()].map(([nome, g]) => ({
          "Centro de custo / Categoria": nome,
          "Receitas (R$)": brl(g.entradas),
          "Custos (R$)": brl(g.saidas),
          "Resultado (R$)": brl(g.entradas - g.saidas),
        }));
        if (rows.length > 0) {
          const totE = [...grupos.values()].reduce((s, g) => s + g.entradas, 0);
          const totS = [...grupos.values()].reduce((s, g) => s + g.saidas, 0);
          rows.push({
            "Centro de custo / Categoria": "RESULTADO TOTAL",
            "Receitas (R$)": brl(totE),
            "Custos (R$)": brl(totS),
            "Resultado (R$)": brl(totE - totS),
          });
        }
        return rows;
      }
      if (tipo === "notas") {
        const { data } = await supabase.from("notas_fiscais")
          .select("numero,serie,tipo,valor,data_emissao,status,cfop,natureza_operacao,base_icms,valor_icms,valor_ipi,fornecedor,clientes(nome),cargas(codigo)")
          .order("data_emissao", { ascending: false });
        return (data ?? []).map(r => ({
          NF: `${r.numero}${r.serie ? "/" + r.serie : ""}`,
          Tipo: r.tipo,
          "Cliente/Fornecedor": r.clientes?.nome ?? r.fornecedor ?? "—",
          Carga: r.cargas?.codigo ?? "—",
          CFOP: r.cfop ?? "—",
          Natureza: r.natureza_operacao ?? "—",
          "Valor (R$)": brl(r.valor),
          "Base ICMS (R$)": brl(r.base_icms ?? 0),
          "ICMS (R$)": brl(r.valor_icms ?? 0),
          "IPI (R$)": brl(r.valor_ipi ?? 0),
          Emissão: r.data_emissao ? new Date(r.data_emissao + "T00:00:00").toLocaleDateString("pt-BR") : "",
          Status: r.status,
        }));
      }
      if (tipo === "faturamento") {
        const [clientes, pedidos, contas] = await Promise.all([
          supabase.from("clientes").select("id,nome,limite_credito"),
          supabase.from("pedidos").select("cliente_id,valor_total,status"),
          supabase.from("contas_financeiras").select("cliente_id,valor,status,tipo"),
        ]);
        return (clientes.data ?? []).map(c => {
          const ps = (pedidos.data ?? []).filter(p => p.cliente_id === c.id);
          const cs = (contas.data ?? []).filter(x => x.cliente_id === c.id && x.tipo === "receber");
          const recebido = cs.filter(x => x.status === "pago").reduce((s, x) => s + Number(x.valor || 0), 0);
          const aberto = cs.filter(x => x.status !== "pago").reduce((s, x) => s + Number(x.valor || 0), 0);
          return {
            Cliente: c.nome,
            Pedidos: ps.length,
            "Faturado (R$)": brl(ps.reduce((s, p) => s + Number(p.valor_total || 0), 0)),
            "Recebido (R$)": brl(recebido),
            "Em aberto (R$)": brl(aberto),
            "Limite crédito (R$)": brl(c.limite_credito ?? 0),
          };
        }).sort((a, b) => b.Pedidos - a.Pedidos);
      }
      return [];

    },
  });

  const titulo = RELATORIOS.find(r => r.key === tipo)!.titulo;

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2"><FileBarChart className="h-4 w-4" /> {titulo}</h2>
          <p className="text-xs text-muted-foreground">{rows.length} registros</p>
        </div>
        <Button size="sm" onClick={() => downloadCSV(`silvacore-${tipo}-${new Date().toISOString().slice(0,10)}`, rows)} disabled={rows.length === 0}>
          <Download className="mr-1 h-4 w-4" /> Exportar CSV
        </Button>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Sem dados para este relatório.</div>
      ) : (
        <DataTable
          rows={rows}
          columns={Object.keys(rows[0]).map(k => ({
            key: k, label: k,
            align: /m³|%|Peças|Toras/.test(k) ? "right" as const : undefined,
            render: (r) => String(r[k] ?? "—"),
          }))}
        />
      )}
    </section>
  );
}
