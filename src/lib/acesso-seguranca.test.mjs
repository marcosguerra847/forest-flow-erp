import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// Integration checks against the configured backend. Credentials are read only
// from the test environment and are never logged or persisted by these tests.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && key && secret);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
let admin;
let user;
let userId;
let ready;

async function setup() {
  if (ready) return ready;
  ready = (async () => {
    assert.ok(url && key && secret);
    admin = createClient(url, secret, options);
    user = createClient(url, key, options);
    const email = `access-check-${crypto.randomUUID()}@example.com`;
    const password = `${crypto.randomUUID()}Aa9!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.equal(Boolean(created.error), false, "test account creation succeeds");
    userId = created.data.user?.id;
    assert.ok(userId);
    const signed = await user.auth.signInWithPassword({ email, password });
    assert.equal(Boolean(signed.error), false, "new account can sign in");
  })();
  return ready;
}

after(async () => {
  if (admin && userId) {
    const deleted = await admin.auth.admin.deleteUser(userId);
    assert.equal(Boolean(deleted.error), false, "temporary account is removed");
  }
});

test("signup creates a profile but no automatic manager or admin role", { skip: !enabled }, async () => {
  await setup();
  const profile = await admin.from("profiles").select("id").eq("id", userId);
  assert.equal(profile.data?.length, 1);
  const roles = await admin.from("user_roles").select("role").eq("user_id", userId);
  assert.equal(roles.data?.length, 0);
});

test("an account without an approved role cannot read any farm table", { skip: !enabled }, async () => {
  await setup();
  for (const table of ["clientes", "pacotes_expedicao", "itens_romaneio", "orcamentos", "fazendas", "talhoes", "toras", "cargas", "eventos_qr", "contas_financeiras"]) {
    const result = await user.from(table).select("*").limit(1);
    assert.equal(Boolean(result.error), false, `${table} query is filtered by permissions`);
    assert.deepEqual(result.data, [], `${table} is invisible without a role`);
  }
});

test("new accounts cannot create budgets or promote themselves", { skip: !enabled }, async () => {
  await setup();
  const budget = await user.from("orcamentos").insert({ codigo: `TEST-${crypto.randomUUID()}`, cliente_nome: "Security test", itens: [] });
  assert.equal(budget.error?.code, "42501");
  const role = await user.from("user_roles").insert({ user_id: userId, role: "admin" });
  assert.equal(role.error?.code, "42501");
  const code = await user.rpc("proximo_codigo", { _prefixo: "ORC" });
  assert.ok(code.error);
});

test("anonymous callers cannot list manifests, access secrets or download QR files", { skip: !enabled }, async () => {
  await setup();
  const anon = createClient(url, key, options);
  for (const table of ["pacotes_expedicao", "qr_acessos", "eventos_qr", "clientes"]) {
    const result = await anon.from(table).select("*").limit(1);
    assert.ok(result.error || result.data?.length === 0, `${table} cannot be enumerated`);
  }
  const files = await anon.storage.from("qr-eventos").list("entregas");
  assert.ok(files.error || files.data?.length === 0);
});