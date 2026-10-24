#!/usr/bin/env node
// Writes data/<week>.json: what happened in that ISO week (activity) plus the state of the account at capture time.
// Re-running the same week overwrites that one file and nothing else.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, loadConfig, ROOT } from './lib/args.mjs';
import { makeClient } from './lib/github.mjs';
import { now, resolveWeek, weekRange, lastCompletedWeek, isoDay } from './lib/weeks.mjs';
import { collectFromApi, bucketWeek } from './lib/activity.mjs';
import { fetchPlugins } from './lib/plugins.mjs';
import { pickLabRepos, discoverApps } from './lib/lab.mjs';
import { validateSnapshot } from './lib/schema.mjs';
import { listRepos } from './lib/repos.mjs';

const args = parseArgs(process.argv.slice(2), ['allow-partial', 'dry-run']);
const cfg = loadConfig(args.config);
const user = args.user || cfg.user;
const week = resolveWeek(args.week);
const { start, end } = weekRange(week);
const at = now();
const out = args.out || join(ROOT, 'data');
const gh = makeClient();
const errors = [];

if (week < lastCompletedWeek(at)) console.error(`note: ${week} is in the past; state (stars, downloads) reflects capture time, not that week.`);

async function section(name, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    errors.push(`${name}: ${err.message}`);
    return fallback;
  }
}

const repos = await section('repos', () => listRepos(gh, { user, cfg, only: args.repos }), null);

const raw = repos && (await section('activity', () => collectFromApi(gh, { user, repos, from: start, to: end }), null));
const activity = raw ? bucketWeek(raw, week) : { commits: { total: 0, days_active: 0, by_repo: {} }, releases: [], new_repos: [], issues: null };

if (repos) {
  const stamp = (d) => d.toISOString().slice(0, 19) + 'Z';
  const q = (kind) => `/search/issues?per_page=1&q=${encodeURIComponent(`user:${user} is:issue is:public ${kind}:${stamp(start)}..${stamp(new Date(end - 1000))}`)}`;
  try {
    const [opened, closed] = await Promise.all([gh.request(q('created')), gh.request(q('closed'))]);
    activity.issues = { opened: opened.total_count, closed: closed.total_count };
  } catch (err) {
    console.error(`note: issue counts unavailable (${err.message}); continuing without them`); // optional, not an error
  }
}

const found = await section('plugins', () => fetchPlugins(gh, { user, ids: cfg.plugins.ids }), null);
if (found?.missing.length) errors.push(`plugins: configured ids not in community-plugins.json: ${found.missing.join(', ')}`);

const labApps = repos
  ? await section('lab', async () => {
      const apps = [];
      for (const repo of pickLabRepos(repos, cfg.lab)) apps.push(...(await discoverApps(gh, { user, repo })));
      apps.push(...(cfg.lab.manual_apps || []).map((a) => ({ description: '', repo: null, ...a })));
      return apps;
    }, null)
  : null;

let state = null;
if (repos && found && labApps && raw) {
  const latest = Object.fromEntries(raw.map((r) => [r.name, [...r.releases].sort((a, b) => b.date.localeCompare(a.date))[0] || null]));
  const byRepo = Object.fromEntries(Object.entries(found.plugins).map(([id, p]) => [p.repo.toLowerCase(), id]));
  const projects = repos
    .map((r) => ({
      name: r.name,
      url: r.html_url,
      description: r.description || '',
      homepage: r.homepage || '',
      language: r.language || '',
      topics: r.topics || [],
      stars: r.stargazers_count,
      open_issues: r.open_issues_count,
      created_at: r.created_at,
      pushed_at: r.pushed_at,
      archived: !!r.archived,
      latest_release: latest[r.name] ? { tag: latest[r.name].tag, date: latest[r.name].date, url: latest[r.name].url } : null,
      plugin: byRepo[`${user}/${r.name}`.toLowerCase()] || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const plugins = found.plugins;
  state = {
    repos: { count: repos.length, stars: projects.reduce((n, p) => n + p.stars, 0), open_issues: projects.reduce((n, p) => n + p.open_issues, 0) },
    projects,
    plugins,
    plugin_totals: { count: Object.keys(plugins).length, downloads: Object.values(plugins).reduce((n, p) => n + (p.downloads || 0), 0) },
    lab: { apps: labApps },
  };
}

const snapshot = {
  schema: 1,
  week,
  source: 'weekly',
  user,
  captured_at: at.toISOString(),
  partial: end > at || errors.length > 0,
  range: { start: start.toISOString(), end: end.toISOString() },
  errors,
  activity,
  state,
};

const problems = validateSnapshot(snapshot);
if (problems.length) {
  console.error('snapshot failed schema validation:\n- ' + problems.join('\n- '));
  process.exit(2);
}
if (errors.length && !args.allow_partial) {
  console.error('fetch incomplete, nothing written (pass --allow-partial to keep a partial snapshot):\n- ' + errors.join('\n- '));
  process.exit(1);
}
const summary = `${week} (${isoDay(start)}..${isoDay(new Date(end - 1))}): ${activity.commits.total} commits, ${activity.releases.length} releases` +
  (state ? `, ${state.repos.count} repos, ${state.plugin_totals.count} plugins / ${state.plugin_totals.downloads} downloads, ${state.lab.apps.length} lab apps` : ', no state') +
  ` [${gh.stats.calls} API calls]`;
if (args.dry_run) {
  console.log(`dry run, not written: ${summary}`);
} else {
  mkdirSync(out, { recursive: true });
  const file = join(out, `${week}.json`);
  writeFileSync(file, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`wrote ${file}\n${summary}`);
}
if (errors.length) console.error('partial snapshot, errors:\n- ' + errors.join('\n- '));
