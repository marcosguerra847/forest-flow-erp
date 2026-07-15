import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Trash2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { proximoCodigo } from "@/lib/codigo";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/logo-bela-vista.png.asset.json";

type Item = { descricao: string; qtd: number; unidade: string; valor_unit: number };
type Cliente = { id: string; nome: string; documento?: string | null; endereco?: string | null; telefone?: string | null; email?: string | null };
type Orcamento = {
  id: string; codigo: string; cliente_nome: string; cliente_documento: string | null;
  cliente_endereco: string | null; cliente_telefone: string | null; cliente_email: string | null;
  itens: Item[]; total_bruto: number; desconto: number; acrescimo: number; frete: number; total_liquido: number;
  forma_pagamento: string | null; parcelas: number; valor_parcela: number; observacoes: string | null;
  assinatura_cliente: string | null; validade: string | null; status: string; criado_em: string;
};

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos · Fazenda Bela Vista" }] }),
  component: OrcamentosPage,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function OrcamentosPage() {
  const qc = useQueryClient();
  const [novo, setNovo] = useState(false);

  const { data: orcamentos = [] } = useQuery({
    queryKey: ["orcamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orcamentos").select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return data as unknown as Orcamento[];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-orcamento"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id,nome,documento,endereco,telefone,email").order("nome");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orcamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Orçamento excluído"); qc.invalidateQueries({ queryKey: ["orcamentos"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalMes = orcamentos
    .filter(o => new Date(o.criado_em).getMonth() === new Date().getMonth())
    .reduce((s, o) => s + Number(o.total_liquido), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Comercial"
        title="Orçamentos"
        description="Gere orçamentos completos de madeira em PDF pronto para enviar ao cliente."
        actions={
          <Dialog open={novo} onOpenChange={setNovo}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Novo orçamento</Button></DialogTrigger>
            <NovoOrcamentoForm clientes={clientes} onSaved={() => { setNovo(false); qc.invalidateQueries({ queryKey: ["orcamentos"] }); }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total emitidos" value={orcamentos.length} icon={FileText} />
        <KpiCard label="Abertos" value={orcamentos.filter(o => o.status === "aberto").length} icon={FileText} tone="success" />
        <KpiCard label="Valor no mês" value={brl(totalMes)} icon={FileText} />
        <KpiCard label="Valor total" value={brl(orcamentos.reduce((s, o) => s + Number(o.total_liquido), 0))} icon={FileText} />
      </div>

      <DataTable
        rows={orcamentos}
        columns={[
          { key: "codigo", label: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
          { key: "cliente_nome", label: "Cliente" },
          { key: "criado_em", label: "Emissão", render: (r) => new Date(r.criado_em).toLocaleDateString("pt-BR") },
          { key: "validade", label: "Validade", render: (r) => r.validade ? new Date(r.validade).toLocaleDateString("pt-BR") : "—" },
          { key: "parcelas", label: "Pgto", render: (r) => `${r.parcelas}x ${brl(Number(r.valor_parcela))}` },
          { key: "total_liquido", label: "Total", align: "right", render: (r) => brl(Number(r.total_liquido)) },
          { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "aprovado" ? "success" : r.status === "recusado" ? "danger" : "default"}>{r.status}</StatusBadge> },
          { key: "acoes", label: "", render: (r) => (
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" title="Baixar PDF" onClick={() => gerarPDF(r)}><Download className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" title="Imprimir" onClick={() => gerarPDF(r, true)}><Printer className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { if (confirm(`Excluir ${r.codigo}?`)) del.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )},
        ]}
      />
    </div>
  );
}

function NovoOrcamentoForm({ clientes, onSaved }: { clientes: Cliente[]; onSaved: () => void }) {
  const [clienteId, setClienteId] = useState<string>("");
  const [cliente, setCliente] = useState({ nome: "", documento: "", endereco: "", telefone: "", email: "" });
  const [itens, setItens] = useState<Item[]>([{ descricao: "", qtd: 1, unidade: "m³", valor_unit: 0 }]);
  const [desconto, setDesconto] = useState("0");
  const [acrescimo, setAcrescimo] = useState("0");
  const [frete, setFrete] = useState("0");
  const [formaPag, setFormaPag] = useState("À vista");
  const [parcelas, setParcelas] = useState("1");
  const [observacoes, setObservacoes] = useState("");
  const [validade, setValidade] = useState("");
  const [saving, setSaving] = useState(false);
  const [brutoManual, setBrutoManual] = useState(false);
  const [brutoInput, setBrutoInput] = useState("0");

  useEffect(() => {
    if (!clienteId) return;
    const c = clientes.find(x => x.id === clienteId);
    if (c) setCliente({ nome: c.nome, documento: c.documento ?? "", endereco: c.endereco ?? "", telefone: c.telefone ?? "", email: c.email ?? "" });
  }, [clienteId, clientes]);

  const totais = useMemo(() => {
    const brutoCalc = itens.reduce((s, i) => s + Number(i.qtd || 0) * Number(i.valor_unit || 0), 0);
    const bruto = brutoManual ? Number(brutoInput || 0) : brutoCalc;
    const liquido = bruto - Number(desconto || 0) + Number(acrescimo || 0) + Number(frete || 0);
    const p = Math.max(1, Number(parcelas || 1));
    return { bruto, brutoCalc, liquido, valorParcela: liquido / p };
  }, [itens, desconto, acrescimo, frete, parcelas, brutoManual, brutoInput]);

  const setItem = (idx: number, patch: Partial<Item>) => setItens(itens.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const addItem = () => setItens([...itens, { descricao: "", qtd: 1, unidade: "m³", valor_unit: 0 }]);
  const rmItem = (i: number) => setItens(itens.filter((_, j) => j !== i));

  const save = async () => {
    if (!cliente.nome.trim()) return toast.error("Informe o cliente");
    if (!brutoManual && (itens.length === 0 || itens.some(i => !i.descricao.trim()))) return toast.error("Preencha todos os itens ou ative o modo de valor manual");
    if (brutoManual && Number(brutoInput || 0) <= 0) return toast.error("Informe o total bruto");
    setSaving(true);
    try {
      const codigo = await proximoCodigo("ORC");
      const { error } = await supabase.from("orcamentos").insert({
        codigo,
        cliente_id: clienteId || null,
        cliente_nome: cliente.nome,
        cliente_documento: cliente.documento || null,
        cliente_endereco: cliente.endereco || null,
        cliente_telefone: cliente.telefone || null,
        cliente_email: cliente.email || null,
        itens: itens as unknown as never,
        total_bruto: totais.bruto,
        desconto: Number(desconto || 0),
        acrescimo: Number(acrescimo || 0),
        frete: Number(frete || 0),
        total_liquido: totais.liquido,
        forma_pagamento: formaPag,
        parcelas: Number(parcelas || 1),
        valor_parcela: totais.valorParcela,
        observacoes: observacoes || null,
        validade: validade || null,
      });
      if (error) throw error;
      toast.success(`Orçamento ${codigo} criado`);
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Novo orçamento</DialogTitle></DialogHeader>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cliente</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Cliente cadastrado (opcional)</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione ou preencha manualmente abaixo" /></SelectTrigger>
              <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Nome / Razão social *</Label><Input value={cliente.nome} onChange={e => setCliente({ ...cliente, nome: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>CPF / CNPJ</Label><Input value={cliente.documento} onChange={e => setCliente({ ...cliente, documento: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Endereço</Label><Input value={cliente.endereco} onChange={e => setCliente({ ...cliente, endereco: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Telefone</Label><Input value={cliente.telefone} onChange={e => setCliente({ ...cliente, telefone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input value={cliente.email} onChange={e => setCliente({ ...cliente, email: e.target.value })} /></div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Itens</h3>
          <Button size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Item</Button>
        </div>
        <div className="space-y-2">
          {itens.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 rounded-md border border-border/60 p-2">
              <Input className="col-span-5" placeholder="Descrição do produto" value={it.descricao} onChange={e => setItem(i, { descricao: e.target.value })} />
              <Input className="col-span-2" type="number" step="0.01" placeholder="Qtd" value={it.qtd} onChange={e => setItem(i, { qtd: Number(e.target.value) })} />
              <Input className="col-span-1" placeholder="Un" value={it.unidade} onChange={e => setItem(i, { unidade: e.target.value })} />
              <Input className="col-span-3" type="number" step="0.01" placeholder="Valor unit." value={it.valor_unit} onChange={e => setItem(i, { valor_unit: Number(e.target.value) })} />
              <Button size="icon" variant="ghost" className="col-span-1 text-destructive" onClick={() => rmItem(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Valores</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5"><Label>Total bruto</Label><Input value={brl(totais.bruto)} disabled /></div>
          <div className="space-y-1.5"><Label>Desconto (R$)</Label><Input type="number" step="0.01" value={desconto} onChange={e => setDesconto(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Acréscimo (R$)</Label><Input type="number" step="0.01" value={acrescimo} onChange={e => setAcrescimo(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Frete (R$)</Label><Input type="number" step="0.01" value={frete} onChange={e => setFrete(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-4"><Label>Total líquido</Label><Input value={brl(totais.liquido)} disabled className="text-lg font-semibold" /></div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pagamento</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Forma de pagamento</Label>
            <Select value={formaPag} onValueChange={setFormaPag}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["À vista", "PIX", "Boleto", "Cartão de crédito", "Transferência bancária", "Cheque"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Parcelas</Label><Input type="number" min="1" value={parcelas} onChange={e => setParcelas(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Valor por parcela</Label><Input value={brl(totais.valorParcela)} disabled /></div>
          <div className="space-y-1.5"><Label>Validade do orçamento</Label><Input type="date" value={validade} onChange={e => setValidade(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-3"><Label>Observações</Label><Textarea rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Condições, prazo de entrega, garantias..." /></div>
        </div>
      </section>

      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar orçamento"}</Button></DialogFooter>
    </DialogContent>
  );
}

async function gerarPDF(o: Orcamento, autoPrint = false) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header com logo
  try {
    const img = await fetch(logoAsset.url).then(r => r.blob()).then(b => new Promise<string>(res => {
      const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b);
    }));
    doc.addImage(img, "PNG", 14, 10, 20, 20);
  } catch { /* ignore */ }

  doc.setFontSize(14).setFont("helvetica", "bold");
  doc.text("FAZENDA BELA VISTA", 38, 16);
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text("Madeira de Reflorestamento", 38, 21);
  doc.text("Contato: contato@fazendabelavista.com.br", 38, 26);

  doc.setFontSize(16).setFont("helvetica", "bold");
  doc.text("ORÇAMENTO", W - 14, 16, { align: "right" });
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text(o.codigo, W - 14, 22, { align: "right" });
  doc.text(`Emissão: ${new Date(o.criado_em).toLocaleDateString("pt-BR")}`, W - 14, 27, { align: "right" });
  if (o.validade) doc.text(`Validade: ${new Date(o.validade).toLocaleDateString("pt-BR")}`, W - 14, 32, { align: "right" });

  doc.setDrawColor(180).line(14, 36, W - 14, 36);

  // Cliente
  doc.setFontSize(10).setFont("helvetica", "bold").text("CLIENTE", 14, 43);
  doc.setFont("helvetica", "normal").setFontSize(9);
  let y = 48;
  doc.text(`Nome: ${o.cliente_nome}`, 14, y); y += 4;
  if (o.cliente_documento) { doc.text(`Documento: ${o.cliente_documento}`, 14, y); y += 4; }
  if (o.cliente_endereco) { doc.text(`Endereço: ${o.cliente_endereco}`, 14, y); y += 4; }
  const linha3: string[] = [];
  if (o.cliente_telefone) linha3.push(`Tel: ${o.cliente_telefone}`);
  if (o.cliente_email) linha3.push(`E-mail: ${o.cliente_email}`);
  if (linha3.length) { doc.text(linha3.join("   "), 14, y); y += 4; }

  // Itens
  autoTable(doc, {
    startY: y + 3,
    head: [["#", "Descrição", "Qtd", "Un", "Valor Unit.", "Total"]],
    body: o.itens.map((it, i) => [
      String(i + 1),
      it.descricao,
      Number(it.qtd).toLocaleString("pt-BR"),
      it.unidade,
      brl(Number(it.valor_unit)),
      brl(Number(it.qtd) * Number(it.valor_unit)),
    ]),
    headStyles: { fillColor: [46, 82, 51], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 10 }, 2: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Totais
  const boxX = W - 84;
  doc.setFontSize(9).setFont("helvetica", "normal");
  const linhas: [string, string][] = [
    ["Total bruto", brl(Number(o.total_bruto))],
    ["Desconto", `- ${brl(Number(o.desconto))}`],
    ["Acréscimo", `+ ${brl(Number(o.acrescimo))}`],
    ["Frete", `+ ${brl(Number(o.frete))}`],
  ];
  linhas.forEach(([k, v], i) => {
    doc.text(k, boxX, afterTable + i * 5);
    doc.text(v, W - 14, afterTable + i * 5, { align: "right" });
  });
  const yTotal = afterTable + linhas.length * 5 + 2;
  doc.setDrawColor(80).line(boxX, yTotal - 2, W - 14, yTotal - 2);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("TOTAL LÍQUIDO", boxX, yTotal + 3);
  doc.text(brl(Number(o.total_liquido)), W - 14, yTotal + 3, { align: "right" });

  // Pagamento
  let yPag = yTotal + 14;
  doc.setFontSize(10).setFont("helvetica", "bold").text("CONDIÇÕES DE PAGAMENTO", 14, yPag);
  doc.setFont("helvetica", "normal").setFontSize(9); yPag += 5;
  doc.text(`Forma: ${o.forma_pagamento ?? "—"}`, 14, yPag); yPag += 4;
  doc.text(`Parcelamento: ${o.parcelas}x de ${brl(Number(o.valor_parcela))}`, 14, yPag); yPag += 4;
  if (o.observacoes) {
    yPag += 2; doc.setFont("helvetica", "bold").text("Observações:", 14, yPag); yPag += 4;
    doc.setFont("helvetica", "normal");
    const wrap = doc.splitTextToSize(o.observacoes, W - 28);
    doc.text(wrap, 14, yPag); yPag += wrap.length * 4;
  }

  // Assinatura
  const yAss = Math.max(yPag + 25, 250);
  doc.setDrawColor(0).line(20, yAss, 90, yAss);
  doc.line(W - 90, yAss, W - 20, yAss);
  doc.setFontSize(8).text("Assinatura do Cliente", 55, yAss + 4, { align: "center" });
  doc.text("Fazenda Bela Vista", W - 55, yAss + 4, { align: "center" });

  if (autoPrint) {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  } else {
    doc.save(`${o.codigo}.pdf`);
  }
}
