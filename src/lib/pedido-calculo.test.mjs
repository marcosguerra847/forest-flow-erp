import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularPedido, produtoPedidoVazio } from "./pedido-calculo.ts";

const item = { ...produtoPedidoVazio(), comprimento_m: "2,5", espessura_m: "0,1", largura_m: "0,2", qtd_blocos: "2", pecas_por_pacote: "50", valor_unitario: "1000" };
test("pedido de madeira calcula peças, m³ e valor como romaneio", () => {
  const t = calcularPedido("madeira", [item], "m3", "", "");
  assert.equal(t.pecas, 100);
  assert.equal(t.pacotes, 2);
  assert.equal(t.volume, 5);
  assert.equal(t.valor, 5000);
});
test("pedido cilíndrico considera a área circular sem usar largura", () => {
  const t = calcularPedido("cilindrica", [item], "m3", "", "");
  assert.ok(Math.abs(t.volume - 1.963495408493621) < 1e-10);
  assert.ok(Math.abs(t.valor - 1963.495408493621) < 1e-10);
});
for (const tipo of ["cavaco", "po_serra"]) {
  test(`${tipo} vendido por m³ calcula quantidade vezes preço`, () => {
    const t = calcularPedido(tipo, [], "m3", "12,5", "80");
    assert.equal(t.volume, 12.5);
    assert.equal(t.valor, 1000);
  });
  test(`${tipo} em toneladas não registra toneladas como m³`, () => {
    const t = calcularPedido(tipo, [], "ton", "3", "100");
    assert.equal(t.volume, 0);
    assert.equal(t.valor, 300);
  });
}