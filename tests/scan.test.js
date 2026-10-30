// Búsqueda del producto por código: catálogo local, Open Food Facts y GTINSearch (con la red simulada).
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const realFetch = global.fetch, calls = [];
const catalogGz = fs.readFileSync(path.join(__dirname, '..', 'app', 'data', 'argentina-catalog.tsv.gz'));
let off = () => new Response('{}', { status: 404 }), gtin = () => new Response('[]', { status: 200 });
global.fetch = async url => {
  calls.push(String(url));
  if (String(url).includes('argentina-catalog')) return new Response(catalogGz, { status: 200 });
  if (String(url).includes('openfoodfacts')) return off();
  if (String(url).includes('gtinsearch')) return gtin();
  throw new Error('red no simulada: ' + url);
};
const V = require('../app/scan.js');

test('categoría por nombre (reglas de la app)', () => {
  assert.equal(V.suggest('Leche entera La Serenísima 1 L'), 'lacteos'); assert.equal(V.suggest('Pechuga de pollo'), 'carnes');
  assert.equal(V.suggest('Detergente Magistral'), 'limpieza'); assert.equal(V.suggest('xyzzy'), '');
  assert.equal(V.fromTags(['en:beverages', 'en:waters']), 'bebidas');
});
test('nombres en mayúsculas de GTINSearch se limpian', () => {
  assert.equal(V.cleanSepaName('VINAGRE DE VINO FAVINCO 500ML'), 'Vinagre de Vino Favinco 500 ml');
  assert.equal(V.cleanSepaName('LECHE ENTERA 1.5L'), 'Leche Entera 1.5 l');
});
test('el catálogo local responde sin red y sin importar los ceros a la izquierda', async () => {
  const [line] = require('node:zlib').gunzipSync(catalogGz).toString().split('\n').filter(Boolean).slice(5, 6), [code, name] = line.split('\t');
  calls.length = 0;
  const r = await V.lookup(code.padStart(13, '0'), 'es', false);
  assert.ok(r && r.name === name.slice(0, 200), 'catálogo: ' + code); assert.ok(!calls.some(c => c.includes('openfoodfacts') || c.includes('gtinsearch')), 'no sale ningún pedido');
});
test('sin la búsqueda en línea, un código que no está queda sin nombre y sin pedidos', async () => {
  calls.length = 0; assert.equal(await V.lookup('7791234567890', 'es', false), null); assert.ok(!calls.some(c => !c.includes('argentina-catalog')));
});
test('con la búsqueda en línea: Open Food Facts primero, GTINSearch si no está', async () => {
  off = () => new Response(JSON.stringify({ status: 'success', product: { product_name_es: 'Galletitas Surtidas', brands: 'Bagley', categories_tags: ['en:biscuits'] } }), { status: 200 });
  let r = await V.lookup('7790001112223', 'es', true); assert.deepEqual(r, { name: 'Galletitas Surtidas Bagley', category: 'panificados' });
  off = () => new Response('{}', { status: 404 }); gtin = () => new Response(JSON.stringify([{ name: 'YERBA MATE SUAVE 1KG', size: '' }]), { status: 200 }); calls.length = 0;
  r = await V.lookup('7790001112224', 'es', true); assert.equal(r.name, 'Yerba Mate Suave 1 kg'); assert.ok(calls.some(c => c.includes('gtinsearch')));
  gtin = () => new Response('[]', { status: 200 }); assert.equal(await V.lookup('7790001112225', 'es', true), null);
});
test('un fallo de red no se recuerda como «no existe»', async () => {
  off = () => { throw new Error('sin red'); }; gtin = () => { throw new Error('sin red'); };
  assert.equal(await V.lookup('7790001119999', 'es', true), null);
  off = () => new Response(JSON.stringify({ status: 'success', product: { product_name: 'Fideos Tallarín' } }), { status: 200 });
  assert.equal((await V.lookup('7790001119999', 'es', true)).name, 'Fideos Tallarín');
});
test.after(() => { global.fetch = realFetch; });

test('catálogo de EE. UU.: se encuentra por bisección, con o sin ceros, y solo para códigos de EE. UU.', async () => {
  const gz = fs.readFileSync(path.join(__dirname, '..', 'app', 'data', 'usa-catalog.tsv.gz')); global.fetch = async url => (String(url).includes('usa-catalog') ? new Response(gz, { status: 200 }) : String(url).includes('argentina') ? new Response(catalogGz, { status: 200 }) : new Response('{}', { status: 404 }));
  const lines = require('node:zlib').gunzipSync(gz).toString().split('\n').filter(Boolean), [code, name] = lines[1234].split('\t');
  for (const c of [code.padStart(12, '0'), code.padStart(13, '0')]) { const r = await V.lookup(c, 'en', false); assert.equal(r && r.name, name.slice(0, 200).trim(), c + ' => ' + JSON.stringify(r)); }
  const last = lines[lines.length - 1].split('\t'); assert.equal((await V.lookup(last[0].padStart(12, '0'), 'en', false)).name, last[1].slice(0, 200).trim(), 'último');
  assert.equal(await V.lookup('7791234000001', 'en', false), null, 'un 779 no baja el catálogo de EE. UU.');
});
