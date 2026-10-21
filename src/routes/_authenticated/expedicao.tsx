import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Package2, Plus, QrCode, Trash2, Copy, FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { QrDisplay } from "@/components/QrDisplay";
import { gerarNotaPacote, calcM3, type PacoteNota } from "@/lib/nota-expedicao";

type Pacote = PacoteNota & { id: string; token: string };

export const Route = createFileRoute("/_authenticated/expedicao")({
  head: () => ({ meta: [{ title: "Expedição · Fazenda Bela Vista" }, { name: "description", content: "Pacotes prontos para envio com QR para baixa pelo celular." }] }),
  component: ExpedicaoPage,
});

const linkOperador = (p: Pacote) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/x/${encodeURIComponent(p.codigo)}?t=${p.token}`;

function ExpedicaoPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<Pacote | null>(null);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pacotes"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("pacotes_expedicao" as never).select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return data as unknown as Pacote[];
    },
  });
  const prontos = rows.filter((r) => r.status === "pronto");
  const exp = rows.filter((r) => r.status !== "pronto");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Pátio · Estoque" title="Expedição de pacotes"
        description="Cada pacote pronto recebe um QR para colar na carga. O operador escaneia pelo celular, confere as quantidades e dá baixa de saída — sem login."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Novo pacote</Button></DialogTrigger>
            <PacoteForm onSaved={(p) => { setOpen(false); qc.invalidateQueries({ queryKey: ["pacotes"] }); setQr(p); }} />
          </Dialog>
        } />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Prontos p/ envio" value={prontos.length} icon={Package2} tone="warning" />
        <KpiCard label="Blocos prontos" value={prontos.reduce((s, r) => s + r.qtd_blocos, 0)} icon={Package2} />
        <KpiCard label="Expedidos" value={exp.length} icon={Package2} tone="success" />
        <KpiCard label="m³ expedidos" value={exp.reduce((s, r) => s + Number(r.volume_expedido_m3 ?? 0), 0).toFixed(1)} icon={Package2} />
      </div>
      {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : (
        <DataTable rows={rows} columns={[
          { key: "codigo", label: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
          { key: "descricao", label: "Produto" },
          { key: "cliente_nome", label: "Cliente" },
          { key: "qtd_blocos", label: "Blocos (prev/env)", align: "right", render: (r) => `${r.qtd_blocos} / ${r.qtd_blocos_expedida ?? "—"}` },
          { key: "qtd_pecas", label: "Peças (prev/env)", align: "right", render: (r) => `${r.qtd_pecas} / ${r.qtd_pecas_expedida ?? "—"}` },
          { key: "volume_m3", label: "m³ (prev/env)", align: "right", render: (r) => `${Number(r.volume_m3).toFixed(2)} / ${r.volume_expedido_m3 != null ? Number(r.volume_expedido_m3).toFixed(2) : "—"}` },
          { key: "status", label: "Status", render: (r) => (
            <StatusBadge tone={r.status === "pronto" ? "warning" : "success"}>
              {r.status === "pronto" ? "pronto" : `saiu ${r.expedido_em ? new Date(r.expedido_em).toLocaleDateString("pt-BR") : ""} · ${r.operador_nome ?? ""}`}
            </StatusBadge>) },
          { key: "acoes", label: "", render: (r) => (
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" title="Baixar nota" onClick={() => gerarNotaPacote(r, linkOperador(r))}><FileDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setQr(r)}><QrCode className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={async () => {
                if (!confirm(`Excluir pacote ${r.codigo}?`)) return;
                const { error } = await supabase.from("pacotes_expedicao" as never).delete().eq("id", r.id);
                if (error) toast.error(error.message); else { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["pacotes"] }); }
              }}><Trash2 className="h-4 w-4" /></Button>
            </div>) },
        ]} />
      )}
      <Dialog open={!!qr} onOpenChange={(o) => !o && setQr(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Etiqueta do pacote {qr?.codigo}</DialogTitle></DialogHeader>
          {qr && (
            <div className="flex flex-col items-center gap-3 py-2">
              <QrDisplay codigo={qr.codigo} value={linkOperador(qr)} size={220}
                tituloEtiqueta="Pacote para expedição"
                details={[
                  { label: "Produto", value: qr.descricao },
                  { label: "Cliente", value: qr.cliente_nome ?? "—" },
                  ...(qr.espessura_cm && qr.largura_cm && qr.comprimento_m ? [{ label: "Medidas", value: `${qr.espessura_cm} cm x ${qr.largura_cm} cm x ${(Number(qr.comprimento_m) * 100).toLocaleString("pt-BR")} cm` }] : []),
                  { label: "Peças por pacote", value: String(qr.pecas_por_pacote ?? "—") },
                  { label: "Blocos", value: String(qr.qtd_blocos) },
