import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TreePine, Truck, Boxes, Package2, Scissors, Factory, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/qr/$tipo/$codigo")({
  ssr: false,
  component: QrLanding,
});

type Info = {
  titulo: string;
  Icone: typeof Truck;
  campos: { label: string; value: string }[];
  papel: string;
};

const LABELS: Record<string, { nome: string; icon: typeof Truck; papel: string; href: string }> = {
  cg: { nome: "Carga em trânsito", icon: Truck, papel: "Motorista / Recepção do pátio", href: "/recebimento" },
  lp: { nome: "Lote no pátio", icon: Boxes, papel: "Operador de pátio / Serraria", href: "/lotes" },
  pa: { nome: "Produto acabado", icon: Package2, papel: "Comercial / Logística", href: "/produtos-acabados" },
  oc: { nome: "Ordem de Colheita", icon: Scissors, papel: "Gestor florestal", href: "/ordens-colheita" },
  op: { nome: "Ordem de Produção", icon: Factory, papel: "Operador de serraria", href: "/ordens-producao" },
};

function QrLanding() {
  const { tipo, codigo } = Route.useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const meta = LABELS[tipo] ?? { nome: "Item rastreado", icon: TreePine, papel: "—", href: "/" };

  useEffect(() => {
    (async () => {
      try {
        let r: Record<string, unknown> | null = null;
        if (tipo === "cg") {
          const { data } = await supabase.from("cargas").select("codigo,placa_veiculo,motorista,volume_carregado_m3,qtd_toras,status,data_saida").eq("codigo", codigo).maybeSingle();
          r = data;
          if (r) setInfo({
            titulo: `Carga ${r.codigo}`, Icone: meta.icon, papel: meta.papel,
            campos: [
              { label: "Status", value: String(r.status ?? "—") },
              { label: "Placa", value: String(r.placa_veiculo ?? "—") },
              { label: "Motorista", value: String(r.motorista ?? "—") },
              { label: "Volume carregado", value: `${Number(r.volume_carregado_m3 ?? 0).toFixed(2)} m³` },
              { label: "Toras", value: String(r.qtd_toras ?? "—") },
              { label: "Data saída", value: r.data_saida ? new Date(String(r.data_saida)).toLocaleString("pt-BR") : "—" },
            ],
          });
        } else if (tipo === "lp") {
          const { data } = await supabase.from("lotes_patio").select("codigo,especie,volume_m3,qtd_toras,status,localizacao").eq("codigo", codigo).maybeSingle();
          r = data;
          if (r) setInfo({
            titulo: `Lote ${r.codigo}`, Icone: meta.icon, papel: meta.papel,
            campos: [
              { label: "Status", value: String(r.status ?? "—") },
              { label: "Espécie", value: String(r.especie ?? "—") },
              { label: "Volume", value: `${Number(r.volume_m3 ?? 0).toFixed(2)} m³` },
              { label: "Toras", value: String(r.qtd_toras ?? "—") },
              { label: "Localização", value: String(r.localizacao ?? "—") },
            ],
          });
        } else if (tipo === "pa") {
          const { data } = await supabase.from("produtos_acabados").select("codigo,descricao,dimensoes,qtd_pecas,volume_m3,status,criado_em").eq("codigo", codigo).maybeSingle();
          r = data;
          if (r) setInfo({
            titulo: `Produto ${r.codigo}`, Icone: meta.icon, papel: meta.papel,
            campos: [
              { label: "Descrição", value: String(r.descricao ?? "—") },
              { label: "Dimensões", value: String(r.dimensoes ?? "—") },
              { label: "Peças", value: String(r.qtd_pecas ?? "—") },
              { label: "Volume", value: `${Number(r.volume_m3 ?? 0).toFixed(2)} m³` },
              { label: "Status", value: String(r.status ?? "—") },
            ],
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [tipo, codigo]);

  const Icon = info?.Icone ?? meta.icon;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <header className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[image:var(--gradient-accent)]">
            <TreePine className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold">Fazenda Bela Vista</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Leitura de QR Code</div>
          </div>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <div className="mb-4 flex items-center gap-3">
            <Icon className="h-6 w-6 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{meta.nome}</div>
              <div className="font-display text-lg font-semibold">{codigo}</div>
            </div>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : info ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {info.campos.map((c) => (
                <div key={c.label} className="rounded-md bg-secondary/40 p-2">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</dt>
                  <dd className="font-medium">{c.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Item não encontrado no sistema, ou você não tem acesso para visualizá-lo.</p>
          )}

          <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
            <div className="font-semibold text-primary">Você é {meta.papel}?</div>
            <p className="mt-1 text-muted-foreground">Acesse o sistema para conferir, mover ou apontar este item.</p>
            <Link to={meta.href} className="mt-2 inline-flex items-center gap-1 text-primary hover:underline">
              Abrir no sistema <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">SilvaCore · Fazenda Bela Vista</p>
      </div>
    </main>
  );
}
