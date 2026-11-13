// El blog es HTML estático, solo en español, enlazado desde el pie y el sitemap.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('el índice y la nota están en español y tienen SEO propio', () => {
  const index = read('blog/index.html');
  const post = read('blog/como-leer-la-fecha-de-vencimiento/index.html');
  const alacena = read('blog/como-organizar-la-alacena/index.html');
  const css = read('style.css');
  for (const html of [index, post, alacena]) {
    assert.match(html, /<html lang="es">/);
    assert.match(html, /href="\/style\.css/);
    assert.match(html, /\/assets\/app-icon\.png/);
    assert.match(html, /name="description"/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /property="og:title"/);
    assert.match(html, /property="og:description"/);
    assert.match(html, /property="og:url"/);
    assert.match(html, /property="og:image"/);
    assert.doesNotMatch(html, /hreflang="(?:pt|pt-BR|fr|it|de)"/);
  }
  assert.match(index, /rel="canonical" href="https:\/\/vencito\.app\/blog\/"/);
  assert.match(index, /href="\/blog\/como-leer-la-fecha-de-vencimiento\/"/);
  assert.match(index, /href="\/blog\/como-organizar-la-alacena\/"/);
  assert.match(post, /rel="canonical" href="https:\/\/vencito\.app\/blog\/como-leer-la-fecha-de-vencimiento\/"/);
  assert.match(alacena, /rel="canonical" href="https:\/\/vencito\.app\/blog\/como-organizar-la-alacena\/"/);
  assert.match(css, /\.blog-prose/);
  assert.match(css, /\.post-list/);
});

test('la nota explica VTO, ELAB y los formatos, y cierra con las tiendas', () => {
  const post = read('blog/como-leer-la-fecha-de-vencimiento/index.html');
  for (const bit of ['VTO', 'ELAB', '25 AGO 2026', 'VTO 04/27', '08/2027', 'No es un consejo médico', 'podés', 'Sacale una foto']) {
    assert.ok(post.includes(bit), bit);
  }
  assert.match(post, /app-store-es\.svg/);
  assert.match(post, /google-play-es\.png/);
  assert.match(post, /https:\/\/apps\.apple\.com\/app\/vencito\/id6818290015/);
  assert.match(post, /https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.diegokelya\.vencito/);
  assert.doesNotMatch(post, /\b(tienes|debes|puedes|tú)\b/i);
});

test('el pie en español y el sitemap apuntan al blog', () => {
  const home = read('index.html');
  const sitemap = read('sitemap.xml');
  assert.match(home, /href="\/blog\/">Blog<\/a>/);
  assert.match(sitemap, /<loc>https:\/\/vencito\.app\/blog\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/vencito\.app\/blog\/como-leer-la-fecha-de-vencimiento\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/vencito\.app\/blog\/como-organizar-la-alacena\/<\/loc>/);
  assert.match(read('blog/index.html'), /href="\/blog\/" aria-current="page">Blog<\/a>/);
});

