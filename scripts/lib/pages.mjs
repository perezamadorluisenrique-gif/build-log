import { esc, bi, biBlock, biNum, num, biDate, plural } from './html.mjs';
import { renderMarkdown } from './markdown.mjs';
import { buildLines } from './lines.mjs';
import { lineChart, barChart } from './charts.mjs';

const U = {
  index: ['Timeline', 'Cronología'],
  stats: ['Stats', 'Estadísticas'],
  projects: ['Projects', 'Proyectos'],
  skip: ['Skip to content', 'Saltar al contenido'],
  weeks: ['weeks logged', 'semanas registradas'],
  commits: ['commits logged', 'commits registrados'],
  releases: ['releases logged', 'versiones registradas'],
  downloads: ['plugin downloads', 'descargas de plugins'],
  streak: ['week streak', 'semanas seguidas'],
  note: ['Note', 'Nota'],
  partial: ['partial', 'parcial'],
  backfill: ['rebuilt from git history', 'reconstruida desde el historial de git'],
  json: ['snapshot (JSON)', 'snapshot (JSON)'],
  noSnap: ['No snapshot for this week.', 'No hay snapshot de esta semana.'],
  empty: ['Nothing logged yet. The first entry appears after the next weekly run.', 'Aún no hay nada registrado. La primera entrada aparece tras la próxima ejecución semanal.'],
  footer: ['Built from public GitHub activity and the Obsidian community stats. No tracking, no cookies.', 'Construido con la actividad pública de GitHub y las estadísticas de la comunidad de Obsidian. Sin rastreo ni cookies.'],
  updated: ['Last snapshot', 'Último snapshot'],
  dlTitle: ['Plugin downloads, cumulative', 'Descargas de plugins, acumuladas'],
  dlNote: ['Download history only starts at the first snapshot', 'El historial de descargas solo empieza en el primer snapshot'],
  dlNoteTail: ['; Obsidian publishes totals, not a past series, so nothing earlier can be reconstructed. The chart fills in one point per week.', '; Obsidian publica totales, no una serie pasada, así que no se puede reconstruir nada anterior. La gráfica suma un punto por semana.'],
  dlNone: ['No download snapshot yet.', 'Todavía no hay snapshot de descargas.'],
  top5: ['Top 5 plugins by downloads; the rest are summed.', 'Los 5 plugins con más descargas; el resto se suma.'],
  other: ['Other plugins', 'Otros plugins'],
  table: ['Data table', 'Tabla de datos'],
  plugin: ['Plugin', 'Plugin'],
  total: ['Total', 'Total'],
  week: ['Week', 'Semana'],
  gain: ['This week', 'Esta semana'],
  cwTitle: ['Commits per week', 'Commits por semana'],
  cwNote: ['Commits by me in my public repos, UTC weeks. Weeks without a snapshot are left blank, not counted as zero.', 'Commits míos en mis repos públicos, semanas UTC. Las semanas sin snapshot quedan en blanco, no cuentan como cero.'],
  cwNone: ['No weekly data yet.', 'Todavía no hay datos semanales.'],
  relTitle: ['Releases', 'Versiones'],
  relNote: ['Releases published in the logged weeks (newest first).', 'Versiones publicadas en las semanas registradas (las más nuevas primero).'],
  relNone: ['No releases logged yet.', 'Todavía no hay versiones registradas.'],
  release: ['Release', 'Versión'],
  repo: ['Repo', 'Repo'],
  date: ['Date', 'Fecha'],
  plugins: ['Obsidian plugins', 'Plugins de Obsidian'],
  lab: ['Hidden Problems Lab', 'Hidden Problems Lab'],
  other_repos: ['Other repositories', 'Otros repositorios'],
  noProjects: ['No project data yet. It arrives with the first full weekly snapshot.', 'Aún no hay datos de proyectos. Llegan con el primer snapshot semanal completo.'],
  noLab: ['No Hidden Problems Lab apps found. Set lab.repos or lab.manual_apps in config.json.', 'No se encontraron apps de Hidden Problems Lab. Configura lab.repos o lab.manual_apps en config.json.'],
  stars: ['stars', 'estrellas'],
  dl: ['downloads', 'descargas'],
  latest: ['latest', 'última'],
  pushed: ['last push', 'último push'],
  issues: ['open issues', 'issues abiertos'],
  openApp: ['Open app', 'Abrir app'],
  code: ['Code', 'Código'],
  releasesLink: ['Releases', 'Versiones'],
  directory: ['Obsidian directory', 'Directorio de Obsidian'],
  sameWeek: ['since last snapshot', 'desde el último snapshot'],
  pageTitleIdx: ['Build log', 'Build log'],
};
const u = (k) => bi(esc(U[k][0]), esc(U[k][1]));

