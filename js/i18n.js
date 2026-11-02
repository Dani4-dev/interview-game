/*
 * Минимальная система локализации.
 *
 * Добавить язык:
 *   1. создать locales/xx.js по образцу locales/en.js:
 *        I18n.register('xx', { 'ui.title': '...', ... }, { name: 'Название языка' });
 *   2. подключить файл в index.html после других словарей.
 *   Язык появится в выпадающем списке автоматически.
 *
 * Ключи плоские ("ui.start"), параметры подставляются как {name}.
 * Если ключа нет в текущем языке, берётся запасной язык (fallback), затем сам ключ.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'interview.lang';
  const locales = {};
  const listeners = [];
  const warned = new Set();
  let current = 'en';
  let fallback = 'en';

  function interpolate(str, params) {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
  }

  const I18n = {
    register(code, dict, meta) {
      locales[code] = { dict: dict, name: (meta && meta.name) || code };
    },

    available() {
      return Object.keys(locales).map((code) => ({ code: code, name: locales[code].name }));
    },

    has(code) { return Object.prototype.hasOwnProperty.call(locales, code); },

    get lang() { return current; },

    setFallback(code) { fallback = code; },

    t(key, params) {
      const cur = locales[current];
      const fb = locales[fallback];
      let s = cur ? cur.dict[key] : undefined;
      if (s === undefined && fb) s = fb.dict[key];
      if (s === undefined) {
        if (!warned.has(key)) { warned.add(key); console.warn('[i18n] нет перевода для ключа:', key); }
        return key;
      }
      return interpolate(s, params);
    },

    /** Ключи из списка, которых нет в словаре языка code */
    missing(keys, code) {
      const l = locales[code];
      if (!l) return keys.slice();
      return keys.filter((k) => !(k in l.dict));
    },

    /** Определяет язык: ?lang=xx, сохранённый выбор, язык браузера, иначе defaultCode */
    detect(defaultCode) {
      const q = new URLSearchParams(global.location.search).get('lang');
      if (q && this.has(q)) return q;
      try {
        const saved = global.localStorage.getItem(STORAGE_KEY);
        if (saved && this.has(saved)) return saved;
      } catch (e) { /* localStorage может быть недоступен */ }
      const langs = global.navigator.languages || [global.navigator.language];
      for (const l of langs) {
        const short = String(l || '').slice(0, 2).toLowerCase();
        if (this.has(short)) return short;
      }
      return this.has(defaultCode) ? defaultCode : fallback;
    },

    setLang(code) {
      if (!this.has(code)) code = fallback;
      current = code;
      document.documentElement.lang = code;
      try { global.localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* ignore */ }
      this.apply();
      listeners.forEach((fn) => fn(code));
    },

    onChange(fn) { listeners.push(fn); },

    /** Переводит статичные элементы с data-i18n="ключ" */
    apply(root) {
      (root || document).querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = this.t(el.getAttribute('data-i18n'));
      });
    }
  };

  global.I18n = I18n;
})(window);