test('la nota de la alacena ordena lo que ya compraste y cierra con las tiendas', () => {
  const post = read('blog/como-organizar-la-alacena/index.html');
  const index = read('blog/index.html');
  const description = 'Cómo ordenar alacena, heladera y freezer: lo que vence primero adelante, lo nuevo atrás, y una mirada antes de comprar.';
  const title = 'Cómo organizar la alacena para que no se te venza nada';
  const re = (value) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  assert.match(post, re(`<title>${title} · Vencito</title>`));
  assert.match(post, re(`name="description" content="${description}"`));
  assert.match(post, re(`property="og:title" content="${title} · Vencito"`));
  assert.match(post, re(`property="og:description" content="${description}"`));
  assert.match(post, /property="og:url" content="https:\/\/vencito\.app\/blog\/como-organizar-la-alacena\/"/);
  assert.match(post, re(`name="twitter:title" content="${title} · Vencito"`));
  assert.match(post, re(`name="twitter:description" content="${description}"`));
  assert.doesNotMatch(post, /Cómo distinguir VTO de ELAB/);
  assert.doesNotMatch(post, /\b(tienes|debes|puedes|tú)\b/i);

  const json = JSON.parse(post.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/)[1]);
  assert.equal(json['@type'], 'BlogPosting');
  assert.equal(json.headline, title);
  assert.equal(json.description, description);
  assert.equal(json.datePublished, '2026-11-13');
  assert.equal(json.inLanguage, 'es');
  assert.equal(json.mainEntityOfPage, 'https://vencito.app/blog/como-organizar-la-alacena/');

  for (const bit of [
    'No es un consejo médico',
    'ni legal',
    'no lo uses',
    'Lo que vence primero, adelante',
    'heladera',
    'freezer',
    'Limpieza',
    'Botiquín',
    'Antes de comprar, mirá lo que ya tenés',
    'por semana',
    'podés',
    'avisarte antes',
    'Cómo leer la fecha de vencimiento',
  ]) {
    assert.ok(post.includes(bit), bit);
  }
  assert.equal((post.match(/\/blog\/como-leer-la-fecha-de-vencimiento\//g) || []).length, 1);

  const cta = post.slice(post.indexOf('class="blog-cta"'));
  assert.match(cta, /app-store-es\.svg/);
  assert.match(cta, /google-play-es\.png/);
  assert.match(cta, /https:\/\/apps\.apple\.com\/app\/vencito\/id6818290015/);
  assert.match(cta, /https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.diegokelya\.vencito/);
  assert.match(cta, /Gratis · Sin publicidad · Sin cuentas/);

  const indexJson = JSON.parse(index.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/)[1]);
  assert.equal(indexJson.blogPost[0].headline, title);
  assert.equal(indexJson.blogPost[0].url, 'https://vencito.app/blog/como-organizar-la-alacena/');
  assert.equal(indexJson.blogPost[1].headline, 'Cómo leer la fecha de vencimiento');
  const list = index.slice(index.indexOf('class="post-list"'));
  assert.ok(list.indexOf('/blog/como-organizar-la-alacena/') < list.indexOf('/blog/como-leer-la-fecha-de-vencimiento/'));
});

test('el blog en inglés traduce las dos notas y enlaza solo español e inglés', () => {
  const index = read('en/blog/index.html');
  const dates = read('en/blog/how-to-read-the-expiration-date/index.html');
  const pantry = read('en/blog/how-to-organize-the-pantry/index.html');
  const home = read('en/index.html');
  const sitemap = read('sitemap.xml');
  const pairs = [
    ['https://vencito.app/blog/', 'https://vencito.app/en/blog/'],
    ['https://vencito.app/blog/como-leer-la-fecha-de-vencimiento/', 'https://vencito.app/en/blog/how-to-read-the-expiration-date/'],
    ['https://vencito.app/blog/como-organizar-la-alacena/', 'https://vencito.app/en/blog/how-to-organize-the-pantry/'],
  ];

  for (const html of [index, dates, pantry]) {
    assert.match(html, /<html lang="en">/);
    assert.match(html, /property="og:locale" content="en_US"/);
    assert.match(html, /property="og:locale:alternate" content="es_AR"/);
    assert.match(html, /hreflang="es"/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /hreflang="x-default"/);
    assert.doesNotMatch(html, /hreflang="(?:pt|pt-BR|fr|it|de)"/);
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    assert.doesNotMatch(main, /podés|tenés|mirá|alacena|heladera|\bvos\b/);
    assert.match(main, /\byou\b/);
  }

  assert.match(index, /rel="canonical" href="https:\/\/vencito\.app\/en\/blog\/"/);
  assert.match(dates, /rel="canonical" href="https:\/\/vencito\.app\/en\/blog\/how-to-read-the-expiration-date\/"/);
  assert.match(pantry, /rel="canonical" href="https:\/\/vencito\.app\/en\/blog\/how-to-organize-the-pantry\/"/);
  assert.match(home, /href="\/en\/blog\/">Blog<\/a>/);
  assert.doesNotMatch(home, /Blog \(Spanish\)/);

  for (const [es, en] of pairs) {
    assert.ok(sitemap.includes(`<loc>${es}</loc>`), es);
    assert.ok(sitemap.includes(`<loc>${en}</loc>`), en);
  }
  assert.match(sitemap, /hreflang="en" href="https:\/\/vencito\.app\/en\/blog\/how-to-organize-the-pantry\/"/);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/vencito\.app\/blog\/"/);

  const indexJson = JSON.parse(index.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/)[1]);
  assert.equal(indexJson.inLanguage, 'en');
  assert.equal(indexJson.blogPost[0].url, 'https://vencito.app/en/blog/how-to-organize-the-pantry/');
  assert.equal(indexJson.blogPost[1].url, 'https://vencito.app/en/blog/how-to-read-the-expiration-date/');
  const list = index.slice(index.indexOf('class="post-list"'));
  assert.ok(list.indexOf('/en/blog/how-to-organize-the-pantry/') < list.indexOf('/en/blog/how-to-read-the-expiration-date/'));
});

