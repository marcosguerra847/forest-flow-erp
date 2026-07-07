import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, CheckCircle2, Loader2, MapPin, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { confirmarEntrega } from "@/lib/entregas.functions";

type Props = { codigo: string; onDone?: () => void };

export function DeliveryConfirmForm({ codigo, onDone }: Props) {
  const [nome, setNome] = useState("");
  const [observacao, setObservacao] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const confirmar = useServerFn(confirmarEntrega);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
  }, []);

  const onPick = (f: File | null) => {
    setFoto(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    if (nome.trim().length < 2) { toast.error("Informe seu nome completo."); return; }
    setSaving(true);
    try {
      let foto_url: string | null = null;
      if (foto) {
        // Upload no caminho público "entregas/<codigo>/..." (policy permite anon insert somente aqui)
        const ext = foto.name.split(".").pop() || "jpg";
        const path = `entregas/${codigo}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("qr-eventos").upload(path, foto, { contentType: foto.type });
        if (up.error) throw up.error;
        const { data: signed } = await supabase.storage.from("qr-eventos").createSignedUrl(path, 60 * 60 * 24 * 365);
        foto_url = signed?.signedUrl ?? null;
      }
      await confirmar({ data: {
        codigo,
        recebedor_nome: nome.trim(),
        foto_url,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        observacao: observacao || null,
      } });
      toast.success("Entrega confirmada. Obrigado!");
      setNome(""); setObservacao(""); onPick(null);
      if (fileRef.current) fileRef.current.value = "";
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao confirmar entrega");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-primary/40 bg-[image:var(--gradient-forest)]/50 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <PackageCheck className="h-4 w-4" /> Confirmar recebimento
      </div>
      <p className="text-xs text-muted-foreground">
        Cliente/recebedor: confirme aqui que recebeu esta carga informando seu nome e (opcional) uma foto da mercadoria.
      </p>

      <div className="space-y-1">
        <Label className="text-xs">Nome de quem recebeu *</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> Foto da entrega (opcional)</Label>
        <Input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        {preview && <img src={preview} alt="prévia" className="mt-2 max-h-40 rounded-md border" />}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Observação (opcional)</Label>
        <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: recebido sem avarias" />
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <MapPin className="h-3 w-3" />
        {coords ? `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "GPS: sem permissão"}
      </div>

      <Button onClick={submit} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirmando…</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar entrega</>}
      </Button>
    </div>
  );
}
