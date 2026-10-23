import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TreePine, PackageCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { obterPacote, expedirPacote } from "@/lib/expedicao.functions";
import { RomaneioPublico } from "@/components/RomaneioPublico";
import type { PacoteNota } from "@/lib/nota-expedicao";

export const Route = createFileRoute("/x/$codigo")({
  ssr: false,
  validateSearch: z.object({ t: z.string().optional() }),
  head: ({ params }) => ({
    meta: [
      { title: `Romaneio ${params.codigo} · Fazenda Bela Vista` },
      { name: "description", content: "Nota de carga com produtos, medidas, quantidades e valores da Fazenda Bela Vista." },
      { property: "og:title", content: `Romaneio ${params.codigo} · Fazenda Bela Vista` },
      { property: "og:description", content: "Visualização da nota de carga e conferência de expedição." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExpedicaoPublica,
});

type P = PacoteNota;

function ExpedicaoPublica() {
  const { codigo } = Route.useParams();
  const { t = "" } = Route.useSearch();
  const obter = useServerFn(obterPacote);
  const expedir = useServerFn(expedirPacote);
  const [p, setP] = useState<P | null>(null);
  const [erro, setErro] = useState(false);
  const [f, setF] = useState({ operador_nome: "", qtd_blocos: "", qtd_pecas: "", volume_m3: "", observacao: "" });
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const r = await obter({ data: { codigo, token: t } });
      if (!r.ok) return setErro(true);
      setP(r.pacote);
      setF((s) => ({ ...s,
        qtd_blocos: s.qtd_blocos || String(r.pacote.qtd_blocos ?? ""),
        qtd_pecas: s.qtd_pecas || String(r.pacote.qtd_pecas ?? ""),
        volume_m3: s.volume_m3 || String(r.pacote.volume_m3 ?? "") }));
    } catch { setErro(true); }
  };
  useEffect(() => {
    void load();
    setF((s) => ({ ...s, operador_nome: localStorage.getItem("operador_nome") ?? "" }));
    navigator.geolocation?.getCurrentPosition((pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, t]);

  const enviar = async () => {
    setMsg("");
    if (f.operador_nome.trim().length < 2) return setMsg("Informe seu nome.");
    setSaving(true);
    try {
      localStorage.setItem("operador_nome", f.operador_nome.trim());
      await expedir({ data: { codigo, token: t, operador_nome: f.operador_nome.trim(),
        qtd_blocos: Number(f.qtd_blocos) || 0, qtd_pecas: Number(f.qtd_pecas) || 0,
        volume_m3: Number(String(f.volume_m3).replace(",", ".")) || 0,
        observacao: f.observacao || null, latitude: gps?.lat ?? null, longitude: gps?.lng ?? null } });
      await load();
    } catch (e) { setMsg((e as Error).message); }
    setSaving(false);
  };

  const linha = (l: string, v: unknown) => (
    <div className="rounded-md bg-secondary/40 p-2">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</dt>
      <dd className="font-medium">{v == null || v === "" ? "—" : String(v)}</dd>
    </div>
  );

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[image:var(--gradient-accent)]">
            <TreePine className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold">Fazenda Bela Vista</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Expedição · Pátio</div>
          </div>
        </header>

        {erro ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">QR inválido ou pacote não encontrado.</p>
        ) : !p ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
          <>
            <RomaneioPublico pacote={p} link={`https://sistemafazendabelavista.lovable.app/x/${encodeURIComponent(codigo)}?t=${encodeURIComponent(t)}`} />

            {p.status === "pronto" ? (
              <section className="space-y-3 rounded-2xl border border-primary/40 bg-card p-5">
                <div className="flex items-center gap-2 font-medium"><PackageCheck className="h-5 w-5 text-primary" /> Dar baixa de saída</div>
                <div className="space-y-1.5"><Label>Seu nome</Label><Input value={f.operador_nome} onChange={(e) => setF({ ...f, operador_nome: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5"><Label>Blocos</Label><Input inputMode="numeric" value={f.qtd_blocos} onChange={(e) => setF({ ...f, qtd_blocos: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Peças</Label><Input inputMode="numeric" value={f.qtd_pecas} onChange={(e) => setF({ ...f, qtd_pecas: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>m³</Label><Input inputMode="decimal" value={f.volume_m3} onChange={(e) => setF({ ...f, volume_m3: e.target.value })} /></div>
                </div>
                <div className="space-y-1.5"><Label>Observação</Label><Textarea value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} /></div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{gps ? "Localização capturada" : "Sem localização"}</div>
                {msg && <p className="text-sm text-destructive">{msg}</p>}
                <Button className="h-12 w-full text-base" onClick={enviar} disabled={saving}>{saving ? "Enviando…" : "Confirmar saída para o cliente"}</Button>
              </section>
            ) : (
              <section className="rounded-2xl border border-border bg-card p-5 text-sm">
                <div className="font-medium text-primary">Saída registrada ✓</div>
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  {linha("Operador", p.operador_nome)}
                  {linha("Data", p.expedido_em ? new Date(String(p.expedido_em)).toLocaleString("pt-BR") : "—")}
                  {linha("Blocos enviados", p.qtd_blocos_expedida)}
                  {linha("Peças enviadas", p.qtd_pecas_expedida)}
                  {linha("Volume enviado", `${Number(p.volume_expedido_m3 ?? 0).toFixed(2)} m³`)}
                </dl>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
