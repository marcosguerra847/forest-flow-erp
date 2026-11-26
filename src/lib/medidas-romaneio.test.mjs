import { test } from "node:test";
import assert from "node:assert/strict";
import {
  medidaMetros,
  comprimentoMetros,
  medidasProduto,
  tituloMedidas,
} from "./medidas-romaneio.ts";

test("largura digitada 0,10 mantém o zero final em metros", () => {
  assert.equal(medidaMetros(0.1), "0,10");
  assert.equal(
    medidasProduto(1, 0.019, 0.1, false),
    "1,00 × 0,019 × 0,10 m",
  );
});

test("medidas mantêm metros e precisão sem conversão", () => {
  assert.equal(medidaMetros(0.12), "0,12");
  assert.equal(medidaMetros(0.045), "0,045");
  assert.equal(medidaMetros(0.008), "0,008");
  assert.equal(medidaMetros(0.02), "0,02");
});

test("cilíndrica mantém o diâmetro em metros", () => {
  assert.equal(
    medidasProduto(2.5, 0.1, 0.1, true),
    "2,50 × Ø 0,10 m",
  );
});

test("o PDF usa o x simples e mantém o comprimento em metros", () => {
  assert.equal(
    medidasProduto(1.2, 0.019, 0.09, false, "x"),
    "1,20 x 0,019 x 0,09 m",
  );
  assert.equal(comprimentoMetros(1), "1,00");
});

test("medida ausente ou zero não vira número enganoso", () => {
  assert.equal(medidaMetros(null), "—");
  assert.equal(medidaMetros(0), "—");
});

test("título da coluna traz as unidades de cada número", () => {
  assert.equal(tituloMedidas(false), "Medidas C x E x L (m)");
  assert.equal(tituloMedidas(true), "Medidas C x Ø (m)");
});
