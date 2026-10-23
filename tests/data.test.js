// Integridad de los datos y de las traducciones de la PWA.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const app = path.join(__dirname, '..', 'app'), read = f => fs.readFileSync(path.join(app, f), 'utf8');
const LANGS = ['es', 'en', 'pt', 'fr', 'it', 'de'];

test('todas las recetas tienen foto y sus campos', () => {
  const ids = new Set();
  LANGS.forEach(l => { JSON.parse(read('data/recipes-' + l + '.json')).forEach(r => { ids.add(r.id); assert.ok(r.title && Array.isArray(r.steps) && r.steps.length && Array.isArray(r.ingredients), l + ':' + r.id); r.ingredients.forEach(i => assert.ok(typeof i.name === 'string', r.id)); }); });
  assert.ok(ids.size >= 1000);
  const missing = [...ids].filter(id => !fs.existsSync(path.join(app, 'photos', id + '.webp')));
  assert.deepEqual(missing, [], 'recetas sin foto');
});
test('carga rápida: nombres en los 6 idiomas y foto', () => {
  const q = JSON.parse(read('data/quick.json')); assert.ok(q.length >= 100);
  q.forEach(([id, kind, days, place, names]) => { assert.ok(days > 0 && kind && place, id); LANGS.forEach(l => assert.ok(names[l], id + ':' + l)); assert.ok(fs.existsSync(path.join(app, 'quick-photos', id + '.webp')), 'foto ' + id); });
});
test('el compositor tiene texto en los 6 idiomas', () => {
  const c = JSON.parse(read('data/composer.json')); LANGS.forEach(l => { assert.ok(c.roles[l]); c.templates.forEach(t => assert.ok(t.text[l] && t.text[l].steps.length, t.id + ':' + l)); });
});
test('i18n: cada texto de la app tiene traducción a los 5 idiomas', () => {
  const ctx = { window: {} }; vm.runInNewContext(read('i18n.js'), ctx); const I = ctx.window.I18N;
  const src = read('app.js') + read('scan.js');
  const keys = new Set(); for (const m of src.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  const missing = []; keys.forEach(k => ['en', 'pt', 'fr', 'it', 'de'].forEach(l => { if (!(I[l] && I[l][k])) missing.push(l + ': ' + k); }));
  assert.deepEqual(missing, []);
});
test('el service worker precachea los archivos de la app', () => {
  const sw = read('sw.js'); ['index.html', 'app.css', 'app.js', 'i18n.js', 'icons.js', 'dateparser.js', 'scan.js', 'recipes.js', 'manifest.webmanifest'].forEach(f => assert.ok(sw.includes("'" + f + "'"), f));
  const html = read('index.html'); ['i18n.js', 'icons.js', 'dateparser.js', 'scan.js', 'recipes.js', 'app.js'].forEach(f => assert.ok(html.includes('src="' + f + '"'), f));
});
test('la versión es la de las apps', () => { assert.match(read('app.js'), /const APP_VERSION = '\d+\.\d+\.\d+'/); });
