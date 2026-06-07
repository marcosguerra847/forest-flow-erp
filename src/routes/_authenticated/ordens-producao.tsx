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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Factory, Plus, Gauge } from "lucide-react";
import { toast } from "sonner";
import { proximoCodigo } from "@/lib/codigo";

type OP = {
  id: string; codigo: string; lote_patio_id: string;
  volume_entrada_m3: number; volume_produzido_m3: number; volume_perda_m3: number;
  rendimento_pct: number; data_abertura: string; data_conclusao: string | null;
  status: "aberta" | "em_execucao" | "concluida" | "cancelada"; observacoes: string | null;
};
type Lote = { id: string; codigo: string; volume_m3: number; especie: string | null; status: string };

export const Route = createFileRoute("/_authenticated/ordens-producao")({ component: OPPage });

function OPPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [apontando, setApontando] = useState<OP | null>(null);

  const { data: ops = [] } = useQuery({
    queryKey: ["ops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ordens_producao").select("*").order("data_abertura", { ascending: false });
      if (error) throw error;
      return data as OP[];
    },
  });
  const { data: lotesDisp = [] } = useQuery({
    queryKey: ["lotes-disponiveis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lotes_patio").select("id,codigo,volume_m3,especie,status").eq("status", "disponivel").order("codigo");
      if (error) throw error;
      return data as Lote[];
    },
  });

  const abertas = ops.filter(o => o.status !== "concluida" && o.status !== "cancelada").length;
  const concl = ops.filter(o => o.status === "concluida");
  const rendMedio = concl.length > 0 ? concl.reduce((s, o) => s + Number(o.rendimento_pct || 0), 0) / concl.length : 0;
  const perdaTotal = ops.reduce((s, o) => s + Number(o.volume_perda_m3 || 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Serraria"
        title="Ordens de Produção"
        description="Consumo de lote de toras na serraria. Apontamento de volume produzido e perda calcula rendimento automaticamente."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova OP</Button></DialogTrigger>
            <OPForm lotes={lotesDisp} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["ops"] }); qc.invalidateQueries({ queryKey: ["lotes"] }); qc.invalidateQueries({ queryKey: ["lotes-disponiveis"] }); }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total OPs" value={ops.length} icon={Factory} />
        <KpiCard label="Abertas" value={abertas} icon={Factory} tone="warning" />
        <KpiCard label="Rendimento médio" value={`${rendMedio.toFixed(1)}%`} icon={Gauge} tone="success" />
        <KpiCard label="Perda total (m³)" value={perdaTotal.toFixed(1)} icon={Gauge} tone="danger" />
      </div>

      <DataTable
        rows={ops}
        columns={[
          { key: "codigo", label: "OP", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
          { key: "volume_entrada_m3", label: "Entrada", align: "right", render: (r) => `${Number(r.volume_entrada_m3).toFixed(1)} m³` },
          { key: "volume_produzido_m3", label: "Produzido", align: "right", render: (r) => `${Number(r.volume_produzido_m3).toFixed(1)} m³` },
          { key: "volume_perda_m3", label: "Perda", align: "right", render: (r) => `${Number(r.volume_perda_m3).toFixed(1)} m³` },
          { key: "rendimento_pct", label: "Rend.", align: "right", render: (r) => <span className={Number(r.rendimento_pct) >= 50 ? "text-success font-semibold" : "text-warning"}>{Number(r.rendimento_pct).toFixed(1)}%</span> },
          { key: "status", label: "Status", render: (r) => (
            <StatusBadge tone={r.status === "concluida" ? "success" : r.status === "cancelada" ? "danger" : "warning"}>{r.status.replace("_", " ")}</StatusBadge>
          ) },
          { key: "acoes", label: "", render: (r) => r.status !== "concluida" && r.status !== "cancelada"
              ? <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => setApontando(r)}>Apontar</Button></div>
              : null,
          },
        ]}
      />

      {apontando && <ApontamentoDialog op={apontando} onClose={() => setApontando(null)} onDone={() => { setApontando(null); qc.invalidateQueries({ queryKey: ["ops"] }); qc.invalidateQueries({ queryKey: ["lotes"] }); }} />}
    </div>
  );
}

