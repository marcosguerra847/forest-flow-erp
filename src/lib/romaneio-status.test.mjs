import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoExpedicao } from "./romaneio-status.ts";

const agora = "2026-10-22T11:39:00Z";
test("wood created shipped records all packages, pieces and volume", () => {
  assert.deepEqual(estadoExpedicao("expedido", { qtd_blocos: 3, qtd_pecas: 120, volume_m3: 2.4, quantidade_venda: 2.4 }, agora), {
    status: "expedido", expedido_em: agora, qtd_blocos_expedida: 3, qtd_pecas_expedida: 120, volume_expedido_m3: 2.4, quantidade_expedida: 2.4,
  });
});
test("chips created shipped record sold tonnage without inventing cubic volume", () => {
  const r = estadoExpedicao("expedido", { qtd_blocos: 0, qtd_pecas: 0, volume_m3: 0, quantidade_venda: 18 }, agora);
  assert.equal(r.quantidade_expedida, 18);
  assert.equal(r.volume_expedido_m3, 0);
});
test("unshipped wood and chips have no shipped quantities or timestamp", () => {
  for (const totais of [{ qtd_blocos: 3, qtd_pecas: 120, volume_m3: 2.4, quantidade_venda: 2.4 }, { qtd_blocos: 0, qtd_pecas: 0, volume_m3: 30, quantidade_venda: 30 }]) {
    assert.deepEqual(estadoExpedicao("pronto", totais, agora), { status: "pronto", expedido_em: null, qtd_blocos_expedida: null, qtd_pecas_expedida: null, volume_expedido_m3: null, quantidade_expedida: null });
  }
});
test("editing an already shipped manifest preserves actual confirmed quantities", () => {
  const existente = { status: "expedido", expedido_em: agora, qtd_blocos_expedida: 2, qtd_pecas_expedida: 80, volume_expedido_m3: 1.6, quantidade_expedida: 1.6 };
  assert.deepEqual(estadoExpedicao("expedido", { qtd_blocos: 3, qtd_pecas: 120, volume_m3: 2.4, quantidade_venda: 2.4 }, "2026-10-23T00:00:00Z", existente), existente);
});