import { test } from "node:test";
import assert from "node:assert/strict";
import { resumirTorasTalhao } from "./toras-talhao.ts";

test("soma as entradas do mesmo talhão sem misturar outras origens", () => {
  assert.deepEqual(resumirTorasTalhao([
    { talhao_id: "T01", volume_m3: "11.781", quantidade: 40 },
    { talhao_id: "T01", volume_m3: 2, quantidade: 5 },
    { talhao_id: "T02", volume_m3: 100, quantidade: 500 },
    { talhao_id: null, volume_m3: 50, quantidade: 200 },
  ], "T01"), { volume_m3: 13.781, quantidade: 45 });
});

test("entradas sem talhão continuam separadas e talhão sem entradas soma zero", () => {
  const entradas = [{ talhao_id: null, volume_m3: 3, quantidade: 10 }];
  assert.deepEqual(resumirTorasTalhao(entradas, null), { volume_m3: 3, quantidade: 10 });
  assert.deepEqual(resumirTorasTalhao(entradas, "T01"), { volume_m3: 0, quantidade: 0 });
});