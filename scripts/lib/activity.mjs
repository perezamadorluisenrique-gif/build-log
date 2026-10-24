// Turns raw commit/release lists into the `activity` block of a snapshot.
// Two sources feed the same shape: the GitHub API (fetch, backfill) and local git clones (backfill --git).
import { execFileSync } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { weekRange, isoDay } from './weeks.mjs';

/** Run fn over items with limited concurrency, keeping order. */
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

/**
 * repos: list from the GitHub API (already filtered). Returns RawRepo[]:
 * { name, url, description, created_at, pushed_at, commits: [{date}], releases: [{tag,name,date,url,prerelease}] }
 */
export async function collectFromApi(gh, { user, repos, from, to }) {
  return pool(repos, 4, async (repo) => {
    const raw = {
      name: repo.name,
      url: repo.html_url,
      description: repo.description || '',
      created_at: repo.created_at,
      pushed_at: repo.pushed_at,
      commits: [],
      releases: [],
    };
    if (!repo.pushed_at || new Date(repo.pushed_at) >= from) {
      try {
        const q = `author=${encodeURIComponent(user)}&since=${from.toISOString()}&until=${to.toISOString()}`;
        const commits = await gh.paginate(`/repos/${user}/${repo.name}/commits?${q}`, { maxPages: 20 });
        raw.commits = commits.map((c) => ({ date: c.commit?.committer?.date || c.commit?.author?.date })).filter((c) => c.date);
      } catch (err) {
        if (err.status !== 409) throw err; // 409 = empty repository
      }
    }
    const releases = await gh.paginate(`/repos/${user}/${repo.name}/releases`, { maxPages: 3 });
    raw.releases = releases
      .filter((r) => !r.draft && (r.published_at || r.created_at))
      .map((r) => ({ tag: r.tag_name, name: r.name || r.tag_name, date: r.published_at || r.created_at, url: r.html_url, prerelease: !!r.prerelease }));
    return raw;
  });
}

const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

/** Same RawRepo shape from a local clone: commits from `git log`, releases from tags. */
export function collectFromGit(paths, { name, url } = {}) {
  return paths.map((p) => {
    const dir = resolve(p);
    const repoName = name || basename(dir);
    const commits = git(dir, ['log', '--all', '--format=%H%x09%cI']).split('\n').filter(Boolean).map((l) => ({ date: l.split('\t')[1] }));
    const first = commits.map((c) => c.date).sort()[0] || null;
    const tags = git(dir, ['for-each-ref', '--format=%(refname:short)%09%(creatordate:iso-strict)', 'refs/tags'])
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const [tag, date] = l.split('\t');
        return { tag, name: tag, date, url: url ? `${url}/releases/tag/${tag}` : '', prerelease: false };
      });
    return { name: repoName, url: url || '', description: '', created_at: first, pushed_at: null, commits, releases: tags };
  });
}

/** Activity for one ISO week from RawRepo[]. */
export function bucketWeek(rawRepos, label) {
  const { start, end } = weekRange(label);
  const inWeek = (d) => d && new Date(d) >= start && new Date(d) < end;
  const byRepo = {};
  const days = new Set();
  let total = 0;
  const releases = [];
  const newRepos = [];
  for (const r of rawRepos) {
    const cs = r.commits.filter((c) => inWeek(c.date));
    if (cs.length) {
      byRepo[r.name] = cs.length;
      total += cs.length;
      cs.forEach((c) => days.add(isoDay(new Date(c.date))));
    }
    for (const rel of r.releases) if (inWeek(rel.date)) releases.push({ repo: r.name, tag: rel.tag, name: rel.name, date: rel.date, url: rel.url, prerelease: rel.prerelease });
    if (inWeek(r.created_at)) newRepos.push({ name: r.name, url: r.url, description: r.description, created_at: r.created_at });
  }
  const sorted = Object.entries(byRepo).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    commits: { total, days_active: days.size, by_repo: Object.fromEntries(sorted) },
    releases: releases.sort((a, b) => a.date.localeCompare(b.date) || a.repo.localeCompare(b.repo)),
    new_repos: newRepos.sort((a, b) => a.created_at.localeCompare(b.created_at)),
    issues: null,
  };
}

export const isEmptyActivity = (a) => !a.commits.total && !a.releases.length && !a.new_repos.length;
