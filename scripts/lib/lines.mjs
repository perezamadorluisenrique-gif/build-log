// Weekly entry lines, generated from data with plain templates (no LLM). Each line exists in EN and ES.
import { esc, num, plural as pl } from './html.mjs';

const a = (href, text) => (href ? `<a href="${esc(href)}">${esc(text)}</a>` : esc(text));
const tagText = (tag) => (/^\d/.test(tag) ? `v${tag}` : tag);
const list = (xs, lang) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${lang === 'en' ? 'and' : 'y'} ${xs[xs.length - 1]}`);

const T = {
  en: {
    release: (p) => `Shipped ${esc(tagText(p.tag))} of ${esc(p.repo)} (${a(p.url, 'notes')})`,
    moreReleases: (p) => `+${p.n} more ${pl(p.n, 'release', 'releases')} this week`,
    newRepos: (p) => `${p.n} new ${pl(p.n, 'repo', 'repos')}: ${list(p.names.map(esc), 'en')}`,
    commits: (p, n) => `${n(p.total)} ${pl(p.total, 'commit', 'commits')} across ${n(p.repos)} ${pl(p.repos, 'repo', 'repos')}`,
    days: (p) => `Committed on ${p.days} of 7 days`,
    top: (p, n) => `Most active: ${p.top.map(([r, c]) => `${esc(r)} (${n(c)})`).join(', ')}`,
    streak: (p) => `${p.n} weeks in a row with public commits`,
    downloadsGain: (p, n) => `+${n(p.gain)} downloads across plugins (total ${n(p.total)})`,
    downloadsFlat: (p, n) => `No new plugin downloads (total ${n(p.total)})`,
    downloadsFirst: (p, n) => `Download tracking starts here: ${n(p.total)} in total across ${n(p.plugins)} ${pl(p.plugins, 'plugin', 'plugins')}`,
    topPlugin: (p, n) => `Most downloaded this week: ${esc(p.name)} (+${n(p.gain)})`,
    newPlugins: (p) => `New in the Obsidian directory: ${list(p.names.map(esc), 'en')}`,
    stars: (p, n) => `${p.gain > 0 ? '+' : '−'}${n(Math.abs(p.gain))} ${pl(Math.abs(p.gain), 'star', 'stars')} (total ${n(p.total)})`,
    issues: (p, n) => `Issues: ${n(p.opened)} opened, ${n(p.closed)} closed`,
    lab: (p) => `Hidden Problems Lab: ${p.count} ${pl(p.count, 'app', 'apps')} live${p.fresh.length ? ` (new: ${list(p.fresh.map(esc), 'en')})` : ''}`,
    quiet: () => 'Quiet week: no public commits or releases.',
    cumulative: (p, n) => `${n(p.total)} commits logged since ${esc(p.since)}`,
    weekNo: (p) => `Entry ${p.n} of the log`,
  },
  es: {
    release: (p) => `Publicada ${esc(tagText(p.tag))} de ${esc(p.repo)} (${a(p.url, 'notas')})`,
    moreReleases: (p) => `+${p.n} ${pl(p.n, 'versión', 'versiones')} más esta semana`,
    newRepos: (p) => `${p.n} ${pl(p.n, 'repo nuevo', 'repos nuevos')}: ${list(p.names.map(esc), 'es')}`,
    commits: (p, n) => `${n(p.total)} ${pl(p.total, 'commit', 'commits')} en ${n(p.repos)} ${pl(p.repos, 'repo', 'repos')}`,
    days: (p) => `Commits en ${p.days} de 7 días`,
    top: (p, n) => `Más activo: ${p.top.map(([r, c]) => `${esc(r)} (${n(c)})`).join(', ')}`,
    streak: (p) => `${p.n} semanas seguidas con commits públicos`,
    downloadsGain: (p, n) => `+${n(p.gain)} descargas entre los plugins (total ${n(p.total)})`,
    downloadsFlat: (p, n) => `Sin descargas nuevas de plugins (total ${n(p.total)})`,
    downloadsFirst: (p, n) => `Aquí empieza el registro de descargas: ${n(p.total)} en total entre ${n(p.plugins)} ${pl(p.plugins, 'plugin', 'plugins')}`,
    topPlugin: (p, n) => `Más descargado esta semana: ${esc(p.name)} (+${n(p.gain)})`,
    newPlugins: (p) => `Nuevo en el directorio de Obsidian: ${list(p.names.map(esc), 'es')}`,
    stars: (p, n) => `${p.gain > 0 ? '+' : '−'}${n(Math.abs(p.gain))} ${pl(Math.abs(p.gain), 'estrella', 'estrellas')} (total ${n(p.total)})`,
    issues: (p, n) => `Issues: ${n(p.opened)} abiertos, ${n(p.closed)} cerrados`,
    lab: (p) => `Hidden Problems Lab: ${p.count} ${pl(p.count, 'app publicada', 'apps publicadas')}${p.fresh.length ? ` (nuevas: ${list(p.fresh.map(esc), 'es')})` : ''}`,
    quiet: () => 'Semana tranquila: sin commits ni versiones públicas.',
    cumulative: (p, n) => `${n(p.total)} commits registrados desde ${esc(p.since)}`,
    weekNo: (p) => `Entrada ${p.n} del registro`,
  },
};

/** candidates: [{kind, prio, params}] -> [{en, es}] (max 6, min 3 where honest fillers exist) */
export function buildLines(entry, model) {
  const { snap, delta } = entry;
  const c = [];
  const push = (kind, prio, params) => c.push({ kind, prio, params, order: c.length });
  if (snap) {
    const act = snap.activity;
    const rels = act.releases;
    rels.slice(0, 2).forEach((r) => push('release', 10, { tag: r.tag, repo: r.repo, url: r.url }));
    if (rels.length === 3) push('release', 10, { tag: rels[2].tag, repo: rels[2].repo, url: rels[2].url });
    else if (rels.length > 3) push('moreReleases', 10, { n: rels.length - 2 });
    if (act.new_repos.length) push('newRepos', 7, { n: act.new_repos.length, names: act.new_repos.slice(0, 3).map((r) => r.name) });
    if (act.commits.total) {
      push('commits', 8, { total: act.commits.total, repos: Object.keys(act.commits.by_repo).length });
      push('days', 2, { days: act.commits.days_active });
      push('top', 2, { top: Object.entries(act.commits.by_repo).slice(0, 3) });
      if (entry.streak >= 2) push('streak', 6, { n: entry.streak });
    }
    const st = snap.state;
    if (st) {
      if (delta) {
        if (delta.downloads > 0) push('downloadsGain', 9, { gain: delta.downloads, total: st.plugin_totals.downloads });
        else push('downloadsFlat', 5, { total: st.plugin_totals.downloads });
        const best = Object.entries(delta.gains).sort((x, y) => y[1] - x[1])[0];
        if (best && best[1] > 0) push('topPlugin', 5, { name: st.plugins[best[0]].name, gain: best[1] });
        if (delta.newPlugins.length) push('newPlugins', 8, { names: delta.newPlugins.map((id) => st.plugins[id].name) });
        if (delta.stars) push('stars', 4, { gain: delta.stars, total: st.repos.stars });
      } else if (st.plugin_totals.count) {
        push('downloadsFirst', 9, { total: st.plugin_totals.downloads, plugins: st.plugin_totals.count });
      }
      if (st.lab.apps.length && (!delta || delta.newApps.length)) push('lab', 4, { count: st.lab.apps.length, fresh: delta ? delta.newApps : [] });
    }
    if (act.issues && (act.issues.opened || act.issues.closed)) push('issues', 3, act.issues);
    if (!act.commits.total && !act.releases.length) push('quiet', 11, {});
  }
  let chosen = c.sort((x, y) => y.prio - x.prio || x.order - y.order).slice(0, 6);
  if (chosen.length < 3) chosen.push({ kind: 'cumulative', prio: 0, order: 98, params: { total: entry.cumCommits, since: model.firstWeek } });
  if (chosen.length < 3) chosen.push({ kind: 'weekNo', prio: 0, order: 99, params: { n: entry.index } });
  chosen = chosen.sort((x, y) => x.order - y.order);
  return chosen.map(({ kind, params }) => ({
    kind,
    en: T.en[kind](params, (v) => num(v, 'en')),
    es: T.es[kind](params, (v) => num(v, 'es')),
  }));
}
