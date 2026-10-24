// A tiny deterministic stand-in for the GitHub REST API and the Obsidian raw files.
// URL prefix /s<N>/ selects a "stage": N grows downloads and stars so week-over-week deltas exist.
import http from 'node:http';
import { weekRange, addWeeks } from '../scripts/lib/weeks.mjs';

export const USER = 'demo-user';
const LAST = '2026-W43';
const B64 = (s) => Buffer.from(s).toString('base64');
const at = (week, day, hour = 12) => new Date(weekRange(week).start.getTime() + day * 86400000 + hour * 3600000).toISOString();

const repoDefs = [
  { name: 'alpha-plugin', created: '2026-W30', desc: 'Alpha: a demo Obsidian plugin.', pages: false, stars: 5, topics: ['obsidian-plugin'], activity: [3, 6, 4, 2, 0, 5, 7, 3, 6, 5, 4, 8, 2, 5] },
  { name: 'beta-plugin', created: '2026-W34', desc: 'Beta: another demo plugin.', pages: false, stars: 2, topics: ['obsidian-plugin'], activity: [0, 0, 0, 0, 3, 2, 4, 0, 1, 3, 2, 0, 2, 1] },
  { name: 'hidden-problems-lab', created: '2026-W32', desc: 'Small apps for hidden problems.', pages: true, stars: 1, topics: ['hidden-problems-lab'], activity: [0, 0, 2, 1, 0, 0, 3, 4, 1, 0, 2, 2, 3, 1] },
  { name: 'hidden-problems-extra', created: '2026-W41', desc: 'More lab apps, discovered from README and folders.', pages: true, stars: 0, topics: [], activity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 2, 1] },
  { name: 'notes-cli', created: '2026-W31', desc: 'Command line notes.', pages: false, stars: 3, topics: [], activity: [1, 0, 2, 0, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0] },
  { name: 'forked-thing', created: '2026-W35', desc: 'A fork, should be ignored.', pages: false, stars: 0, fork: true, topics: [], activity: [0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'empty-repo', created: '2026-W42', desc: 'No commits yet.', pages: false, stars: 0, topics: [], activity: [], empty: true },
];
const releaseDefs = {
  'alpha-plugin': [['2026-W31', '0.1.0'], ['2026-W34', '0.2.0'], ['2026-W38', '1.0.0'], ['2026-W43', '1.1.0']],
  'beta-plugin': [['2026-W36', '0.1.0'], ['2026-W40', '0.2.0']],
  'hidden-problems-lab': [['2026-W37', 'v1']],
};
const first = '2026-W30';

function build(stage) {
  const repos = repoDefs.map((d) => ({
    id: d.name.length * 1000,
    name: d.name,
    full_name: `${USER}/${d.name}`,
    private: false,
    fork: !!d.fork,
    archived: false,
    html_url: `https://github.com/${USER}/${d.name}`,
    description: d.desc,
    homepage: '',
    language: 'JavaScript',
    topics: d.topics,
    stargazers_count: d.stars + stage * (d.stars ? 1 : 0),
    open_issues_count: 1 + stage,
    created_at: at(d.created, 1),
    pushed_at: at(LAST, 2),
    has_pages: d.pages,
  }));
  const commits = {};
  repoDefs.forEach((d) => {
    commits[d.name] = [];
    (d.activity || []).forEach((n, i) => {
      const week = addWeeks(first, i);
      for (let k = 0; k < n; k++) commits[d.name].push({ sha: `${d.name}-${week}-${k}`, commit: { committer: { date: at(week, (k * 2) % 7, 9 + k) }, author: { date: at(week, (k * 2) % 7, 9 + k) } } });
    });
  });
  const releases = {};
  for (const [name, list] of Object.entries(releaseDefs)) {
    releases[name] = list.map(([week, tag]) => ({ tag_name: tag, name: `${name} ${tag}`, published_at: at(week, 3), html_url: `https://github.com/${USER}/${name}/releases/tag/${tag}`, draft: false, prerelease: false }));
  }
  const plugins = [
    { id: 'alpha-notes', name: 'Alpha Notes', author: 'demo', description: 'Alpha plugin.', repo: `${USER}/alpha-plugin` },
    { id: 'beta-links', name: 'Beta Links', author: 'demo', description: 'Beta plugin.', repo: `${USER}/beta-plugin` },
    { id: 'someone-elses', name: 'Not Mine', author: 'x', description: 'Other.', repo: 'someone-else/other-plugin' },
  ];
  const stats = {
    'alpha-notes': { downloads: 1200 + stage * 140, updated: 1 },
    'beta-links': { downloads: 300 + stage * 60, updated: 1 },
    'someone-elses': { downloads: 99999, updated: 1 },
  };
  const contents = {
    'hidden-problems-lab/apps.json': B64(JSON.stringify([
      { name: 'Queue Whisperer', url: `https://${USER}.github.io/hidden-problems-lab/queue/`, description: 'Why lines move the way they do.' },
      { name: 'Rent Split', url: `https://${USER}.github.io/hidden-problems-lab/rent/`, description: 'Fair splits.' },
      { name: 'Bus Stop Clock', url: `https://${USER}.github.io/hidden-problems-lab/bus/` },
    ])),
    'hidden-problems-extra/README.md': B64(`# Extra\n\nTry [Tide Table](https://${USER}.github.io/hidden-problems-extra/tide/) or see [my site](https://example.org/).\n`),
  };
  return { repos, commits, releases, plugins, stats, contents };
}

