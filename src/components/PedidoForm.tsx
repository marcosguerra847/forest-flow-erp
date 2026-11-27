import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { calcularPedido, numeroPedido, produtoPedidoVazio, type ProdutoPedido } from "@/lib/pedido-calculo";
import { situacoesPedido } from "@/lib/pedido-documento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export type PedidoVenda = Database["public"]["Tables"]["pedidos"]["Row"] & { clientes?: { nome: string } | null };
type ClientePedido = { id: string; nome: string; documento: string | null; telefone: string | null; email?: string | null; endereco: string | null; cidade: string | null; uf: string | null };
export const moedaPedido = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const statusPedido = situacoesPedido;

function itensSalvos(pedido: PedidoVenda | null): ProdutoPedido[] {
  if (!Array.isArray(pedido?.itens) || pedido.itens.length === 0) return [{ ...produtoPedidoVazio(), descricao: pedido?.descricao ?? "" }];
  return pedido.itens.map(i => {
    const item = i && typeof i === "object" && !Array.isArray(i) ? i : {};
    return Object.fromEntries(Object.keys(produtoPedidoVazio()).map(k => [k, String(item[k] ?? "")])) as ProdutoPedido;
  });
}

export function PedidoForm({ pedido, clientes, onSaved }: { pedido: PedidoVenda | null; clientes: ClientePedido[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    codigo: pedido?.codigo ?? `PED-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    cliente_id: pedido?.cliente_id ?? "", data: pedido?.data ?? new Date().toLocaleDateString("en-CA"),
    data_entrega: pedido?.data_entrega ?? "", status: pedido?.status ?? "aberto",
    pagamento: pedido?.pagamento ?? "Pix", situacao_pagamento: pedido?.situacao_pagamento ?? "pendente",
    observacoes: pedido?.observacoes ?? "", tipo_carga: pedido?.tipo_carga ?? "madeira",
    unidade_venda: pedido?.unidade_venda ?? "m3", quantidade: String(pedido?.quantidade_venda || ""), preco: String(pedido?.valor_unitario || ""),
  });
  const [itens, setItens] = useState<ProdutoPedido[]>(() => itensSalvos(pedido));
  // Existing orders without products retain their manually entered amount until products are added.
  const [legado, setLegado] = useState(Boolean(pedido && Array.isArray(pedido.itens) && pedido.itens.length === 0));
  const [valorLegado, setValorLegado] = useState(String(pedido?.valor_total ?? ""));
  const [qtdLegado, setQtdLegado] = useState(String(pedido?.qtd_itens ?? "1"));
  const [saving, setSaving] = useState(false);
  const granel = ["cavaco", "po_serra"].includes(form.tipo_carga);
  const total = calcularPedido(form.tipo_carga, itens, form.unidade_venda, form.quantidade, form.preco);
  const cliente = clientes.find(c => c.id === form.cliente_id);
  const set = (campo: keyof typeof form, v: string) => setForm(f => ({ ...f, [campo]: v }));
  const atualizar = (ix: number, campo: keyof ProdutoPedido, valor: string) => setItens(a => a.map((i, n) => n === ix ? { ...i, [campo]: valor } : i));

  const save = async (baixarPdf = false) => {
    if (!form.cliente_id || !form.codigo.trim() || !form.data) return toast.error("Informe cliente, código e data");
    if (!legado) {
      if (granel) {
        if (numeroPedido(form.quantidade) <= 0 || numeroPedido(form.preco) < 0) return toast.error("Informe quantidade positiva e preço válido");
      } else {
        if (!itens.length || itens.some(i => !i.descricao.trim() || numeroPedido(i.comprimento_m) <= 0 || numeroPedido(i.espessura_m) <= 0 || (form.tipo_carga !== "cilindrica" && numeroPedido(i.largura_m) <= 0) || !Number.isInteger(numeroPedido(i.qtd_blocos)) || numeroPedido(i.qtd_blocos) <= 0 || !Number.isInteger(numeroPedido(i.pecas_por_pacote)) || numeroPedido(i.pecas_por_pacote) <= 0 || numeroPedido(i.valor_unitario) < 0)) return toast.error("Preencha produtos, medidas e quantidades inteiras positivas; o preço não pode ser negativo");
      }
    }
    setSaving(true);
    try {
      const payload = {
        codigo: form.codigo.trim(), cliente_id: form.cliente_id, data: form.data, data_entrega: form.data_entrega || null,
        status: form.status, pagamento: form.pagamento, situacao_pagamento: form.situacao_pagamento,
        observacoes: form.observacoes.trim() || null, tipo_carga: form.tipo_carga,
        descricao: granel ? (form.tipo_carga === "cavaco" ? "Cavaco" : "Pó de serra") : itens.map(i => i.descricao.trim()).filter(Boolean).join("; "),
        itens: legado || granel ? [] : itens.map(i => ({ ...i, largura_m: form.tipo_carga === "cilindrica" ? i.espessura_m : i.largura_m })),
        qtd_itens: legado ? numeroPedido(qtdLegado) : granel ? 1 : itens.length,
        valor_total: legado ? numeroPedido(valorLegado) : total.valor,
        volume_m3: legado ? pedido?.volume_m3 ?? 0 : total.volume,
        qtd_blocos: legado ? pedido?.qtd_blocos ?? 0 : total.pacotes,
        qtd_pecas: legado ? pedido?.qtd_pecas ?? 0 : total.pecas,
        unidade_venda: granel ? form.unidade_venda : "m3", quantidade_venda: granel ? numeroPedido(form.quantidade) : total.volume,
        valor_unitario: granel ? numeroPedido(form.preco) : 0,
      };
      const { error } = pedido ? await supabase.from("pedidos").update(payload).eq("id", pedido.id) : await supabase.from("pedidos").insert(payload);
      if (error) throw error;
      toast.success(pedido ? "Pedido atualizado" : "Pedido criado");
      if (baixarPdf) {
        try {
          const { gerarPedidoPdf } = await import("@/lib/pedido-pdf");
          await gerarPedidoPdf(payload, cliente ?? null);
        } catch {
          toast.error("Pedido salvo, mas não foi possível gerar o PDF. Tente baixar pela lista de pedidos.");
        }
      }
      onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  return <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{pedido ? `Pedido ${pedido.codigo}` : "Novo pedido"}</DialogTitle></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="pedido-codigo">Código</Label><Input id="pedido-codigo" value={form.codigo} onChange={e => set("codigo", e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="pedido-data">Data do pedido</Label><Input id="pedido-data" type="date" value={form.data} onChange={e => set("data", e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="pedido-cliente">Cliente</Label><Select value={form.cliente_id} onValueChange={v => set("cliente_id", v)}><SelectTrigger id="pedido-cliente"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label htmlFor="pedido-entrega">Previsão de entrega</Label><Input id="pedido-entrega" type="date" value={form.data_entrega} onChange={e => set("data_entrega", e.target.value)} /></div>
      {cliente && <div className="sm:col-span-2 text-sm text-muted-foreground">{[cliente.documento, cliente.telefone, cliente.endereco, [cliente.cidade, cliente.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ")}</div>}
      <div className="space-y-1.5"><Label htmlFor="pedido-tipo">Tipo de carga</Label><Select value={form.tipo_carga} onValueChange={v => { set("tipo_carga", v); setLegado(false); }}><SelectTrigger id="pedido-tipo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="madeira">Madeira</SelectItem><SelectItem value="cilindrica">Madeira de eucalipto cilíndrica / roliça</SelectItem><SelectItem value="cavaco">Cavaco</SelectItem><SelectItem value="po_serra">Pó de serra</SelectItem></SelectContent></Select></div>
      <div className="space-y-1.5"><Label htmlFor="pedido-status">Situação do pedido</Label><Select value={form.status} onValueChange={v => set("status", v)}><SelectTrigger id="pedido-status"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusPedido).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
    </div>
    {legado ? <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="pedido-antigo-total">Valor total (R$)</Label><Input id="pedido-antigo-total" value={valorLegado} onChange={e => setValorLegado(e.target.value)} /></div><div><Label htmlFor="pedido-antigo-itens">Qtd. itens</Label><Input id="pedido-antigo-itens" value={qtdLegado} onChange={e => setQtdLegado(e.target.value)} /></div></div>
      <Button variant="outline" onClick={() => setLegado(false)}><Plus className="mr-2 h-4 w-4" />Adicionar medidas e produtos</Button>
    </div> : granel ? <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-1.5"><Label htmlFor="pedido-unidade">Unidade de venda</Label><Select value={form.unidade_venda} onValueChange={v => set("unidade_venda", v)}><SelectTrigger id="pedido-unidade"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="m3">Metro cúbico (m³)</SelectItem><SelectItem value="ton">Tonelada (t)</SelectItem></SelectContent></Select></div>
      <div className="space-y-1.5"><Label htmlFor="pedido-quantidade">Quantidade ({form.unidade_venda === "ton" ? "t" : "m³"})</Label><Input id="pedido-quantidade" inputMode="decimal" value={form.quantidade} onChange={e => set("quantidade", e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="pedido-preco">Preço por {form.unidade_venda === "ton" ? "tonelada" : "m³"} (R$)</Label><Input id="pedido-preco" inputMode="decimal" value={form.preco} onChange={e => set("preco", e.target.value)} /></div>
    </div> : <section className="space-y-3">
      <div className="flex items-center justify-between"><h3 className="font-semibold">Produtos do pedido</h3><Button variant="outline" size="sm" onClick={() => setItens(i => [...i, produtoPedidoVazio()])}><Plus className="mr-1 h-4 w-4" />Adicionar produto</Button></div>
      {itens.map((item, ix) => <div key={ix} className="rounded-lg border p-4 space-y-3">
        <div className="flex justify-between items-center"><h4 className="font-medium">Produto {ix + 1}</h4>{itens.length > 1 && <Button size="icon" variant="ghost" title="Remover produto" onClick={() => setItens(i => i.filter((_, n) => n !== ix))}><Trash2 className="h-4 w-4" /></Button>}</div>
        <div className="grid gap-3 sm:grid-cols-3">
          {([ ["descricao", "Descrição", "text"], ["comprimento_m", "Comprimento (m)", "decimal"], ["espessura_m", form.tipo_carga === "cilindrica" ? "Diâmetro (m)" : "Espessura (m)", "decimal"], ...form.tipo_carga === "cilindrica" ? [] : [["largura_m", "Largura (m)", "decimal"]], ["qtd_blocos", "Quantidade de pacotes", "numeric"], ["pecas_por_pacote", "Peças por pacote", "numeric"], ["valor_unitario", "Preço por m³ (R$)", "decimal"] ] as [keyof ProdutoPedido, string, "text" | "decimal" | "numeric"][]).map(([campo, label, inputMode]) => <div key={campo} className={campo === "descricao" ? "space-y-1.5 sm:col-span-3" : "space-y-1.5"}><Label htmlFor={`pedido-${ix}-${campo}`}>{label}</Label><Input id={`pedido-${ix}-${campo}`} inputMode={inputMode} value={item[campo]} onChange={e => atualizar(ix, campo, e.target.value)} /></div>)}
        </div>
        <div className="text-sm text-muted-foreground">{total.produtos[ix]?.pecas} peças · {total.produtos[ix]?.volume.toFixed(4)} m³ · {moedaPedido(total.produtos[ix]?.valor ?? 0)}</div>
      </div>)}
    </section>}
    {!legado && <div className="rounded-md bg-muted p-3 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span>Pacotes: <b>{total.pacotes}</b></span><span>Peças: <b>{total.pecas}</b></span><span>Volume: <b>{total.volume.toFixed(4)} m³</b></span><span>Total: <b>{moedaPedido(total.valor)}</b></span></div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="pedido-forma">Forma de pagamento</Label><Input id="pedido-forma" value={form.pagamento} onChange={e => set("pagamento", e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="pedido-pagamento">Situação de pagamento</Label><Select value={form.situacao_pagamento} onValueChange={v => set("situacao_pagamento", v)}><SelectTrigger id="pedido-pagamento"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="permuta">Permuta</SelectItem></SelectContent></Select></div>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="pedido-obs">Observações</Label><Textarea id="pedido-obs" value={form.observacoes} onChange={e => set("observacoes", e.target.value)} /></div>
    </div>
    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => save(true)} disabled={saving}><Download className="mr-2 h-4 w-4" />Salvar e baixar PDF</Button><Button onClick={() => save()} disabled={saving}>{saving ? "Salvando..." : "Salvar pedido"}</Button></DialogFooter>
  </DialogContent>;
}