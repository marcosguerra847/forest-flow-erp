import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Users, ShoppingCart, DollarSign, FileText } from "lucide-react";
import { clientes, pedidos } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/comercial")({
  head: () => ({ meta: [{ title: "Comercial · SilvaCore" }] }),
  component: Comercial,
});

function Comercial() {
  const totalPedidos = pedidos.reduce((s, p) => s + p.total, 0);
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Vendas"
        title="Clientes e pedidos"
        description="Carteira de clientes, orçamentos e pedidos de venda."
        actions={
          <>
            <button className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary">+ Cliente</button>
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">+ Pedido</button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Clientes ativos" value={clientes.length} icon={Users} />
        <KpiCard label="Pedidos abertos" value={pedidos.length} icon={ShoppingCart} />
        <KpiCard label="Valor em pedidos" value={`R$ ${totalPedidos.toLocaleString("pt-BR")}`} icon={DollarSign} tone="success" />
        <KpiCard label="Orçamentos" value="9" delta="3 expirando esta semana" icon={FileText} tone="warning" />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Pedidos de venda</h2>
        <DataTable
          rows={pedidos}
          columns={[
            { key: "numero", label: "Nº" },
            { key: "cliente", label: "Cliente" },
            { key: "itens", label: "Itens", align: "right" },
            { key: "total", label: "Total (R$)", align: "right", render: (r) => r.total.toLocaleString("pt-BR") },
            { key: "pagamento", label: "Pagamento" },
            { key: "data", label: "Data" },
            { key: "status", label: "Status", render: (r) => (
              <StatusBadge tone={r.status === "Faturado" ? "success" : r.status.includes("Aguardando") ? "warning" : "info"}>
                {r.status}
              </StatusBadge>
            ) },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Clientes</h2>
        <DataTable
          rows={clientes}
          columns={[
            { key: "nome", label: "Cliente" },
            { key: "doc", label: "CNPJ/CPF" },
            { key: "tel", label: "Telefone" },
            { key: "email", label: "E-mail" },
            { key: "limite", label: "Limite (R$)", align: "right", render: (r) => r.limite.toLocaleString("pt-BR") },
          ]}
        />
      </section>
    </div>
  );
}
