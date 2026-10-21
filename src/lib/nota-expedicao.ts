
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

// Cubagem: comprimento x espessura x largura x quantidade de peças.
export function calcM3(
  comprimentoM: number,
  espessuraM: number,
  larguraM: number,
  pecas: number
) {
  return comprimentoM * espessuraM * larguraM * pecas;
}

// Números para quantidades, volumes e valores numéricos.
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

// Medidas em metros sem zeros desnecessários.
const medida = (v: number | null | undefined) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      });

// Comprimento sempre com duas casas decimais.
const comprimento = (v: number | null | undefined) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

// Valores em reais.
const brl = (v: number | null | undefined) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

// Forma de pagamento.
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

  // Logo.
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
    // A nota pode ser gerada sem o logo.
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

  // Cliente e pagamento.
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

  // Tabela de produtos.
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
    // Compatibilidade com romaneios antigos de produto único.
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

  // Posição abaixo da tabela.
  let y =
    (doc as unknown as {
      lastAutoTable: { finalY: number };
    }).lastAutoTable.finalY + 8;

  // Conferência de saída.
  if (!isCavaco) {
    // Mantém a conferência junta e evita que ela fique cortada.
    if (y + 42 > H - 45) {
      doc.addPage();
      y = 18;
    }

    doc
      .setFont("helvetica", "bold")
      .setFontSize(10)
      .text("CONFERÊNCIA DE SAÍDA", 14, y);

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
      tableWidth: 110,
      margin: {
        left: 14,
      },
    });

    y =
      (doc as unknown as {
        lastAutoTable: { finalY: number };
      }).lastAutoTable.finalY + 8;
  }

  // Operador e data de saída.
  // O resumo aparece abaixo destas informações.
  if (y + 75 > H - 40) {
    doc.addPage();
    y = 18;
  }

  doc.setFont("helvetica", "normal").setFontSize(9);

  doc.text(
    `Operador: ${p.operador_nome ?? "________________________"}`,
    14,
    y
  );

  y += 6;

  doc.text(
    `Data de saída: ${
      p.expedido_em
        ? new Date(p.expedido_em).toLocaleString("pt-BR")
        : "____/____/______"
    }`,
    14,
    y
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

  // Observações abaixo do resumo.
  if (p.observacoes) {
    y += 7;

    const linhas = doc.splitTextToSize(
      `Observações: ${p.observacoes}`,
      W - 28
    );

    if (y + linhas.length * 4 > H - 32) {
      doc.addPage();
      y = 18;
    }

    doc.text(linhas, 14, y);
    y += linhas.length * 4 + 4;
  }

  // QR Code de conferência.
  try {
    const qr = await QRCode.toDataURL(link, {
      width: 300,
      margin: 1,
    });

    // Mantém o QR Code na parte inferior direita.
    doc.addImage(qr, "PNG", W - 50, H - 42, 32, 32);
  } catch {
    // QR Code opcional.
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

  // Imprimir ou baixar.
  if (autoPrint) {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  } else {
    doc.save(`romaneio-${p.codigo}.pdf`);
  }
}
