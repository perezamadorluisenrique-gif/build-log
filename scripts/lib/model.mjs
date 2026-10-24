// Reads data/*.json and notes/*.md and derives everything the pages show.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateSnapshot } from './schema.mjs';
import { WEEK_RE, weekRange, addWeeks } from './weeks.mjs';

export function loadSnapshots(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).filter((x) => /^\d{4}-W\d{2}\.json$/.test(x)).sort()) {
    const snap = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const problems = validateSnapshot(snap, f);
    if (problems.length) throw new Error(`${f} is not a valid snapshot:\n- ${problems.join('\n- ')}`);
    out.push(snap);
  }
  return out;
}

/** notes/2026-W43.md shows in both languages; 2026-W43.es.md / .en.md only in that language. */
export function loadNotes(dir) {
  const notes = {};
  if (!existsSync(dir)) return notes;
  for (const f of readdirSync(dir).sort()) {
    const m = /^(\d{4}-W\d{2})(?:\.(es|en))?\.md$/.exec(f);
    if (!m || !WEEK_RE.test(m[1])) continue;
    weekRange(m[1]);
    (notes[m[1]] ||= {})[m[2] || 'all'] = readFileSync(join(dir, f), 'utf8').trim();
  }
  return notes;
}

export function buildModel({ snapshots, notes }) {
  const bySnap = Object.fromEntries(snapshots.map((s) => [s.week, s]));
  const weeks = [...new Set([...Object.keys(bySnap), ...Object.keys(notes)])].sort();
  const firstWeek = weeks[0] || null;

  let prevState = null;
  let prevWeekWithState = null;
  let streak = 0;
  let cumCommits = 0;
  let prevWeek = null;
  const entries = weeks.map((week, idx) => {
    const snap = bySnap[week] || null;
    let delta = null;
    if (snap?.state) {
      const st = snap.state;
      if (prevState) {
        const gains = {};
        for (const [id, p] of Object.entries(st.plugins)) {
          const before = prevState.plugins[id];
          if (before && p.downloads !== null && before.downloads !== null) gains[id] = Math.max(0, p.downloads - before.downloads);
        }
        delta = {
          since: prevWeekWithState,
          downloads: Object.values(gains).reduce((a, b) => a + b, 0),
          gains,
          stars: st.repos.stars - prevState.repos.stars,
          newPlugins: Object.keys(st.plugins).filter((id) => !prevState.plugins[id]),
          newApps: st.lab.apps.filter((a) => !prevState.lab.apps.some((b) => b.url === a.url)).map((a) => a.name),
        };
      }
      prevState = st;
      prevWeekWithState = week;
    }
    const commits = snap ? snap.activity.commits.total : 0;
    streak = snap && commits > 0 ? (prevWeek && addWeeks(week, -1) === prevWeek && streak > 0 ? streak + 1 : 1) : 0;
    if (snap) cumCommits += commits;
    prevWeek = snap ? week : prevWeek && addWeeks(week, -1) === prevWeek ? week : null;
    return { week, index: idx + 1, snap, delta, note: notes[week] || null, streak, cumCommits, range: weekRange(week) };
  });

  // series for the stats page
  const withState = entries.filter((e) => e.snap?.state);
  const latest = withState.length ? withState[withState.length - 1].snap : null;
  const commitSeries = [];
  if (snapshots.length) {
    for (let w = snapshots[0].week; w <= snapshots[snapshots.length - 1].week; w = addWeeks(w, 1)) {
      commitSeries.push({ week: w, commits: bySnap[w] ? bySnap[w].activity.commits.total : null, source: bySnap[w]?.source || null });
    }
  }
  const seen = new Set();
  const releases = [];
  for (const s of snapshots) {
    for (const r of s.activity.releases) {
      const key = `${r.repo}@${r.tag}`;
      if (!seen.has(key)) { seen.add(key); releases.push({ ...r, week: s.week }); }
    }
  }
  releases.sort((a, b) => b.date.localeCompare(a.date));
  const downloadSeries = withState.map((e) => ({
    week: e.week,
    total: e.snap.state.plugin_totals.downloads,
    byPlugin: Object.fromEntries(Object.entries(e.snap.state.plugins).map(([id, p]) => [id, p.downloads])),
  }));
  const lastEntry = entries[entries.length - 1] || null;
  return {
    entries,
    firstWeek,
    latest,
    latestDelta: [...entries].reverse().find((e) => e.snap?.state)?.delta || null,
    commitSeries,
    releases,
    downloadSeries,
    downloadsStart: downloadSeries[0]?.week || null,
    totals: {
      weeks: entries.length,
      commits: cumCommits,
      releases: releases.length,
      streak: lastEntry ? lastEntry.streak : 0,
      downloads: latest ? latest.state.plugin_totals.downloads : null,
    },
    updated: snapshots.length ? snapshots.map((s) => s.captured_at).sort().pop() : null,
  };
}
