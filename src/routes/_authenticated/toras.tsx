import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Package, Layers, DollarSign, Warehouse, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { proximoCodigo } from "@/lib/codigo";
import { calcM3Cilindrico } from "@/lib/volume-cilindrico";
import { resumirTorasTalhao } from "@/lib/toras-talhao";

type TalhaoOrigem = { id: string; codigo: string; fazendas: { nome: string } | null };
const nomeTalhao = (talhao: TalhaoOrigem) => `${talhao.codigo}${talhao.fazendas?.nome ? ` · ${talhao.fazendas.nome}` : ""}`;

type Tora = {
  id: string;
  codigo: string;
  especie: string;
  diametro_cm: number;
  comprimento_m: number;
  quantidade: number;
  volume_m3: number;
  valor: number | null;
  patio: string | null;
  entrada_em: string;
  status: string;
  observacoes: string | null;
  criado_em: string;
  talhao_id: string | null;
};

export const Route = createFileRoute("/_authenticated/toras")({
  head: () => ({ meta: [
    { title: "Estoque de Toras · Fazenda Bela Vista" },
    { name: "description", content: "Entradas de toras, volume circular e controle de origem por talhão na Fazenda Bela Vista." },
    { property: "og:title", content: "Estoque de Toras · Fazenda Bela Vista" },
    { property: "og:description", content: "Controle de toras e volume recebido por talhão." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Toras,
});

function Toras() {
  const qc = useQueryClient();
  const [novo, setNovo] = useState(false);
  const [filtroTalhao, setFiltroTalhao] = useState("todos");
  const { data: talhoes = [], isError: erroTalhoes } = useQuery({
    queryKey: ["talhoes-origem-toras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("talhoes").select("id,codigo,fazendas(nome)").order("codigo");
      if (error) throw error;
      return data as TalhaoOrigem[];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["toras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("toras")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as unknown as Tora[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("toras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrada removida");
      qc.invalidateQueries({ queryKey: ["toras"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtradas = filtroTalhao === "todos" ? rows : rows.filter((t) => t.talhao_id === (filtroTalhao === "sem" ? null : filtroTalhao));
  const emPatio = filtradas.filter((t) => t.status === "em_patio");
  const volTotal = emPatio.reduce((s, t) => s + Number(t.volume_m3 || 0), 0);
  const qtdTotal = emPatio.reduce((s, t) => s + t.quantidade, 0);
  const valorTotal = emPatio.reduce((s, t) => s + Number(t.valor || 0), 0);
  const pilhas = new Set(emPatio.map((t) => t.patio).filter(Boolean)).size;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pátio"
        title="Estoque de toras"
        description="Cadastre as toras que entram na serraria. O m³ é calculado pela área circular, igual à madeira cilíndrica da expedição."
        actions={
          <Dialog open={novo} onOpenChange={setNovo}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Registrar entrada
              </Button>
            </DialogTrigger>
            <NovaToraForm
              talhoes={talhoes}
              onSaved={() => {
                setNovo(false);
                qc.invalidateQueries({ queryKey: ["toras"] });
              }}
            />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Toras em pátio" value={qtdTotal} icon={Package} />
        <KpiCard label="Volume em pátio" value={`${volTotal.toFixed(2)} m³`} icon={Layers} />
        <KpiCard
          label="Valor estoque"
          value={`R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <KpiCard label="Pilhas ativas" value={pilhas} icon={Warehouse} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="filtro-talhao">Talhão de origem</Label>
        <Select value={filtroTalhao} onValueChange={setFiltroTalhao}>
          <SelectTrigger id="filtro-talhao" className="w-full sm:w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os talhões</SelectItem>
            <SelectItem value="sem">Sem talhão informado</SelectItem>
            {talhoes.map((t) => <SelectItem key={t.id} value={t.id}>{nomeTalhao(t)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">Total de entradas: {filtradas.reduce((s, t) => s + Number(t.volume_m3), 0).toFixed(3)} m³</span>
      </div>
      {erroTalhoes && <p className="text-sm text-destructive">Não foi possível carregar os talhões. Tente novamente.</p>}
      {talhoes.length > 0 && <div className="space-y-3">
        <h2 className="text-base font-semibold">Volume recebido por talhão — acumulado</h2>
        <DataTable rows={talhoes.filter((t) => filtroTalhao === "todos" || filtroTalhao === t.id).map((t) => ({ ...t, ...resumirTorasTalhao(rows, t.id) }))} columns={[
          { key: "codigo", label: "Talhão", render: (t) => nomeTalhao(t) },
          { key: "quantidade", label: "Toras recebidas", align: "right" },
          { key: "volume_m3", label: "Total recebido (m³)", align: "right", render: (t) => t.volume_m3.toFixed(3) },
        ]} />
      </div>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <DataTable
          rows={filtradas}
          columns={[
            { key: "codigo", label: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
            { key: "especie", label: "Espécie" },
            { key: "talhao_id", label: "Talhão", render: (r) => { const talhao = talhoes.find((t) => t.id === r.talhao_id); return talhao ? nomeTalhao(talhao) : "—"; } },
            { key: "diametro_cm", label: "Ø (cm)", align: "right", render: (r) => Number(r.diametro_cm).toFixed(1) },
            { key: "comprimento_m", label: "Comp. (m)", align: "right", render: (r) => Number(r.comprimento_m).toFixed(2) },
            { key: "quantidade", label: "Toras", align: "right" },
            { key: "volume_m3", label: "Vol. m³", align: "right", render: (r) => Number(r.volume_m3).toFixed(3) },
            {
              key: "valor",
              label: "Valor R$",
              align: "right",
              render: (r) => (r.valor ? Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—"),
            },
            { key: "patio", label: "Pátio", render: (r) => r.patio ?? "—" },
            { key: "entrada_em", label: "Entrada", render: (r) => new Date(`${r.entrada_em}T12:00:00`).toLocaleDateString("pt-BR") },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <StatusBadge tone={r.status === "em_patio" ? "success" : "default"}>
                  {r.status === "em_patio" ? "em pátio" : r.status.replace("_", " ")}
                </StatusBadge>
              ),
            },
            {
              key: "acoes",
              label: "",
              render: (r) => (
                <div className="flex justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Excluir ${r.codigo}?`)) del.mutate(r.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

function NovaToraForm({ onSaved, talhoes }: { onSaved: () => void; talhoes: TalhaoOrigem[] }) {
  const [form, setForm] = useState({
    especie: "Eucalipto",
    diametro_cm: "",
    comprimento_m: "",
    quantidade: "",
    valor: "",
    patio: "",
    observacoes: "",
    talhao_id: "sem",
  });
  const [saving, setSaving] = useState(false);

  // Mesmo cálculo da madeira cilíndrica da expedição: V = π × (Ø/2)² × comp × toras.
  const volume = calcM3Cilindrico(
    Number(form.comprimento_m) || 0,
    (Number(form.diametro_cm) || 0) / 100,
    Number(form.quantidade) || 0,
  );

  const save = async () => {
    if (!form.diametro_cm || !form.comprimento_m || !form.quantidade)
      return toast.error("Informe diâmetro, comprimento e quantidade de toras");
    if (volume <= 0) return toast.error("O volume calculado precisa ser maior que zero");
    setSaving(true);
    try {
      const codigo = await proximoCodigo("TR");
      const { error } = await supabase.from("toras").insert({
        codigo,
        especie: form.especie.trim() || "Eucalipto",
        diametro_cm: Number(form.diametro_cm),
        comprimento_m: Number(form.comprimento_m),
        quantidade: Number(form.quantidade),
        volume_m3: volume,
        valor: form.valor ? Number(form.valor) : null,
        patio: form.patio.trim() || null,
        observacoes: form.observacoes.trim() || null,
        status: "em_patio",
        talhao_id: form.talhao_id === "sem" ? null : form.talhao_id,
      });
      if (error) throw error;
      toast.success(`Entrada ${codigo} registrada · ${volume.toFixed(3)} m³`);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setSaving(false);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Registrar entrada de toras</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="talhao-origem">Talhão de origem</Label>
          <Select value={form.talhao_id} onValueChange={(v) => setForm({ ...form, talhao_id: v })}>
            <SelectTrigger id="talhao-origem"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sem">Sem talhão informado</SelectItem>
              {talhoes.map((t) => <SelectItem key={t.id} value={t.id}>{nomeTalhao(t)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Espécie</Label>
          <Input
            value={form.especie}
            onChange={(e) => setForm({ ...form, especie: e.target.value })}
            placeholder="Eucalipto"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Diâmetro (cm) *</Label>
          <Input
            type="number"
            step="0.1"
            value={form.diametro_cm}
            onChange={(e) => setForm({ ...form, diametro_cm: e.target.value })}
            placeholder="Ex.: 25"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Comprimento (m) *</Label>
          <Input
            type="number"
            step="0.01"
            value={form.comprimento_m}
            onChange={(e) => setForm({ ...form, comprimento_m: e.target.value })}
            placeholder="Ex.: 6,00"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Quantidade de toras *</Label>
          <Input
            type="number"
            value={form.quantidade}
            onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
            placeholder="Ex.: 40"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Valor total (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            placeholder="Opcional"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Pátio / pilha</Label>
          <Input
            value={form.patio}
            onChange={(e) => setForm({ ...form, patio: e.target.value })}
            placeholder="Ex.: A-3"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Input
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
        <span className="text-muted-foreground">Volume calculado (área circular): </span>
        <span className="font-semibold">{volume.toFixed(3)} m³</span>
        {volume > 0 && Number(form.quantidade) > 0 && (
          <span className="ml-2 text-xs text-muted-foreground">
            · média de {(volume / Number(form.quantidade)).toFixed(4)} m³ por tora
          </span>
        )}
      </div>

      <DialogFooter>
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "Registrar entrada"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
