import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Package, Layers, DollarSign, Warehouse } from "lucide-react";
import { toras } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/toras")({
  head: () => ({ meta: [{ title: "Entrada de Toras · SilvaCore" }] }),
  component: Toras,
});

function Toras() {
  const volTotal = toras.reduce((s, t) => s + t.volume, 0);
  const valorTotal = toras.reduce((s, t) => s + t.valor, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pátio"
        title="Entrada de toras"
        description="Recebimento, cubagem e controle de pilhas no pátio da serraria."
        actions={
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            + Registrar entrada
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Toras em pátio" value={toras.length} icon={Package} />
        <KpiCard label="Volume total" value={`${volTotal.toFixed(2)} m³`} icon={Layers} />
        <KpiCard label="Valor estoque" value={`R$ ${valorTotal.toLocaleString("pt-BR")}`} icon={DollarSign} />
        <KpiCard label="Pilhas ativas" value="6" delta="A-3, A-4, B-1, B-2, C-1" icon={Warehouse} />
      </div>

      <DataTable
        rows={toras}
        columns={[
          { key: "id", label: "ID Tora" },
          { key: "especie", label: "Espécie" },
          { key: "fazenda", label: "Fazenda" },
          { key: "talhao", label: "Talhão" },
          { key: "diametro", label: "Ø (cm)", align: "right" },
          { key: "comprimento", label: "Comp. (m)", align: "right" },
          { key: "volume", label: "Vol. m³", align: "right", render: (r) => r.volume.toFixed(2) },
          { key: "valor", label: "Valor R$", align: "right", render: (r) => r.valor.toLocaleString("pt-BR") },
          { key: "patio", label: "Pátio" },
          { key: "entrada", label: "Entrada" },
        ]}
      />
    </div>
  );
}
