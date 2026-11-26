// O cadastro guarda as medidas em metros, mas quem recebe a nota entende
// centímetros: 0,10 m de largura deve sair como "10", e não como "0,1".
// Helper único, usado pela nota em PDF, pela página aberta pelo QR e pela etiqueta.

const centimetrosComoNumero = (v: number) =>
  Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** Metros em centímetros, sem casas desnecessárias: 0,10 m → "10". */
export function centimetros(metros: number | null | undefined): string {
  const cm = Number(metros ?? 0) * 100;
  if (!Number.isFinite(cm) || cm <= 0) return "—";
  return centimetrosComoNumero(cm);
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
 * "1,00 m × 1,9 × 10 cm" — ou "2,50 m × Ø 10 cm" na madeira roliça.
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
    ? `${comp} m ${separador} Ø ${centimetros(espessuraM)} cm`
    : `${comp} m ${separador} ${centimetros(espessuraM)} ${separador} ${centimetros(larguraM)} cm`;
}

/** Título da coluna de medidas, com a unidade de cada número. */
export function tituloMedidas(cilindrica = false): string {
  return cilindrica
    ? "Medidas C (m) x Ø (cm)"
    : "Medidas C (m) x E x L (cm)";
}
