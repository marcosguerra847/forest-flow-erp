
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import logoAsset from "@/assets/logo-bela-vista.png.asset.json";

export type ItemRomaneioNota = {
  id?: string;
  romaneio_id?: string;
  descricao: string;
  comprimento_m: number;
  espessura_m: number;
  largura_m: number;
  qtd_blocos: number;
  pecas_por_pacote: number;
  qtd_pecas: number;
  volume_m3: number;
  valor_unitario: number;
  valor_total: number;
  criado_em?: string;
};

export type PacoteNota = {
  id?: string;
  codigo: string;
  descricao: string;
  cliente_nome: string | null;
  tipo_carga?: string | null;
  unidade_venda?: string | null;
  quantidade_venda?: number | null;
  quantidade_expedida?: number | null;
  valor_unitario?: number | null;
  valor_total?: number | null;
  valor_previsto?: number | null;
  forma_pagamento?: string | null;
  situacao_pagamento?: string | null;
  itens?: ItemRomaneioNota[];
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

export function calcM3(
  comprimentoM: number,
  espessuraM: number,
  larguraM: number,
  pecas: number
) {
  return comprimentoM * espessuraM * larguraM * pecas;
}

const n = (
  v: number | null | undefined,
  d = 2
) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });

const medida = (v: number | null | undefined) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      });

const comprimento = (v: number | null | undefined) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const brl = (v: number | null | undefined) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

const forma = (v?: string | null) =>
  ({
    pix: "PIX",
    dinheiro: "Dinheiro",
    transferencia: "Transferência",
    cartao: "Cartão",
    boleto: "Boleto",
    prazo: "A prazo",
    outro: "Outro",
  } as Record<string, string>)[v ?? ""] ?? "Não informado";

