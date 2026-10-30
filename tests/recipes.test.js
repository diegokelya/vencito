const test = require('node:test'), assert = require('node:assert/strict');
const V = require('../app/recipes.js'), composer = require('../app/data/composer.json');
V.setComposer(composer);

test('escalar porciones', () => {
  const s = (a, f) => V.scale(a, f, 'es');
  assert.equal(s('300 g', 2), '600 g'); assert.equal(s('1/2 taza', 3), '1 1/2 tazas'); assert.equal(s('1 unidad', 2), '2 unidades');
  assert.equal(s('2 cucharadas', 0.5), '1 cucharada'); assert.equal(s('1 kg', 1.5), '1.5 kg');
  assert.equal(s('1 lata o 2 tomates', 2), '1 lata o 2 tomates', 'varios números: se deja igual'); assert.equal(s('al gusto', 2), 'al gusto'); assert.equal(s('300 g', 1), '300 g');
});
test('unidades métrico / imperial', () => {
  assert.equal(V.display('300 g', 'imperial'), '11 oz'); assert.equal(V.display('1 kg', 'imperial'), '2.2 lb'); assert.equal(V.display('250 ml', 'imperial'), '8.5 fl oz');
  assert.equal(V.display('8 oz', 'metric'), '225 g'); assert.equal(V.display('1 lb', 'metric'), '455 g'); assert.equal(V.display('2 tazas', 'imperial'), '2 tazas');
  assert.equal(V.display('10 g', 'imperial'), '10 g', 'cantidades chicas quedan en gramos'); assert.equal(V.display('300 g', 'metric'), '300 g');
});
const p = (name, daysLeft, kind) => ({ name, daysLeft, kind, soon: daysLeft <= 5 });
test('roles de los productos, sin confundir lo preparado', () => {
  const r = x => [...V.rolesOf(x)].sort().join(',');
  assert.equal(r(p('Pollo', 2, 'carnes')), 'protein'); assert.equal(r(p('Zanahoria', 3, 'verduras')), 'veg'); assert.equal(r(p('Huevos', 9, 'almacen')), 'egg');
  assert.equal(r(p('Arroz largo fino', 200, 'almacen')), 'rice'); assert.equal(r(p('Queso cremoso', 5, 'lacteos')), 'cheese');
  assert.equal(r(p('Sopa de pollo', 20, 'carnes')), '', 'una sopa de pollo no es pollo'); assert.equal(r(p('Puré de papas', 30, 'almacen')), '');
});
test('ideas armadas: usan lo que vence primero y no se repiten', () => {
  const pantry = [p('Pollo', 2, 'carnes'), p('Zanahoria', 3, 'verduras'), p('Huevos', 10, 'almacen'), p('Arroz largo fino', 200, 'almacen'), p('Queso cremoso', 5, 'lacteos'), p('Leche', 1, 'lacteos')];
  const a = V.suggest('es', pantry, 3, []); assert.equal(a.length, 3);
  assert.equal(a[0].title, 'Salteado de pollo con zanahoria'); assert.deepEqual(a[0].pantryIngredients, ['Pollo', 'Zanahoria']); assert.ok(a[0].extraIngredients.includes('Sal'));
  const b = V.suggest('es', pantry, 3, a.map(x => x.title)); b.forEach(x => assert.ok(!a.some(y => y.title === x.title)));
  ['es', 'en', 'pt', 'fr', 'it', 'de'].forEach(l => assert.ok(V.suggest(l, pantry, 1, []).length === 1, l));
  assert.deepEqual(V.suggest('es', [], 3, []), []); assert.deepEqual(V.suggest('es', [p('Detergente', 5, 'limpieza')], 3, []), []);
});
