# NEXT

## Now
Done. What is left is on the owner (see RESULTS.md): enable Pages (source `gh-pages`), run the weekly workflow once, make sure the default branch holds this code, set `lab.repos` / `lab.manual_apps` in `config.json` (the CI dry-run found 0 lab apps on the real account), add notes.

## How to resume
`git pull`, read STATE.md, run `./score` (needs Node 22 and Playwright for R5: `npm install --no-save playwright && npx playwright install chromium`). Fix the first failing rung. Never edit `score` to make a check pass; only add checks.

## Blockers
- The build sandbox could only call the GitHub API for this repo, and only through the MCP tools / `gh`; direct calls from Node with the environment token returned 401 and unauthenticated ones 403. The real-account path was therefore verified by the `dry-run` job in `ci.yml` (it passed: 48 repos, 29 plugins, 14,212 downloads, W42 93 commits / 32 releases).
- Printing part of the environment token to debug the 401 was denied by the permission classifier; that route was dropped and the token was not touched again.
- The repo was empty and this branch is the only branch, so no pull request could be opened. The weekly cron only runs from the default branch: make sure the default branch holds this code (Settings → Branches).
- Hidden Problems Lab apps: 0 detected on the real account; the layout guess did not match. Needs `lab.repos` or `lab.manual_apps`.
- The brief's placeholders (plugin ids, Hidden Problems Lab repo names, Tinta repo) were never filled in. See DECISIONS.md.