export async function gerarNotaPacote(
  p: PacoteNota,
  link: string,
  autoPrint = false
) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Logo da Fazenda.
  try {
    const img = await fetch(logoAsset.url)
      .then((r) => r.blob())
      .then(
        (b) =>
          new Promise<string>((res) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result as string);
            fr.readAsDataURL(b);
          })
      );

    doc.addImage(img, "PNG", 14, 10, 20, 20);
  } catch {
    // Logo opcional.
  }

  // Cabeçalho.
  doc
    .setFontSize(14)
    .setFont("helvetica", "bold")
    .text("FAZENDA BELA VISTA", 38, 16);

  doc
    .setFontSize(9)
    .setFont("helvetica", "normal")
    .text("Madeira de Reflorestamento", 38, 21);

  doc.text("Contato: contato@fazendabelavista.com.br", 38, 26);

  doc
    .setFontSize(14)
    .setFont("helvetica", "bold")
    .text("NOTA DE CARGA / ROMANEIO", W - 14, 16, {
      align: "right",
    });

  doc
    .setFontSize(10)
    .setFont("helvetica", "normal")
    .text(p.codigo, W - 14, 22, {
      align: "right",
    });

  doc.text(
    `Emissão: ${new Date(p.criado_em).toLocaleDateString("pt-BR")}`,
    W - 14,
    27,
    { align: "right" }
  );

  doc.setDrawColor(180).line(14, 34, W - 14, 34);

  // Dados do cliente.
  doc
    .setFontSize(10)
    .setFont("helvetica", "bold")
    .text("CLIENTE / DESTINO", 14, 41);

  doc.setFont("helvetica", "normal").setFontSize(9);

  doc.text(`Cliente: ${p.cliente_nome ?? "—"}`, 14, 46);

  doc.text(
    `Status da expedição: ${
      p.status === "pronto" ? "Pronto para envio" : "Expedido"
    }`,
    14,
    51
  );

  const isCavaco = p.tipo_carga === "cavaco";
  const itens = p.itens ?? [];

  // Tabela de cavaco ou pó de serra.
  if (isCavaco) {
    const unidade =
      p.unidade_venda === "ton" ? "toneladas" : "m³";

    autoTable(doc, {
      startY: 63,
      head: [[
        "Produto",
        "Unidade",
        "Quantidade",
        "Preço unitário",
        "Valor total",
      ]],
      body: [[
        p.descricao || "Cavaco",
        unidade,
        n(p.quantidade_venda ?? 0, 3),
        brl(p.valor_unitario),
        brl(p.valor_total ?? p.valor_previsto),
      ]],
      headStyles: {
        fillColor: [46, 82, 51],
        textColor: 255,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
    });
  } else if (itens.length > 0) {
    // Vários produtos no mesmo romaneio.
    autoTable(doc, {
      startY: 63,
      head: [[
        "Produto",
        "Medidas C x E x L (m)",
        "Pacotes",
        "Peças/pacote",
        "Total peças",
        "Volume (m³)",
        "Preço/m³",
        "Valor total",
      ]],
      body: itens.map((i) => [
        i.descricao,
        `${comprimento(i.comprimento_m)} x ${medida(
          i.espessura_m
        )} x ${medida(i.largura_m)}`,
        n(i.qtd_blocos, 0),
        n(i.pecas_por_pacote, 0),
        n(i.qtd_pecas, 0),
        n(i.volume_m3, 4),
        brl(i.valor_unitario),
        brl(i.valor_total),
      ]),
      headStyles: {
        fillColor: [46, 82, 51],
        textColor: 255,
      },
      styles: {
        fontSize: 6.5,
        cellPadding: 1.6,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: 37 },
        1: { cellWidth: 31 },
      },
    });
  } else {
    // Compatibilidade com romaneios antigos.
    const temMedidas =
      p.espessura_cm != null &&
      p.largura_cm != null &&
      p.comprimento_m != null &&
      p.espessura_cm > 0 &&
      p.largura_cm > 0 &&
      p.comprimento_m > 0;

    const esp = temMedidas
      ? Number(p.espessura_cm) / 100
      : 0;

    const larg = temMedidas
      ? Number(p.largura_cm) / 100
      : 0;

    const comp = temMedidas
      ? Number(p.comprimento_m)
      : 0;

    autoTable(doc, {
      startY: 63,
      head: [[
        "Produto",
        "Medidas C x E x L (m)",
        "Pacotes",
        "Peças/pacote",
        "Total peças",
        "Volume (m³)",
        "Preço/m³",
        "Valor total",
      ]],
      body: [[
        p.descricao,
        temMedidas
          ? `${comprimento(comp)} x ${medida(esp)} x ${medida(larg)}`
          : "—",
        n(p.qtd_blocos, 0),
        n(p.pecas_por_pacote, 0),
        n(p.qtd_pecas, 0),
        n(p.volume_m3, 4),
        brl(p.valor_unitario),
        brl(p.valor_total ?? p.valor_previsto),
      ]],
      headStyles: {
        fillColor: [46, 82, 51],
        textColor: 255,
      },
      styles: {
        fontSize: 6.5,
        cellPadding: 1.6,
        overflow: "linebreak",
      },
    });
  }

  // Posição logo abaixo da tabela.
  let y =
    (doc as unknown as {
      lastAutoTable: { finalY: number };
    }).lastAutoTable.finalY + 8;

  // QR Code à direita, abaixo da tabela de produtos.
  // Se faltar espaço, abre uma nova página.
  let qrY = y;

  if (qrY + 31 > H - 42) {
    doc.addPage();
    qrY = 18;
  }

  try {
    const qr = await QRCode.toDataURL(link, {
      width: 300,
      margin: 1,
    });

    const qrSize = 25;
    const qrX = W - 14 - qrSize;

    doc.addImage(qr, "PNG", qrX, qrY, qrSize, qrSize);

  } catch {
    // QR Code opcional.
  }

  // Reserva espaço para o QR Code à direita.
  // As informações abaixo ficam na coluna esquerda.
  y = qrY;

  const esquerdaX = 14;
  const larguraTexto = W - 75;

  // Conferência de saída.
  if (!isCavaco) {
    doc
      .setFont("helvetica", "bold")
      .setFontSize(10)
      .text("CONFERÊNCIA DE SAÍDA", esquerdaX, y);

    y += 3;

    autoTable(doc, {
      startY: y,
      head: [["Item", "Previsto", "Enviado"]],
      body: [
        [
          "Pacotes",
          n(p.qtd_blocos, 0),
          p.qtd_blocos_expedida != null
            ? n(p.qtd_blocos_expedida, 0)
            : "________",
        ],
        [
          "Peças",
          n(p.qtd_pecas, 0),
          p.qtd_pecas_expedida != null
            ? n(p.qtd_pecas_expedida, 0)
            : "________",
        ],
        [
          "Volume (m³)",
          n(p.volume_m3, 4),
          p.volume_expedido_m3 != null
            ? n(p.volume_expedido_m3, 4)
            : "________",
        ],
      ],
      headStyles: {
        fillColor: [46, 82, 51],
        textColor: 255,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      tableWidth: 85,
      margin: {
        left: esquerdaX,
      },
    });

    y =
      (doc as unknown as {
        lastAutoTable: { finalY: number };
      }).lastAutoTable.finalY + 7;
  }

  // Se a tabela e o QR Code ocuparam muito espaço, inicia nova página.
  if (y + 65 > H - 25) {
    doc.addPage();
    y = 18;
  }

  // Operador e data de saída.
  doc.setFont("helvetica", "normal").setFontSize(9);

  doc.text(
    `Operador: ${p.operador_nome ?? "________________________"}`,
    esquerdaX,
    y,
    { maxWidth: larguraTexto }
  );

  y += 6;

  doc.text(
    `Data de saída: ${
      p.expedido_em
        ? new Date(p.expedido_em).toLocaleString("pt-BR")
        : "____/____/______"
    }`,
    esquerdaX,
    y,
    { maxWidth: larguraTexto }
  );

  y += 8;

  // Resumo abaixo da data de saída.
  doc.setDrawColor(180).line(14, y, W - 14, y);

  y += 7;

  doc
    .setFont("helvetica", "bold")
    .setFontSize(11)
    .text("RESUMO DO ROMANEIO", 14, y);

  y += 8;

  doc.setFont("helvetica", "normal").setFontSize(9);

  doc.text(
    `Total de pacotes: ${n(p.qtd_blocos, 0)}`,
    14,
    y
  );

  doc.text(
    `Total de peças: ${n(p.qtd_pecas, 0)}`,
    75,
    y
  );

  doc.text(
    `Volume total: ${n(p.volume_m3, 4)} m³`,
    135,
    y
  );

  y += 10;

  doc
    .setFont("helvetica", "bold")
    .setFontSize(12)
    .text(
      `VALOR TOTAL: ${brl(p.valor_previsto ?? p.valor_total)}`,
      14,
      y
    );

  y += 8;

  doc.setFont("helvetica", "normal").setFontSize(9);

  doc.text(
    `Forma de pagamento: ${forma(p.forma_pagamento)}`,
    14,
    y
  );

  y += 6;

  doc.text(
    `Situação do pagamento: ${
      p.situacao_pagamento === "pago" ? "PAGO" : "PENDENTE"
    }`,
    14,
    y
  );

  // Observações.
  if (p.observacoes) {
    y += 7;

    const linhas = doc.splitTextToSize(
      `Observações: ${p.observacoes}`,
      W - 28
    );

    if (y + linhas.length * 4 > H - 25) {
      doc.addPage();
      y = 18;
    }

    doc.text(linhas, 14, y);
  }

  // Assinaturas no rodapé da última página.
  const ys = H - 15;

  doc.setDrawColor(100);
  doc.line(20, ys, 90, ys);
  doc.line(W - 90, ys, W - 20, ys);

  doc
    .setFont("helvetica", "normal")
    .setFontSize(8)
    .text(
      "Fazenda Bela Vista (expedição)",
      55,
      ys + 4,
      { align: "center" }
    );

  doc.text(
    "Recebedor / cliente",
    W - 55,
    ys + 4,
    { align: "center" }
  );

  // Baixar ou imprimir o PDF.
  if (autoPrint) {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  } else {
    doc.save(`romaneio-${p.codigo}.pdf`);
  }
}
