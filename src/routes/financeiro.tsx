import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { financeiro, fluxoCaixa } from "@/lib/mock-data";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · SilvaCore" }] }),
  component: Financeiro,
});

function Financeiro() {
  const aReceber = financeiro.filter((f) => f.tipo === "Receber" && f.status !== "Recebido").reduce((s, f) => s + f.valor, 0);
  const aPagar = financeiro.filter((f) => f.tipo === "Pagar").reduce((s, f) => s + f.valor, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Controladoria"
        title="Financeiro"
        description="Contas a pagar e receber, fluxo de caixa e indicadores de margem."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="A receber" value={`R$ ${aReceber.toLocaleString("pt-BR")}`} icon={ArrowDownCircle} tone="success" />
        <KpiCard label="A pagar" value={`R$ ${aPagar.toLocaleString("pt-BR")}`} icon={ArrowUpCircle} tone="warning" />
        <KpiCard label="Saldo projetado" value={`R$ ${(aReceber - aPagar).toLocaleString("pt-BR")}`} icon={Wallet} />
        <KpiCard label="Margem bruta" value="58,7%" delta="+2,1pp vs mês anterior" icon={TrendingUp} tone="success" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-elegant)]">
        <h3 className="mb-4 font-display text-base font-semibold">Fluxo de caixa (R$ mil)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={fluxoCaixa}>
            <defs>
              <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="entrada" stroke="var(--chart-1)" fill="url(#gE)" strokeWidth={2} />
            <Area type="monotone" dataKey="saida" stroke="var(--chart-5)" fill="url(#gS)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DataTable
        rows={financeiro}
        columns={[
          { key: "tipo", label: "Tipo", render: (r) => (
            <StatusBadge tone={r.tipo === "Receber" ? "success" : "warning"}>{r.tipo}</StatusBadge>
          ) },
          { key: "desc", label: "Descrição" },
          { key: "venc", label: "Vencimento" },
          { key: "valor", label: "Valor (R$)", align: "right", render: (r) => r.valor.toLocaleString("pt-BR") },
          { key: "status", label: "Status", render: (r) => (
            <StatusBadge tone={r.status === "Recebido" ? "success" : r.status === "Em aberto" ? "warning" : "info"}>
              {r.status}
            </StatusBadge>
          ) },
        ]}
      />
    </div>
  );
}
