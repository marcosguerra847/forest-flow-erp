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
                  { label: "Peças", value: String(qr.qtd_pecas) },
                  { label: "Volume", value: `${Number(qr.volume_m3).toFixed(2)} m³` },
                ]}
                notaEtiqueta="Operador: escaneie com o celular para conferir e dar baixa de saída." />
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => gerarNotaPacote(qr, linkOperador(qr))}><FileDown className="mr-1 h-3.5 w-3.5" /> Baixar nota (PDF)</Button>
                <Button size="sm" variant="outline" onClick={() => gerarNotaPacote(qr, linkOperador(qr), true)}><Printer className="mr-1 h-3.5 w-3.5" /> Imprimir nota</Button>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(linkOperador(qr)); toast.success("Link copiado"); }}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copiar link
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PacoteForm({ onSaved }: { onSaved: (p: Pacote) => void }) {
  const [f, setF] = useState({
    descricao: "",
    cliente_nome: "",
    espessura_cm: "",
    largura_cm: "",
    comprimento_cm: "",
    qtd_blocos: "",
    pecas_por_pacote: "",
    volume_m3: "",
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);
  const num = (s: string) => Number(s.replace(",", ".")) || 0;
  const pacotes = num(f.qtd_blocos);
  const pecasPorPacote = num(f.pecas_por_pacote);
  const totalPecas = pacotes * pecasPorPacote;
  const comprimentoCm = num(f.comprimento_cm);
  const auto = calcM3(num(f.espessura_cm), num(f.largura_cm), comprimentoCm, totalPecas);
  const temMedidas = num(f.espessura_cm) > 0 && num(f.largura_cm) > 0 && comprimentoCm > 0 && pacotes > 0 && pecasPorPacote > 0;
  const volumeFinal = f.volume_m3.trim() ? num(f.volume_m3) : auto;

  const save = async () => {
    if (!f.descricao.trim()) return toast.error("Informe o produto");
    if (!temMedidas) return toast.error("Informe as três medidas em cm, a quantidade de pacotes e as peças por pacote");
    if (!Number.isInteger(pacotes) || !Number.isInteger(pecasPorPacote)) return toast.error("Pacotes e peças por pacote devem ser números inteiros");
    setSaving(true);
    try {
      const { data: codigo, error: e1 } = await supabase.rpc("proximo_codigo" as never, { _prefixo: "PX" } as never);
      if (e1) throw e1;
      const { data, error } = await supabase.from("pacotes_expedicao" as never).insert({
        codigo,
        descricao: f.descricao.trim(),
        cliente_nome: f.cliente_nome || null,
        espessura_cm: num(f.espessura_cm),
        largura_cm: num(f.largura_cm),
        // Mantém o armazenamento existente em metros para compatibilidade com registros antigos.
        comprimento_m: comprimentoCm / 100,
        qtd_blocos: pacotes,
        pecas_por_pacote: pecasPorPacote,
        qtd_pecas: totalPecas,
        volume_m3: Number(volumeFinal.toFixed(4)),
        observacoes: f.observacoes || null,
      } as never).select().single();
      if (error) throw error;
      toast.success(`Pacote ${codigo} criado`);
      onSaved(data as unknown as Pacote);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setSaving(false);
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Novo pacote para envio</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3 space-y-1.5"><Label>Produto / descrição *</Label><Input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Ex.: Tábua de eucalipto" /></div>
        <div className="sm:col-span-3 space-y-1.5"><Label>Cliente</Label><Input value={f.cliente_nome} onChange={(e) => setF({ ...f, cliente_nome: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Espessura (cm)</Label><Input inputMode="decimal" value={f.espessura_cm} onChange={(e) => setF({ ...f, espessura_cm: e.target.value })} placeholder="Ex.: 1,9" /></div>
        <div className="space-y-1.5"><Label>Largura (cm)</Label><Input inputMode="decimal" value={f.largura_cm} onChange={(e) => setF({ ...f, largura_cm: e.target.value })} placeholder="Ex.: 12" /></div>
        <div className="space-y-1.5"><Label>Comprimento (cm)</Label><Input inputMode="decimal" value={f.comprimento_cm} onChange={(e) => setF({ ...f, comprimento_cm: e.target.value })} placeholder="Ex.: 120" /></div>
        <div className="space-y-1.5"><Label>Quantidade de pacotes</Label><Input type="number" min="1" step="1" value={f.qtd_blocos} onChange={(e) => setF({ ...f, qtd_blocos: e.target.value })} placeholder="Ex.: 12" /></div>
        <div className="space-y-1.5"><Label>Peças por pacote</Label><Input type="number" min="1" step="1" value={f.pecas_por_pacote} onChange={(e) => setF({ ...f, pecas_por_pacote: e.target.value })} placeholder="Ex.: 522" /></div>
        <div className="space-y-1.5"><Label>Volume manual (m³, opcional)</Label><Input inputMode="decimal" value={f.volume_m3} placeholder={temMedidas ? auto.toFixed(4) : "Automático"} onChange={(e) => setF({ ...f, volume_m3: e.target.value })} /></div>
        <div className="sm:col-span-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          {temMedidas ? <>
            <p>Total de peças: <b>{totalPecas.toLocaleString("pt-BR")}</b></p>
            <p>Volume por peça: <b>{(auto / Math.max(totalPecas, 1)).toFixed(6)} m³</b></p>
            <p>Volume total calculado: <b>{auto.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m³</b></p>
            {f.volume_m3.trim() && <p>Será usado o volume manual informado.</p>}
          </> : "Preencha as três medidas em cm, a quantidade de pacotes e as peças por pacote para calcular automaticamente."}
        </div>
        <div className="sm:col-span-3 space-y-1.5"><Label>Observações</Label><Textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar pacote + QR"}</Button></DialogFooter>
    </DialogContent>
  );
}
