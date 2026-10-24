// Hidden Problems Lab: find the repo(s), then the apps each one publishes on GitHub Pages.
// Order of evidence: apps.json > links in README + sub-folders with an index.html > the repo itself.
const SKIP_DIRS = new Set(['assets', 'docs', 'node_modules', 'images', 'img', 'static', 'public', 'scripts', 'test', 'tests']);

export function pickLabRepos(repos, lab) {
  const names = new Set((lab.repos || []).map((n) => n.toLowerCase()));
  const re = lab.name_pattern ? new RegExp(lab.name_pattern, 'i') : null;
  return repos.filter((r) => names.has(r.name.toLowerCase()) || (lab.topic && (r.topics || []).includes(lab.topic)) || (re && re.test(r.name)));
}

const pagesUrl = (user, repo) => `https://${user.toLowerCase()}.github.io/${repo.name}/`;
const norm = (u) => u.replace(/#.*$/, '').replace(/\/?$/, '/').toLowerCase();

export async function discoverApps(gh, { user, repo }) {
  const apps = [];
  const base = `/repos/${user}/${repo.name}`;
  const file = await gh.optional(`${base}/contents/apps.json`);
  if (file?.content) {
    const data = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    for (const a of Array.isArray(data) ? data : data.apps || []) if (a.name && a.url) apps.push({ name: a.name, url: a.url, description: a.description || '', repo: repo.name });
    return apps;
  }
  if (!repo.has_pages) return apps;
  const site = repo.homepage && /^https?:\/\//.test(repo.homepage) ? repo.homepage : pagesUrl(user, repo);
  const siteBase = site.replace(/\/?$/, '/');
  const readme = await gh.optional(`${base}/readme`);
  if (readme?.content) {
    const md = Buffer.from(readme.content, 'base64').toString('utf8');
    for (const m of md.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
      try {
        if (new URL(m[2]).hostname.toLowerCase() === `${user.toLowerCase()}.github.io`) apps.push({ name: m[1].trim(), url: m[2], description: '', repo: repo.name });
      } catch { /* not a URL */ }
    }
  }
  const root = (await gh.optional(`${base}/contents/`)) || [];
  const dirs = root.filter((x) => x.type === 'dir' && !x.name.startsWith('.') && !x.name.startsWith('_') && !SKIP_DIRS.has(x.name)).slice(0, 40);
  for (const d of dirs) {
    if (await gh.optional(`${base}/contents/${d.name}/index.html`)) apps.push({ name: d.name, url: `${siteBase}${d.name}/`, description: '', repo: repo.name });
  }
  if (root.some((x) => x.name === 'index.html') || !apps.length) apps.unshift({ name: repo.name, url: siteBase, description: repo.description || '', repo: repo.name });
  const seen = new Set();
  return apps.filter((a) => (seen.has(norm(a.url)) ? false : seen.add(norm(a.url))));
}
