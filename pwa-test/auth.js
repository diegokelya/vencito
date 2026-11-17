/* Cuenta de Vencito (Supabase Auth por HTTP, sin SDK). Mismo contrato que SupabaseClient de iOS y Android.
   Por ahora solo inicia sesión: no sincroniza datos. Oculto tras una bandera: se activa con ?cuenta=1 (queda guardado en este navegador) y se apaga con ?cuenta=0.
   La clave publishable es pública por diseño: la seguridad la dan las políticas RLS del servidor. */
(function (root) {
  'use strict';
  const URL_BASE = 'https://abigwboqcgtrleggqcqo.supabase.co';
  const KEY = 'sb_publishable_kFPBhFgP6qGd2FGW_qC1hQ_lJYESSuq';
  const SESSION_LS = 'vencito.pwa.session', FLAG_LS = 'vencito.pwa.cuenta';

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
  };
  let session = null;
  try { session = JSON.parse(store.get(SESSION_LS)); } catch (e) { session = null; }

  function enabled() {
    try {
      const q = new URLSearchParams(root.location && root.location.search).get('cuenta');
      if (q === '1') store.set(FLAG_LS, '1'); else if (q === '0') store.set(FLAG_LS, null);
    } catch (e) {}
    return store.get(FLAG_LS) === '1';
  }

  function message(text) {
    try { const o = JSON.parse(text); return o.msg || o.message || o.error_description || o.error || text.slice(0, 200); } catch (e) { return String(text).slice(0, 200); }
  }

  async function call(path, body) {
    const r = await (root.fetch || fetch)(URL_BASE + path, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    const text = await r.text();
    if (!r.ok) { const e = new Error(message(text)); e.status = r.status; throw e; }
    return text;
  }

  function adopt(text) {
    let o; try { o = JSON.parse(text); } catch (e) { return false; }
    if (!o.access_token) return false;
    const u = o.user || {};
    session = { a: o.access_token, r: o.refresh_token || '', u: u.id || (session && session.u) || '', e: u.email || (session && session.e) || '' };
    store.set(SESSION_LS, JSON.stringify(session));
    return true;
  }

  /** Entra con correo y contraseña; con create crea la cuenta. Devuelve false si falta confirmar el correo (todavía no hay sesión). */
  async function signInWithEmail(email, password, create) {
    const body = { email: String(email).trim(), password };
    const text = await call(create ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password', body);
    if (adopt(text)) return true;
    let o = {}; try { o = JSON.parse(text); } catch (e) {}
    if (create && (o.id || o.email)) return false;
    throw new Error('respuesta inesperada');
  }

  /** Renueva la sesión con el refresh token; si el servidor la rechaza, la cierra. */
  async function refresh() {
    if (!session || !session.r) return false;
    try { return adopt(await call('/auth/v1/token?grant_type=refresh_token', { refresh_token: session.r })); }
    catch (e) { if (e.status && e.status < 500) signOut(); return false; }
  }

  function signOut() { session = null; store.set(SESSION_LS, null); }

  root.VAuth = { enabled, signInWithEmail, refresh, signOut, email: () => (session && session.e) || null, signedIn: () => !!session };
  if (typeof module !== 'undefined') module.exports = root.VAuth;
})(typeof window !== 'undefined' ? window : globalThis);
