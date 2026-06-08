import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Boxes, Factory, Package, Truck, TrendingUp, Percent, AlertTriangle, Scissors, MapPinned, Sprout, Package2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard · SilvaCore" }] }),
  component: Dashboard,
});

const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-real"],
    queryFn: async () => {
      const [faz, talh, ocs, cargas, lotes, ops, pas, divs] = await Promise.all([
        supabase.from("fazendas").select("id,area_ha,status"),
        supabase.from("talhoes").select("id,especie,volume_estimado_m3"),
        supabase.from("ordens_colheita").select("id,status,volume_previsto_m3,volume_colhido_m3"),
        supabase.from("cargas").select("id,status,volume_carregado_m3,qtd_toras,data_saida"),
        supabase.from("lotes_patio").select("id,status,volume_m3,especie"),
        supabase.from("ordens_producao").select("id,status,volume_entrada_m3,volume_produzido_m3,volume_perda_m3,rendimento_pct,data_abertura"),
        supabase.from("produtos_acabados").select("id,status,volume_m3,qtd_pecas,criado_em"),
        supabase.from("divergencias").select("id,status,tipo"),
      ]);
      return {
        fazendas: faz.data ?? [],
        talhoes: talh.data ?? [],
        ocs: ocs.data ?? [],
        cargas: cargas.data ?? [],
        lotes: lotes.data ?? [],
        ops: ops.data ?? [],
        pas: pas.data ?? [],
        divs: divs.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando dashboard...</div>;
  }

  const areaTotal = data.fazendas.reduce((s, f) => s + Number(f.area_ha || 0), 0);
  const volEstimado = data.talhoes.reduce((s, t) => s + Number(t.volume_estimado_m3 || 0), 0);
  const volColhido = data.ocs.reduce((s, o) => s + Number(o.volume_colhido_m3 || 0), 0);
  const volPatio = data.lotes.filter(l => l.status === "disponivel").reduce((s, l) => s + Number(l.volume_m3 || 0), 0);
  const volProduzido = data.ops.reduce((s, o) => s + Number(o.volume_produzido_m3 || 0), 0);
  const volPA = data.pas.reduce((s, p) => s + Number(p.volume_m3 || 0), 0);
  const pecasPA = data.pas.reduce((s, p) => s + Number(p.qtd_pecas || 0), 0);
  const concl = data.ops.filter(o => o.status === "concluida");
  const rendMedio = concl.length ? concl.reduce((s, o) => s + Number(o.rendimento_pct || 0), 0) / concl.length : 0;
  const cargasTransito = data.cargas.filter(c => c.status === "em_transito").length;
  const divsAbertas = data.divs.filter(d => d.status !== "resolvida").length;
  const ocsAbertas = data.ocs.filter(o => o.status !== "concluida" && o.status !== "cancelada").length;

  // Estoque por espécie (lotes pátio disponíveis)
  const especieMap = new Map<string, number>();
  data.lotes.filter(l => l.status === "disponivel").forEach((l: { especie: string | null; volume_m3: number }) => {
    const k = l.especie ?? "Não informada";
    especieMap.set(k, (especieMap.get(k) ?? 0) + Number(l.volume_m3 || 0));
  });
  const estoqueEspecie = Array.from(especieMap, ([especie, volume]) => ({ especie, volume: Number(volume.toFixed(1)) }));

  // Produção × Recebimento últimos 6 meses
  const meses: { mes: string; entrada: number; produzido: number }[] = [];
  const hoje = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "short" });
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const entrada = data.cargas
      .filter((c: { data_saida: string }) => { const x = new Date(c.data_saida); return x >= d && x < next; })
      .reduce((s, c) => s + Number(c.volume_carregado_m3 || 0), 0);
    const produzido = data.ops
      .filter((o: { data_abertura: string }) => { const x = new Date(o.data_abertura); return x >= d && x < next; })
      .reduce((s, o) => s + Number(o.volume_produzido_m3 || 0), 0);
    meses.push({ mes: label, entrada: Number(entrada.toFixed(1)), produzido: Number(produzido.toFixed(1)) });
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Visão executiva" title="Dashboard" description="Indicadores operacionais em tempo real — dados reais do banco." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <KpiCard label="Fazendas" value={data.fazendas.length} delta={`${areaTotal.toLocaleString("pt-BR")} ha`} icon={MapPinned} />
        <KpiCard label="Talhões" value={data.talhoes.length} delta={`${volEstimado.toFixed(0)} m³ estimados`} icon={Sprout} />
        <KpiCard label="OCs abertas" value={ocsAbertas} delta={`${data.ocs.length} no total`} icon={Scissors} tone={ocsAbertas > 0 ? "warning" : "default"} />
        <KpiCard label="Cargas em trânsito" value={cargasTransito} delta={`${data.cargas.length} cargas geradas`} icon={Truck} />
        <KpiCard label="Estoque pátio" value={`${volPatio.toFixed(1)} m³`} delta={`${data.lotes.filter(l => l.status === "disponivel").length} lotes`} icon={Boxes} />
        <KpiCard label="Volume produzido" value={`${volProduzido.toFixed(1)} m³`} delta={`Colhido: ${volColhido.toFixed(0)} m³`} icon={Factory} />
        <KpiCard label="Produto acabado" value={`${volPA.toFixed(1)} m³`} delta={`${pecasPA} peças`} icon={Package2} tone="success" />
        <KpiCard label="Rendimento médio" value={`${rendMedio.toFixed(1)}%`} delta="OPs concluídas" icon={Percent} tone={rendMedio >= 50 ? "success" : "warning"} />
        <KpiCard label="Divergências abertas" value={divsAbertas} delta={`${data.divs.length} no total`} icon={AlertTriangle} tone={divsAbertas > 0 ? "danger" : "success"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Entrada pátio × Produção" subtitle="Volume m³ por mês (últimos 6 meses)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={meses}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)", opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
              <Bar dataKey="entrada" name="Entrada pátio" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="produzido" name="Produzido" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Estoque pátio por espécie" subtitle="Volume m³ disponível">
          {estoqueEspecie.length === 0 ? (
            <div className="grid h-[280px] place-items-center text-xs text-muted-foreground">Sem lotes disponíveis</div>
          ) : (
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
          )}
        </ChartCard>
      </div>
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
