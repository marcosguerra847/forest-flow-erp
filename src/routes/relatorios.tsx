import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { FileBarChart, TrendingUp, Trees, Factory, Wallet, Truck, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · SilvaCore" }] }),
  component: Relatorios,
});

const grupos = [
  {
    titulo: "Operacionais", icon: Factory, items: [
      "Produção diária por linha",
      "Rendimento da serraria por espécie",
      "Perdas e refugos por OP",
      "Consumo de toras por produto",
    ],
  },
  {
    titulo: "Estoque & Logística", icon: Truck, items: [
      "Posição de estoque por galpão",
      "Curva ABC de produtos",
      "Romaneios e entregas por rota",
      "Giro de estoque mensal",
    ],
  },
  {
    titulo: "Comercial", icon: TrendingUp, items: [
      "Vendas por cliente",
      "Faturamento por espécie",
      "Margem por pedido",
      "Top 10 clientes do trimestre",
    ],
  },
  {
    titulo: "Financeiro", icon: Wallet, items: [
      "Fluxo de caixa realizado vs projetado",
      "Contas a pagar e receber em aberto",
      "DRE gerencial",
      "Custo de produção por m³",
    ],
  },
  {
    titulo: "Florestal", icon: Trees, items: [
      "Idade dos plantios por talhão",
      "Previsão de colheita 24 meses",
      "Produtividade média por hectare",
      "Custos silviculturais",
    ],
  },
];

function Relatorios() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="BI"
        title="Relatórios e indicadores"
        description="Relatórios prontos por área. Exporte em PDF, Excel ou conecte ao Power BI."
        actions={
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            + Relatório customizado
          </button>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {grupos.map((g) => (
          <div key={g.titulo} className="rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-elegant)] transition-colors hover:border-primary/40">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[image:var(--gradient-accent)] text-primary-foreground">
                <g.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-semibold">{g.titulo}</h3>
            </div>
            <ul className="space-y-1">
              {g.items.map((it) => (
                <li key={it}>
                  <button className="group flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary">
                    <span className="flex items-center gap-2">
                      <FileBarChart className="h-4 w-4 text-muted-foreground" />
                      {it}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
