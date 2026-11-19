import { test } from "node:test";
import assert from "node:assert/strict";
import { dataRecibo, inteiroPorExtenso, numeroRecibo, valorPorExtenso } from "./recibo.ts";

test("recibo escreve reais e centavos por extenso", () => {
  assert.equal(valorPorExtenso(1234.56), "mil duzentos e trinta e quatro reais e cinquenta e seis centavos");
  assert.equal(valorPorExtenso(1), "um real");
  assert.equal(valorPorExtenso(0.01), "um centavo");
});

test("recibo trata centena cheia e escala de milhão", () => {
  assert.equal(inteiroPorExtenso(100), "cem");
  assert.equal(valorPorExtenso(1000000), "um milhão de reais");
});

test("número e data do recibo são estáveis e legíveis", () => {
  assert.equal(numeroRecibo("a1b2c3d4-e5f6-7890", "2026-11-19"), "REC-2026-A1B2C3");
  assert.equal(dataRecibo("2026-11-19"), "19/11/2026");
});
