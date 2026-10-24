// Hand-rolled validation for data/YYYY-Www.json (schema version 1). Returns a list of problems; [] means valid.
import { WEEK_RE } from './weeks.mjs';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isInt = (v) => Number.isInteger(v) && v >= 0;
const isStr = (v) => typeof v === 'string' && v.length > 0;
const isDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

export function validateSnapshot(s, filename) {
  const e = [];
  const need = (cond, msg) => { if (!cond) e.push(msg); };
  if (!isObj(s)) return ['snapshot is not an object'];
  need(s.schema === 1, 'schema must be 1');
  need(isStr(s.week) && WEEK_RE.test(s.week), 'week must look like 2026-W43');
  if (filename) need(`${s.week}.json` === filename, `file name ${filename} does not match week ${s.week}`);
  need(s.source === 'weekly' || s.source === 'backfill', 'source must be weekly or backfill');
  need(isStr(s.user), 'user missing');
  need(isDate(s.captured_at), 'captured_at must be an ISO date');
  need(typeof s.partial === 'boolean', 'partial must be boolean');
  need(isObj(s.range) && isDate(s.range.start) && isDate(s.range.end), 'range.start/end must be ISO dates');
  need(Array.isArray(s.errors) && s.errors.every((x) => typeof x === 'string'), 'errors must be a string array');

  const a = s.activity;
  if (!isObj(a)) e.push('activity missing');
  else {
    need(isObj(a.commits) && isInt(a.commits.total) && isInt(a.commits.days_active) && isObj(a.commits.by_repo), 'activity.commits needs total, days_active, by_repo');
    if (isObj(a.commits) && isObj(a.commits.by_repo)) {
      const sum = Object.values(a.commits.by_repo).reduce((x, y) => x + y, 0);
      need(sum === a.commits.total, `activity.commits.by_repo sums to ${sum}, total says ${a.commits.total}`);
    }
    need(Array.isArray(a.releases) && a.releases.every((r) => isObj(r) && isStr(r.repo) && isStr(r.tag) && isDate(r.date) && typeof r.url === 'string'), 'activity.releases entries need repo, tag, date, url');
    need(Array.isArray(a.new_repos) && a.new_repos.every((r) => isObj(r) && isStr(r.name) && isDate(r.created_at)), 'activity.new_repos entries need name, created_at');
    need(a.issues === null || (isObj(a.issues) && isInt(a.issues.opened) && isInt(a.issues.closed)), 'activity.issues must be null or {opened, closed}');
  }

  if (s.source === 'backfill') need(s.state === null, 'backfill snapshots must have state: null (no history of stars or downloads exists)');
  else need(s.state === null || isObj(s.state), 'state must be an object or null');
  const st = s.state;
  if (isObj(st)) {
    need(isObj(st.repos) && isInt(st.repos.count) && isInt(st.repos.stars) && isInt(st.repos.open_issues), 'state.repos needs count, stars, open_issues');
    need(Array.isArray(st.projects) && st.projects.every((p) => isObj(p) && isStr(p.name) && isStr(p.url) && isInt(p.stars)), 'state.projects entries need name, url, stars');
    need(isObj(st.plugins) && Object.values(st.plugins).every((p) => isObj(p) && isStr(p.name) && isStr(p.repo) && (p.downloads === null || isInt(p.downloads))), 'state.plugins entries need name, repo, downloads');
    need(isObj(st.plugin_totals) && isInt(st.plugin_totals.downloads) && isInt(st.plugin_totals.count), 'state.plugin_totals needs downloads, count');
    need(isObj(st.lab) && Array.isArray(st.lab.apps) && st.lab.apps.every((x) => isObj(x) && isStr(x.name) && /^https?:\/\//.test(x.url)), 'state.lab.apps entries need name and http(s) url');
  }
  return e;
}
