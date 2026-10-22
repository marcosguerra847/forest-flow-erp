export type CampoDataRomaneio = "registro" | "saida" | "expedicao";

type RomaneioComDatas = {
  criado_em?: string | null;
  data_saida_carga?: string | null;
  expedido_em?: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Data (yyyy-mm-dd) que um romaneio responde para um tipo de consulta. */
export function dataRomaneio(
  p: RomaneioComDatas,
  campo: CampoDataRomaneio,
): string | null {
  const bruto =
    campo === "registro"
      ? p.criado_em
      : campo === "saida"
        ? p.data_saida_carga
        : p.expedido_em;

  if (!bruto) return null;

  // Data de saída já é salva como yyyy-mm-dd; registros e baixas são timestamps.
  if (campo === "saida") return String(bruto).slice(0, 10);

  const d = new Date(String(bruto));
  return Number.isNaN(d.getTime()) ? null : isoLocal(d);
}

export type FiltroDataRomaneio = {
  campo: CampoDataRomaneio;
  de: string;
  ate: string;
};

/** Mantém só os romaneios cuja data consultada cai no período. Sem período, tudo. */
export function filtrarPorData<T extends RomaneioComDatas>(
  rows: T[],
  { campo, de, ate }: FiltroDataRomaneio,
): T[] {
  if (!de && !ate) return rows;

  return rows.filter((r) => {
    const data = dataRomaneio(r, campo);
    if (!data) return false;
    if (de && data < de) return false;
    if (ate && data > ate) return false;
    return true;
  });
}

export type PresetDataRomaneio =
  | "hoje"
  | "7dias"
  | "30dias"
  | "mes"
  | "tudo";

/** Período rápido em yyyy-mm-dd, relativo a "agora". */
export function periodo(
  preset: PresetDataRomaneio,
  agora: Date = new Date(),
): { de: string; ate: string } {
  const hoje = isoLocal(agora);

  if (preset === "tudo") return { de: "", ate: "" };
  if (preset === "hoje") return { de: hoje, ate: hoje };
  if (preset === "mes")
    return {
      de: isoLocal(new Date(agora.getFullYear(), agora.getMonth(), 1)),
      ate: hoje,
    };

  const inicio = new Date(agora);
  inicio.setDate(inicio.getDate() - (preset === "7dias" ? 6 : 29));
  return { de: isoLocal(inicio), ate: hoje };
}
