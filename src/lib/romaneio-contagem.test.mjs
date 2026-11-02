import { test } from "node:test";
import assert from "node:assert/strict";
import { contarPacotesProntos } from "./romaneio-contagem.ts";
import { filtrarPorData } from "./romaneio-filtro.ts";

test("counts only ready loads that carry blocks, ignoring chips and sawdust", () => {
  const rows = [
    { status: "pronto", situacao_pagamento: "pendente", tipo_carga: "madeira", qtd_blocos: 12 },
    { status: "pronto", situacao_pagamento: "pendente", tipo_carga: "cavaco", qtd_blocos: 0 },
    { status: "pronto", situacao_pagamento: "pendente", tipo_carga: "po_serra", qtd_blocos: 0 },
    { status: "expedido", situacao_pagamento: "pendente", tipo_carga: "madeira", qtd_blocos: 9 },
  ];
  assert.equal(contarPacotesProntos(rows), 1);
});

test("counts every block load as ready no matter how it is paid", () => {
  assert.equal(contarPacotesProntos([
    { status: "pronto", situacao_pagamento: "pago", qtd_blocos: 5 },
    { status: "pronto", situacao_pagamento: "permuta", qtd_blocos: 5 },
    { status: "pronto", situacao_pagamento: "pendente", qtd_blocos: 5 },
    { status: "expedido", situacao_pagamento: "pago", qtd_blocos: 5 },
  ]), 3);
});

test("counts only ready block loads in the selected period", () => {
  const rows = [
    { status: "pronto", qtd_blocos: 4, data_saida_carga: "2026-11-02" },
    { status: "pronto", qtd_blocos: 6, data_saida_carga: "2026-11-01" },
    { status: "pronto", qtd_blocos: 0, data_saida_carga: "2026-11-02" },
    { status: "expedido", qtd_blocos: 7, data_saida_carga: "2026-11-02" },
  ];
  assert.equal(contarPacotesProntos(filtrarPorData(rows, {
    campo: "saida", de: "2026-11-02", ate: "2026-11-02",
  })), 1);
});

test("does not count a load whose block quantity is missing", () => {
  assert.equal(contarPacotesProntos([
    { status: "pronto", qtd_blocos: null },
    { status: "pronto", qtd_blocos: "" },
    { status: "pronto", qtd_blocos: "3" },
  ]), 1);
});
