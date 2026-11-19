import jsPDF from "jspdf";
import logoAsset from "@/assets/logo-bela-vista.png.asset.json";
import { dataRecibo, valorPorExtenso, type DadosRecibo } from "@/lib/recibo";

const moeda = (valor: number) => Number(valor || 0).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});

async function carregarLogo(): Promise<string | null> {
  try {
    const blob = await fetch(logoAsset.url).then((r) => r.blob());
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function desenharVia(doc: jsPDF, dados: DadosRecibo, logo: string | null, y: number, via: string) {
  const W = doc.internal.pageSize.getWidth();
  if (logo) doc.addImage(logo, "PNG", 14, y, 18, 18);

  doc.setFont("helvetica", "bold").setFontSize(14).text("FAZENDA BELA VISTA", 38, y + 6);
  doc.setFont("helvetica", "normal").setFontSize(9).text("Madeira de Reflorestamento", 38, y + 11);
  doc.setFontSize(8).text("Contato: contato@fazendabelavista.com.br", 38, y + 16);

  doc.setFont("helvetica", "bold").setFontSize(14).text("RECIBO", W - 14, y + 6, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).text(dados.numero, W - 14, y + 12, { align: "right" });
  doc.setFontSize(8).text(`Emissão: ${new Date().toLocaleDateString("pt-BR")}`, W - 14, y + 17, { align: "right" });

  doc.setDrawColor(180).line(14, y + 25, W - 14, y + 25);
  doc.setFont("helvetica", "bold").setFontSize(8).text(via, W - 14, y + 31, { align: "right" });

  doc.setFont("helvetica", "normal").setFontSize(10);
  const cliente = doc.splitTextToSize(`Recebi(emos) de ${dados.cliente_nome}`, W - 28);
  doc.text(cliente.slice(0, 2), 14, y + 40);

  if (dados.cliente_documento) doc.text(`CPF/CNPJ: ${dados.cliente_documento}`, 14, y + 51);
  if (dados.cliente_endereco) {
    const endereco = doc.splitTextToSize(`Endereço: ${dados.cliente_endereco}`, W - 28);
    doc.text(endereco[0], 14, y + 56);
  }

  doc.setFont("helvetica", "bold").setFontSize(13).text(`Valor recebido: ${moeda(dados.valor)}`, 14, y + 66);
  doc.setFont("helvetica", "normal").setFontSize(9);
  const extenso = doc.splitTextToSize(`(${valorPorExtenso(dados.valor)})`, W - 28);
  doc.text(extenso.slice(0, 2), 14, y + 72);

  doc.setFontSize(10);
  const referencia = doc.splitTextToSize(`Referente a: ${dados.referencia}`, W - 28);
  doc.text(referencia.slice(0, 2), 14, y + 84);

  doc.setFontSize(9);
  doc.text(`Forma de pagamento: ${dados.forma_pagamento}`, 14, y + 95);
  doc.text(`Data do pagamento: ${dataRecibo(dados.data_pagamento)}`, 112, y + 95);
  if (dados.documento_fiscal) doc.text(`Documento vinculado: ${dados.documento_fiscal}`, 14, y + 102);

  if (dados.observacoes) {
    const observacoes = doc.splitTextToSize(`Observações: ${dados.observacoes}`, W - 28);
    doc.text(observacoes.slice(0, 2), 14, y + 109);
  }

  const assinaturaY = y + 125;
  doc.setDrawColor(100);
  doc.line(20, assinaturaY, 90, assinaturaY);
  doc.line(W - 90, assinaturaY, W - 20, assinaturaY);
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text("Fazenda Bela Vista", 55, assinaturaY + 4, { align: "center" });
  doc.text("Cliente / recebedor", W - 55, assinaturaY + 4, { align: "center" });
}

export async function gerarReciboPdf(dados: DadosRecibo, autoPrint = false, janela: Window | null = null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await carregarLogo();
  desenharVia(doc, dados, logo, 8, "VIA DO CLIENTE");

  doc.setDrawColor(150).setLineDashPattern([2, 2], 0).line(10, 146, 200, 146);
  doc.setLineDashPattern([], 0);
  desenharVia(doc, dados, logo, 154, "VIA DA FAZENDA");

  if (autoPrint) {
    // Opening the PDF in a tab pre-opened on click avoids Chrome blocking hidden-iframe printing and popups.
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output("blob"));
    if (janela && !janela.closed) janela.location.href = url;
    else if (!window.open(url, "_blank")) {
      const arquivo = dados.numero.replace(/[^a-zA-Z0-9_-]/g, "-");
      doc.save(`${arquivo || "recibo"}.pdf`);
    }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } else {
    const arquivo = dados.numero.replace(/[^a-zA-Z0-9_-]/g, "-");
    doc.save(`${arquivo || "recibo"}.pdf`);
  }
}
