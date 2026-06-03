import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Sprout, Plus, Trash2, Ruler, Axe } from "lucide-react";
import { toast } from "sonner";

type Parcela = {
  id: string; talhao_id: string; numero: string; area_m2: number;
  qtd_arvores: number; dap_medio_cm: number | null; altura_media_m: number | null;
  arvores_por_ha: number; volume_arvore_m3: number;
  observacoes: string | null; data: string;
  talhoes?: { codigo: string; especie: string; area_ha: number; fazendas?: { nome: string } | null } | null;
};
type TalhaoOpt = { id: string; codigo: string; fazendas: { nome: string } | null };

export const Route = createFileRoute("/_authenticated/inventario")({ component: InventarioPage });

function InventarioPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterTalhao, setFilterTalhao] = useState<string>("all");

  const { data: talhoes = [] } = useQuery({
    queryKey: ["talhoes-opt"],
    queryFn: async () => {
      const { data, error } = await supabase.from("talhoes").select("id,codigo,fazendas(nome)").order("codigo");
      if (error) throw error;
      return data as unknown as TalhaoOpt[];
    },
  });

  const { data: parcelas = [], isLoading } = useQuery({
    queryKey: ["parcelas", filterTalhao],
    queryFn: async () => {
      let q = supabase.from("inventario_parcelas").select("*, talhoes(codigo,especie,area_ha,fazendas(nome))").order("data", { ascending: false });
      if (filterTalhao !== "all") q = q.eq("talhao_id", filterTalhao);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Parcela[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventario_parcelas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Parcela excluída"); qc.invalidateQueries({ queryKey: ["parcelas"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Volume estimado por talhão (média das parcelas × área_ha)
  const resumoTalhao = useMemo(() => {
    const grupos = new Map<string, Parcela[]>();
    parcelas.forEach(p => {
      const arr = grupos.get(p.talhao_id) ?? [];
      arr.push(p); grupos.set(p.talhao_id, arr);
    });
    return Array.from(grupos.values()).map(arr => {
      const ref = arr[0];
      const arvHaMed = arr.reduce((s, p) => s + Number(p.arvores_por_ha), 0) / arr.length;
      const volArvMed = arr.reduce((s, p) => s + Number(p.volume_arvore_m3), 0) / arr.length;
      const volHa = arvHaMed * volArvMed;
      const areaHa = Number(ref.talhoes?.area_ha ?? 0);
      return {
        talhao: ref.talhoes?.codigo ?? "—",
        fazenda: ref.talhoes?.fazendas?.nome ?? "—",
        parcelas: arr.length,
        arv_ha: arvHaMed,
        vol_arv: volArvMed,
        vol_ha: volHa,
        vol_total: volHa * areaHa,
      };
    });
  }, [parcelas]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inventário"
        title="Inventário florestal por parcelas"
        description="Amostragem para estimar volume sem contar todas as árvores. Cada parcela mede DAP, altura e densidade — o sistema calcula árvores/ha e volume/ha automaticamente."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button disabled={talhoes.length === 0}><Plus className="mr-1 h-4 w-4" /> Nova parcela</Button></DialogTrigger>
            <ParcelaForm talhoes={talhoes} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["parcelas"] }); }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Parcelas medidas" value={parcelas.length} icon={Sprout} />
        <KpiCard label="Talhões inventariados" value={resumoTalhao.length} icon={Ruler} />
        <KpiCard label="Vol. estimado total" value={`${resumoTalhao.reduce((s, r) => s + r.vol_total, 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} m³`} icon={Axe} tone="success" />
        <KpiCard label="Vol. médio/ha" value={`${(resumoTalhao.reduce((s, r) => s + r.vol_ha, 0) / (resumoTalhao.length || 1)).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} m³`} icon={Ruler} />
      </div>

      {resumoTalhao.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Estimativa por talhão</h2>
          <DataTable
            rows={resumoTalhao}
            columns={[
              { key: "talhao", label: "Talhão" },
              { key: "fazenda", label: "Fazenda" },
              { key: "parcelas", label: "Parcelas", align: "right" },
              { key: "arv_ha", label: "Árv./ha", align: "right", render: (r) => r.arv_ha.toFixed(0) },
              { key: "vol_arv", label: "Vol./árv. (m³)", align: "right", render: (r) => r.vol_arv.toFixed(3) },
              { key: "vol_ha", label: "Vol./ha (m³)", align: "right", render: (r) => r.vol_ha.toFixed(1) },
              { key: "vol_total", label: "Vol. total est. (m³)", align: "right", render: (r) => r.vol_total.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) },
            ]}
          />
        </section>
      )}

      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground">Filtrar:</Label>
        <Select value={filterTalhao} onValueChange={setFilterTalhao}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os talhões</SelectItem>
            {talhoes.map(t => <SelectItem key={t.id} value={t.id}>{t.codigo} — {t.fazendas?.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {talhoes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Cadastre talhões primeiro.
        </div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : parcelas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Nenhuma parcela registrada.
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Parcelas</h2>
          <DataTable
            rows={parcelas}
            columns={[
              { key: "data", label: "Data" },
              { key: "talhao", label: "Talhão", render: (r) => r.talhoes?.codigo ?? "—" },
              { key: "numero", label: "Parcela" },
              { key: "area_m2", label: "Área (m²)", align: "right" },
              { key: "qtd_arvores", label: "Árvores", align: "right" },
              { key: "dap_medio_cm", label: "DAP (cm)", align: "right" },
              { key: "altura_media_m", label: "Altura (m)", align: "right" },
              { key: "arvores_por_ha", label: "Árv./ha", align: "right", render: (r) => Number(r.arvores_por_ha).toFixed(0) },
              { key: "volume_arvore_m3", label: "Vol/árv (m³)", align: "right", render: (r) => Number(r.volume_arvore_m3).toFixed(3) },
              { key: "acoes", label: "", render: (r) => (
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir parcela?")) del.mutate(r.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) },
            ]}
          />
        </section>
      )}
    </div>
  );
}

function ParcelaForm({ talhoes, onSaved }: { talhoes: TalhaoOpt[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    talhao_id: talhoes[0]?.id ?? "",
    numero: "",
    area_m2: "400",
    qtd_arvores: "",
    dap_medio_cm: "",
    altura_media_m: "",
    observacoes: "",
    data: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("inventario_parcelas").insert({
      talhao_id: form.talhao_id,
      numero: form.numero.trim(),
      area_m2: Number(form.area_m2),
      qtd_arvores: Number(form.qtd_arvores),
      dap_medio_cm: form.dap_medio_cm ? Number(form.dap_medio_cm) : null,
      altura_media_m: form.altura_media_m ? Number(form.altura_media_m) : null,
      observacoes: form.observacoes || null,
      data: form.data,
      responsavel_id: userRes.user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Parcela registrada");
    onSaved();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Nova parcela de inventário</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Talhão *</Label>
          <Select value={form.talhao_id} onValueChange={(v) => setForm({ ...form, talhao_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{talhoes.map(t => <SelectItem key={t.id} value={t.id}>{t.codigo} — {t.fazendas?.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Nº parcela *</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="P-01" /></div>
        <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Área parcela (m²) *</Label><Input type="number" step="0.01" value={form.area_m2} onChange={(e) => setForm({ ...form, area_m2: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Qtd. árvores *</Label><Input type="number" value={form.qtd_arvores} onChange={(e) => setForm({ ...form, qtd_arvores: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>DAP médio (cm)</Label><Input type="number" step="0.1" value={form.dap_medio_cm} onChange={(e) => setForm({ ...form, dap_medio_cm: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Altura média (m)</Label><Input type="number" step="0.1" value={form.altura_media_m} onChange={(e) => setForm({ ...form, altura_media_m: e.target.value })} /></div>
        <div className="sm:col-span-2 space-y-1.5"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        <div className="sm:col-span-2 rounded-md bg-secondary/50 p-3 text-[11px] text-muted-foreground">
          O sistema calculará automaticamente <strong>árvores/ha</strong> e <strong>volume/árvore</strong> (fórmula: π·(DAP/2)²·H·0,45).
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.numero || !form.qtd_arvores || !form.area_m2}>
          {saving ? "Salvando..." : "Registrar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
