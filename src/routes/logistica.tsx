import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Truck, MapPin, Package, Clock } from "lucide-react";
import { entregas } from "@/lib/mock-data";

export const Route = createFileRoute("/logistica")({
  head: () => ({ meta: [{ title: "Logística · SilvaCore" }] }),
  component: Logistica,
});

function Logistica() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Distribuição"
        title="Entregas e frota"
        description="Romaneios, rotas e acompanhamento de cargas."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Entregas ativas" value={entregas.length} icon={Truck} />
        <KpiCard label="Em rota" value={entregas.filter((e) => e.status === "Em rota").length} icon={MapPin} tone="warning" />
        <KpiCard label="Carregando" value={entregas.filter((e) => e.status === "Carregando").length} icon={Package} />
        <KpiCard label="Agendadas" value={entregas.filter((e) => e.status === "Agendada").length} icon={Clock} />
      </div>

      <DataTable
        rows={entregas}
        columns={[
          { key: "id", label: "Entrega" },
          { key: "pedido", label: "Pedido" },
          { key: "veiculo", label: "Veículo / Reboque" },
          { key: "motorista", label: "Motorista" },
          { key: "rota", label: "Rota" },
          { key: "saida", label: "Saída" },
          { key: "status", label: "Status", render: (r) => (
            <StatusBadge tone={r.status === "Em rota" ? "warning" : r.status === "Carregando" ? "info" : "default"}>
              {r.status}
            </StatusBadge>
          ) },
        ]}
      />
    </div>
  );
}
