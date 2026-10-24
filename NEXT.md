# NEXT

## Now
1. R0 scaffold + first push.
2. Libraries (weeks, http, schema), mock GitHub server for tests.
3. fetch.mjs (R1), backfill.mjs (R2), build.mjs + pages (R3), workflows (R4), notes/i18n/Playwright (R5), README (R6), RESULTS.md.

## How to resume
`git pull`, read STATE.md, run `./score` and fix the first failing rung. Never edit `score` to make a check pass; only add checks.

## Blockers
- The sandbox this was built in can only call the GitHub API for this repo (`repos/<owner>/build-log/...`), not `/users/<user>/repos`. So the multi-repo path is tested against a local mock server, not the real account. The first real run happens in GitHub Actions.
- The brief's placeholders (`<plugin-id-*>`, `<repo-name(s)>` for Hidden Problems Lab, `<repo-with-Tinta>`) were never filled in and no other repo was readable. See DECISIONS.md for how each was handled.
