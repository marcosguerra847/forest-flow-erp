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
import { Trees, Sprout, Plus, Pencil, Trash2, Axe } from "lucide-react";
import { toast } from "sonner";

type Talhao = {
  id: string; fazenda_id: string; codigo: string; especie: string;
  area_ha: number; ano_plantio: number | null; espacamento: string | null;
  volume_estimado_m3: number;
  status: "em_crescimento" | "pronto_corte" | "em_corte" | "cortado" | "finalizado";
  fazendas?: { nome: string } | null;
};
type Fazenda = { id: string; nome: string };

const statusLabels: Record<Talhao["status"], string> = {
  em_crescimento: "Em crescimento", pronto_corte: "Pronto p/ corte",
  em_corte: "Em corte", cortado: "Cortado", finalizado: "Finalizado",
};

export const Route = createFileRoute("/_authenticated/talhoes")({ component: TalhoesPage });

function TalhoesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Talhao | null>(null);
  const [filterFazenda, setFilterFazenda] = useState<string>("all");

  const { data: fazendas = [] } = useQuery({
    queryKey: ["fazendas-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fazendas").select("id,nome").order("nome");
      if (error) throw error;
      return data as Fazenda[];
    },
  });

  const { data: talhoes = [], isLoading } = useQuery({
    queryKey: ["talhoes", filterFazenda],
    queryFn: async () => {
      let q = supabase.from("talhoes").select("*, fazendas(nome)").order("codigo");
      if (filterFazenda !== "all") q = q.eq("fazenda_id", filterFazenda);
      const { data, error } = await q;
      if (error) throw error;
      return data as Talhao[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("talhoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["talhoes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const volumeTotal = talhoes.reduce((s, t) => s + Number(t.volume_estimado_m3 || 0), 0);
  const prontos = talhoes.filter(t => t.status === "pronto_corte").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cadastros"
        title="Talhões"
        description="Áreas de plantio dentro das fazendas. Cada talhão é a unidade básica de manejo e colheita."
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button disabled={fazendas.length === 0}><Plus className="mr-1 h-4 w-4" /> Novo talhão</Button></DialogTrigger>
            <TalhaoForm talhao={editing} fazendas={fazendas} onSaved={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["talhoes"] }); }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Talhões" value={talhoes.length} icon={Trees} />
        <KpiCard label="Área (ha)" value={talhoes.reduce((s, t) => s + Number(t.area_ha || 0), 0).toLocaleString("pt-BR")} icon={Sprout} />
        <KpiCard label="Vol. estimado" value={`${volumeTotal.toLocaleString("pt-BR")} m³`} icon={Axe} />
        <KpiCard label="Prontos p/ corte" value={prontos} icon={Axe} tone={prontos > 0 ? "success" : "default"} />
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground">Filtrar por fazenda:</Label>
        <Select value={filterFazenda} onValueChange={setFilterFazenda}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {fazendas.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {fazendas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Cadastre uma fazenda primeiro.</p>
        </div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : talhoes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Trees className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum talhão cadastrado.</p>
        </div>
      ) : (
        <DataTable
          rows={talhoes}
          columns={[
            { key: "codigo", label: "Código" },
            { key: "fazenda", label: "Fazenda", render: (r) => r.fazendas?.nome ?? "—" },
            { key: "especie", label: "Espécie" },
            { key: "area_ha", label: "Área (ha)", align: "right" },
            { key: "ano_plantio", label: "Plantio" },
            { key: "volume_estimado_m3", label: "Vol. est. (m³)", align: "right", render: (r) => Number(r.volume_estimado_m3).toLocaleString("pt-BR") },
            { key: "status", label: "Status", render: (r) => (
              <StatusBadge tone={r.status === "pronto_corte" ? "success" : r.status === "em_corte" ? "warning" : r.status === "cortado" ? "default" : "info"}>
                {statusLabels[r.status]}
              </StatusBadge>
            ) },
            { key: "acoes", label: "", render: (r) => (
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir ${r.codigo}?`)) del.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ) },
          ]}
        />
      )}
    </div>
  );
}

function TalhaoForm({ talhao, fazendas, onSaved }: { talhao: Talhao | null; fazendas: Fazenda[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    fazenda_id: talhao?.fazenda_id ?? fazendas[0]?.id ?? "",
    codigo: talhao?.codigo ?? "",
    especie: talhao?.especie ?? "Eucalipto",
    area_ha: talhao?.area_ha?.toString() ?? "",
    ano_plantio: talhao?.ano_plantio?.toString() ?? "",
    espacamento: talhao?.espacamento ?? "",
    volume_estimado_m3: talhao?.volume_estimado_m3?.toString() ?? "",
    status: talhao?.status ?? "em_crescimento",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = {
      fazenda_id: form.fazenda_id,
      codigo: form.codigo.trim(),
      especie: form.especie.trim(),
      area_ha: Number(form.area_ha) || 0,
      ano_plantio: form.ano_plantio ? Number(form.ano_plantio) : null,
      espacamento: form.espacamento || null,
      volume_estimado_m3: Number(form.volume_estimado_m3) || 0,
      status: form.status as Talhao["status"],
    };
    const { error } = talhao
      ? await supabase.from("talhoes").update(payload).eq("id", talhao.id)
      : await supabase.from("talhoes").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(talhao ? "Atualizado" : "Cadastrado");
    onSaved();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{talhao ? "Editar talhão" : "Novo talhão"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Fazenda *</Label>
          <Select value={form.fazenda_id} onValueChange={(v) => setForm({ ...form, fazenda_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{fazendas.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Código *</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="T-01" /></div>
        <div className="space-y-1.5"><Label>Espécie *</Label><Input value={form.especie} onChange={(e) => setForm({ ...form, especie: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Área (ha) *</Label><Input type="number" step="0.01" value={form.area_ha} onChange={(e) => setForm({ ...form, area_ha: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Ano plantio</Label><Input type="number" value={form.ano_plantio} onChange={(e) => setForm({ ...form, ano_plantio: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Espaçamento</Label><Input value={form.espacamento} onChange={(e) => setForm({ ...form, espacamento: e.target.value })} placeholder="3x2 m" /></div>
        <div className="space-y-1.5"><Label>Vol. estimado (m³)</Label><Input type="number" step="0.01" value={form.volume_estimado_m3} onChange={(e) => setForm({ ...form, volume_estimado_m3: e.target.value })} /></div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Talhao["status"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.codigo.trim() || !form.fazenda_id}>{saving ? "Salvando..." : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
