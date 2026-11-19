import { farmPageHead } from "@/lib/page-head";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Boxes, MoveRight, QrCode, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { QrDisplay } from "@/components/QrDisplay";
import { calcM3Cilindrico } from "@/lib/volume-cilindrico";
import { resumirTorasTalhao } from "@/lib/toras-talhao";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { proximoCodigo } from "@/lib/codigo";

type Talhao = { id: string; codigo: string; fazendas: { nome: string } | null };
const nomeTalhao = (t: Talhao) => `${t.codigo} · ${t.fazendas?.nome ?? ""}`;

type Lote = {
  id: string; codigo: string; volume_m3: number; qtd_toras: number;
  especie: string | null; localizacao: string | null;
  talhao_id: string | null; diametro_cm: number | null; comprimento_m: number | null;
  status: "disponivel" | "em_producao" | "consumido"; carga_id: string | null;
};

export const Route = createFileRoute("/_authenticated/lotes")({
  head: () => farmPageHead("Lotes do Pátio", "Organização dos lotes de madeira no pátio."),
  component: LotesPage });

function LotesPage() {
  const qc = useQueryClient();
  const [moving, setMoving] = useState<Lote | null>(null);
  const [showQr, setShowQr] = useState<Lote | null>(null);
  const [novo, setNovo] = useState(false);
  const [filtroTalhao, setFiltroTalhao] = useState("todos");
  const { data: talhoes = [] } = useQuery({ queryKey: ["talhoes-origem-toras"], queryFn: async () => {
    const { data, error } = await supabase.from("talhoes").select("id,codigo,fazendas(nome)").order("codigo");
    if (error) throw error;
    return data as Talhao[];
  } });

  const { data: lotes = [], isLoading } = useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lotes_patio").select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return data as Lote[];
    },
  });

  const filtrados = lotes.filter(l => filtroTalhao === "todos" || l.talhao_id === (filtroTalhao === "sem" ? null : filtroTalhao));
  const disp = filtrados.filter(l => l.status === "disponivel");
  const volDisp = disp.reduce((s, l) => s + Number(l.volume_m3 || 0), 0);
  const torasDisp = disp.reduce((s, l) => s + l.qtd_toras, 0);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Pátio" title="Estoque de toras" description="Lotes recebidos sem divergência. Cada lote tem QR próprio para entrar na serraria." actions={
        <Dialog open={novo} onOpenChange={setNovo}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Novo lote</Button></DialogTrigger>
          <NovoLoteForm talhoes={talhoes} onSaved={() => { setNovo(false); qc.invalidateQueries({ queryKey: ["lotes"] }); }} />
        </Dialog>
      } />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Lotes" value={filtrados.length} icon={Boxes} />
        <KpiCard label="Disponíveis" value={disp.length} icon={Boxes} tone="success" />
        <KpiCard label="Volume disponível (m³)" value={volDisp.toFixed(1)} icon={Boxes} />
        <KpiCard label="Toras disponíveis" value={torasDisp} icon={Boxes} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="lotes-talhao">Talhão de origem</Label>
        <Select value={filtroTalhao} onValueChange={setFiltroTalhao}>
          <SelectTrigger id="lotes-talhao" className="w-full sm:w-72"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos os talhões</SelectItem><SelectItem value="sem">Sem talhão informado</SelectItem>{talhoes.map(t => <SelectItem key={t.id} value={t.id}>{nomeTalhao(t)}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <section className="space-y-3">
        <h2 className="font-semibold">Volume recebido por talhão — acumulado</h2>
        <DataTable rows={talhoes.filter(t => filtroTalhao === "todos" || filtroTalhao === t.id).map(t => ({ ...t, ...resumirTorasTalhao(lotes.map(l => ({ ...l, quantidade: l.qtd_toras })), t.id) }))} columns={[
          { key: "codigo", label: "Talhão", render: t => nomeTalhao(t) },
          { key: "quantidade", label: "Toras recebidas", align: "right" },
          { key: "volume_m3", label: "Total recebido (m³)", align: "right", render: t => t.volume_m3.toFixed(3) },
        ]} />
      </section>
      {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : lotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Nenhum lote ainda. Lotes são criados automaticamente quando uma carga é recebida sem divergência.
        </div>
      ) : (
        <DataTable
          rows={filtrados}
          columns={[
            { key: "codigo", label: "Lote", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
            { key: "especie", label: "Espécie" },
            { key: "talhao_id", label: "Talhão", render: r => { const t = talhoes.find(t => t.id === r.talhao_id); return t ? nomeTalhao(t) : "—"; } },
            { key: "diametro_cm", label: "Ø médio (cm)", render: r => r.diametro_cm ?? "—" },
            { key: "comprimento_m", label: "Comprimento (m)", render: r => r.comprimento_m ?? "—" },
            { key: "volume_m3", label: "Vol (m³)", align: "right", render: (r) => Number(r.volume_m3).toFixed(1) },
            { key: "qtd_toras", label: "Toras", align: "right" },
            { key: "localizacao", label: "Localização", render: (r) => r.localizacao ?? <span className="text-muted-foreground">—</span> },
            { key: "status", label: "Status", render: (r) => (
              <StatusBadge tone={r.status === "disponivel" ? "success" : r.status === "em_producao" ? "warning" : "default"}>{r.status.replace("_", " ")}</StatusBadge>
            ) },
            { key: "acoes", label: "", render: (r) => (
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => setShowQr(r)}><QrCode className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setMoving(r)}><MoveRight className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={async () => {
                  if (!confirm(`Excluir lote ${r.codigo}?`)) return;
                  const { error } = await supabase.from("lotes_patio").delete().eq("id", r.id);
                  if (error) toast.error(error.message); else { toast.success("Lote excluído"); qc.invalidateQueries({ queryKey: ["lotes"] }); }
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ) },
          ]}
        />
      )}

      {moving && <MoverLote lote={moving} onClose={() => setMoving(null)} onDone={() => { setMoving(null); qc.invalidateQueries({ queryKey: ["lotes"] }); }} />}

      <Dialog open={!!showQr} onOpenChange={(o) => !o && setShowQr(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>QR do lote {showQr?.codigo}</DialogTitle></DialogHeader>
          <div className="flex justify-center py-4">{showQr && <QrDisplay tipo="lp" codigo={showQr.codigo} size={220} label={`${showQr.especie ?? ""} · ${Number(showQr.volume_m3).toFixed(1)} m³ · ${showQr.qtd_toras} toras`} />}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MoverLote({ lote, onClose, onDone }: { lote: Lote; onClose: () => void; onDone: () => void }) {
  const [destino, setDestino] = useState(lote.localizacao ?? "");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("lotes_patio").update({ localizacao: destino }).eq("id", lote.id);
      if (error) throw error;
      await supabase.from("movimentacoes").insert({ lote_patio_id: lote.id, tipo: "transferencia", volume_m3: lote.volume_m3, origem: lote.localizacao, destino, observacoes: obs || null });
      toast.success("Lote movido");
      onDone();
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Mover lote {lote.codigo}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5"><Label>Nova localização</Label><Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex.: Box 3 · Fileira A" /></div>
          <div className="space-y-1.5"><Label>Observações</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={saving}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoLoteForm({ onSaved, talhoes }: { onSaved: () => void; talhoes: Talhao[] }) {
  const [form, setForm] = useState({ especie: "Eucalipto", diametro_cm: "", comprimento_m: "", qtd_toras: "", localizacao: "", talhao_id: "sem" });
  const [saving, setSaving] = useState(false);
  const volume = calcM3Cilindrico(Number(form.comprimento_m), Number(form.diametro_cm) / 100, Number(form.qtd_toras));
  const save = async () => {
    if (Number(form.diametro_cm) <= 0 || Number(form.comprimento_m) <= 0 || !Number.isInteger(Number(form.qtd_toras)) || Number(form.qtd_toras) <= 0) return toast.error("Informe diâmetro, comprimento e quantidade inteira positiva de toras");
    setSaving(true);
    try {
      const codigo = await proximoCodigo("LP");
      const { error } = await supabase.from("lotes_patio").insert({
        codigo, especie: form.especie || null,
        volume_m3: volume, qtd_toras: Number(form.qtd_toras),
        diametro_cm: Number(form.diametro_cm), comprimento_m: Number(form.comprimento_m),
        talhao_id: form.talhao_id === "sem" ? null : form.talhao_id,
        localizacao: form.localizacao || null, status: "disponivel",
      });
      if (error) throw error;
      toast.success(`Lote ${codigo} criado`);
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo lote de toras</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label>Espécie</Label><Input value={form.especie} onChange={(e) => setForm({ ...form, especie: e.target.value })} placeholder="Ex.: Eucalipto" /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="novo-lote-talhao">Talhão de origem</Label><Select value={form.talhao_id} onValueChange={v => setForm({ ...form, talhao_id: v })}><SelectTrigger id="novo-lote-talhao"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sem">Sem talhão informado</SelectItem>{talhoes.map(t => <SelectItem key={t.id} value={t.id}>{nomeTalhao(t)}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="lote-diametro">Diâmetro médio (cm) *</Label><Input id="lote-diametro" type="number" min="0.1" step="any" value={form.diametro_cm} onChange={e => setForm({ ...form, diametro_cm: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="lote-comprimento">Comprimento (m) *</Label><Input id="lote-comprimento" type="number" min="0.01" step="any" value={form.comprimento_m} onChange={e => setForm({ ...form, comprimento_m: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="lote-quantidade">Qtd. toras *</Label><Input id="lote-quantidade" type="number" value={form.qtd_toras} onChange={(e) => setForm({ ...form, qtd_toras: e.target.value })} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Localização</Label><Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Box 1 · Fileira A" /></div>
      </div>
      <div className="bg-muted rounded-md p-3 text-sm">Volume calculado: <strong>{volume.toFixed(3)} m³</strong> · Média por tora: <strong>{(Number(form.qtd_toras) > 0 ? volume / Number(form.qtd_toras) : 0).toFixed(4)} m³</strong></div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar lote"}</Button></DialogFooter>
    </DialogContent>
  );
}
