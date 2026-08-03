import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPinned, Trees, Shield, Loader2, Filter, Factory } from "lucide-react";
import { toast } from "sonner";
import mapaAsset from "@/assets/map_fazenda.png.asset.json";

type Hotspot = { codigo: string; x: number; y: number; tipo: "talhao" | "reserva" | "sede"; label: string };

// Posições (% da imagem) medidas sobre os rótulos do mapa da Fazenda Bela Vista
const HOTSPOTS: Hotspot[] = [
  { codigo: "T-01", label: "T 01", x: 15.7, y: 63.2, tipo: "talhao" },
  { codigo: "T-02", label: "T 02", x: 25.9, y: 62.0, tipo: "talhao" },
  { codigo: "T-03", label: "T 03", x: 40.1, y: 58.9, tipo: "talhao" },
  { codigo: "T-04", label: "T 04", x: 55.1, y: 63.2, tipo: "talhao" },
  { codigo: "T-05", label: "T 05", x: 46.8, y: 55.4, tipo: "talhao" },
  { codigo: "T-06", label: "T 06", x: 28.3, y: 45.3, tipo: "talhao" },
  { codigo: "T-07", label: "T 07", x: 24.5, y: 46.8, tipo: "talhao" },
  { codigo: "T-08", label: "T 08", x: 33.6, y: 30.8, tipo: "talhao" },
  { codigo: "T-09", label: "T 09", x: 45.7, y: 26.9, tipo: "talhao" },
  { codigo: "T-10", label: "T 10", x: 46.5, y: 37.5, tipo: "talhao" },
  { codigo: "T-11", label: "T 11", x: 53.2, y: 41.2, tipo: "talhao" },
  { codigo: "R-01", label: "R 01", x: 8.1, y: 70.7, tipo: "reserva" },
  { codigo: "R-02", label: "R 02", x: 26.3, y: 31.0, tipo: "reserva" },
  { codigo: "R-03", label: "R 03", x: 38.6, y: 15.2, tipo: "reserva" },
  { codigo: "R-04", label: "R 04", x: 38.1, y: 70.0, tipo: "reserva" },
  { codigo: "R-05", label: "R 05", x: 35.5, y: 44.6, tipo: "reserva" },
  { codigo: "R-06", label: "R 06", x: 35.2, y: 38.2, tipo: "reserva" },
  { codigo: "SEDE", label: "Sede", x: 19.9, y: 49.9, tipo: "sede" },
];


type Talhao = {
  id: string; codigo: string; especie: string; area_ha: number;
  ano_plantio: number | null; volume_estimado_m3: number; status: string;
  fazendas?: { nome: string } | null;
};

const STATUS_META: Record<string, { label: string; color: string; ring: string; pulse?: boolean }> = {
  em_crescimento: { label: "Em crescimento", color: "bg-emerald-500", ring: "ring-emerald-300" },
  pronto_corte:   { label: "Pronto p/ corte", color: "bg-amber-500",   ring: "ring-amber-300" },
  em_corte:       { label: "Em corte",        color: "bg-red-500",     ring: "ring-red-300", pulse: true },
  cortado:        { label: "Cortado",         color: "bg-slate-500",   ring: "ring-slate-300" },
  finalizado:     { label: "Finalizado",      color: "bg-zinc-700",    ring: "ring-zinc-400" },
};
const STATUS_OPTIONS = Object.keys(STATUS_META);

