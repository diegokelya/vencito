/* Vencito para el navegador (PWA): todo se guarda en este dispositivo, sin cuentas ni servidor. */
(function () {
  'use strict';

  /* ---------- utilidades ---------- */
  const LS = 'vencito.pwa.v1';
  const LANGS = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', it: 'Italiano', de: 'Deutsch' };
  const LOCALES = { es: 'es-AR', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', it: 'it-IT', de: 'de-DE' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').trim();
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).toUpperCase();
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseDay = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const today0 = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const daysBetween = (a, b) => Math.round((b - a) / 864e5);
  const NO_EXPIRY_DAYS = 20000;

  /* ---------- estado ---------- */
  const fresh = () => ({ v: 1, lang: '', soon: 7, products: [], consumed: [], discarded: [], shopping: [] });
  const load = () => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(LS)) || {}); } catch (e) { return fresh(); } };
  let S = load();
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { toast(t('No se pudo guardar en este navegador')); } };
  const ui = { tab: 'products', q: '', sheet: null, period: 'month', toast: null, catalog: null, catLang: null, diets: {}, rmode: 'mine', rq: '', rdiet: '', rshown: 40, install: null, undo: null };

  /* ---------- idioma ---------- */
  const detect = () => { const l = (navigator.language || 'en').slice(0, 2).toLowerCase(); return LANGS[l] ? l : 'en'; };
  const lang = () => S.lang && LANGS[S.lang] ? S.lang : detect();
  const t = (key, ...args) => {
    const dict = (window.I18N || {})[lang()] || {};
    let s = dict[key] != null ? dict[key] : key, i = 0;
    return s.replace(/%lld|%@|%d|%s/g, () => (args[i] != null ? args[i++] : ''));
  };
  const fmtDate = (s, long) => new Intl.DateTimeFormat(LOCALES[lang()], long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(parseDay(s));

  /* ---------- categorías y lugares ---------- */
  const KINDS = [['almacen', 'Almacén', '🛒'], ['bebidas', 'Bebidas', '🥤'], ['carnes', 'Carnes', '🥩'], ['condimentos', 'Condimentos', '🧂'], ['congelados', 'Congelados', '🧊'], ['frutas', 'Frutas', '🍎'], ['lacteos', 'Lácteos', '🥛'], ['limpieza', 'Limpieza', '🧴'], ['medicamentos', 'Medicamentos', '💊'], ['panificados', 'Panificados', '🍞'], ['perfumeria', 'Perfumería', '🧼'], ['verduras', 'Verduras', '🥬'], ['otros', 'Otros', '📦']];
  const PLACES = ['Heladera', 'Alacena', 'Freezer', 'Despensa'];
  let catMap = null;
  const catKey = s => {
    if (!s) return '';
    if (!catMap) {
      catMap = {};
      KINDS.forEach(([k, es]) => { catMap[fold(k)] = k; Object.keys(window.I18N || {}).concat(['es']).forEach(l => { const v = l === 'es' ? es : ((window.I18N[l] || {})[es] || es); catMap[fold(v)] = k; }); });
    }
    return catMap[fold(s)] || '';
  };
  const catLabel = k => { const r = KINDS.find(x => x[0] === k); return r ? t(r[1]) : ''; };
  const catIcon = k => { const r = KINDS.find(x => x[0] === k); return r ? r[2] : '📦'; };
  const placeLabel = p => (PLACES.includes(p) ? t(p) : p || '');

  /* ---------- reglas de vencimiento ---------- */
  const daysOf = p => (p.expiry ? daysBetween(today0(), parseDay(p.expiry)) : null);
  const bucketOf = p => { const d = daysOf(p); if (d == null || d >= NO_EXPIRY_DAYS) return 'none'; if (d < 0) return 'expired'; if (d <= S.soon) return 'soon'; return 'upcoming'; };
  const label = d => d < 0 ? (d === -1 ? t('Vencido hace 1 día') : t('Vencido hace %lld días', -d)) : d === 0 ? t('Vence hoy') : d === 1 ? t('Vence mañana') : t('Vence en %lld días', d);
  const shortLabel = d => d < 0 ? t('Vencido') : d === 0 ? t('Hoy') : d === 1 ? t('Mañana') : d + ' d';
  const tone = b => ({ expired: 'red', soon: 'orange', upcoming: 'green', none: '' }[b]);

  /* ---------- estadísticas ---------- */
  const dayOf = x => { const d = new Date(x); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const startOf = (period, now) => { const m = new Date(now.getFullYear(), now.getMonth(), 1); return period === 'month' ? m : period === 'quarter' ? new Date(m.getFullYear(), m.getMonth() - 2, 1) : null; };
  function computeStats(from, to) {
    const inR = d => (!from || d >= from) && (!to || d < to);
    const r = { consumed: 0, onTime: 0, dated: 0, discarded: 0, rescued: 0, cats: {}, tcats: {}, names: {} };
    S.consumed.forEach(c => {
      const d = dayOf(c.consumedAt); if (!inR(d)) return;
      r.consumed++; const k = catKey(c.category); if (k) r.cats[k] = (r.cats[k] || 0) + 1;
      if (!c.expiry) return; const left = daysBetween(d, parseDay(c.expiry)); if (left >= NO_EXPIRY_DAYS) return;
      r.dated++; if (left >= 0) { r.onTime++; if (left <= 3) r.rescued++; }
    });
    S.discarded.forEach(x => {
      if (!inR(dayOf(x.discardedAt))) return; const q = x.quantity || 1; r.discarded += q;
      const k = catKey(x.category); if (k) r.tcats[k] = (r.tcats[k] || 0) + q;
      const n = fold(x.name); r.names[n] = { name: (r.names[n] && r.names[n].name) || x.name, units: ((r.names[n] && r.names[n].units) || 0) + q };
    });
    return r;
  }
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3);

  /* ---------- acciones ---------- */
  function setUndo(fn) { ui.undo = fn; }
  function consumeOne(id) {
    const p = S.products.find(x => x.id === id); if (!p) return;
    const before = JSON.parse(JSON.stringify(p)), rec = { id: uid(), name: p.name, category: p.category || '', consumedAt: new Date().toISOString(), expiry: p.expiry || null };
    S.consumed.push(rec);
    if (p.quantity > 1) p.quantity -= 1; else S.products = S.products.filter(x => x.id !== id);
    save(); closeSheet(false);
    setUndo(() => { S.consumed = S.consumed.filter(c => c.id !== rec.id); const cur = S.products.find(x => x.id === id); if (cur) cur.quantity = before.quantity; else S.products.push(before); save(); });
    toast(t('Consumido: %@', p.name), true);
  }
  function discard(id) {
    const p = S.products.find(x => x.id === id); if (!p) return;
    const rec = { id: uid(), name: p.name, category: p.category || '', discardedAt: new Date().toISOString(), expiry: p.expiry || null, quantity: p.quantity || 1 };
    S.discarded.push(rec); S.products = S.products.filter(x => x.id !== id); save(); closeSheet(false);
    setUndo(() => { S.discarded = S.discarded.filter(d => d.id !== rec.id); S.products.push(p); save(); });
    toast(t('Tirado: %@', p.name), true);
  }
  function remove(id) {
    const p = S.products.find(x => x.id === id); if (!p) return;
    S.products = S.products.filter(x => x.id !== id); save(); closeSheet(false);
    setUndo(() => { S.products.push(p); save(); });
    toast(t('Eliminado: %@', p.name), true);
  }
  function addToShopping(name) {
    if (!name || S.shopping.some(i => !i.done && fold(i.name) === fold(name))) return;
    S.shopping.push({ id: uid(), name: String(name).slice(0, 120), note: '', done: false, addedAt: new Date().toISOString() }); save();
  }

  /* ---------- vistas ---------- */
  function productRow(p) {
    const d = daysOf(p), b = bucketOf(p), meta = [];
    if (p.expiry && b !== 'none') meta.push(fmtDate(p.expiry)); else meta.push(t('Sin fecha'));
    const c = catLabel(catKey(p.category)) || p.category; if (c) meta.push(c);
    if (p.location) meta.push(placeLabel(p.location));
    return `<button class="item" data-act="open" data-id="${esc(p.id)}"><span class="ico">${catIcon(catKey(p.category))}</span>
      <span class="grow"><span class="t">${esc(p.name)}${p.quantity > 1 ? ' ×' + p.quantity : ''}</span><br><span class="s">${esc(meta.join(' · '))}</span></span>
      ${b !== 'none' ? `<span class="pill ${tone(b)}">${esc(shortLabel(d))}</span>` : ''}</button>`;
  }
  function listHtml() {
    const q = fold(ui.q), items = S.products.filter(p => !q || [p.name, p.category, catLabel(catKey(p.category)), p.location, placeLabel(p.location), p.notes].some(v => fold(v).includes(q)));
    if (!S.products.length) return `<div class="empty"><b>${esc(t('Sin productos'))}</b>${esc(t('Agregá tu primer producto con el botón +.'))}</div>`;
    if (!items.length) return `<div class="empty">${esc(t('Sin resultados'))}</div>`;
    const order = [['expired', 'Vencidos', 'red', '⚠️'], ['soon', 'Por vencer', 'orange', '⏰'], ['upcoming', 'Próximos', 'green', '✅'], ['none', 'Sin fecha', 'gray', '♾️']];
    return order.map(([k, title, col, ic]) => {
      const g = items.filter(p => bucketOf(p) === k).sort((a, b) => (a.expiry || '9').localeCompare(b.expiry || '9') || a.name.localeCompare(b.name));
      return g.length ? `<div class="bucket ${col}"><span>${ic}</span> ${esc(t(title))} (${g.length})</div><div class="group">${g.map(productRow).join('')}</div>` : '';
    }).join('');
  }
  function productsView() {
    const total = S.products.length, exp = S.products.filter(p => bucketOf(p) === 'expired').length, soon = S.products.filter(p => bucketOf(p) === 'soon').length;
    return `<div class="row"><h1 class="grow">Vencito</h1><button class="btn" data-act="stats" aria-label="${esc(t('Estadísticas'))}">📊</button></div>
      <div class="tiles"><div class="tile green"><b>${total}</b><span>${esc(t('Total'))}</span></div><div class="tile red"><b>${exp}</b><span>${esc(t('Vencidos'))}</span></div><div class="tile orange"><b>${soon}</b><span>${esc(t('Por vencer'))}</span></div></div>
      ${installHtml()}
      <input class="search" id="q" type="search" placeholder="${esc(t('Buscar producto, categoría, lugar…'))}" value="${esc(ui.q)}" autocomplete="off">
      <div id="list">${listHtml()}</div>
      <button class="fab" data-act="add" aria-label="${esc(t('Agregar producto'))}">+</button>`;
  }
  function installHtml() {
    if (window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone) return '';
    if (ui.install) return `<div class="install row"><span class="grow">${esc(t('Instalá Vencito en tu dispositivo para abrirlo como una app.'))}</span><button class="btn primary" data-act="install">${esc(t('Instalar'))}</button></div>`;
    if (/iphone|ipad/i.test(navigator.userAgent)) return `<div class="install">${esc(t('Para instalarla: Compartir → Agregar a pantalla de inicio.'))}</div>`;
    return '';
  }
  function shoppingView() {
    const open = S.shopping.filter(i => !i.done), done = S.shopping.filter(i => i.done);
    const row = i => `<div class="item ${i.done ? 'done' : ''}"><button class="check ${i.done ? 'on' : ''}" data-act="tick" data-id="${esc(i.id)}" aria-label="${esc(i.name)}">${i.done ? '✓' : ''}</button><span class="grow t">${esc(i.name)}</span><button class="btn" data-act="untick" data-id="${esc(i.id)}" aria-label="${esc(t('Eliminar'))}">✕</button></div>`;
    return `<div class="row"><h1 class="grow">${esc(t('Lista de compras'))}</h1><button class="btn" data-act="share-list">${esc(t('Compartir'))}</button></div>
      <form class="row" data-form="shop-add"><input class="search grow" id="shopname" placeholder="${esc(t('Agregar a la lista'))}" autocomplete="off"><button class="btn primary" type="submit">+</button></form>
      ${open.length ? `<div class="group">${open.map(row).join('')}</div>` : `<div class="empty">${esc(t('Nada pendiente'))}</div>`}
      ${done.length ? `<div class="row"><h2 class="grow">${esc(t('Comprados'))}</h2><button class="link" style="width:auto" data-act="clear-done">${esc(t('Quitar comprados'))}</button></div><div class="group">${done.map(row).join('')}</div>` : ''}`;
  }
  function settingsView() {
    const cur = S.lang;
    const langRow = (k, name) => `<button class="item" data-act="lang" data-id="${k}"><span class="grow t">${esc(name)}</span>${cur === k ? '<span class="good">✓</span>' : ''}</button>`;
    return `<h1>${esc(t('Ajustes'))}</h1>
      <h2>${esc(t('Idioma / Language'))}</h2><div class="group">${langRow('', t('Idioma del sistema'))}${Object.entries(LANGS).map(([k, n]) => langRow(k, n)).join('')}</div>
      <h2>${esc(t('Por vencer'))}</h2><div class="group"><label class="f"><span>${esc(t('Se marca «Por vencer» cuando faltan hasta'))}</span><select data-act="soon">${[1, 3, 7, 15].map(n => `<option value="${n}" ${S.soon === n ? 'selected' : ''}>${esc(t('%lld días', n))}</option>`).join('')}</select></label></div>
      <h2>${esc(t('Datos'))}</h2><div class="group">
        <button class="link" data-act="stats">${esc(t('Estadísticas'))}</button>
        <button class="link" data-act="export">${esc(t('Exportar JSON'))}</button>
        <label class="link" style="display:block;cursor:pointer">${esc(t('Importar JSON'))}<input type="file" id="imp" accept="application/json,.json" class="sr"></label>
        <button class="link danger" data-act="wipe">${esc(t('Borrar todos los productos'))}</button></div>
      <p class="small muted">${esc(t('Tus datos se guardan solo en este navegador: no hay cuentas ni servidores. Si borrás los datos del sitio, se pierden: exportá un archivo de vez en cuando.'))}</p>
      <h2>${esc(t('Acerca de'))}</h2><div class="group"><div class="item"><span class="grow">${esc(t('Versión'))}</span><span class="muted">PWA 1.0</span></div><a class="link" style="display:block;text-decoration:none" href="../">vencito.app</a></div>`;
  }
  const DIETS = [['', 'Cualquier dieta'], ['vegetarian', 'Vegetariana'], ['vegan', 'Vegana'], ['dairyFree', 'Sin lácteos'], ['glutenFree', 'Sin gluten']];
  function matchRecipe(r) {
    const names = S.products.map(p => ({ n: fold(p.name), d: daysOf(p) }));
    let have = 0, expiring = 0, main = 0;
    const ing = (r.ingredients || []).map(i => {
      const kws = (i.keywords && i.keywords.length ? i.keywords : [i.name]).map(fold).filter(Boolean);
      const staple = i.kind === 'staple';
      const hit = staple ? null : names.find(x => kws.some(k => new RegExp('(^|[^a-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])').test(x.n)));
      if (hit) { have++; if (hit.d != null && hit.d <= S.soon) expiring++; }
      if (!staple) main++;
      return { name: i.name, amount: i.amount, have: !!hit, staple };
    });
    return { r, ing, have, expiring, total: main || ing.length };
  }
  const dietOk = r => !ui.rdiet || ((ui.diets || {})[r.id] || []).includes(ui.rdiet);
  function recipeList() {
    const cat = (ui.catalog || []).filter(dietOk);
    if (ui.rmode === 'all') {
      const q = fold(ui.rq);
      return cat.filter(r => !q || fold(r.title).includes(q) || fold(r.summary).includes(q) || (r.ingredients || []).some(i => fold(i.name).includes(q)))
        .sort((a, b) => a.title.localeCompare(b.title, LOCALES[lang()])).map(r => ({ r, all: true }));
    }
    return cat.map(matchRecipe).filter(m => m.have >= 2 || (m.total && m.have / m.total >= 0.5))
      .sort((a, b) => (b.expiring > 0) - (a.expiring > 0) || b.have / b.total - a.have / a.total || b.have - a.have).slice(0, 60);
  }
  const flagOf = o => (o && /^[A-Z]{2}$/.test(o) ? String.fromCodePoint(...[...o].map(c => 127397 + c.charCodeAt(0))) + ' ' : '');
  function recipeCards() {
    const list = recipeList();
    if (ui.rmode !== 'all' && (!S.products.length || !list.length)) return `<div class="empty"><b>${esc(t('Todavía no hay ideas'))}</b>${esc(t('Agregá productos y te propongo recetas con lo que tenés.'))}</div>`;
    if (!list.length) return `<div class="empty">${esc(t('Sin resultados'))}</div>`;
    const shown = ui.rmode === 'all' ? list.slice(0, ui.rshown) : list;
    const card = m => { const r = m.r; return `<button class="card recipe" style="display:block;width:100%;text-align:left;border:0;margin:8px 0" data-act="recipe" data-id="${esc(r.id)}"><div class="t">${flagOf(r.origin)}${esc(r.title)}${m.expiring ? ' 🔥' : ''}</div>
        <div class="s muted small">${esc(r.summary || '')}</div><div class="small" style="margin-top:6px">${m.all ? '' : `<span class="good">${esc(t('Tenés %lld de %lld ingredientes', m.have, m.total))}</span> · `}${r.minutes ? esc(t('%lld min', r.minutes)) : ''}</div></button>`; };
    return shown.map(card).join('') + (shown.length < list.length ? `<button class="btn block" data-act="more">${esc(t('Ver más'))} (${shown.length}/${list.length})</button>` : '') + `<p class="small muted">${esc(t('Revisá siempre el estado de los alimentos antes de cocinar.'))}</p>`;
  }
  function recipesView() {
    const head = `<h1>${esc(t('¿Qué cocino hoy?'))}</h1>
      <div class="seg">${[['mine', 'Con lo que tenés'], ['all', 'Todas']].map(([k, n]) => `<button class="${ui.rmode === k ? 'on' : ''}" data-act="rmode" data-id="${k}">${esc(t(n))}</button>`).join('')}</div>
      ${ui.rmode === 'all' ? `<input class="search" id="rq" type="search" placeholder="${esc(t('Buscar receta…'))}" value="${esc(ui.rq)}" autocomplete="off">` : ''}
      <div class="chips">${DIETS.map(([k, n]) => `<button class="chip ${ui.rdiet === k ? 'on' : ''}" data-act="rdiet" data-id="${k}">${esc(t(n))}</button>`).join('')}</div>`;
    return head + `<div id="rlist">${ui.catalog === null ? `<div class="empty">${esc(t('Cargando…'))}</div>` : recipeCards()}</div>`;
  }

  /* ---------- hojas (modales) ---------- */
  const sheet = (title, body, close = true) => `<div class="sheet-bg" data-act="bg"><div class="sheet" role="dialog" aria-modal="true"><div class="bar"><h3>${esc(title)}</h3>${close ? `<button class="btn" data-act="close">${esc(t('Cerrar'))}</button>` : ''}</div>${body}</div></div>`;
  function productSheet(id) {
    const p = S.products.find(x => x.id === id); if (!p) return '';
    const d = daysOf(p), b = bucketOf(p);
    return sheet(p.name, `<div class="group"><div class="item"><span class="grow t ${tone(b) ? '' : ''}">${b !== 'none' ? `<span class="${tone(b) === 'red' ? 'bad' : ''}">${esc(label(d))}</span>` : esc(t('Sin vencimiento'))}</span></div>
      ${p.expiry && b !== 'none' ? `<div class="item"><span class="grow muted">${esc(t('Vence el'))}</span><span>${esc(fmtDate(p.expiry, true))}</span></div>` : ''}
      <div class="item"><span class="grow muted">${esc(t('Cantidad'))}</span><span>${p.quantity || 1}</span></div>
      ${catKey(p.category) ? `<div class="item"><span class="grow muted">${esc(t('Categoría'))}</span><span>${esc(catLabel(catKey(p.category)))}</span></div>` : ''}
      ${p.location ? `<div class="item"><span class="grow muted">${esc(t('Ubicación'))}</span><span>${esc(placeLabel(p.location))}</span></div>` : ''}
      ${p.notes ? `<div class="item"><span class="grow muted">${esc(t('Notas'))}</span><span>${esc(p.notes)}</span></div>` : ''}</div>
      <div class="group"><button class="link" data-act="consume" data-id="${esc(id)}">✓ ${esc(p.quantity > 1 ? t('Usé una unidad') : t('Marcar como consumido'))}</button>
      <button class="link" data-act="discard" data-id="${esc(id)}">🗑 ${esc(t('Tirar'))}</button>
      <button class="link" data-act="to-list" data-id="${esc(id)}">🛒 ${esc(t('Agregar a la lista de compras'))}</button>
      <button class="link" data-act="edit" data-id="${esc(id)}">✎ ${esc(t('Editar'))}</button>
      <button class="link danger" data-act="ask-remove" data-id="${esc(id)}">${esc(t('Eliminar'))}</button></div>`);
  }
  function formSheet(id) {
    const p = id ? S.products.find(x => x.id === id) : null, q = p ? p.quantity || 1 : 1, noexp = p ? !p.expiry : false;
    const def = new Date(); def.setDate(def.getDate() + 7);
    return sheet(p ? t('Editar') : t('Agregar producto'), `<form data-form="product" data-id="${esc(id || '')}"><div class="group">
      <label class="f"><span>${esc(t('Nombre'))}</span><input name="name" required maxlength="200" value="${esc(p ? p.name : '')}" autocomplete="off" autofocus></label>
      <label class="f"><span>${esc(t('Categoría'))}</span><select name="category"><option value=""></option>${KINDS.map(([k, es]) => `<option value="${k}" ${p && catKey(p.category) === k ? 'selected' : ''}>${esc(t(es))}</option>`).join('')}</select></label>
      <label class="f"><span>${esc(t('Ubicación'))}</span><select name="location"><option value=""></option>${PLACES.map(pl => `<option value="${pl}" ${p && p.location === pl ? 'selected' : ''}>${esc(t(pl))}</option>`).join('')}${p && p.location && !PLACES.includes(p.location) ? `<option selected>${esc(p.location)}</option>` : ''}</select></label>
      <div class="f row" style="padding:10px 14px"><span class="grow">${esc(t('Cantidad'))}</span><span class="stepper"><button type="button" data-act="qty" data-id="-1">−</button><b id="qty">${q}</b><button type="button" data-act="qty" data-id="1">+</button></span></div>
      <label class="f row"><span class="grow" style="font-size:16px;color:inherit">${esc(t('Sin fecha de vencimiento'))}</span><input type="checkbox" name="noexp" style="width:auto" ${noexp ? 'checked' : ''}></label>
      <label class="f"><span>${esc(t('Vencimiento'))}</span><input type="date" name="expiry" value="${esc(p && p.expiry ? p.expiry : iso(def))}"></label>
      <label class="f"><span>${esc(t('Notas'))}</span><textarea name="notes" rows="2">${esc(p ? p.notes || '' : '')}</textarea></label></div>
      <input type="hidden" name="quantity" value="${q}">
      <button class="btn primary block" type="submit">${esc(t('Guardar'))}</button></form>`);
  }
  function confirmSheet(title, body, actions) {
    return sheet(title, `<p class="muted">${esc(body)}</p><div class="group">${actions.map(a => `<button class="link ${a.danger ? 'danger' : ''}" data-act="${a.act}" data-id="${esc(a.id || '')}">${esc(a.text)}</button>`).join('')}<button class="link" data-act="close">${esc(t('Cancelar'))}</button></div>`, false);
  }
  function statsSheet() {
    const now = new Date(), from = startOf(ui.period, now), cur = computeStats(from, null);
    let prev = null; if (from) { const months = ui.period === 'month' ? 1 : 3; prev = computeStats(new Date(from.getFullYear(), from.getMonth() - months, 1), from); }
    if (!S.consumed.length && !S.discarded.length) return sheet(t('Estadísticas'), `<div class="empty"><b>${esc(t('Todavía no hay datos'))}</b>${esc(t('Cada vez que marcás un producto como consumido o lo tirás, las estadísticas aparecen acá.'))}</div>`);
    const delta = (n, p, lowerBetter) => { if (p == null) return ''; const d = n - p, better = d === 0 ? null : (d < 0) === lowerBetter; return `<div class="d ${better == null ? 'muted' : better ? 'good' : 'bad'}">${d === 0 ? '=' : d > 0 ? '▲ ' + d : '▼ ' + (-d)} ${esc(t('vs. anterior'))}</div>`; };
    const rate = cur.dated + cur.discarded > 0 ? Math.round(100 * cur.onTime / (cur.dated + cur.discarded)) + '%' : '–';
    const names = Object.values(cur.names).filter(n => n.units >= 2).sort((a, b) => b.units - a.units).slice(0, 3);
    const lastDiscard = S.discarded.map(d => d.discardedAt).sort().pop(), firstEaten = S.consumed.map(c => c.consumedAt).sort()[0], anchor = lastDiscard || firstEaten;
    const streak = anchor ? Math.max(0, daysBetween(dayOf(anchor), today0())) : null;
    const bars = []; for (let i = 5; i >= 0; i--) { const m0 = new Date(now.getFullYear(), now.getMonth() - i, 1), m1 = new Date(now.getFullYear(), now.getMonth() - i + 1, 1), s = computeStats(m0, m1); bars.push({ m: m0, c: s.consumed, d: s.discarded }); }
    const max = Math.max(1, ...bars.map(b => Math.max(b.c, b.d)));
    const list = (arr, fmt) => arr.length ? arr.map(([k, n]) => `<div class="item" style="padding:8px 14px"><span class="grow">${fmt(k)}</span><span class="muted">${n}</span></div>`).join('') : '';
    return sheet(t('Estadísticas'), `<div class="seg">${[['month', 'Este mes'], ['quarter', '3 meses'], ['all', 'Todo']].map(([k, n]) => `<button class="${ui.period === k ? 'on' : ''}" data-act="period" data-id="${k}">${esc(t(n))}</button>`).join('')}</div>
      <div class="stats"><div class="stat"><span>✅</span><b>${cur.consumed}</b>${esc(t('Consumidos'))}${delta(cur.consumed, prev && prev.consumed, false)}</div>
      <div class="stat"><span>⏱️</span><b>${rate}</b>${esc(t('Usados a tiempo'))}</div>
      <div class="stat"><span>🗑️</span><b>${cur.discarded}</b>${esc(t('Tirados'))}${delta(cur.discarded, prev && prev.discarded, true)}</div>
      <div class="stat"><span>🛟</span><b>${cur.rescued}</b>${esc(t('Rescatados'))}</div></div>
      <p class="small muted">${esc(t('«Rescatados»: usados en los últimos %lld días antes de vencer. «Tirados»: lo que sacás con «Tirar» o confirmás que tiraste.', 3))}</p>
      ${streak != null ? `<div class="group"><div class="item"><span>🔥</span><span class="grow">${esc(t('Días sin tirar nada'))}</span><b>${streak}</b></div></div>` : ''}
      <h2>${esc(t('Últimos 6 meses'))}</h2><div class="card" style="padding:12px"><div class="chart">${bars.map(b => `<div class="m"><div class="bars"><i style="height:${Math.round(100 * b.c / max)}%;background:var(--green)"></i><i style="height:${Math.round(100 * b.d / max)}%;background:var(--orange)"></i></div><span class="l">${esc(new Intl.DateTimeFormat(LOCALES[lang()], { month: 'narrow' }).format(b.m))}</span></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--green)"></i>${esc(t('Consumidos'))}</span><span><i style="background:var(--orange)"></i>${esc(t('Tirados'))}</span></div></div>
      ${top(cur.cats).length ? `<h2>${esc(t('Más consumidos'))}</h2><div class="group">${list(top(cur.cats), catLabelOf)}</div>` : ''}
      ${top(cur.tcats).length ? `<h2>${esc(t('Lo que más tirás'))}</h2><div class="group">${list(top(cur.tcats), catLabelOf)}</div>` : ''}
      ${names.length ? `<h2>${esc(t('Los que tirás seguido'))}</h2><div class="group">${names.map(n => `<div class="item" style="padding:8px 14px"><span class="grow">${esc(n.name)}</span><span class="muted">×${n.units}</span></div>`).join('')}</div><p class="small muted">${esc(t('Quizás convenga comprar menos de a poco.'))}</p>` : ''}`);
  }
  const catLabelOf = k => esc(catLabel(k));
  function recipeSheet(id) {
    const r = (ui.catalog || []).find(x => x.id === id); if (!r) return '';
    const m = matchRecipe(r), miss = m.ing.filter(x => !x.have && !x.staple);
    return sheet(r.title, `<p class="muted">${esc(r.summary || '')}</p><p class="small">${flagOf(r.origin)}${r.servings ? esc(t('%lld porciones', r.servings)) : ''}${r.minutes ? ' · ' + esc(t('%lld min', r.minutes)) : ''}</p>
      <h2>${esc(t('Ingredientes'))}</h2><ul class="ing">${m.ing.map(x => `<li class="${x.have ? 'have' : ''}">${x.have ? '✓ ' : ''}${esc(x.name)}${x.amount ? ' — ' + esc(x.amount) : ''}</li>`).join('')}</ul>
      ${miss.length ? `<button class="btn block" data-act="miss-to-list" data-id="${esc(id)}">🛒 ${esc(t('Agregar lo que falta a la lista'))}</button>` : ''}
      <h2>${esc(t('Preparación'))}</h2><ol class="steps">${(r.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>${r.tip ? `<p class="muted small">💡 ${esc(r.tip)}</p>` : ''}`);
  }

  /* ---------- render ---------- */
  function render() {
    document.documentElement.lang = lang();
    const tabs = [['products', '📦', 'Productos'], ['recipes', '🍳', '¿Qué cocino hoy?'], ['shopping', '🛒', 'Compras'], ['settings', '⚙️', 'Ajustes']];
    const main = ui.tab === 'products' ? productsView() : ui.tab === 'recipes' ? recipesView() : ui.tab === 'shopping' ? shoppingView() : settingsView();
    const sh = ui.sheet, shHtml = !sh ? '' : sh.type === 'product' ? productSheet(sh.id) : sh.type === 'form' ? formSheet(sh.id) : sh.type === 'stats' ? statsSheet() : sh.type === 'recipe' ? recipeSheet(String(sh.id)) : sh.type === 'remove' ? removeSheet(sh.id) : sh.type === 'wipe' ? confirmSheet(t('Borrar todos los productos'), t('No se puede deshacer.'), [{ act: 'wipe-yes', text: t('Borrar todo'), danger: true }]) : '';
    const tb = `<nav class="tabs" aria-label="Vencito"><div>${tabs.map(([k, ic, n]) => `<button class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}"><b>${ic}</b>${esc(k === 'recipes' ? t('Recetas') : t(n))}</button>`).join('')}</div></nav>`;
    const toastHtml = ui.toast ? `<div class="toast"><span>${esc(ui.toast.text)}</span>${ui.toast.undo ? `<button data-act="undo">${esc(t('Deshacer'))}</button>` : ''}</div>` : '';
    document.getElementById('app').innerHTML = main + shHtml + tb + toastHtml;
    if (ui.tab === 'products' && ui.q) { const q = document.getElementById('q'); if (q && document.activeElement !== q && !sh) { /* conserva el texto */ } }
  }
  function removeSheet(id) {
    const p = S.products.find(x => x.id === id); if (!p) return '';
    const expired = bucketOf(p) === 'expired';
    return expired ? confirmSheet(t('¿Lo tiraste o lo cargaste por error?'), p.name, [{ act: 'discard', id, text: t('Lo tiré') }, { act: 'remove', id, text: t('Fue un error de carga'), danger: true }])
      : confirmSheet(t('¿Eliminar %@?', p.name), '', [{ act: 'remove', id, text: t('Eliminar'), danger: true }]);
  }
  let toastTimer;
  function toast(text, undo) { ui.toast = { text, undo: !!undo }; clearTimeout(toastTimer); toastTimer = setTimeout(() => { ui.toast = null; render(); }, 6000); render(); }
  function closeSheet(draw = true) { ui.sheet = null; if (draw) render(); }

  /* ---------- eventos ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id;
    if (act === 'bg') { if (e.target === el) closeSheet(); return; }
    switch (act) {
      case 'tab': ui.tab = id; ui.sheet = null; if (id === 'recipes') ensureRecipes(); render(); break;
      case 'open': ui.sheet = { type: 'product', id }; render(); break;
      case 'add': ui.sheet = { type: 'form', id: null }; render(); break;
      case 'edit': ui.sheet = { type: 'form', id }; render(); break;
      case 'close': closeSheet(); break;
      case 'consume': consumeOne(id); break;
      case 'discard': discard(id); break;
      case 'remove': remove(id); break;
      case 'ask-remove': ui.sheet = { type: 'remove', id }; render(); break;
      case 'to-list': { const p = S.products.find(x => x.id === id); if (p) { addToShopping(p.name); closeSheet(false); toast(t('Agregado a la lista de compras')); } break; }
      case 'stats': ui.sheet = { type: 'stats' }; render(); break;
      case 'period': ui.period = id; render(); break;
      case 'qty': { const c = document.getElementById('qty'), h = document.querySelector('input[name=quantity]'); const n = Math.min(999, Math.max(1, (parseInt(c.textContent, 10) || 1) + parseInt(id, 10))); c.textContent = n; h.value = n; break; }
      case 'tick': { const i = S.shopping.find(x => x.id === id); if (i) { i.done = !i.done; save(); render(); } break; }
      case 'untick': S.shopping = S.shopping.filter(x => x.id !== id); save(); render(); break;
      case 'clear-done': S.shopping = S.shopping.filter(x => !x.done); save(); render(); break;
      case 'share-list': shareList(); break;
      case 'lang': S.lang = id; save(); render(); if (ui.tab === 'recipes') ensureRecipes(); break;
      case 'export': exportJson(); break;
      case 'wipe': ui.sheet = { type: 'wipe' }; render(); break;
      case 'wipe-yes': S.products = []; save(); closeSheet(false); toast(t('Listo')); break;
      case 'recipe': ui.sheet = { type: 'recipe', id }; render(); break;
      case 'rmode': ui.rmode = id; ui.rshown = 40; render(); break;
      case 'rdiet': ui.rdiet = id; ui.rshown = 40; render(); break;
      case 'more': ui.rshown += 40; document.getElementById('rlist').innerHTML = recipeCards(); break;
      case 'miss-to-list': { const r = (ui.catalog || []).find(x => x.id === id); if (r) { matchRecipe(r).ing.filter(x => !x.have && !x.staple).forEach(x => addToShopping(x.name)); closeSheet(false); toast(t('Agregado a la lista de compras')); } break; }
      case 'undo': if (ui.undo) { ui.undo(); ui.undo = null; ui.toast = null; render(); } break;
      case 'install': if (ui.install) { ui.install.prompt(); ui.install = null; render(); } break;
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'q') { ui.q = e.target.value; document.getElementById('list').innerHTML = listHtml(); }
    if (e.target.id === 'rq') { ui.rq = e.target.value; ui.rshown = 40; document.getElementById('rlist').innerHTML = recipeCards(); }
  });
  document.addEventListener('change', e => {
    if (e.target.dataset && e.target.dataset.act === 'soon') { S.soon = parseInt(e.target.value, 10) || 7; save(); render(); }
    if (e.target.id === 'imp' && e.target.files[0]) importJson(e.target.files[0]);
    if (e.target.name === 'noexp') { const d = document.querySelector('input[name=expiry]'); if (d) d.disabled = e.target.checked; }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('form'); if (!f) return; e.preventDefault();
    if (f.dataset.form === 'shop-add') { const i = document.getElementById('shopname'); addToShopping(i.value.trim()); i.value = ''; render(); document.getElementById('shopname').focus(); }
    if (f.dataset.form === 'product') {
      const fd = new FormData(f), name = String(fd.get('name') || '').trim(); if (!name) return;
      const noexp = !!fd.get('noexp'), id = f.dataset.id, data = { name: name.slice(0, 200), category: fd.get('category') || '', location: fd.get('location') || '', quantity: Math.min(999, Math.max(1, parseInt(fd.get('quantity'), 10) || 1)), notes: String(fd.get('notes') || '').trim(), expiry: noexp ? null : (fd.get('expiry') || null) };
      if (id) Object.assign(S.products.find(x => x.id === id) || {}, data); else S.products.push(Object.assign({ id: uid(), addedAt: new Date().toISOString() }, data));
      save(); closeSheet(false); ui.tab = 'products'; render();
    }
  });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); ui.install = e; if (ui.tab === 'products' && !ui.sheet) render(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.sheet) closeSheet(); });

  /* ---------- datos: exportar, importar, compartir, recetas ---------- */
  function exportJson() {
    const env = { app: 'Vencito', version: 1, exportedAt: new Date().toISOString(),
      products: S.products.map(p => ({ id: p.id, name: p.name, expiry: p.expiry || '2099-12-31', quantity: p.quantity || 1, category: p.category || undefined, location: p.location || undefined, notes: p.notes || undefined, addedAt: p.addedAt })),
      consumed: S.consumed.map(c => ({ id: c.id, name: c.name, category: c.category || undefined, consumedAt: c.consumedAt, expiry: c.expiry || undefined })),
      shopping: S.shopping.map(i => ({ id: i.id, name: i.name, note: i.note || undefined, isDone: i.done || undefined })),
      discarded: S.discarded };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(env, null, 2)], { type: 'application/json' }));
    a.download = 'vencito-' + iso(new Date()) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importJson(file) {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const env = JSON.parse(rd.result), have = new Set(S.products.map(p => p.id)); let n = 0;
        (env.products || []).forEach(p => {
          if (!p || !p.name || have.has(p.id)) return; const exp = p.expiry && daysBetween(today0(), parseDay(p.expiry)) < NO_EXPIRY_DAYS ? String(p.expiry).slice(0, 10) : null;
          S.products.push({ id: p.id || uid(), name: String(p.name).slice(0, 200), expiry: exp, quantity: p.quantity || 1, category: catKey(p.category) || p.category || '', location: p.location || '', notes: p.notes || '', addedAt: p.addedAt || new Date().toISOString() }); n++;
        });
        const haveC = new Set(S.consumed.map(c => c.id)); (env.consumed || []).forEach(c => { if (c && c.name && !haveC.has(c.id)) S.consumed.push({ id: c.id || uid(), name: c.name, category: c.category || '', consumedAt: c.consumedAt || new Date().toISOString(), expiry: c.expiry && daysBetween(today0(), parseDay(c.expiry)) < NO_EXPIRY_DAYS ? String(c.expiry).slice(0, 10) : null }); });
        const haveS = new Set(S.shopping.map(i => i.id)); (env.shopping || []).forEach(i => { if (i && i.name && !haveS.has(i.id)) S.shopping.push({ id: i.id || uid(), name: i.name, note: i.note || '', done: !!i.isDone, addedAt: new Date().toISOString() }); });
        const haveD = new Set(S.discarded.map(d => d.id)); (env.discarded || []).forEach(d => { if (d && d.name && !haveD.has(d.id)) S.discarded.push(d); });
        save(); render(); toast(t('Importados: %lld', n));
      } catch (err) { toast(t('No se pudo importar: %@', String(err.message || err))); }
    };
    rd.readAsText(file);
  }
  function shareList() {
    const text = S.shopping.filter(i => !i.done).map(i => '• ' + i.name).join('\n'); if (!text) return;
    if (navigator.share) navigator.share({ title: t('Lista de compras'), text }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast(t('Copiada al portapapeles')));
  }
  const SRC = ['es', 'en', 'pt', 'fr', 'it', 'de'];
  function ensureRecipes() {
    const l = lang(); if (ui.catLang === l && ui.catalog) return; ui.catalog = null; ui.catLang = l;
    const get = f => fetch('data/' + f + '.json').then(r => { if (!r.ok) throw new Error(f); return r.json(); });
    Promise.all([Promise.all(SRC.map(x => get('recipes-' + x).catch(() => []))), get('recipes-tr-' + l).catch(() => ({})), get('recipe-diets').catch(() => ({}))]).then(([files, tr, diets]) => {
      const seen = new Set(), all = [];
      files.forEach((arr, i) => (Array.isArray(arr) ? arr : []).forEach(r => {
        if (!r || seen.has(r.id)) return; seen.add(r.id);
        const t0 = SRC[i] !== l && tr[r.id];
        if (t0 && t0.steps && t0.steps.length) {
          r = Object.assign({}, r, { title: t0.title || r.title, summary: t0.summary != null ? t0.summary : r.summary, side: t0.side != null ? t0.side : r.side, tip: t0.tip != null ? t0.tip : r.tip, steps: t0.steps,
            ingredients: (r.ingredients || []).map((g, j) => Object.assign({}, g, (t0.ingredients && t0.ingredients[j]) ? { name: t0.ingredients[j].name || g.name, amount: t0.ingredients[j].amount != null ? t0.ingredients[j].amount : g.amount } : {})) });
        }
        all.push(r);
      }));
      ui.diets = diets; ui.catalog = all; if (ui.tab === 'recipes') render();
    }).catch(() => { ui.catalog = []; if (ui.tab === 'recipes') render(); });
  }

  /* ---------- arranque ---------- */
  { const lp = new URLSearchParams(location.search).get('lang'); if (lp && LANGS[lp] && !S.lang) { S.lang = lp; save(); } }
  render();
  // Si el navegador lo permite, pide que los datos no se borren solos.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  // Para pruebas: ?demo=1 carga productos de ejemplo si no hay ninguno.
  if (/[?&]demo=1/.test(location.search) && !S.products.length) {
    const add = (name, d, cat, loc, q) => { const x = new Date(); x.setDate(x.getDate() + d); S.products.push({ id: uid(), name, expiry: iso(x), quantity: q || 1, category: cat, location: loc, notes: '', addedAt: new Date().toISOString() }); };
    add('Yogur de frutilla', -2, 'lacteos', 'Heladera', 2); add('Leche entera', 1, 'lacteos', 'Heladera'); add('Pan lactal', 3, 'panificados', 'Alacena'); add('Mayonesa', 6, 'condimentos', 'Alacena'); add('Queso cremoso', 18, 'lacteos', 'Heladera'); add('Arroz largo fino', 210, 'almacen', 'Alacena', 3); add('Huevos', 12, 'almacen', 'Heladera', 6); add('Tomates', 4, 'verduras', 'Heladera', 4);
    const now = Date.now(); [['Leche', 'lacteos', -1, 0], ['Queso', 'lacteos', -3, 1], ['Pan', 'panificados', -2, 1], ['Manzanas', 'frutas', -4, 3], ['Huevos', 'almacen', -6, 5], ['Yogur', 'lacteos', -9, -1], ['Lechuga', 'verduras', -12, 2], ['Leche', 'lacteos', -33, 2], ['Pan', 'panificados', -40, 0], ['Yogur', 'lacteos', -50, -2]].forEach(([n, c, o, e]) => { const at = new Date(now + o * 864e5), ex = new Date(at.getFullYear(), at.getMonth(), at.getDate() + e); S.consumed.push({ id: uid(), name: n, category: c, consumedAt: at.toISOString(), expiry: iso(ex) }); });
    [['Yogur', 'lacteos', -3, 1], ['yogur', 'lacteos', -8, 2], ['Lechuga', 'verduras', -5, 1], ['Pan', 'panificados', -47, 3]].forEach(([n, c, o, q]) => S.discarded.push({ id: uid(), name: n, category: c, discardedAt: new Date(now + o * 864e5).toISOString(), expiry: null, quantity: q }));
    S.shopping.push({ id: uid(), name: 'Pan lactal', note: '', done: false, addedAt: new Date().toISOString() }); save(); render();
  }
})();