function OPForm({ lotes, onSaved }: { lotes: Lote[]; onSaved: () => void }) {
  const [form, setForm] = useState({ lote_patio_id: "", observacoes: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.lote_patio_id) return toast.error("Selecione um lote");
    setSaving(true);
    try {
      const lote = lotes.find(l => l.id === form.lote_patio_id);
      const codigo = await proximoCodigo("OP");
      const { error } = await supabase.from("ordens_producao").insert({
        codigo, lote_patio_id: form.lote_patio_id,
        volume_entrada_m3: lote?.volume_m3 ?? 0,
        status: "em_execucao",
        observacoes: form.observacoes || null,
      });
      if (error) throw error;
      await supabase.from("lotes_patio").update({ status: "em_producao" }).eq("id", form.lote_patio_id);
      toast.success(`OP ${codigo} aberta`);
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova Ordem de Produção</DialogTitle></DialogHeader>
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label>Lote do pátio *</Label>
          <Select value={form.lote_patio_id} onValueChange={(v) => setForm({ ...form, lote_patio_id: v })}>
            <SelectTrigger><SelectValue placeholder="Escolha o lote" /></SelectTrigger>
            <SelectContent>{lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo} — {l.especie ?? "?"} ({Number(l.volume_m3).toFixed(1)} m³)</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Abrindo..." : "Abrir OP"}</Button></DialogFooter>
    </DialogContent>
  );
}

function ApontamentoDialog({ op, onClose, onDone }: { op: OP; onClose: () => void; onDone: () => void }) {
  const [produzido, setProduzido] = useState(String(op.volume_produzido_m3));
  const [perda, setPerda] = useState(String(op.volume_perda_m3));
  const [obs, setObs] = useState(op.observacoes ?? "");
  const [concluir, setConcluir] = useState(false);
  const [pa, setPa] = useState({ descricao: "", dimensoes: "", qtd_pecas: "", volume_m3: "" });

  const save = useMutation({
    mutationFn: async () => {
      const payload: Partial<OP> = {
        volume_produzido_m3: Number(produzido) || 0,
        volume_perda_m3: Number(perda) || 0,
        observacoes: obs || null,
      };
      if (concluir) {
        payload.status = "concluida";
        payload.data_conclusao = new Date().toISOString();
      }
      const { error } = await supabase.from("ordens_producao").update(payload).eq("id", op.id);
      if (error) throw error;

      if (pa.descricao && Number(pa.qtd_pecas) > 0) {
        const codigo = await proximoCodigo("PA");
        await supabase.from("produtos_acabados").insert({
          codigo, ordem_producao_id: op.id, descricao: pa.descricao, dimensoes: pa.dimensoes || null,
          qtd_pecas: Number(pa.qtd_pecas) || 0, volume_m3: Number(pa.volume_m3) || 0,
        });
      }

      if (concluir) {
        await supabase.from("lotes_patio").update({ status: "consumido" }).eq("id", op.lote_patio_id);
      }
    },
    onSuccess: () => { toast.success("Apontamento salvo"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rend = Number(produzido) > 0 && Number(op.volume_entrada_m3) > 0
    ? (Number(produzido) / Number(op.volume_entrada_m3) * 100).toFixed(1)
    : "0.0";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Apontamento — {op.codigo}</DialogTitle></DialogHeader>
        <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs">Entrada: <strong>{Number(op.volume_entrada_m3).toFixed(1)} m³</strong> · Rendimento atual: <strong>{rend}%</strong></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Volume produzido (m³)</Label><Input type="number" step="0.01" value={produzido} onChange={(e) => setProduzido(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Perda (m³)</Label><Input type="number" step="0.01" value={perda} onChange={(e) => setPerda(e.target.value)} /></div>
          <div className="sm:col-span-2 space-y-1.5"><Label>Observações</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-3">
          <h4 className="text-sm font-semibold">Adicionar produto acabado (opcional)</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Descrição</Label><Input value={pa.descricao} onChange={(e) => setPa({ ...pa, descricao: e.target.value })} placeholder="Ex.: Tábua bruta" /></div>
            <div className="space-y-1.5"><Label>Dimensões</Label><Input value={pa.dimensoes} onChange={(e) => setPa({ ...pa, dimensoes: e.target.value })} placeholder="30x300x4000mm" /></div>
            <div className="space-y-1.5"><Label>Qtd. peças</Label><Input type="number" value={pa.qtd_pecas} onChange={(e) => setPa({ ...pa, qtd_pecas: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Volume (m³)</Label><Input type="number" step="0.01" value={pa.volume_m3} onChange={(e) => setPa({ ...pa, volume_m3: e.target.value })} /></div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={concluir} onChange={(e) => setConcluir(e.target.checked)} />
          Concluir esta OP e consumir o lote
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar apontamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
