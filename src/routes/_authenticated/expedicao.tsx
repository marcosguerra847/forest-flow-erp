import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Package2, Plus, QrCode, Trash2, Copy, FileDown, Printer, Pencil } from "lucide-react";
import { toast } from "sonner";
import { QrDisplay } from "@/components/QrDisplay";
import { gerarNotaPacote, calcM3, type PacoteNota } from "@/lib/nota-expedicao";

type Pacote = PacoteNota & { id: string; token: string };

export const Route = createFileRoute("/_authenticated/expedicao")({
  head: () => ({ meta: [{ title: "Expedição · Fazenda Bela Vista" }, { name: "description", content: "Pacotes prontos para envio com QR para baixa pelo celular." }] }),
  component: ExpedicaoPage,
});

const linkOperador = (p: Pacote) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/x/${encodeURIComponent(p.codigo)}?t=${p.token}`;

function ExpedicaoPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<Pacote | null>(null);
  const [editing, setEditing] = useState<Pacote | null>(null);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pacotes"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("pacotes_expedicao" as never).select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return data as unknown as Pacote[];
    },
  });
  const prontos = rows.filter((r) => r.status === "pronto");
  const exp = rows.filter((r) => r.status !== "pronto");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Pátio · Estoque" title="Expedição de pacotes"
        description="Cada pacote pronto recebe um QR para colar na carga. O operador escaneia pelo celular, confere as quantidades e dá baixa de saída — sem login."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova carga</Button></DialogTrigger>
            <PacoteForm onSaved={(p) => { setOpen(false); qc.invalidateQueries({ queryKey: ["pacotes"] }); setQr(p); }} />
          </Dialog>
        } />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Prontos p/ envio" value={prontos.length} icon={Package2} tone="warning" />
        <KpiCard label="Blocos prontos" value={prontos.reduce((s, r) => s + r.qtd_blocos, 0)} icon={Package2} />
        <KpiCard label="Expedidos" value={exp.length} icon={Package2} tone="success" />
        <KpiCard label="m³ expedidos" value={exp.reduce((s, r) => s + Number(r.volume_expedido_m3 ?? 0), 0).toFixed(1)} icon={Package2} />
      </div>
      {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : (
        <DataTable rows={rows} columns={[
          { key: "codigo", label: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
          { key: "descricao", label: "Produto", render: (r) => <span>{r.descricao || (r.tipo_carga === "cavaco" ? "Cavaco" : "—")}</span> },
          { key: "tipo_carga", label: "Tipo", render: (r) => r.tipo_carga === "cavaco" ? "Cavaco" : "Madeira serrada" },
          { key: "cliente_nome", label: "Cliente" },
          { key: "qtd_blocos", label: "Blocos (prev/env)", align: "right", render: (r) => `${r.qtd_blocos} / ${r.qtd_blocos_expedida ?? "—"}` },
          { key: "qtd_pecas", label: "Peças (prev/env)", align: "right", render: (r) => `${r.qtd_pecas} / ${r.qtd_pecas_expedida ?? "—"}` },
          { key: "volume_m3", label: "Quantidade (prev/env)", align: "right", render: (r) => r.tipo_carga === "cavaco" ? `${Number(r.quantidade_venda ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${r.unidade_venda === "ton" ? "t" : "m³"} / ${r.quantidade_expedida != null ? `${Number(r.quantidade_expedida).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${r.unidade_venda === "ton" ? "t" : "m³"}` : "—"}` : `${Number(r.volume_m3).toFixed(2)} / ${r.volume_expedido_m3 != null ? Number(r.volume_expedido_m3).toFixed(2) : "—"} m³` },
          { key: "status", label: "Status", render: (r) => (
            <StatusBadge tone={r.status === "pronto" ? "warning" : "success"}>
              {r.status === "pronto" ? "pronto" : `saiu ${r.expedido_em ? new Date(r.expedido_em).toLocaleDateString("pt-BR") : ""} · ${r.operador_nome ?? ""}`}
            </StatusBadge>) },
          { key: "acoes", label: "", render: (r) => (
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" title="Editar carga" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" title="Baixar nota" onClick={() => gerarNotaPacote(r, linkOperador(r))}><FileDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setQr(r)}><QrCode className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={async () => {
                if (!confirm(`Excluir pacote ${r.codigo}?`)) return;
                const { error } = await supabase.from("pacotes_expedicao" as never).delete().eq("id", r.id);
                if (error) toast.error(error.message); else { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["pacotes"] }); }
              }}><Trash2 className="h-4 w-4" /></Button>
            </div>) },
        ]} />
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <PacoteForm pacote={editing} onSaved={(p) => { setEditing(null); qc.invalidateQueries({ queryKey: ["pacotes"] }); if (qr?.id === p.id) setQr(p); }} />}
      </Dialog>
      <Dialog open={!!qr} onOpenChange={(o) => !o && setQr(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Etiqueta do pacote {qr?.codigo}</DialogTitle></DialogHeader>
          {qr && (
            <div className="flex flex-col items-center gap-3 py-2">
              <QrDisplay codigo={qr.codigo} value={linkOperador(qr)} size={220}
                tituloEtiqueta="Pacote para expedição"
                details={[
                  { label: "Tipo", value: qr.tipo_carga === "cavaco" ? "Cavaco" : "Madeira serrada" },
                  { label: "Produto", value: qr.descricao || (qr.tipo_carga === "cavaco" ? "Cavaco" : "—") },
                  { label: "Cliente", value: qr.cliente_nome ?? "—" },
                  ...(qr.espessura_cm && qr.largura_cm && qr.comprimento_m ? [{ label: "Medidas", value: `${(Number(qr.espessura_cm) * 10).toLocaleString("pt-BR")} mm x ${(Number(qr.largura_cm) * 10).toLocaleString("pt-BR")} mm x ${(Number(qr.comprimento_m) * 1000).toLocaleString("pt-BR")} mm` }] : []),
                  { label: "Peças por pacote", value: String(qr.pecas_por_pacote ?? "—") },
                  { label: "Blocos", value: String(qr.qtd_blocos) },
                  { label: "Peças", value: String(qr.qtd_pecas) },
                  { label: qr.tipo_carga === "cavaco" ? "Quantidade vendida" : "Volume", value: qr.tipo_carga === "cavaco" ? `${Number(qr.quantidade_venda ?? 0).toLocaleString("pt-BR")} ${qr.unidade_venda === "ton" ? "toneladas" : "m³"}` : `${Number(qr.volume_m3).toFixed(2)} m³` },
                  ...(qr.valor_total != null ? [{ label: "Valor total", value: Number(qr.valor_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) }] : []),
                ]}
                notaEtiqueta="Operador: escaneie com o celular para conferir e dar baixa de saída." />
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => gerarNotaPacote(qr, linkOperador(qr))}><FileDown className="mr-1 h-3.5 w-3.5" /> Baixar nota (PDF)</Button>
                <Button size="sm" variant="outline" onClick={() => gerarNotaPacote(qr, linkOperador(qr), true)}><Printer className="mr-1 h-3.5 w-3.5" /> Imprimir nota</Button>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(linkOperador(qr)); toast.success("Link copiado"); }}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copiar link
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PacoteForm({ onSaved, pacote }: { onSaved: (p: Pacote) => void; pacote?: Pacote }) {
  const [f, setF] = useState(() => ({
    tipo_carga: pacote?.tipo_carga ?? "madeira",
    descricao: pacote?.descricao ?? "",
    cliente_nome: pacote?.cliente_nome ?? "",
    espessura_mm: pacote?.espessura_cm != null ? String(Number(pacote.espessura_cm) * 10) : "",
    largura_mm: pacote?.largura_cm != null ? String(Number(pacote.largura_cm) * 10) : "",
    comprimento_mm: pacote?.comprimento_m != null ? String(Number(pacote.comprimento_m) * 1000) : "",
    qtd_blocos: String(pacote?.qtd_blocos ?? ""),
    pecas_por_pacote: pacote?.pecas_por_pacote != null ? String(pacote.pecas_por_pacote) : "",
    volume_m3: pacote?.tipo_carga === "cavaco" ? "" : "",
    unidade_venda: pacote?.unidade_venda ?? "m3",
    quantidade_venda: pacote?.quantidade_venda != null ? String(pacote.quantidade_venda) : "",
    valor_unitario: pacote?.valor_unitario != null ? String(pacote.valor_unitario) : "",
    data_saida_carga: pacote?.data_saida_carga
      ? String(pacote.data_saida_carga).slice(0, 10)
      : pacote?.expedido_em
        ? String(pacote.expedido_em).slice(0, 10)
        : "",
    placa_caminhao: pacote?.placa_caminhao ?? "",
    observacoes: pacote?.observacoes ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const num = (s: string) => Number(s.replace(",", ".")) || 0;
  const isCavaco = f.tipo_carga === "cavaco";
  const pacotes = num(f.qtd_blocos);
  const pecasPorPacote = num(f.pecas_por_pacote);
  const totalPecas = pacotes * pecasPorPacote;
  const espessuraMm = num(f.espessura_mm);
  const larguraMm = num(f.largura_mm);
  const comprimentoMm = num(f.comprimento_mm);
  const auto = calcM3(espessuraMm, larguraMm, comprimentoMm, totalPecas);
  const temMedidas = espessuraMm > 0 && larguraMm > 0 && comprimentoMm > 0 && pacotes > 0 && pecasPorPacote > 0;
  const quantidadeCavaco = num(f.quantidade_venda);
  const volumeFinal = isCavaco ? (f.unidade_venda === "m3" ? quantidadeCavaco : 0) : (f.volume_m3.trim() ? num(f.volume_m3) : auto);
  const valorTotal = num(f.valor_unitario) * (isCavaco ? quantidadeCavaco : volumeFinal);

  const save = async () => {
    if (!f.descricao.trim() && !isCavaco) return toast.error("Informe o produto");
    if (isCavaco && quantidadeCavaco <= 0) return toast.error("Informe a quantidade de cavaco vendida");
    if (!isCavaco && !temMedidas) return toast.error("Informe as três medidas em mm, a quantidade de pacotes e as peças por pacote");
    if (!isCavaco && (!Number.isInteger(pacotes) || !Number.isInteger(pecasPorPacote))) return toast.error("Pacotes e peças por pacote devem ser números inteiros");
    setSaving(true);
    try {
      const base = {
        tipo_carga: f.tipo_carga,
        descricao: f.descricao.trim() || "Cavaco",
        cliente_nome: f.cliente_nome || null,
        espessura_cm: isCavaco ? null : espessuraMm / 10,
        largura_cm: isCavaco ? null : larguraMm / 10,
        comprimento_m: isCavaco ? null : comprimentoMm / 1000,
        qtd_blocos: isCavaco ? 0 : pacotes,
        pecas_por_pacote: isCavaco ? null : pecasPorPacote,
        qtd_pecas: isCavaco ? 0 : totalPecas,
        volume_m3: Number(volumeFinal.toFixed(6)),
        unidade_venda: isCavaco ? f.unidade_venda : "m3",
        quantidade_venda: isCavaco ? quantidadeCavaco : volumeFinal,
        valor_unitario: f.valor_unitario.trim() ? num(f.valor_unitario) : null,
        valor_total: f.valor_unitario.trim() ? Number(valorTotal.toFixed(2)) : null,
        data_saida_carga: f.data_saida_carga || null,
        placa_caminhao: f.placa_caminhao.trim().toUpperCase() || null,
        observacoes: f.observacoes || null,
      };
      let data: unknown;
      let error: { message: string } | null;
      if (pacote) {
        const result = await supabase.from("pacotes_expedicao" as never).update(base as never).eq("id", pacote.id).select().single();
        data = result.data; error = result.error;
      } else {
        const { data: codigo, error: e1 } = await supabase.rpc("proximo_codigo" as never, { _prefixo: "PX" } as never);
        if (e1) throw e1;
        const result = await supabase.from("pacotes_expedicao" as never).insert({ ...base, codigo } as never).select().single();
        data = result.data; error = result.error;
      }
      if (error) throw new Error(error.message);
      toast.success(pacote ? `Carga ${pacote.codigo} atualizada` : `Carga cadastrada`);
      onSaved(data as Pacote);
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{pacote ? `Editar carga ${pacote.codigo}` : "Cadastrar carga para expedição"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3 space-y-1.5"><Label>Tipo de carga</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={f.tipo_carga} onChange={(e) => setF({ ...f, tipo_carga: e.target.value })}>
            <option value="madeira">Madeira serrada / produtos por peças</option><option value="cavaco">Venda somente de cavaco</option>
          </select>
        </div>
        <div className="sm:col-span-3 space-y-1.5"><Label>{isCavaco ? "Descrição do cavaco" : "Produto / descrição *"}</Label><Input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder={isCavaco ? "Ex.: Cavaco de eucalipto" : "Ex.: Tábua de eucalipto"} /></div>
        <div className="sm:col-span-3 space-y-1.5"><Label>Cliente / comprador</Label><Input value={f.cliente_nome} onChange={(e) => setF({ ...f, cliente_nome: e.target.value })} placeholder="Nome do cliente ou comprador" /></div>
        {isCavaco ? <>
          <div className="space-y-1.5"><Label>Unidade de venda</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={f.unidade_venda} onChange={(e) => setF({ ...f, unidade_venda: e.target.value })}>
              <option value="m3">Metro cúbico (m³)</option><option value="ton">Tonelada (t)</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label>Quantidade ({f.unidade_venda === "ton" ? "toneladas" : "m³"}) *</Label><Input type="number" min="0.001" step="any" value={f.quantidade_venda} onChange={(e) => setF({ ...f, quantidade_venda: e.target.value })} placeholder={f.unidade_venda === "ton" ? "Ex.: 28,5" : "Ex.: 100"} /></div>
          <div className="space-y-1.5"><Label>Preço por {f.unidade_venda === "ton" ? "tonelada" : "m³"} (R$)</Label><Input inputMode="decimal" value={f.valor_unitario} onChange={(e) => setF({ ...f, valor_unitario: e.target.value })} placeholder="Ex.: 120" /></div>
          <div className="sm:col-span-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"><p>Quantidade da carga: <b>{quantidadeCavaco.toLocaleString("pt-BR")} {f.unidade_venda === "ton" ? "t" : "m³"}</b></p>{f.valor_unitario.trim() && <p>Valor total estimado: <b>{valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></p>}<p className="text-muted-foreground">Esta carga será registrada como cavaco, sem exigir medidas de peças ou pacotes.</p></div>
        </> : <>
          <div className="space-y-1.5"><Label>Espessura (mm)</Label><Input inputMode="decimal" value={f.espessura_mm} onChange={(e) => setF({ ...f, espessura_mm: e.target.value })} placeholder="Ex.: 9" /></div>
          <div className="space-y-1.5"><Label>Largura (mm)</Label><Input inputMode="decimal" value={f.largura_mm} onChange={(e) => setF({ ...f, largura_mm: e.target.value })} placeholder="Ex.: 90" /></div>
          <div className="space-y-1.5"><Label>Comprimento (mm)</Label><Input inputMode="decimal" value={f.comprimento_mm} onChange={(e) => setF({ ...f, comprimento_mm: e.target.value })} placeholder="Ex.: 1200" /></div>
          <div className="space-y-1.5"><Label>Quantidade de pacotes</Label><Input type="number" min="1" step="1" value={f.qtd_blocos} onChange={(e) => setF({ ...f, qtd_blocos: e.target.value })} placeholder="Ex.: 12" /></div>
          <div className="space-y-1.5"><Label>Peças por pacote</Label><Input type="number" min="1" step="1" value={f.pecas_por_pacote} onChange={(e) => setF({ ...f, pecas_por_pacote: e.target.value })} placeholder="Ex.: 522" /></div>
          <div className="space-y-1.5"><Label>Volume manual (m³, opcional)</Label><Input inputMode="decimal" value={f.volume_m3} placeholder={temMedidas ? auto.toFixed(4) : "Automático"} onChange={(e) => setF({ ...f, volume_m3: e.target.value })} /></div>
          <div className="sm:col-span-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">{temMedidas ? <><p>Total de peças: <b>{totalPecas.toLocaleString("pt-BR")}</b></p><p>Volume por peça: <b>{(auto / Math.max(totalPecas, 1)).toFixed(6)} m³</b></p><p>Volume total calculado: <b>{auto.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m³</b></p>{f.volume_m3.trim() && <p>Será usado o volume manual informado.</p>}</> : "Preencha as três medidas em mm, a quantidade de pacotes e as peças por pacote para calcular automaticamente."}</div>
          <div className="space-y-1.5"><Label>Preço por m³ (R$), opcional</Label><Input inputMode="decimal" value={f.valor_unitario} onChange={(e) => setF({ ...f, valor_unitario: e.target.value })} placeholder="Preço de venda" /></div>
          {f.valor_unitario.trim() && <div className="space-y-1.5"><Label>Valor total estimado</Label><div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-semibold">{valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div></div>}
        </>}
        <div className="space-y-1.5"><Label>Data de saída (opcional)</Label><Input type="date" value={f.data_saida_carga} onChange={(e) => setF({ ...f, data_saida_carga: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Placa do caminhão (opcional)</Label><Input value={f.placa_caminhao} onChange={(e) => setF({ ...f, placa_caminhao: e.target.value.toUpperCase() })} placeholder="Ex.: ABC1D23" maxLength={8} /></div>
        <div className="sm:col-span-3 space-y-1.5"><Label>Observações</Label><Textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : pacote ? "Salvar alterações" : "Cadastrar carga + QR"}</Button></DialogFooter>
    </DialogContent>
  );
}
