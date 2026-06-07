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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardCheck, ScanLine, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { proximoCodigo } from "@/lib/codigo";

type Carga = {
  id: string; codigo: string; placa_veiculo: string | null; motorista: string | null;
  volume_carregado_m3: number; qtd_toras: number; status: string; ordem_colheita_id: string;
};
type Recebimento = {
  id: string; carga_id: string; volume_recebido_m3: number; qtd_toras_recebida: number;
  divergencia_volume_m3: number; divergencia_toras: number; data: string; observacoes: string | null;
};

export const Route = createFileRoute("/_authenticated/recebimento")({ component: RecebimentoPage });

function RecebimentoPage() {
  const qc = useQueryClient();
  const [codigoInput, setCodigoInput] = useState("");
  const [scanning, setScanning] = useState<Carga | null>(null);

  const { data: emTransito = [] } = useQuery({
    queryKey: ["cargas-em-transito"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cargas").select("*").eq("status", "em_transito").order("data_saida");
      if (error) throw error;
      return data as Carga[];
    },
  });
  const { data: recebimentos = [] } = useQuery({
    queryKey: ["recebimentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recebimentos_patio").select("*").order("data", { ascending: false }).limit(50);
      if (error) throw error;
      return data as Recebimento[];
    },
  });

  const buscar = async () => {
    const raw = codigoInput.trim();
    const codigo = raw.startsWith("CG:") ? raw.slice(3) : raw;
    if (!codigo) return;
    const { data, error } = await supabase.from("cargas").select("*").eq("codigo", codigo).maybeSingle();
    if (error || !data) return toast.error("Carga não encontrada");
    if (data.status !== "em_transito") return toast.error(`Carga já está como "${data.status}"`);
    setScanning(data as Carga);
    setCodigoInput("");
  };

  const divergentesAbertas = recebimentos.filter(r => Math.abs(Number(r.divergencia_volume_m3)) > 0.05 || r.divergencia_toras !== 0).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pátio"
        title="Recebimento de cargas"
        description="Bipe o QR Code da carga (ou digite o código) e confira volume e quantidade. Divergências geram alertas automáticos."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Em trânsito" value={emTransito.length} icon={ScanLine} tone="warning" />
        <KpiCard label="Conferidas (recentes)" value={recebimentos.length} icon={CheckCircle2} tone="success" />
        <KpiCard label="Com divergência" value={divergentesAbertas} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Pátio" value="OK" icon={ClipboardCheck} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2"><ScanLine className="h-4 w-4" /> Conferir carga</h3>
        <div className="mt-3 flex gap-2">
          <Input value={codigoInput} onChange={(e) => setCodigoInput(e.target.value)} placeholder="Cole o código do QR ou digite (ex.: CG-2026-0001)" onKeyDown={(e) => e.key === "Enter" && buscar()} />
          <Button onClick={buscar}>Buscar</Button>
        </div>
        {emTransito.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Cargas aguardando recebimento:</p>
            <div className="flex flex-wrap gap-2">
              {emTransito.map(c => (
                <button key={c.id} onClick={() => setScanning(c)} className="rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-mono hover:bg-secondary">
                  {c.codigo} · {c.placa_veiculo ?? "s/placa"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display text-sm font-semibold mb-3">Histórico recente</h3>
        <DataTable
          rows={recebimentos}
          columns={[
            { key: "data", label: "Data", render: (r) => new Date(r.data).toLocaleString("pt-BR") },
            { key: "carga_id", label: "Carga", render: (r) => <span className="font-mono text-xs">{r.carga_id.slice(0, 8)}…</span> },
            { key: "volume_recebido_m3", label: "Vol. recebido", align: "right", render: (r) => Number(r.volume_recebido_m3).toFixed(1) },
            { key: "qtd_toras_recebida", label: "Toras", align: "right" },
            { key: "divergencia_volume_m3", label: "Δ Vol", align: "right", render: (r) => <span className={Math.abs(Number(r.divergencia_volume_m3)) > 0.05 ? "text-destructive font-semibold" : ""}>{Number(r.divergencia_volume_m3).toFixed(2)}</span> },
            { key: "divergencia_toras", label: "Δ Toras", align: "right", render: (r) => <span className={r.divergencia_toras !== 0 ? "text-destructive font-semibold" : ""}>{r.divergencia_toras}</span> },
            { key: "status", label: "", render: (r) => Math.abs(Number(r.divergencia_volume_m3)) > 0.05 || r.divergencia_toras !== 0
                ? <StatusBadge tone="danger">divergente</StatusBadge>
                : <StatusBadge tone="success">ok</StatusBadge> },
          ]}
        />
      </div>

      {scanning && (
        <ConferenciaDialog
          carga={scanning}
          onClose={() => setScanning(null)}
          onDone={() => {
            setScanning(null);
            qc.invalidateQueries({ queryKey: ["cargas-em-transito"] });
            qc.invalidateQueries({ queryKey: ["recebimentos"] });
            qc.invalidateQueries({ queryKey: ["lotes"] });
            qc.invalidateQueries({ queryKey: ["divergencias"] });
          }}
        />
      )}
    </div>
  );
}

function ConferenciaDialog({ carga, onClose, onDone }: { carga: Carga; onClose: () => void; onDone: () => void }) {
  const [volume, setVolume] = useState(String(carga.volume_carregado_m3));
  const [toras, setToras] = useState(String(carga.qtd_toras));
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const conferir = useMutation({
    mutationFn: async () => {
      const v = Number(volume) || 0;
      const t = Number(toras) || 0;
      const { error } = await supabase.from("recebimentos_patio").insert({
        carga_id: carga.id,
        volume_recebido_m3: v,
        qtd_toras_recebida: t,
        observacoes: obs || null,
      });
      if (error) throw error;
      // Se sem divergência, gera lote no pátio
      const divVol = v - Number(carga.volume_carregado_m3);
      const divToras = t - Number(carga.qtd_toras);
      if (Math.abs(divVol) <= 0.05 && divToras === 0) {
        const lote = await proximoCodigo("LP");
        const { data: oc } = await supabase.from("ordens_colheita").select("talhao_id").eq("id", carga.ordem_colheita_id).single();
        const { data: talhao } = oc ? await supabase.from("talhoes").select("especie").eq("id", oc.talhao_id).single() : { data: null };
        await supabase.from("lotes_patio").insert({
          codigo: lote, carga_id: carga.id, talhao_id: oc?.talhao_id,
          volume_m3: v, qtd_toras: t, especie: talhao?.especie ?? null, status: "disponivel",
        });
        await supabase.from("movimentacoes").insert({ tipo: "entrada", volume_m3: v, origem: carga.codigo, destino: lote, observacoes: "Recebimento conferido" });
      }
    },
    onSuccess: () => { toast.success("Conferência registrada"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setSaving(false),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Conferir carga {carga.codigo}</DialogTitle></DialogHeader>
        <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs space-y-1">
          <div><span className="text-muted-foreground">Placa:</span> {carga.placa_veiculo ?? "—"} · <span className="text-muted-foreground">Motorista:</span> {carga.motorista ?? "—"}</div>
          <div><span className="text-muted-foreground">Declarado:</span> {Number(carga.volume_carregado_m3).toFixed(1)} m³ · {carga.qtd_toras} toras</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Volume aferido (m³)</Label><Input type="number" step="0.01" value={volume} onChange={(e) => setVolume(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Qtd. toras contadas</Label><Input type="number" value={toras} onChange={(e) => setToras(e.target.value)} /></div>
          <div className="sm:col-span-2 space-y-1.5"><Label>Observações</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Se houver divergência, descreva o motivo aqui" /></div>
        </div>
        <div className="rounded-md bg-warning/10 border border-warning/30 p-2 text-xs">
          Diferença: <strong>{(Number(volume) - Number(carga.volume_carregado_m3)).toFixed(2)} m³</strong> · <strong>{Number(toras) - carga.qtd_toras} toras</strong>. Divergências abrem alerta automaticamente.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { setSaving(true); conferir.mutate(); }} disabled={saving}>{saving ? "Conferindo..." : "Confirmar recebimento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
