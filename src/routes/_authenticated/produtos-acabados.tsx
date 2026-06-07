import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package2, QrCode } from "lucide-react";
import { QrDisplay } from "@/components/QrDisplay";

type PA = {
  id: string; codigo: string; descricao: string; dimensoes: string | null;
  qtd_pecas: number; volume_m3: number; status: string; ordem_producao_id: string; criado_em: string;
};

export const Route = createFileRoute("/_authenticated/produtos-acabados")({ component: PAPage });

function PAPage() {
  const [showQr, setShowQr] = useState<PA | null>(null);

  const { data: pas = [] } = useQuery({
    queryKey: ["produtos-acabados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos_acabados").select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return data as PA[];
    },
  });

  const volTotal = pas.reduce((s, p) => s + Number(p.volume_m3 || 0), 0);
  const pecasTotal = pas.reduce((s, p) => s + p.qtd_pecas, 0);
  const emEstoque = pas.filter(p => p.status === "em_estoque").length;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Serraria" title="Produtos acabados" description="Lotes de produto acabado com QR Code para rastreabilidade até a venda." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Lotes produto" value={pas.length} icon={Package2} />
        <KpiCard label="Em estoque" value={emEstoque} icon={Package2} tone="success" />
        <KpiCard label="Peças totais" value={pecasTotal} icon={Package2} />
        <KpiCard label="Volume (m³)" value={volTotal.toFixed(1)} icon={Package2} />
      </div>

      <DataTable
        rows={pas}
        columns={[
          { key: "codigo", label: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
          { key: "descricao", label: "Descrição" },
          { key: "dimensoes", label: "Dimensões" },
          { key: "qtd_pecas", label: "Peças", align: "right" },
          { key: "volume_m3", label: "Vol (m³)", align: "right", render: (r) => Number(r.volume_m3).toFixed(2) },
          { key: "criado_em", label: "Criado em", render: (r) => new Date(r.criado_em).toLocaleDateString("pt-BR") },
          { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "em_estoque" ? "success" : "default"}>{r.status.replace("_", " ")}</StatusBadge> },
          { key: "qr", label: "", render: (r) => <div className="flex justify-end"><Button size="icon" variant="ghost" onClick={() => setShowQr(r)}><QrCode className="h-4 w-4" /></Button></div> },
        ]}
      />

      <Dialog open={!!showQr} onOpenChange={(o) => !o && setShowQr(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{showQr?.codigo}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4">
            {showQr && <QrDisplay value={`PA:${showQr.codigo}`} size={220} />}
            <p className="text-xs text-muted-foreground text-center max-w-xs">{showQr?.descricao} · {showQr?.dimensoes}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
