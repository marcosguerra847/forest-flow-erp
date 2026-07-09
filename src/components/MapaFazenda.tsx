import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPinned, Trees, Shield } from "lucide-react";
import mapaAsset from "@/assets/map_fazenda.png.asset.json";

type Hotspot = { codigo: string; x: number; y: number; tipo: "talhao" | "reserva"; label: string };

// Posições (% da imagem) aproximadas a partir do mapa da Fazenda Bela Vista
const HOTSPOTS: Hotspot[] = [
  { codigo: "T-01", label: "T 01", x: 17, y: 63, tipo: "talhao" },
  { codigo: "T-02", label: "T 02", x: 30, y: 63, tipo: "talhao" },
  { codigo: "T-03", label: "T 03", x: 41, y: 60, tipo: "talhao" },
  { codigo: "T-04", label: "T 04", x: 61, y: 62, tipo: "talhao" },
  { codigo: "T-05", label: "T 05", x: 51, y: 57, tipo: "talhao" },
  { codigo: "T-06", label: "T 06", x: 32, y: 47, tipo: "talhao" },
  { codigo: "T-07", label: "T 07", x: 24, y: 47, tipo: "talhao" },
  { codigo: "T-08", label: "T 08", x: 38, y: 30, tipo: "talhao" },
  { codigo: "T-09", label: "T 09", x: 51, y: 27, tipo: "talhao" },
  { codigo: "T-10", label: "T 10", x: 51, y: 39, tipo: "talhao" },
  { codigo: "T-11", label: "T 11", x: 60, y: 43, tipo: "talhao" },
  { codigo: "R-01", label: "R 01", x: 9, y: 74, tipo: "reserva" },
  { codigo: "R-02", label: "R 02", x: 26, y: 30, tipo: "reserva" },
  { codigo: "R-03", label: "R 03", x: 45, y: 15, tipo: "reserva" },
  { codigo: "R-04", label: "R 04", x: 44, y: 74, tipo: "reserva" },
  { codigo: "R-05", label: "R 05", x: 43, y: 47, tipo: "reserva" },
  { codigo: "R-06", label: "R 06", x: 40, y: 39, tipo: "reserva" },
];

type Talhao = {
  id: string; codigo: string; especie: string; area_ha: number;
  ano_plantio: number | null; volume_estimado_m3: number; status: string;
  fazendas?: { nome: string } | null;
};

const statusLabels: Record<string, string> = {
  em_crescimento: "Em crescimento", pronto_corte: "Pronto p/ corte",
  em_corte: "Em corte", cortado: "Cortado", finalizado: "Finalizado",
};

export function MapaFazenda() {
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

  const findTalhao = (codigo: string) => {
    const norm = (s: string) => s.replace(/[-_\s]/g, "").toLowerCase();
    return talhoes.find(t => norm(t.codigo) === norm(codigo));
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-elegant)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-primary" /> Mapa da Fazenda Bela Vista
          </h3>
          <p className="text-xs text-muted-foreground">
            Clique em um talhão (T) ou reserva (R) para ver os dados cadastrados.
          </p>
        </div>
        <div className="hidden gap-3 text-xs text-muted-foreground sm:flex">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Talhão</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Reserva</span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-lg border border-border/60">
        <img
          src={mapaAsset.url}
          alt="Mapa satélite da Fazenda Bela Vista com talhões e reservas ambientais"
          className="block w-full select-none"
          draggable={false}
        />
        {HOTSPOTS.map((h) => {
          const t = h.tipo === "talhao" ? findTalhao(h.codigo) : null;
          const isReserva = h.tipo === "reserva";
          return (
            <Popover key={h.codigo}>
              <PopoverTrigger asChild>
                <button
                  aria-label={`${h.tipo === "talhao" ? "Talhão" : "Reserva"} ${h.label}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow-lg transition-transform hover:scale-125 ${
                    isReserva ? "bg-orange-500" : "bg-emerald-500"
                  }`}
                  style={{
                    left: `${h.x}%`,
                    top: `${h.y}%`,
                    width: "clamp(12px, 1.4vw, 20px)",
                    height: "clamp(12px, 1.4vw, 20px)",
                  }}
                />
              </PopoverTrigger>
              <PopoverContent className="w-72" side="top">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {isReserva ? <Shield className="h-4 w-4 text-orange-500" /> : <Trees className="h-4 w-4 text-emerald-500" />}
                    <h4 className="font-semibold">{isReserva ? "Reserva ambiental" : "Talhão"} {h.label}</h4>
                  </div>
                  {isReserva ? (
                    <p className="text-xs text-muted-foreground">
                      Área de preservação permanente / reserva legal. Não sujeita a colheita.
                    </p>
                  ) : t ? (
                    <div className="space-y-1 text-xs">
                      <Row k="Código" v={t.codigo} />
                      <Row k="Fazenda" v={t.fazendas?.nome ?? "—"} />
                      <Row k="Espécie" v={t.especie} />
                      <Row k="Área" v={`${Number(t.area_ha).toLocaleString("pt-BR")} ha`} />
                      <Row k="Plantio" v={t.ano_plantio?.toString() ?? "—"} />
                      <Row k="Vol. estimado" v={`${Number(t.volume_estimado_m3).toLocaleString("pt-BR")} m³`} />
                      <Row k="Status" v={statusLabels[t.status] ?? t.status} />
                      <Link to="/talhoes" className="mt-2 inline-block text-xs text-primary underline">
                        Abrir na aba Talhões →
                      </Link>
                    </div>
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
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        Coordenadas de referência: 25°18′55″S 53°21′09″W · Área mapeada aprox. 679 m de altitude.
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
