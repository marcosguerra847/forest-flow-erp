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
import { MapPinned, Trees, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Fazenda = {
  id: string; nome: string; proprietario: string | null; local: string | null;
  area_ha: number; car: string | null; status: "ativa" | "inativa" | "manejo"; observacoes: string | null;
};

export const Route = createFileRoute("/_authenticated/fazendas")({
  component: FazendasPage,
});

function FazendasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fazenda | null>(null);

  const { data: fazendas = [], isLoading } = useQuery({
    queryKey: ["fazendas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fazendas").select("*").order("nome");
      if (error) throw error;
      return data as Fazenda[];
    },
  });

  const { data: areaTotal = 0 } = useQuery({
    queryKey: ["fazendas-area"],
    queryFn: () => fazendas.reduce((s, f) => s + Number(f.area_ha || 0), 0),
    enabled: !isLoading,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fazendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fazenda excluída"); qc.invalidateQueries({ queryKey: ["fazendas"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cadastros"
        title="Fazendas"
        description="Cadastre as áreas produtivas. Base para talhões, ordens de colheita e rastreabilidade."
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova fazenda</Button></DialogTrigger>
            <FazendaForm fazenda={editing} onSaved={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["fazendas"] }); }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Fazendas" value={fazendas.length} icon={MapPinned} />
        <KpiCard label="Área total (ha)" value={areaTotal.toLocaleString("pt-BR")} icon={Trees} />
        <KpiCard label="Ativas" value={fazendas.filter(f => f.status === "ativa").length} icon={MapPinned} tone="success" />
        <KpiCard label="Em manejo" value={fazendas.filter(f => f.status === "manejo").length} icon={Trees} tone="warning" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : fazendas.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <DataTable
          rows={fazendas}
          columns={[
            { key: "nome", label: "Fazenda" },
            { key: "proprietario", label: "Proprietário" },
            { key: "local", label: "Localização" },
            { key: "area_ha", label: "Área (ha)", align: "right", render: (r) => Number(r.area_ha).toLocaleString("pt-BR") },
            { key: "car", label: "CAR" },
            { key: "status", label: "Status", render: (r) => (
              <StatusBadge tone={r.status === "ativa" ? "success" : r.status === "manejo" ? "warning" : "default"}>{r.status}</StatusBadge>
            ) },
            { key: "acoes", label: "", render: (r) => (
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir ${r.nome}?`)) del.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ) },
          ]}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center">
      <MapPinned className="mx-auto h-10 w-10 text-muted-foreground/40" />
      <h3 className="mt-4 font-display text-lg font-semibold">Nenhuma fazenda cadastrada</h3>
      <p className="mt-1 text-sm text-muted-foreground">Comece cadastrando sua primeira fazenda.</p>
      <Button className="mt-4" onClick={onAdd}><Plus className="mr-1 h-4 w-4" /> Cadastrar agora</Button>
    </div>
  );
}

function FazendaForm({ fazenda, onSaved }: { fazenda: Fazenda | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: fazenda?.nome ?? "",
    proprietario: fazenda?.proprietario ?? "",
    local: fazenda?.local ?? "",
    area_ha: fazenda?.area_ha?.toString() ?? "",
    car: fazenda?.car ?? "",
    status: fazenda?.status ?? "ativa",
    observacoes: fazenda?.observacoes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      proprietario: form.proprietario || null,
      local: form.local || null,
      area_ha: Number(form.area_ha) || 0,
      car: form.car || null,
      status: form.status as "ativa" | "inativa" | "manejo",
      observacoes: form.observacoes || null,
    };
    const { error } = fazenda
      ? await supabase.from("fazendas").update(payload).eq("id", fazenda.id)
      : await supabase.from("fazendas").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(fazenda ? "Atualizada" : "Cadastrada");
    onSaved();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{fazenda ? "Editar fazenda" : "Nova fazenda"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Proprietário</Label><Input value={form.proprietario} onChange={(e) => setForm({ ...form, proprietario: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Localização</Label><Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Cidade-UF" /></div>
        <div className="space-y-1.5"><Label>Área (ha)</Label><Input type="number" step="0.01" value={form.area_ha} onChange={(e) => setForm({ ...form, area_ha: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>CAR</Label><Input value={form.car} onChange={(e) => setForm({ ...form, car: e.target.value })} /></div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="manejo">Em manejo</SelectItem>
              <SelectItem value="inativa">Inativa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-1.5"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.nome.trim()}>{saving ? "Salvando..." : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
