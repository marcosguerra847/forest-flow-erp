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
import { Scissors, Plus, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { proximoCodigo } from "@/lib/codigo";

type OC = {
  id: string; codigo: string; talhao_id: string;
  volume_previsto_m3: number; volume_colhido_m3: number;
  status: "aberta" | "em_execucao" | "concluida" | "cancelada";
  data_abertura: string; data_conclusao: string | null;
  observacoes: string | null;
};
type Talhao = { id: string; codigo: string; especie: string; volume_estimado_m3: number; fazenda_id: string };

export const Route = createFileRoute("/_authenticated/ordens-colheita")({ component: OCPage });

function OCPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: ocs = [], isLoading } = useQuery({
    queryKey: ["ocs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ordens_colheita").select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return data as OC[];
    },
  });
  const { data: talhoes = [] } = useQuery({
    queryKey: ["talhoes-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("talhoes").select("id,codigo,especie,volume_estimado_m3,fazenda_id").order("codigo");
      if (error) throw error;
      return data as Talhao[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OC["status"] }) => {
      const payload: Partial<OC> = { status };
      if (status === "concluida") payload.data_conclusao = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("ordens_colheita").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["ocs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const abertas = ocs.filter(o => o.status !== "concluida" && o.status !== "cancelada").length;
  const volPrevisto = ocs.reduce((s, o) => s + Number(o.volume_previsto_m3 || 0), 0);
  const volColhido = ocs.reduce((s, o) => s + Number(o.volume_colhido_m3 || 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operação"
        title="Ordens de Colheita"
        description="Abertura formal do corte em um talhão. Toda carga deve estar vinculada a uma OC ativa."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova OC</Button></DialogTrigger>
            <OCForm talhoes={talhoes} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["ocs"] }); }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total OCs" value={ocs.length} icon={Scissors} />
        <KpiCard label="Abertas" value={abertas} icon={Scissors} tone="warning" />
        <KpiCard label="Volume previsto (m³)" value={volPrevisto.toFixed(1)} icon={Scissors} />
        <KpiCard label="Volume colhido (m³)" value={volColhido.toFixed(1)} icon={CheckCircle2} tone="success" />
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : (
        <DataTable
          rows={ocs}
          columns={[
            { key: "codigo", label: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
            { key: "talhao_id", label: "Talhão", render: (r) => talhoes.find(t => t.id === r.talhao_id)?.codigo ?? "—" },
            { key: "volume_previsto_m3", label: "Previsto (m³)", align: "right", render: (r) => Number(r.volume_previsto_m3).toFixed(1) },
            { key: "volume_colhido_m3", label: "Colhido (m³)", align: "right", render: (r) => Number(r.volume_colhido_m3).toFixed(1) },
            { key: "data_abertura", label: "Abertura", render: (r) => new Date(r.data_abertura).toLocaleDateString("pt-BR") },
            { key: "status", label: "Status", render: (r) => (
              <StatusBadge tone={r.status === "concluida" ? "success" : r.status === "cancelada" ? "danger" : "warning"}>{r.status}</StatusBadge>
            ) },
            { key: "acoes", label: "", render: (r) => (
              <div className="flex justify-end gap-1">
                <Select value={r.status} onValueChange={(v) => setStatus.mutate({ id: r.id, status: v as OC["status"] })}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="em_execucao">Em execução</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={async () => {
                  if (!confirm(`Excluir OC ${r.codigo}?`)) return;
                  const { error } = await supabase.from("ordens_colheita").delete().eq("id", r.id);
                  if (error) toast.error(error.message); else { toast.success("OC excluída"); qc.invalidateQueries({ queryKey: ["ocs"] }); }
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ) },
          ]}
        />
      )}
    </div>
  );
}

function OCForm({ talhoes, onSaved }: { talhoes: Talhao[]; onSaved: () => void }) {
  const [form, setForm] = useState({ talhao_id: "", volume_previsto_m3: "", observacoes: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.talhao_id) return toast.error("Selecione um talhão");
    setSaving(true);
    try {
      const codigo = await proximoCodigo("OC");
      const { error } = await supabase.from("ordens_colheita").insert({
        codigo, talhao_id: form.talhao_id,
        volume_previsto_m3: Number(form.volume_previsto_m3) || 0,
        observacoes: form.observacoes || null,
      });
      if (error) throw error;
      toast.success(`OC ${codigo} aberta`);
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  };

  const tSel = talhoes.find(t => t.id === form.talhao_id);

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova Ordem de Colheita</DialogTitle></DialogHeader>
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label>Talhão *</Label>
          <Select value={form.talhao_id} onValueChange={(v) => setForm({ ...form, talhao_id: v, volume_previsto_m3: String(talhoes.find(t => t.id === v)?.volume_estimado_m3 ?? "") })}>
            <SelectTrigger><SelectValue placeholder="Escolha o talhão" /></SelectTrigger>
            <SelectContent>
              {talhoes.map(t => <SelectItem key={t.id} value={t.id}>{t.codigo} — {t.especie} ({Number(t.volume_estimado_m3).toFixed(0)} m³)</SelectItem>)}
            </SelectContent>
          </Select>
          {tSel && <p className="text-xs text-muted-foreground">Volume estimado do inventário: {Number(tSel.volume_estimado_m3).toFixed(1)} m³</p>}
        </div>
        <div className="space-y-1.5"><Label>Volume previsto (m³)</Label><Input type="number" step="0.01" value={form.volume_previsto_m3} onChange={(e) => setForm({ ...form, volume_previsto_m3: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Abrindo..." : "Abrir OC"}</Button></DialogFooter>
    </DialogContent>
  );
}
