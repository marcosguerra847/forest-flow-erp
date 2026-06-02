import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Factory, Percent, Activity, Hammer } from "lucide-react";
import { ordensProducao } from "@/lib/mock-data";

export const Route = createFileRoute("/producao")({
  head: () => ({ meta: [{ title: "Produção · SilvaCore" }] }),
  component: Producao,
});

function Producao() {
  const rendMedio = (
    ordensProducao.filter((o) => o.rend > 0).reduce((s, o) => s + o.rend, 0) /
    ordensProducao.filter((o) => o.rend > 0).length
  ).toFixed(1);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Serraria"
        title="Ordens de produção"
        description="Conversão de toras em produtos acabados com controle de rendimento e perdas."
        actions={
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            + Nova OP
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="OPs do dia" value={ordensProducao.length} icon={Factory} />
        <KpiCard label="Rendimento médio" value={`${rendMedio}%`} delta="Meta 70%" icon={Percent} tone="warning" />
        <KpiCard label="Em execução" value={ordensProducao.filter((o) => o.status === "Em execução").length} icon={Activity} />
        <KpiCard label="Máquinas ativas" value="3" delta="L-01, L-02, L-03" icon={Hammer} />
      </div>

      <DataTable
        rows={ordensProducao}
        columns={[
          { key: "op", label: "Nº OP" },
          { key: "tora", label: "Tora" },
          { key: "produto", label: "Produto" },
          { key: "operador", label: "Operador" },
          { key: "maquina", label: "Máquina" },
          { key: "data", label: "Data" },
          { key: "entrada", label: "Entr. m³", align: "right", render: (r) => r.entrada.toFixed(2) },
          { key: "saida", label: "Saída m³", align: "right", render: (r) => r.saida.toFixed(2) },
          { key: "rend", label: "Rend %", align: "right", render: (r) => r.rend ? `${r.rend.toFixed(1)}%` : "—" },
          { key: "status", label: "Status", render: (r) => (
            <StatusBadge tone={r.status === "Concluída" ? "success" : r.status === "Em execução" ? "warning" : "info"}>
              {r.status}
            </StatusBadge>
          ) },
        ]}
      />
    </div>
  );
}
