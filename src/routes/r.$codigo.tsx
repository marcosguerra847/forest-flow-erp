import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { obterRastreio } from "@/lib/rastreio.functions";
import { TreePine, MapPin, Camera, Clock, User, ExternalLink, ChevronRight } from "lucide-react";
import { EventoQrForm } from "@/components/EventoQrForm";
import { DeliveryConfirmForm } from "@/components/DeliveryConfirmForm";
import { tipoFromCodigo, ETAPAS } from "@/lib/etapas";

export const Route = createFileRoute("/r/$codigo")({
  ssr: false,
  validateSearch: z.object({ t: z.string().optional() }),
  head: ({ params }) => ({
    meta: [
      { title: `${params.codigo} · Rastreabilidade · Fazenda Bela Vista` },
      { name: "description", content: `Consulta pública do QR Code ${params.codigo} — histórico e etapas.` },
      { property: "og:title", content: `${params.codigo} · Rastreabilidade · Fazenda Bela Vista` },
      { property: "og:description", content: "Consulta autorizada da carga e histórico de entrega." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "referrer", content: "no-referrer" },
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

  const { t = "" } = Route.useSearch();
  const obter = useServerFn(obterRastreio);
  const [erro, setErro] = useState(false);
  const carregarEventos = async () => {
    try {
      const result = await obter({ data: { codigo, token: t } });
      if (!result.ok) { setErro(true); setEnt(null); setEventos([]); return; }
      setEnt(result.entidade);
      setEventos(result.eventos);
      setErro(false);
    } catch { setErro(true); setEnt(null); setEventos([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    void carregarEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, t]);

  if (erro) return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="font-display text-lg font-semibold">Fazenda Bela Vista</h1>
        <p className="text-sm text-muted-foreground">QR sem autorização ou inválido. Solicite uma nova etiqueta ao responsável da fazenda.</p>
        <Link to="/auth" className="text-sm text-primary">Entrar no sistema</Link>
      </div>
    </main>
  );

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
          <DeliveryConfirmForm codigo={codigo} token={t} onDone={carregarEventos} />
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
