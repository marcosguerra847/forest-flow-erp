import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import logoAsset from "@/assets/logo-bela-vista.png.asset.json";

export type PacoteNota = {
  codigo: string;
  descricao: string;
  cliente_nome: string | null;
  tipo_carga?: string | null;
  unidade_venda?: string | null;
  quantidade_venda?: number | null;
  quantidade_expedida?: number | null;
  valor_unitario?: number | null;
  valor_total?: number | null;
  // Compatibilidade com o banco: espessura/largura são armazenadas em cm e comprimento em m.
  espessura_cm: number | null;
  largura_cm: number | null;
  comprimento_m: number | null;
  qtd_blocos: number;
  pecas_por_pacote?: number | null;
  qtd_pecas: number;
  volume_m3: number;
  qtd_blocos_expedida: number | null;
  qtd_pecas_expedida: number | null;
  volume_expedido_m3: number | null;
  status: string;
  operador_nome: string | null;
  expedido_em: string | null;
  criado_em: string;
  observacoes?: string | null;
};

// Recebe todas as dimensões em METROS, na ordem comprimento x espessura x largura.
export function calcM3(comprimentoM: number, espessuraM: number, larguraM: number, pecas: number) {
  return comprimentoM * espessuraM * larguraM * pecas;
}

const n = (v: number | null | undefined, d = 2) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

export async function gerarNotaPacote(p: PacoteNota, link: string, autoPrint = false) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  try {
    const img = await fetch(logoAsset.url).then((r) => r.blob()).then((b) => new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.readAsDataURL(b);
    }));
    doc.addImage(img, "PNG", 14, 10, 20, 20);
  } catch { /* logo opcional */ }

  doc.setFontSize(14).setFont("helvetica", "bold").text("FAZENDA BELA VISTA", 38, 16);
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text("Madeira de Reflorestamento", 38, 21);
  doc.text("Contato: contato@fazendabelavista.com.br", 38, 26);
  doc.setFontSize(14).setFont("helvetica", "bold").text("NOTA DE CARGA / ROMANEIO", W - 14, 16, { align: "right" });
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text(p.codigo, W - 14, 22, { align: "right" });
  doc.text(`Emissão: ${new Date(p.criado_em).toLocaleDateString("pt-BR")}`, W - 14, 27, { align: "right" });
  doc.setDrawColor(180).line(14, 34, W - 14, 34);

  doc.setFontSize(10).setFont("helvetica", "bold").text("CLIENTE / DESTINO", 14, 41);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`Cliente: ${p.cliente_nome ?? "—"}`, 14, 46);
  doc.text(`Status: ${p.status === "pronto" ? "Pronto para envio" : "Expedido"}`, 14, 51);

  const isCavaco = p.tipo_carga === "cavaco";
  const unidade = p.unidade_venda === "ton" ? "toneladas" : "m³";
  const temMedidas = p.espessura_cm != null && p.largura_cm != null && p.comprimento_m != null
    && p.espessura_cm > 0 && p.largura_cm > 0 && p.comprimento_m > 0;

  // Banco mantém espessura/largura em cm; para cubagem, convertemos para metros.
  const espessuraM = temMedidas ? Number(p.espessura_cm) / 100 : 0;
  const larguraM = temMedidas ? Number(p.largura_cm) / 100 : 0;
  const comprimentoM = temMedidas ? Number(p.comprimento_m) : 0;
  const m3Peca = temMedidas ? calcM3(comprimentoM, espessuraM, larguraM, 1) : null;
  const medidas = temMedidas
    ? `${n(comprimentoM, 3)} m x ${n(espessuraM, 3)} m x ${n(larguraM, 3)} m`
    : "—";

  autoTable(doc, {
    startY: 57,
    head: [isCavaco
      ? ["Produto", "Unidade de venda", "Quantidade", "Preço unitário", "Valor total"]
      : ["Produto", "Medidas (C x E x L, m)", "m³/peça", "Pacotes", "Peças/pacote", "Total peças", "Volume (m³)"]],
    body: [isCavaco
      ? ["Cavaco", unidade, n(p.quantidade_venda ?? 0, 3),
          p.valor_unitario != null ? `R$ ${n(p.valor_unitario, 2)}` : "—",
          p.valor_total != null ? `R$ ${n(p.valor_total, 2)}` : "—"]
      : [p.descricao, medidas, m3Peca != null ? n(m3Peca, 6) : "—",
          String(p.qtd_blocos), p.pecas_por_pacote != null ? String(p.pecas_por_pacote) : "—",
          String(p.qtd_pecas), n(p.volume_m3, 4)]],
    headStyles: { fillColor: [46, 82, 51], textColor: 255 },
    styles: { fontSize: 7.5, cellPadding: 2 },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(10).setFont("helvetica", "bold").text("CONFERÊNCIA DE SAÍDA", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["", "Previsto", "Enviado"]],
    body: [
      ...(isCavaco
        ? [[`Quantidade (${unidade})`, n(p.quantidade_venda ?? 0, 3), p.quantidade_expedida != null ? n(p.quantidade_expedida, 3) : "____"]]
        : [
            ["Pacotes", String(p.qtd_blocos), p.qtd_blocos_expedida != null ? String(p.qtd_blocos_expedida) : "____"],
            ["Peças", String(p.qtd_pecas), p.qtd_pecas_expedida != null ? String(p.qtd_pecas_expedida) : "____"],
            ["Volume (m³)", n(p.volume_m3, 4), p.volume_expedido_m3 != null ? n(p.volume_expedido_m3, 4) : "____"],
          ]),
    ],
    headStyles: { fillColor: [46, 82, 51], textColor: 255 },
    styles: { fontSize: 9 },
    tableWidth: 110,
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text(`Operador: ${p.operador_nome ?? "________________"}   Data de saída: ${p.expedido_em ? new Date(p.expedido_em).toLocaleString("pt-BR") : "____/____/______"}`, 14, y);
  if (p.observacoes) {
    y += 6;
    doc.text(doc.splitTextToSize(`Observações: ${p.observacoes}`, W - 28), 14, y);
  }

  try {
    const qr = await QRCode.toDataURL(link, { width: 300, margin: 1 });
    doc.addImage(qr, "PNG", W - 54, 214, 40, 40);
  } catch { /* QR opcional */ }

  const ys = 255;
  doc.line(20, ys, 90, ys);
  doc.line(W - 90, ys, W - 20, ys);
  doc.setFontSize(8);
  doc.text("Fazenda Bela Vista (expedição)", 55, ys + 5, { align: "center" });
  doc.text("Recebedor / cliente", W - 55, ys + 5, { align: "center" });
  doc.text("Nome legível: ______________________   Data: ___/___/_____", W - 55, ys + 10, { align: "center" });

  if (autoPrint) {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  } else {
    doc.save(`nota-${p.codigo}.pdf`);
  }
}