const PAGES = [['index', 'index.html'], ['stats', 'stats.html'], ['projects', 'projects.html']];

const EARLY = `(function(){try{var d=document.documentElement,q=new URLSearchParams(location.search).get('lang'),s=localStorage.getItem('bl-lang');var l=q||s||(navigator.language||'en').slice(0,2);d.dataset.lang=l==='es'?'es':'en';d.lang=d.dataset.lang;var t=localStorage.getItem('bl-theme');if(t)d.dataset.theme=t;var el=d.dataset['title'+(l==='es'?'Es':'En')];if(el)document.title=el;}catch(e){}})();`;

function shell({ page, titles, description, body, cfg, model }) {
  const nav = PAGES.map(([k, href]) => `<a href="${href}"${k === page ? ' aria-current="page"' : ''}>${u(k)}</a>`).join('');
  const updated = model.updated ? `<p>${u('updated')}: <time datetime="${esc(model.updated)}">${biDate(model.updated)}</time></p>` : '';
  return `<!doctype html>
<html lang="en" data-lang="en" data-title-en="${esc(titles[0])}" data-title-es="${esc(titles[1])}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titles[0])}</title>
<meta name="description" content="${esc(description)}">
<meta name="color-scheme" content="light dark">
<script>${EARLY}</script>
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
<a class="skip" href="#main">${u('skip')}</a>
<header class="top">
<a class="brand" href="index.html">${esc(cfg.site.title)}</a>
<nav aria-label="Main">${nav}</nav>
<div class="tools">
<div class="seg" role="group" aria-label="Language / Idioma"><button type="button" data-set-lang="es" aria-pressed="false">ES</button><button type="button" data-set-lang="en" aria-pressed="true">EN</button></div>
<button type="button" class="theme" data-theme-toggle aria-label="Theme / Tema"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9c-5 1-10-4-9-9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
</div>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
<p>${u('footer')}</p>
${updated}
<p><a href="https://github.com/${esc(cfg.user)}">github.com/${esc(cfg.user)}</a></p>
</footer>
<div class="tip" role="tooltip" hidden></div>
<script src="assets/app.js" defer></script>
</body>
</html>
`;
}

const rangeText = (e) => biDate(e.range.start, false) + ' – ' + biDate(new Date(e.range.end - 1));

function entryHtml(e, model) {
  const lines = e.snap ? buildLines(e, model) : [];
  const note = e.note;
  const noteFor = (lang) => note && (note[lang] ?? note.all ?? note.es ?? note.en);
  const noteHtml = note ? `<div class="note"><p class="note-label">${u('note')}</p>${biBlock(renderMarkdown(noteFor('en')), renderMarkdown(noteFor('es')))}</div>` : '';
  const badges = [];
  if (e.snap?.partial) badges.push(`<span class="badge">${u('partial')}</span>`);
  if (e.snap?.source === 'backfill') badges.push(`<span class="badge">${u('backfill')}</span>`);
  return `<li class="entry" id="${e.week}">
<header><h2><a href="#${e.week}">${e.week}</a></h2><p class="range">${rangeText(e)} ${badges.join(' ')}</p></header>
${e.snap ? `<ul class="lines">${lines.map((l) => `<li data-kind="${l.kind}">${bi(l.en, l.es)}</li>`).join('')}</ul>` : `<p class="muted">${u('noSnap')}</p>`}
${noteHtml}
${e.snap ? `<p class="meta"><a href="data/${e.week}.json">${u('json')}</a></p>` : ''}
</li>`;
}

