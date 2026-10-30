/* Escaneo para Vencito (web): código de barras, búsqueda del producto y fecha de vencimiento desde una foto (OCR).
   Todo se procesa en el dispositivo; lo único que puede salir es el número del código a Open Food Facts (opcional). */
(function (root) {
  'use strict';
  const RULES = [["medicamentos",["ibuprofeno","paracetamol","amoxicilina","aspirina","jarabe","pastilla","comprimido","capsula","gotas","colirio","antibiotico","ibuprofen","acetaminophen","aspirin","syrup","pill","tablet","capsule","eye drops","medicine","antibiotic","vitamin","remedio","xarope","dipirona","farmaco","compress","sciroppo","collirio","tachipirina","medicament","sirop","gelule","collyre","doliprane","kapsel","hustensaft","augentropfen","arznei","schmerz"]],["limpieza",["lavandina","detergente","limpiador","quitamanchas","desengrasante","suavizante","jabon en polvo","jabon liquido para ropa","cif","procenex","bleach","detergent","cleaner","softener","dish soap","laundry","agua sanitaria","sabao em po","amaciante","desinfetante","limpador","lava roupa","candeggina","detersivo","ammorbidente","sgrassatore","javel","lessive","adoucissant","nettoyant","liquide vaisselle","waschmittel","spulmittel","weichspuler","reiniger","putzmittel"]],["perfumeria",["shampoo","champu","acondicionador","desodorante","jabon","crema dental","pasta dental","protector solar","bronceador","conditioner","deodorant","soap","toothpaste","sunscreen","lotion","xampu","condicionador","sabonete","creme dental","protetor solar","bagnoschiuma","deodorante","sapone","dentifricio","crema solare","savon","dentifrice","gel douche","creme solaire","duschgel","spulung","deo","seife","zahnpasta","zahncreme","sonnencreme"]],["congelados",["helado","congelad","papas fritas","papas pre fritas","prefritas","nuggets","patitas","reboza","tiritas","ice cream","frozen","fries","sorvete","batata frita","gelato","surgelat","bastoncini","glace","surgele","frites","eis ","speiseeis","tiefkuhl","gefror","pommes frites"]],["lacteos",["dulce de leche","leche","yogur","queso","manteca","crema","ricota","postrecito","milk","yogurt","yoghurt","cheese","butter","cream","doce de leite","leite","iogurte","queijo","manteiga","requeijao","latte","formaggi","burro","mozzarella","ricotta","mascarpone","lait ","yaourt","fromage","beurre","creme fraiche","milch","joghurt","kase","quark","sahne","*milch","*kase","*joghurt"]],["carnes",["pollo","carne","pescado","chorizo","salchicha","jamon","salame","panceta","bondiola","milanesa","hamburguesa","atun","caballa","chicken","beef","pork","meat","fish","ham","sausage","bacon","salami","turkey","tuna","salmon","burger","frango","peixe","linguica","presunto","atum","salsicha","manzo","maiale","pesce","prosciutto","salsiccia","tonno","tacchino","pancetta","poulet","boeuf","porc","viande","poisson","jambon","saucisse","thon","dinde","saumon","hahnchen","huhn","rind","schwein","fleisch","fisch","schinken","wurst","lachs","pute","*wurst","*fleisch","*schinken"]],["condimentos",["mayonesa","ketchup","mostaza","salsa","aderezo","vinagre","aceite","sal ","pimienta","oregano","pimenton","provenzal","mayo","mustard","sauce","dressing","vinegar","oil ","olive oil","salt ","pepper ","spice","maionese","mostarda","molho","azeite","oleo","pimenta","tempero","senape","aceto","olio","pepe ","origano","sale ","moutarde","vinaigre","huile","poivre","sel ","epice","senf","sosse","essig","olivenol","pfeffer","gewurz","salz"]],["panificados",["pan","tostada","galleta","galletita","medialuna","factura","tortilla","bizcocho","budin","tapas de empanada","tapa para","tapas para","prepizza","bread","toast","cookie","cracker","biscuit","bagel","croissant","muffin","cake","pao","torrada","biscoito","bolacha","bolo","pane","fette biscottate","biscott","grissini","cornetto","pain","baguette","brioche","gateau","madeleine","brot","keks","kuchen","zwieback","*brot","*brotchen","*kuchen"]],["verduras",["champi","hongo","tomate","lechuga","papa","cebolla","zanahoria","acelga","espinaca","zapallo","morron","choclo","arveja","tomato","lettuce","potato","onion","carrot","spinach","pumpkin","corn","peas","broccoli","alface","batata","cebola","cenoura","espinafre","abobora","ervilha","brocolis","pomodor","lattuga","patat","cipoll","carot","spinaci","zucchin","zucca","piselli","melanzan","laitue","pomme de terre","pommes de terre","oignon","epinard","courgette","haricot","petits pois","salat","kartoffel","zwiebel","karotte","mohre","spinat","kurbis","erbsen","gurke"]],["bebidas",["coca","sprite","fanta","pepsi","jugo","agua ","gaseosa","cerveza","vino","soda","fernet","bebida","isoton","juice","water ","beer","wine","coke","lemonade","suco","refrigerante","cerveja","vinho","succo","acqua","birra","bibita","aranciata","jus","eau ","biere","vin ","limonade","saft","wasser ","mineralwasser","bier","wein","sprudel","cola","*saft","*wasser","*bier","*schorle"]],["frutas",["manzana","banana","naranja","pera","uva","frutilla","durazno","limon","mandarina","kiwi","apple","orange","pear","grape","strawberr","peach","lemon","berries","maca ","laranja","morango","pessego","limao","abacaxi","manga","mela","arancia","fragol","pesca","ananas","pomme","banane","poire","raisin","fraise","peche","citron","apfel","birne","traube","erdbeer","pfirsich","zitrone"]],["almacen",["arroz","fideo","harina","polenta","lenteja","garbanzo","poroto","azucar","yerba","cafe","te ","cacao","mermelada","cereal","avena","pure","rice","pasta","noodle","flour","sugar","coffee","tea ","cocoa","jam","oats","beans","lentils","peanut butter","honey","macarrao","farinha","feijao","acucar","aveia","geleia","lentilha","grao de bico","amendoim","riso","farina","zucchero","caffe","legumi","lenticchie","ceci","fagioli","marmellata","miele","riz","pates","farine","sucre","the ","confiture","lentilles","pois chiches","miel","reis","nudeln","mehl","zucker","kaffee","tee","marmelade","honig","haferflocken","linsen","bohnen","musli"]]];
  const OFF_RULES = [["medicamentos",["medicines","dietary-supplements","vitamins"]],["limpieza",["cleaning","household","detergents"]],["perfumeria",["cosmetics","hygiene","toothpastes","shampoos","soaps"]],["congelados",["frozen","ice-creams"]],["lacteos",["dairies","milks","cheeses","yogurts","butters","creams","dulce-de-leche"]],["bebidas",["beverages","waters","sodas","juices","drinks","wines","beers"]],["carnes",["meats","fishes","seafood","sausages","hams","canned-fishes"]],["condimentos",["condiments","sauces","mayonnaises","ketchup","mustards","vinegars","oils","salts","spices"]],["panificados",["breads","biscuits","cookies","crackers","pastries","cakes"]],["frutas",["fruits"]],["verduras",["vegetables"]],["almacen",["cereals","pastas","rices","legumes","flours","sugars","coffees","teas","yerba-mate","jams","spreads","snacks","groceries"]]];

  /* ---------- categoría (port de Categorizer) ---------- */
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Mn}+/gu, '');
  function suggest(name) {
    const words = fold(name).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (!words.length) return '';
    const padded = ' ' + words.join(' ') + ' ';
    for (const [kind, kws] of RULES) {
      for (const kw of kws) {
        if (kw[0] === '*') { if (words.some(w => w.endsWith(kw.slice(1)))) return kind; }
        else if (kw.includes(' ')) { if (padded.includes(' ' + kw)) return kind; }
        else if (words.some(w => w.startsWith(kw))) return kind;
      }
    }
    return '';
  }
  function fromTags(tags) {
    const joined = (tags || []).join(' ').toLowerCase();
    const hit = OFF_RULES.find(([, keys]) => keys.some(k => joined.includes(k)));
    return hit ? hit[0] : '';
  }

  /* ---------- búsqueda del producto (Open Food Facts) ---------- */
  const cache = new Map();

  /* Catálogo argentino incluido en la app (Precios Claros – Base SEPA, CC BY 4.0): se consulta en el dispositivo, sin enviar el código. */
  let catalogP = null;
  const stripZeros = c => String(c).replace(/\D/g, '').replace(/^0+/, '');
  function catalog() {
    if (catalogP) return catalogP;
    catalogP = (async () => {
      if (typeof DecompressionStream === 'undefined') return null;
      const res = await fetch('data/argentina-catalog.tsv.gz'); if (!res.ok) return null;
      const text = await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).text(), map = new Map();
      for (const line of text.split('\n')) { const i = line.indexOf('\t'); if (i > 0) map.set(line.slice(0, i), line.slice(i + 1).trim()); }
      return map;
    })().then(v => { if (!v) catalogP = null; return v; }, () => { catalogP = null; return null; });
    return catalogP;
  }

  /* Catálogo de EE. UU. (USDA FoodData Central, dominio público): 260.000 productos, ordenado por código. Pesa 4 MB comprimido, así que
     solo se baja cuando el código parece de EE. UU./Canadá (prefijos GS1 000–199) o es un GTIN-14 y no está en el argentino. Se busca por bisección
     sobre el texto, sin armar un diccionario enorme. */
  let usaP = null;
  function usaCatalog() {
    if (usaP) return usaP;
    usaP = (async () => {
      if (typeof DecompressionStream === 'undefined') return null;
      const res = await fetch('data/usa-catalog.tsv.gz'); if (!res.ok) return null;
      const text = await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).text(), starts = [];
      for (let i = 0; i < text.length;) { starts.push(i); const j = text.indexOf('\n', i); if (j < 0) break; i = j + 1; }
      return { text, starts };
    })().then(v => { if (!v) usaP = null; return v; }, () => { usaP = null; return null; });
    return usaP;
  }
  // Orden numérico sin ceros: primero el más corto y después dígito a dígito.
  const cmpCode = (a, b) => (a.length !== b.length ? (a.length < b.length ? -1 : 1) : a < b ? -1 : a > b ? 1 : 0);
  function findSorted(cat, key) {
    let lo = 0, hi = cat.starts.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, st = cat.starts[mid], tab = cat.text.indexOf('\t', st); if (tab < 0) return null;
      const o = cmpCode(cat.text.slice(st, tab), key);
      if (o === 0) { const end = cat.text.indexOf('\n', tab); return cat.text.slice(tab + 1, end < 0 ? undefined : end).trim(); }
      if (o < 0) lo = mid + 1; else hi = mid - 1;
    }
    return null;
  }

  /* "VINAGRE DE VINO FAVINCO 500ML" → "Vinagre de Vino Favinco 500 ml" */
  const LOWER = new Set(['de', 'del', 'y', 'con', 'sin', 'en', 'para', 'al', 'por', 'x']), UNITS = new Set(['ml', 'cc', 'lt', 'l', 'kg', 'gr', 'g', 'mg', 'u', 'un', 'unid']);
  function cleanSepaName(raw) {
    const words = String(raw).trim().split(/\s+/).filter(Boolean); if (!words.length) return null;
    const out = words.map((w, i) => {
      const lower = w.toLowerCase(), m = /^([\d.,]+)(.*)$/.exec(lower);
      if (m && m[1] && UNITS.has(m[2])) return m[1] + ' ' + m[2];
      return i > 0 && LOWER.has(lower) ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join(' ');
    return out.length >= 2 ? out.slice(0, 200) : null;
  }
  async function gtinSearch(code) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 6000);
    try {
      const res = await fetch('https://www.gtinsearch.org/api/items/' + code, { signal: ctl.signal }); if (!res.ok) return null;
      const j = await res.json(), item = Array.isArray(j) ? j[0] : j; if (!item || typeof item !== 'object') return null;
      const text = (...ks) => { for (const k of ks) { const v = typeof item[k] === 'string' ? item[k].trim() : ''; if (v && v !== 'null') return v; } return ''; };
      let name = text('name', 'title'); if (!name) return null;
      if (name === name.toUpperCase()) name = cleanSepaName(name) || name;
      const size = text('size'); if (size && !name.toLowerCase().includes(size.toLowerCase())) name += ' ' + size;
      name = name.slice(0, 200); return { name, category: suggest(name) };
    } catch (e) { return null; } finally { clearTimeout(timer); }
  }

  /* Primero el catálogo del dispositivo; con la búsqueda en línea activada, Open Food Facts y después GTINSearch. */
  async function lookup(code, lang, online) {
    if (!/^\d{8,14}$/.test(code)) return null;
    const local = (await catalog()), key = stripZeros(code), name = local && local.get(key);
    if (name) return { name: name.slice(0, 200), category: suggest(name) };
    const pc = String(code).padStart(13, '0'); if (/^[01]/.test(pc) || pc.length === 14) { const us = await usaCatalog(), n = us && findSorted(us, key); if (n) return { name: n.slice(0, 200), category: suggest(n) }; }
    if (!online) return null;
    const hit = cache.get(code); if (hit && (hit.r || Date.now() - hit.at < 6e5)) return hit.r;
    let r = null, failed = false;
    try { r = await lookupOff(code, lang); } catch (e) { failed = true; }
    if (!r) r = await gtinSearch(code);
    if (r || !failed) cache.set(code, { r, at: Date.now() });
    return r;
  }
  async function lookupOff(code, lang) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await fetch('https://world.openfoodfacts.org/api/v3/product/' + code + '?product_type=all&fields=product_name_' + lang + ',product_name_es,product_name,product_type,brands,categories_tags', { signal: ctl.signal });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('http ' + res.status);
      const j = await res.json(), p = j && j.status === 'success' ? j.product : null;
      let r = null;
      if (p) {
        const c = k => (typeof p[k] === 'string' && p[k].trim()) || null;
        const name = c('product_name_' + lang) || c('product_name') || c('product_name_es');
        const brand = (String(p.brands || '').split(',')[0] || '').trim() || null;
        if (name || brand) {
          const full = name && brand && !name.toLowerCase().includes(brand.toLowerCase()) ? name + ' ' + brand : name || brand;
          r = { name: full.slice(0, 200), category: fromTags(p.categories_tags) || suggest(full) };
        }
      }
      return r;
    } finally { clearTimeout(timer); }
  }

  /* ---------- carga de librerías sueltas ---------- */
  const loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { delete loaded[src]; no(new Error(src)); }; document.head.appendChild(s); }));
  const abs = p => new URL(p, document.baseURI).href;

  /* ---------- códigos de barras ---------- */
  const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf'];
  let detectorP = null;
  function detector() {
    return detectorP || (detectorP = (async () => {
      if ('BarcodeDetector' in root) {
        try {
          const sup = await root.BarcodeDetector.getSupportedFormats(), fm = FORMATS.filter(f => sup.includes(f));
          if (fm.length) { const d = new root.BarcodeDetector({ formats: fm }); return async src => { const r = await d.detect(src); return r.length ? r[0].rawValue : null; }; }
        } catch (e) { /* cae a ZXing */ }
      }
      await load('vendor/zxing.min.js');
      const Z = root.ZXing, hints = new Map();
      hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.ITF]);
      hints.set(Z.DecodeHintType.TRY_HARDER, true);
      const reader = new Z.MultiFormatReader(); reader.setHints(hints);
      const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
      return async src => {
        const w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
        if (!w || !h) return null;
        const k = Math.min(1, 1280 / Math.max(w, h)); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        cx.drawImage(src, 0, 0, cv.width, cv.height);
        try { return reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv)))).getText(); }
        catch (e) { return null; }
      };
    })());
  }
  const goodCode = c => (c && /^\d{8,14}$/.test(c) ? c : null);
  const decodeImage = async file => {
    const bmp = await createImageBitmap(file), det = await detector(); const c = goodCode(await det(bmp)); if (bmp.close) bmp.close(); return c;
  };

  /* Abre la cámara trasera en <video> y llama a onCode(código) cada vez que lee uno. Devuelve stop(). */
  async function startScan(video, onCode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no-camera');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = stream; video.setAttribute('playsinline', ''); video.muted = true; await video.play();
    const det = await detector(); let alive = true, busy = false;
    const tick = async () => {
      if (!alive) return;
      if (!busy && video.readyState >= 2) { busy = true; try { const c = goodCode(await det(video)); if (c && alive) onCode(c); } catch (e) { /* sigue */ } busy = false; }
      if (alive) setTimeout(tick, 150);
    };
    tick();
    return () => { alive = false; stream.getTracks().forEach(t => t.stop()); video.srcObject = null; };
  }

  /* ---------- fecha desde una foto (OCR) ---------- */
  let workerP = null;
  function worker(onProgress) {
    if (workerP) return workerP;
    workerP = (async () => {
      await load('vendor/tesseract.min.js');
      const w = await root.Tesseract.createWorker('eng', 1, {
        workerPath: abs('vendor/worker.min.js'), corePath: abs('vendor'), langPath: abs('vendor/lang'),
        logger: m => { if (onProgress && m.status) onProgress(m); },
      });
      await w.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' });
      return w;
    })().catch(e => { workerP = null; throw e; });
    return workerP;
  }
  function canvasOf(bmp, maxSide, gray) {
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const x = c.getContext('2d', { willReadFrequently: true }); x.filter = gray ? 'grayscale(1) contrast(1.4)' : 'none'; x.drawImage(bmp, 0, 0, c.width, c.height); return c;
  }
  /* Lee la foto a varios tamaños (ayuda con la tipografía de puntos) y devuelve { date, literal, confidence, texts } o null. */
  async function readDate(file, onProgress) {
    const bmp = await createImageBitmap(file), w = await worker(onProgress), texts = [];
    for (const [side, gray] of [[1800, false], [1100, true], [700, true]]) {
      const { data } = await w.recognize(canvasOf(bmp, side, gray)); texts.push(data.text || '');
    }
    if (bmp.close) bmp.close();
    const P = root.DateParser, parsed = texts.map(t => P.parse(t)).filter(Boolean);
    if (!parsed.length) return null;
    const dates = new Set(parsed.map(p => p.date));
    const best = dates.size === 1 ? parsed.sort((a, b) => ({ alta: 0, media: 1, baja: 2 }[a.confidence] - { alta: 0, media: 1, baja: 2 }[b.confidence]))[0] : P.consensus(texts);
    return best ? Object.assign({ texts }, best) : null;
  }

  /* Lee la fecha en vivo: cada ~0,3 s saca un cuadro del video, lo lee y avisa el texto. Devuelve stop(). */
  async function startDateLoop(video, onText, onProgress) {
    const w = await worker(onProgress); let alive = true;
    const loop = async () => {
      if (!alive) return;
      if (video.readyState >= 2 && video.videoWidth) {
        try {
          const k = Math.min(1, 1100 / Math.max(video.videoWidth, video.videoHeight)), c = document.createElement('canvas');
          c.width = Math.round(video.videoWidth * k); c.height = Math.round(video.videoHeight * k);
          const x = c.getContext('2d', { willReadFrequently: true }); x.filter = 'grayscale(1) contrast(1.4)'; x.drawImage(video, 0, 0, c.width, c.height);
          const { data } = await w.recognize(c); if (alive) onText(data.text || '');
        } catch (e) { /* sigue con el próximo cuadro */ }
      }
      if (alive) setTimeout(loop, 300);
    };
    loop();
    return () => { alive = false; };
  }

  /* Agrupa los fragmentos de texto de una página de PDF (cada uno con su posición) en renglones, de arriba hacia abajo. */
  function rowsOfItems(items) {
    const frags = items.filter(i => String(i.str).trim()).map(i => ({ s: String(i.str), x: i.transform[4], y: i.transform[5] })).sort((a, b) => b.y - a.y || a.x - b.x);
    const rows = [];
    for (const f of frags) { const last = rows[rows.length - 1]; if (last && Math.abs(last.y - f.y) < 3) last.f.push(f); else rows.push({ y: f.y, f: [f] }); }
    return rows.map(r => r.f.sort((a, b) => a.x - b.x).map(f => f.s.trim()).join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  }
  /* Renglones de un ticket en PDF: si el PDF trae texto se lee directo (sin OCR); si es una imagen escaneada, se dibuja cada página y se lee con el OCR. */
  async function readPdfLines(file, onProgress) {
    await load('vendor/pdf.min.js');
    root.pdfjsLib.GlobalWorkerOptions.workerSrc = abs('vendor/pdf.worker.min.js');
    const pdf = await root.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise, pages = Math.min(pdf.numPages, 6), out = [];
    for (let n = 1; n <= pages; n++) {
      const page = await pdf.getPage(n), text = await page.getTextContent(), rows = rowsOfItems(text.items);
      if (rows.join('').length >= 40) { out.push(...rows); continue; }
      const vp = page.getViewport({ scale: 2200 / Math.max(page.getViewport({ scale: 1 }).width, 1) }), c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: g, viewport: vp }).promise;
      out.push(...await linesOfCanvas(c, onProgress));
    }
    return out;
  }
  /* Renglones de texto de un ticket (en orden de lectura): modo «bloque uniforme» del OCR, que conserva cada renglón completo. */
  async function linesOfCanvas(canvas, onProgress) {
    const w = await worker(onProgress);
    try {
      await w.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
      const { data } = await w.recognize(canvas);
      return (data.lines || []).map(l => String(l.text || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    } finally {
      await w.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' });   // el modo de siempre, para leer fechas
    }
  }
  async function readLines(file, onProgress) {
    const bmp = await createImageBitmap(file);
    try { return await linesOfCanvas(canvasOf(bmp, 2200, true), onProgress); } finally { if (bmp.close) bmp.close(); }
  }
  const api = { cleanSepaName, startDateLoop, suggest, fromTags, lookup, startScan, decodeImage, readDate, readLines, readPdfLines };
  root.VScan = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
