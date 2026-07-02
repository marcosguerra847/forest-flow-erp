import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Plus, Pencil, Trash2, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, CheckCircle2, Download, Landmark, Paperclip, Link2 } from "lucide-react";
import { toast } from "sonner";
import { exportCSV, exportXLSX } from "@/lib/export";

type CentroCusto = { id: string; nome: string; tipo: string };
type ContaBancaria = { id: string; banco: string; agencia: string | null; conta: string | null; tipo: string; saldo_inicial: number; ativo: boolean; observacoes: string | null };
type NF = {
  id: string; numero: string; serie: string | null; tipo: "entrada" | "saida";
  cliente_id: string | null; fornecedor: string | null; carga_id: string | null;
  pedido_id: string | null;
  valor: number; data_emissao: string; chave_acesso: string | null;
  cfop: string | null; natureza_operacao: string | null;
  base_icms: number | null; valor_icms: number | null; valor_ipi: number | null;
  xml_url: string | null; pdf_url: string | null;
  status: string; observacoes: string | null;
  clientes?: { nome: string } | null;
  cargas?: { codigo: string } | null;
  pedidos?: { codigo: string } | null;
};
type Conta = {
  id: string; tipo: "pagar" | "receber"; descricao: string; categoria: string | null;
  valor: number; vencimento: string; data_pagamento: string | null; status: string;
  cliente_id: string | null; fornecedor: string | null; nf_id: string | null;
  centro_custo_id: string | null; conta_bancaria_id: string | null;
  observacoes: string | null;
  clientes?: { nome: string } | null;
  centros_custo?: { nome: string } | null;
};
type Mov = {
  id: string; tipo: "entrada" | "saida"; data: string; descricao: string;
  categoria: string | null; valor: number; conta_id: string | null;
  forma_pagamento: string | null; observacoes: string | null;
  centro_custo_id: string | null; conta_bancaria_id: string | null;
  conciliado_em: string | null;
  centros_custo?: { nome: string } | null;
  contas_bancarias?: { banco: string } | null;
};
type Cliente = { id: string; nome: string };
type Carga = { id: string; codigo: string };
type Pedido = { id: string; codigo: string };

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · Fazenda Bela Vista" }] }),
  component: FinanceiroPage,
});

