import { test } from "node:test";
import assert from "node:assert/strict";
import { descricaoProdutoEtiqueta, selecionarProdutoRomaneio } from "./nota-produto.ts";

const itens = [
  { descricao: "Ripa de eucalipto", comprimento_m: 2, espessura_m: 0.02, largura_m: 0.05, qtd_blocos: 4, pecas_por_pacote: 20, qtd_pecas: 80, volume_m3: 0.16, valor_unitario: 700, valor_total: 112 },
  { descricao: "Escora de eucalipto", comprimento_m: 2.5, espessura_m: 0.1, largura_m: 0.1, qtd_blocos: 2, pecas_por_pacote: 50, qtd_pecas: 100, volume_m3: 1.963495, valor_unitario: 900, valor_total: 1767.1455 },
];
const romaneio = {
  codigo: "PX-2026-0099", descricao: "Romaneio com 2 produtos", cliente_nome: "Cliente Teste",
  espessura_cm: null, largura_cm: null, comprimento_m: null, qtd_blocos: 6, qtd_pecas: 180,
  volume_m3: 2.123495, qtd_blocos_expedida: 6, qtd_pecas_expedida: 180, volume_expedido_m3: 2.123495,
  status: "expedido", operador_nome: null, expedido_em: null, criado_em: "2026-11-19", itens,
};

test("a etiqueta de um produto usa somente quantidades e valores desse produto", () => {
  const nota = selecionarProdutoRomaneio(romaneio, itens[1]);
  assert.equal(nota.descricao, "Escora de eucalipto");
  assert.equal(nota.qtd_blocos, 2);
  assert.equal(nota.qtd_pecas, 100);
  assert.equal(nota.volume_m3, 1.963495);
  assert.equal(nota.valor_previsto, 1767.1455);
  assert.deepEqual(nota.itens, [itens[1]]);
  assert.equal(nota.qtd_blocos_expedida, null);
  assert.equal(nota.codigo, "PX-2026-0099");
  assert.equal(nota.cliente_nome, "Cliente Teste");
});

test("a descrição da etiqueta inclui comprimento, espessura e largura", () => {
  assert.equal(descricaoProdutoEtiqueta(itens[0], false), "Ripa de eucalipto — 2,00 × 0,02 × 0,05 m");
});

test("a descrição cilíndrica inclui comprimento e diâmetro", () => {
  assert.equal(descricaoProdutoEtiqueta(itens[1], true), "Escora de eucalipto — 2,50 × Ø 0,1 m");
});

test("sem seleção a nota conserva todos os produtos e totais do romaneio", () => {
  const nota = selecionarProdutoRomaneio(romaneio, null);
  assert.equal(nota, romaneio);
  assert.equal(nota.qtd_blocos, 6);
  assert.equal(nota.itens.length, 2);
});
