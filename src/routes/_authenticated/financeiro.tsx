import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
import { FileText, Plus, Pencil, Trash2, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type NF = {
  id: string; numero: string; serie: string | null; tipo: "entrada" | "saida";
  cliente_id: string | null; fornecedor: string | null; carga_id: string | null;
  valor: number; data_emissao: string; chave_acesso: string | null;
  status: string; observacoes: string | null;
  clientes?: { nome: string } | null;
  cargas?: { codigo: string } | null;
};
type Conta = {
  id: string; tipo: "pagar" | "receber"; descricao: string; categoria: string | null;
  valor: number; vencimento: string; data_pagamento: string | null; status: string;
  cliente_id: string | null; fornecedor: string | null; nf_id: string | null;
  observacoes: string | null;
  clientes?: { nome: string } | null;
};
type Mov = {
  id: string; tipo: "entrada" | "saida"; data: string; descricao: string;
  categoria: string | null; valor: number; conta_id: string | null;
  forma_pagamento: string | null; observacoes: string | null;
};
type Cliente = { id: string; nome: string };
type Carga = { id: string; codigo: string };

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · Fazenda Bela Vista" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const qc = useQueryClient();
  const [openNF, setOpenNF] = useState(false);
  const [editNF, setEditNF] = useState<NF | null>(null);
  const [openConta, setOpenConta] = useState(false);
  const [editConta, setEditConta] = useState<Conta | null>(null);
  const [openMov, setOpenMov] = useState(false);
  const [editMov, setEditMov] = useState<Mov | null>(null);

  const { data: nfs = [] } = useQuery({
    queryKey: ["notas_fiscais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notas_fiscais")
        .select("*, clientes(nome), cargas(codigo)").order("data_emissao", { ascending: false });
      if (error) throw error;
      return data as unknown as NF[];
    },
  });
  const { data: contas = [] } = useQuery({
    queryKey: ["contas_financeiras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contas_financeiras")
        .select("*, clientes(nome)").order("vencimento", { ascending: true });
      if (error) throw error;
      return data as unknown as Conta[];
    },
  });
  const { data: movs = [] } = useQuery({
    queryKey: ["movimentacoes_caixa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("movimentacoes_caixa").select("*").order("data", { ascending: false });
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
      });
    },
    onSuccess: () => {
      toast.success("Conta baixada e lançada no caixa");
      qc.invalidateQueries({ queryKey: ["contas_financeiras"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const kpis = useMemo(() => {
    const aReceber = contas.filter(c => c.tipo === "receber" && c.status === "aberto").reduce((s, c) => s + Number(c.valor), 0);
    const aPagar = contas.filter(c => c.tipo === "pagar" && c.status === "aberto").reduce((s, c) => s + Number(c.valor), 0);
    const entradas = movs.filter(m => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor), 0);
    const saidas = movs.filter(m => m.tipo === "saida").reduce((s, m) => s + Number(m.valor), 0);
    return { aReceber, aPagar, saldo: entradas - saidas, entradas, saidas };
  }, [contas, movs]);

  const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Comercial"
        title="Financeiro da fazenda"
        description="Notas fiscais, contas a pagar e receber, e fluxo de caixa."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="A receber" value={fmt(kpis.aReceber)} icon={ArrowDownRight} tone="success" />
        <KpiCard label="A pagar" value={fmt(kpis.aPagar)} icon={ArrowUpRight} tone="warning" />
        <KpiCard label="Saldo de caixa" value={fmt(kpis.saldo)} icon={Wallet} tone={kpis.saldo >= 0 ? "success" : "danger"} />
        <KpiCard label="Movimentações" value={movs.length} icon={FileText} />
      </div>

      <Tabs defaultValue="contas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contas">Contas a Pagar/Receber</TabsTrigger>
          <TabsTrigger value="nfs">Notas Fiscais</TabsTrigger>
          <TabsTrigger value="caixa">Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="contas" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Contas</h2>
            <Dialog open={openConta} onOpenChange={(o) => { setOpenConta(o); if (!o) setEditConta(null); }}>
              <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova conta</Button></DialogTrigger>
              <ContaForm conta={editConta} clientes={clientes} nfs={nfs} onSaved={() => { setOpenConta(false); setEditConta(null); qc.invalidateQueries({ queryKey: ["contas_financeiras"] }); }} />
            </Dialog>
          </div>
          {contas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Nenhuma conta cadastrada.</div>
          ) : (
            <DataTable rows={contas} columns={[
              { key: "tipo", label: "Tipo", render: (r) => <StatusBadge tone={r.tipo === "receber" ? "success" : "warning"}>{r.tipo === "receber" ? "A receber" : "A pagar"}</StatusBadge> },
              { key: "descricao", label: "Descrição" },
              { key: "parte", label: "Cliente/Fornecedor", render: (r) => r.clientes?.nome ?? r.fornecedor ?? "—" },
              { key: "categoria", label: "Categoria", render: (r) => r.categoria ?? "—" },
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
            <h2 className="font-display text-lg font-semibold">Notas Fiscais</h2>
            <Dialog open={openNF} onOpenChange={(o) => { setOpenNF(o); if (!o) setEditNF(null); }}>
              <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova NF</Button></DialogTrigger>
              <NFForm nf={editNF} clientes={clientes} cargas={cargas} onSaved={() => { setOpenNF(false); setEditNF(null); qc.invalidateQueries({ queryKey: ["notas_fiscais"] }); }} />
            </Dialog>
          </div>
          {nfs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Nenhuma nota fiscal cadastrada.</div>
          ) : (
            <DataTable rows={nfs} columns={[
              { key: "numero", label: "Número" },
              { key: "serie", label: "Série", render: (r) => r.serie ?? "—" },
              { key: "tipo", label: "Tipo", render: (r) => <StatusBadge tone={r.tipo === "saida" ? "success" : "info"}>{r.tipo === "saida" ? "Saída" : "Entrada"}</StatusBadge> },
              { key: "parte", label: "Cliente/Fornecedor", render: (r) => r.clientes?.nome ?? r.fornecedor ?? "—" },
              { key: "carga", label: "Carga", render: (r) => r.cargas?.codigo ?? "—" },
              { key: "valor", label: "Valor (R$)", align: "right", render: (r) => Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
              { key: "data_emissao", label: "Emissão" },
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
            <Dialog open={openMov} onOpenChange={(o) => { setOpenMov(o); if (!o) setEditMov(null); }}>
              <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Lançamento</Button></DialogTrigger>
              <MovForm mov={editMov} onSaved={() => { setOpenMov(false); setEditMov(null); qc.invalidateQueries({ queryKey: ["movimentacoes_caixa"] }); }} />
            </Dialog>
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
              { key: "categoria", label: "Categoria", render: (r) => r.categoria ?? "—" },
              { key: "forma_pagamento", label: "Forma", render: (r) => r.forma_pagamento ?? "—" },
              { key: "valor", label: "Valor (R$)", align: "right", render: (r) => Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
              { key: "acoes", label: "", render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditMov(r); setOpenMov(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir lançamento?")) delMov.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ) },
            ]} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContaForm({ conta, clientes, nfs, onSaved }: { conta: Conta | null; clientes: Cliente[]; nfs: NF[]; onSaved: () => void }) {
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
      nf_id: form.nf_id || null, observacoes: form.observacoes || null,
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
        <div><Label>Cliente</Label>
          <Select value={form.cliente_id || "none"} onValueChange={(v) => setForm({ ...form, cliente_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
        <div className="col-span-2"><Label>NF vinculada</Label>
          <Select value={form.nf_id || "none"} onValueChange={(v) => setForm({ ...form, nf_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{nfs.map(n => <SelectItem key={n.id} value={n.id}>NF {n.numero} · {fmtBr(n.valor)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

function NFForm({ nf, clientes, cargas, onSaved }: { nf: NF | null; clientes: Cliente[]; cargas: Carga[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    numero: nf?.numero ?? "", serie: nf?.serie ?? "",
    tipo: nf?.tipo ?? "saida",
    cliente_id: nf?.cliente_id ?? "", fornecedor: nf?.fornecedor ?? "",
    carga_id: nf?.carga_id ?? "",
    valor: nf?.valor?.toString() ?? "",
    data_emissao: nf?.data_emissao ?? new Date().toISOString().slice(0, 10),
    chave_acesso: nf?.chave_acesso ?? "", status: nf?.status ?? "emitida",
    observacoes: nf?.observacoes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.numero.trim() || !form.valor) { toast.error("Número e valor são obrigatórios"); return; }
    setSaving(true);
    const payload = {
      numero: form.numero.trim(), serie: form.serie || null, tipo: form.tipo,
      cliente_id: form.cliente_id || null, fornecedor: form.fornecedor || null,
      carga_id: form.carga_id || null, valor: Number(form.valor),
      data_emissao: form.data_emissao, chave_acesso: form.chave_acesso || null,
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
    <DialogContent className="max-w-lg">
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
              <SelectItem value="emitida">Emitida</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="autorizada">Autorizada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        <div><Label>Data emissão</Label><Input type="date" value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} /></div>
        <div><Label>Cliente</Label>
          <Select value={form.cliente_id || "none"} onValueChange={(v) => setForm({ ...form, cliente_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
        <div className="col-span-2"><Label>Carga vinculada</Label>
          <Select value={form.carga_id || "none"} onValueChange={(v) => setForm({ ...form, carga_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{cargas.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Chave de acesso (44 dígitos)</Label><Input value={form.chave_acesso} onChange={(e) => setForm({ ...form, chave_acesso: e.target.value })} /></div>
        <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

function MovForm({ mov, onSaved }: { mov: Mov | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    tipo: mov?.tipo ?? "entrada", data: mov?.data ?? new Date().toISOString().slice(0, 10),
    descricao: mov?.descricao ?? "", categoria: mov?.categoria ?? "",
    valor: mov?.valor?.toString() ?? "", forma_pagamento: mov?.forma_pagamento ?? "",
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
        <div className="col-span-2"><Label>Forma de pagamento</Label><Input value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })} placeholder="Pix, dinheiro, boleto..." /></div>
        <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

function fmtBr(n: number) { return `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`; }
