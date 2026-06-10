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
import { proximoCodigo } from "@/lib/codigo";

type Lote = {
  id: string; codigo: string; volume_m3: number; qtd_toras: number;
  especie: string | null; localizacao: string | null;
  status: "disponivel" | "em_producao" | "consumido"; carga_id: string | null;
};

export const Route = createFileRoute("/_authenticated/lotes")({ component: LotesPage });

function LotesPage() {
  const qc = useQueryClient();
  const [moving, setMoving] = useState<Lote | null>(null);
  const [showQr, setShowQr] = useState<Lote | null>(null);
  const [novo, setNovo] = useState(false);

  const { data: lotes = [], isLoading } = useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lotes_patio").select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return data as Lote[];
    },
  });

  const disp = lotes.filter(l => l.status === "disponivel");
  const volDisp = disp.reduce((s, l) => s + Number(l.volume_m3 || 0), 0);
  const torasDisp = disp.reduce((s, l) => s + l.qtd_toras, 0);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Pátio" title="Estoque de toras" description="Lotes recebidos sem divergência. Cada lote tem QR próprio para entrar na serraria." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Lotes" value={lotes.length} icon={Boxes} />
        <KpiCard label="Disponíveis" value={disp.length} icon={Boxes} tone="success" />
        <KpiCard label="Volume disponível (m³)" value={volDisp.toFixed(1)} icon={Boxes} />
        <KpiCard label="Toras disponíveis" value={torasDisp} icon={Boxes} />
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : lotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Nenhum lote ainda. Lotes são criados automaticamente quando uma carga é recebida sem divergência.
        </div>
      ) : (
        <DataTable
          rows={lotes}
          columns={[
            { key: "codigo", label: "Lote", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
            { key: "especie", label: "Espécie" },
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
