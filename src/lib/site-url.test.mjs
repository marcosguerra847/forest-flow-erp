import { test } from "node:test";
import assert from "node:assert/strict";
import { SITE_PUBLICO, linkRomaneio } from "./site-url.ts";

test("romaneio links open on the farm's own domain", () => {
  assert.equal(SITE_PUBLICO, "https://sistemafazendabelavista.com.br");
  assert.equal(
    linkRomaneio("PX-2026-0023", "abc def"),
    "https://sistemafazendabelavista.com.br/x/PX-2026-0023?t=abc%20def",
  );
});

test("romaneio links carry no platform branding", () => {
  const link = linkRomaneio("PX-2026-0023", "tok123").toLowerCase();
  assert.ok(!link.includes("lovable"), `link still branded: ${link}`);
});
