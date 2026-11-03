import { test } from "node:test";
import assert from "node:assert/strict";
import { calcM3Cilindrico, ehCilindrica } from "./volume-cilindrico.ts";

test("volume usa área circular: Ø 0,10 m × 2,50 m × 100 peças", () => {
  assert.ok(Math.abs(calcM3Cilindrico(2.5, 0.1, 100) - 1.963495) < 1e-5);
});

test("sem diâmetro o volume é zero", () => {
  assert.equal(calcM3Cilindrico(2.5, 0, 100), 0);
});

test("só o tipo cilíndrica usa o cálculo circular", () => {
  assert.equal(ehCilindrica("cilindrica"), true);
  assert.equal(ehCilindrica("madeira"), false);
  assert.equal(ehCilindrica("cavaco"), false);
});
