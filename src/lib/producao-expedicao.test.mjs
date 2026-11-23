import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparProducao, aproveitamento, chavePeriodo } from "./producao-expedicao.ts";
const base = { cliente_nome: "A", qtd_pecas: 10, qtd_blocos: 1, unidade_venda: "m3", quantidade_venda: null, valor_total: 100, valor_previsto: null, expedido_em: null, criado_em: "2026-01-01T00:00:00Z" };
test("sawn wood and byproducts are summed separately per month", () => {
  const rows = [
    { ...base, tipo_carga: "madeira", descricao: "Ripa", volume_m3: 8, data_saida_carga: "2026-03-02" },
    { ...base, tipo_carga: "cavaco", descricao: "Cavaco", volume_m3: 0, quantidade_venda: 2, data_saida_carga: "2026-03-20" },
    { ...base, tipo_carga: "po_serra", descricao: "Pó", unidade_venda: "ton", quantidade_venda: 5, volume_m3: 0, data_saida_carga: "2026-04-01" },
  ];
  const [mar, abr] = agruparProducao(rows, "periodo", "mes");
  assert.equal(mar.chave, "2026-03"); assert.equal(mar.m3Serrado, 8); assert.equal(mar.m3Sub, 2); assert.equal(mar.pecas, 10);
  assert.equal(abr.tonSub, 5); assert.equal(abr.m3Serrado, 0);
  assert.equal(aproveitamento(mar), 80);
});
test("ISO week key", () => { assert.equal(chavePeriodo("2026-01-01", "semana"), "2026-S01"); assert.equal(chavePeriodo("2026-03-02", "semana"), "2026-S10"); });
