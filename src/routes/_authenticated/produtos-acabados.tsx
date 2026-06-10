import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Package2, QrCode, Trash2, Plus } from "lucide-react";
import { QrDisplay } from "@/components/QrDisplay";
import { toast } from "sonner";
import { proximoCodigo } from "@/lib/codigo";

type PA = {
  id: string; codigo: string; descricao: string; dimensoes: string | null;
  qtd_pecas: number; volume_m3: number; status: string; ordem_producao_id: string; criado_em: string;
};

export const Route = createFileRoute("/_authenticated/produtos-acabados")({ component: PAPage });

function PAPage() {
  const qc = useQueryClient();
  const [showQr, setShowQr] = useState<PA | null>(null);
  const [novo, setNovo] = useState(false);
  const { data: ops = [] } = useQuery({
    queryKey: ["ops-para-pa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ordens_producao").select("id,codigo").order("codigo", { ascending: false });
      if (error) throw error;
      return data as { id: string; codigo: string }[];
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos_acabados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Produto removido"); qc.invalidateQueries({ queryKey: ["produtos-acabados"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

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
      <PageHeader eyebrow="Serraria" title="Produtos acabados" description="Lotes de produto acabado com QR Code para rastreabilidade até a venda." actions={
        <Dialog open={novo} onOpenChange={setNovo}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Novo produto</Button></DialogTrigger>
          <NovoPAForm ops={ops} onSaved={() => { setNovo(false); qc.invalidateQueries({ queryKey: ["produtos-acabados"] }); }} />
        </Dialog>
      } />

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
          { key: "qr", label: "", render: (r) => (
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" onClick={() => setShowQr(r)}><QrCode className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { if (confirm(`Excluir ${r.codigo}?`)) del.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ) },
        ]}
      />

      <Dialog open={!!showQr} onOpenChange={(o) => !o && setShowQr(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{showQr?.codigo}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4">
            {showQr && <QrDisplay tipo="pa" codigo={showQr.codigo} size={220} label={`${showQr.descricao} · ${showQr.dimensoes ?? ""}`} />}
            <p className="text-xs text-muted-foreground text-center max-w-xs">{showQr?.descricao} · {showQr?.dimensoes}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NovoPAForm({ ops, onSaved }: { ops: { id: string; codigo: string }[]; onSaved: () => void }) {
  const [form, setForm] = useState({ ordem_producao_id: "", descricao: "", dimensoes: "", qtd_pecas: "", volume_m3: "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form.ordem_producao_id) return toast.error("Selecione a OP de origem");
    if (!form.descricao || !form.qtd_pecas || !form.volume_m3) return toast.error("Preencha descrição, peças e volume");
    setSaving(true);
    try {
      const codigo = await proximoCodigo("PA");
      const { error } = await supabase.from("produtos_acabados").insert({
        codigo, ordem_producao_id: form.ordem_producao_id,
        descricao: form.descricao, dimensoes: form.dimensoes || null,
        qtd_pecas: Number(form.qtd_pecas), volume_m3: Number(form.volume_m3),
        status: "em_estoque",
      });
      if (error) throw error;
      toast.success(`Produto ${codigo} criado`);
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo produto acabado</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Ordem de produção *</Label>
          <Select value={form.ordem_producao_id} onValueChange={(v) => setForm({ ...form, ordem_producao_id: v })}>
            <SelectTrigger><SelectValue placeholder={ops.length ? "Selecione a OP" : "Abra uma OP primeiro"} /></SelectTrigger>
            <SelectContent>{ops.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Descrição *</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Tábua bruta" /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Dimensões</Label><Input value={form.dimensoes} onChange={(e) => setForm({ ...form, dimensoes: e.target.value })} placeholder="30x300x4000mm" /></div>
        <div className="space-y-1.5"><Label>Qtd. peças *</Label><Input type="number" value={form.qtd_pecas} onChange={(e) => setForm({ ...form, qtd_pecas: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Volume (m³) *</Label><Input type="number" step="0.01" value={form.volume_m3} onChange={(e) => setForm({ ...form, volume_m3: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar produto"}</Button></DialogFooter>
    </DialogContent>
  );
}
