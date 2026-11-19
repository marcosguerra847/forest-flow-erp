export type DadosRecibo = {
  numero: string;
  cliente_nome: string;
  cliente_documento?: string | null;
  cliente_endereco?: string | null;
  valor: number;
  data_pagamento: string;
  referencia: string;
  forma_pagamento: string;
  documento_fiscal?: string | null;
  observacoes?: string | null;
};

const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(valor: number): string {
  if (valor === 100) return "cem";
  const partes: string[] = [];
  const centena = Math.floor(valor / 100);
  const resto = valor % 100;
  if (centena) partes.push(centenas[centena]);
  if (resto >= 10 && resto < 20) partes.push(especiais[resto - 10]);
  else {
    const dezena = Math.floor(resto / 10);
    const unidade = resto % 10;
    if (dezena) partes.push(dezenas[dezena]);
    if (unidade) partes.push(unidades[unidade]);
  }
  return partes.join(" e ");
}

export function inteiroPorExtenso(valor: number): string {
  const numero = Math.floor(Math.abs(valor));
  if (numero === 0) return "zero";
  const partes: { texto: string; valor: number }[] = [];
  const bilhoes = Math.floor(numero / 1_000_000_000);
  const milhoes = Math.floor((numero % 1_000_000_000) / 1_000_000);
  const milhares = Math.floor((numero % 1_000_000) / 1000);
  const resto = numero % 1000;
  if (bilhoes) partes.push({ texto: `${bilhoes === 1 ? "um bilhão" : `${ate999(bilhoes)} bilhões`}`, valor: bilhoes });
  if (milhoes) partes.push({ texto: `${milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`}`, valor: milhoes });
  if (milhares) partes.push({ texto: milhares === 1 ? "mil" : `${ate999(milhares)} mil`, valor: milhares });
  if (resto) partes.push({ texto: ate999(resto), valor: resto });
  return partes.map((parte, index) => {
    if (index === 0) return parte.texto;
    const conector = index === partes.length - 1 && parte.valor > 100 ? " " : " e ";
    return `${conector}${parte.texto}`;
  }).join("");
}

export function valorPorExtenso(valor: number): string {
  const totalCentavos = Math.round(Math.abs(Number(valor) || 0) * 100);
  const reais = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;
  const partes: string[] = [];
  if (reais) {
    const texto = inteiroPorExtenso(reais);
    const escala = /(?:milhão|milhões|bilhão|bilhões)$/.test(texto) ? " de" : "";
    partes.push(`${texto}${escala} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return partes.length ? partes.join(" e ") : "zero real";
}

export function numeroRecibo(id: string, data: string) {
  const ano = /^\d{4}/.test(data) ? data.slice(0, 4) : String(new Date().getFullYear());
  return `REC-${ano}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function dataRecibo(data: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data.split("-").reverse().join("/");
  return data;
}