export function MapaFazenda() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<string | null>(null);

  const { data: talhoes = [] } = useQuery({
    queryKey: ["mapa-talhoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talhoes")
        .select("id,codigo,especie,area_ha,ano_plantio,volume_estimado_m3,status,fazendas(nome)");
      if (error) throw error;
      return data as Talhao[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("talhoes").update({ status: status as Talhao["status"] as never }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["mapa-talhoes"] });
      qc.invalidateQueries({ queryKey: ["talhoes"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const findTalhao = (codigo: string) => {
    const norm = (s: string) => s.replace(/[-_\s]/g, "").toLowerCase();
    return talhoes.find(t => norm(t.codigo) === norm(codigo));
  };

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of talhoes) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [talhoes]);

  const resumo = useMemo(() => {
    const r: Record<string, { area: number; volume: number }> = {};
    let area = 0, volume = 0;
    for (const t of talhoes) {
      const g = r[t.status] ?? { area: 0, volume: 0 };
      g.area += Number(t.area_ha || 0);
      g.volume += Number(t.volume_estimado_m3 || 0);
      r[t.status] = g;
      area += Number(t.area_ha || 0);
      volume += Number(t.volume_estimado_m3 || 0);
    }
    return { por: r, area, volume };
  }, [talhoes]);
  const nf = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });


  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-elegant)]">
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-primary" /> Mapa operacional · Fazenda Bela Vista
          </h3>
          <p className="text-xs text-muted-foreground">
            Clique em um talhão para ver dados e <span className="text-foreground">mudar o status</span> — tudo sincroniza automaticamente.
          </p>
        </div>
        <div className="hidden gap-1.5 text-xs sm:flex">
          <button
            onClick={() => setFiltro(null)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition ${filtro === null ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}
          >
            <Filter className="h-3 w-3" /> Todos ({talhoes.length})
          </button>
          {STATUS_OPTIONS.map((s) => {
            const meta = STATUS_META[s];
            const n = contagem[s] ?? 0;
            return (
              <button
                key={s}
                onClick={() => setFiltro(filtro === s ? null : s)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition ${filtro === s ? "border-foreground bg-foreground/5" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}
              >
                <span className={`h-2 w-2 rounded-full ${meta.color}`} />
                {meta.label} <span className="opacity-60">({n})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-lg border border-border/60">
        <img
          src={mapaAsset.url}
          alt="Mapa satélite da Fazenda Bela Vista com talhões e reservas ambientais"
          className="block w-full select-none"
          draggable={false}
        />
        {/* Overlay sutil para destacar marcadores */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />

        {HOTSPOTS.map((h) => {
          const t = h.tipo === "talhao" ? findTalhao(h.codigo) : null;
          const isReserva = h.tipo === "reserva";
          const isSede = h.tipo === "sede";
          const meta = t ? STATUS_META[t.status] : null;
          const dim = filtro && h.tipo === "talhao" && (!t || t.status !== filtro);
          const color = isSede ? "bg-sky-600" : isReserva ? "bg-orange-500" : meta?.color ?? "bg-emerald-500";
          const ring = isSede ? "ring-sky-200" : isReserva ? "ring-orange-200" : meta?.ring ?? "ring-emerald-200";
          const tooltip = isSede
            ? "Sede industrial · pátio e serraria"
            : isReserva
              ? `Reserva ambiental ${h.label} · área protegida`
              : t
                ? `Talhão ${t.codigo} · ${t.especie} · ${nf(Number(t.area_ha))} ha · ${STATUS_META[t.status]?.label ?? t.status}`
                : `Talhão ${h.label} · não cadastrado`;

          return (
            <Popover key={h.codigo}>
              <PopoverTrigger asChild>
                <button
                  aria-label={tooltip}
                  title={tooltip}
                  className={`group absolute -translate-x-1/2 -translate-y-1/2 transition-all ${dim ? "opacity-20 hover:opacity-100" : "opacity-100"}`}
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                >
                  {/* Halo pulsante para em_corte */}
                  {meta?.pulse && (
                    <span className={`absolute inset-0 -m-2 rounded-full ${color} opacity-40 animate-ping`} />
                  )}
                  <span
                    className={`relative flex items-center justify-center border-2 border-white/95 ring-2 ${ring} shadow-lg transition-transform group-hover:scale-125 ${color} ${isSede ? "rounded-md" : "rounded-full"}`}
                    style={{
                      width: isSede ? "clamp(16px, 1.7vw, 22px)" : "clamp(18px, 2vw, 26px)",
                      height: isSede ? "clamp(16px, 1.7vw, 22px)" : "clamp(18px, 2vw, 26px)",
                    }}
                  >
                    {isSede ? (
                      <Factory className="h-2.5 w-2.5 text-white" />
                    ) : (
                      <span className="text-[9px] font-bold text-white drop-shadow-sm leading-none">
                        {h.label.replace(/\s/g, "")}
                      </span>
                    )}
                  </span>
                  {/* Etiqueta de status no hover */}
                  <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-medium text-white group-hover:block">
                    {tooltip}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80" side="top">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {isSede ? <Factory className="h-4 w-4 text-sky-600" /> : isReserva ? <Shield className="h-4 w-4 text-orange-500" /> : <Trees className="h-4 w-4 text-emerald-500" />}
                    <h4 className="font-semibold">{isSede ? "Sede industrial" : isReserva ? `Reserva ambiental ${h.label}` : `Talhão ${h.label}`}</h4>
                    {meta && (
                      <span className={`ml-auto inline-flex items-center gap-1 rounded-full ${meta.color} px-2 py-0.5 text-[10px] font-semibold text-white`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                        {meta.label}
                      </span>
                    )}
                  </div>

                  {isSede ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Pátio de toras, serraria e escritório. Ponto de recebimento das cargas.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs"><Link to="/recebimento">Recebimento →</Link></Button>
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs"><Link to="/producao">Serraria →</Link></Button>
                      </div>
                    </div>
                  ) : isReserva ? (
                    <p className="text-xs text-muted-foreground">
                      Área de preservação permanente / reserva legal. Não sujeita a colheita.
                    </p>
                  ) : t ? (

                    <>
                      <div className="space-y-1 text-xs">
                        <Row k="Código" v={t.codigo} />
                        <Row k="Fazenda" v={t.fazendas?.nome ?? "—"} />
                        <Row k="Espécie" v={t.especie} />
                        <Row k="Área" v={`${Number(t.area_ha).toLocaleString("pt-BR")} ha`} />
                        <Row k="Plantio" v={t.ano_plantio?.toString() ?? "—"} />
                        <Row k="Vol. estimado" v={`${Number(t.volume_estimado_m3).toLocaleString("pt-BR")} m³`} />
                      </div>

                      <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/30 p-2">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Alterar status operacional
                        </label>
                        <div className="flex items-center gap-2">
                          <Select
                            value={t.status}
                            onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v })}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(s => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  <span className="inline-flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${STATUS_META[s].color}`} />
                                    {STATUS_META[s].label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {updateStatus.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        </div>
                      </div>

                      <Button asChild size="sm" variant="outline" className="w-full h-8 text-xs">
                        <Link to="/talhoes">Abrir cadastro completo →</Link>
                      </Button>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Talhão ainda não cadastrado no sistema.
                      <Link to="/talhoes" className="mt-2 block text-primary underline">
                        Cadastrar {h.label} →
                      </Link>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}

        {/* Legenda flutuante */}
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/55 px-2.5 py-1.5 text-[10px] text-white backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Reserva</span>
            {STATUS_OPTIONS.map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${STATUS_META[s].color}`} />
                {STATUS_META[s].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Coordenadas de referência: 25°18′55″S 53°21′09″W · Altitude aprox. 679 m</span>
        <span>{talhoes.length} talhões · {HOTSPOTS.filter(h => h.tipo === "reserva").length} reservas</span>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground text-right">{v}</span>
    </div>
  );
}
