// El blog es HTML estático, solo en español, enlazado desde el pie y el sitemap.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('el índice y la nota están en español y tienen SEO propio', () => {
  const index = read('blog/index.html');
  const post = read('blog/como-leer-la-fecha-de-vencimiento/index.html');
  const css = read('style.css');
  for (const html of [index, post]) {
    assert.match(html, /<html lang="es">/);
    assert.match(html, /href="\/style\.css/);
    assert.match(html, /\/assets\/app-icon\.png/);
    assert.match(html, /name="description"/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /property="og:title"/);
    assert.match(html, /property="og:description"/);
    assert.match(html, /property="og:url"/);
    assert.match(html, /property="og:image"/);
    assert.doesNotMatch(html, /hreflang="en"/);
  }
  assert.match(index, /rel="canonical" href="https:\/\/vencito\.app\/blog\/"/);
  assert.match(index, /href="\/blog\/como-leer-la-fecha-de-vencimiento\/"/);
  assert.match(post, /rel="canonical" href="https:\/\/vencito\.app\/blog\/como-leer-la-fecha-de-vencimiento\/"/);
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
  assert.match(read('blog/index.html'), /href="\/blog\/" aria-current="page">Blog<\/a>/);
});

test('los otros idiomas enlazan el blog en español sin darlo por traducido', () => {
  const labels = {
    'en/index.html': 'Blog (Spanish)',
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
