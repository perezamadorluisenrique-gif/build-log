# Results

A public build log: a weekly GitHub Action turns public GitHub activity into a dated lab notebook (timeline, stats, projects), in English and Spanish, with no LLM calls and no dependencies at runtime.

## What `./score` confirms

`./score` runs the ladder against a mock GitHub server (`test/mock-github.mjs`), so it is repeatable and needs no token. Every rung passes.

| Rung | Confirms |
|------|----------|
| R0 | `score` runs; README, .gitignore, STATE.md, NEXT.md, PROGRESS.md exist and STATE.md has a status and a UTC time |
| R1 | `fetch` writes a snapshot for the chosen week that passes the schema; strict mode writes nothing on error; plugin discovery, lab discovery, repo filtering (private, forks, excluded) |
| R2 | `backfill` writes at least 8 past weekly entries, from GitHub history and from a local `git log`; counts match the history; existing snapshots are never rewritten |
| R3 | The static site builds with index, stats and projects pages; every link, asset and anchor resolves; ES/EN spans are paired; newest week first with 3–6 lines per entry; the stats page has both charts, the releases count and the "download history starts at the first snapshot" notice; the build is deterministic; an empty data folder builds; a corrupt snapshot stops the build |
| R4 | `weekly.yml` and `ci.yml` are valid; cron is Monday 06:17 UTC; `workflow_dispatch` is present; steps run fetch, commit, build, deploy in order with deploy guarded by `dry_run`; only the default `GITHUB_TOKEN` is used; the dry-run steps work end to end |
| R5 | `notes/<week>.md` shows inside that week's entry (escaped, per-language variants, notes for weeks without a snapshot); the ES/EN toggle works and is remembered; dark mode follows the system and can be overridden; no horizontal scroll at 375px and 320px (Playwright, light and dark, EN and ES); tooltips work; no console errors |
| R6 | README has How it works, How to add a note, How to pause it, Setup (enable Pages) and Configuration, and only names files that exist; this file exists |

The `ci` workflow also has a `dry-run` job that fetches the **real** account with the default token, backfills, builds and checks the site in a scratch folder. It passed: 48 public repos, 29 Obsidian plugins with 14,212 downloads, 93 commits and 32 releases in week 2026-W42.

## Reproduce

```sh
git clone https://github.com/perezamadorluisenrique-gif/build-log && cd build-log
git checkout claude/portfolio-build-log-3x6z1p
npm install --no-save playwright && npx playwright install chromium   # only the R5 browser checks need this
./score                 # all rungs
./score R3 R5           # selected rungs
./score --live          # also hits the real GitHub API (needs GITHUB_TOKEN)

# try the pipeline by hand
node scripts/fetch.mjs --week last --dry-run
node scripts/backfill.mjs --weeks 12
node scripts/build.mjs && node scripts/check-site.mjs dist
```

Screenshots at 375px are written to `.score/shots/`.

## What is left for you

1. **Enable Pages.** *Settings → Pages → Deploy from a branch → `gh-pages` / root.* The branch is created by the first deploy.
2. **Run the workflow once.** *Actions → weekly → Run workflow* (leave `dry_run` off). It backfills past weeks, takes the first snapshot and publishes. Check *Settings → Actions → General → Workflow permissions* allows writes.
3. **Branches.** The repo was empty, so the working branch `claude/portfolio-build-log-3x6z1p` is the only branch and no pull request could be opened. Scheduled workflows run only from the default branch, so make sure the default branch is the one holding this code (rename it or point the default at it).
4. **Hidden Problems Lab apps: 0 were detected** on the real account, so my guess at the lab layout did not match. Set `lab.repos` and/or `lab.manual_apps` in `config.json` (`name`, `url`, `description`) and the projects page will list them.
5. **Add notes.** Write `notes/YYYY-Www.md` (or `.es.md` / `.en.md`) and they appear inside that week's entry. See `notes/README.md`.
6. **Tinta (optional).** If you have the Tinta CSS, drop it in `vendor/tinta/*.css` (loaded after `site/tokens.css`); otherwise the ink-on-paper theme in `site/` is used (see DECISIONS.md).
7. **Plugin downloads** start at the first snapshot; history before that is not available from the public stats file. The site says so.
8. **CI warning.** `actions/checkout@v4` and `setup-node@v4` target Node 20 and GitHub forces them to Node 24; it is only a warning.

Decisions and their reasons: `DECISIONS.md`. Progress and blockers: `PROGRESS.md`, `NEXT.md`.
