import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download, Factory, Boxes, Scissors, AlertTriangle, Package2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · SilvaCore" }] }),
  component: Relatorios,
});

type RelKey = "rendimento" | "estoque" | "ocs" | "divergencias" | "produtos";

const RELATORIOS: { key: RelKey; titulo: string; descricao: string; icon: typeof Factory }[] = [
  { key: "rendimento", titulo: "Rendimento da serraria", descricao: "Volume entrada × produzido × perda por OP", icon: Factory },
  { key: "estoque", titulo: "Estoque do pátio", descricao: "Lotes disponíveis com volume e localização", icon: Boxes },
  { key: "ocs", titulo: "Ordens de Colheita", descricao: "Previsto vs colhido por OC", icon: Scissors },
  { key: "divergencias", titulo: "Divergências de carga", descricao: "Histórico completo de alertas", icon: AlertTriangle },
  { key: "produtos", titulo: "Produtos acabados", descricao: "Lotes de PA com volume e peças", icon: Package2 },
];

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
        description="Relatórios operacionais conectados aos dados reais. Exporte em CSV (abre no Excel)."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {RELATORIOS.map((r) => (
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
