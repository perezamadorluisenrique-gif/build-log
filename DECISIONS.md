# DECISIONS

Each entry: what was decided, and why. Nobody was available to answer questions, so every ambiguity in the brief is settled here. If one of these is wrong for you, the "Change it" note says what to touch.

## Placeholders in the brief that were never filled in

The brief contains `<your-user>`, `<plugin-id-1>…`, `<repo-name(s)>` (Hidden Problems Lab) and `<repo-with-Tinta>`. The build session could only reach this one repository through the GitHub API (`/users/<user>/repos` and other repos are blocked there), so nothing could be looked up.

- **GitHub user** = `perezamadorluisenrique-gif`, the owner of this repo (`config.json` → `user`).
- **Plugin ids**: discovered, not listed. A plugin counts as mine when the owner part of its `repo` in `community-plugins.json` equals the user. This matches the real file (29 plugins in the file today, e.g. `shared-blocks`, `text-format`, `task-rollover`, …). The `author` field is *not* used: it is a display name (`siulved54`), not a GitHub login, so anyone could share it. *Change it:* add ids to `config.json` → `plugins.ids` (they are added to the discovered ones).
- **Hidden Problems Lab**: the repo name is unknown, so repos are picked by any of: listed in `lab.repos`, GitHub topic `hidden-problems-lab`, or a name matching `hidden[-_ ]?problems`. Apps inside a repo are found, in order, from `apps.json` (`[{name,url,description}]`) → links to `<user>.github.io` in the README + sub-folders that contain an `index.html` → the repo's own Pages URL. Anything can be added by hand in `lab.manual_apps`. This is a best guess about how the apps are laid out; the Projects page says so when nothing is found instead of showing an empty section. *Change it:* `config.json` → `lab`.
- **Tinta**: its repo was not given or reachable, so a minimal ink-on-paper style is used (`site/tokens.css`: warm paper, near-black ink, one ink-blue accent, serif text, mono numbers, light and dark). All page CSS reads semantic variables (`--paper`, `--ink`, `--muted`, `--rule`, `--accent`). To use the real Tinta: copy its CSS into `vendor/tinta/*.css`; `build.mjs` loads those files after `tokens.css`, so redefining the variables is enough. If Tinta names its variables differently, add one `vendor/tinta/map.css` that maps them onto the names above.

## What a "week" is

- Weeks are ISO weeks, Monday 00:00 to the next Monday 00:00 UTC, labelled `YYYY-Www`.
- A snapshot labelled `W` describes what happened *in* week `W` (commits, releases, new repos, issues) plus the account state (stars, downloads, apps) *at capture time*.
- The Monday 06:17 cron therefore snapshots the week that just ended (default `--week last`). Snapshotting the current week at that moment would capture six hours of a new week. `--week current` exists for manual runs; such a snapshot is marked `partial: true`.
- "Idempotent": re-running a week rewrites `data/<that week>.json` and nothing else. `captured_at` changes on every run, so the diff is never empty; that is intended (it records when the numbers were taken).
- Week-over-week deltas compare with the nearest earlier snapshot that has state, not strictly week-1, so a missed Monday does not erase the delta. The entry says nothing about the gap beyond using the larger delta.

## Data model

- `data/YYYY-Www.json`, schema version 1, validated by `scripts/lib/schema.mjs` on write and on build. A bad file stops the build; it never publishes bad data.
- `source: "weekly"` has `state` (stars, projects, plugin downloads, lab apps). `source: "backfill"` has `state: null`: nobody recorded stars or downloads for past weeks, so they are not invented. Only weekly snapshots can carry download history, which is why the stats page says it starts at the first snapshot.
- Backfill never overwrites a file. A weekly run is allowed to replace a backfilled file for its own week (that week gets full state).
- Commits: counted with `author=<user>` per repo (so commits by the Actions bot and other people are not counted), committer date, all branches the API default returns. Forks are excluded (`repos.include_forks`). Release lines use GitHub Releases only (drafts skipped); tags without a release have no notes or reliable date in the API. The git-based backfill (`--git`) does turn tags into releases.
- Issues: counts from the search API (opened / closed in the week, public issues only, pull requests excluded). Optional: if the search API is rate limited the entry just omits the line.
- Backfill window defaults to 26 weeks (`backfill_weeks`), starting at the first week with any activity. It runs automatically on the first deploy (no snapshots yet) or when asked via the `backfill` input.

## Output

- **No LLM calls.** Entry lines are templates in `scripts/lib/lines.mjs`, one set in English and one in Spanish, 3 to 6 per entry. They are generated at build time from the snapshots, so improving a template improves old entries too. When a week is too quiet for 3 lines, honest fillers are used (running commit total since the first entry, entry number), never made-up facts.
- **Bilingual**: every UI string and every data line is emitted in both languages; CSS shows the active one. The toggle works without a reload, is remembered (`localStorage`), `?lang=es` forces it, and the first visit follows the browser language. Without JavaScript, English shows.
- **Charts** are inline SVG built at build time, no chart library. Line chart: top 5 plugins by downloads each get a line, the rest are summed into one dashed gray "Other plugins" line (30 lines would be unreadable). Series colours are the validated categorical slots 1–5 (light and dark values), checked with the dataviz palette validator (worst adjacent colour-blind ΔE 9.1 light / 8.4 dark). Three of the light colours are below 3:1 contrast on paper, so the chart always has a legend, hover tooltips and a full data table (`<details>`) as the relief the validator asks for.
- **Commits per week** is a bar chart of the last 26 weeks. Weeks without a snapshot are blank, not zero. Lighter bars are backfilled weeks.
- **Notes**: `notes/YYYY-Www.md` appears in both languages; `.es.md` / `.en.md` variants only in their language. A tiny built-in Markdown subset renders them; raw HTML is escaped. A note for a week with no snapshot still gets an entry.
- **Deploy**: the workflow builds `dist/` and force-pushes it as a single commit to the `gh-pages` branch, using only the default `GITHUB_TOKEN`. The site is derived data, so rewriting that branch loses nothing; the history that matters lives in `data/` on the default branch and is only ever appended. Needs one setting by hand: Pages → source `gh-pages` / root.
- **Links are relative** (`stats.html`, `assets/…`) so the site works under `/build-log/`. `check-site.mjs` rejects root-absolute links.
- **Dependencies**: none at runtime (Node 22, built-in `fetch`). Playwright is only used by `./score` for the browser rung and is installed on demand (`npm install --no-save playwright`), so there is no lockfile to maintain.

## Testing without the real account

- `test/mock-github.mjs` is a deterministic fake of the GitHub REST API and the Obsidian raw files (a demo user with two plugins, two lab repos, a fork, an empty repo, 14 weeks of commits). Scripts talk to it through `GITHUB_API_URL` and `OBSIDIAN_RAW_URL`, so the real HTTP, pagination, discovery and schema code paths are exercised. `BUILD_LOG_NOW` fixes "now" so "the week that just ended" is reproducible.
- What this cannot prove: how the real account's repos are laid out (lab apps) and GitHub-side behaviour (Pages, push permissions). That is what the CI dry-run job is for: it runs the same fetch against the real API in Actions.
- `./score --live` additionally runs a real-API fetch for this repository only (`--repos build-log`), the one thing the build session's API access allowed.

## Process

- The ladder in `score` was written to match the brief's R0–R6 and extended, never loosened. One check was found to match a comment in `weekly.yml` by accident; the comment was reworded, the check was left alone.
- Commit and push at least every 30 minutes, STATE.md / NEXT.md / PROGRESS.md kept current.