export function renderIndex({ cfg, model }) {
  const t = model.totals;
  const tiles = [
    [t.weeks, 'weeks'],
    [t.commits, 'commits'],
    [t.releases, 'releases'],
    ...(t.downloads !== null ? [[t.downloads, 'downloads']] : []),
    ...(t.streak >= 2 ? [[t.streak, 'streak']] : []),
  ];
  const strip = `<dl class="tiles">${tiles.map(([n, k]) => `<div><dt>${u(k)}</dt><dd>${biNum(n)}</dd></div>`).join('')}</dl>`;
  const list = model.entries.length ? `<ol class="timeline">${[...model.entries].reverse().map((e) => entryHtml(e, model)).join('\n')}</ol>` : `<p class="muted">${u('empty')}</p>`;
  const body = `<h1>${esc(cfg.site.title)}</h1>
<p class="lede">${bi(esc(cfg.site.tagline.en), esc(cfg.site.tagline.es))}</p>
${strip}
${list}`;
  return shell({ page: 'index', titles: [cfg.site.title, cfg.site.title], description: cfg.site.tagline.en, body, cfg, model });
}

const SERIES = ['s1', 's2', 's3', 's4', 's5'];

export function renderStats({ cfg, model }) {
  // downloads
  let dl = `<p class="muted">${u('dlNone')}</p>`;
  const ds = model.downloadSeries;
  if (ds.length) {
    const names = Object.fromEntries(Object.entries(model.latest.state.plugins).map(([id, p]) => [id, p.name]));
    const ranked = Object.entries(model.latest.state.plugins).sort((a, b) => (b[1].downloads || 0) - (a[1].downloads || 0));
    const top = ranked.slice(0, 5).map(([id]) => id);
    const rest = ranked.slice(5).map(([id]) => id);
    const series = top.map((id, i) => ({ id, name: names[id], cls: SERIES[i], values: ds.map((d) => d.byPlugin[id] ?? null) }));
    if (rest.length) series.push({ id: 'other', name: null, cls: 's-other', values: ds.map((d) => rest.reduce((n, id) => n + (d.byPlugin[id] || 0), 0)) });
    const fmt = (v, l) => (v === null ? '–' : num(v, l));
    const tips = ds.map((d, i) => ({
      en: [d.week, ...series.map((s) => `${s.name || `Other plugins (${rest.length})`}: ${fmt(s.values[i], 'en')}`)].join('\n'),
      es: [d.week, ...series.map((s) => `${s.name || `Otros plugins (${rest.length})`}: ${fmt(s.values[i], 'es')}`)].join('\n'),
    }));
    const chart = lineChart({ weeks: ds.map((d) => d.week), series: series.map((s) => ({ cls: s.cls, values: s.values })), tips });
    const legend = `<ul class="legend">${series.map((s) => `<li><i class="sw ${s.cls}"></i>${s.name ? esc(s.name) : bi(`Other plugins (${rest.length})`, `Otros plugins (${rest.length})`)}</li>`).join('')}</ul>`;
    const hist = `<div class="tablewrap"><table><thead><tr><th>${u('week')}</th>${series.map((s) => `<th class="n">${s.name ? esc(s.name) : u('other')}</th>`).join('')}<th class="n">${u('total')}</th></tr></thead><tbody>${ds.map((d, i) => `<tr><th>${d.week}</th>${series.map((s) => `<td class="n">${s.values[i] === null ? '–' : biNum(s.values[i])}</td>`).join('')}<td class="n">${biNum(d.total)}</td></tr>`).join('')}</tbody></table></div>`;
    const gains = model.latestDelta?.gains || {};
    const all = `<div class="tablewrap"><table><thead><tr><th>${u('plugin')}</th><th class="n">${u('total')}</th><th class="n">${u('gain')}</th></tr></thead><tbody>${ranked.map(([id, p]) => `<tr><th>${esc(p.name)}</th><td class="n">${p.downloads === null ? '–' : biNum(p.downloads)}</td><td class="n">${gains[id] === undefined ? '–' : '+' + biNum(gains[id])}</td></tr>`).join('')}</tbody></table></div>`;
    dl = `<figure class="figure">${chart}<figcaption>${u('top5')}</figcaption></figure>${legend}
<details><summary>${u('table')}</summary>${hist}</details>
<h3>${u('plugin')}</h3>${all}`;
  }
  const dlNote = `<p class="callout"><strong>${u('dlNote')}</strong>${model.downloadsStart ? ` (${model.downloadsStart})` : ''}${u('dlNoteTail')}</p>`;

  // commits per week
  let cw = `<p class="muted">${u('cwNone')}</p>`;
  const cs = model.commitSeries.slice(-26);
  if (cs.length) {
    const items = cs.map((c) => ({
      week: c.week,
      value: c.commits,
      cls: c.source === 'backfill' ? 'bar-fill' : '',
      tip: { en: `${c.week}: ${c.commits === null ? 'no snapshot' : `${num(c.commits, 'en')} ${plural(c.commits, 'commit', 'commits')}`}`, es: `${c.week}: ${c.commits === null ? 'sin snapshot' : `${num(c.commits, 'es')} ${plural(c.commits, 'commit', 'commits')}`}` },
    }));
    cw = `<figure class="figure">${barChart({ items })}<figcaption>${bi('Darker bars: weekly snapshots. Lighter bars: rebuilt from git history.', 'Barras oscuras: snapshots semanales. Barras claras: reconstruidas desde el historial de git.')}</figcaption></figure>
<details><summary>${u('table')}</summary><div class="tablewrap"><table><thead><tr><th>${u('week')}</th><th class="n">${u('commits')}</th></tr></thead><tbody>${[...cs].reverse().map((c) => `<tr><th>${c.week}</th><td class="n">${c.commits === null ? '–' : biNum(c.commits)}</td></tr>`).join('')}</tbody></table></div></details>`;
  }

  // releases
  const rel = model.releases;
  const relHtml = rel.length
    ? `<dl class="tiles"><div><dt>${u('releases')}</dt><dd>${biNum(rel.length)}</dd></div><div><dt>${bi('repos with releases', 'repos con versiones')}</dt><dd>${biNum(new Set(rel.map((r) => r.repo)).size)}</dd></div></dl>
<div class="tablewrap"><table><thead><tr><th>${u('release')}</th><th>${u('repo')}</th><th>${u('date')}</th></tr></thead><tbody>${rel.slice(0, 12).map((r) => `<tr><th>${r.url ? `<a href="${esc(r.url)}">${esc(r.tag)}</a>` : esc(r.tag)}</th><td>${esc(r.repo)}</td><td>${biDate(r.date)}</td></tr>`).join('')}</tbody></table></div>`
    : `<p class="muted">${u('relNone')}</p>`;

  const body = `<h1>${u('stats')}</h1>
<section aria-labelledby="h-dl"><h2 id="h-dl">${u('dlTitle')}</h2>${dlNote}${dl}</section>
<section aria-labelledby="h-cw"><h2 id="h-cw">${u('cwTitle')}</h2><p class="muted">${u('cwNote')}</p>${cw}</section>
<section aria-labelledby="h-rel"><h2 id="h-rel">${u('relTitle')}</h2><p class="muted">${u('relNote')}</p>${relHtml}</section>`;
  return shell({ page: 'stats', titles: [`Stats · ${cfg.site.title}`, `Estadísticas · ${cfg.site.title}`], description: 'Downloads, commits per week and releases.', body, cfg, model });
}

