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
import { Truck, Plus, QrCode, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { proximoCodigo } from "@/lib/codigo";
import { QrDisplay } from "@/components/QrDisplay";

type Carga = {
  id: string; codigo: string; ordem_colheita_id: string;
  placa_veiculo: string | null; motorista: string | null;
  volume_carregado_m3: number; qtd_toras: number;
  gps_origem: string | null; data_saida: string; data_recebimento: string | null;
  status: "em_transito" | "recebida" | "divergente" | "cancelada";
};
type OC = { id: string; codigo: string };

export const Route = createFileRoute("/_authenticated/cargas")({ component: CargasPage });

function CargasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showQr, setShowQr] = useState<Carga | null>(null);

  const { data: cargas = [], isLoading } = useQuery({
    queryKey: ["cargas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cargas").select("*").order("data_saida", { ascending: false });
      if (error) throw error;
      return data as Carga[];
    },
  });
  const { data: ocs = [] } = useQuery({
    queryKey: ["ocs-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ordens_colheita").select("id,codigo,status").in("status", ["aberta", "em_execucao"]).order("codigo");
      if (error) throw error;
      return data as OC[];
    },
  });

  const emTransito = cargas.filter(c => c.status === "em_transito").length;
  const divergentes = cargas.filter(c => c.status === "divergente").length;
  const volTotal = cargas.reduce((s, c) => s + Number(c.volume_carregado_m3 || 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operação Antifurto"
        title="Cargas em trânsito"
        description="Cada caminhão sai da fazenda com QR Code único. Compare no pátio com Recebimento."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova carga</Button></DialogTrigger>
            <CargaForm ocs={ocs} onSaved={(c) => { setOpen(false); qc.invalidateQueries({ queryKey: ["cargas"] }); setShowQr(c); }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total" value={cargas.length} icon={Truck} />
        <KpiCard label="Em trânsito" value={emTransito} icon={Truck} tone="warning" />
        <KpiCard label="Divergentes" value={divergentes} icon={Truck} tone="danger" />
        <KpiCard label="Volume total (m³)" value={volTotal.toFixed(1)} icon={Truck} />
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : (
        <DataTable
          rows={cargas}
          columns={[
            { key: "codigo", label: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
            { key: "ordem_colheita_id", label: "OC", render: (r) => ocs.find(o => o.id === r.ordem_colheita_id)?.codigo ?? "—" },
            { key: "placa_veiculo", label: "Placa" },
            { key: "motorista", label: "Motorista" },
            { key: "volume_carregado_m3", label: "Vol (m³)", align: "right", render: (r) => Number(r.volume_carregado_m3).toFixed(1) },
            { key: "qtd_toras", label: "Toras", align: "right" },
            { key: "data_saida", label: "Saída", render: (r) => new Date(r.data_saida).toLocaleString("pt-BR") },
            { key: "status", label: "Status", render: (r) => (
              <StatusBadge tone={r.status === "recebida" ? "success" : r.status === "divergente" ? "danger" : r.status === "cancelada" ? "default" : "warning"}>
                {r.status.replace("_", " ")}
              </StatusBadge>
            ) },
            { key: "qr", label: "", render: (r) => (
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => setShowQr(r)}><QrCode className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={async () => {
                  if (!confirm(`Excluir carga ${r.codigo}?`)) return;
                  const { error } = await supabase.from("cargas").delete().eq("id", r.id);
                  if (error) toast.error(error.message); else { toast.success("Carga excluída"); qc.invalidateQueries({ queryKey: ["cargas"] }); }
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ) },
          ]}
        />
      )}

      <Dialog open={!!showQr} onOpenChange={(o) => !o && setShowQr(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>QR da carga {showQr?.codigo}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4">
            {showQr && <QrDisplay tipo="cg" codigo={showQr.codigo} size={220} label={`Carga · ${showQr.placa_veiculo ?? ""} · ${Number(showQr.volume_carregado_m3).toFixed(1)} m³`} />}
            <p className="text-center text-xs text-muted-foreground max-w-xs">
              Apresente este QR Code na portaria do pátio para conferência. Ele identifica a carga, placa e volume declarado.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CargaForm({ ocs, onSaved }: { ocs: OC[]; onSaved: (c: Carga) => void }) {
  const [form, setForm] = useState({ ordem_colheita_id: "", placa_veiculo: "", motorista: "", volume_carregado_m3: "", qtd_toras: "", observacoes: "" });
  const [gps, setGps] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const captureGps = () => {
    if (!navigator.geolocation) return toast.error("GPS indisponível");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`); toast.success("GPS capturado"); },
      (e) => toast.error(e.message),
    );
  };

  const save = async () => {
    if (!form.ordem_colheita_id) return toast.error("Selecione uma OC");
    setSaving(true);
    try {
      const codigo = await proximoCodigo("CG");
      const { data, error } = await supabase.from("cargas").insert({
        codigo, ordem_colheita_id: form.ordem_colheita_id,
        placa_veiculo: form.placa_veiculo || null,
        motorista: form.motorista || null,
        volume_carregado_m3: Number(form.volume_carregado_m3) || 0,
        qtd_toras: Number(form.qtd_toras) || 0,
        gps_origem: gps,
        observacoes: form.observacoes || null,
      }).select().single();
      if (error) throw error;
      toast.success(`Carga ${codigo} criada`);
      onSaved(data as Carga);
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Nova carga</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Ordem de Colheita *</Label>
          <Select value={form.ordem_colheita_id} onValueChange={(v) => setForm({ ...form, ordem_colheita_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione a OC" /></SelectTrigger>
            <SelectContent>{ocs.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Placa</Label><Input value={form.placa_veiculo} onChange={(e) => setForm({ ...form, placa_veiculo: e.target.value.toUpperCase() })} /></div>
        <div className="space-y-1.5"><Label>Motorista</Label><Input value={form.motorista} onChange={(e) => setForm({ ...form, motorista: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Volume (m³)</Label><Input type="number" step="0.01" value={form.volume_carregado_m3} onChange={(e) => setForm({ ...form, volume_carregado_m3: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Qtd. toras</Label><Input type="number" value={form.qtd_toras} onChange={(e) => setForm({ ...form, qtd_toras: e.target.value })} /></div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>GPS de origem</Label>
          <div className="flex gap-2">
            <Input value={gps ?? ""} placeholder="lat,lng" readOnly />
            <Button type="button" variant="outline" onClick={captureGps}><MapPin className="mr-1 h-4 w-4" /> Capturar</Button>
          </div>
        </div>
        <div className="sm:col-span-2 space-y-1.5"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar carga + QR"}</Button></DialogFooter>
    </DialogContent>
  );
}
