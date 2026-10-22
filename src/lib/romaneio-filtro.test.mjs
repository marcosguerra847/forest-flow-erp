import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dataRomaneio,
  filtrarPorData,
  periodo,
} from "./romaneio-filtro.ts";

const romaneios = [
  {
    codigo: "PX-1",
    criado_em: "2026-10-20T12:00:00Z",
    data_saida_carga: "2026-10-21",
    expedido_em: "2026-10-22T12:00:00Z",
  },
  {
    codigo: "PX-2",
    criado_em: "2026-10-22T12:00:00Z",
    data_saida_carga: "2026-10-22",
    expedido_em: null,
  },
  {
    codigo: "PX-3",
    criado_em: "2026-10-15T12:00:00Z",
    data_saida_carga: null,
    expedido_em: null,
  },
];

test("each date field answers its own kind of query", () => {
  assert.equal(dataRomaneio(romaneios[0], "registro"), "2026-10-20");
  assert.equal(dataRomaneio(romaneios[0], "saida"), "2026-10-21");
  assert.equal(dataRomaneio(romaneios[0], "expedicao"), "2026-10-22");
  assert.equal(dataRomaneio(romaneios[2], "saida"), null);
});

test("filter by shipping date returns only romaneios that left in the period", () => {
  const r = filtrarPorData(romaneios, {
    campo: "saida",
    de: "2026-10-21",
    ate: "2026-10-21",
  });
  assert.deepEqual(
    r.map((x) => x.codigo),
    ["PX-1"],
  );
});

test("filter by shipping date on a day nothing left returns empty, not everything", () => {
  const r = filtrarPorData(romaneios, {
    campo: "saida",
    de: "2026-10-20",
    ate: "2026-10-20",
  });
  assert.deepEqual(r, []);
});

test("open-ended period keeps everything up to the chosen day", () => {
  const r = filtrarPorData(romaneios, {
    campo: "registro",
    de: "",
    ate: "2026-10-20",
  });
  assert.deepEqual(
    r.map((x) => x.codigo),
    ["PX-1", "PX-3"],
  );
});

test("no period selected shows every romaneio", () => {
  assert.equal(filtrarPorData(romaneios, { campo: "registro", de: "", ate: "" }).length, 3);
});

test("quick periods are inclusive calendar days", () => {
  const agora = new Date(2026, 9, 22, 15, 56);
  assert.deepEqual(periodo("hoje", agora), { de: "2026-10-22", ate: "2026-10-22" });
  assert.deepEqual(periodo("7dias", agora), { de: "2026-10-16", ate: "2026-10-22" });
  assert.deepEqual(periodo("mes", agora), { de: "2026-10-01", ate: "2026-10-22" });
  assert.deepEqual(periodo("tudo", agora), { de: "", ate: "" });
});
