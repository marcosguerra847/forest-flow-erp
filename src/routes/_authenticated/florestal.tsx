import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Trees, MapPin, Sprout, Axe } from "lucide-react";
import { fazendas, talhoes } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/florestal")({
  head: () => ({ meta: [{ title: "Florestal · SilvaCore" }] }),
  component: Florestal,
});

function Florestal() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Módulo florestal"
        title="Fazendas, talhões e manejo"
        description="Cadastro de áreas, plantios, manejo silvicultural e planejamento de colheita."
        actions={
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            + Nova fazenda
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Fazendas ativas" value={fazendas.length} icon={Trees} />
        <KpiCard label="Área total" value="4.740 ha" delta="3.960 ha plantadas" icon={MapPin} />
        <KpiCard label="Talhões" value={talhoes.length} delta="2 em colheita" icon={Sprout} />
        <KpiCard label="Vol. estimado colheita" value="38.420 m³" delta="Próximos 12 meses" icon={Axe} tone="success" />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Fazendas</h2>
        <DataTable
          rows={fazendas}
          columns={[
            { key: "nome", label: "Fazenda" },
            { key: "proprietario", label: "Proprietário" },
            { key: "local", label: "Localização" },
            { key: "area", label: "Área (ha)", align: "right", render: (r) => r.area.toLocaleString("pt-BR") },
            { key: "plantada", label: "Plantada (ha)", align: "right", render: (r) => r.plantada.toLocaleString("pt-BR") },
            { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "Ativa" ? "success" : "info"}>{r.status}</StatusBadge> },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Talhões</h2>
        <DataTable
          rows={talhoes}
          columns={[
            { key: "codigo", label: "Código" },
            { key: "fazenda", label: "Fazenda" },
            { key: "especie", label: "Espécie" },
            { key: "area", label: "Área (ha)", align: "right" },
            { key: "plantio", label: "Plantio" },
            { key: "idade", label: "Idade" },
            { key: "status", label: "Status", render: (r) => (
              <StatusBadge tone={r.status.includes("Pronto") ? "success" : r.status.includes("colheita") ? "warning" : "info"}>
                {r.status}
              </StatusBadge>
            ) },
          ]}
        />
      </section>
    </div>
  );
}
