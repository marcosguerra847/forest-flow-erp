// Madeira roliça / cilíndrica (escoras, eucalipto tratado): volume pela área circular.
// V = π × (diâmetro / 2)² × comprimento × peças. Medidas em METROS.
export function calcM3Cilindrico(comprimentoM: number, diametroM: number, pecas: number): number {
  const c = Number(comprimentoM) || 0;
  const d = Number(diametroM) || 0;
  const n = Number(pecas) || 0;
  return Math.PI * (d / 2) ** 2 * c * n;
}

export const ehCilindrica = (tipo?: string | null) => tipo === "cilindrica";
