# NEXT

## Now
1. Push, open the draft PR, read the `ci` run: both jobs (`score`, `dry-run`) must be green. The `dry-run` job is the first time the code talks to the real GitHub API for the whole account, so a failure there is likely a real-account detail (repo layout, lab apps, rate limit): fix it.
2. Write RESULTS.md (R6 requires it), run `./score`, commit, push.

## How to resume
`git pull`, read STATE.md, run `./score` (needs Node 22 and Playwright for R5: `npm install --no-save playwright && npx playwright install chromium`). Fix the first failing rung. Never edit `score` to make a check pass; only add checks.

## Blockers
- The build sandbox could only call the GitHub API for this repo, and only through the MCP tools / `gh`; direct calls from Node with the environment token returned 401 and unauthenticated ones 403. So the real-account path (`/users/<user>/repos`, per-repo commits and releases, lab discovery) has only been tested against `test/mock-github.mjs`. The `dry-run` job in `ci.yml` runs it for real.
- Printing part of the environment token to debug the 401 was denied by the permission classifier; that route was dropped and the token was not touched again.
- The repo was empty and this branch is the only branch, so GitHub may treat it as the default branch. The weekly cron only runs from the default branch and the workflow checks out that branch: if the repo's default branch is not where this code lands (after merging), set it in Settings → Branches.
- The brief's placeholders (plugin ids, Hidden Problems Lab repo names, Tinta repo) were never filled in. See DECISIONS.md.
