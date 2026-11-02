type RomaneioContagem = {
  status: string;
};

// Cada romaneio pronto representa uma carga, inclusive os produtos a granel.
// Pagamento pendente não altera a situação de expedição.
export function contarPacotesProntos(romaneios: readonly RomaneioContagem[]) {
  return romaneios.filter((romaneio) => romaneio.status === "pronto").length;
}