function numbers(pairs) {
  return `<dl class="facts">${pairs.filter(Boolean).map(([k, v]) => `<div><dt>${u(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

export function renderProjects({ cfg, model }) {
  const st = model.latest?.state;
  let body = `<h1>${u('projects')}</h1>`;
  if (!st) {
    body += `<p class="muted">${u('noProjects')}</p>`;
    return shell({ page: 'projects', titles: [`Projects · ${cfg.site.title}`, `Proyectos · ${cfg.site.title}`], description: 'Projects with links and latest numbers.', body, cfg, model });
  }
  const gains = model.latestDelta?.gains || {};
  const labRepos = new Set(st.lab.apps.map((a) => a.repo).filter(Boolean));
  const card = (p) => {
    const plugin = p.plugin ? st.plugins[p.plugin] : null;
    const rel = p.latest_release;
    const links = [
      `<a href="${esc(p.url)}">${u('code')}</a>`,
      rel ? `<a href="${esc(rel.url)}">${esc(rel.tag)}</a>` : '',
      plugin ? `<a href="https://obsidian.md/plugins?id=${encodeURIComponent(p.plugin)}">${u('directory')}</a>` : '',
      p.homepage ? `<a href="${esc(p.homepage)}">${esc(new URL(p.homepage).hostname)}</a>` : '',
    ].filter(Boolean);
    return `<li class="card"><h3><a href="${esc(p.url)}">${esc(plugin?.name || p.name)}</a></h3>
<p class="desc">${esc(plugin?.description || p.description || '')}</p>
${numbers([
  plugin && plugin.downloads !== null ? ['dl', biNum(plugin.downloads) + (gains[p.plugin] ? ` <span class="up">+${biNum(gains[p.plugin])}</span>` : '')] : null,
  ['stars', biNum(p.stars)],
  rel ? ['latest', `${esc(rel.tag)} · ${biDate(rel.date)}`] : null,
  p.pushed_at ? ['pushed', biDate(p.pushed_at)] : null,
])}
<p class="links">${links.join(' · ')}</p></li>`;
  };
  const plugins = st.projects.filter((p) => p.plugin).sort((a, b) => (st.plugins[b.plugin].downloads || 0) - (st.plugins[a.plugin].downloads || 0));
  const others = st.projects.filter((p) => !p.plugin && !labRepos.has(p.name)).sort((a, b) => (b.pushed_at || '').localeCompare(a.pushed_at || ''));
  body += `<section><h2>${u('plugins')} <span class="count">${plugins.length}</span></h2>${plugins.length ? `<ul class="cards">${plugins.map(card).join('')}</ul>` : ''}</section>`;
  body += `<section><h2>${u('lab')} <span class="count">${st.lab.apps.length}</span></h2>${st.lab.apps.length
    ? `<ul class="cards">${st.lab.apps.map((a) => `<li class="card"><h3><a href="${esc(a.url)}">${esc(a.name)}</a></h3><p class="desc">${esc(a.description)}</p><p class="links"><a href="${esc(a.url)}">${u('openApp')}</a>${a.repo ? ` · <a href="https://github.com/${esc(cfg.user)}/${esc(a.repo)}">${u('code')}</a>` : ''}</p></li>`).join('')}</ul>`
    : `<p class="muted">${u('noLab')}</p>`}</section>`;
  body += `<section><h2>${u('other_repos')} <span class="count">${others.length}</span></h2>${others.length ? `<ul class="cards">${others.map(card).join('')}</ul>` : ''}</section>`;
  return shell({ page: 'projects', titles: [`Projects · ${cfg.site.title}`, `Proyectos · ${cfg.site.title}`], description: 'Projects with links and latest numbers.', body, cfg, model });
}
