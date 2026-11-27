import test from "node:test";
import assert from "node:assert/strict";
import { prepararPedidoDocumento } from "./pedido-documento.ts";

const base = { tipo_carga: "madeira", itens: [], unidade_venda: "m3", quantidade_venda: 0, valor_unitario: 0, volume_m3: 0, qtd_blocos: 0, qtd_pecas: 0, valor_total: 0 };
const produto = { descricao: "Ripa", comprimento_m: "2", espessura_m: "0.02", largura_m: "0.10", qtd_blocos: "2", pecas_por_pacote: "50", valor_unitario: "1000" };
test("PDF usa a mesma cubagem retangular dos produtos do pedido", () => {
  const r = prepararPedidoDocumento({ ...base, itens: [produto], volume_m3: 0.4, qtd_blocos: 2, qtd_pecas: 100, valor_total: 400 });
  assert.equal(r.produtos[0]?.volume, 0.4);
  assert.equal(r.produtos[0]?.valor, 400);
  assert.equal(r.valor, 400);
});
test("PDF calcula produtos cilíndricos pela área circular", () => {
  const r = prepararPedidoDocumento({ ...base, tipo_carga: "cilindrica", itens: [{ ...produto, espessura_m: "0.10" }] });
  assert.ok(Math.abs((r.produtos[0]?.volume ?? 0) - Math.PI * 0.05 ** 2 * 2 * 100) < 1e-10);
});
for (const tipo_carga of ["cavaco", "po_serra"]) test(`PDF preserva venda por toneladas de ${tipo_carga} sem inventar m³`, () => {
  const r = prepararPedidoDocumento({ ...base, tipo_carga, unidade_venda: "ton", quantidade_venda: 12, valor_unitario: 100, valor_total: 1200 });
  assert.equal(r.granel, true);
  assert.equal(r.legado, false);
  assert.equal(r.volume, 0);
  assert.equal(r.valor, 1200);
});
test("exportação mantém valores manuais dos pedidos antigos", () => {
  const r = prepararPedidoDocumento({ ...base, valor_total: 1234.56, volume_m3: 8, qtd_pecas: 10 });
  assert.equal(r.legado, true);
  assert.equal(r.valor, 1234.56);
  assert.equal(r.volume, 8);
  assert.equal(r.pecas, 10);
});