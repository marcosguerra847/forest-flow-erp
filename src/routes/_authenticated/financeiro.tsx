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
import {
  FileText, Plus, Pencil, Trash2, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Download, Upload, Landmark, PieChart, Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { toCSV, downloadCSV } from "@/lib/csv";

type NF = {
  id: string; numero: string; serie: string | null; tipo: "entrada" | "saida";
  cliente_id: string | null; fornecedor: string | null; carga_id: string | null; pedido_id: string | null;
  valor: number; data_emissao: string; chave_acesso: string | null;
  status: string; observacoes: string | null;
  xml_url: string | null; pdf_url: string | null;
  cfop: string | null; natureza_operacao: string | null;
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
  centros_custo?: { nome: string; tipo: string } | null;
  contas_bancarias?: { banco: string } | null;
};
type Mov = {
  id: string; tipo: "entrada" | "saida"; data: string; descricao: string;
  categoria: string | null; valor: number; conta_id: string | null;
  forma_pagamento: string | null; observacoes: string | null;
  centro_custo_id: string | null; conta_bancaria_id: string | null;
  conciliado_em: string | null;
  centros_custo?: { nome: string; tipo: string } | null;
  contas_bancarias?: { banco: string } | null;
};
type Cliente = { id: string; nome: string };
type Carga = { id: string; codigo: string };
type Pedido = { id: string; codigo: string };
type Centro = { id: string; nome: string; tipo: string };
type Banco = { id: string; banco: string; agencia: string | null; conta: string | null; saldo_inicial: number; ativo: boolean };

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · Fazenda Bela Vista" }] }),
  component: FinanceiroPage,
});

function firstOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }
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
  const [editBanco, setEditBanco] = useState<Banco | null>(null);

  const [periodo, setPeriodo] = useState({ ini: firstOfMonth(), fim: today() });

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
        .select("*, clientes(nome), centros_custo(nome,tipo), contas_bancarias(banco)")
        .order("vencimento", { ascending: true });
      if (error) throw error;
      return data as unknown as Conta[];
    },
  });
  const { data: movs = [] } = useQuery({
    queryKey: ["movimentacoes_caixa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("movimentacoes_caixa")
        .select("*, centros_custo(nome,tipo), contas_bancarias(banco)")
        .order("data", { ascending: false });
      if (error) throw error;
      return data as unknown as Mov[];
    },
  });
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-lite"],
    queryFn: async () => (await supabase.from("clientes").select("id,nome").order("nome")).data as Cliente[] ?? [],
  });
  const { data: cargas = [] } = useQuery({
    queryKey: ["cargas-lite"],
    queryFn: async () => (await supabase.from("cargas").select("id,codigo").order("codigo", { ascending: false }).limit(300)).data as Carga[] ?? [],
  });
  const { data: pedidos = [] } = useQuery({
    queryKey: ["pedidos-lite"],
    queryFn: async () => (await supabase.from("pedidos").select("id,codigo").order("codigo", { ascending: false }).limit(300)).data as Pedido[] ?? [],
  });
  const { data: centros = [] } = useQuery({
    queryKey: ["centros_custo"],
    queryFn: async () => (await supabase.from("centros_custo").select("id,nome,tipo").eq("ativo", true).order("nome")).data as Centro[] ?? [],
  });
  const { data: bancos = [] } = useQuery({
    queryKey: ["contas_bancarias"],
    queryFn: async () => (await supabase.from("contas_bancarias").select("*").order("banco")).data as Banco[] ?? [],
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
      const hoje = today();
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
    mutationFn: async ({ id, conciliar }: { id: string; conciliar: boolean }) => {
      const { error } = await supabase.from("movimentacoes_caixa")
        .update({ conciliado_em: conciliar ? new Date().toISOString() : null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movimentacoes_caixa"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Filtros por período aplicados às tabs
  const movsPeriodo = useMemo(
    () => movs.filter((m) => m.data >= periodo.ini && m.data <= periodo.fim),
    [movs, periodo],
  );
  const nfsPeriodo = useMemo(
    () => nfs.filter((n) => n.data_emissao >= periodo.ini && n.data_emissao <= periodo.fim),
    [nfs, periodo],
  );

  const kpis = useMemo(() => {
    const aReceber = contas.filter(c => c.tipo === "receber" && c.status === "aberto").reduce((s, c) => s + Number(c.valor), 0);
    const aPagar = contas.filter(c => c.tipo === "pagar" && c.status === "aberto").reduce((s, c) => s + Number(c.valor), 0);
    const entradas = movsPeriodo.filter(m => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor), 0);
    const saidas = movsPeriodo.filter(m => m.tipo === "saida").reduce((s, m) => s + Number(m.valor), 0);
    return { aReceber, aPagar, saldo: entradas - saidas, entradas, saidas };
  }, [contas, movsPeriodo]);

  // DRE por centro de custo (tipo)
  const dre = useMemo(() => {
    const grupos: Record<string, { entradas: number; saidas: number }> = {};
    for (const c of centros) grupos[c.tipo] = { entradas: 0, saidas: 0 };
    grupos["sem_classificacao"] = { entradas: 0, saidas: 0 };
    for (const m of movsPeriodo) {
      const tipo = m.centros_custo?.tipo ?? "sem_classificacao";
      if (!grupos[tipo]) grupos[tipo] = { entradas: 0, saidas: 0 };
      grupos[tipo][m.tipo === "entrada" ? "entradas" : "saidas"] += Number(m.valor);
    }
    const receitas = Object.values(grupos).reduce((s, g) => s + g.entradas, 0);
    const custoColheita = grupos["colheita"]?.saidas ?? 0;
    const custoTransporte = grupos["transporte"]?.saidas ?? 0;
    const custoSerraria = grupos["serraria"]?.saidas ?? 0;
    const custoOperacional = custoColheita + custoTransporte + custoSerraria;
    const admin = grupos["administrativo"]?.saidas ?? 0;
    const comercial = grupos["comercial"]?.saidas ?? 0;
    const outros = (grupos["sem_classificacao"]?.saidas ?? 0);
    const lucroBruto = receitas - custoOperacional;
    const resultado = lucroBruto - admin - comercial - outros;
    return { receitas, custoColheita, custoTransporte, custoSerraria, custoOperacional, admin, comercial, outros, lucroBruto, resultado, grupos };
  }, [movsPeriodo, centros]);

  // Saldos por banco (saldo_inicial + conciliadas do período)
  const saldosBanco = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bancos) map.set(b.id, Number(b.saldo_inicial || 0));
    for (const m of movs) {
      if (!m.conta_bancaria_id || !m.conciliado_em) continue;
      const s = map.get(m.conta_bancaria_id) ?? 0;
      map.set(m.conta_bancaria_id, s + (m.tipo === "entrada" ? Number(m.valor) : -Number(m.valor)));
    }
    return map;
  }, [bancos, movs]);

  const exportContasCSV = () => {
    const rows = contas.map((c) => ({
      tipo: c.tipo, descricao: c.descricao, categoria: c.categoria ?? "",
      cliente_fornecedor: c.clientes?.nome ?? c.fornecedor ?? "",
      centro_custo: c.centros_custo?.nome ?? "", banco: c.contas_bancarias?.banco ?? "",
      valor: c.valor, vencimento: c.vencimento, data_pagamento: c.data_pagamento ?? "", status: c.status,
    }));
    downloadCSV(`contas_${today()}.csv`, toCSV(rows, [
      { key: "tipo", label: "Tipo" }, { key: "descricao", label: "Descrição" }, { key: "categoria", label: "Categoria" },
      { key: "cliente_fornecedor", label: "Cliente/Fornecedor" }, { key: "centro_custo", label: "Centro de custo" },
      { key: "banco", label: "Banco" }, { key: "valor", label: "Valor" },
      { key: "vencimento", label: "Vencimento" }, { key: "data_pagamento", label: "Pagamento" }, { key: "status", label: "Status" },
    ]));
  };
  const exportMovsCSV = () => {
    const rows = movsPeriodo.map((m) => ({
      data: m.data, tipo: m.tipo, descricao: m.descricao, categoria: m.categoria ?? "",
      centro_custo: m.centros_custo?.nome ?? "", banco: m.contas_bancarias?.banco ?? "",
      forma_pagamento: m.forma_pagamento ?? "", valor: m.valor, conciliado: m.conciliado_em ? "sim" : "não",
    }));
    downloadCSV(`fluxo_caixa_${periodo.ini}_a_${periodo.fim}.csv`, toCSV(rows, [
      { key: "data", label: "Data" }, { key: "tipo", label: "Tipo" }, { key: "descricao", label: "Descrição" },
      { key: "categoria", label: "Categoria" }, { key: "centro_custo", label: "Centro de custo" },
      { key: "banco", label: "Banco" }, { key: "forma_pagamento", label: "Forma" }, { key: "valor", label: "Valor" },
      { key: "conciliado", label: "Conciliado" },
    ]));
  };
  const exportNFsCSV = () => {
    const rows = nfsPeriodo.map((n) => ({
      numero: n.numero, serie: n.serie ?? "", tipo: n.tipo,
      cliente_fornecedor: n.clientes?.nome ?? n.fornecedor ?? "",
      carga: n.cargas?.codigo ?? "", pedido: n.pedidos?.codigo ?? "",
      chave: n.chave_acesso ?? "", valor: n.valor, data: n.data_emissao, status: n.status,
    }));
    downloadCSV(`notas_fiscais_${periodo.ini}_a_${periodo.fim}.csv`, toCSV(rows, [
      { key: "numero", label: "Número" }, { key: "serie", label: "Série" }, { key: "tipo", label: "Tipo" },
      { key: "cliente_fornecedor", label: "Cliente/Fornecedor" }, { key: "carga", label: "Carga" },
      { key: "pedido", label: "Pedido" }, { key: "chave", label: "Chave" }, { key: "valor", label: "Valor" },
      { key: "data", label: "Emissão" }, { key: "status", label: "Status" },
    ]));
  };
  const exportDRECSV = () => {
    const rows = [
      { linha: "Receitas", valor: dre.receitas },
      { linha: "(-) Custo Colheita", valor: -dre.custoColheita },
      { linha: "(-) Custo Transporte", valor: -dre.custoTransporte },
      { linha: "(-) Custo Serraria", valor: -dre.custoSerraria },
      { linha: "Lucro Bruto", valor: dre.lucroBruto },
      { linha: "(-) Administrativo", valor: -dre.admin },
      { linha: "(-) Comercial", valor: -dre.comercial },
      { linha: "(-) Outros", valor: -dre.outros },
      { linha: "Resultado", valor: dre.resultado },
    ];
    downloadCSV(`dre_${periodo.ini}_a_${periodo.fim}.csv`, toCSV(rows, [
      { key: "linha", label: "Linha" }, { key: "valor", label: "Valor" },
    ]));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Comercial"
        title="Financeiro da fazenda"
        description="Notas fiscais, contas, fluxo de caixa, conciliação bancária e DRE."
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card/50 p-3">
        <div><Label className="text-xs">Período — de</Label><Input type="date" value={periodo.ini} onChange={(e) => setPeriodo({ ...periodo, ini: e.target.value })} /></div>
        <div><Label className="text-xs">até</Label><Input type="date" value={periodo.fim} onChange={(e) => setPeriodo({ ...periodo, fim: e.target.value })} /></div>
        <Button variant="outline" size="sm" onClick={() => setPeriodo({ ini: firstOfMonth(), fim: today() })}>Mês atual</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="A receber" value={fmt(kpis.aReceber)} icon={ArrowDownRight} tone="success" />
        <KpiCard label="A pagar" value={fmt(kpis.aPagar)} icon={ArrowUpRight} tone="warning" />
        <KpiCard label="Saldo do período" value={fmt(kpis.saldo)} icon={Wallet} tone={kpis.saldo >= 0 ? "success" : "danger"} />
        <KpiCard label="Movimentações" value={movsPeriodo.length} icon={FileText} />
      </div>

      <Tabs defaultValue="contas" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="contas">Contas a Pagar/Receber</TabsTrigger>
          <TabsTrigger value="nfs">Notas Fiscais</TabsTrigger>
          <TabsTrigger value="caixa">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="bancos">Bancos</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="contas" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Contas</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportContasCSV}><Download className="mr-1 h-4 w-4" /> CSV</Button>
              <Dialog open={openConta} onOpenChange={(o) => { setOpenConta(o); if (!o) setEditConta(null); }}>
                <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova conta</Button></DialogTrigger>
                <ContaForm conta={editConta} clientes={clientes} nfs={nfs} centros={centros} bancos={bancos} onSaved={() => { setOpenConta(false); setEditConta(null); qc.invalidateQueries({ queryKey: ["contas_financeiras"] }); }} />
              </Dialog>
            </div>
          </div>
          {contas.length === 0 ? (
            <Empty>Nenhuma conta cadastrada.</Empty>
          ) : (
            <DataTable rows={contas} columns={[
              { key: "tipo", label: "Tipo", render: (r) => <StatusBadge tone={r.tipo === "receber" ? "success" : "warning"}>{r.tipo === "receber" ? "A receber" : "A pagar"}</StatusBadge> },
              { key: "descricao", label: "Descrição" },
              { key: "parte", label: "Cliente/Fornecedor", render: (r) => r.clientes?.nome ?? r.fornecedor ?? "—" },
              { key: "centro", label: "Centro custo", render: (r) => r.centros_custo?.nome ?? "—" },
              { key: "banco", label: "Banco", render: (r) => r.contas_bancarias?.banco ?? "—" },
              { key: "valor", label: "Valor (R$)", align: "right", render: (r) => Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
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
            <h2 className="font-display text-lg font-semibold">Notas Fiscais ({periodo.ini} → {periodo.fim})</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportNFsCSV}><Download className="mr-1 h-4 w-4" /> CSV</Button>
              <Dialog open={openNF} onOpenChange={(o) => { setOpenNF(o); if (!o) setEditNF(null); }}>
                <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova NF</Button></DialogTrigger>
                <NFForm nf={editNF} clientes={clientes} cargas={cargas} pedidos={pedidos} onSaved={() => { setOpenNF(false); setEditNF(null); qc.invalidateQueries({ queryKey: ["notas_fiscais"] }); }} />
              </Dialog>
            </div>
          </div>
          {nfsPeriodo.length === 0 ? (
            <Empty>Nenhuma nota fiscal no período.</Empty>
          ) : (
            <DataTable rows={nfsPeriodo} columns={[
              { key: "numero", label: "Número" },
              { key: "serie", label: "Série", render: (r) => r.serie ?? "—" },
              { key: "tipo", label: "Tipo", render: (r) => <StatusBadge tone={r.tipo === "saida" ? "success" : "info"}>{r.tipo === "saida" ? "Saída" : "Entrada"}</StatusBadge> },
              { key: "parte", label: "Cliente/Fornecedor", render: (r) => r.clientes?.nome ?? r.fornecedor ?? "—" },
              { key: "carga", label: "Carga", render: (r) => r.cargas?.codigo ?? "—" },
              { key: "pedido", label: "Pedido", render: (r) => r.pedidos?.codigo ?? "—" },
              { key: "valor", label: "Valor (R$)", align: "right", render: (r) => Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
              { key: "data_emissao", label: "Emissão" },
              { key: "anexos", label: "Anexos", render: (r) => (
                <div className="flex gap-2 text-xs">
                  {r.xml_url && <a href={r.xml_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">XML</a>}
                  {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">PDF</a>}
                  {!r.xml_url && !r.pdf_url && "—"}
                </div>
              ) },
              { key: "status", label: "Status", render: (r) => <StatusBadge tone="info">{r.status}</StatusBadge> },
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
              <Button variant="outline" size="sm" onClick={exportMovsCSV}><Download className="mr-1 h-4 w-4" /> CSV</Button>
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
          {movsPeriodo.length === 0 ? (
            <Empty>Sem movimentações no período.</Empty>
          ) : (
            <DataTable rows={movsPeriodo} columns={[
              { key: "data", label: "Data" },
              { key: "tipo", label: "Tipo", render: (r) => <StatusBadge tone={r.tipo === "entrada" ? "success" : "danger"}>{r.tipo}</StatusBadge> },
              { key: "descricao", label: "Descrição" },
              { key: "centro", label: "Centro", render: (r) => r.centros_custo?.nome ?? "—" },
              { key: "banco", label: "Banco", render: (r) => r.contas_bancarias?.banco ?? "—" },
              { key: "forma_pagamento", label: "Forma", render: (r) => r.forma_pagamento ?? "—" },
              { key: "valor", label: "Valor (R$)", align: "right", render: (r) => Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
              { key: "conc", label: "Conciliado", render: (r) => r.conciliado_em
                ? <StatusBadge tone="success">Sim</StatusBadge>
                : <StatusBadge tone="warning">Não</StatusBadge> },
              { key: "acoes", label: "", render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" title={r.conciliado_em ? "Desfazer conciliação" : "Conciliar"}
                    onClick={() => conciliar.mutate({ id: r.id, conciliar: !r.conciliado_em })}>
                    <LinkIcon className={`h-3.5 w-3.5 ${r.conciliado_em ? "text-primary" : ""}`} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditMov(r); setOpenMov(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir lançamento?")) delMov.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ) },
            ]} />
          )}
        </TabsContent>

        <TabsContent value="bancos" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Contas bancárias</h2>
            <Dialog open={openBanco} onOpenChange={(o) => { setOpenBanco(o); if (!o) setEditBanco(null); }}>
              <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova conta bancária</Button></DialogTrigger>
              <BancoForm banco={editBanco} onSaved={() => { setOpenBanco(false); setEditBanco(null); qc.invalidateQueries({ queryKey: ["contas_bancarias"] }); }} />
            </Dialog>
          </div>
          {bancos.length === 0 ? (
            <Empty>Cadastre a primeira conta bancária para começar a conciliar.</Empty>
          ) : (
            <DataTable rows={bancos.map((b) => ({ ...b, saldo_atual: saldosBanco.get(b.id) ?? Number(b.saldo_inicial || 0) }))} columns={[
              { key: "banco", label: "Banco", render: (r) => <span className="flex items-center gap-1"><Landmark className="h-3.5 w-3.5" /> {r.banco}</span> },
              { key: "agencia", label: "Agência", render: (r) => r.agencia ?? "—" },
              { key: "conta", label: "Conta", render: (r) => r.conta ?? "—" },
              { key: "saldo_inicial", label: "Saldo inicial", align: "right", render: (r) => fmt(Number(r.saldo_inicial)) },
              { key: "saldo_atual", label: "Saldo (conciliado)", align: "right", render: (r) => <b>{fmt(r.saldo_atual as number)}</b> },
              { key: "ativo", label: "Status", render: (r) => <StatusBadge tone={r.ativo ? "success" : "danger"}>{r.ativo ? "Ativo" : "Inativo"}</StatusBadge> },
              { key: "acoes", label: "", render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditBanco(r as unknown as Banco); setOpenBanco(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir conta ${r.banco}?`)) delBanco.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ) },
            ]} />
          )}
          <p className="text-xs text-muted-foreground">
            Saldo conciliado = saldo inicial + somatório das movimentações vinculadas ao banco e marcadas como conciliadas.
          </p>
        </TabsContent>

        <TabsContent value="dre" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2"><PieChart className="h-4 w-4" /> DRE — {periodo.ini} a {periodo.fim}</h2>
            <Button variant="outline" size="sm" onClick={exportDRECSV}><Download className="mr-1 h-4 w-4" /> CSV</Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <tbody>
                <DreRow label="Receitas (todas as entradas)" value={dre.receitas} tone="pos" bold />
                <DreRow label="(−) Custo Colheita" value={-dre.custoColheita} tone="neg" />
                <DreRow label="(−) Custo Transporte" value={-dre.custoTransporte} tone="neg" />
                <DreRow label="(−) Custo Serraria" value={-dre.custoSerraria} tone="neg" />
                <DreRow label="Lucro Bruto" value={dre.lucroBruto} tone={dre.lucroBruto >= 0 ? "pos" : "neg"} bold />
                <DreRow label="(−) Despesas Administrativas" value={-dre.admin} tone="neg" />
                <DreRow label="(−) Despesas Comerciais" value={-dre.comercial} tone="neg" />
                <DreRow label="(−) Outros / não classificados" value={-dre.outros} tone="neg" />
                <DreRow label="Resultado do período" value={dre.resultado} tone={dre.resultado >= 0 ? "pos" : "neg"} bold big />
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Baseado nas movimentações do período agrupadas pelo tipo do centro de custo (colheita, transporte, serraria, administrativo, comercial). Lançamentos sem centro de custo entram em “Outros”.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">{children}</div>;
}

function DreRow({ label, value, tone, bold, big }: { label: string; value: number; tone: "pos" | "neg"; bold?: boolean; big?: boolean }) {
  return (
    <tr className={`border-b border-border/50 ${big ? "bg-secondary/40" : ""}`}>
      <td className={`p-3 ${bold ? "font-semibold" : ""}`}>{label}</td>
      <td className={`p-3 text-right ${bold ? "font-semibold" : ""} ${tone === "pos" ? "text-emerald-500" : "text-rose-400"} ${big ? "text-lg" : ""}`}>{fmt(value)}</td>
    </tr>
  );
}

/* ================= FORMS ================= */

function ContaForm({ conta, clientes, nfs, centros, bancos, onSaved }: { conta: Conta | null; clientes: Cliente[]; nfs: NF[]; centros: Centro[]; bancos: Banco[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    tipo: conta?.tipo ?? "receber",
    descricao: conta?.descricao ?? "",
    categoria: conta?.categoria ?? "",
    valor: conta?.valor?.toString() ?? "",
    vencimento: conta?.vencimento ?? today(),
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
    <DialogContent className="max-w-lg">
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
            <SelectContent><SelectItem value="none">—</SelectItem>{centros.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.tipo})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Cliente</Label>
          <Select value={form.cliente_id || "none"} onValueChange={(v) => setForm({ ...form, cliente_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
        <div className="col-span-2"><Label>Conta bancária</Label>
          <Select value={form.conta_bancaria_id || "none"} onValueChange={(v) => setForm({ ...form, conta_bancaria_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.banco}{b.conta ? ` · ${b.conta}` : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
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
    data_emissao: nf?.data_emissao ?? today(),
    chave_acesso: nf?.chave_acesso ?? "", status: nf?.status ?? "emitida",
    cfop: nf?.cfop ?? "", natureza_operacao: nf?.natureza_operacao ?? "",
    xml_url: nf?.xml_url ?? "", pdf_url: nf?.pdf_url ?? "",
    observacoes: nf?.observacoes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"xml" | "pdf" | null>(null);
  const xmlRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const uploadAnexo = async (kind: "xml" | "pdf", file: File) => {
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() || kind;
      const numero = form.numero.trim() || "sem-numero";
      const path = `${numero}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("nf-anexos").upload(path, file, { contentType: file.type, upsert: true });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from("nf-anexos").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? "";
      setForm((f) => ({ ...f, [kind === "xml" ? "xml_url" : "pdf_url"]: url }));
      toast.success(`${kind.toUpperCase()} enviado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally { setUploading(null); }
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
      status: form.status,
      cfop: form.cfop || null, natureza_operacao: form.natureza_operacao || null,
      xml_url: form.xml_url || null, pdf_url: form.pdf_url || null,
      observacoes: form.observacoes || null,
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
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{nf ? "Editar NF" : "Nova nota fiscal"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
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
        <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        <div><Label>Data emissão</Label><Input type="date" value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} /></div>
        <div><Label>CFOP</Label><Input value={form.cfop} onChange={(e) => setForm({ ...form, cfop: e.target.value })} placeholder="Ex: 5102" /></div>
        <div><Label>Natureza da operação</Label><Input value={form.natureza_operacao} onChange={(e) => setForm({ ...form, natureza_operacao: e.target.value })} /></div>
        <div><Label>Cliente</Label>
          <Select value={form.cliente_id || "none"} onValueChange={(v) => setForm({ ...form, cliente_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
        <div><Label>Carga vinculada</Label>
          <Select value={form.carga_id || "none"} onValueChange={(v) => setForm({ ...form, carga_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{cargas.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Pedido vinculado</Label>
          <Select value={form.pedido_id || "none"} onValueChange={(v) => setForm({ ...form, pedido_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{pedidos.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Chave de acesso (44 dígitos)</Label><Input value={form.chave_acesso} onChange={(e) => setForm({ ...form, chave_acesso: e.target.value })} /></div>

        <div className="col-span-2 grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-secondary/20 p-3">
          <div>
            <Label className="text-xs flex items-center gap-1"><Upload className="h-3.5 w-3.5" /> Anexar XML</Label>
            <Input ref={xmlRef} type="file" accept=".xml,text/xml,application/xml" onChange={(e) => e.target.files?.[0] && uploadAnexo("xml", e.target.files[0])} disabled={uploading === "xml"} />
            {form.xml_url && <a href={form.xml_url} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-primary hover:underline">Ver XML enviado</a>}
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1"><Upload className="h-3.5 w-3.5" /> Anexar PDF (DANFE)</Label>
            <Input ref={pdfRef} type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && uploadAnexo("pdf", e.target.files[0])} disabled={uploading === "pdf"} />
            {form.pdf_url && <a href={form.pdf_url} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-primary hover:underline">Ver PDF enviado</a>}
          </div>
        </div>

        <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

function MovForm({ mov, centros, bancos, onSaved }: { mov: Mov | null; centros: Centro[]; bancos: Banco[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    tipo: mov?.tipo ?? "entrada", data: mov?.data ?? today(),
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
      forma_pagamento: form.forma_pagamento || null,
      centro_custo_id: form.centro_custo_id || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      observacoes: form.observacoes || null,
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
    <DialogContent className="max-w-lg">
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
            <SelectContent><SelectItem value="none">—</SelectItem>{centros.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.tipo})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Conta bancária</Label>
          <Select value={form.conta_bancaria_id || "none"} onValueChange={(v) => setForm({ ...form, conta_bancaria_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.banco}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Forma de pagamento</Label><Input value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })} placeholder="Pix, dinheiro, boleto..." /></div>
        <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

function BancoForm({ banco, onSaved }: { banco: Banco | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    banco: banco?.banco ?? "", agencia: banco?.agencia ?? "", conta: banco?.conta ?? "",
    saldo_inicial: banco?.saldo_inicial?.toString() ?? "0", ativo: banco?.ativo ?? true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.banco.trim()) { toast.error("Informe o banco"); return; }
    setSaving(true);
    const payload = {
      banco: form.banco.trim(), agencia: form.agencia || null, conta: form.conta || null,
      saldo_inicial: Number(form.saldo_inicial || 0), ativo: form.ativo,
    };
    const { error } = banco
      ? await supabase.from("contas_bancarias").update(payload).eq("id", banco.id)
      : await supabase.from("contas_bancarias").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(banco ? "Conta atualizada" : "Conta criada");
    onSaved();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{banco ? "Editar conta bancária" : "Nova conta bancária"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Banco *</Label><Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} placeholder="Ex: Banco do Brasil" /></div>
        <div><Label>Agência</Label><Input value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} /></div>
        <div><Label>Conta</Label><Input value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })} /></div>
        <div><Label>Saldo inicial (R$)</Label><Input type="number" step="0.01" value={form.saldo_inicial} onChange={(e) => setForm({ ...form, saldo_inicial: e.target.value })} /></div>
        <div><Label>Status</Label>
          <Select value={form.ativo ? "1" : "0"} onValueChange={(v) => setForm({ ...form, ativo: v === "1" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="1">Ativo</SelectItem><SelectItem value="0">Inativo</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}
