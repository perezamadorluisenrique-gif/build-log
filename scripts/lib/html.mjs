// Small HTML helpers. Bilingual text is emitted as two spans; CSS shows the one matching <html data-lang>.
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Both languages at once. Arguments are already-escaped HTML. */
export const bi = (en, es) => `<span lang="en">${en}</span><span lang="es">${es}</span>`;

export const nf = {
  en: new Intl.NumberFormat('en', { useGrouping: 'always' }),
  es: new Intl.NumberFormat('es-ES', { useGrouping: 'always' }),
};
export const num = (n, lang) => nf[lang].format(n);
/** Same number in both languages: "4,880" / "4.880". */
export const biNum = (n) => bi(num(n, 'en'), num(n, 'es'));

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
};
export function dateText(d, lang, withYear = true) {
  const x = new Date(d);
  const day = x.getUTCDate();
  const m = MONTHS[lang][x.getUTCMonth()];
  return lang === 'en' ? `${m} ${day}${withYear ? `, ${x.getUTCFullYear()}` : ''}` : `${day} ${m}${withYear ? ` ${x.getUTCFullYear()}` : ''}`;
}
export const biDate = (d, withYear = true) => bi(dateText(d, 'en', withYear), dateText(d, 'es', withYear));

export const plural = (n, one, many) => (n === 1 ? one : many);

/** Block-level variant for content that contains paragraphs and lists. */
export const biBlock = (en, es, cls = '') => `<div lang="en"${cls ? ` class="${cls}"` : ''}>${en}</div><div lang="es"${cls ? ` class="${cls}"` : ''}>${es}</div>`;
