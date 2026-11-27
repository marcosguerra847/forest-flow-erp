import { farmPageHead } from "@/lib/page-head";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Users, ShoppingCart, DollarSign, FileText, Plus, Pencil, Trash2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { PedidoForm, type PedidoVenda as Pedido, statusPedido } from "@/components/PedidoForm";

type Cliente = {
  id: string; nome: string; documento: string | null; telefone: string | null;
  email: string | null; endereco: string | null; cidade: string | null; uf: string | null;
  limite_credito: number; observacoes: string | null; ativo: boolean;
};


export const Route = createFileRoute("/_authenticated/comercial")({
  head: () => farmPageHead("Comercial", "Cadastro de clientes e controle de pedidos."),
  component: ComercialPage,
});

function ComercialPage() {
  const qc = useQueryClient();
  const [openCliente, setOpenCliente] = useState(false);
  const [editCli, setEditCli] = useState<Cliente | null>(null);
  const [openPedido, setOpenPedido] = useState(false);
  const [editPed, setEditPed] = useState<Pedido | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState<string | null>(null);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("nome");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ["pedidos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pedidos").select("*, clientes(nome)").order("data", { ascending: false });
      if (error) throw error;
      return data as unknown as Pedido[];
    },
  });

  const delCliente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cliente excluído"); qc.invalidateQueries({ queryKey: ["clientes"] }); qc.invalidateQueries({ queryKey: ["pedidos"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delPedido = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pedidos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pedido excluído"); qc.invalidateQueries({ queryKey: ["pedidos"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPedidos = pedidos.reduce((s, p) => s + Number(p.valor_total || 0), 0);
  const abertos = pedidos.filter(p => p.status !== "faturado" && p.status !== "cancelado").length;

  const emitirPedido = async (pedido: Pedido, imprimir = false) => {
    const janela = imprimir ? window.open("", "_blank") : null;
    if (janela) janela.document.title = "Pedido — Fazenda Bela Vista";
    setGerandoPdf(pedido.id);
    try {
      const { gerarPedidoPdf } = await import("@/lib/pedido-pdf");
      const cliente = clientes.find(c => c.id === pedido.cliente_id) ?? (pedido.clientes ? { nome: pedido.clientes.nome } : null);
      await gerarPedidoPdf(pedido, cliente, imprimir, janela);
      if (imprimir && !janela) toast.info("O navegador bloqueou a nova aba; o PDF foi baixado para você imprimir.");
    } catch {
      janela?.close();
      toast.error("Não foi possível gerar o PDF do pedido. Tente novamente.");
    } finally { setGerandoPdf(null); }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Vendas"
        title="Clientes e pedidos"
        description="Carteira de clientes, orçamentos e pedidos de venda."
        actions={
          <>
            <Dialog open={openCliente} onOpenChange={(o) => { setOpenCliente(o); if (!o) setEditCli(null); }}>
              <DialogTrigger asChild><Button variant="outline"><Plus className="mr-1 h-4 w-4" /> Cliente</Button></DialogTrigger>
              <ClienteForm cliente={editCli} onSaved={() => { setOpenCliente(false); setEditCli(null); qc.invalidateQueries({ queryKey: ["clientes"] }); }} />
            </Dialog>
            <Dialog open={openPedido} onOpenChange={(o) => { setOpenPedido(o); if (!o) setEditPed(null); }}>
              <DialogTrigger asChild><Button disabled={clientes.length === 0}><Plus className="mr-1 h-4 w-4" /> Pedido</Button></DialogTrigger>
              {openPedido && <PedidoForm key={editPed?.id ?? "novo"} pedido={editPed} clientes={clientes} onSaved={() => { setOpenPedido(false); setEditPed(null); qc.invalidateQueries({ queryKey: ["pedidos"] }); }} />}
            </Dialog>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Clientes ativos" value={clientes.filter(c => c.ativo).length} icon={Users} />
        <KpiCard label="Pedidos abertos" value={abertos} icon={ShoppingCart} />
        <KpiCard label="Valor em pedidos" value={`R$ ${totalPedidos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`} icon={DollarSign} tone="success" />
        <KpiCard label="Total de pedidos" value={pedidos.length} icon={FileText} />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Pedidos de venda</h2>
        {pedidos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nenhum pedido cadastrado.
          </div>
        ) : (
          <DataTable
            rows={pedidos}
            columns={[
              { key: "codigo", label: "Código" },
              { key: "cliente", label: "Cliente", render: (r) => r.clientes?.nome ?? "—" },
              { key: "descricao", label: "Produtos" },
              { key: "qtd_itens", label: "Itens", align: "right" },
              { key: "qtd_blocos", label: "Pacotes", align: "right" },
              { key: "qtd_pecas", label: "Peças", align: "right" },
              { key: "volume_m3", label: "Volume (m³)", align: "right", render: r => Number(r.volume_m3).toFixed(3) },
              { key: "quantidade_venda", label: "Venda", render: r => `${Number(r.quantidade_venda).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${r.unidade_venda === "ton" ? "t" : "m³"}` },
              { key: "data_entrega", label: "Previsão de entrega", render: r => r.data_entrega ? new Date(`${r.data_entrega}T12:00:00`).toLocaleDateString("pt-BR") : "—" },
              { key: "situacao_pagamento", label: "Situação pagto.", render: r => r.situacao_pagamento === "pago" ? "Pago" : r.situacao_pagamento === "permuta" ? "Permuta" : "Pendente" },
              { key: "valor_total", label: "Total (R$)", align: "right", render: (r) => Number(r.valor_total).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) },
              { key: "pagamento", label: "Pagamento" },
              { key: "data", label: "Data" },
              { key: "status", label: "Status", render: (r) => (
                <StatusBadge tone={r.status === "faturado" ? "success" : r.status === "cancelado" ? "default" : "info"}>{statusPedido[r.status] ?? r.status}</StatusBadge>
              ) },
              { key: "acoes", label: "", render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" title="Ver / editar pedido" onClick={() => { setEditPed(r); setOpenPedido(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" title="Baixar PDF do pedido" aria-label={`Baixar PDF do pedido ${r.codigo}`} disabled={gerandoPdf !== null} onClick={() => emitirPedido(r)}><Download className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" title="Imprimir pedido" aria-label={`Imprimir pedido ${r.codigo}`} disabled={gerandoPdf !== null} onClick={() => emitirPedido(r, true)}><Printer className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir pedido ${r.codigo}?`)) delPedido.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ) },
            ]}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Clientes</h2>
        {clientes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado. Use o botão "Cliente" acima.
          </div>
        ) : (
          <DataTable
            rows={clientes}
            columns={[
              { key: "nome", label: "Cliente" },
              { key: "documento", label: "CNPJ/CPF" },
              { key: "telefone", label: "Telefone" },
              { key: "email", label: "E-mail" },
              { key: "cidade", label: "Cidade/UF", render: (r) => [r.cidade, r.uf].filter(Boolean).join("/") || "—" },
              { key: "limite_credito", label: "Limite (R$)", align: "right", render: (r) => Number(r.limite_credito).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) },
              { key: "ativo", label: "Status", render: (r) => <StatusBadge tone={r.ativo ? "success" : "default"}>{r.ativo ? "Ativo" : "Inativo"}</StatusBadge> },
              { key: "acoes", label: "", render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditCli(r); setOpenCliente(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir cliente ${r.nome}? Todos os pedidos vinculados também serão excluídos.`)) delCliente.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ) },
            ]}
          />
        )}
      </section>
    </div>
  );
}

function ClienteForm({ cliente, onSaved }: { cliente: Cliente | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: cliente?.nome ?? "", documento: cliente?.documento ?? "", telefone: cliente?.telefone ?? "",
    email: cliente?.email ?? "", endereco: cliente?.endereco ?? "", cidade: cliente?.cidade ?? "",
    uf: cliente?.uf ?? "", limite_credito: cliente?.limite_credito?.toString() ?? "0",
    observacoes: cliente?.observacoes ?? "", ativo: cliente?.ativo ?? true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      documento: form.documento || null, telefone: form.telefone || null,
      email: form.email || null, endereco: form.endereco || null,
      cidade: form.cidade || null, uf: form.uf || null,
      limite_credito: Number(form.limite_credito) || 0,
      observacoes: form.observacoes || null, ativo: form.ativo,
    };
    const { error } = cliente
      ? await supabase.from("clientes").update(payload).eq("id", cliente.id)
      : await supabase.from("clientes").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(cliente ? "Cliente atualizado" : "Cliente cadastrado");
    onSaved();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>CNPJ/CPF</Label><Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        <div className="sm:col-span-2 space-y-1.5"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="sm:col-span-2 space-y-1.5"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>UF</Label><Input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
        <div className="space-y-1.5"><Label>Limite crédito (R$)</Label><Input type="number" step="0.01" value={form.limite_credito} onChange={(e) => setForm({ ...form, limite_credito: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.ativo ? "1" : "0"} onValueChange={(v) => setForm({ ...form, ativo: v === "1" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="1">Ativo</SelectItem><SelectItem value="0">Inativo</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-1.5"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving || !form.nome.trim()}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
    </DialogContent>
  );
}

