import { test } from "node:test";
import assert from "node:assert/strict";
import {
  centimetros,
  comprimentoMetros,
  medidasProduto,
  tituloMedidas,
} from "./medidas-romaneio.ts";

test("largura digitada 0,10 sai inteira como 10 na nota", () => {
  assert.equal(centimetros(0.1), "10");
  assert.equal(
    medidasProduto(1, 0.019, 0.1, false),
    "1,00 m × 1,9 × 10 cm",
  );
});

test("medidas em centímetros sem casas desnecessárias", () => {
  assert.equal(centimetros(0.12), "12");
  assert.equal(centimetros(0.045), "4,5");
  assert.equal(centimetros(0.008), "0,8");
  assert.equal(centimetros(0.02), "2");
});

test("cilíndrica mostra o diâmetro em centímetros", () => {
  assert.equal(
    medidasProduto(2.5, 0.1, 0.1, true),
    "2,50 m × Ø 10 cm",
  );
});

test("o PDF usa o x simples e mantém o comprimento em metros", () => {
  assert.equal(
    medidasProduto(1.2, 0.019, 0.09, false, "x"),
    "1,20 m x 1,9 x 9 cm",
  );
  assert.equal(comprimentoMetros(1), "1,00");
});

test("medida ausente ou zero não vira número enganoso", () => {
  assert.equal(centimetros(null), "—");
  assert.equal(centimetros(0), "—");
});

test("título da coluna traz as unidades de cada número", () => {
  assert.equal(tituloMedidas(false), "Medidas C (m) x E x L (cm)");
  assert.equal(tituloMedidas(true), "Medidas C (m) x Ø (cm)");
});
