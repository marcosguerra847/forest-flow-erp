type EntradaToras = { talhao_id: string | null; volume_m3: number | string; quantidade: number };

export function resumirTorasTalhao(entradas: EntradaToras[], talhaoId: string | null) {
  return entradas.filter((entrada) => entrada.talhao_id === talhaoId).reduce(
    (total, entrada) => ({ volume_m3: total.volume_m3 + Number(entrada.volume_m3), quantidade: total.quantidade + entrada.quantidade }),
    { volume_m3: 0, quantidade: 0 },
  );
}