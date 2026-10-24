#!/usr/bin/env node
// Builds snapshots for past weeks from commit and release history. These have no stars or downloads
// (nobody recorded them), so state is null. Existing files are never touched.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, loadConfig, ROOT } from './lib/args.mjs';
import { makeClient } from './lib/github.mjs';
import { now, lastCompletedWeek, addWeeks, weeksBetween, weekRange } from './lib/weeks.mjs';
import { collectFromApi, collectFromGit, bucketWeek, isEmptyActivity } from './lib/activity.mjs';
import { listRepos } from './lib/repos.mjs';
import { validateSnapshot } from './lib/schema.mjs';

const args = parseArgs(process.argv.slice(2));
const cfg = loadConfig(args.config);
const user = args.user || cfg.user;
const out = args.out || join(ROOT, 'data');
const last = lastCompletedWeek();
const first = addWeeks(last, -(Number(args.weeks || cfg.backfill_weeks) - 1));
const from = weekRange(first).start;
const to = weekRange(last).end;

let raw;
if (args.git) {
  raw = collectFromGit(args.git.split(','), { name: args.repo_name, url: args.repo_url });
} else {
  const gh = makeClient();
  const repos = await listRepos(gh, { user, cfg, only: args.repos });
  raw = await collectFromApi(gh, { user, repos, from, to });
}

mkdirSync(out, { recursive: true });
let started = false;
let written = 0;
let skipped = 0;
for (const week of weeksBetween(first, last)) {
  const activity = bucketWeek(raw, week);
  if (!started && isEmptyActivity(activity)) continue; // nothing existed yet: no entry before the first activity
  started = true;
  const file = join(out, `${week}.json`);
  if (existsSync(file)) { skipped++; continue; }
  const { start, end } = weekRange(week);
  const snapshot = {
    schema: 1,
    week,
    source: 'backfill',
    user,
    captured_at: now().toISOString(),
    partial: false,
    range: { start: start.toISOString(), end: end.toISOString() },
    errors: [],
    activity,
    state: null,
  };
  const problems = validateSnapshot(snapshot);
  if (problems.length) throw new Error(`${week}: ${problems.join('; ')}`);
  writeFileSync(file, JSON.stringify(snapshot, null, 2) + '\n');
  written++;
}
console.log(`backfill ${first}..${last}: wrote ${written} entries, left ${skipped} existing files untouched`);
