import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/logo-bela-vista.png.asset.json";
import { medidasProduto, tituloMedidas } from "./medidas-romaneio.ts";
import { numeroPedido } from "./pedido-calculo.ts";
import { prepararPedidoDocumento, situacoesPedido, type PedidoDocumento, type ClienteDocumento } from "./pedido-documento.ts";

const numero = (v: number, casas = 3) => Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: casas });
const moeda = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (v: string | null) => v ? new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "Não informada";

export async function gerarPedidoPdf(pedido: PedidoDocumento, cliente: ClienteDocumento | null, imprimir = false, janela: Window | null = null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: `Pedido ${pedido.codigo} — Fazenda Bela Vista`, author: "Fazenda Bela Vista" });
  const dados = prepararPedidoDocumento(pedido);
  const cilindrica = pedido.tipo_carga === "cilindrica";
  const tipos: Record<string, string> = { madeira: "Madeira", cilindrica: "Madeira de eucalipto cilíndrica / roliça", cavaco: "Cavaco", po_serra: "Pó de serra" };
  let logo: string | null = null;
  try {
    const resposta = await fetch(logoAsset.url);
    if (resposta.ok) {
      const blob = await resposta.blob();
      logo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Não foi possível carregar o logo"));
        reader.readAsDataURL(blob);
      });
    }
  } catch { /* The order remains available even if its logo cannot load. */ }

  const cabecalho = () => {
    if (logo) doc.addImage(logo, "PNG", 14, 10, 20, 20);
    doc.setFont("helvetica", "bold").setFontSize(14).text("FAZENDA BELA VISTA", 38, 16);
    doc.setFont("helvetica", "normal").setFontSize(9).text("Madeira de Reflorestamento", 38, 22);
    doc.setFontSize(8).text("Contato: contato@fazendabelavista.com.br", 38, 27);
    doc.setFont("helvetica", "bold").setFontSize(13).text("PEDIDO DE VENDA", 196, 16, { align: "right" });
    doc.setFont("helvetica", "normal").setFontSize(9).text(pedido.codigo, 196, 22, { align: "right" });
    doc.setFontSize(8).text(`Data do pedido: ${data(pedido.data)}`, 196, 27, { align: "right" });
    doc.setDrawColor(180).line(14, 34, 196, 34);
  };
  cabecalho();
  let y = 42;
  const linha = (texto: string, negrito = false) => {
    doc.setFont("helvetica", negrito ? "bold" : "normal").setFontSize(9);
    const linhas: string[] = doc.splitTextToSize(texto, 182);
    for (const l of linhas) {
      if (y > 269) { doc.addPage(); cabecalho(); y = 42; }
      doc.text(l, 14, y); y += 5;
    }
  };
  linha("CLIENTE", true);
  linha(`Nome / Razão social: ${cliente?.nome ?? "Não informado"}`);
  if (cliente?.documento) linha(`CPF/CNPJ: ${cliente.documento}`);
  if (cliente?.telefone || cliente?.email) linha([cliente.telefone ? `Telefone: ${cliente.telefone}` : "", cliente.email ? `E-mail: ${cliente.email}` : ""].filter(Boolean).join("   |   "));
  const endereco = [cliente?.endereco, [cliente?.cidade, cliente?.uf].filter(Boolean).join("/")].filter(Boolean).join(" — ");
  if (endereco) linha(`Endereço: ${endereco}`);
  y += 3;
  linha(`Situação: ${situacoesPedido[pedido.status] ?? pedido.status}   |   Previsão de entrega: ${data(pedido.data_entrega)}`);
  linha(`Tipo de carga: ${tipos[pedido.tipo_carga] ?? pedido.tipo_carga}`);
  y += 3;

  const unidade = pedido.unidade_venda === "ton" ? "t" : "m³";
  const head = dados.granel ? [["Produto", "Quantidade", "Preço unitário", "Total"]]
    : dados.legado ? [["Produto / Descrição", "Itens", "Total"]]
    : [["Produto", tituloMedidas(cilindrica), "Pacotes", "Peças/pac.", "Peças", "m³", "Preço/m³", "Total"]];
  const body = dados.granel ? [[pedido.descricao || tipos[pedido.tipo_carga] || "—", `${numero(pedido.quantidade_venda)} ${unidade}`, moeda(pedido.valor_unitario), moeda(dados.valor)]]
    : dados.legado ? [[pedido.descricao || "—", numero(pedido.qtd_itens, 0), moeda(dados.valor)]]
    : dados.produtos.map(p => [p.descricao, medidasProduto(numeroPedido(p.comprimento_m), numeroPedido(p.espessura_m), numeroPedido(p.largura_m), cilindrica, "x"), numero(p.pacotes, 0), numero(numeroPedido(p.pecas_por_pacote), 0), numero(p.pecas, 0), numero(p.volume, 5), moeda(numeroPedido(p.valor_unitario)), moeda(p.valor)]);
  autoTable(doc, {
    startY: y, head, body, margin: { left: 14, right: 14, top: 40, bottom: 22 },
    headStyles: { fillColor: [46, 82, 51], textColor: 255 },
    styles: { fontSize: dados.granel || dados.legado ? 9 : 7, cellPadding: 2, overflow: "linebreak" },
    ...(dados.granel || dados.legado ? {} : { columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 35 } } }),
    willDrawPage: () => { if (doc.getNumberOfPages() > 1) cabecalho(); },
  });
  const tabela = doc as unknown as { lastAutoTable?: { finalY: number } };
  y = (tabela.lastAutoTable?.finalY ?? y) + 9;
  linha("RESUMO DO PEDIDO", true);
  if (!dados.granel) linha(`Pacotes: ${numero(dados.pacotes, 0)}   |   Peças: ${numero(dados.pecas, 0)}   |   Volume: ${numero(dados.volume, 5)} m³`);
  else linha(`Quantidade de venda: ${numero(pedido.quantidade_venda)} ${unidade}`);
  linha(`VALOR TOTAL: ${moeda(dados.valor)}`, true);
  const pagamento = { pago: "Pago", pendente: "Pendente", permuta: "Permuta" } as Record<string, string>;
  linha(`Forma de pagamento: ${pedido.pagamento || "Não informada"}   |   Situação: ${pagamento[pedido.situacao_pagamento] ?? pedido.situacao_pagamento}`);
  if (pedido.observacoes) { y += 4; linha("OBSERVAÇÕES", true); linha(pedido.observacoes); }
  if (y + 30 > 274) { doc.addPage(); cabecalho(); y = 42; }
  y += 20;
  doc.setDrawColor(100).line(20, y, 90, y).line(120, y, 190, y);
  doc.setFont("helvetica", "normal").setFontSize(8).text("Fazenda Bela Vista", 55, y + 5, { align: "center" }).text("Cliente — assinatura", 155, y + 5, { align: "center" });
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    doc.setFont("helvetica", "normal").setFontSize(7).text("Pedido de venda — não é documento fiscal nem comprovante de pagamento.", 14, 286);
    doc.text(`${pagina} / ${paginas}`, 196, 286, { align: "right" });
  }
  const arquivo = `${pedido.codigo.replace(/[^a-zA-Z0-9_-]/g, "-") || "pedido"}.pdf`;
  if (imprimir) {
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output("blob"));
    if (janela && !janela.closed) janela.location.href = url;
    else doc.save(arquivo);
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } else doc.save(arquivo);
}