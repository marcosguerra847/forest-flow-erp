import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { QrCode, Search, ArrowDown } from "lucide-react";
import { rastreio } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/rastreabilidade")({
  head: () => ({ meta: [{ title: "Rastreabilidade · SilvaCore" }] }),
  component: Rastreabilidade,
});

function Rastreabilidade() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Diferencial"
        title="Rastreabilidade da madeira"
        description="Do produto acabado até a fazenda de origem. Cada peça com cadeia completa de custódia."
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-elegant)] sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            defaultValue="PR-501-A"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Buscar lote, produto, OP, tora ou QR..."
          />
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <QrCode className="h-4 w-4" /> Ler QR
        </button>
      </div>

      <div className="rounded-xl border border-primary/30 bg-[image:var(--gradient-forest)] p-6 shadow-[var(--shadow-glow)]">
        <div className="text-[11px] font-medium uppercase tracking-widest text-primary/80">Produto rastreado</div>
        <div className="mt-1 font-display text-2xl font-semibold text-foreground">{rastreio.produto}</div>
        <p className="mt-1 text-sm text-muted-foreground">Cadeia de custódia completa — produto → produção → tora → talhão → fazenda.</p>
      </div>

      <div className="relative space-y-4">
        {rastreio.cadeia.map((etapa, i) => (
          <div key={i} className="relative">
            <div className="flex gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-elegant)] transition-colors hover:border-primary/40">
              <div className="flex flex-col items-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-display text-sm font-semibold">
                  {i + 1}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-widest text-primary/80">{etapa.etapa}</div>
                <div className="mt-0.5 text-base font-medium text-foreground">{etapa.info}</div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>📍 {etapa.local}</span>
                  <span>🗓 {etapa.data}</span>
                </div>
              </div>
            </div>
            {i < rastreio.cadeia.length - 1 && (
              <div className="my-1 flex justify-center">
                <ArrowDown className="h-4 w-4 text-primary/60" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