export function startMock(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const m = /^\/s(\d+)(\/.*)$/.exec(url.pathname);
    const stage = m ? Number(m[1]) : 0;
    const path = m ? m[2] : url.pathname;
    const d = build(stage);
    const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    const page = (list) => {
      const per = Number(url.searchParams.get('per_page') || 30);
      const p = Number(url.searchParams.get('page') || 1);
      return list.slice((p - 1) * per, p * per);
    };
    let r;
    if (path === '/raw/community-plugins.json') return send(200, d.plugins);
    if (path === '/raw/community-plugin-stats.json') return send(200, d.stats);
    if ((r = /^\/users\/([^/]+)\/repos$/.exec(path))) return r[1] === USER ? send(200, page(d.repos)) : send(404, { message: 'Not Found' });
    if ((r = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/.exec(path))) {
      const [, owner, name, rest = ''] = r;
      const repo = d.repos.find((x) => x.name === name);
      if (owner !== USER || !repo) return send(404, { message: 'Not Found' });
      if (rest === '') return send(200, repo);
      if (rest === '/commits') {
        if (repoDefs.find((x) => x.name === name).empty) return send(409, { message: 'Git Repository is empty.' });
        const since = url.searchParams.get('since');
        const until = url.searchParams.get('until');
        const list = d.commits[name].filter((c) => (!since || c.commit.committer.date >= since) && (!until || c.commit.committer.date < until));
        return send(200, page(list));
      }
      if (rest === '/releases') return send(200, page(d.releases[name] || []));
      if (rest === '/readme') {
        const c = d.contents[`${name}/README.md`];
        return c ? send(200, { content: c }) : send(404, { message: 'Not Found' });
      }
      if (rest === '/contents/') {
        if (name === 'hidden-problems-extra') return send(200, [{ name: 'README.md', type: 'file' }, { name: 'tide', type: 'dir' }, { name: 'cube', type: 'dir' }, { name: 'assets', type: 'dir' }, { name: '.github', type: 'dir' }]);
        return send(200, [{ name: 'README.md', type: 'file' }]);
      }
      if ((r = /^\/contents\/(.+)$/.exec(rest))) {
        if (name === 'hidden-problems-extra' && /^(tide|cube)\/index\.html$/.test(r[1])) return send(200, { name: 'index.html' });
        const c = d.contents[`${name}/${r[1]}`];
        return c ? send(200, { content: c }) : send(404, { message: 'Not Found' });
      }
    }
    if (path === '/search/issues') {
      const q = decodeURIComponent(url.searchParams.get('q') || '');
      const week = /(\d{4}-\d{2}-\d{2})T/.exec(q)?.[1] || '';
      const n = [...week].reduce((a, c) => a + c.charCodeAt(0), 0);
      return send(200, { total_count: q.includes('closed:') ? n % 4 : (n + 1) % 3 });
    }
    return send(404, { message: `Not Found (${path})` });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => {
    const p = server.address().port;
    resolve({ port: p, close: () => new Promise((ok) => server.close(ok)), env: (stage = 0) => ({ GITHUB_API_URL: `http://127.0.0.1:${p}/s${stage}`, OBSIDIAN_RAW_URL: `http://127.0.0.1:${p}/s${stage}/raw` }) });
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = await startMock(Number(process.argv[2] || 8787));
  console.log(`mock on http://127.0.0.1:${m.port} (prefix /s<stage>)`);
}
