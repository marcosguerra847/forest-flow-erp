import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Boxes, Package, DollarSign, Warehouse } from "lucide-react";
import { produtos } from "@/lib/mock-data";

export const Route = createFileRoute("/estoque")({
  head: () => ({ meta: [{ title: "Estoque · SilvaCore" }] }),
  component: Estoque,
});

function Estoque() {
  const totalVol = produtos.reduce((s, p) => s + p.volume, 0);
  const totalUnid = produtos.reduce((s, p) => s + p.qtd, 0);
  const valor = produtos.reduce((s, p) => s + p.qtd * (p.preco / 100), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Almoxarifado"
        title="Estoque de produtos acabados"
        description="Pranchas, vigas, caibros, tábuas, ripas e sarrafos por galpão."
        actions={
          <button className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary">
            Movimentações
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="SKUs ativos" value={produtos.length} icon={Boxes} />
        <KpiCard label="Volume total" value={`${totalVol.toFixed(1)} m³`} icon={Package} />
        <KpiCard label="Unidades" value={totalUnid.toLocaleString("pt-BR")} icon={Warehouse} />
        <KpiCard label="Valor de estoque" value={`R$ ${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={DollarSign} tone="success" />
      </div>

      <DataTable
        rows={produtos}
        columns={[
          { key: "codigo", label: "Código" },
          { key: "nome", label: "Produto" },
          { key: "especie", label: "Espécie" },
          { key: "qtd", label: "Qtd.", align: "right", render: (r) => r.qtd.toLocaleString("pt-BR") },
          { key: "volume", label: "Vol. m³", align: "right", render: (r) => r.volume.toFixed(1) },
          { key: "local", label: "Localização" },
          { key: "preco", label: "Preço un. (R$)", align: "right", render: (r) => r.preco.toLocaleString("pt-BR") },
        ]}
      />
    </div>
  );
}
