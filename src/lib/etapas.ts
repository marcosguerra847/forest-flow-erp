// Etapas possíveis da madeira ao longo da cadeia (ordem cronológica)
export const ETAPAS: { key: string; label: string; grupo: string }[] = [
  { key: "colhido", label: "Colhido", grupo: "Fazenda" },
  { key: "carregado", label: "Carregado", grupo: "Fazenda" },
  { key: "em_transporte", label: "Em transporte", grupo: "Transporte" },
  { key: "recebido", label: "Recebido no pátio", grupo: "Pátio" },
  { key: "conferido", label: "Conferido", grupo: "Pátio" },
  { key: "armazenado", label: "Armazenado", grupo: "Pátio" },
  { key: "em_producao", label: "Em produção", grupo: "Serraria" },
  { key: "serrado", label: "Serrado", grupo: "Serraria" },
  { key: "disponivel", label: "Disponível", grupo: "Estoque" },
  { key: "reservado", label: "Reservado", grupo: "Estoque" },
  { key: "vendido", label: "Vendido", grupo: "Venda" },
  { key: "em_entrega", label: "Em entrega", grupo: "Entrega" },
  { key: "entregue", label: "Entregue", grupo: "Entrega" },
  { key: "outro", label: "Outro / observação", grupo: "—" },
];

export function tipoFromCodigo(codigo: string): string {
  const p = codigo.split("-")[0]?.toUpperCase() ?? "";
  return ["OC", "CG", "LP", "OP", "PA", "DV", "BV"].includes(p) ? p : "OUTRO";
}