test('las notas en inglés explican la fecha y la alacena, y cierran con las tiendas', () => {
  const dates = read('en/blog/how-to-read-the-expiration-date/index.html');
  const pantry = read('en/blog/how-to-organize-the-pantry/index.html');
  const dateJson = JSON.parse(dates.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/)[1]);
  const pantryJson = JSON.parse(pantry.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/)[1]);

  assert.equal(dateJson.headline, 'How to read the expiration date');
  assert.equal(dateJson.datePublished, '2026-11-13');
  assert.equal(dateJson.inLanguage, 'en');
  assert.equal(dateJson.mainEntityOfPage, 'https://vencito.app/en/blog/how-to-read-the-expiration-date/');
  for (const bit of ['VTO', 'ELAB', '25 AGO 2026', 'VTO 04/27', '08/2027', 'not medical or legal advice', 'do not use it', 'The app suggests; the package decides.']) {
    assert.ok(dates.includes(bit), bit);
  }

  assert.equal(pantryJson.headline, 'How to organize the pantry so nothing expires unused');
  assert.equal(pantryJson.datePublished, '2026-11-13');
  assert.equal(pantryJson.inLanguage, 'en');
  assert.equal(pantryJson.mainEntityOfPage, 'https://vencito.app/en/blog/how-to-organize-the-pantry/');
  for (const bit of ['not medical or legal advice', 'do not use it', 'fridge', 'freezer', 'Medicine cabinet', 'before you buy', 'Once a week', 'remind you before']) {
    assert.ok(pantry.includes(bit), bit);
  }
  const prose = pantry.slice(pantry.indexOf('class="blog-prose"'), pantry.indexOf('class="blog-cta"'));
  assert.equal((prose.match(/href="\/en\/blog\/how-to-read-the-expiration-date\/"/g) || []).length, 1);

  for (const post of [dates, pantry]) {
    const cta = post.slice(post.indexOf('class="blog-cta"'));
    assert.match(cta, /app-store-en\.svg/);
    assert.match(cta, /google-play-en\.png/);
    assert.doesNotMatch(cta, /app-store-es\.svg|google-play-es\.png/);
    assert.match(cta, /https:\/\/apps\.apple\.com\/app\/vencito\/id6818290015/);
    assert.match(cta, /https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.diegokelya\.vencito/);
    assert.match(cta, /Free · No ads · No account/);
    assert.match(post, /Download free/);
  }

  assert.match(read('blog/como-leer-la-fecha-de-vencimiento/index.html'), /hreflang="en" href="https:\/\/vencito\.app\/en\/blog\/how-to-read-the-expiration-date\/"/);
  assert.match(read('blog/como-organizar-la-alacena/index.html'), /hreflang="en" href="https:\/\/vencito\.app\/en\/blog\/how-to-organize-the-pantry\/"/);
  assert.match(dates, /hreflang="es" href="https:\/\/vencito\.app\/blog\/como-leer-la-fecha-de-vencimiento\/"/);
  assert.match(pantry, /hreflang="es" href="https:\/\/vencito\.app\/blog\/como-organizar-la-alacena\/"/);
});

test('los otros idiomas enlazan el blog en español sin darlo por traducido', () => {
  const labels = {
    'pt/index.html': 'Blog (em espanhol)',
    'fr/index.html': 'Blog (en espagnol)',
    'it/index.html': 'Blog (in spagnolo)',
    'de/index.html': 'Blog (auf Spanisch)',
  };
  for (const [file, label] of Object.entries(labels)) {
    const html = read(file);
    assert.ok(html.includes(`href="/blog/" hreflang="es">${label}</a>`), file);
  }
});
