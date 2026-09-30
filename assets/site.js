// Demo del lector de fechas: versión reducida del parser de la app (DateTextParser.swift).
// Prioriza la fecha que sigue a VTO/VENC/EXP/CAD/"consumir antes" y descarta la de elaboración.
(function () {
  const input = document.getElementById("label-text");
  if (!input) return;
  const lang = document.documentElement.lang.startsWith("en") ? "en" : "es";
  const out = {
    date: document.getElementById("result-date"),
    pill: document.getElementById("result-pill"),
    how: document.getElementById("result-how"),
  };
  const T = {
    es: {
      none: "No encontré una fecha", noneHow: "Probá con otro formato, por ejemplo VTO 14/02/27.",
      today: "Vence hoy", tomorrow: "Vence mañana",
      inDays: (n) => `Vence en ${n} días`, ago: (n) => (n === 1 ? "Vencido hace 1 día" : `Vencido hace ${n} días`),
      marker: (m) => `Tomé la fecha que sigue a “${m}”.`, plain: "Tomé la primera fecha válida del texto.",
      monthOnly: "Solo mes y año: la app usa el último día del mes.",
    },
    en: {
      none: "No date found", noneHow: "Try another format, like EXP 14/02/27.",
      today: "Expires today", tomorrow: "Expires tomorrow",
      inDays: (n) => `Expires in ${n} days`, ago: (n) => (n === 1 ? "Expired 1 day ago" : `Expired ${n} days ago`),
      marker: (m) => `Picked the date after “${m}”.`, plain: "Picked the first valid date in the text.",
      monthOnly: "Month and year only: the app uses the last day of the month.",
    },
  }[lang];

  const MONTHS = {
    ENE: 1, JAN: 1, GEN: 1, JANV: 1, FEB: 2, FEV: 2, FEVR: 2, MAR: 3, MARS: 3, MAR_: 3, MAERZ: 3, MARZ: 3,
    ABR: 4, APR: 4, AVR: 4, AVRIL: 4, MAY: 5, MAI: 5, MAG: 5, MAIO: 5, JUN: 6, JUIN: 6, GIU: 6,
    JUL: 7, JUIL: 7, LUG: 7, AGO: 8, AUG: 8, AOUT: 8, SEP: 9, SET: 9, SEPT: 9, OCT: 10, OKT: 10, OTT: 10, OUT: 10,
    NOV: 11, DIC: 12, DEC: 12, DEZ: 12,
    ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8,
    SEPTIEMBRE: 9, SETIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
    JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, JUNE: 6, JULY: 7, AUGUST: 8, SEPTEMBER: 9,
    OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
  };
  const EXPIRY = /(VTO|VENC(?:IMIENTO)?|VENCE|EXP(?:IRY|IRES)?|CAD(?:UCIDAD)?|BB|BEST\s+BEFORE|USE\s+BY|CONSUMIR\s+ANTES(?:\s+DEL?)?|VAL(?:IDADE)?|DLC|MHD|SCAD(?:ENZA)?)/;
  const MADE = /(ELAB(?:ORADO)?|FAB(?:RICADO)?|PROD|ENV(?:ASADO)?|MFG|LOTE)/;

  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const valid = (y, m, d) => {
    if (y < 100) y += 2000;
    if (y < 2000 || y > 2100 || m < 1 || m > 12) return null;
    const last = new Date(y, m, 0).getDate();
    if (d === null) d = last;
    if (d < 1 || d > last) return null;
    return new Date(y, m - 1, d);
  };

  // Todas las fechas del texto, con su posición.
  function findDates(text) {
    const found = [];
    const push = (re, fn) => { for (const m of text.matchAll(re)) { const r = fn(m); if (r) found.push({ ...r, index: m.index, end: m.index + m[0].length }); } };
    push(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g, (m) => ({ date: valid(+m[1], +m[2], +m[3]) }));
    push(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/g, (m) => ({ date: valid(+m[3], +m[2], +m[1]) }));
    push(/\b(\d{1,2})\s*(?:DE\s+)?([A-Z]{3,10})\.?\s*(?:DE\s+|DEL\s+)?(\d{2,4})\b/g, (m) => {
      const mo = MONTHS[m[2]] || MONTHS[m[2].slice(0, 4)] || MONTHS[m[2].slice(0, 3)];
      return mo ? { date: valid(+m[3], mo, +m[1]) } : null;
    });
    push(/(?<!\d[-/.])\b(\d{1,2})[-/.](\d{4})\b/g, (m) => ({ date: valid(+m[2], +m[1], null), monthOnly: true }));
    // "VTO 04/27": mes/año de 2 dígitos, solo si lo precede una palabra de vencimiento (como en la app).
    push(/(?<!\d[-/.])\b(\d{1,2})[-/.](\d{2})\b(?![-/.]\d)/g, (m) => {
      const before = text.slice(Math.max(0, m.index - 28), m.index);
      return new RegExp(EXPIRY.source + "[^A-Z0-9]*$").test(before)
        ? { date: valid(+m[2], +m[1], null), monthOnly: true } : null;
    });
    push(/\b([A-Z]{3,10})\.?\s+(\d{4})\b/g, (m) => {
      const mo = MONTHS[m[1]] || MONTHS[m[1].slice(0, 3)];
      return mo ? { date: valid(+m[2], mo, null), monthOnly: true } : null;
    });
    // Sin solapamientos: gana la coincidencia más larga.
    return found.filter((f) => f.date)
      .sort((a, b) => a.index - b.index || (b.end - b.index) - (a.end - a.index))
      .filter((f, i, arr) => !arr.slice(0, i).some((g) => f.index < g.end && g.index < f.end));
  }

  function parse(raw) {
    // "O" leída en lugar de "0" entre dígitos, como corrige la app.
    const text = fold(raw).replace(/(\d)O|O(\d)/g, (m, a, b) => (a ? a + "0" : "0" + b));
    const dates = findDates(text);
    if (!dates.length) return null;
    for (const d of dates) {
      const before = text.slice(Math.max(0, d.index - 28), d.index);
      const marker = before.match(new RegExp(EXPIRY.source + "[^A-Z0-9]*$"));
      if (marker) return { ...d, marker: marker[1].replace(/\s+/g, " ") };
    }
    const madeRight = new RegExp(MADE.source + "[^A-Z0-9]*$");
    const notMade = dates.filter((d) => !madeRight.test(text.slice(Math.max(0, d.index - 16), d.index)));
    return { ...(notMade[0] || dates[0]), marker: null };
  }

  const locale = lang === "es" ? "es-AR" : "en-US";
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function render() {
    const r = parse(input.value);
    out.pill.className = "pill";
    if (!r) {
      out.date.textContent = T.none;
      out.pill.textContent = "—";
      out.pill.classList.add("none");
      out.how.textContent = T.noneHow;
      return;
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((r.date - today) / 86400000);
    out.date.textContent = fmt.format(r.date);
    out.pill.textContent = days < 0 ? T.ago(-days) : days === 0 ? T.today : days === 1 ? T.tomorrow : T.inDays(days);
    out.pill.classList.add(days < 0 ? "expired" : days <= 15 ? "soon" : "ok");
    out.how.textContent = (r.marker ? T.marker(r.marker) : T.plain) + (r.monthOnly ? " " + T.monthOnly : "");
  }

  input.addEventListener("input", render);
  document.querySelectorAll("[data-sample]").forEach((b) =>
    b.addEventListener("click", () => { input.value = b.dataset.sample; render(); input.focus(); }));
  render();
})();
