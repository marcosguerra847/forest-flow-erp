
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

  data_saida_carga?: string | null;
  placa_caminhao?: string | null;

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

/**
 * Calcula a cubagem em metros cúbicos.
 * Todas as medidas devem ser informadas em METROS.
 *
 * Exemplo:
 * 1.20 x 0.08 x 0.019 x 5490 peças
 * Resultado: 10.00512 m³
 */
export function calcM3(
  comprimentoM: number,
  espessuraM: number,
  larguraM: number,
  pecas: number
): number {
  const comprimento = Number(comprimentoM) || 0;
  const espessura = Number(espessuraM) || 0;
  const largura = Number(larguraM) || 0;
  const quantidade = Number(pecas) || 0;

  return comprimento * espessura * largura * quantidade;
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

// Formata datas sem deslocar datas simples de calendário.
const formatarDataSaida = (valor: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleString("pt-BR");
};

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
    // Produtos em metros, com cubagem recalculada.
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
      body: itens.map((i) => {
        const volumeCalculado = calcM3(
          i.comprimento_m,
          i.espessura_m,
          i.largura_m,
          i.qtd_pecas
        );

        const valorCalculado =
          volumeCalculado * Number(i.valor_unitario || 0);

        return [
          i.descricao,
          `${comprimento(i.comprimento_m)} x ${medida(
            i.espessura_m
          )} x ${medida(i.largura_m)}`,
          n(i.qtd_blocos, 0),
          n(i.pecas_por_pacote, 0),
          n(i.qtd_pecas, 0),
          n(volumeCalculado, 5),
          brl(i.valor_unitario),
          brl(valorCalculado),
        ];
      }),
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
    // O banco antigo guarda espessura e largura em centímetros.
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

    const volumeCalculado = temMedidas
      ? calcM3(comp, esp, larg, p.qtd_pecas)
      : Number(p.volume_m3 || 0);

    const valorCalculado =
      volumeCalculado * Number(p.valor_unitario || 0);

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
        n(volumeCalculado, 5),
        brl(p.valor_unitario),
        brl(temMedidas ? valorCalculado : p.valor_total ?? p.valor_previsto),
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

  // QR Code à direita, abaixo da tabela.
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

  // Reserva espaço para o QR Code.
  if (isCavaco) {
    y = qrY + 33;
  } else {
    y = qrY;
  }

  const esquerdaX = 14;
  const larguraTexto = W - 75;

  // Conferência de saída para madeira.
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
          n(p.volume_m3, 5),
          p.volume_expedido_m3 != null
            ? n(p.volume_expedido_m3, 5)
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

  // Reserva espaço para operador, data e placa.
  if (y + 75 > H - 25) {
    doc.addPage();
    y = 18;
  }

  doc.setFont("helvetica", "normal").setFontSize(9);

  if (p.operador_nome) {
    doc.text(
      `Operador: ${p.operador_nome}`,
      esquerdaX,
      y,
      { maxWidth: larguraTexto }
    );

    y += 6;
  }

  const dataSaida = p.data_saida_carga || p.expedido_em;

  if (dataSaida) {
    doc.text(
      `Data de saída: ${formatarDataSaida(dataSaida)}`,
      esquerdaX,
      y,
      { maxWidth: larguraTexto }
    );

    y += 6;
  }

  if (p.placa_caminhao?.trim()) {
    doc.text(
      `Placa do caminhão: ${p.placa_caminhao.trim().toUpperCase()}`,
      esquerdaX,
      y,
      { maxWidth: larguraTexto }
    );

    y += 6;
  }

  y += 3;

  if (y + 65 > H - 25) {
    doc.addPage();
    y = 18;
  }

  // Resumo do romaneio.
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
    `Volume total: ${n(p.volume_m3, 5)} m³`,
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
