// Formatação compartilhada pela nota, pelo QR e pela etiqueta, sem conversão de unidade.
/** Preserva o zero final em metros e a precisão de medidas finas. */
export function medidaMetros(metros: number | null | undefined): string {
  const valor = Number(metros ?? 0);
  if (!Number.isFinite(valor) || valor <= 0) return "—";
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

/** Comprimento em metros com duas casas: 1 → "1,00". */
export function comprimentoMetros(
  metros: number | null | undefined,
): string {
  return Number(metros ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Medidas do produto do jeito que o cliente lê:
 * "1,00 × 0,019 × 0,10 m" — ou "2,50 × Ø 0,10 m" na madeira roliça.
 * `separador` permite o "x" simples usado no PDF.
 */
export function medidasProduto(
  comprimentoM: number | null | undefined,
  espessuraM: number | null | undefined,
  larguraM: number | null | undefined,
  cilindrica = false,
  separador = "×",
): string {
  const comp = comprimentoMetros(comprimentoM);

  return cilindrica
    ? `${comp} ${separador} Ø ${medidaMetros(espessuraM)} m`
    : `${comp} ${separador} ${medidaMetros(espessuraM)} ${separador} ${medidaMetros(larguraM)} m`;
}

/** Título da coluna de medidas, com a unidade de cada número. */
export function tituloMedidas(cilindrica = false): string {
  return cilindrica
    ? "Medidas C x Ø (m)"
    : "Medidas C x E x L (m)";
}
