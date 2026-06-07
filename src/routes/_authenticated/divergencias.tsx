import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Div = {
  id: string; codigo: string; carga_id: string | null; tipo: string;
  descricao: string; diferenca: number | null; justificativa: string | null;
  status: "aberta" | "justificada" | "resolvida"; criado_em: string;
};

export const Route = createFileRoute("/_authenticated/divergencias")({ component: DivPage });

function DivPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Div | null>(null);

  const { data: divs = [] } = useQuery({
    queryKey: ["divergencias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("divergencias").select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return data as Div[];
    },
  });

  const abertas = divs.filter(d => d.status === "aberta").length;
  const justif = divs.filter(d => d.status === "justificada").length;
  const resolv = divs.filter(d => d.status === "resolvida").length;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Alertas" title="Divergências" description="Alertas abertos automaticamente quando o que chegou no pátio não confere com o que saiu da fazenda." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Abertas" value={abertas} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Justificadas" value={justif} icon={AlertTriangle} tone="warning" />
        <KpiCard label="Resolvidas" value={resolv} icon={CheckCircle2} tone="success" />
        <KpiCard label="Total" value={divs.length} icon={AlertTriangle} />
      </div>

      <DataTable
        rows={divs}
        columns={[
          { key: "codigo", label: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
          { key: "tipo", label: "Tipo" },
          { key: "descricao", label: "Descrição" },
          { key: "diferenca", label: "Δ", align: "right", render: (r) => r.diferenca !== null ? Number(r.diferenca).toFixed(2) : "—" },
          { key: "criado_em", label: "Quando", render: (r) => new Date(r.criado_em).toLocaleString("pt-BR") },
          { key: "status", label: "Status", render: (r) => (
            <StatusBadge tone={r.status === "resolvida" ? "success" : r.status === "justificada" ? "warning" : "danger"}>{r.status}</StatusBadge>
          ) },
          { key: "acoes", label: "", render: (r) => r.status !== "resolvida"
              ? <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => setEditing(r)}>Tratar</Button></div>
              : null },
        ]}
      />

      {editing && <TratarDialog div={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["divergencias"] }); }} />}
    </div>
  );
}

function TratarDialog({ div, onClose, onDone }: { div: Div; onClose: () => void; onDone: () => void }) {
  const [just, setJust] = useState(div.justificativa ?? "");

  const justificar = useMutation({
    mutationFn: async (status: "justificada" | "resolvida") => {
      const payload: Partial<Div> & { resolvido_em?: string } = { justificativa: just, status };
      if (status === "resolvida") payload.resolvido_em = new Date().toISOString();
      const { error } = await supabase.from("divergencias").update(payload).eq("id", div.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Atualizado"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tratar divergência {div.codigo}</DialogTitle></DialogHeader>
        <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs">{div.descricao}</div>
        <div className="space-y-1.5">
          <Label>Justificativa *</Label>
          <Textarea value={just} onChange={(e) => setJust(e.target.value)} placeholder="Explique a causa e ações tomadas" rows={4} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => justificar.mutate("justificada")} disabled={!just.trim() || justificar.isPending}>Justificar</Button>
          <Button onClick={() => justificar.mutate("resolvida")} disabled={!just.trim() || justificar.isPending}>Resolver</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
