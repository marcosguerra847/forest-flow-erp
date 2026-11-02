type RomaneioContagem = {
  status: string;
  qtd_blocos?: number | string | null;
};

// "Pacotes prontos" considera só os romaneios que carregam blocos (madeira),
// para não repetir o número de "Prontos p/ envio", que soma todas as cargas
// (cavaco e pó de serra entram ali). Pagamento pendente não altera a situação.
export function contarPacotesProntos(romaneios: readonly RomaneioContagem[]) {
  return romaneios.filter(
    (romaneio) =>
      romaneio.status === "pronto" &&
      Number(String(romaneio.qtd_blocos ?? "").replace(",", ".")) > 0,
  ).length;
}
