# build-log

A public **build log** for a developer portfolio: a dated lab notebook that rebuilds itself every week from public GitHub activity and Obsidian plugin download counts, and shows what shipped, what changed and the numbers. It is static HTML, in English and Spanish, with a light and a dark theme, and it works at phone width.

- **Timeline** (`index.html`): one entry per ISO week, newest first, 3 to 6 short factual lines each ("Shipped v1.3.0 of X (notes)", "+212 downloads across plugins (total 4,880)"), plus a hand-written note when you add one.
- **Stats** (`stats.html`): cumulative downloads per plugin (line chart), commits per week (bar chart), releases.
- **Projects** (`projects.html`): one card per project with description, links and latest numbers (Obsidian plugins, Hidden Problems Lab apps, other repos).

No LLM calls, no secrets beyond the default `GITHUB_TOKEN`, no runtime dependencies (Node 22 and its built-in `fetch`).

## How it works

```
Monday 06:17 UTC  .github/workflows/weekly.yml
  1. scripts/backfill.mjs   only on the first run (or when asked): past weeks from commit/release history
  2. scripts/fetch.mjs      snapshot of the week that just ended -> data/YYYY-Www.json (committed)
  3. scripts/build.mjs      data/*.json + notes/*.md + site/* -> dist/   (then scripts/check-site.mjs)
  4. deploy                 dist/ pushed to the gh-pages branch
```

- **Sources** (all public): your repos (commits, releases, new repos, stars, issues) from the GitHub API; plugin downloads from `community-plugin-stats.json` in `obsidianmd/obsidian-releases`. Plugins are found by repo owner in `community-plugins.json`, so nothing needs listing.
- **Snapshots** live in `data/YYYY-Www.json` and are only ever added to. Week-over-week deltas (downloads gained, releases shipped) are computed from consecutive snapshots when the site is built. Re-running a week overwrites that one file and nothing else.
- **Backfill** rebuilds past weeks from history (`scripts/backfill.mjs`, or `--git <clone>` for a local clone). Backfilled weeks have commits and releases only. **Download history starts at the first real snapshot**, because Obsidian publishes totals, not a past series; the stats page says so.
- **Lines** are templates (`scripts/lib/lines.mjs`) in both languages. Edit a template and every past entry changes with the next build.
- Why each ambiguous choice was made: [DECISIONS.md](DECISIONS.md).

## Set up (once)

1. Push this repo to GitHub as `<user>/build-log` (public) and make sure Actions are enabled.
2. Run the **weekly** workflow once by hand: *Actions → weekly → Run workflow*. The first run backfills past weeks, takes a snapshot, commits `data/` and creates the `gh-pages` branch.
3. *Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages` / `/ (root)`*. The site is then at `https://<user>.github.io/build-log/`.
4. Check *Settings → Actions → General → Workflow permissions* allows the workflow to write (the workflow asks for `contents: write`; an organisation policy can override it).

Nothing else is needed. After that it runs every Monday on its own.

## Configure

`config.json` (all optional; the defaults work for `<user>`):

| key | meaning |
| --- | --- |
| `user` | GitHub login to read |
| `site.title`, `site.tagline.{en,es}` | heading and subtitle |
| `repos.exclude`, `repos.include_forks` | repos to skip; forks are skipped by default |
| `plugins.ids` | extra Obsidian plugin ids (plugins whose repo you own are found automatically) |
| `lab.repos`, `lab.topic`, `lab.name_pattern`, `lab.manual_apps` | where the Hidden Problems Lab apps are; `manual_apps` takes `[{ "name", "url", "description" }]` |
| `backfill_weeks` | how far back the backfill goes (default 26) |

**Design (Tinta).** If you have the Tinta tokens/CSS, put them in `vendor/tinta/*.css`; they are loaded after `site/tokens.css` and only need to redefine its variables (`--paper`, `--ink`, `--muted`, `--rule`, `--accent`, …). Without them the built-in ink-on-paper style is used.

## Add a note

Context you write by hand shows up inside that week's entry.

1. Find the week label: ISO week, Monday to Sunday UTC, shown on each entry (for example `2026-W43`).
2. Create `notes/YYYY-Www.md`, for example `notes/2026-W43.md`, and write Markdown (paragraphs, `###` headings, lists, quotes, code, bold, italic, links; raw HTML is shown as text).
3. Commit it to the default branch. It appears on the next build, which happens when the workflow runs. To see it now, run the workflow from the Actions tab (*Run workflow*, with `dry_run` off).

`notes/2026-W43.es.md` and `notes/2026-W43.en.md` show only in that language; `notes/2026-W43.md` shows in both. A note for a week that has no snapshot still gets an entry.

## Pause it

- **Pause**: *Actions → weekly → ⋯ → Disable workflow*. Nothing runs and nothing changes; the published site stays up. Re-enable it the same way. (GitHub also disables scheduled workflows after 60 days without repository activity; re-enable them the same way.)
- A missed week is simply missing from the timeline; later deltas compare with the nearest earlier snapshot.
- **Take the site down**: set Pages source to *None* in the repo settings. The data stays in `data/`.
- **Skip one run**: run it manually with `dry_run` on to fetch and build without committing or deploying.

## Run it locally

```sh
node scripts/fetch.mjs --week current --out data   # needs network; GITHUB_TOKEN optional but avoids rate limits
node scripts/backfill.mjs --weeks 12               # past weeks, skips weeks that already exist
node scripts/build.mjs && node scripts/check-site.mjs dist
python3 -m http.server -d dist 8000                # open http://localhost:8000
```

`fetch` exits non-zero and writes nothing if any source fails (so a half-empty snapshot is never committed). `--allow-partial` keeps what it could get, and says so in the file.

## Verify it: `./score`

`./score` is the acceptance ladder, R0 to R6 (`./score R3 R5` runs only some rungs, `./score --live` adds a real-API check for this repo). It needs Node 22 and, for the browser checks in R5, Playwright:

```sh
npm install --no-save playwright && npx playwright install chromium
./score
```

It runs the real scripts against a local mock of the GitHub API (`test/mock-github.mjs`), builds the site, checks links, the notes override, the ES/EN toggle, dark mode and "no horizontal scroll at 375 px" (screenshots in `.score/shots/`). Never edit `score` to make a check pass; extend it.

## Layout

```
config.json            settings          scripts/   fetch, backfill, build, check-site, lib/
data/                  weekly snapshots  site/      tokens.css, site.css, app.js
notes/                 your notes        test/      mock API, fixtures
.github/workflows/     weekly.yml, ci.yml
```
