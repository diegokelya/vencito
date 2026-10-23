/* Extrae una fecha de vencimiento de texto leído por OCR. Port de DateTextParser (iOS/Android):
   DD/MM/AA, AAAA-MM-DD, "25 AGO 2026", "AGO 2026", "08/2027", meses en seis idiomas y prioridad
   a las fechas precedidas por VTO/VENC/EXP sobre las de elaboración. */
(function (root) {
  'use strict';
  const MONTHS = [
    ['ENERO', 'ENE', 'JANUARY', 'JAN', 'JANEIRO', 'JANVIER', 'JANV', 'GENNAIO', 'GEN', 'JANUAR'],
    ['FEBRERO', 'FEB', 'FEBRUARY', 'FEVEREIRO', 'FEV', 'FEVRIER', 'FEVR', 'FEBBRAIO', 'FEBRUAR'],
    ['MARZO', 'MAR', 'MARCH', 'MARCO', 'MARS', 'MARZ', 'MRZ'],
    ['ABRIL', 'ABR', 'APRIL', 'APR', 'AVRIL', 'AVR', 'APRILE'],
    ['MAYO', 'MAY', 'MAIO', 'MAI', 'MAGGIO', 'MAG'],
    ['JUNIO', 'JUN', 'JUNE', 'JUNHO', 'JUIN', 'GIUGNO', 'GIU', 'JUNI'],
    ['JULIO', 'JUL', 'JULY', 'JULHO', 'JUILLET', 'JUIL', 'LUGLIO', 'LUG', 'JULI'],
    ['AGOSTO', 'AGO', 'AUGUST', 'AUG', 'AOUT', 'AOU'],
    ['SEPTIEMBRE', 'SETIEMBRE', 'SEPTEMBER', 'SEPT', 'SEP', 'SET', 'SETEMBRO', 'SETTEMBRE', 'SETT'],
    ['OCTUBRE', 'OCT', 'OCTOBER', 'OUTUBRO', 'OUT', 'OCTOBRE', 'OTTOBRE', 'OTT', 'OKTOBER', 'OKT'],
    ['NOVIEMBRE', 'NOV', 'NOVEMBER', 'NOVEMBRO', 'NOVEMBRE'],
    ['DICIEMBRE', 'DIC', 'DECEMBER', 'DEC', 'DEZEMBRO', 'DEZ', 'DECEMBRE', 'DICEMBRE', 'DEZEMBER'],
  ];
  const byName = {};
  MONTHS.forEach((names, i) => names.forEach(n => { byName[n] = i + 1; }));
  const monthNames = Object.keys(byName).sort((a, b) => b.length - a.length || (a < b ? 1 : -1));

  const EXPIRY_KW = ['VTO', 'V.T.O', 'VENC', 'VENCE', 'EXP', 'CAD', 'CONSUM', 'BEST', 'USE BY', 'BB', 'F.V', 'FV', 'VALID', 'VAL.', 'VAL:', 'SCAD', 'PREFERIBILMENTE', 'CONSOMM', 'DLC', 'DDM', 'DLUO', 'MHD', 'HALTBAR', 'VERBRAUCH', 'ABLAUF'];
  const MFG_KW = ['ELAB', 'FAB', 'ENV.', 'ENVAS', 'PROD', 'MFG', 'MFD', 'PKD', 'CONFEZ', 'HERGEST', 'ABGEF'];
  const EXPIRY = 'e', MFG = 'm', NONE = 'n';

  const sep = '[/\\-.]';
  const month = '(' + monthNames.join('|') + ')\\.?(?![A-Z])';
  const gap = '[ /\\-.]*(?:DE +)?';
  const RULES = [
    ['YMD', '(?<!\\d)(\\d{4}) ?' + sep + ' ?(\\d{1,2}) ?' + sep + ' ?(\\d{1,2})(?!\\d)'],
    ['DMY', '(?<!\\d)(\\d{1,2}) ?' + sep + ' ?(\\d{1,2}) ?' + sep + ' ?(\\d{4}|\\d{2})(?!\\d)'],
    ['YMD_SHORT', '(?<!\\d)(\\d{2}) ?' + sep + ' ?(\\d{1,2}) ?' + sep + ' ?(\\d{1,2})(?!\\d)'],
    ['D_MON_Y', '(?<!\\d)(\\d{1,2})' + gap + month + gap + '(\\d{4}|\\d{2})(?!\\d)'],
    ['MON_D_Y', '(?<![A-Z])' + month + ' *(\\d{1,2})(?:, *| +)(\\d{4}|\\d{2})(?!\\d)'],
    ['MON_Y', '(?<![A-Z])' + month + gap + '(\\d{4}|\\d{2})(?!\\d)'],
    ['M_Y', '(?<![\\d/\\-.])(\\d{1,2}) ?' + sep + ' ?(\\d{4})(?![\\d/\\-.])'],
    ['YM', '(?<![\\d/\\-.])(\\d{4}) ?' + sep + ' ?(\\d{1,2})(?![\\d/\\-.])'],
    ['M_Y_SHORT', '(?<![\\d/\\-.])(\\d{1,2}) ?' + sep + ' ?(\\d{2})(?![\\d/\\-.])'],
    ['DMY_SPACED', '(?<!\\d)(\\d{1,2}) +(\\d{1,2}) +(\\d{4}|\\d{2})(?!\\d)'],
    ['COMPACT8', '(?<!\\d)(\\d{8})(?!\\d)'],
    ['COMPACT6', '(?<!\\d)(\\d{6})(?!\\d)'],
    ['M_Y_SPACED', '(?<!\\d)(\\d{1,2}) +(\\d{4})(?!\\d)'],
    ['M_Y_SHORT_SPACED', '(?<!\\d)(\\d{1,2}) +(\\d{2})(?!\\d)'],
  ].map(([k, p]) => [k, new RegExp(p, 'g')]);

  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const year = s => { const n = parseInt(s, 10); return n < 100 ? n + 2000 : n; };
  const pad = n => String(n).padStart(2, '0');
  const isoOf = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);
  const addYears = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoOf(y + n, m, Math.min(d, new Date(y + n, m, 0).getDate())); };
  const lastOf = (y, m) => new Date(y, m, 0).getDate();

  /* Sin día (mes/año) se usa el último día del mes. Devuelve 'AAAA-MM-DD' o null. */
  function makeDate(y, m, d) {
    if (!(m >= 1 && m <= 12) || !(y >= 1900 && y <= 2200)) return null;
    const last = lastOf(y, m), day = d == null ? last : d;
    if (!(day >= 1 && day <= last)) return null;
    return isoOf(y, m, day);
  }
  function normalize(s) {
    let t = s.normalize('NFD').replace(/\p{Mn}+/gu, '').toUpperCase();
    t = t.replace(/(?<=[\d/\-.])O(?=\d)|(?<=\d)O(?=[\d/\-.])/g, '0');
    t = t.replace(/(?<=\d)[IL|](?=\d)/g, '1');
    t = t.replace(/(?<![A-Z0-9])[IL|](?=\d{1,2}[/\-.]\d{1,2}[/\-.]\d)/g, '1');
    return t;
  }
  const lastOffset = (s, kws) => { let best = null; kws.forEach(k => { const i = s.lastIndexOf(k); if (i >= 0 && (best == null || i > best)) best = i; }); return best; };
  function classify(s) {
    const e = lastOffset(s, EXPIRY_KW), m = lastOffset(s, MFG_KW);
    if (e == null && m == null) return NONE;
    if (m == null) return EXPIRY;
    if (e == null) return MFG;
    return e >= m ? EXPIRY : MFG;
  }
  function context(loc, text) {
    const lineStart = text.lastIndexOf('\n', loc - 1) + 1;
    const r = classify(text.substring(Math.max(lineStart, loc - 40), loc));
    if (r !== NONE || lineStart === 0) return r;
    // El OCR a veces separa "VTO:" y la fecha en dos líneas.
    const prevStart = text.lastIndexOf('\n', lineStart - 2) + 1;
    const prev = text.substring(prevStart, lineStart - 1).trim();
    return prev.length <= 16 ? classify(prev) : NONE;
  }
  function directlyAfterKeyword(loc, text) {
    const prefix = text.substring(Math.max(0, loc - 16), loc);
    return EXPIRY_KW.some(k => new RegExp(esc(k) + '[ :.\\-\\s]*$').test(prefix));
  }

  /* today: 'AAAA-MM-DD' (para pruebas). Devuelve { date:'AAAA-MM-DD', literal, confidence:'alta'|'media'|'baja' } o null. */
  function parse(raw, today) {
    const text = normalize(String(raw || ''));
    if (!today) { const n = new Date(); today = isoOf(n.getFullYear(), n.getMonth() + 1, n.getDate()); }
    const minDate = addYears(today, -5), maxDate = addYears(today, 15);
    const taken = [], cands = [];
    for (const [kind, re] of RULES) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(text))) {
        if (match[0].length === 0) { re.lastIndex++; continue; }
        const first = match.index, last = match.index + match[0].length - 1;
        if (taken.some(r => r[0] <= last && first <= r[1])) continue;
        const g = i => match[i], num = i => parseInt(match[i], 10);
        const ctx = () => context(first, text);
        let y, m, d = null, skip = false;
        switch (kind) {
          case 'YMD': y = num(1); m = num(2); d = num(3); break;
          case 'DMY': { let a = num(1), b = num(2); if (b > 12 && a <= 12) { const t = a; a = b; b = t; } y = year(g(3)); m = b; d = a; break; }
          case 'YMD_SHORT': if (ctx() !== EXPIRY) skip = true; else { y = year(g(1)); m = num(2); d = num(3); } break;
          case 'MON_D_Y': if (!byName[g(1)]) skip = true; else { y = year(g(3)); m = byName[g(1)]; d = num(2); } break;
          case 'YM': if (ctx() !== EXPIRY) skip = true; else { y = num(1); m = num(2); } break;
          case 'DMY_SPACED': if (!directlyAfterKeyword(first, text)) skip = true; else { y = year(g(3)); m = num(2); d = num(1); } break;
          case 'M_Y_SPACED': if (!directlyAfterKeyword(first, text)) skip = true; else { y = num(2); m = num(1); } break;
          case 'M_Y_SHORT_SPACED': if (!directlyAfterKeyword(first, text)) skip = true; else { y = year(g(2)); m = num(1); } break;
          case 'COMPACT8': {
            if (!directlyAfterKeyword(first, text)) { skip = true; break; }
            const s = g(1), dd = +s.slice(0, 2), mm = +s.slice(2, 4), yyyy = +s.slice(4);
            if (makeDate(yyyy, mm, dd)) { y = yyyy; m = mm; d = dd; } else { y = +s.slice(0, 4); m = +s.slice(4, 6); d = +s.slice(6); }
            break;
          }
          case 'COMPACT6': if (!directlyAfterKeyword(first, text)) skip = true; else { const s = g(1); y = year(s.slice(4)); m = +s.slice(2, 4); d = +s.slice(0, 2); } break;
          case 'D_MON_Y': if (!byName[g(2)]) skip = true; else { y = year(g(3)); m = byName[g(2)]; d = num(1); } break;
          case 'MON_Y': if (!byName[g(1)]) skip = true; else { y = year(g(2)); m = byName[g(1)]; } break;
          case 'M_Y': y = num(2); m = num(1); break;
          case 'M_Y_SHORT': if (ctx() !== EXPIRY) skip = true; else { y = year(g(2)); m = num(1); } break;
        }
        if (skip) continue;
        let date = makeDate(y, m, d);
        if (!date || date > maxDate) continue;
        // Un envase vencido hace más de un año casi siempre es una mala lectura: en la tipografía de puntos el 7 se lee como 1
        // ("23.11.27" sale "23-11-21"). Si con 7 en lugar de 1 la fecha cae en el futuro, se propone esa.
        let repaired = false;
        if (date < addYears(today, -1) && y % 10 === 1) {
          const fixed = makeDate(y + 6, m, d);
          if (fixed && fixed >= today && fixed <= maxDate) { date = fixed; repaired = true; }
        }
        if (date < minDate) continue;
        taken.push([first, last]);
        const ls = text.lastIndexOf('\n', first - 1) + 1, le = (i => (i < 0 ? text.length : i))(text.indexOf('\n', last));
        cands.push({ date, literal: text.substring(ls, le).trim().slice(0, 60), full: d != null, ctx: ctx(), repaired });
      }
    }
    if (!cands.length) return null;
    cands.sort((a, b) => {
      if ((a.ctx === EXPIRY) !== (b.ctx === EXPIRY)) return a.ctx === EXPIRY ? -1 : 1;
      if ((a.ctx === MFG) !== (b.ctx === MFG)) return b.ctx === MFG ? -1 : 1;
      if (a.full !== b.full) return a.full ? -1 : 1;
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
    const best = cands[0];
    const conf = best.ctx === EXPIRY && best.full ? 'alta' : best.ctx === EXPIRY || (cands.length === 1 && best.full) ? 'media' : 'baja';
    return { date: best.date, literal: best.literal, confidence: best.repaired ? 'baja' : conf };
  }

  /* Varias lecturas del mismo texto: gana la fecha que más se repite (confianza baja). */
  function consensus(texts, today) {
    const votes = {};
    texts.forEach(tx => { const p = parse(tx, today); if (!p) return; const v = votes[p.date] || (votes[p.date] = { n: 0, literal: p.literal }); v.n++; });
    const best = Object.entries(votes).sort((a, b) => b[1].n - a[1].n || (a[0] < b[0] ? 1 : -1))[0];
    return best ? { date: best[0], literal: best[1].literal, confidence: 'baja' } : null;
  }

  const api = { parse, consensus };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DateParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
