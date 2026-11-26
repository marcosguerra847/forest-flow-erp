import { calcM3Cilindrico } from "./volume-cilindrico.ts";

export type ProdutoPedido = {
  descricao: string;
  comprimento_m: string;
  espessura_m: string;
  largura_m: string;
  qtd_blocos: string;
  pecas_por_pacote: string;
  valor_unitario: string;
};
export const produtoPedidoVazio = (): ProdutoPedido => ({ descricao: "", comprimento_m: "", espessura_m: "", largura_m: "", qtd_blocos: "", pecas_por_pacote: "", valor_unitario: "" });
export const numeroPedido = (v: string) => Number(v.replace(",", ".")) || 0;
export function calcularPedido(tipo: string, itens: ProdutoPedido[], unidade: string, quantidade: string, preco: string) {
  const granel = tipo === "cavaco" || tipo === "po_serra";
  const produtos = itens.map(i => {
    const pacotes = numeroPedido(i.qtd_blocos);
    const pecas = pacotes * numeroPedido(i.pecas_por_pacote);
    const volume = tipo === "cilindrica"
      ? calcM3Cilindrico(numeroPedido(i.comprimento_m), numeroPedido(i.espessura_m), pecas)
      : numeroPedido(i.comprimento_m) * numeroPedido(i.espessura_m) * numeroPedido(i.largura_m) * pecas;
    return { ...i, pacotes, pecas, volume, valor: volume * numeroPedido(i.valor_unitario) };
  });
  return {
    produtos,
    pacotes: granel ? 0 : produtos.reduce((s, i) => s + i.pacotes, 0),
    pecas: granel ? 0 : produtos.reduce((s, i) => s + i.pecas, 0),
    volume: granel ? (unidade === "m3" ? numeroPedido(quantidade) : 0) : produtos.reduce((s, i) => s + i.volume, 0),
    valor: granel ? numeroPedido(quantidade) * numeroPedido(preco) : produtos.reduce((s, i) => s + i.valor, 0),
  };
}