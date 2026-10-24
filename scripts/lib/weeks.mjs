// ISO-8601 week helpers. Everything is UTC; a week runs Monday 00:00 to the next Monday 00:00.
const DAY = 86400000;

export const now = () => (process.env.BUILD_LOG_NOW ? new Date(process.env.BUILD_LOG_NOW) : new Date());

export function weekStart(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY);
}

export function weekLabel(date) {
  const thursday = new Date(weekStart(date).getTime() + 3 * DAY);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const n = Math.floor((thursday.getTime() - jan1) / (7 * DAY)) + 1;
  return `${year}-W${String(n).padStart(2, '0')}`;
}

export const WEEK_RE = /^(\d{4})-W(\d{2})$/;

export function weekRange(label) {
  const m = WEEK_RE.exec(label);
  if (!m) throw new Error(`bad week label: ${label}`);
  const year = Number(m[1]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const start = new Date(weekStart(jan4).getTime() + (Number(m[2]) - 1) * 7 * DAY);
  if (weekLabel(start) !== label) throw new Error(`no such ISO week: ${label}`);
  return { start, end: new Date(start.getTime() + 7 * DAY) };
}

export const addWeeks = (label, n) => weekLabel(new Date(weekRange(label).start.getTime() + n * 7 * DAY + DAY));

export const currentWeek = (at = now()) => weekLabel(at);
export const lastCompletedWeek = (at = now()) => weekLabel(new Date(weekStart(at).getTime() - DAY));

/** Inclusive list of week labels from a to b. */
export function weeksBetween(a, b) {
  const out = [];
  for (let w = a; w <= b; w = addWeeks(w, 1)) out.push(w);
  return out;
}

export const isoDay = (d) => d.toISOString().slice(0, 10);

/** 'current' | 'last' | 'YYYY-Www' -> week label */
export function resolveWeek(arg, at = now()) {
  if (!arg || arg === 'last') return lastCompletedWeek(at);
  if (arg === 'current') return currentWeek(at);
  weekRange(arg);
  return arg;
}
