/* Recetas: escalar porciones y armar ideas con lo que hay (sin IA). Port de Units.scale y RecipeComposer (iOS/Android). */
(function (root) {
  'use strict';
  const L = {"plurals":["s","es","n","en","x"],"derivedBefore":["pure de","pures de","dulce de","jugo de","helado de","sopa de","sopas de","salsa de","caldo de","crema de","mermelada de","snack de","chips de","yogur de","budin de","alfajor de","galletitas de","gaseosa de","harina de","fecula de","batido de","sabor a","polvo de","aderezo de","extracto de","esencia de","gelatina de","flan de","mashed","instant","juice of","ice cream","cream of","soup","sauce","powdered","flavored","flavoured","sweet","doce de","suco de","sorvete de","molho de","creme de","geleia de","salgadinho de","iogurte de","farinha de","amido de","puree de","confiture de","jus de","glace a la","glace au","soupe de","sauce de","bouillon de","yaourt a la","yaourt au","farine de","sirop de","con","sin","al","alla","a la","relleno de","rellenos de","rellena de","rellenas de","relleno con","rellena con","with","without","filled with","stuffed with","com","sem","recheado de","recheado com","recheada com","avec","sans","au","aux","farci","farcie","farcis","ripieno di","ripiena di","mit","ohne","gefullt mit","pure di","dolce di","succo di","gelato di","zuppa di","salsa di","brodo di","crema di","marmellata di","patatine di","yogurt di","farina di","fecola di"],"preparedAnywhere":["salsa","salsas","sopa","sopas","aderezo","aderezos","caldo","caldos","sauce","sauces","soup","soups","dressing","bouillon","gravy","molho","molhos","sopas","soupe","soupes","brodo","zuppa","suppe","sosse"],"connectors":["de","del","con","y","e","sin","al","a","di","du","des","au","aux","avec","with","of","and","mit","und","com","do","da"],"preparedHeads":["fideo","fideos","tallarin","tallarines","ravioles","raviol","sorrentinos","noquis","canelones","lasagna","lasana","tortellini","agnolotti","capeletis","empanada","empanadas","tarta","tartas","pizza","pizzas","prepizza","pizzeta","pizzetas","galletita","galletitas","galleta","galletas","alfajor","alfajores","bizcochuelo","sandwich","sandwiches","hamburguesa","hamburguesas","croqueta","croquetas","milanesa","milanesas","nuggets","patitas","medallones","suprema","supremas","snack","snacks","barra","barras","cereal","cereales","yogur","yogurt","budin","torta","tortas","pastel","pasteles","bocaditos","tostadas","tostada","wrap","wraps","burrito","burritos","taco","tacos","sushi","noodles","ravioli","pie","pies","burger","burgers","cookies","cookie","crackers","cracker","bar","bars","sandwich","pasta","cake","cakes","macarrao","massa","bolacha","bolachas","biscoito","biscoitos","sanduiche","hamburguer","empada","empadas","torta","salgadinho","pastel","pates","raviolis","tarte","tartes","quiche","biscuits","gateau","gateaux","hamburger","ceréales","cereales","yaourt","croquettes","gnocchi","biscotti","panino","panini","tortelloni","cappelletti","pizzette"],"derivedAfter":["frita","fritas","frito","fritos","en polvo","condensada","evaporada","instantaneo","instantanea","chips","crisps","starch","flour","powder","juice","condensed","evaporated","soup","sauce","stock","broth","bouillon","seasoning","flavor","flavour","flavored","flavoured","dressing","nuggets","sandwich","burger","pizza","pie","em po","condensado","en poudre","in polvere","condensato","suprema","supremas","supremitas"],"pastaSpreads":["de avellana","de avellanas","de mani","de cacahuate","de cacahuates","de almendra","de almendras","de nuez","de nueces","de pistacho","de pistachos","de sesamo","de tomate","de anchoa","de anchoas","de aceituna","de aceitunas","de ajo","de curry","de aji","de dientes","de higado","de pescado","de chocolate","de garbanzo","de garbanzos","de lentejas","de avela","de amendoim","de amendoa","de alho","de dentes","de figado"],"pluralPairs":{"es":[["unidad","unidades"],["cucharada","cucharadas"],["cucharadita","cucharaditas"],["taza","tazas"],["diente","dientes"],["lata","latas"],["feta","fetas"],["rebanada","rebanadas"],["rama","ramas"],["hoja","hojas"],["puñado","puñados"],["atado","atados"],["mediana","medianas"],["grande","grandes"],["chica","chicas"],["filete","filetes"],["pizca","pizcas"],["tapa","tapas"],["bote","botes"],["lonja","lonjas"],["paquete","paquetes"],["sobre","sobres"],["vaso","vasos"],["pieza","piezas"],["trozo","trozos"],["rodaja","rodajas"],["ramita","ramitas"],["gota","gotas"],["loncha","lonchas"],["botella","botellas"],["tira","tiras"],["mazorca","mazorcas"],["pimiento","pimientos"],["tomate","tomates"]],"en":[["cup","cups"],["tablespoon","tablespoons"],["teaspoon","teaspoons"],["clove","cloves"],["slice","slices"],["can","cans"],["pinch","pinches"],["handful","handfuls"],["stick","sticks"],["piece","pieces"],["package","packages"],["jar","jars"],["bunch","bunches"],["sprig","sprigs"],["head","heads"],["stalk","stalks"],["strip","strips"],["fillet","fillets"],["patty","patties"],["bottle","bottles"],["bag","bags"],["dash","dashes"],["leaf","leaves"],["ear","ears"]],"pt":[["unidade","unidades"],["colher","colheres"],["xícara","xícaras"],["dente","dentes"],["fatia","fatias"],["pitada","pitadas"],["punhado","punhados"],["maço","maços"],["folha","folhas"],["pedaço","pedaços"],["copo","copos"],["pacote","pacotes"],["lata","latas"],["média","médias"],["grande","grandes"],["pequena","pequenas"]],"fr":[["unité","unités"],["cuillère","cuillères"],["tasse","tasses"],["gousse","gousses"],["tranche","tranches"],["boîte","boîtes"],["pincée","pincées"],["poignée","poignées"],["feuille","feuilles"],["morceau","morceaux"]],"it":[["cucchiaio","cucchiai"],["cucchiaino","cucchiaini"],["tazza","tazze"],["spicchio","spicchi"],["fetta","fette"],["scatola","scatole"],["pizzico","pizzichi"],["manciata","manciate"],["foglia","foglie"],["pezzo","pezzi"]],"de":[["tasse","tassen"],["zehe","zehen"],["scheibe","scheiben"],["dose","dosen"],["prise","prisen"],["blatt","blätter"]]}};
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Mn}+/gu, '');
  const tokenize = name => fold(name).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const plurals = L.plurals, derivedBefore = L.derivedBefore, derivedAfter = L.derivedAfter, pastaSpreads = L.pastaSpreads;
  const preparedAnywhere = new Set(L.preparedAnywhere), preparedHeads = new Set(L.preparedHeads.map(fold));

  /* ¿El nombre del producto contiene alguna de las palabras (sin tildes)? Entera o en plural; si es parte de un producto
     elaborado ("puré de papas", "dulce de leche"), no cuenta. */
  function matchesTokens(keywords, tokens) {
    return keywords.some(keyword => {
      const wanted = keyword.split(' ').filter(Boolean), n = wanted.length;
      if (!n || tokens.length < n || !tokens.some(t => t.startsWith(wanted[0]))) return false;
      for (let start = 0; start + n <= tokens.length; start++) {
        const ok = wanted.every((w, i) => tokens[start + i] === w || (i === n - 1 && plurals.some(p => tokens[start + i] === w + p)));
        if (!ok) continue;
        const before = tokens.slice(Math.max(0, start - 2), start).join(' '), after = tokens.slice(start + n, start + n + 2).join(' ');
        let derived = (n === 1 && wanted[0] === 'pasta' && pastaSpreads.some(p => tokens.slice(start + 1).join(' ').startsWith(p)))
          || derivedBefore.some(d => before === d || before.endsWith(' ' + d))
          || derivedAfter.some(d => after === d || after.startsWith(d + ' '));
        if (!derived && start > 0 && !wanted.some(w => preparedAnywhere.has(w)) && tokens.slice(0, start).some(t => preparedAnywhere.has(t))) derived = true;
        if (!derived && start > 0 && preparedHeads.has(tokens[0]) && !wanted.includes(tokens[0])) derived = true;
        if (!derived) return true;
      }
      return false;
    });
  }
  const matches = (keywords, name) => matchesTokens(keywords, tokenize(name));
  function isPrepared(name) {
    const tokens = tokenize(name); if (!tokens.length) return false;
    if (preparedHeads.has(tokens[0])) return true;
    const text = tokens.join(' '); return derivedBefore.some(d => text.startsWith(d + ' '));
  }

  /* ---------- porciones ---------- */
  const numberOf = text => {
    const t = text.trim();
    if (t.includes('/')) {
      const parts = t.split(/\s+/); let whole = 0, frac = t;
      if (parts.length === 2) { whole = parseFloat(parts[0]) || 0; frac = parts[1]; }
      const f = frac.split('/'); if (f.length !== 2) return null;
      const a = parseFloat(f[0]), b = parseFloat(f[1]); if (isNaN(a) || !b) return null; return whole + a / b;
    }
    const v = parseFloat(t.replace(',', '.')); return isNaN(v) ? null : v;
  };
  const fmt = v => { const r = Math.round(v * 100) / 100; return String(r); };
  function measureText(v, unit) {
    if (['kg', 'l', 'lb', 'lbs'].includes(unit)) return fmt(Math.round(v * 10) / 10);
    return fmt(v >= 50 ? Math.round(v / 5) * 5 : v >= 10 ? Math.round(v) : Math.round(v * 2) / 2);
  }
  function fractionText(v) {
    if (v >= 10) return String(Math.round(v));
    const cands = [[0, ''], [0.25, '1/4'], [1 / 3, '1/3'], [0.5, '1/2'], [2 / 3, '2/3'], [0.75, '3/4'], [1, '']];
    const whole = Math.floor(v), frac = v - whole;
    const best = cands.reduce((a, c) => (Math.abs(c[0] - frac) < Math.abs(a[0] - frac) ? c : a));
    const w = whole + (best[0] === 1 ? 1 : 0);
    if (!best[1]) return w === 0 ? '1/4' : String(w);
    return w === 0 ? best[1] : w + ' ' + best[1];
  }
  function pluralized(rest, count, lang) {
    const m = /^(\s*)([\p{L}]+)/u.exec(rest); if (!m) return rest;
    const word = m[2], lower = word.toLowerCase(), pairs = L.pluralPairs[lang] || L.pluralPairs.es || [];
    let target = null;
    if (count > 1.0001) { const p = pairs.find(x => x[0] === lower); target = p && p[1]; } else { const p = pairs.find(x => x[1] === lower); target = p && p[0]; }
    if (!target) return rest;
    const rep = word[0] !== word[0].toLowerCase() ? target[0].toUpperCase() + target.slice(1) : target;
    return rest.slice(0, m[1].length) + rep + rest.slice(m[1].length + word.length);
  }
  /* «300 g» ×2 → «600 g», «1/2 taza» ×3 → «1 1/2 tazas». Si no empieza con un número o trae varios, se deja igual. */
  function scale(amount, factor, lang) {
    if (!(Math.abs(factor - 1) > 0.0001) || !(factor > 0)) return amount;
    const m = /^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)([\s\S]*)$/.exec(amount); if (!m) return amount;
    const value = numberOf(m[1]); if (value == null) return amount;
    const rest = m[2]; if (/\d/.test(rest)) return amount;
    const scaled = value * factor, u = /^\s*(kg|g|ml|l|lbs?|oz|fl\.?\s?oz)\b/i.exec(rest);
    const text = u ? measureText(scaled, u[1].toLowerCase()) : fractionText(scaled);
    return text + pluralized(rest, scaled, lang || 'es');
  }

  /* ---------- ideas armadas con los productos ---------- */
  let lib = null; const setComposer = j => { lib = j; };
  const ROLES = ['egg', 'rice', 'pasta', 'potato', 'protein', 'veg', 'cheese'];
  let roleWords = null;
  function allRoleWords() {
    if (roleWords) return roleWords; roleWords = {};
    Object.values(lib.roles).forEach(tbl => Object.entries(tbl).forEach(([r, ws]) => { roleWords[r] = (roleWords[r] || []).concat(ws.map(fold)); }));
    Object.keys(roleWords).forEach(r => { roleWords[r] = [...new Set(roleWords[r])]; }); return roleWords;
  }
  function rolesOf(item) {
    const found = new Set(), tokens = tokenize(item.name), table = allRoleWords();
    ROLES.forEach(r => { if (matchesTokens(table[r] || [], tokens)) found.add(r); });
    if (!isPrepared(item.name)) { if (item.kind === 'carnes') found.add('protein'); if (item.kind === 'verduras') found.add('veg'); }
    if (found.has('potato') || found.has('egg') || found.has('rice') || found.has('pasta')) {
      if (!(item.kind === 'verduras' && found.has('potato'))) found.delete('veg');
      if (!found.has('protein') || item.kind !== 'carnes') found.delete('protein');
    }
    return found;
  }
  function shortName(name, lang) {
    const words = []; for (const w of name.split(/\s+/).filter(Boolean)) { if (/\d/.test(w)) break; words.push(w); if (words.length === 3) break; }
    const j = words.join(' '); return lang === 'de' ? j : j.toLowerCase();
  }
  function make(tpl, text, a, b, lang) {
    const nA = shortName(a.name, lang), nB = b ? shortName(b.name, lang) : '';
    const fill = s => s.split('{a}').join(nA).split('{b}').join(nB), used = b ? [a, b] : [a];
    let title = fill(text.title); title = title.charAt(0).toUpperCase() + title.slice(1);
    const amounts = {}, extras = [];
    (text.extras || []).forEach(p => { if (p.length === 2) { extras.push(p[0]); amounts[p[0]] = p[1]; } });
    return { id: 'c:' + fold(title), title, summary: text.summary, pantryIngredients: used.map(x => x.name), extraIngredients: extras, steps: text.steps.map(fill),
      expiringSoon: used.filter(x => x.soon).map(x => x.name), servings: tpl.servings, minutes: tpl.minutes, side: text.side, tip: text.tip, amounts, origin: '', composed: true };
  }
  /* pantry: [{name, daysLeft, kind, soon}] → ideas (las que usan lo que vence pronto, primero). */
  function suggest(lang, pantry, limit, avoiding) {
    if (!lib || !lib.roles[lang]) return [];
    const shown = new Set((avoiding || []).map(fold)), items = pantry.map(it => ({ item: it, roles: rolesOf(it) })), cands = [];
    lib.templates.forEach((tpl, ti) => {
      const text = tpl.text[lang]; if (!text) return;
      const sa = new Set((tpl.slots.a || [])), sb = new Set((tpl.slots.b || []));
      const byDays = (x, y) => x.item.daysLeft - y.item.daysLeft;
      const aItems = items.filter(x => [...x.roles].some(r => sa.has(r))).sort(byDays), bItems = items.filter(x => [...x.roles].some(r => sb.has(r))).sort(byDays);
      let variant = 0;
      aItems.forEach(a => {
        if (!sb.size) { const idea = make(tpl, text, a.item, null, lang); if (shown.has(fold(idea.title))) return; cands.push({ idea, size: 1, soon: a.item.soon ? 1 : 0, days: a.item.daysLeft, ti, variant: variant++ }); return; }
        bItems.forEach(b => {
          if (b.item.name === a.item.name) return;
          const idea = make(tpl, text, a.item, b.item, lang); if (shown.has(fold(idea.title))) return;
          cands.push({ idea, size: 2, soon: [a.item, b.item].filter(x => x.soon).length, days: a.item.daysLeft + b.item.daysLeft, ti, variant: variant++ });
        });
      });
    });
    const ranked = cands.sort((x, y) => (y.size - x.size) || (y.soon - x.soon) || (x.days - y.days));
    const out = [], usedT = new Set(), usedTitles = new Set();
    for (const c of ranked) { if (usedT.has(c.ti) || usedTitles.has(c.idea.title)) continue; usedTitles.add(c.idea.title); usedT.add(c.ti); out.push(c.idea); if (out.length === limit) return out; }
    for (const c of ranked) { if (usedTitles.has(c.idea.title)) continue; usedTitles.add(c.idea.title); out.push(c.idea); if (out.length === limit) break; }
    return out;
  }

  const api = { scale, suggest, setComposer, matches, isPrepared, rolesOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VRecipes = api;
})(typeof window !== 'undefined' ? window : globalThis);