const fmt = (n: number) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function FinanceiroPage() {
  const qc = useQueryClient();
  const [openNF, setOpenNF] = useState(false);
  const [editNF, setEditNF] = useState<NF | null>(null);
  const [openConta, setOpenConta] = useState(false);
  const [editConta, setEditConta] = useState<Conta | null>(null);
  const [openMov, setOpenMov] = useState(false);
  const [editMov, setEditMov] = useState<Mov | null>(null);
  const [openBanco, setOpenBanco] = useState(false);
  const [editBanco, setEditBanco] = useState<ContaBancaria | null>(null);

  const { data: centros = [] } = useQuery({
    queryKey: ["centros_custo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("centros_custo").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as CentroCusto[];
    },
  });
  const { data: bancos = [] } = useQuery({
    queryKey: ["contas_bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contas_bancarias").select("*").order("banco");
      if (error) throw error;
      return data as ContaBancaria[];
    },
  });
  const { data: nfs = [] } = useQuery({
    queryKey: ["notas_fiscais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notas_fiscais")
        .select("*, clientes(nome), cargas(codigo), pedidos(codigo)").order("data_emissao", { ascending: false });
      if (error) throw error;
      return data as unknown as NF[];
    },
  });
  const { data: contas = [] } = useQuery({
    queryKey: ["contas_financeiras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contas_financeiras")
        .select("*, clientes(nome), centros_custo(nome)").order("vencimento", { ascending: true });
      if (error) throw error;
      return data as unknown as Conta[];
    },
  });
  const { data: movs = [] } = useQuery({
    queryKey: ["movimentacoes_caixa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("movimentacoes_caixa")
        .select("*, centros_custo(nome), contas_bancarias(banco)").order("data", { ascending: false });
      if (error) throw error;
      return data as unknown as Mov[];
    },
  });
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id,nome").order("nome");
      if (error) throw error;
      return data as Cliente[];
    },
  });
  const { data: cargas = [] } = useQuery({
    queryKey: ["cargas-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cargas").select("id,codigo").order("codigo", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Carga[];
    },
  });
  const { data: pedidos = [] } = useQuery({
    queryKey: ["pedidos-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pedidos").select("id,codigo").order("codigo", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as Pedido[];
    },
  });

  const delNF = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("notas_fiscais").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("NF excluída"); qc.invalidateQueries({ queryKey: ["notas_fiscais"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delConta = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contas_financeiras").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Conta excluída"); qc.invalidateQueries({ queryKey: ["contas_financeiras"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMov = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("movimentacoes_caixa").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Lançamento excluído"); qc.invalidateQueries({ queryKey: ["movimentacoes_caixa"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delBanco = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contas_bancarias").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Conta bancária excluída"); qc.invalidateQueries({ queryKey: ["contas_bancarias"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const baixar = useMutation({
    mutationFn: async (c: Conta) => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("contas_financeiras")
        .update({ status: "pago", data_pagamento: hoje }).eq("id", c.id);
      if (error) throw error;
      await supabase.from("movimentacoes_caixa").insert({
        tipo: c.tipo === "receber" ? "entrada" : "saida",
        data: hoje, descricao: `Baixa: ${c.descricao}`, categoria: c.categoria,
        valor: c.valor, conta_id: c.id,
        centro_custo_id: c.centro_custo_id, conta_bancaria_id: c.conta_bancaria_id,
      });
    },
    onSuccess: () => {
      toast.success("Conta baixada e lançada no caixa");
      qc.invalidateQueries({ queryKey: ["contas_financeiras"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const conciliar = useMutation({
    mutationFn: async ({ id, marcar }: { id: string; marcar: boolean }) => {
      const { error } = await supabase.from("movimentacoes_caixa")
        .update({ conciliado_em: marcar ? new Date().toISOString() : null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movimentacoes_caixa"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const kpis = useMemo(() => {
    const aReceber = contas.filter(c => c.tipo === "receber" && c.status === "aberto").reduce((s, c) => s + Number(c.valor), 0);
    const aPagar = contas.filter(c => c.tipo === "pagar" && c.status === "aberto").reduce((s, c) => s + Number(c.valor), 0);
    const entradas = movs.filter(m => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor), 0);
    const saidas = movs.filter(m => m.tipo === "saida").reduce((s, m) => s + Number(m.valor), 0);
    const saldoInicial = bancos.reduce((s, b) => s + Number(b.saldo_inicial), 0);
    return { aReceber, aPagar, saldo: saldoInicial + entradas - saidas, entradas, saidas };
  }, [contas, movs, bancos]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Comercial"
        title="Financeiro da fazenda"
        description="Notas fiscais, contas, fluxo de caixa, conciliação bancária e DRE."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="A receber" value={fmt(kpis.aReceber)} icon={ArrowDownRight} tone="success" />
        <KpiCard label="A pagar" value={fmt(kpis.aPagar)} icon={ArrowUpRight} tone="warning" />
        <KpiCard label="Saldo de caixa" value={fmt(kpis.saldo)} icon={Wallet} tone={kpis.saldo >= 0 ? "success" : "danger"} />
        <KpiCard label="Movimentações" value={movs.length} icon={FileText} />
      </div>

      <Tabs defaultValue="contas" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="contas">Contas a Pagar/Receber</TabsTrigger>
          <TabsTrigger value="nfs">Notas Fiscais</TabsTrigger>
          <TabsTrigger value="caixa">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="bancos">Contas Bancárias</TabsTrigger>
        </TabsList>

        <TabsContent value="contas" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Contas</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportCSV("contas", contas.map(c => ({
                Tipo: c.tipo, Descrição: c.descricao, Categoria: c.categoria ?? "",
                Cliente: c.clientes?.nome ?? c.fornecedor ?? "",
                Centro_de_custo: c.centros_custo?.nome ?? "",
                Valor: c.valor, Vencimento: c.vencimento, Status: c.status,
                Pagamento: c.data_pagamento ?? "",
              })))}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
              <Dialog open={openConta} onOpenChange={(o) => { setOpenConta(o); if (!o) setEditConta(null); }}>
                <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova conta</Button></DialogTrigger>
                <ContaForm conta={editConta} clientes={clientes} nfs={nfs} centros={centros} bancos={bancos} onSaved={() => { setOpenConta(false); setEditConta(null); qc.invalidateQueries({ queryKey: ["contas_financeiras"] }); }} />
              </Dialog>
            </div>
          </div>
          {contas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Nenhuma conta cadastrada.</div>
          ) : (
            <DataTable rows={contas} columns={[
              { key: "tipo", label: "Tipo", render: (r) => <StatusBadge tone={r.tipo === "receber" ? "success" : "warning"}>{r.tipo === "receber" ? "A receber" : "A pagar"}</StatusBadge> },
              { key: "descricao", label: "Descrição" },
              { key: "parte", label: "Cliente/Fornecedor", render: (r) => r.clientes?.nome ?? r.fornecedor ?? "—" },
              { key: "centro", label: "Centro de custo", render: (r) => r.centros_custo?.nome ?? "—" },
              { key: "valor", label: "Valor", align: "right", render: (r) => fmt(Number(r.valor)) },
              { key: "vencimento", label: "Vencimento" },
              { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "pago" ? "success" : r.status === "vencido" ? "danger" : "info"}>{r.status}</StatusBadge> },
              { key: "acoes", label: "", render: (r) => (
                <div className="flex justify-end gap-1">
                  {r.status === "aberto" && (
                    <Button size="icon" variant="ghost" title="Baixar" onClick={() => { if (confirm(`Baixar a conta "${r.descricao}"?`)) baixar.mutate(r); }}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => { setEditConta(r); setOpenConta(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir "${r.descricao}"?`)) delConta.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ) },
            ]} />
          )}
        </TabsContent>

        <TabsContent value="nfs" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Notas Fiscais</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportCSV("notas_fiscais", nfs.map(n => ({
                Número: n.numero, Série: n.serie ?? "", Tipo: n.tipo,
                Cliente: n.clientes?.nome ?? n.fornecedor ?? "",
                Carga: n.cargas?.codigo ?? "", Pedido: n.pedidos?.codigo ?? "",
                CFOP: n.cfop ?? "", Natureza: n.natureza_operacao ?? "",
                Valor: n.valor, Base_ICMS: n.base_icms ?? 0, ICMS: n.valor_icms ?? 0, IPI: n.valor_ipi ?? 0,
                Emissão: n.data_emissao, Chave: n.chave_acesso ?? "", Status: n.status,
              })))}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
              <Dialog open={openNF} onOpenChange={(o) => { setOpenNF(o); if (!o) setEditNF(null); }}>
                <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova NF</Button></DialogTrigger>
                <NFForm nf={editNF} clientes={clientes} cargas={cargas} pedidos={pedidos} onSaved={() => { setOpenNF(false); setEditNF(null); qc.invalidateQueries({ queryKey: ["notas_fiscais"] }); }} />
              </Dialog>
            </div>
          </div>
          {nfs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Nenhuma nota fiscal cadastrada.</div>
          ) : (
            <DataTable rows={nfs} columns={[
              { key: "numero", label: "Nº/Série", render: (r) => `${r.numero}${r.serie ? "/" + r.serie : ""}` },
              { key: "tipo", label: "Tipo", render: (r) => <StatusBadge tone={r.tipo === "saida" ? "success" : "info"}>{r.tipo === "saida" ? "Saída" : "Entrada"}</StatusBadge> },
              { key: "parte", label: "Cliente/Fornec.", render: (r) => r.clientes?.nome ?? r.fornecedor ?? "—" },
              { key: "vinc", label: "Vínculo", render: (r) => (
                <span className="text-xs text-muted-foreground">
                  {r.cargas?.codigo ? <span>CG {r.cargas.codigo}</span> : null}
                  {r.pedidos?.codigo ? <span> · PED {r.pedidos.codigo}</span> : null}
                  {!r.cargas?.codigo && !r.pedidos?.codigo ? "—" : null}
                </span>
              ) },
              { key: "cfop", label: "CFOP", render: (r) => r.cfop ?? "—" },
              { key: "valor", label: "Valor", align: "right", render: (r) => fmt(Number(r.valor)) },
              { key: "data_emissao", label: "Emissão" },
              { key: "anexos", label: "Anexos", render: (r) => (
                <div className="flex gap-1">
                  {r.xml_url && <a href={r.xml_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">XML</a>}
                  {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">PDF</a>}
                  {!r.xml_url && !r.pdf_url && <span className="text-xs text-muted-foreground">—</span>}
                </div>
              )},
              { key: "acoes", label: "", render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditNF(r); setOpenNF(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir NF ${r.numero}?`)) delNF.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ) },
            ]} />
          )}
        </TabsContent>

        <TabsContent value="caixa" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Fluxo de Caixa</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportXLSX("financeiro", {
                Movimentacoes: movs.map(m => ({
                  Data: m.data, Tipo: m.tipo, Descrição: m.descricao,
                  Categoria: m.categoria ?? "", Centro: m.centros_custo?.nome ?? "",
                  Banco: m.contas_bancarias?.banco ?? "", Valor: m.valor,
                  Conciliado: m.conciliado_em ? "Sim" : "Não",
                })),
                Contas: contas.map(c => ({ Tipo: c.tipo, Desc: c.descricao, Valor: c.valor, Venc: c.vencimento, Status: c.status })),
                NFs: nfs.map(n => ({ Numero: n.numero, Tipo: n.tipo, Valor: n.valor, Emissao: n.data_emissao })),
              })}><Download className="mr-1 h-3.5 w-3.5" /> Excel</Button>
              <Dialog open={openMov} onOpenChange={(o) => { setOpenMov(o); if (!o) setEditMov(null); }}>
                <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Lançamento</Button></DialogTrigger>
                <MovForm mov={editMov} centros={centros} bancos={bancos} onSaved={() => { setOpenMov(false); setEditMov(null); qc.invalidateQueries({ queryKey: ["movimentacoes_caixa"] }); }} />
              </Dialog>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <KpiCard label="Total entradas" value={fmt(kpis.entradas)} icon={TrendingUp} tone="success" />
            <KpiCard label="Total saídas" value={fmt(kpis.saidas)} icon={TrendingDown} tone="danger" />
          </div>
          {movs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Sem movimentações.</div>
          ) : (
            <DataTable rows={movs} columns={[
              { key: "data", label: "Data" },
              { key: "tipo", label: "Tipo", render: (r) => <StatusBadge tone={r.tipo === "entrada" ? "success" : "danger"}>{r.tipo}</StatusBadge> },
              { key: "descricao", label: "Descrição" },
              { key: "centro", label: "Centro", render: (r) => r.centros_custo?.nome ?? "—" },
              { key: "banco", label: "Banco", render: (r) => r.contas_bancarias?.banco ?? "—" },
              { key: "valor", label: "Valor", align: "right", render: (r) => fmt(Number(r.valor)) },
              { key: "conc", label: "Conc.", render: (r) => r.conciliado_em ? <StatusBadge tone="success">Sim</StatusBadge> : <StatusBadge tone="info">Não</StatusBadge> },
              { key: "acoes", label: "", render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditMov(r); setOpenMov(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir lançamento?")) delMov.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ) },
            ]} />
          )}
        </TabsContent>

        <TabsContent value="conciliacao" className="space-y-3">
          <Conciliacao movs={movs} bancos={bancos} onToggle={(id, m) => conciliar.mutate({ id, marcar: m })} />
        </TabsContent>

        <TabsContent value="dre" className="space-y-3">
          <DRE nfs={nfs} contas={contas} movs={movs} centros={centros} />
        </TabsContent>

        <TabsContent value="bancos" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Contas Bancárias</h2>
            <Dialog open={openBanco} onOpenChange={(o) => { setOpenBanco(o); if (!o) setEditBanco(null); }}>
              <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova conta bancária</Button></DialogTrigger>
              <BancoForm banco={editBanco} onSaved={() => { setOpenBanco(false); setEditBanco(null); qc.invalidateQueries({ queryKey: ["contas_bancarias"] }); }} />
            </Dialog>
          </div>
          {bancos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Nenhuma conta bancária cadastrada.</div>
          ) : (
            <DataTable rows={bancos} columns={[
              { key: "banco", label: "Banco", render: (r) => <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" /> {r.banco}</div> },
              { key: "agencia", label: "Ag.", render: (r) => r.agencia ?? "—" },
              { key: "conta", label: "Conta", render: (r) => r.conta ?? "—" },
              { key: "tipo", label: "Tipo" },
              { key: "saldo_inicial", label: "Saldo inicial", align: "right", render: (r) => fmt(Number(r.saldo_inicial)) },
              { key: "acoes", label: "", render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditBanco(r); setOpenBanco(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir "${r.banco}"?`)) delBanco.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ) },
            ]} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------- Conciliação Bancária ------------------- */

function Conciliacao({ movs, bancos, onToggle }: { movs: Mov[]; bancos: ContaBancaria[]; onToggle: (id: string, marcar: boolean) => void }) {
  const [banco, setBanco] = useState<string>("all");
  const filtrados = movs.filter(m => banco === "all" ? true : m.conta_bancaria_id === banco);
  const naoConciliados = filtrados.filter(m => !m.conciliado_em);
  const conciliados = filtrados.filter(m => m.conciliado_em);
  const totalNC = naoConciliados.reduce((s, m) => s + (m.tipo === "entrada" ? Number(m.valor) : -Number(m.valor)), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card p-4">
        <div className="flex items-center gap-3">
          <Label>Conta:</Label>
          <Select value={banco} onValueChange={setBanco}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.banco} {b.conta ? `· ${b.conta}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Pendente de conciliação:</span>{" "}
          <span className="font-semibold">{naoConciliados.length}</span>{" · "}
          <span className={totalNC >= 0 ? "text-emerald-600" : "text-red-600"}>{fmt(totalNC)}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <h3 className="mb-3 font-semibold">Não conciliados ({naoConciliados.length})</h3>
          {naoConciliados.length === 0 ? <p className="text-sm text-muted-foreground">Tudo conciliado.</p> : (
            <ul className="space-y-2">
              {naoConciliados.map(m => (
                <li key={m.id} className="flex items-center justify-between rounded border border-border p-2 text-sm">
                  <div>
                    <div className="font-medium">{m.descricao}</div>
                    <div className="text-xs text-muted-foreground">{m.data} · {m.tipo}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={m.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}>{fmt(Number(m.valor))}</span>
                    <Button size="sm" variant="outline" onClick={() => onToggle(m.id, true)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Conciliar</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <h3 className="mb-3 font-semibold">Conciliados ({conciliados.length})</h3>
          {conciliados.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum lançamento conciliado ainda.</p> : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {conciliados.map(m => (
                <li key={m.id} className="flex items-center justify-between rounded border border-border p-2 text-sm opacity-80">
                  <div>
                    <div className="font-medium">{m.descricao}</div>
                    <div className="text-xs text-muted-foreground">{m.data} · conc. {m.conciliado_em?.slice(0, 10)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{fmt(Number(m.valor))}</span>
                    <Button size="sm" variant="ghost" onClick={() => onToggle(m.id, false)}>Desfazer</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------- DRE ------------------- */

function DRE({ nfs, contas, movs, centros }: { nfs: NF[]; contas: Conta[]; movs: Mov[]; centros: CentroCusto[] }) {
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [ano, setAno] = useState(String(now.getFullYear()));

  const dre = useMemo(() => {
    const inRange = (d: string) => d && d.startsWith(`${ano}-${mes}`);
    const receitaBruta = nfs.filter(n => n.tipo === "saida" && inRange(n.data_emissao)).reduce((s, n) => s + Number(n.valor), 0);
    const impostos = nfs.filter(n => n.tipo === "saida" && inRange(n.data_emissao))
      .reduce((s, n) => s + Number(n.valor_icms ?? 0) + Number(n.valor_ipi ?? 0), 0);
    const receitaLiquida = receitaBruta - impostos;

    const custosPorCentro: Record<string, number> = {};
    centros.forEach(c => custosPorCentro[c.nome] = 0);
    contas.filter(c => c.tipo === "pagar" && (inRange(c.data_pagamento ?? "") || inRange(c.vencimento)))
      .forEach(c => {
        const nome = c.centros_custo?.nome ?? "Sem centro";
        custosPorCentro[nome] = (custosPorCentro[nome] ?? 0) + Number(c.valor);
      });
    movs.filter(m => m.tipo === "saida" && inRange(m.data) && !m.conta_id)
      .forEach(m => {
        const nome = m.centros_custo?.nome ?? "Sem centro";
        custosPorCentro[nome] = (custosPorCentro[nome] ?? 0) + Number(m.valor);
      });

    const totalCustos = Object.values(custosPorCentro).reduce((s, v) => s + v, 0);
    const resultado = receitaLiquida - totalCustos;
    return { receitaBruta, impostos, receitaLiquida, custosPorCentro, totalCustos, resultado };
  }, [nfs, contas, movs, centros, mes, ano]);

  const exportar = () => {
    exportXLSX(`DRE-${ano}-${mes}`, {
      DRE: [
        { Linha: "Receita bruta (NF saída)", Valor: dre.receitaBruta },
        { Linha: "(-) Impostos (ICMS+IPI)", Valor: -dre.impostos },
        { Linha: "Receita líquida", Valor: dre.receitaLiquida },
        ...Object.entries(dre.custosPorCentro).map(([nome, valor]) => ({ Linha: `(-) ${nome}`, Valor: -valor })),
        { Linha: "Total custos", Valor: -dre.totalCustos },
        { Linha: "RESULTADO", Valor: dre.resultado },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card p-4">
        <Label>Período:</Label>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="w-24" value={ano} onChange={(e) => setAno(e.target.value)} />
        <Button variant="outline" size="sm" onClick={exportar}><Download className="mr-1 h-3.5 w-3.5" /> Exportar</Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h3 className="mb-4 font-display text-lg font-semibold">DRE · {mes}/{ano}</h3>
        <table className="w-full text-sm">
          <tbody>
            <DreRow label="Receita bruta (NFs de saída)" value={dre.receitaBruta} tone="pos" />
            <DreRow label="(-) Impostos sobre vendas (ICMS + IPI)" value={-dre.impostos} tone="neg" />
            <DreRow label="= Receita líquida" value={dre.receitaLiquida} bold tone={dre.receitaLiquida >= 0 ? "pos" : "neg"} />
            <tr><td colSpan={2} className="pt-4 pb-1 text-xs uppercase tracking-widest text-muted-foreground">Custos por centro</td></tr>
            {Object.entries(dre.custosPorCentro).map(([nome, valor]) => (
              <DreRow key={nome} label={`(-) ${nome}`} value={-valor} tone="neg" />
            ))}
            <DreRow label="= Total de custos" value={-dre.totalCustos} bold tone="neg" />
            <tr><td colSpan={2}><hr className="my-3 border-border" /></td></tr>
            <DreRow label="RESULTADO DO PERÍODO" value={dre.resultado} bold big tone={dre.resultado >= 0 ? "pos" : "neg"} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DreRow({ label, value, bold, big, tone }: { label: string; value: number; bold?: boolean; big?: boolean; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-red-600" : "";
  return (
    <tr className={bold ? "font-semibold" : ""}>
      <td className={`py-1.5 ${big ? "text-lg" : ""}`}>{label}</td>
      <td className={`py-1.5 text-right tabular-nums ${color} ${big ? "text-lg" : ""}`}>{fmt(value)}</td>
    </tr>
  );
}

/* ------------------- Forms ------------------- */

function ContaForm({ conta, clientes, nfs, centros, bancos, onSaved }: { conta: Conta | null; clientes: Cliente[]; nfs: NF[]; centros: CentroCusto[]; bancos: ContaBancaria[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    tipo: conta?.tipo ?? "receber",
    descricao: conta?.descricao ?? "",
    categoria: conta?.categoria ?? "",
    valor: conta?.valor?.toString() ?? "",
    vencimento: conta?.vencimento ?? new Date().toISOString().slice(0, 10),
    status: conta?.status ?? "aberto",
    cliente_id: conta?.cliente_id ?? "",
    fornecedor: conta?.fornecedor ?? "",
    nf_id: conta?.nf_id ?? "",
    centro_custo_id: conta?.centro_custo_id ?? "",
    conta_bancaria_id: conta?.conta_bancaria_id ?? "",
    observacoes: conta?.observacoes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.descricao.trim() || !form.valor) { toast.error("Descrição e valor são obrigatórios"); return; }
    setSaving(true);
    const payload = {
      tipo: form.tipo, descricao: form.descricao.trim(), categoria: form.categoria || null,
      valor: Number(form.valor), vencimento: form.vencimento, status: form.status,
      cliente_id: form.cliente_id || null, fornecedor: form.fornecedor || null,
      nf_id: form.nf_id || null,
      centro_custo_id: form.centro_custo_id || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      observacoes: form.observacoes || null,
    };
    const { error } = conta
      ? await supabase.from("contas_financeiras").update(payload).eq("id", conta.id)
      : await supabase.from("contas_financeiras").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(conta ? "Conta atualizada" : "Conta criada");
    onSaved();
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{conta ? "Editar conta" : "Nova conta"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Tipo</Label>
          <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "pagar" | "receber" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="receber">A receber</SelectItem><SelectItem value="pagar">A pagar</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="aberto">Aberto</SelectItem><SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Descrição *</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: insumos, combustível" /></div>
        <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        <div><Label>Vencimento *</Label><Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></div>
        <div><Label>Centro de custo</Label>
          <Select value={form.centro_custo_id || "none"} onValueChange={(v) => setForm({ ...form, centro_custo_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{centros.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Conta bancária</Label>
          <Select value={form.conta_bancaria_id || "none"} onValueChange={(v) => setForm({ ...form, conta_bancaria_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.banco} {b.conta ? `· ${b.conta}` : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Cliente</Label>
          <Select value={form.cliente_id || "none"} onValueChange={(v) => setForm({ ...form, cliente_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
        <div className="col-span-2"><Label>NF vinculada</Label>
          <Select value={form.nf_id || "none"} onValueChange={(v) => setForm({ ...form, nf_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{nfs.map(n => <SelectItem key={n.id} value={n.id}>NF {n.numero} · {fmt(n.valor)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

function NFForm({ nf, clientes, cargas, pedidos, onSaved }: { nf: NF | null; clientes: Cliente[]; cargas: Carga[]; pedidos: Pedido[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    numero: nf?.numero ?? "", serie: nf?.serie ?? "",
    tipo: nf?.tipo ?? "saida",
    cliente_id: nf?.cliente_id ?? "", fornecedor: nf?.fornecedor ?? "",
    carga_id: nf?.carga_id ?? "", pedido_id: nf?.pedido_id ?? "",
    valor: nf?.valor?.toString() ?? "",
    data_emissao: nf?.data_emissao ?? new Date().toISOString().slice(0, 10),
    chave_acesso: nf?.chave_acesso ?? "", status: nf?.status ?? "emitida",
    cfop: nf?.cfop ?? "", natureza_operacao: nf?.natureza_operacao ?? "",
    base_icms: nf?.base_icms?.toString() ?? "", valor_icms: nf?.valor_icms?.toString() ?? "",
    valor_ipi: nf?.valor_ipi?.toString() ?? "",
    xml_url: nf?.xml_url ?? "", pdf_url: nf?.pdf_url ?? "",
    observacoes: nf?.observacoes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"xml" | "pdf" | null>(null);
  const xmlRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const upload = async (kind: "xml" | "pdf", file: File) => {
    setUploading(kind);
    const path = `${form.numero || "sem-numero"}-${Date.now()}.${kind}`;
    const { error } = await supabase.storage.from("nf-anexos").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(null); return; }
    const { data } = await supabase.storage.from("nf-anexos").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (data?.signedUrl) {
      setForm(f => ({ ...f, [kind === "xml" ? "xml_url" : "pdf_url"]: data.signedUrl }));
      toast.success(`${kind.toUpperCase()} anexado`);
    }
    setUploading(null);
  };

  const save = async () => {
    if (!form.numero.trim() || !form.valor) { toast.error("Número e valor são obrigatórios"); return; }
    if (form.chave_acesso && form.chave_acesso.replace(/\D/g, "").length !== 44) {
      toast.error("Chave de acesso deve ter 44 dígitos"); return;
    }
    setSaving(true);
    const payload = {
      numero: form.numero.trim(), serie: form.serie || null, tipo: form.tipo,
      cliente_id: form.cliente_id || null, fornecedor: form.fornecedor || null,
      carga_id: form.carga_id || null, pedido_id: form.pedido_id || null,
      valor: Number(form.valor),
      data_emissao: form.data_emissao, chave_acesso: form.chave_acesso || null,
      cfop: form.cfop || null, natureza_operacao: form.natureza_operacao || null,
      base_icms: form.base_icms ? Number(form.base_icms) : null,
      valor_icms: form.valor_icms ? Number(form.valor_icms) : null,
      valor_ipi: form.valor_ipi ? Number(form.valor_ipi) : null,
      xml_url: form.xml_url || null, pdf_url: form.pdf_url || null,
      status: form.status, observacoes: form.observacoes || null,
    };
    const { error } = nf
      ? await supabase.from("notas_fiscais").update(payload).eq("id", nf.id)
      : await supabase.from("notas_fiscais").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(nf ? "NF atualizada" : "NF cadastrada");
    onSaved();
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{nf ? "Editar NF" : "Nova nota fiscal"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-4 gap-3">
        <div><Label>Número *</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
        <div><Label>Série</Label><Input value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} /></div>
        <div><Label>Tipo</Label>
          <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "entrada" | "saida" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="saida">Saída</SelectItem><SelectItem value="entrada">Entrada</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="emitida">Emitida</SelectItem>
              <SelectItem value="autorizada">Autorizada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Cliente</Label>
          <Select value={form.cliente_id || "none"} onValueChange={(v) => setForm({ ...form, cliente_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
        <div className="col-span-2"><Label>Carga vinculada</Label>
          <Select value={form.carga_id || "none"} onValueChange={(v) => setForm({ ...form, carga_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{cargas.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Pedido vinculado</Label>
          <Select value={form.pedido_id || "none"} onValueChange={(v) => setForm({ ...form, pedido_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{pedidos.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="col-span-4 pt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dados fiscais</div>
        <div><Label>CFOP</Label><Input value={form.cfop} onChange={(e) => setForm({ ...form, cfop: e.target.value })} placeholder="5102" /></div>
        <div className="col-span-3"><Label>Natureza da operação</Label><Input value={form.natureza_operacao} onChange={(e) => setForm({ ...form, natureza_operacao: e.target.value })} placeholder="Venda de mercadoria" /></div>
        <div><Label>Valor total *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        <div><Label>Base ICMS</Label><Input type="number" step="0.01" value={form.base_icms} onChange={(e) => setForm({ ...form, base_icms: e.target.value })} /></div>
        <div><Label>Valor ICMS</Label><Input type="number" step="0.01" value={form.valor_icms} onChange={(e) => setForm({ ...form, valor_icms: e.target.value })} /></div>
        <div><Label>Valor IPI</Label><Input type="number" step="0.01" value={form.valor_ipi} onChange={(e) => setForm({ ...form, valor_ipi: e.target.value })} /></div>
        <div className="col-span-2"><Label>Data emissão</Label><Input type="date" value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} /></div>
        <div className="col-span-2"><Label>Chave de acesso (44 dígitos)</Label><Input value={form.chave_acesso} onChange={(e) => setForm({ ...form, chave_acesso: e.target.value })} /></div>

        <div className="col-span-4 pt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Anexos</div>
        <div className="col-span-2">
          <Label>XML</Label>
          <input ref={xmlRef} type="file" accept=".xml,text/xml" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload("xml", f); }} />
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => xmlRef.current?.click()} disabled={uploading === "xml"}>
              <Paperclip className="mr-1 h-3.5 w-3.5" /> {uploading === "xml" ? "Enviando..." : "Anexar XML"}
            </Button>
            {form.xml_url && <a href={form.xml_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline"><Link2 className="inline h-3 w-3" /> ver</a>}
          </div>
        </div>
        <div className="col-span-2">
          <Label>PDF (DANFE)</Label>
          <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload("pdf", f); }} />
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => pdfRef.current?.click()} disabled={uploading === "pdf"}>
              <Paperclip className="mr-1 h-3.5 w-3.5" /> {uploading === "pdf" ? "Enviando..." : "Anexar PDF"}
            </Button>
            {form.pdf_url && <a href={form.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline"><Link2 className="inline h-3 w-3" /> ver</a>}
          </div>
        </div>

        <div className="col-span-4"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

function MovForm({ mov, centros, bancos, onSaved }: { mov: Mov | null; centros: CentroCusto[]; bancos: ContaBancaria[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    tipo: mov?.tipo ?? "entrada", data: mov?.data ?? new Date().toISOString().slice(0, 10),
    descricao: mov?.descricao ?? "", categoria: mov?.categoria ?? "",
    valor: mov?.valor?.toString() ?? "", forma_pagamento: mov?.forma_pagamento ?? "",
    centro_custo_id: mov?.centro_custo_id ?? "", conta_bancaria_id: mov?.conta_bancaria_id ?? "",
    observacoes: mov?.observacoes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.descricao.trim() || !form.valor) { toast.error("Descrição e valor são obrigatórios"); return; }
    setSaving(true);
    const payload = {
      tipo: form.tipo, data: form.data, descricao: form.descricao.trim(),
      categoria: form.categoria || null, valor: Number(form.valor),
      forma_pagamento: form.forma_pagamento || null, observacoes: form.observacoes || null,
      centro_custo_id: form.centro_custo_id || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
    };
    const { error } = mov
      ? await supabase.from("movimentacoes_caixa").update(payload).eq("id", mov.id)
      : await supabase.from("movimentacoes_caixa").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(mov ? "Lançamento atualizado" : "Lançamento criado");
    onSaved();
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{mov ? "Editar lançamento" : "Novo lançamento de caixa"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Tipo</Label>
          <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "entrada" | "saida" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
        <div className="col-span-2"><Label>Descrição *</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
        <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        <div><Label>Centro de custo</Label>
          <Select value={form.centro_custo_id || "none"} onValueChange={(v) => setForm({ ...form, centro_custo_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{centros.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Conta bancária</Label>
          <Select value={form.conta_bancaria_id || "none"} onValueChange={(v) => setForm({ ...form, conta_bancaria_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.banco} {b.conta ? `· ${b.conta}` : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Forma de pagamento</Label><Input value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })} placeholder="Pix, dinheiro, boleto..." /></div>
        <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

function BancoForm({ banco, onSaved }: { banco: ContaBancaria | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    banco: banco?.banco ?? "", agencia: banco?.agencia ?? "", conta: banco?.conta ?? "",
    tipo: banco?.tipo ?? "corrente",
    saldo_inicial: banco?.saldo_inicial?.toString() ?? "0",
    ativo: banco?.ativo ?? true,
    observacoes: banco?.observacoes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form.banco.trim()) { toast.error("Nome do banco é obrigatório"); return; }
    setSaving(true);
    const payload = {
      banco: form.banco.trim(), agencia: form.agencia || null, conta: form.conta || null,
      tipo: form.tipo, saldo_inicial: Number(form.saldo_inicial || 0),
      ativo: form.ativo, observacoes: form.observacoes || null,
    };
    const { error } = banco
      ? await supabase.from("contas_bancarias").update(payload).eq("id", banco.id)
      : await supabase.from("contas_bancarias").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(banco ? "Conta atualizada" : "Conta cadastrada");
    onSaved();
  };
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{banco ? "Editar conta bancária" : "Nova conta bancária"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Banco *</Label><Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} placeholder="Banco do Brasil, Sicoob..." /></div>
        <div><Label>Agência</Label><Input value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} /></div>
        <div><Label>Conta</Label><Input value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })} /></div>
        <div><Label>Tipo</Label>
          <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="corrente">Corrente</SelectItem>
              <SelectItem value="poupanca">Poupança</SelectItem>
              <SelectItem value="caixa">Caixa</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Saldo inicial</Label><Input type="number" step="0.01" value={form.saldo_inicial} onChange={(e) => setForm({ ...form, saldo_inicial: e.target.value })} /></div>
        <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}
