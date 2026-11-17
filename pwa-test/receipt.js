/* Ticket de compra para Vencito (web): lee los renglones que devuelve el OCR y los pasa a productos con un vencimiento estimado.
   Port de PurchaseReceipt (iOS y Android): ticket común de una línea por producto, con la cantidad aparte, con el código de barras, y los
   formatos de Día, Walmart (México y EE. UU.), Target, TJ Maxx y Mercadona. No se guarda nada de los datos personales del ticket. */
(function (root) {
  'use strict';
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Mn}+/gu, '');

  /* ---------- líneas que no son productos ---------- */
  const IGNORED = ['total', 'subtotal', 'iva', 'cuit', 'efectivo', 'tarjeta', 'visa', 'master', 'debito', 'credito', 'cambio', 'vuelto', 'ahorro', 'descuento', 'factura',
    'ticket', 'fecha', 'cajero', 'sucursal', 'caja', 'cliente', 'gracias', 'redondeo', 'pago', 'recibimos', 'suma de', 'su vuelto', 'su pago', 'codigo de', 'cod.', 'cajera',
    'otros tributos', 'otros impuestos'];
  const FISCAL = new Set(['alicuota', 'aliq', 'cf', 'iva', 'neto', 'gravado', 'exento', 'impuesto', 'impuestos', 'percepcion', 'percepciones', 'iibb', 'inscripto', 'consumidor',
    'controlador', 'fiscal', 'comprobante', 'cae', 'importe', 'imponible', 'recargo', 'propina', 'nro', 'cuit', 'cai', 'afip', 'arca', 'indirecto', 'indirectos', 'tributo',
    'tributos', 'regimen', 'transparencia', 'vuelto', 'recibimos', 'cajera', 'ley', 'tot', 'ahorro', 'clubdia', 'contenido', 'referencia', 'electronica', 'defensa',
    'proteccion', 'telefono', 'registro', 'tax', 'debit', 'tend', 'change', 'cash', 'purchase', 'items', 'sold', 'network', 'terminal', 'balance', 'feedback', 'deposit', 'fee',
    'charge', 'mastercard', 'mcard', 'amex', 'american', 'express', 'approval', 'trans', 'auth', 'sales', 'voided', 'entry']);
  function isFiscalLine(name) {
    const f = fold(name);
    if (IGNORED.some(w => f.startsWith(w))) return true;
    return f.split(/[^\p{L}]+/u).some(w => FISCAL.has(w));
  }

  /* ---------- números ---------- */
  /* Formato argentino: "1.859,07" → 1859.07 */
  const number = s => { const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  function isValidGtin(code) {
    if (![8, 12, 13, 14].includes(code.length) || !/^\d+$/.test(code)) return false;
    const d = code.split('').map(Number), check = d.pop();
    const sum = d.reverse().reduce((a, x, i) => a + x * (i % 2 === 0 ? 3 : 1), 0);
    return (10 - sum % 10) % 10 === check;
  }

  /* ---------- nombres ---------- */
  const REPLACEMENTS = [['P.HIGIENICO', 'PAPEL HIGIENICO'], ['SAB.DUL.', 'SABOR DULCE '], ['MC CAIN', 'McCain'], ['A GRANEL', ''], ['PECH.', 'PECHUGA '], ['D/', 'DE '], ['P/', 'PARA '], [' S/H', '']];
  const DROPPED = new Set(['LAT', 'BOT', 'PAQ', 'CJA', 'POT', 'BSA', 'TTB', 'POU', 'EST', 'BLI', 'GAT']);
  const UNITS = { GRM: 'g', ML: 'ml', CC: 'cc', UNI: 'un', LT: 'l', KGR: 'kg' };
  const SMALL = new Set(['de', 'del', 'la', 'el', 'para', 'con', 'y', 'en', 'al']);
  function cleanName(raw) {
    let text = String(raw).toUpperCase();
    for (const [a, b] of REPLACEMENTS) text = text.split(a.toUpperCase()).join(b);
    text = text.replace(/\./g, ' ');
    const tokens = text.split(' ').filter(Boolean), out = [];
    tokens.forEach((tok, i) => {
      if (tok === 'X' && tokens[i + 1] === 'KG') return;
      if (tok === 'KG' && tokens[i - 1] === 'X') return;
      if (DROPPED.has(tok)) return;
      out.push(UNITS[tok] || tok);
    });
    return out.map((w, i) => {
      const lower = w.toLowerCase();
      if (/[a-záéíóúñ]/.test(w)) return w;                       // "McCain"
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join(' ');
  }

  /* ---------- qué es comida ---------- */
  const NON_FOOD_WORDS = ['colg', 'lejia', 'deterg', 'vela', 'cepillo', 'impulsor', 'percarbonato', 'deo', 'rollo', 'prot', 'cierra', 'enj', 'furnish', 'magnet', 'necklace', 'womens',
    'mens', 'casu', 'bolsa', 'hilo', 'panuelo', 'higienic', 'papel', 'servilleta', 'esponja', 'pila', 'lampara', 'film', 'aluminio', 'algodon', 'trapo', 'rejilla'];
  const NON_FOOD_KINDS = new Set(['limpieza', 'perfumeria', 'medicamentos']);
  function makeItem(rawName, qty, suggest) {
    const name = cleanName(rawName), words = fold(name).split(/[^\p{L}]+/u).filter(Boolean);
    const kind = (suggest && suggest(name)) || '';
    const nonFood = words.some(w => NON_FOOD_WORDS.some(n => w.startsWith(n))) || NON_FOOD_KINDS.has(kind);
    return { name, rawName, qty: qty || 1, food: !nonFood, kind: nonFood ? '' : kind, barcode: '', weight: false };
  }

  /* ---------- expresiones ---------- */
  const R = {
    generic: /^(?:(\d+(?:[.,]\d+)?)\s*[xX*]\s*)?([A-Za-zÁÉÍÓÚÑáéíóúñ][^$]*?)\s+\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})[A-Z]?\s*$/,
    vat: /\s*\(\s*\d+(?:[.,]\d+)?\s*%?\s*\)/g,
    qtyLine: /^(\d+(?:[.,]\d+)?)\s*[xX*]\s*\$?\s*\d+(?:\.\d{3})*[.,]\d{2}$/,
    leadingQty: /^(\d+(?:[.,]\d+)?)\s*[xX*]\s*\$?\s*\d+(?:\.\d{3})*[.,]\d{2}\s+(\D.*)$/,
    leadingCode: /^(\d{3,14})\s+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])(.+)$/,
    qtyTotal: /^(\d+(?:[.,]\d+)?)\s*[xX]\s*\$?\s*\d+[.,]\d{2}\s+\$?\s*\d[\d.,]*[A-Z]?$/,
    weight: /^(\d+[.,]\d+)\s*KGS?\b.*$/i,
    barcode: /^\d{8,14}$/,
    priceOnly: /^\$?\s*(?:\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})$/,
    endsWithPrice: /\s\$?\s*(?:\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})[A-Z]?$/,
    us: /^([A-Za-z0-9][A-Za-z0-9 .&'/%-]*?)\s+(\d{11,13})([A-Z]{0,2})(?:\s+[A-Z]{1,2})?(?:\s+(\d+)[ .,](\d{2})(?:\s*[A-Z])?)?$/,
    dept: /^\d{1,3}\s*-\s*([A-Za-z][A-Za-z0-9 .&'/%-]*?)\s+(\d{5,8})\s+\$?(\d+[.,]\d{2})\s*[A-Z]?$/,
    targetFlags: /\s+(?:NF|TFP|TF|FP|T|F)$/,
    date: /^fecha\D{0,12}(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/i,
    mcLine: /^(\d{1,3})\s+(\S.*?)\s+(\d+,\d{2})(?:\s+(\d+,\d{2}))?$/,
    mcNameOnly: /^\d{1,3}\s+([A-Za-zÁÉÍÓÚÑáéíóúñ].*)$/,
    spanishDate: /^(\d{2})\/(\d{2})\/(\d{4})\b/,
  };
  const isoDate = (y, m, d) => { const dt = new Date(y, m - 1, d); return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0') : null; };

  /* ---------- Mercadona: "3 FONT NATURA 8L 0,92 2,76"; los pesables van en dos renglones ---------- */
  function parseMercadona(rows, suggest) {
    const has = (r, w) => fold(r).includes(fold(w));
    if (!rows.some(r => has(r, 'Descripci') && has(r, 'Importe') && has(r, 'Unit'))) return null;
    const items = []; let date = null, started = false, pending = null;
    for (const row of rows) {
      if (!started) {
        if (!date) { const m = R.spanishDate.exec(row); if (m) date = isoDate(+m[3], +m[2], +m[1]); }
        if (has(row, 'Descripci') && has(row, 'Importe')) started = true;
        continue;
      }
      if (/^total/i.test(row)) break;
      const w = R.weight.exec(row);
      if (w) { if (pending) { const it = makeItem(pending, 1, suggest); it.weight = parseFloat(w[1].replace(',', '.')) || 1; items.push(it); } pending = null; continue; }
      pending = null;
      const m = R.mcLine.exec(row);
      if (m) { if (!isFiscalLine(m[2])) items.push(makeItem(m[2], parseFloat(m[1]), suggest)); continue; }
      const n = R.mcNameOnly.exec(row); if (n) pending = n[1];
    }
    if (!items.length) return null;
    return { items, date, store: rows.some(r => has(r, 'MERCADONA')) ? 'Mercadona' : '' };
  }

  /* ---------- ticket común y los formatos con código ---------- */
  function parseGeneric(rows, suggest) {
    const items = [], usIndex = {};
    let date = null, pendingQty = null, pendingName = null, pendingCode = null, voided = false;
    // Un precio suelto va con el renglón de arriba si ese todavía no tiene precio (el OCR de una foto inclinada separa nombre y precio).
    const joined = [];
    for (const row of rows) {
      if (R.priceOnly.test(row) && joined.length && !R.endsWithPrice.test(joined[joined.length - 1]) && /\p{L}/u.test(joined[joined.length - 1])) joined[joined.length - 1] += ' ' + row;
      else joined.push(row);
    }
    const withCode = (it, code) => { if (code && isValidGtin(code)) it.barcode = code; return it; };
    const commit = qty => {
      if (pendingName == null) return;
      const name = pendingName.replace(R.vat, '').trim(), code = pendingCode; pendingName = null; pendingCode = null;
      if (name.length < 3 || isFiscalLine(name)) return;
      const it = withCode(makeItem(name, qty, suggest), code); if (qty % 1) { it.qty = 1; it.weight = qty; } items.push(it);
    };
    for (let row of joined) {
      if (/voided/i.test(row)) { voided = true; pendingName = null; continue; }
      if (pendingName != null) {
        let m = R.qtyTotal.exec(row); if (m) { commit(number(m[1]) || 1); continue; }
        m = R.weight.exec(row); if (m) { commit(parseFloat(m[1].replace(',', '.')) || 1); continue; }
        if ((pendingCode || '').length >= 8) commit(1); else { pendingName = null; pendingCode = null; }
      }
      if (!date) { const m = R.date.exec(row); if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; date = isoDate(y, +m[2], +m[1]); } }
      let m = R.qtyLine.exec(row); if (m) { pendingQty = number(m[1]); continue; }
      m = R.leadingQty.exec(row); if (m) { pendingQty = number(m[1]); row = m[2]; }
      // TJ Maxx: "20 - MEN'S FURNISHI 264917 $9.99 N"
      m = R.dept.exec(row);
      if (m && m[1].trim().length >= 3 && !isFiscalLine(m[1])) { items.push(makeItem(m[1].trim(), 1, suggest)); pendingQty = null; continue; }
      // Walmart EE. UU.: "LAYS 002840019963 F 2 68 N"
      const us = R.us.exec(row);
      if (us && us[1].trim().length >= 3 && !isFiscalLine(us[1].trim())) {
        const nm = us[1].trim();
        if (voided) {
          voided = false;
          const at = usIndex[nm];
          if (at != null) { if (items[at].qty - 1 >= 1) items[at].qty -= 1; else { items.splice(at, 1); delete usIndex[nm]; Object.keys(usIndex).forEach(k => { if (usIndex[k] > at) usIndex[k] -= 1; }); } }
          continue;
        }
        if (!us[4]) { pendingName = nm; pendingCode = us[2]; }       // el importe viene en el renglón de abajo (peso)
        else if (usIndex[nm] != null) items[usIndex[nm]].qty += 1;
        else { usIndex[nm] = items.length; items.push(withCode(makeItem(nm, 1, suggest), us[2])); }
        continue;
      }
      // Código de barras suelto debajo del renglón (Día)
      if (R.barcode.test(row)) { const last = items[items.length - 1]; if (last && !last.barcode && isValidGtin(row)) last.barcode = row; continue; }
      // Código al principio del renglón (Walmart México, Target)
      let code = null; const lc = R.leadingCode.exec(row); if (lc) { code = lc[1]; row = lc[2]; }
      const g = R.generic.exec(row);
      if (!g) { if (code && (row.match(/\p{L}/gu) || []).length >= 3 && !R.endsWithPrice.test(row)) { pendingName = row.trim(); pendingCode = code; } continue; }
      let name = g[2].replace(R.vat, '').trim();
      if (code && code.length === 9) name = name.replace(R.targetFlags, '');       // Target: «NF», «TFP»…
      if (name.length < 3 || isFiscalLine(name)) { pendingQty = null; continue; }
      const qty = g[1] ? number(g[1]) : (pendingQty || 1); pendingQty = null;
      items.push(withCode(makeItem(name, qty, suggest), code));
    }
    if (pendingName != null && (pendingCode || '').length >= 8) commit(1);
    return { items, date, store: storeName(rows) };
  }
  /* El nombre del comercio: la primera línea de arriba con letras que no sea un dato fiscal. */
  function storeName(rows) {
    const r = rows.slice(0, 6).find(x => (x.match(/\p{L}/gu) || []).length >= 3 && !/cuit|ticket|factura/i.test(fold(x)));
    return r ? r.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
  }

  /* rows: renglones de texto en orden de lectura */
  function parse(rows, suggest) {
    const clean = (rows || []).map(r => String(r).replace(/\s+/g, ' ').trim()).filter(Boolean);
    return parseMercadona(clean, suggest) || parseGeneric(clean, suggest);
  }

  /* ---------- vencimiento y lugar estimados por tipo de producto ---------- */
  function estimate(item) {
    const raw = ' ' + fold(item.rawName) + ' ', name = fold(item.name), has = (...ws) => ws.some(w => name.includes(w));
    if (raw.includes(' lat ')) return { days: 730, place: 'Alacena' };
    switch (item.kind) {
      case 'congelados': return { days: 90, place: 'Freezer' };
      case 'carnes': return { days: has('jamon', 'salame', 'panceta', 'feteado', 'fiambre', 'mortadela') ? 10 : 3, place: 'Heladera' };
      case 'lacteos':
        if (raw.includes(' ttb ') || raw.includes(' tetra ') || has('larga vida')) return { days: 120, place: 'Alacena' };
        if (has('grana', 'parmesano', 'reggiano', 'rallado', 'sardo')) return { days: 60, place: 'Heladera' };
        return { days: has('crema') ? 21 : 14, place: 'Heladera' };
      case 'verduras': case 'frutas': return has('papa', 'cebolla', 'zapallo', 'batata', 'ajo', 'zanahoria') ? { days: 30, place: 'Alacena' } : { days: 7, place: 'Heladera' };
      case 'bebidas': return { days: 180, place: 'Alacena' };
      case 'condimentos': return { days: 365, place: 'Alacena' };
      case 'almacen': return { days: 270, place: 'Alacena' };
      case 'panificados': return has('tapa') ? { days: 15, place: 'Heladera' } : has('galleta', 'tostada', 'bizcocho', 'grisin') ? { days: 90, place: 'Alacena' } : { days: 5, place: 'Alacena' };
      default: return { days: 30, place: 'Alacena' };
    }
  }

  const api = { parse, parseMercadona, parseGeneric, estimate, cleanName, isValidGtin, isFiscalLine, makeItem, number };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VReceipt = api;
})(typeof window !== 'undefined' ? window : globalThis);
