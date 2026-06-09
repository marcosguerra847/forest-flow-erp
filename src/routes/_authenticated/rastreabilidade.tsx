import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Search, ArrowDown, Truck, Boxes, Package2, Scissors, Factory, Trees, MapPinned } from "lucide-react";
import { toast } from "sonner";

type Etapa = { etapa: string; info: string; local?: string; data?: string; icon: typeof Truck };

export const Route = createFileRoute("/_authenticated/rastreabilidade")({
  head: () => ({ meta: [{ title: "Rastreabilidade · Fazenda Bela Vista" }] }),
  component: Rastreabilidade,
});

function Rastreabilidade() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [produto, setProduto] = useState<string | null>(null);
  const [cadeia, setCadeia] = useState<Etapa[]>([]);

  const buscar = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setCadeia([]); setProduto(null);
    try {
      const c = code.trim().toUpperCase();
      const etapas: Etapa[] = [];

      // 1) Produto Acabado
      const { data: pa } = await supabase.from("produtos_acabados")
        .select("codigo,descricao,dimensoes,qtd_pecas,volume_m3,criado_em,ordem_producao_id,ordens_producao(codigo,lote_patio_id,lotes_patio(codigo,carga_id,talhao_id,cargas(codigo,ordem_colheita_id,ordens_colheita(codigo,talhao_id,talhoes(codigo,especie,fazenda_id,fazendas(nome,local))))))")
        .eq("codigo", c).maybeSingle();

      if (pa) {
        setProduto(`${pa.codigo} — ${pa.descricao ?? ""}`);
        etapas.push({ etapa: "Produto acabado", info: `${pa.descricao ?? ""} · ${pa.qtd_pecas} peças · ${Number(pa.volume_m3 ?? 0).toFixed(2)} m³`, data: pa.criado_em?.slice(0,10), icon: Package2 });
        const op = pa.ordens_producao as { codigo?: string; lotes_patio?: { codigo?: string; cargas?: { codigo?: string; ordens_colheita?: { codigo?: string; talhoes?: { codigo?: string; especie?: string; fazendas?: { nome?: string; local?: string } } } } } } | null;
        if (op?.codigo) etapas.push({ etapa: "Ordem de Produção", info: op.codigo, icon: Factory });
        const lp = op?.lotes_patio;
        if (lp?.codigo) etapas.push({ etapa: "Lote no Pátio", info: lp.codigo, icon: Boxes });
        const cg = lp?.cargas;
        if (cg?.codigo) etapas.push({ etapa: "Carga", info: cg.codigo, icon: Truck });
        const oc = cg?.ordens_colheita;
        if (oc?.codigo) etapas.push({ etapa: "Ordem de Colheita", info: oc.codigo, icon: Scissors });
        const t = oc?.talhoes;
        if (t?.codigo) etapas.push({ etapa: "Talhão", info: `${t.codigo} — ${t.especie ?? ""}`, icon: Trees });
        const f = t?.fazendas;
        if (f?.nome) etapas.push({ etapa: "Fazenda de origem", info: f.nome, local: f.local ?? undefined, icon: MapPinned });
        setCadeia(etapas); return;
      }

      // 2) Lote do pátio
      const { data: lote } = await supabase.from("lotes_patio")
        .select("codigo,especie,volume_m3,qtd_toras,localizacao,carga_id,cargas(codigo,ordens_colheita(codigo,talhoes(codigo,especie,fazendas(nome,local))))")
        .eq("codigo", c).maybeSingle();
      if (lote) {
        setProduto(`Lote ${lote.codigo}`);
        etapas.push({ etapa: "Lote no Pátio", info: `${lote.especie ?? ""} · ${Number(lote.volume_m3 ?? 0).toFixed(2)} m³`, local: lote.localizacao ?? undefined, icon: Boxes });
        const cg = lote.cargas as { codigo?: string; ordens_colheita?: { codigo?: string; talhoes?: { codigo?: string; especie?: string; fazendas?: { nome?: string; local?: string } } } } | null;
        if (cg?.codigo) etapas.push({ etapa: "Carga", info: cg.codigo, icon: Truck });
        const t = cg?.ordens_colheita?.talhoes;
        if (t?.codigo) etapas.push({ etapa: "Talhão", info: `${t.codigo} — ${t.especie ?? ""}`, icon: Trees });
        const f = t?.fazendas;
        if (f?.nome) etapas.push({ etapa: "Fazenda", info: f.nome, local: f.local ?? undefined, icon: MapPinned });
        setCadeia(etapas); return;
      }

      // 3) Carga
      const { data: cgRow } = await supabase.from("cargas")
        .select("codigo,placa_veiculo,motorista,volume_carregado_m3,ordens_colheita(codigo,talhoes(codigo,especie,fazendas(nome,local)))")
        .eq("codigo", c).maybeSingle();
      if (cgRow) {
        setProduto(`Carga ${cgRow.codigo}`);
        etapas.push({ etapa: "Carga", info: `${cgRow.placa_veiculo ?? ""} · ${Number(cgRow.volume_carregado_m3 ?? 0).toFixed(2)} m³`, icon: Truck });
        const oc = cgRow.ordens_colheita as { codigo?: string; talhoes?: { codigo?: string; especie?: string; fazendas?: { nome?: string; local?: string } } } | null;
        if (oc?.codigo) etapas.push({ etapa: "Ordem de Colheita", info: oc.codigo, icon: Scissors });
        const t = oc?.talhoes;
        if (t?.codigo) etapas.push({ etapa: "Talhão", info: `${t.codigo} — ${t.especie ?? ""}`, icon: Trees });
        const f = t?.fazendas;
        if (f?.nome) etapas.push({ etapa: "Fazenda", info: f.nome, local: f.local ?? undefined, icon: MapPinned });
        setCadeia(etapas); return;
      }

      toast.error("Código não encontrado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Diferencial"
        title="Rastreabilidade da madeira"
        description="Do produto acabado até a fazenda de origem. Informe o código (PA, CG, LP) ou escaneie o QR."
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-elegant)] sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
            className="border-0 bg-transparent p-0 focus-visible:ring-0"
            placeholder="Ex.: PA-2026-0001, LP-2026-0003, CG-2026-0007"
          />
        </div>
        <Button onClick={buscar} disabled={loading}>
          <QrCode className="mr-2 h-4 w-4" /> {loading ? "Buscando..." : "Rastrear"}
        </Button>
      </div>

      {produto && (
        <div className="rounded-xl border border-primary/30 bg-[image:var(--gradient-forest)] p-6 shadow-[var(--shadow-glow)]">
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary/80">Item rastreado</div>
          <div className="mt-1 font-display text-2xl font-semibold text-foreground">{produto}</div>
          <p className="mt-1 text-sm text-muted-foreground">Cadeia de custódia completa, do produto à fazenda de origem.</p>
        </div>
      )}

      {cadeia.length > 0 && (
        <div className="relative space-y-4">
          {cadeia.map((etapa, i) => {
            const Icon = etapa.icon;
            return (
              <div key={i} className="relative">
                <div className="flex gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-elegant)] transition-colors hover:border-primary/40">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium uppercase tracking-widest text-primary/80">{etapa.etapa}</div>
                    <div className="mt-0.5 text-base font-medium text-foreground">{etapa.info}</div>
                    {(etapa.local || etapa.data) && (
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {etapa.local && <span>📍 {etapa.local}</span>}
                        {etapa.data && <span>🗓 {etapa.data}</span>}
                      </div>
                    )}
                  </div>
                </div>
                {i < cadeia.length - 1 && (
                  <div className="my-1 flex justify-center"><ArrowDown className="h-4 w-4 text-primary/60" /></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!produto && !loading && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Digite um código de produto, lote ou carga para ver a cadeia completa.
          <div className="mt-4">
            <Link to="/produtos-acabados" className="text-primary hover:underline">Ver produtos acabados</Link>
          </div>
        </div>
      )}
    </div>
  );
}
