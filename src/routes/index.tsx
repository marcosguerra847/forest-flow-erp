import { createFileRoute } from "@tanstack/react-router";
import { Activity, Boxes, DollarSign, Factory, Package, Truck, TrendingUp, Percent } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { kpis, producaoSerie, estoqueEspecie, fluxoCaixa } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · SilvaCore" }] }),
  component: Dashboard,
});

const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Visão executiva"
        title="Dashboard"
        description="Resumo operacional, financeiro e produtivo da operação madeireira."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <KpiCard label="Faturamento mensal" value={kpis.faturamentoMensal} delta="+12,4% vs mês anterior" icon={DollarSign} tone="success" />
        <KpiCard label="Lucro bruto" value={kpis.lucroBruto} delta="Margem 58,7%" icon={TrendingUp} tone="success" />
        <KpiCard label="Volume produzido" value={kpis.volumeProduzido} delta={`Diário: ${kpis.producaoDiaria}`} icon={Factory} />
        <KpiCard label="Volume vendido" value={kpis.volumeVendido} delta="92% do produzido" icon={Package} />
        <KpiCard label="Estoque atual" value={kpis.estoqueAtual} delta="Acabados + toras" icon={Boxes} />
        <KpiCard label="Rendimento serraria" value={kpis.rendimento} delta="Meta 70%" icon={Percent} tone="warning" />
        <KpiCard label="Entregas pendentes" value={kpis.entregasPendentes} delta="3 em rota" icon={Truck} />
        <KpiCard label="Custo operacional" value={kpis.custoOperacional} delta="-3,1% vs orçado" icon={Activity} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Produção × Vendas" subtitle="Volume m³ por mês" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={producaoSerie}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)", opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
              <Bar dataKey="producao" name="Produção" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="venda" name="Venda" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Estoque por espécie" subtitle="Volume m³">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={estoqueEspecie} dataKey="volume" nameKey="especie" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {estoqueEspecie.map((_, i) => (
                  <Cell key={i} fill={chartColors[i % chartColors.length]} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Fluxo de caixa" subtitle="Entradas vs saídas (R$ mil)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={fluxoCaixa}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
            <Line type="monotone" dataKey="entrada" name="Entradas" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="saida" name="Saídas" stroke="var(--chart-5)" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function ChartCard({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-elegant)] ${className}`}>
      <div className="mb-4">
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
