import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TreePine, MapPin, Camera, Clock, User, ExternalLink, ChevronRight } from "lucide-react";
import { EventoQrForm } from "@/components/EventoQrForm";
import { DeliveryConfirmForm } from "@/components/DeliveryConfirmForm";
import { tipoFromCodigo, ETAPAS } from "@/lib/etapas";

export const Route = createFileRoute("/r/$codigo")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `${params.codigo} · Rastreabilidade · Fazenda Bela Vista` },
      { name: "description", content: `Consulta pública do QR Code ${params.codigo} — histórico e etapas.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicQrPage,
});

type Evento = {
  id: string;
  etapa: string;
  descricao: string | null;
  observacao: string | null;
  usuario_nome: string | null;
  latitude: number | null;
  longitude: number | null;
  foto_url: string | null;
  criado_em: string;
};

type Entidade = {
  titulo: string;
  linhas: { label: string; value: string }[];
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function PublicQrPage() {
  const { codigo } = Route.useParams();
  const tipo = tipoFromCodigo(codigo);
  const [ent, setEnt] = useState<Entidade | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarEventos = async () => {
    const { data } = await supabase
      .from("eventos_qr" as never)
      .select("*")
      .eq("codigo", codigo)
      .order("criado_em", { ascending: true })
      .returns<Evento[]>();
    setEventos(data ?? []);
  };

  useEffect(() => {
    (async () => {
      try {
        // Resolver a entidade pelo prefixo do código
        if (tipo === "CG") {
          const { data } = await supabase.from("cargas")
            .select("codigo,placa_veiculo,motorista,volume_carregado_m3,qtd_toras,status,data_saida,ordens_colheita(codigo,talhoes(codigo,especie,fazendas(nome,local)))")
            .eq("codigo", codigo).maybeSingle();
          if (data) {
            const oc = data.ordens_colheita as { codigo?: string; talhoes?: { codigo?: string; especie?: string; fazendas?: { nome?: string; local?: string } } } | null;
            setEnt({
              titulo: `Carga ${data.codigo}`,
              linhas: [
                { label: "Placa", value: data.placa_veiculo ?? "—" },
                { label: "Motorista", value: data.motorista ?? "—" },
                { label: "Volume", value: `${Number(data.volume_carregado_m3 ?? 0).toFixed(2)} m³` },
                { label: "Toras", value: String(data.qtd_toras ?? "—") },
                { label: "Origem", value: oc?.talhoes?.fazendas?.nome ?? "—" },
                { label: "Talhão", value: oc?.talhoes?.codigo ?? "—" },
                { label: "Espécie", value: oc?.talhoes?.especie ?? "—" },
                { label: "Status", value: String(data.status ?? "—") },
              ],
            });
          }
        } else if (tipo === "LP") {
          const { data } = await supabase.from("lotes_patio")
            .select("codigo,especie,volume_m3,qtd_toras,status,localizacao").eq("codigo", codigo).maybeSingle();
          if (data) setEnt({
            titulo: `Lote ${data.codigo}`,
            linhas: [
              { label: "Espécie", value: data.especie ?? "—" },
              { label: "Volume", value: `${Number(data.volume_m3 ?? 0).toFixed(2)} m³` },
              { label: "Toras", value: String(data.qtd_toras ?? "—") },
              { label: "Localização", value: data.localizacao ?? "—" },
              { label: "Status", value: String(data.status ?? "—") },
            ],
          });
        } else if (tipo === "PA") {
          const { data } = await supabase.from("produtos_acabados")
            .select("codigo,descricao,dimensoes,qtd_pecas,volume_m3,status").eq("codigo", codigo).maybeSingle();
          if (data) setEnt({
            titulo: `Produto ${data.codigo}`,
            linhas: [
              { label: "Descrição", value: data.descricao ?? "—" },
              { label: "Dimensões", value: data.dimensoes ?? "—" },
              { label: "Peças", value: String(data.qtd_pecas ?? "—") },
              { label: "Volume", value: `${Number(data.volume_m3 ?? 0).toFixed(2)} m³` },
              { label: "Status", value: String(data.status ?? "—") },
            ],
          });
        } else if (tipo === "OC") {
          const { data } = await supabase.from("ordens_colheita")
            .select("codigo,status,volume_previsto_m3,volume_colhido_m3,talhoes(codigo,especie,fazendas(nome,local))").eq("codigo", codigo).maybeSingle();
          if (data) {
            const t = data.talhoes as { codigo?: string; especie?: string; fazendas?: { nome?: string; local?: string } } | null;
            setEnt({
              titulo: `Ordem de Colheita ${data.codigo}`,
              linhas: [
                { label: "Status", value: String(data.status ?? "—") },
                { label: "Vol. previsto", value: `${Number(data.volume_previsto_m3 ?? 0).toFixed(2)} m³` },
                { label: "Vol. colhido", value: `${Number(data.volume_colhido_m3 ?? 0).toFixed(2)} m³` },
                { label: "Fazenda", value: t?.fazendas?.nome ?? "—" },
                { label: "Talhão", value: t?.codigo ?? "—" },
                { label: "Espécie", value: t?.especie ?? "—" },
              ],
            });
          }
        } else if (tipo === "OP") {
          const { data } = await supabase.from("ordens_producao")
            .select("codigo,status,volume_entrada_m3,volume_produzido_m3,rendimento_pct").eq("codigo", codigo).maybeSingle();
          if (data) setEnt({
            titulo: `Ordem de Produção ${data.codigo}`,
            linhas: [
              { label: "Status", value: String(data.status ?? "—") },
              { label: "Vol. entrada", value: `${Number(data.volume_entrada_m3 ?? 0).toFixed(2)} m³` },
              { label: "Vol. produzido", value: `${Number(data.volume_produzido_m3 ?? 0).toFixed(2)} m³` },
              { label: "Rendimento", value: `${Number(data.rendimento_pct ?? 0).toFixed(1)}%` },
            ],
          });
        }
        await carregarEventos();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  // Progresso: quais etapas já registradas
  const etapasRegistradas = new Set(eventos.map((e) => e.etapa));

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg space-y-5">
        <header className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[image:var(--gradient-accent)]">
            <TreePine className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold">Fazenda Bela Vista</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Rastreabilidade pública</div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-elegant)]">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Código</div>
          <div className="font-display text-lg font-semibold">{codigo}</div>
          {loading ? (
            <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>
          ) : ent ? (
            <>
              <div className="mt-2 text-sm font-medium text-primary">{ent.titulo}</div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {ent.linhas.map((l) => (
                  <div key={l.label} className="rounded-md bg-secondary/40 p-2">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{l.label}</dt>
                    <dd className="font-medium">{l.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Sem cadastro central para este código, mas o histórico de eventos abaixo continua disponível.
            </p>
          )}
        </section>

        {/* Status / etapas percorridas */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 text-sm font-medium">Status atual</div>
          <ul className="space-y-1.5 text-sm">
            {ETAPAS.filter((e) => e.key !== "outro").map((e) => {
              const ok = etapasRegistradas.has(e.key);
              return (
                <li key={e.key} className="flex items-center gap-2">
                  <span className={ok ? "text-primary" : "text-muted-foreground/50"}>{ok ? "✓" : "○"}</span>
                  <span className={ok ? "font-medium" : "text-muted-foreground"}>{e.grupo} · {e.label}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Timeline */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" /> Linha do tempo
          </div>
          {eventos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há eventos registrados para este código.</p>
          ) : (
            <ol className="space-y-3">
              {eventos.map((ev) => (
                <li key={ev.id} className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{ev.descricao ?? ev.etapa}</div>
                    <div className="text-[11px] text-muted-foreground">{fmtDate(ev.criado_em)}</div>
                  </div>
                  {ev.observacao && <p className="mt-1 text-xs text-muted-foreground">{ev.observacao}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {ev.usuario_nome && <span className="flex items-center gap-1"><User className="h-3 w-3" />{ev.usuario_nome}</span>}
                    {ev.latitude != null && ev.longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${ev.latitude},${ev.longitude}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <MapPin className="h-3 w-3" />{ev.latitude.toFixed(4)}, {ev.longitude.toFixed(4)}
                      </a>
                    )}
                    {ev.foto_url && (
                      <a href={ev.foto_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <Camera className="h-3 w-3" /> foto
                      </a>
                    )}
                  </div>
                  {ev.foto_url && (
                    <img src={ev.foto_url} alt="evento" className="mt-2 max-h-48 w-full rounded-md object-cover" />
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Confirmação de entrega pelo cliente (sem login) — só para cargas ainda não confirmadas */}
        {(tipo === "CG" || tipo === "PA") && !etapasRegistradas.has("entregue") && (
          <DeliveryConfirmForm codigo={codigo} onDone={carregarEventos} />
        )}

        {/* Formulário interno — só aparece para usuário logado */}
        <EventoQrForm codigo={codigo} onCreated={carregarEventos} />


        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="font-semibold text-primary">Trabalhador da fazenda?</div>
          <Link to="/auth" className="mt-1 inline-flex items-center gap-1 text-primary hover:underline">
            Entrar no sistema <ExternalLink className="h-3 w-3" />
          </Link>
          <div className="mt-2">
            <Link to="/rastreabilidade" className="inline-flex items-center gap-1 text-primary hover:underline">
              Rastreabilidade completa <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">SilvaCore · Fazenda Bela Vista</p>
      </div>
    </main>
  );
}
