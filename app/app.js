/* Vencito para el navegador (PWA): todo se guarda en este dispositivo, sin cuentas ni servidor. */
(function () {
  'use strict';

  /* ---------- utilidades ---------- */
  // Misma versión que las apps de iOS y Android (MARKETING_VERSION / versionName): se actualiza junto con ellas.
  const APP_VERSION = '1.13.0';
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
  const fresh = () => ({ v: 1, lang: '', soon: 7, lookup: true, autoShop: false, welcomed: false, units: 'auto', saved: [], savedC: [], homes: [], home: '', products: [], consumed: [], discarded: [], shopping: [] });
  const load = () => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(LS)) || {}); } catch (e) { return fresh(); } };
  let S = load();
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { toast(t('No se pudo guardar en este navegador')); } };
  const ui = { tab: 'products', q: '', sheet: null, period: 'month', toast: null, catalog: null, catLang: null, diets: {}, rmode: 'mine', rq: '', rdiet: '', rshown: 40, install: null, undo: null, cat: '', loc: '', hist: 'consumed', quick: null, quickQ: '', quickAdded: {}, welcome: null, shKey: '', opener: null, cook: null, comp: [], compSig: '', composer: null, composedMap: {} };

  /* ---------- casas: cada una con sus productos ---------- */
  const homesSorted = () => S.homes.slice().sort((a, b) => (a.createdAt + a.id).localeCompare(b.createdAt + b.id));
  const homeIdOf = p => p.homeId || (homesSorted()[0] || {}).id || '';
  const homeOn = () => S.homes.length >= 2 && S.homes.some(h => h.id === S.home);
  const visible = () => (homeOn() ? S.products.filter(p => homeIdOf(p) === S.home) : S.products);
  const homeForNew = () => (!S.homes.length ? '' : S.homes.some(h => h.id === S.home) ? S.home : homesSorted()[0].id);
  function addHome(name) {
    const clean = String(name || '').trim().slice(0, 60); if (!clean) return;
    if (!S.homes.length) { const main = { id: uid(), name: t('Mi casa'), createdAt: new Date(Date.now() - 1000).toISOString() }; S.homes.push(main); S.products.forEach(p => { if (!p.homeId) p.homeId = main.id; }); }
    const h = { id: uid(), name: clean, createdAt: new Date().toISOString() }; S.homes.push(h); S.home = h.id; save();
  }
  function deleteHome(id) {
    const hs = homesSorted(); if (hs.length < 2) return; const target = hs.find(h => h.id !== id); if (!target) return;
    S.products.forEach(p => { if (homeIdOf(p) === id) p.homeId = target.id; });
    S.homes = S.homes.filter(h => h.id !== id); if (S.home === id) S.home = target.id; save();
  }

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
  const KINDS = [['almacen', 'Almacén', 'shopping-basket'], ['bebidas', 'Bebidas', 'cup-soda'], ['carnes', 'Carnes', 'drumstick'], ['condimentos', 'Condimentos', 'droplet'], ['congelados', 'Congelados', 'snowflake'], ['frutas', 'Frutas', 'apple'], ['lacteos', 'Lácteos', 'milk'], ['limpieza', 'Limpieza', 'spray-can'], ['medicamentos', 'Medicamentos', 'pill'], ['panificados', 'Panificados', 'croissant'], ['perfumeria', 'Perfumería', 'sparkles'], ['verduras', 'Verduras', 'carrot'], ['otros', 'Otros', 'package']];
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
  const CAT_COLOR = { almacen: '#c98a3d', bebidas: '#3d9bd9', carnes: '#d4574e', condimentos: '#c9a227', congelados: '#4fb3d4', frutas: '#e8685a', lacteos: '#6c8ed6', limpieza: '#3fb6a8', medicamentos: '#e0577a', panificados: '#c8884a', perfumeria: '#a46fd6', verduras: '#4dae5a', otros: '#8e8e93' };
  const catIcon = k => { const r = KINDS.find(x => x[0] === k); return ico(r ? r[2] : 'package'); };
  const catBadge = k => `<span class="ico" style="--c:${CAT_COLOR[k] || '#8e8e93'}" aria-hidden="true">${catIcon(k)}</span>`;
  const placeLabel = p => (PLACES.includes(p) ? t(p) : p || '');

  /* ---------- reglas de vencimiento ---------- */
  const OPEN_DAYS = { lacteos: 5, bebidas: 5, panificados: 5, carnes: 2, frutas: 4, verduras: 4, condimentos: 60, congelados: 30, almacen: 30, medicamentos: 90, perfumeria: 180, limpieza: 365 };
  const openExp = p => { if (!p.openedAt || !(p.openDays > 0)) return null; const d = parseDay(p.openedAt); d.setDate(d.getDate() + p.openDays); return iso(d); };
  // Vale el menor entre el vencimiento impreso y abierto + días.
  const expOf = p => { const o = openExp(p); if (!p.expiry) return o; return o && o < p.expiry ? o : p.expiry; };
  const daysOf = p => { const e = expOf(p); return e ? daysBetween(today0(), parseDay(e)) : null; };
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
    const before = JSON.parse(JSON.stringify(p)), rec = { id: uid(), name: p.name, category: p.category || '', barcode: p.barcode || '', consumedAt: new Date().toISOString(), expiry: expOf(p) || null };
    S.consumed.push(rec);
    const wasLast = !(p.quantity > 1), listed = wasLast && S.autoShop && !S.shopping.some(i => !i.done && fold(i.name) === fold(p.name));
    if (!wasLast) p.quantity -= 1; else S.products = S.products.filter(x => x.id !== id);
    if (listed) addToShopping(p.name);
    save(); closeSheet(false);
    setUndo(() => { if (listed) { const k = S.shopping.findIndex(i => !i.done && fold(i.name) === fold(p.name)); if (k >= 0) S.shopping.splice(k, 1); } S.consumed = S.consumed.filter(c => c.id !== rec.id); const cur = S.products.find(x => x.id === id); if (cur) cur.quantity = before.quantity; else S.products.push(before); save(); });
    toast(t('Consumido: %@', p.name), true);
  }
  function discard(id) {
    const p = S.products.find(x => x.id === id); if (!p) return;
    const rec = { id: uid(), name: p.name, category: p.category || '', discardedAt: new Date().toISOString(), expiry: expOf(p) || null, quantity: p.quantity || 1 };
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
  function addToShopping(name, note) {
    if (!name || S.shopping.some(i => !i.done && fold(i.name) === fold(name))) return;
    S.shopping.push({ id: uid(), name: String(name).slice(0, 120), note: note || '', done: false, addedAt: new Date().toISOString() }); save();
  }

  /* ---------- vistas ---------- */
  function productRow(p) {
    const d = daysOf(p), b = bucketOf(p), meta = [];
    if (expOf(p) && b !== 'none') meta.push(fmtDate(expOf(p))); else meta.push(t('Sin fecha'));
    const c = catLabel(catKey(p.category)) || p.category; if (c) meta.push(c);
    if (p.location) meta.push(placeLabel(p.location));
    return `<button class="item" data-act="open" data-id="${esc(p.id)}">${catBadge(catKey(p.category))}
      <span class="grow"><span class="t">${esc(p.name)}${p.quantity > 1 ? ' ×' + p.quantity : ''}</span><br><span class="s">${esc(meta.join(' · '))}</span></span>
      ${b !== 'none' ? `<span class="pill ${tone(b)}">${esc(shortLabel(d))}</span>` : ''}</button>`;
  }
  function listHtml() {
    const q = fold(ui.q), items = visible().filter(p => (!ui.cat || catKey(p.category) === ui.cat) && (!ui.loc || p.location === ui.loc) && (!q || [p.name, p.category, catLabel(catKey(p.category)), p.location, placeLabel(p.location), p.notes].some(v => fold(v).includes(q))));
    if (!visible().length) return `<div class="empty"><b>${esc(t('Sin productos'))}</b>${esc(t('Agregá tu primer producto con el botón +.'))}</div>`;
    if (!items.length) return `<div class="empty">${esc(t('Sin resultados'))}</div>`;
    const order = [['expired', 'Vencidos', 'red', 'triangle-alert'], ['soon', 'Por vencer', 'orange', 'timer'], ['upcoming', 'Próximos', 'green', 'circle-check'], ['none', 'Sin fecha', 'gray', 'infinity']];
    return order.map(([k, title, col, ic]) => {
      const g = items.filter(p => bucketOf(p) === k).sort((a, b) => (expOf(a) || '9').localeCompare(expOf(b) || '9') || a.name.localeCompare(b.name));
      return g.length ? `<div class="bucket ${col}">${ico(ic)} ${esc(t(title))} (${g.length})</div><div class="group">${g.map(productRow).join('')}</div>` : '';
    }).join('');
  }
  function homeChips() {
    if (S.homes.length < 2) return '';
    return `<div class="chips scroll"><button class="chip ${homeOn() ? '' : 'on'}" data-act="homef" data-id="">${ico('house')} ${esc(t('Todas las casas'))}</button>${homesSorted().map(h => `<button class="chip ${homeOn() && S.home === h.id ? 'on' : ''}" data-act="homef" data-id="${esc(h.id)}">${esc(h.name)}</button>`).join('')}</div>`;
  }
  function locChips() {
    const ls = PLACES.filter(l => visible().some(p => p.location === l)); if (ls.length < 2) return '';
    return `<div class="chips scroll"><button class="chip ${ui.loc ? '' : 'on'}" aria-pressed="${!ui.loc}" data-act="locf" data-id="">${esc(t('Ubicación'))}</button>${ls.map(l => `<button class="chip ${ui.loc === l ? 'on' : ''}" aria-pressed="${ui.loc === l}" data-act="locf" data-id="${esc(l)}">${esc(placeLabel(l))}</button>`).join('')}</div>`;
  }
  function catChips() {
    const ks = KINDS.map(k => k[0]).filter(k => visible().some(p => catKey(p.category) === k));
    if (ks.length < 2) return '';
    return `<div class="chips scroll"><button class="chip ${ui.cat ? '' : 'on'}" data-act="catf" data-id="">${esc(t('Todas'))}</button>${ks.map(k => `<button class="chip ${ui.cat === k ? 'on' : ''}" aria-pressed="${ui.cat === k}" data-act="catf" data-id="${k}">${catIcon(k)} ${esc(catLabel(k))}</button>`).join('')}</div>`;
  }
  function productsView() {
    const vis = visible(), total = vis.length, exp = vis.filter(p => bucketOf(p) === 'expired').length, soon = vis.filter(p => bucketOf(p) === 'soon').length;
    return `<div class="row"><h1 class="grow brand"><img src="icons/icon-192.png" alt="" width="36" height="36">Vencito</h1><button class="btn" data-act="stats" aria-label="${esc(t('Estadísticas'))}">${ico('chart-column')}</button></div>
      <div class="tiles"><div class="tile green"><b>${total}</b><span>${esc(t('Total'))}</span></div><div class="tile red"><b>${exp}</b><span>${esc(t('Vencidos'))}</span></div><div class="tile orange"><b>${soon}</b><span>${esc(t('Por vencer'))}</span></div></div>
      ${installHtml()}
      <div class="quick four"><button class="btn" data-act="scan-add"><b>${ico('scan-barcode')}</b>${esc(t('Escanear código'))}</button><button class="btn" data-act="scan-consume"><b>${ico('circle-check')}</b>${esc(t('Consumir con escáner'))}</button><button class="btn" data-act="scan-bulk"><b>${ico('layers')}</b>${esc(t('Agregar varios'))}</button><button class="btn" data-act="quick"><b>${ico('zap')}</b>${esc(t('Carga rápida'))}</button></div>
      <input class="search" id="q" type="search" placeholder="${esc(t('Buscar producto, categoría, lugar…'))}" value="${esc(ui.q)}" autocomplete="off">
      ${homeChips()}${catChips()}${locChips()}
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
    const row = i => `<div class="item ${i.done ? 'done' : ''}"><button class="check ${i.done ? 'on' : ''}" data-act="tick" data-id="${esc(i.id)}" aria-label="${esc(i.name)}">${i.done ? ico('check') : ''}</button><span class="grow"><span class="t">${esc(i.name)}</span>${i.note ? `<br><span class="s">${esc(i.note)}</span>` : ''}</span><button class="btn" data-act="untick" data-id="${esc(i.id)}" aria-label="${esc(t('Eliminar'))}">${ico('x')}</button></div>`;
    return `<div class="row"><h1 class="grow">${esc(t('Lista de compras'))}</h1><button class="btn" data-act="share-list">${esc(t('Compartir'))}</button></div>
      <form class="row" data-form="shop-add"><input class="search grow" id="shopname" placeholder="${esc(t('Agregar a la lista'))}" autocomplete="off"><button class="btn primary" type="submit">+</button></form>
      ${open.length ? `<div class="group">${open.map(row).join('')}</div>` : `<div class="empty">${esc(t('Nada pendiente'))}</div>`}
      ${done.length ? `<div class="row"><h2 class="grow">${esc(t('Comprados'))}</h2><button class="link" style="width:auto" data-act="clear-done">${esc(t('Quitar comprados'))}</button></div><div class="group">${done.map(row).join('')}</div>` : ''}`;
  }
  function settingsView() {
    const cur = S.lang;
    const langRow = (k, name) => `<button class="item" data-act="lang" data-id="${k}"><span class="grow t">${esc(name)}</span>${cur === k ? '<span class="good">' + ico('check') + '</span>' : ''}</button>`;
    return `<h1>${esc(t('Ajustes'))}</h1>
      <h2>${esc(t('Idioma / Language'))}</h2><div class="group">${langRow('', t('Idioma del sistema'))}${Object.entries(LANGS).map(([k, n]) => langRow(k, n)).join('')}</div>
      <h2>${esc(t('Por vencer'))}</h2><div class="group"><label class="f"><span>${esc(t('Se marca «Por vencer» cuando faltan hasta'))}</span><select data-act="soon">${[1, 3, 7, 15].map(n => `<option value="${n}" ${S.soon === n ? 'selected' : ''}>${esc(t('%lld días', n))}</option>`).join('')}</select></label></div>
      <h2>${esc(t('Lista de compras'))}</h2><div class="group"><label class="f row"><span class="grow" style="font-size:16px;color:inherit">${esc(t('Sumar a la lista al terminar un producto'))}</span><input type="checkbox" data-act="autoshop" style="width:auto" ${S.autoShop ? 'checked' : ''}></label></div>
      <h2>${esc(t('Unidades de las recetas'))}</h2><div class="group"><label class="f"><span>${esc(t('Sistema de unidades'))}</span><select data-act="units">${[['auto', 'Automático'], ['metric', 'Métrico (g, ml)'], ['imperial', 'Imperial (oz, lb)']].map(([k, n]) => `<option value="${k}" ${S.units === k ? 'selected' : ''}>${esc(t(n))}</option>`).join('')}</select></label></div>
      <h2>${esc(t('Casas'))}</h2><div class="group"><button class="link" data-act="homes">${ico('house')} ${esc(t('Administrar casas'))}${S.homes.length ? ' (' + S.homes.length + ')' : ''}</button></div>
      <h2>${esc(t('Código de barras'))}</h2><div class="group"><label class="f row"><span class="grow" style="font-size:16px;color:inherit">${esc(t('Buscar el producto por código de barras'))}</span><input type="checkbox" data-act="lookup" style="width:auto" ${S.lookup ? 'checked' : ''}></label></div>
      <p class="small muted">${esc(t('Al escanear un código se envía solo ese número a Open Food Facts para obtener el nombre. Nada más sale de tu dispositivo.'))}</p>
      <h2>${esc(t('Datos'))}</h2><div class="group">
        <button class="link" data-act="stats">${esc(t('Estadísticas'))}</button>
        <button class="link" data-act="dups">${esc(t('Buscar duplicados'))}${dupGroups().length ? ' (' + dupSurplus() + ')' : ''}</button>
        <button class="link" data-act="export">${esc(t('Exportar JSON'))}</button>
        <label class="link" style="display:block;cursor:pointer">${esc(t('Importar JSON'))}<input type="file" id="imp" accept="application/json,.json" class="sr"></label>
        <button class="link danger" data-act="clear-hist">${esc(t('Borrar historial'))}</button>
        <button class="link danger" data-act="wipe">${esc(t('Borrar todos los productos'))}</button></div>
      <p class="small muted">${esc(t('Tus datos se guardan solo en este navegador: no hay cuentas ni servidores. Si borrás los datos del sitio, se pierden: exportá un archivo de vez en cuando.'))}</p>
      <h2>${esc(t('Acerca de'))}</h2><div class="group"><div class="item"><span class="grow">${esc(t('Versión'))}</span><span class="muted">${APP_VERSION}</span></div><button class="link" data-act="wl-show">${esc(t('Ver la introducción'))}</button><a class="link" style="display:block;text-decoration:none" href="../">vencito.app</a></div>`;
  }
  const DIETS = [['', 'Cualquier dieta'], ['vegetarian', 'Vegetariana'], ['vegan', 'Vegana'], ['dairyFree', 'Sin lácteos'], ['glutenFree', 'Sin gluten']];
  function matchRecipe(r) {
    const names = visible().map(p => ({ n: fold(p.name), d: daysOf(p) }));
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
    if (ui.rmode === 'saved') return cat.filter(r => S.saved.includes(r.id)).concat(S.savedC.filter(r => !ui.rdiet)).sort((a, b) => a.title.localeCompare(b.title, LOCALES[lang()])).map(r => ({ r, all: true }));
    if (ui.rmode === 'all') {
      const q = fold(ui.rq);
      return cat.filter(r => !q || fold(r.title).includes(q) || fold(r.summary).includes(q) || (r.ingredients || []).some(i => fold(i.name).includes(q)))
        .sort((a, b) => a.title.localeCompare(b.title, LOCALES[lang()])).map(r => ({ r, all: true }));
    }
    return cat.map(matchRecipe).filter(m => m.have >= 2 || (m.total && m.have / m.total >= 0.5))
      .sort((a, b) => (b.expiring > 0) - (a.expiring > 0) || b.have / b.total - a.have / a.total || b.have - a.have).slice(0, 60);
  }
  /* ideas armadas con lo que hay, sin IA (plantillas por rol de producto) */
  const NOT_FOOD = ['medicamentos', 'limpieza', 'perfumeria'];
  function compPantry() {
    return visible().filter(p => !NOT_FOOD.includes(catKey(p.category))).map(p => ({ name: String(p.name).trim().slice(0, 60), daysLeft: daysOf(p) == null ? 99999 : daysOf(p), kind: catKey(p.category) }))
      .filter(x => x.name && x.daysLeft >= 0).map(x => Object.assign(x, { soon: x.daysLeft <= 5 })).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 40);
  }
  function registerComposed(r) {
    r.ingredients = r.pantryIngredients.map(n => ({ name: n, amount: '', keywords: [fold(n)] })).concat(r.extraIngredients.map(n => ({ name: n, amount: r.amounts[n] || '' })));
    ui.composedMap[r.id] = r; return r;
  }
  function ensureComposer() {
    if (ui.composer) return;
    ui.composer = 'loading'; ensureQuickData();
    fetch('data/composer.json').then(r => r.json()).then(j => { VRecipes.setComposer(j); ui.composer = j; ui.compSig = ''; if (ui.tab === 'recipes') refreshRecipes(); }).catch(() => { ui.composer = null; });
  }
  function compSync() {
    if (!ui.composer || ui.composer === 'loading') return;
    const pantry = compPantry(), sig = lang() + '|' + pantry.map(x => x.name + x.daysLeft).join(',');
    if (sig !== ui.compSig) { ui.compSig = sig; ui.comp = VRecipes.suggest(lang(), pantry, 3, []).map(registerComposed); }
  }
  function compHtml() {
    compSync(); if (!ui.comp.length) return '';
    const more = ui.comp.length < 12;
    return `<h2>${esc(t('Armadas con tus productos'))}</h2>${ui.comp.map(r => recipeCard(Object.assign(matchRecipe(r), { r }))).join('')}${more ? `<button class="btn block" data-act="comp-more">${esc(t('Otras ideas'))}</button>` : ''}<h2>${esc(t('Recetas'))}</h2>`;
  }
  // Las armadas no tienen foto propia: se usa la del primer producto que llevan (de la carga rápida).
  function composedThumb(r) {
    const q = ui.quick || [], l = lang();
    for (const n of r.pantryIngredients || []) {
      const hit = q.find(x => VRecipes.matches([fold(x[4][l] || x[4].es), fold(x[4].es)], n));
      if (hit) return `<img class="thumb" src="quick-photos/${encodeURIComponent(hit[0])}.webp" alt="" loading="lazy" decoding="async" onerror="this.outerHTML='<span class=\\'thumb ph\\'></span>'">`;
    }
    return '<span class="thumb ph">' + ico('chef-hat') + '</span>';
  }
  function ensureQuickData() { if (!ui.quickP) ui.quickP = fetch('data/quick.json').then(r => r.json()).then(j => { ui.quick = j; if (ui.tab === 'recipes') refreshRecipes(); }).catch(() => { ui.quick = []; }); return ui.quickP; }
  const refreshRecipes = () => { const e = document.getElementById('rlist'); if (e && ui.tab === 'recipes' && !ui.sheet) e.innerHTML = ui.catalog === null ? `<div class="empty">${esc(t('Cargando…'))}</div>` : recipeCards(); };
  const photo = (id, cls) => `<img class="${cls}" src="photos/${encodeURIComponent(id)}.webp" alt="" loading="lazy" decoding="async" onerror="this.remove()">`;
  const flagOf = o => (o && /^[A-Z]{2}$/.test(o) ? String.fromCodePoint(...[...o].map(c => 127397 + c.charCodeAt(0))) + ' ' : '');
  function recipeCard(m) { const r = m.r; return `<button class="card recipe" style="display:block;width:100%;text-align:left;border:0;margin:8px 0" data-act="recipe" data-id="${esc(r.id)}"><div class="rcard">${r.composed ? composedThumb(r) : photo(r.id, 'thumb')}<div class="grow"><div class="t">${flagOf(r.origin)}${esc(r.title)}${m.expiring ? ' ' + ico('flame', 'o') : ''}</div>
        <div class="s muted small clamp">${esc(r.summary || '')}</div><div class="small" style="margin-top:6px">${m.all ? '' : `<span class="good">${esc(t('Tenés %lld de %lld ingredientes', m.have, m.total))}</span> · `}${r.minutes ? esc(t('%lld min', r.minutes)) : ''}</div></div></div></button>`; }
  function recipeCards() {
    const list = recipeList(), comp = ui.rmode === 'mine' && !ui.rdiet ? compHtml() : '';
    if (ui.rmode === 'saved' && !list.length) return `<div class="empty"><b>${esc(t('Recetas guardadas'))}</b>${esc(t('Todavía no guardaste ninguna receta.'))}</div>`;
    if (ui.rmode === 'mine' && (!visible().length || !list.length)) return comp || `<div class="empty"><b>${esc(t('Todavía no hay ideas'))}</b>${esc(t('Agregá productos y te propongo recetas con lo que tenés.'))}</div>`;
    if (!list.length) return `<div class="empty">${esc(t('Sin resultados'))}</div>`;
    const shown = ui.rmode !== 'mine' ? list.slice(0, ui.rshown) : list;
    return comp + shown.map(recipeCard).join('') + (shown.length < list.length ? `<button class="btn block" data-act="more">${esc(t('Ver más'))} (${shown.length}/${list.length})</button>` : '') + `<p class="small muted">${esc(t('Revisá siempre el estado de los alimentos antes de cocinar.'))}</p>`;
  }
  function recipesView() {
    const head = `<h1>${esc(t('¿Qué cocino hoy?'))}</h1>
      <div class="seg">${[['mine', 'Con lo que tenés'], ['all', 'Todas'], ['saved', 'Guardadas']].map(([k, n]) => `<button class="${ui.rmode === k ? 'on' : ''}" aria-pressed="${ui.rmode === k}" data-act="rmode" data-id="${k}">${esc(t(n))}</button>`).join('')}</div>
      ${ui.rmode === 'all' ? `<input class="search" id="rq" type="search" placeholder="${esc(t('Buscar receta…'))}" value="${esc(ui.rq)}" autocomplete="off">` : ''}
      <div class="chips">${DIETS.map(([k, n]) => `<button class="chip ${ui.rdiet === k ? 'on' : ''}" aria-pressed="${ui.rdiet === k}" data-act="rdiet" data-id="${k}">${esc(t(n))}</button>`).join('')}</div>`;
    return head + `<div id="rlist">${ui.catalog === null ? `<div class="empty">${esc(t('Cargando…'))}</div>` : recipeCards()}</div>`;
  }

  /* ---------- hojas (modales) ---------- */
  const sheet = (title, body, close = true) => `<div class="sheet-bg" data-act="bg"><div class="sheet" role="dialog" aria-modal="true"><div class="bar"><h3>${esc(title)}</h3>${close ? `<button class="btn" data-act="close">${esc(t('Cerrar'))}</button>` : ''}</div>${body}</div></div>`;
  function productSheet(id) {
    const p = S.products.find(x => x.id === id); if (!p) return '';
    const d = daysOf(p), b = bucketOf(p);
    return sheet(p.name, `<div class="group"><div class="item"><span class="grow t ${tone(b) ? '' : ''}">${b !== 'none' ? `<span class="${tone(b) === 'red' ? 'bad' : ''}">${esc(label(d))}</span>` : esc(t('Sin vencimiento'))}</span></div>
      ${expOf(p) && b !== 'none' ? `<div class="item"><span class="grow muted">${esc(t('Vence el'))}</span><span>${esc(fmtDate(expOf(p), true))}</span></div>` : ''}
      ${p.openedAt ? `<div class="item"><span class="grow muted">${esc(t('Abierto el'))}</span><span>${esc(fmtDate(p.openedAt))}</span></div>
        <label class="f row"><span class="grow" style="font-size:16px;color:inherit">${esc(t('Una vez abierto'))}</span><select data-act="opendays" data-id="${esc(id)}" style="width:auto">${[...new Set([2, 3, 5, 7, 14, 30, 60, 90, 180, 365, p.openDays])].filter(Boolean).sort((a, c) => a - c).map(n => `<option value="${n}" ${p.openDays === n ? 'selected' : ''}>${esc(t('%lld días', n))}</option>`).join('')}</select></label>
        ${p.expiry && openExp(p) && openExp(p) < p.expiry ? `<div class="item small muted">${esc(t('Abierto, vence el %@, antes que la fecha del envase.', fmtDate(openExp(p))))}</div>` : ''}` : ''}
      <div class="item"><span class="grow muted">${esc(t('Cantidad'))}</span><span>${p.quantity || 1}</span></div>
      ${catKey(p.category) ? `<div class="item"><span class="grow muted">${esc(t('Categoría'))}</span><span>${esc(catLabel(catKey(p.category)))}</span></div>` : ''}
      ${p.location ? `<div class="item"><span class="grow muted">${esc(t('Ubicación'))}</span><span>${esc(placeLabel(p.location))}</span></div>` : ''}
      ${p.notes ? `<div class="item"><span class="grow muted">${esc(t('Notas'))}</span><span>${esc(p.notes)}</span></div>` : ''}</div>
      <div class="group"><button class="link" data-act="consume" data-id="${esc(id)}">${ico('circle-check')} ${esc(p.quantity > 1 ? t('Usé una unidad') : t('Marcar como consumido'))}</button>
      <button class="link" data-act="discard" data-id="${esc(id)}">${ico('trash-2')} ${esc(t('Tirar'))}</button>
      ${p.openedAt ? `<button class="link" data-act="unopen" data-id="${esc(id)}">${ico('rotate-ccw')} ${esc(t('Quitar la fecha de apertura'))}</button>` : ''}
      ${p.openedAt ? '' : `<button class="link" data-act="open-it" data-id="${esc(id)}">${ico('mail-open')} ${esc(t('Marcar como abierto'))}</button>`}
      <button class="link" data-act="to-list" data-id="${esc(id)}">${ico('shopping-cart')} ${esc(t('Agregar a la lista de compras'))}</button>
      <button class="link" data-act="edit" data-id="${esc(id)}">${ico('pencil')} ${esc(t('Editar'))}</button>
      <button class="link danger" data-act="ask-remove" data-id="${esc(id)}">${esc(t('Eliminar'))}</button></div>`);
  }
  function formSheet(id) {
    const p = (id ? S.products.find(x => x.id === id) : null) || (ui.sheet && ui.sheet.pre) || null, q = p ? p.quantity || 1 : 1, noexp = p ? !p.expiry && !p.pre : false;
    const def = new Date(); def.setDate(def.getDate() + 7);
    return sheet(id ? t('Editar') : t('Agregar producto'), `<form data-form="product" data-id="${esc(id || '')}"><div class="quick two"><button type="button" class="btn" data-act="form-scan"><b>${ico('scan-barcode')}</b>${esc(t('Escanear código'))}</button><button type="button" class="btn" data-act="read-date"><b>${ico('calendar')}</b>${esc(t('Leer fecha de la foto'))}</button></div>
      <p class="small muted" id="fstatus" aria-live="polite">${p && p.barcode ? esc(t('Código de barras')) + ': ' + esc(p.barcode) : ''}</p><div class="group">
      <label class="f"><span>${esc(t('Nombre'))}</span><input name="name" required maxlength="200" value="${esc(p ? p.name : '')}" autocomplete="off" autofocus></label>
      <label class="f"><span>${esc(t('Categoría'))}</span><select name="category"><option value=""></option>${KINDS.map(([k, es]) => `<option value="${k}" ${p && catKey(p.category) === k ? 'selected' : ''}>${esc(t(es))}</option>`).join('')}</select></label>
      ${S.homes.length >= 2 ? `<label class="f"><span>${esc(t('Casa'))}</span><select name="homeId">${homesSorted().map(h => `<option value="${esc(h.id)}" ${(id && p ? homeIdOf(p) : homeForNew()) === h.id ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</select></label>` : ''}
      <label class="f"><span>${esc(t('Ubicación'))}</span><select name="location"><option value=""></option>${PLACES.map(pl => `<option value="${pl}" ${p && p.location === pl ? 'selected' : ''}>${esc(t(pl))}</option>`).join('')}${p && p.location && !PLACES.includes(p.location) ? `<option selected>${esc(p.location)}</option>` : ''}</select></label>
      <div class="f row" style="padding:10px 14px"><span class="grow">${esc(t('Cantidad'))}</span><span class="stepper"><button type="button" data-act="qty" data-id="-1">−</button><b id="qty">${q}</b><button type="button" data-act="qty" data-id="1">+</button></span></div>
      <label class="f row"><span class="grow" style="font-size:16px;color:inherit">${esc(t('Sin fecha de vencimiento'))}</span><input type="checkbox" name="noexp" style="width:auto" ${noexp ? 'checked' : ''}></label>
      <label class="f"><span>${esc(t('Vencimiento'))}</span><input type="date" name="expiry" value="${esc(p && p.expiry ? p.expiry : iso(def))}" ${noexp ? 'disabled' : ''}></label>
      <label class="f"><span>${esc(t('Notas'))}</span><textarea name="notes" rows="2">${esc(p ? p.notes || '' : '')}</textarea></label></div>
      <input type="hidden" name="quantity" value="${q}"><input type="hidden" name="barcode" value="${esc(p && p.barcode || '')}">
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
    return sheet(t('Estadísticas'), `<div class="seg">${[['month', 'Este mes'], ['quarter', '3 meses'], ['all', 'Todo']].map(([k, n]) => `<button class="${ui.period === k ? 'on' : ''}" aria-pressed="${ui.period === k}" data-act="period" data-id="${k}">${esc(t(n))}</button>`).join('')}</div>
      <div class="stats"><button class="stat" data-act="hist" data-id="consumed" style="border:0;text-align:left"><span class="g">${ico('circle-check')}</span><b>${cur.consumed}</b>${esc(t('Consumidos'))}${delta(cur.consumed, prev && prev.consumed, false)}</button>
      <div class="stat"><span>${ico('timer')}</span><b>${rate}</b>${esc(t('Usados a tiempo'))}</div>
      <button class="stat" data-act="hist" data-id="discarded" style="border:0;text-align:left"><span class="o">${ico('trash-2')}</span><b>${cur.discarded}</b>${esc(t('Tirados'))}${delta(cur.discarded, prev && prev.discarded, true)}</button>
      <div class="stat"><span class="g">${ico('life-buoy')}</span><b>${cur.rescued}</b>${esc(t('Rescatados'))}</div></div>
      <p class="small muted">${esc(t('«Rescatados»: usados en los últimos %lld días antes de vencer. «Tirados»: lo que sacás con «Tirar» o confirmás que tiraste.', 3))}</p>
      ${streak != null ? `<div class="group"><div class="item"><span class="o">${ico('flame')}</span><span class="grow">${esc(t('Días sin tirar nada'))}</span><b>${streak}</b></div></div>` : ''}
      <h2>${esc(t('Últimos 6 meses'))}</h2><div class="card" style="padding:12px"><div class="chart">${bars.map(b => `<div class="m"><div class="bars"><i style="height:${Math.round(100 * b.c / max)}%;background:var(--green)"></i><i style="height:${Math.round(100 * b.d / max)}%;background:var(--orange)"></i></div><span class="l">${esc(new Intl.DateTimeFormat(LOCALES[lang()], { month: 'narrow' }).format(b.m))}</span></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--green)"></i>${esc(t('Consumidos'))}</span><span><i style="background:var(--orange)"></i>${esc(t('Tirados'))}</span></div></div>
      ${top(cur.cats).length ? `<h2>${esc(t('Más consumidos'))}</h2><div class="group">${list(top(cur.cats), catLabelOf)}</div>` : ''}
      ${top(cur.tcats).length ? `<h2>${esc(t('Lo que más tirás'))}</h2><div class="group">${list(top(cur.tcats), catLabelOf)}</div>` : ''}
      ${names.length ? `<h2>${esc(t('Los que tirás seguido'))}</h2><div class="group">${names.map(n => `<div class="item" style="padding:8px 14px"><span class="grow">${esc(n.name)}</span><span class="muted">×${n.units}</span></div>`).join('')}</div><p class="small muted">${esc(t('Quizás convenga comprar menos de a poco.'))}</p>` : ''}`);
  }
  const catLabelOf = k => esc(catLabel(k));
  /* duplicados: mismo código de barras (o, sin código, mismo nombre) y mismo vencimiento; otro vencimiento es otro lote */
  function dupGroups() {
    const b = {};
    S.products.forEach(p => {
      const bc = String(p.barcode || '').replace(/\D/g, ''), id = bc.length >= 8 ? 'b:' + bc : 'n:' + fold(p.name); if (id === 'n:') return;
      (b[id + '|' + (expOf(p) || '')] = b[id + '|' + (expOf(p) || '')] || []).push(p);
    });
    return Object.values(b).filter(g => g.length > 1).map(g => g.sort((x, y) => String(x.addedAt).localeCompare(String(y.addedAt)) || x.id.localeCompare(y.id)));
  }
  const dupSurplus = () => dupGroups().reduce((n, g) => n + g.length - 1, 0);
  function mergeGroup(ids) {
    const ms = ids.map(i => S.products.find(x => x.id === i)).filter(Boolean); if (ms.length < 2) return 0;
    const keep = ms[0];
    ms.slice(1).forEach(o => { keep.quantity = Math.min(999, (keep.quantity || 1) + (o.quantity || 1)); ['category', 'location', 'notes', 'barcode', 'openedAt', 'openDays', 'homeId'].forEach(k => { if (!keep[k] && o[k]) keep[k] = o[k]; }); });
    S.products = S.products.filter(x => !ms.slice(1).includes(x)); return ms.length - 1;
  }
  function dupsSheet() {
    const gs = dupGroups();
    return sheet(t('Buscar duplicados'), gs.length ? `<p class="muted small">${esc(t('Mismo producto y mismo vencimiento cargado más de una vez. Al fusionar se suman las cantidades.'))}</p>
      ${gs.map(g => `<div class="group"><div class="item"><span class="grow"><span class="t">${esc(g[0].name)}</span><br><span class="s">${esc(g.length + ' × ' + (expOf(g[0]) ? fmtDate(expOf(g[0])) : t('Sin fecha')))}</span></span><button class="btn primary" data-act="dup-merge" data-id="${esc(g.map(x => x.id).join(','))}">${esc(t('Fusionar'))}</button></div></div>`).join('')}
      <button class="btn block" data-act="dup-all">${esc(t('Fusionar todos'))} (${dupSurplus()})</button>` : `<div class="empty"><b>${esc(t('Sin duplicados'))}</b>${esc(t('No hay productos repetidos.'))}</div>`);
  }
  const WELCOME = [['scan-barcode', 'Escaneá el envase', 'Tocá «Escanear código» y apuntá al código de barras; después sacale una foto a la fecha de vencimiento. También podés cargarlo a mano o con Carga rápida.'],
    ['circle-check', 'Revisá y guardá', 'Vencito completa el nombre y la categoría. Vos revisás la fecha antes de guardar.'],
    ['lock', 'Tus datos son tuyos', 'Todo se guarda solo en este navegador, sin cuentas ni servidores. Instalá Vencito en tu pantalla de inicio y exportá una copia de vez en cuando.']];
  function welcomeHtml() {
    const i = ui.welcome, [ic, title, text] = WELCOME[i], last = i === WELCOME.length - 1;
    return `<div class="welcome" role="dialog" aria-modal="true"><div class="row" style="justify-content:flex-end;height:44px">${last ? '' : `<button class="link" style="width:auto" data-act="wl-skip">${esc(t('Saltar'))}</button>`}</div>
      <div class="wbody"><div class="wic" aria-hidden="true">${ico(ic)}</div><h1 style="font-size:28px">${esc(t(title))}</h1><p class="muted">${esc(t(text))}</p></div>
      <div class="dots" aria-hidden="true">${WELCOME.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn primary block" data-act="wl-next">${esc(last ? t('Empezar') : t('Siguiente'))}</button></div>`;
  }
  function homesSheet() {
    const hs = homesSorted(), counts = {}; S.products.forEach(p => { const h = homeIdOf(p); if (h) counts[h] = (counts[h] || 0) + 1; });
    const row = h => `<div class="item"><span class="grow"><input class="plain" data-act="home-name" data-id="${esc(h.id)}" value="${esc(h.name)}" maxlength="60" aria-label="${esc(t('Nombre'))}"><span class="s">${esc(t('%lld productos', counts[h.id] || 0))}</span></span>${hs.length > 1 ? `<button class="btn" data-act="home-del" data-id="${esc(h.id)}" aria-label="${esc(t('Eliminar'))}">${ico('trash-2')}</button>` : ''}</div>`;
    return sheet(t('Casas'), `<div class="group">${hs.length ? hs.map(row).join('') : `<div class="item"><span class="grow"><span class="t">${esc(t('Mi casa'))}</span><br><span class="s">${esc(t('%lld productos', S.products.length))}</span></span></div>`}</div>
      <p class="small muted">${esc(t('Cada casa tiene sus productos. En la lista elegís qué casa ver.'))}</p>
      <div class="row"><input class="search grow" id="newhome" placeholder="${esc(t('Nombre (ej. Casa de la playa)'))}" maxlength="60" autocomplete="off"><button class="btn primary" data-act="home-add">${esc(t('Agregar casa'))}</button></div>${hs.length ? '' : `<p class="small muted">${esc(t('Tus productos actuales quedan en «%@».', t('Mi casa')))}</p>`}`);
  }
  function histSheet() {
    const kind = ui.hist, from = startOf(ui.period, new Date()), key = kind === 'consumed' ? 'consumedAt' : 'discardedAt';
    const rows = (kind === 'consumed' ? S.consumed : S.discarded).filter(r => !from || dayOf(r[key]) >= from).sort((a, b) => String(b[key]).localeCompare(String(a[key])));
    return sheet(kind === 'consumed' ? t('Consumidos') : t('Tirados'), `<div class="seg">${[['month', 'Este mes'], ['quarter', '3 meses'], ['all', 'Todo']].map(([k, n]) => `<button class="${ui.period === k ? 'on' : ''}" data-act="hperiod" data-id="${k}">${esc(t(n))}</button>`).join('')}</div>
      ${rows.length ? `<div class="group">${rows.map(r => `<button class="item" data-act="readd" data-id="${esc(r.id)}">${catBadge(catKey(r.category))}<span class="grow"><span class="t">${esc(r.name)}${r.quantity > 1 ? ' ×' + r.quantity : ''}</span><br><span class="s">${esc(fmtDate(iso(new Date(r[key]))))}</span></span><span class="muted">＋</span></button>`).join('')}</div>
      <p class="small muted">${esc(t('Tocá un producto para volver a agregarlo.'))}</p>` : `<div class="empty">${esc(t('Sin resultados'))}</div>`}`);
  }
  /* carga rápida: los que más cargás y los comunes, de un toque */
  function quickItems() {
    const cnt = {};
    S.products.forEach(p => { const k = fold(p.name), c = cnt[k] || (cnt[k] = { n: 0, name: p.name, cat: catKey(p.category), loc: p.location, spans: [] }); c.n++; if (p.expiry && p.addedAt) { const sp = daysBetween(dayOf(p.addedAt), parseDay(p.expiry)); if (sp > 0 && sp < NO_EXPIRY_DAYS) c.spans.push(sp); } });
    S.consumed.forEach(x => { const k = fold(x.name), c = cnt[k] || (cnt[k] = { n: 0, name: x.name, cat: catKey(x.category), loc: '', spans: [] }); c.n++; });
    const l = lang(), cat = (ui.quick || []).map(([id, kind, days, place, n]) => ({ id, name: n[l] || n.es, cat: kind, days, loc: place })), byName = {};
    cat.forEach(c => { byName[fold(c.name)] = c; });
    const used = new Set(), out = [];
    Object.entries(cnt).filter(([, v]) => v.n >= 2).sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) => { const c = byName[k], sp = v.spans.sort((a, b) => a - b); out.push({ id: 'h:' + k, name: v.name, cat: v.cat || (c && c.cat) || 'otros', days: sp[sp.length >> 1] || (c && c.days) || 14, loc: (c && c.loc) || v.loc || '', photo: c && c.id }); used.add(k); });
    cat.forEach(c => { if (!used.has(fold(c.name))) { used.add(fold(c.name)); out.push(Object.assign({ photo: c.id }, c)); } });
    return out;
  }
  function quickGrid() {
    if (ui.quick === null) return `<div class="empty">${esc(t('Cargando…'))}</div>`;
    const q = fold(ui.quickQ), items = quickItems().filter(i => !q || fold(i.name).includes(q));
    if (!items.length) return `<div class="empty">${esc(t('Sin resultados'))}</div>`;
    return `<div class="qtiles">${items.map(i => { const a = ui.quickAdded[i.id], p = a && S.products.find(x => x.id === a); return `<button type="button" class="qtile ${p ? 'on' : ''}" data-act="quick-pick" data-id="${esc(i.id)}"><span class="qimg">${i.photo ? `<img src="quick-photos/${encodeURIComponent(i.photo)}.webp" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : catIcon(i.cat)}${p ? `<b class="qn">×${p.quantity || 1}</b>` : ''}</span><span class="qt">${esc(i.name)}</span></button>`; }).join('')}</div>`;
  }
  const quickSheet = () => sheet(t('Carga rápida'), `<input class="search" id="qq" type="search" placeholder="${esc(t('Buscar producto, categoría, lugar…'))}" value="${esc(ui.quickQ)}" autocomplete="off"><div id="qgrid">${quickGrid()}</div><p class="small muted">${esc(t('Tocá un producto para agregarlo, con lo que suele durar. Podés cambiarlo después.'))}</p>`);
  function openQuick() {
    ui.quickQ = ''; ui.quickAdded = {}; ui.sheet = { type: 'quick' }; render();
    if (ui.quick === null) ensureQuickData().then(refreshQuick); else refreshQuick();
  }
  const refreshQuick = () => { const g = document.getElementById('qgrid'); if (g && ui.sheet && ui.sheet.type === 'quick') g.innerHTML = quickGrid(); };
  function quickPick(id) {
    const it = quickItems().find(x => x.id === id); if (!it) return;
    const a = ui.quickAdded[id], cur = a && S.products.find(x => x.id === a);
    if (cur) cur.quantity = Math.min(999, (cur.quantity || 1) + 1);
    else { const d = new Date(); d.setDate(d.getDate() + it.days); const p = { id: uid(), name: it.name, category: it.cat, location: it.loc || '', quantity: 1, notes: '', barcode: '', expiry: iso(d), addedAt: new Date().toISOString(), homeId: homeForNew() || undefined }; S.products.push(p); ui.quickAdded[id] = p.id; }
    save(); refreshQuick();
  }
  /* ---------- modo cocina ---------- */
  const unitSys = () => (S.units === 'metric' || S.units === 'imperial' ? S.units : (/^en-US$/i.test(navigator.language || '') ? 'imperial' : 'metric'));
  const amt = (a, f) => VRecipes.display(VRecipes.scale(a, f, lang()), unitSys(), lang() === 'en' ? '.' : ',');
  const recipeById = id => ui.composedMap[id] || S.savedC.find(x => x.id === id) || (ui.catalog || []).find(x => x.id === id);
  const newCook = r => ({ id: r.id, servings: r.servings || 0, have: {}, done: {}, mode: 'list', step: 0, voice: false });
  const cookFactor = (r, c) => (r.servings > 0 && c.servings > 0 ? c.servings / r.servings : 1);
  const canSpeak = () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  function speak(text) { if (!canSpeak()) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = LOCALES[lang()]; speechSynthesis.speak(u); } catch (e) { /* sin voz */ } }
  let wl = null;
  async function cookWake() { try { if (navigator.wakeLock && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) { wl = null; } }
  function cookStop() { if (wl) { try { wl.release(); } catch (e) { /* ya liberada */ } wl = null; } if (canSpeak()) { try { speechSynthesis.cancel(); } catch (e) { /* nada */ } } ui.cook = null; }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ui.sheet && ui.sheet.type === 'recipe') cookWake(); });
  const isSaved = r => (r.composed ? S.savedC.some(x => x.id === r.id) : S.saved.includes(r.id));
  function cookIngHtml(r) {
    const c = ui.cook, m = matchRecipe(r), f = cookFactor(r, c);
    return m.ing.map((x, i) => `<button type="button" class="ck ${c.have[i] ? 'on' : ''}" data-act="ck-ing" data-id="${i}"><span class="ckc">${c.have[i] ? ico('check') : ''}</span><span class="grow"><span class="t">${esc(x.name)}</span>${x.have && !x.staple ? `<span class="good small"> ${ico('check')} ${esc(t('Lo tenés'))}</span>` : ''}</span><span class="muted">${esc(x.amount ? amt(x.amount, f) : '')}</span></button>`).join('');
  }
  const cookStepsHtml = r => (r.steps || []).map((x, i) => `<button type="button" class="stp ${ui.cook.done[i] ? 'on' : ''}" data-act="ck-step" data-id="${i}"><span class="num">${i + 1}</span><span class="grow">${esc(x)}</span></button>`).join('');
  function recipeText(r, c) {
    const f = cookFactor(r, c), m = matchRecipe(r), lines = ['*' + flagOf(r.origin) + r.title + '*'], meta = [];
    if (c.servings) meta.push(t('%lld porciones', c.servings)); if (r.minutes) meta.push(t('%lld min', r.minutes)); if (meta.length) lines.push(meta.join(' · '));
    if (r.summary) lines.push(r.summary);
    lines.push('', '*' + t('Ingredientes') + '*'); m.ing.forEach(x => lines.push('• ' + x.name + (x.amount ? ' (' + amt(x.amount, f) + ')' : '')));
    lines.push('', '*' + t('Preparación') + '*'); (r.steps || []).forEach((x, i) => lines.push((i + 1) + '. ' + x));
    if (r.tip) lines.push('', '💡 ' + r.tip);
    lines.push('', t('Receta de Vencito') + ' · vencito.app'); return lines.join('\n');
  }
  function recipeSheet(id) {
    const r = recipeById(id); if (!r) return '';
    const c = ui.cook && ui.cook.id === id ? ui.cook : (ui.cook = newCook(r));
    if (c.mode === 'steps' && (r.steps || []).length) {
      const n = r.steps.length, i = Math.min(c.step, n - 1);
      return sheet(r.title, `<p class="muted">${esc(t('Paso %lld de %lld', i + 1, n))}</p><div class="pbar"><i style="width:${Math.round(100 * (i + 1) / n)}%"></i></div>
        <button type="button" class="focus" data-act="ck-speak">${esc(r.steps[i])}</button>
        <div class="row" style="margin:12px 0"><button class="btn grow" data-act="ck-prev" ${i === 0 ? 'disabled' : ''}>‹ ${esc(t('Anterior'))}</button><button class="btn primary grow" data-act="ck-next">${i === n - 1 ? esc(t('Terminé')) : esc(t('Siguiente')) + ' ›'}</button></div>
        ${canSpeak() ? `<label class="f row"><span class="grow" style="font-size:16px;color:inherit">${ico('volume-2')} ${esc(t('Leer cada paso en voz alta'))}</span><input type="checkbox" data-act="ck-voice" style="width:auto" ${c.voice ? 'checked' : ''}></label>` : ''}
        <button class="link" data-act="ck-mode" data-id="list">${esc(t('Volver a la receta'))}</button>`);
    }
    const m = matchRecipe(r), saved = isSaved(r);
    return sheet(r.title, `${r.composed ? '' : photo(r.id, 'hero')}<p class="muted">${esc(r.summary || '')}</p><p class="small">${flagOf(r.origin)}${r.minutes ? esc(t('%lld min', r.minutes)) : ''}</p>
      ${r.servings ? `<div class="f row" style="padding:6px 0"><span class="grow">${ico('users')} <span id="ckserv">${esc(t('%lld porciones', c.servings))}</span></span><span class="stepper"><button type="button" data-act="ck-serv" data-id="-1">−</button><button type="button" data-act="ck-serv" data-id="1">+</button></span></div>` : ''}
      ${r.side ? `<p class="small">${ico('leaf')} ${esc(r.side)}</p>` : ''}
      <div class="quick two"><button class="btn" data-act="ck-mode" data-id="steps"><b>${ico('play')}</b>${esc(t('Paso a paso'))}</button><button class="btn" data-act="save-recipe" data-id="${esc(id)}"><b>${ico('heart', saved ? 'fill' : '')}</b>${esc(saved ? t('Quitar de guardadas') : t('Guardar receta'))}</button><button class="btn" data-act="ck-share"><b>${ico('share-2')}</b>${esc(t('Compartir receta'))}</button><button class="btn" data-act="ck-chatgpt"><b>${ico('audio-lines')}</b>${esc(t('Cocinar con ChatGPT'))}</button></div>
      <h2>${esc(t('Ingredientes'))}</h2><div class="group" id="cking">${cookIngHtml(r)}</div>
      ${m.ing.some(x => !x.have && !x.staple) ? `<button class="btn block" style="margin-top:8px" data-act="ck-missing">${ico('shopping-cart')} ${esc(t('Agregar lo que falta a la lista'))}</button>` : ''}
      <h2>${esc(t('Preparación'))}</h2><div class="group" id="ckstp">${cookStepsHtml(r)}</div>${r.tip ? `<p class="muted small">${ico('lightbulb')} ${esc(r.tip)}</p>` : ''}
      <p class="small muted">${esc(t('La pantalla queda encendida mientras cocinás.'))} ${esc(t('Revisá siempre el estado de los alimentos antes de cocinar.'))}</p>`);
  }
  function cookAct(act, id, el) {
    const r = ui.cook && recipeById(ui.cook.id); if (!r) return; const c = ui.cook;
    switch (act) {
      case 'ck-ing': c.have[id] = !c.have[id]; el.classList.toggle('on', !!c.have[id]); el.querySelector('.ckc').innerHTML = c.have[id] ? ico('check') : ''; break;
      case 'ck-step': c.done[id] = !c.done[id]; el.classList.toggle('on', !!c.done[id]); break;
      case 'ck-serv': { c.servings = Math.min(24, Math.max(1, c.servings + parseInt(id, 10))); document.getElementById('ckserv').textContent = t('%lld porciones', c.servings); document.getElementById('cking').innerHTML = cookIngHtml(r); break; }
      case 'ck-mode': c.mode = id; c.step = 0; render(); if (id === 'steps' && c.voice) speak(r.steps[0]); break;
      case 'ck-prev': c.step = Math.max(0, c.step - 1); render(); if (c.voice) speak(r.steps[c.step]); break;
      case 'ck-next': if (c.step >= r.steps.length - 1) { c.mode = 'list'; c.step = 0; c.done = {}; r.steps.forEach((_, i) => { c.done[i] = true; }); if (canSpeak()) speechSynthesis.cancel(); render(); } else { c.step++; render(); if (c.voice) speak(r.steps[c.step]); } break;
      case 'ck-speak': speak(r.steps[c.step]); break;
      case 'ck-share': { const text = recipeText(r, c); if (navigator.share) navigator.share({ title: r.title, text }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast(t('Copiada al portapapeles'), false, true)); break; }
      case 'ck-chatgpt': {
        // Sin esperar nada antes de abrir: los navegadores bloquean las ventanas que se abren después de una promesa.
        const text = t('Quiero preparar la receta que aparece debajo. Guiame en una conversación de voz, un paso por vez. Esperá a que diga «listo» antes de continuar. Respetá las porciones y cantidades indicadas. Antes de empezar, preguntame si tengo los ingredientes y los utensilios necesarios. Si todavía estamos en texto, indicame que active el modo voz en esta misma conversación.') + '\n\n' + recipeText(r, c), copy = () => { try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {}); } catch (e) { /* sin portapapeles */ } };
        const phone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/i.test(navigator.platform));
        const web = () => {
          copy();
          const w = window.open('https://chatgpt.com/?q=' + encodeURIComponent(text), '_blank', 'noopener');
          toast(w ? t('Elegí ChatGPT, enviá la receta y activá el modo voz') : t('Receta copiada: pegala en ChatGPT'), false, true);
        };
        // En el celular se comparte como en la app: se elige ChatGPT (o su app) en el menú de compartir.
        if (phone && navigator.share) navigator.share({ text }).catch(err => { if (!err || err.name !== 'AbortError') web(); }); else web();
        break;
      }
      case 'ck-missing': { const f = cookFactor(r, c); matchRecipe(r).ing.forEach((x, i) => { if (!x.have && !x.staple && !c.have[i]) addToShopping(x.name, x.amount ? amt(x.amount, f) : ''); }); save(); toast(t('Agregado a la lista de compras'), false, true); el.disabled = true; break; }
      case 'save-recipe': { if (r.composed) { const k = S.savedC.findIndex(x => x.id === r.id); if (k >= 0) S.savedC.splice(k, 1); else S.savedC.push(r); } else { const k = S.saved.indexOf(r.id); if (k >= 0) S.saved.splice(k, 1); else S.saved.push(r.id); } save(); const sv = isSaved(r); el.innerHTML = `<b>${ico('heart', sv ? 'fill' : '')}</b>${esc(sv ? t('Quitar de guardadas') : t('Guardar receta'))}`; break; }
    }
  }
  /* ---------- render ---------- */
  function render() {
    document.documentElement.lang = lang();
    const prevActive = document.activeElement;
    const tabs = [['products', 'package', 'Productos'], ['recipes', 'chef-hat', '¿Qué cocino hoy?'], ['shopping', 'shopping-cart', 'Compras'], ['settings', 'settings', 'Ajustes']];
    const main = ui.tab === 'products' ? productsView() : ui.tab === 'recipes' ? recipesView() : ui.tab === 'shopping' ? shoppingView() : settingsView();
    const sh = ui.sheet, shHtml = !sh ? '' : sh.type === 'product' ? productSheet(sh.id) : sh.type === 'form' ? formSheet(sh.id) : sh.type === 'stats' ? statsSheet() : sh.type === 'recipe' ? recipeSheet(String(sh.id)) : sh.type === 'remove' ? removeSheet(sh.id) : sh.type === 'hist' ? histSheet() : sh.type === 'homes' ? homesSheet() : sh.type === 'dups' ? dupsSheet() : sh.type === 'homedel' ? confirmSheet(t('¿Eliminar esta casa?'), t('Sus productos no se borran: pasan a otra casa.'), [{ act: 'home-del-yes', id: sh.id, text: t('Eliminar y pasar sus productos a otra casa'), danger: true }]) : sh.type === 'quick' ? quickSheet() : sh.type === 'hist-clear' ? confirmSheet(t('¿Borrar todo el historial de consumidos?'), t('No se puede deshacer.'), [{ act: 'clear-hist-yes', text: t('Borrar historial'), danger: true }]) : sh.type === 'wipe' ? confirmSheet(t('Borrar todos los productos'), t('No se puede deshacer.'), [{ act: 'wipe-yes', text: t('Borrar todo'), danger: true }]) : '';
    const tb = `<nav class="tabs" aria-label="Vencito"><div>${tabs.map(([k, ic, n]) => `<button class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}" ${ui.tab === k ? 'aria-current="page"' : ''}><b aria-hidden="true">${ico(ic)}</b>${esc(k === 'recipes' ? t('Recetas') : t(n))}</button>`).join('')}</div></nav>`;
    document.getElementById('app').innerHTML = main + shHtml + tb + (ui.welcome != null ? welcomeHtml() : '');
    if (!sh || sh.type !== 'recipe') cookStop();
    const key = sh ? sh.type + ':' + (sh.id || '') : '';
    if (key !== ui.shKey) {
      if (sh && !ui.shKey) ui.opener = prevActive && prevActive.dataset ? { act: prevActive.dataset.act, id: prevActive.dataset.id } : null;
      const sheetEl = document.querySelector('.sheet');
      if (sheetEl) { sheetEl.setAttribute('tabindex', '-1'); sheetEl.focus({ preventScroll: true }); }
      else if (!sh && ui.opener && ui.opener.act) { const sel = '[data-act="' + ui.opener.act + '"]' + (ui.opener.id ? '[data-id="' + ui.opener.id + '"]' : ''), back = document.querySelector(sel); if (back) back.focus({ preventScroll: true }); }
      ui.shKey = key;
    }
    else if (sh) { const se = document.querySelector('.sheet'); if (se && (document.activeElement === document.body || !document.activeElement)) { se.setAttribute('tabindex', '-1'); se.focus({ preventScroll: true }); } }
    if (ui.tab === 'products' && ui.q) { const q = document.getElementById('q'); if (q && document.activeElement !== q && !sh) { /* conserva el texto */ } }
  }
  function removeSheet(id) {
    const p = S.products.find(x => x.id === id); if (!p) return '';
    const expired = bucketOf(p) === 'expired';
    return expired ? confirmSheet(t('¿Lo tiraste o lo cargaste por error?'), p.name, [{ act: 'discard', id, text: t('Lo tiré') }, { act: 'remove', id, text: t('Fue un error de carga'), danger: true }])
      : confirmSheet(t('¿Eliminar %@?', p.name), '', [{ act: 'remove', id, text: t('Eliminar'), danger: true }]);
  }
  let toastTimer;
  // El aviso vive fuera de #app: así no se vuelve a dibujar (y no borra lo que se está escribiendo en un formulario).
  function toast(text, undo, quiet) {
    ui.toast = { text, undo: !!undo }; clearTimeout(toastTimer);
    let el = document.getElementById('toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.innerHTML = `<span>${esc(text)}</span>${undo ? `<button data-act="undo">${esc(t('Deshacer'))}</button>` : ''}`;
    toastTimer = setTimeout(() => { ui.toast = null; const e = document.getElementById('toast'); if (e) e.remove(); }, 6000); if (!quiet) render();
  }
  function closeSheet(draw = true) { ui.sheet = null; if (draw) render(); }

  /* ---------- eventos ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id;
    if (act === 'bg') { if (e.target === el) closeSheet(); return; }
    switch (act) {
      case 'tab': ui.tab = id; ui.sheet = null; if (id === 'recipes') { ensureRecipes(); ensureComposer(); } render(); break;
      case 'open': ui.sheet = { type: 'product', id }; render(); break;
      case 'add': ui.sheet = { type: 'form', id: null }; render(); break;
      case 'edit': ui.sheet = { type: 'form', id }; render(); break;
      case 'close': closeSheet(); break;
      case 'hperiod': ui.period = id; render(); break;
      case 'dups': ui.sheet = { type: 'dups' }; render(); break;
      case 'dup-merge': { const n = mergeGroup(id.split(',')); save(); render(); toast(t('%lld productos fusionados', n), false, true); break; }
      case 'dup-all': { let n = 0; dupGroups().forEach(g => { n += mergeGroup(g.map(x => x.id)); }); save(); render(); toast(t('%lld productos fusionados', n), false, true); break; }
      case 'homef': S.home = id; save(); render(); break;
      case 'homes': ui.sheet = { type: 'homes' }; render(); break;
      case 'home-add': { const i = document.getElementById('newhome'); if (i && i.value.trim()) { addHome(i.value); render(); } break; }
      case 'home-del': ui.sheet = { type: 'homedel', id }; render(); break;
      case 'home-del-yes': deleteHome(id); ui.sheet = { type: 'homes' }; render(); break;
      case 'comp-more': { const add = VRecipes.suggest(lang(), compPantry(), 3, ui.comp.map(r => r.title)).map(registerComposed); ui.comp.push(...add); refreshRecipes(); break; }
      case 'wl-next': if (ui.welcome >= WELCOME.length - 1) { ui.welcome = null; S.welcomed = true; save(); } else ui.welcome++; render(); break;
      case 'wl-skip': ui.welcome = null; S.welcomed = true; save(); render(); break;
      case 'wl-show': ui.welcome = 0; render(); break;
      case 'locf': ui.loc = id; render(); break;
      case 'catf': ui.cat = id; render(); break;
      case 'unopen': { const p = S.products.find(x => x.id === id); if (p) { delete p.openedAt; delete p.openDays; save(); render(); } break; }
      case 'open-it': { const p = S.products.find(x => x.id === id); if (p) { p.openedAt = iso(new Date()); p.openDays = OPEN_DAYS[catKey(p.category)] || 7; save(); render(); } break; }
      case 'quick': openQuick(); break;
      case 'quick-pick': quickPick(id); break;
      case 'hist': ui.hist = id; ui.sheet = { type: 'hist' }; render(); break;
      case 'readd': { const r = (ui.hist === 'consumed' ? S.consumed : S.discarded).find(x => x.id === id); if (r) { ui.sheet = { type: 'form', id: null, pre: { pre: true, name: r.name, category: r.category || '', barcode: r.barcode || '' } }; render(); } break; }
      case 'scan-add': openScanner('add'); break;
      case 'scan-consume': openScanner('consume'); break;
      case 'scan-bulk': openScanner('bulk'); break;
      case 'form-scan': openScanner('fill'); break;
      case 'read-date': pickDate({ kind: 'form' }); break;
      case 'scan-close': closeScanner(); break;
      case 'scan-pic': document.getElementById('scanpic').click(); break;
      case 'scan-date': pickDate({ kind: 'bulk', i: +id }); break;
      case 'scan-del': scan.items.splice(+id, 1); scanList(); break;
      case 'scan-save': scanSave(); break;
      case 'scan-qty': { const it = scan.items[+id]; if (it) { it.qty = Math.max(1, Math.min(99, it.qty + +el.dataset.d)); scanList(); } break; }
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
      case 'clear-hist': ui.sheet = { type: 'hist-clear' }; render(); break;
      case 'clear-hist-yes': S.consumed = []; save(); closeSheet(false); toast(t('Listo')); break;
      case 'wipe-yes': S.products = []; save(); closeSheet(false); toast(t('Listo')); break;
      case 'recipe': ui.cook = null; ui.sheet = { type: 'recipe', id }; render(); cookWake(); break;
      case 'ck-ing': case 'ck-step': case 'ck-serv': case 'ck-mode': case 'ck-prev': case 'ck-next': case 'ck-speak': case 'ck-share': case 'ck-chatgpt': case 'ck-missing': case 'save-recipe': cookAct(act, id, el); break;
      case 'rmode': ui.rmode = id; ui.rshown = 40; render(); break;
      case 'rdiet': ui.rdiet = id; ui.rshown = 40; render(); break;
      case 'more': ui.rshown += 40; document.getElementById('rlist').innerHTML = recipeCards(); break;
      case 'miss-to-list': { const r = (ui.catalog || []).find(x => x.id === id); if (r) { matchRecipe(r).ing.filter(x => !x.have && !x.staple).forEach(x => addToShopping(x.name)); closeSheet(false); toast(t('Agregado a la lista de compras')); } break; }
      case 'undo': if (ui.undo) { ui.undo(); ui.undo = null; ui.toast = null; const e = document.getElementById('toast'); if (e) e.remove(); render(); } break;
      case 'install': if (ui.install) { ui.install.prompt(); ui.install = null; render(); } break;
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'q') { ui.q = e.target.value; document.getElementById('list').innerHTML = listHtml(); }
    if (e.target.name === 'name' && e.target.form && e.target.form.dataset.form === 'product') { const c = e.target.form.elements.category; if (c && (!c.value || c.dataset.auto)) { const k = VScan.suggest(e.target.value); c.value = k; c.dataset.auto = k ? '1' : ''; } }
    if (e.target.dataset && e.target.dataset.scan) { const it = scan.items[+e.target.dataset.i]; if (it) it[e.target.dataset.scan] = e.target.value; }
    if (e.target.id === 'qq') { ui.quickQ = e.target.value; refreshQuick(); }
    if (e.target.id === 'rq') { ui.rq = e.target.value; ui.rshown = 40; document.getElementById('rlist').innerHTML = recipeCards(); }
  });
  document.addEventListener('change', e => {
    if (e.target.name === 'category') e.target.dataset.auto = '';
    if (e.target.dataset && e.target.dataset.act === 'home-name') { const h = S.homes.find(x => x.id === e.target.dataset.id), v = e.target.value.trim().slice(0, 60); if (h && v) { h.name = v; save(); } }
    if (e.target.dataset && e.target.dataset.act === 'autoshop') { S.autoShop = e.target.checked; save(); }
    if (e.target.dataset && e.target.dataset.act === 'units') { S.units = e.target.value; save(); }
    if (e.target.dataset && e.target.dataset.act === 'opendays') { const p = S.products.find(x => x.id === e.target.dataset.id); if (p) { p.openDays = parseInt(e.target.value, 10) || 1; save(); render(); } }
    if (e.target.dataset && e.target.dataset.act === 'ck-voice' && ui.cook) { const r = recipeById(ui.cook.id); ui.cook.voice = e.target.checked; if (r) { if (ui.cook.voice) speak(r.steps[ui.cook.step]); else if (canSpeak()) speechSynthesis.cancel(); } }
    if (e.target.dataset && e.target.dataset.act === 'lookup') { S.lookup = e.target.checked; save(); }
    if (e.target.id === 'datepic' && e.target.files[0]) { const f = e.target.files[0]; e.target.value = ''; dateFromPhoto(f); }
    if (e.target.id === 'scanpic' && e.target.files[0]) { const f = e.target.files[0]; e.target.value = ''; codeFromPhoto(f); }
    if (e.target.dataset && e.target.dataset.act === 'soon') { S.soon = parseInt(e.target.value, 10) || 7; save(); render(); }
    if (e.target.id === 'imp' && e.target.files[0]) importJson(e.target.files[0]);
    if (e.target.name === 'noexp') { const d = document.querySelector('input[name=expiry]'); if (d) d.disabled = e.target.checked; }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('form'); if (!f) return; e.preventDefault();
    if (f.dataset.form === 'scan-manual') { const i = document.getElementById('scancode'), c = i.value.replace(/\s/g, ''); if (/^\d{8,14}$/.test(c)) { i.value = ''; scan.last = c; scan.lastAt = Date.now(); handleCode(c); } else setScanStatus(t('Ingresá 8 a 14 dígitos.')); return; }
    if (f.dataset.form === 'shop-add') { const i = document.getElementById('shopname'); addToShopping(i.value.trim()); i.value = ''; render(); document.getElementById('shopname').focus(); }
    if (f.dataset.form === 'product') {
      const fd = new FormData(f), name = String(fd.get('name') || '').trim(); if (!name) return;
      const noexp = !!fd.get('noexp'), id = f.dataset.id, data = { name: name.slice(0, 200), category: fd.get('category') || VScan.suggest(name) || '', location: fd.get('location') || '', quantity: Math.min(999, Math.max(1, parseInt(fd.get('quantity'), 10) || 1)), notes: String(fd.get('notes') || '').trim(), barcode: String(fd.get('barcode') || ''), homeId: fd.get('homeId') || undefined, expiry: noexp ? null : (fd.get('expiry') || null) };
      if (id) Object.assign(S.products.find(x => x.id === id) || {}, data); else S.products.push(Object.assign({ id: uid(), addedAt: new Date().toISOString(), homeId: homeForNew() || undefined }, data));
      save(); closeSheet(false); ui.tab = 'products'; render();
    }
  });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); ui.install = e; if (ui.tab === 'products' && !ui.sheet) render(); });
  // El foco no sale de la hoja (o de la introducción) mientras está abierta.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return; const box = document.querySelector('#scanlayer .sheet') || document.querySelector('.welcome') || document.querySelector('.sheet'); if (!box) return;
    const f = [...box.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null); if (!f.length) return;
    const first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!box.contains(a)) { e.preventDefault(); first.focus(); } else if (e.shiftKey && (a === first || a === box)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (scan.mode) closeScanner(); else if (ui.sheet) closeSheet(); } });

  /* ---------- datos: exportar, importar, compartir, recetas ---------- */
  function exportJson() {
    const env = { app: 'Vencito', version: 1, exportedAt: new Date().toISOString(),
      products: S.products.map(p => ({ id: p.id, name: p.name, expiry: p.expiry || '2099-12-31', quantity: p.quantity || 1, barcode: p.barcode || undefined, openedAt: p.openedAt || undefined, openLifeDays: p.openDays || undefined, homeId: p.homeId || undefined, category: p.category || undefined, location: p.location || undefined, notes: p.notes || undefined, addedAt: p.addedAt })),
      consumed: S.consumed.map(c => ({ id: c.id, name: c.name, category: c.category || undefined, consumedAt: c.consumedAt, barcode: c.barcode || undefined, expiry: c.expiry || undefined })),
      shopping: S.shopping.map(i => ({ id: i.id, name: i.name, note: i.note || undefined, isDone: i.done || undefined })),
      homes: S.homes.length ? homesSorted().map(h => ({ id: h.id, name: h.name })) : undefined, discarded: S.discarded };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(env, null, 2)], { type: 'application/json' }));
    a.download = 'vencito-' + iso(new Date()) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importJson(file) {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const env = JSON.parse(rd.result), have = new Set(S.products.map(p => p.id)); let n = 0;
        const haveH = new Set(S.homes.map(h => h.id)); (env.homes || []).forEach((h, i) => { if (h && h.id && h.name && !haveH.has(h.id)) S.homes.push({ id: h.id, name: String(h.name).slice(0, 60), createdAt: new Date(Date.now() - 100000 + i).toISOString() }); });
        (env.products || []).forEach(p => {
          if (!p || !p.name || have.has(p.id)) return; const exp = p.expiry && daysBetween(today0(), parseDay(p.expiry)) < NO_EXPIRY_DAYS ? String(p.expiry).slice(0, 10) : null;
          S.products.push({ id: p.id || uid(), name: String(p.name).slice(0, 200), barcode: p.barcode || '', openedAt: p.openedAt ? String(p.openedAt).slice(0, 10) : undefined, openDays: p.openLifeDays || undefined, homeId: p.homeId || undefined, expiry: exp, quantity: p.quantity || 1, category: catKey(p.category) || p.category || '', location: p.location || '', notes: p.notes || '', addedAt: p.addedAt || new Date().toISOString() }); n++;
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

  /* ---------- escáner: código de barras, búsqueda del producto y fecha desde una foto ---------- */
  const scan = { mode: null, stop: null, items: [], last: '', lastAt: 0, dateTarget: null };
  const setScanStatus = x => { const e = document.getElementById('scanstatus'); if (e) e.textContent = x; };
  function beep() {
    try { const A = window.AudioContext || window.webkitAudioContext, a = new A(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 1100; g.gain.value = 0.15; o.connect(g); g.connect(a.destination); o.start(); setTimeout(() => { o.stop(); a.close(); }, 120); } catch (e) { /* sin sonido */ }
    try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) { /* sin vibración */ }
  }
  const info = code => (S.lookup ? VScan.lookup(code, lang()).catch(() => null) : Promise.resolve(null));
  function openScanner(mode) {
    closeScanner(); scan.mode = mode; scan.items = []; scan.last = '';
    const title = mode === 'consume' ? t('Consumir con escáner') : mode === 'bulk' ? t('Agregar varios') : t('Escanear código');
    const el = document.createElement('div'); el.id = 'scanlayer';
    el.innerHTML = `<div class="sheet-bg scanbg"><div class="sheet" role="dialog" aria-modal="true"><div class="bar"><h3>${esc(title)}</h3><button class="btn" data-act="scan-close">${esc(mode === 'bulk' ? t('Listo') : t('Cerrar'))}</button></div>
      <div class="vwrap"><video id="scanvideo" playsinline muted></video><div class="aim"></div></div>
      <p id="scanstatus" class="muted" aria-live="polite">${esc(mode === 'consume' ? t('Apuntá al código de barras o QR del producto que usaste') : t('Apuntá al código de barras'))}</p>
      <form class="row" data-form="scan-manual"><input class="search grow" id="scancode" inputmode="numeric" pattern="[0-9]*" placeholder="${esc(t('Código de barras'))}" autocomplete="off"><button class="btn primary" type="submit">OK</button></form>
      <button class="link" data-act="scan-pic">${ico('image')} ${esc(t('Elegir una foto'))}</button>
      <div id="scanlist"></div></div></div>`;
    document.body.appendChild(el); scanList();
    VScan.startScan(el.querySelector('video'), onCode).then(stop => { if (document.getElementById('scanlayer') === el) scan.stop = stop; else stop(); })
      .catch(() => { setScanStatus(t('El escáner no está disponible en este dispositivo (requiere cámara y permiso de acceso).')); const w = el.querySelector('.vwrap'); if (w) w.hidden = true; });
  }
  function closeScanner() {
    if (scan.stop) { try { scan.stop(); } catch (e) { /* ya cerrada */ } scan.stop = null; }
    const el = document.getElementById('scanlayer'); if (el) el.remove(); scan.mode = null;
  }
  function onCode(code) {
    const now = Date.now(); if (code === scan.last && now - scan.lastAt < 3000) { scan.lastAt = now; return; }
    scan.last = code; scan.lastAt = now; if (!scan.mode) return; beep(); handleCode(code);
  }
  async function handleCode(code) {
    const mode = scan.mode; if (!mode) return;
    if (mode === 'consume') {
      let p = S.products.filter(x => x.barcode === code).sort((a, b) => (a.expiry || '9').localeCompare(b.expiry || '9'))[0];
      if (!p && S.lookup) { setScanStatus(t('Buscando el producto…')); const r = await info(code); if (r) p = S.products.filter(x => fold(x.name) === fold(r.name)).sort((a, b) => (a.expiry || '9').localeCompare(b.expiry || '9'))[0]; }
      if (!scan.mode) return;
      if (!p) { setScanStatus(t('No tenés un producto con el código %@', code)); return; }
      const name = p.name; consumeOne(p.id); setScanStatus('✓ ' + t('Consumido: %@', name)); return;
    }
    if (mode === 'bulk') {
      let it = scan.items.find(x => x.code === code);
      if (it) it.qty = Math.min(99, it.qty + 1);
      else { it = { code, name: '', category: '', qty: 1, expiry: '', loading: S.lookup }; scan.items.unshift(it); info(code).then(r => { it.loading = false; if (r) { it.name = r.name; it.category = r.category; } if (scan.mode === 'bulk') scanList(); }); }
      scanList(); setScanStatus(t('Apuntá al código de barras del próximo producto')); return;
    }
    setScanStatus(S.lookup ? t('Buscando el producto…') : t('Leí el código %@.', code));
    const r = await info(code); if (!scan.mode) return;
    const msg = r ? t('Producto encontrado por código %@: %@.', code, r.name) : t('Leí el código %@.', code) + (S.lookup ? ' ' + t('No encontré ese código en las bases abiertas.') : '');
    if (mode === 'fill') {
      const f = document.querySelector('form[data-form=product]');
      if (f) {
        f.elements.barcode.value = code;
        if (r && !f.elements.name.value.trim()) f.elements.name.value = r.name;
        if (r && r.category && !f.elements.category.value) f.elements.category.value = r.category;
        const st = document.getElementById('fstatus'); if (st) st.textContent = msg;
      }
      closeScanner(); return;
    }
    closeScanner(); ui.tab = 'products'; ui.sheet = { type: 'form', id: null, pre: { pre: true, name: r ? r.name : '', category: r ? r.category : '', barcode: code } }; render();
    const st = document.getElementById('fstatus'); if (st) st.textContent = msg;
  }
  function scanList() {
    const box = document.getElementById('scanlist'); if (!box) return;
    if (scan.mode !== 'bulk' || !scan.items.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="group">${scan.items.map((it, i) => `<div class="item scanrow"><span class="grow"><input class="plain" data-scan="name" data-i="${i}" value="${esc(it.name)}" placeholder="${esc(it.loading ? t('Buscando…') : t('Nombre'))}" maxlength="200"><span class="row" style="margin-top:4px"><input class="plain" type="date" data-scan="expiry" data-i="${i}" value="${esc(it.expiry)}" aria-label="${esc(t('Vencimiento'))}"><button class="btn" data-act="scan-date" data-id="${i}" aria-label="${esc(t('Leer fecha de la foto'))}">${ico('calendar')}</button></span></span>
      <span class="stepper"><button type="button" data-act="scan-qty" data-id="${i}" data-d="-1">−</button><b>${it.qty}</b><button type="button" data-act="scan-qty" data-id="${i}" data-d="1">+</button></span><button class="btn" data-act="scan-del" data-id="${i}" aria-label="${esc(t('Eliminar'))}">${ico('x')}</button></div>`).join('')}</div>
      <button class="btn primary block" data-act="scan-save">${esc(t('Guardar'))} (${scan.items.length})</button>`;
  }
  function scanSave() {
    const ready = scan.items.filter(x => x.name.trim()); if (!ready.length) { setScanStatus(t('Nombre')); return; }
    ready.forEach(x => S.products.push({ id: uid(), name: x.name.trim().slice(0, 200), category: x.category || VScan.suggest(x.name), location: '', quantity: x.qty, notes: '', barcode: x.code, expiry: x.expiry || null, addedAt: new Date().toISOString(), homeId: homeForNew() || undefined }));
    save(); closeScanner(); ui.tab = 'products'; ui.sheet = null; toast(t('%lld productos agregados', ready.length));
  }
  function pickDate(target) { scan.dateTarget = target; document.getElementById('datepic').click(); }
  async function dateFromPhoto(file) {
    const tg = scan.dateTarget || { kind: 'form' };
    const say = x => { if (tg.kind === 'form') { const e = document.getElementById('fstatus'); if (e) e.textContent = x; } else setScanStatus(x); };
    say(t('Leyendo texto…'));
    try {
      const r = await VScan.readDate(file, m => { if (m.status === 'loading tesseract core' || m.status === 'loading language traineddata') say(t('Leyendo texto…') + ' ' + Math.round(100 * (m.progress || 0)) + '%'); });
      if (!r) { say(t('No encontré una fecha de vencimiento. Cargala a mano.')); return; }
      if (tg.kind === 'form') { const f = document.querySelector('form[data-form=product]'); if (!f) return; f.elements.expiry.value = r.date; f.elements.noexp.checked = false; f.elements.expiry.disabled = false; }
      else { const it = scan.items[tg.i]; if (!it) return; it.expiry = r.date; scanList(); }
      say(t('Fecha detectada: %@ (confianza %@). Revisala antes de guardar.', fmtDate(r.date), t({ alta: 'Alta', media: 'Media', baja: 'Baja' }[r.confidence])));
    } catch (err) { say(t('No pude leer la foto: %@', String(err.message || err))); }
  }
  async function codeFromPhoto(file) {
    setScanStatus(t('Leyendo…'));
    try { const c = await VScan.decodeImage(file); if (!c) { setScanStatus(t('No encontré un código de barras en la foto.')); return; } scan.last = c; scan.lastAt = Date.now(); handleCode(c); }
    catch (err) { setScanStatus(t('No pude leer la foto: %@', String(err.message || err))); }
  }
  document.body.insertAdjacentHTML('beforeend', '<input type="file" id="datepic" accept="image/*" capture="environment" class="sr" tabindex="-1" aria-hidden="true"><input type="file" id="scanpic" accept="image/*" class="sr" tabindex="-1" aria-hidden="true">');

  /* ---------- arranque ---------- */
  { const lp = new URLSearchParams(location.search).get('lang'); if (lp && LANGS[lp] && !S.lang) { S.lang = lp; save(); } }
  if (!S.welcomed && !S.products.length && !/[?&]demo=1/.test(location.search)) ui.welcome = 0; else if (!S.welcomed) { S.welcomed = true; save(); }
  render();
  { const a = new URLSearchParams(location.search).get('action'); if (a === 'scan' && ui.welcome == null) openScanner('add'); else if (a === 'quick' && ui.welcome == null) openQuick(); else if (a === 'recipes') { ui.tab = 'recipes'; ensureRecipes(); ensureComposer(); render(); } }
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
