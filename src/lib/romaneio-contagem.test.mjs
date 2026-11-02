import { test } from "node:test";
import assert from "node:assert/strict";
import { contarPacotesProntos } from "./romaneio-contagem.ts";
import { filtrarPorData } from "./romaneio-filtro.ts";

test("counts ready unpaid loads including chips and sawdust with no blocks", () => {
  const rows = [
    { status: "pronto", situacao_pagamento: "pendente", tipo_carga: "madeira", qtd_blocos: 12 },
    { status: "pronto", situacao_pagamento: "pendente", tipo_carga: "cavaco", qtd_blocos: 0 },
    { status: "pronto", situacao_pagamento: "pendente", tipo_carga: "po_serra", qtd_blocos: 0 },
    { status: "expedido", situacao_pagamento: "pendente", tipo_carga: "madeira", qtd_blocos: 9 },
  ];
  assert.equal(contarPacotesProntos(rows), 3);
});

test("payment status does not change whether a load is ready", () => {
  assert.equal(contarPacotesProntos([
    { status: "pronto", situacao_pagamento: "pago" },
    { status: "pronto", situacao_pagamento: "permuta" },
    { status: "expedido", situacao_pagamento: "pago" },
  ]), 2);
});

test("counts only ready loads in the selected period", () => {
  const rows = [
    { status: "pronto", data_saida_carga: "2026-11-02" },
    { status: "pronto", data_saida_carga: "2026-11-01" },
    { status: "expedido", data_saida_carga: "2026-11-02" },
  ];
  assert.equal(contarPacotesProntos(filtrarPorData(rows, {
    campo: "saida", de: "2026-11-02", ate: "2026-11-02",
  })), 1);
});