const test = require('node:test'), assert = require('node:assert');
const calls = [];
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
globalThis.location = { search: '' };
let reply = () => ({ ok: true, text: async () => '{}' });
globalThis.fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body), headers: init.headers }); return reply(); };
const A = require('../auth.js');

test('apagado por defecto y se activa con ?cuenta=1', () => {
  assert.equal(A.enabled(), false);
  globalThis.location = { search: '?cuenta=1' }; assert.equal(A.enabled(), true);
  globalThis.location = { search: '' }; assert.equal(A.enabled(), true);
  globalThis.location = { search: '?cuenta=0' }; assert.equal(A.enabled(), false);
});
test('iniciar sesión guarda la sesión y manda la clave pública', async () => {
  reply = () => ({ ok: true, text: async () => JSON.stringify({ access_token: 'a1', refresh_token: 'r1', user: { id: 'u1', email: 'x@y.z' } }) });
  assert.equal(await A.signInWithEmail(' x@y.z ', 'pw', false), true);
  assert.match(calls.at(-1).url, /grant_type=password$/); assert.equal(calls.at(-1).body.email, 'x@y.z'); assert.ok(calls.at(-1).headers.apikey);
  assert.equal(A.email(), 'x@y.z'); assert.equal(A.signedIn(), true);
});
test('crear cuenta sin sesión devuelve false (falta confirmar el correo)', async () => {
  A.signOut();
  reply = () => ({ ok: true, text: async () => JSON.stringify({ id: 'u2', email: 'n@y.z' }) });
  assert.equal(await A.signInWithEmail('n@y.z', 'pw', true), false);
  assert.match(calls.at(-1).url, /\/signup$/); assert.equal(A.signedIn(), false);
});
test('error del servidor devuelve su mensaje', async () => {
  reply = () => ({ ok: false, status: 400, text: async () => JSON.stringify({ error_description: 'Invalid login credentials' }) });
  await assert.rejects(A.signInWithEmail('a@b.c', 'mal', false), /Invalid login credentials/);
});
test('refresh rechazado cierra la sesión', async () => {
  reply = () => ({ ok: true, text: async () => JSON.stringify({ access_token: 'a', refresh_token: 'r', user: { id: 'u', email: 'e@e.e' } }) });
  await A.signInWithEmail('e@e.e', 'p', false);
  reply = () => ({ ok: false, status: 400, text: async () => '{"error":"invalid_grant"}' });
  assert.equal(await A.refresh(), false); assert.equal(A.signedIn(), false);
});
