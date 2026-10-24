// Demo del lector de fechas de las landings (assets/site.js), con un DOM mínimo.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'site.js'), 'utf8');

function demo(lang) {
  const el = () => ({ textContent: '', className: '', value: '', classList: { add() {} }, addEventListener(e, cb) { this.cb = cb; }, focus() {} });
  const els = { 'label-text': el(), 'result-date': el(), 'result-pill': el(), 'result-how': el() };
  const document = { documentElement: { lang }, getElementById: id => els[id] || null, querySelectorAll: () => [], querySelector: () => null };
  vm.runInNewContext(src, { document, window: {}, Intl, Date, Math });
  return text => {
    els['label-text'].value = text; els['label-text'].cb();
    return { date: els['result-date'].textContent, how: els['result-how'].textContent };
  };
}

test('frases de vencimiento en francés, italiano y alemán se toman como marcador', () => {
  [['fr', 'À consommer avant le 3/4/27', '3 avril 2027', 'A CONSOMMER AVANT LE'],
    ['fr', 'A consommer de préférence avant le 12/06/2027', '12 juin 2027', 'A CONSOMMER DE PREFERENCE AVANT LE'],
    ['fr', 'DDM 2027-06-12', '12 juin 2027', 'DDM'],
    ['it', 'Da consumarsi entro il 3/4/27', '3 aprile 2027', 'DA CONSUMARSI ENTRO IL'],
    ['it', 'Da consumarsi preferibilmente entro 2027-06-12', '12 giugno 2027', 'DA CONSUMARSI PREFERIBILMENTE ENTRO'],
    ['de', 'Mindestens haltbar bis 3/4/27', '3. April 2027', 'MINDESTENS HALTBAR BIS'],
    ['de', 'Verbrauchen bis 2027-06-12', '12. Juni 2027', 'VERBRAUCHEN BIS'],
  ].forEach(([lang, text, date, marker]) => {
    const r = demo(lang)(text);
    assert.ok(r.date.includes(date), `${text} → ${r.date}`);
    assert.ok(r.how.includes(marker), `${text} → ${r.how}`);
  });
});

test('HERGESTELLT cuenta como elaboración: gana la fecha de vencimiento', () => {
  const run = demo('de');
  assert.ok(run('HERGESTELLT 03.01.26 Mindestens haltbar bis 3/4/27').date.includes('3. April 2027'));
  // Sin marcador de vencimiento, se descarta la fecha que sigue a HERGESTELLT.
  assert.ok(run('HERGESTELLT 03.01.26 14.02.27').date.includes('14. Februar 2027'));
});

test('los ejemplos de cada landing siguen leyéndose', () => {
  const pages = { es: 'index.html', en: 'en/index.html', pt: 'pt/index.html', fr: 'fr/index.html', it: 'it/index.html', de: 'de/index.html' };
  for (const [lang, f] of Object.entries(pages)) {
    const html = fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), run = demo(lang);
    const samples = [html.match(/id="label-text" type="text" value="([^"]*)"/)[1], ...[...html.matchAll(/data-sample="([^"]*)"/g)].map(m => m[1])];
    assert.equal(samples.length, 6, f);
    samples.forEach(s => assert.match(run(s).date, /20(26|27)/, `${lang}: ${s}`));
  }
});
