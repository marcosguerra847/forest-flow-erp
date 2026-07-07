import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, MapPin, Loader2, CheckCircle2, WifiOff, CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { ETAPAS, tipoFromCodigo } from "@/lib/etapas";
import { countPendentes, enqueueEvento, flushPendentes, initSync } from "@/lib/offline-queue";

type Props = {
  codigo: string;
  onCreated?: () => void;
};

export function EventoQrForm({ codigo, onCreated }: Props) {
  const [etapa, setEtapa] = useState<string>("outro");
  const [observacao, setObservacao] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [pendentes, setPendentes] = useState(0);
  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      const { data: p } = await supabase.from("profiles").select("nome,email").eq("id", u.id).maybeSingle();
      setUserName(p?.nome ?? p?.email ?? u.email ?? "");
    });
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
    initSync((c) => setPendentes(c));
    countPendentes().then(setPendentes);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const onPickFile = (f: File | null) => {
    setFoto(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    if (!userId) { toast.error("Faça login para registrar eventos."); return; }
    setSaving(true);
    try {
      let foto_url: string | null = null;
      if (foto) {
        const ext = foto.name.split(".").pop() || "jpg";
        const path = `${codigo}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("qr-eventos").upload(path, foto, { contentType: foto.type });
        if (up.error) throw up.error;
        const { data: signed } = await supabase.storage.from("qr-eventos").createSignedUrl(path, 60 * 60 * 24 * 365);
        foto_url = signed?.signedUrl ?? null;
      }
      const etapaLabel = ETAPAS.find((e) => e.key === etapa)?.label ?? etapa;
      const { error } = await supabase.from("eventos_qr" as never).insert({
        codigo,
        tipo: tipoFromCodigo(codigo),
        etapa,
        descricao: etapaLabel,
        observacao: observacao || null,
        usuario_id: userId,
        usuario_nome: userName || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        foto_url,
      } as never);
      if (error) throw error;
      toast.success("Etapa registrada");
      setObservacao("");
      onPickFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onCreated?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Faça login no sistema para registrar uma nova etapa neste QR Code.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CheckCircle2 className="h-4 w-4 text-primary" /> Avançar etapa
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Nova etapa</Label>
        <Select value={etapa} onValueChange={setEtapa}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ETAPAS.map((e) => (
              <SelectItem key={e.key} value={e.key}>{e.grupo} · {e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Observação</Label>
        <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> Foto (opcional)</Label>
        <Input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
        {preview && <img src={preview} alt="prévia" className="mt-2 max-h-40 rounded-md border" />}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {coords ? `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "GPS: (sem permissão ou indisponível)"}
      </div>

      <Button onClick={submit} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</> : "Registrar etapa"}
      </Button>
    </div>
  );
}
