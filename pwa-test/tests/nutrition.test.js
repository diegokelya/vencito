const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const nut = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/recipe-nutrition.json')));
const fsafe = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/food-safety.json')));
test('nutrición: campos numéricos y etiquetas válidas', () => {
  const ids = Object.keys(nut); assert.ok(ids.length > 500);
  for (const id of ids) { const n = nut[id]; for (const k of ['k', 'p', 'c', 'f', 'fi']) assert.ok(Number.isFinite(n[k]), id + k); for (const x of n.t || []) assert.ok(['highProtein', 'light', 'highFiber'].includes(x)); }
});
test('conservación: textos en los 6 idiomas', () => {
  for (const l of ['es', 'en', 'pt', 'fr', 'it', 'de']) for (const k of ['title', 'storage', 'recipeStorage', 'productStorage', 'dateNote']) assert.ok(fsafe.texts[l][k], l + k);
  assert.ok(fsafe.sources.storage.startsWith('https://'));
});
