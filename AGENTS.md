# Repository Guidelines

## Project Structure & Module Organization

This Node.js project collects ETF holdings, builds dashboards, and sends Telegram links.

- Root `.mjs` files handle collection (`refresh.mjs`, `bio-holdings.mjs`), dashboard builds, weight reports, and notification delivery (`notify.mjs`).
- `all-holdings/` contains dashboard rendering, browser interactions, theme tabs, and stock-price modules.
- `reports/original/`, `reports/daily/`, and `reports/extended/` preserve separate report variants with independent state and output.
- `state/cumulative.json` stores dashboard holdings history. Preserve it when changing reports.
- `output/site/` contains generated assets deployed to GitHub Pages. `backups/` preserves earlier sources; both are excluded from Git.
- `.github/workflows/dashboard.yml` defines testing, collection, publication, and Telegram delivery.

## Build, Test, and Development Commands

Use Node.js 22+ (CI: Node.js 24). Run commands from the repository root.

- `npm test`: run the repository's selected test suites.
- `npm run refresh`: fetch official holdings and update persistent history; requires network access.
- `npm run build`: generate both dashboards under `output/site/`; includes external price requests.
- `npm run report:original`, `npm run report:daily`, `npm run report:extended`: preview the corresponding report using its default dry-run mode.
- `npm run send`: send the dashboard link to the configured Telegram chat; this produces a real message.

## Coding Style & Naming Conventions

Use ES modules with `.mjs` extensions, explicit relative import extensions, and `node:` imports for built-ins. Follow each file's existing indentation and compact formatting; avoid unrelated reformatting. Use camelCase for functions and variables and kebab-case filenames. No formatter or linter is configured. Keep Korean interface text readable and save files as UTF-8.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`, with filenames ending in `.test.mjs`. `run-tests.mjs` selects root tests and recursively includes `all-holdings/` and `reports/`, excluding backups. Run individual suites with `node --test notify.test.mjs`. Test meaningful changes to history merging, holdings calculations, rendering, and delivery failures; inject mock network responses where practical. No coverage threshold is configured.

## Commit & Pull Request Guidelines

Use concise imperative commit subjects, such as `Update public ETF holdings history`; no prefix convention is required. Pull requests should describe behavior changes, validation, and workflow or history effects. Link relevant issues and include screenshots for dashboard changes.

## Security & Operational Configuration

Keep `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in environment variables or GitHub Actions secrets. `DASHBOARD_URL` overrides the default published link. Never commit credentials or print their values. Scheduled execution targets 06:00 Asia/Seoul; notifications follow successful deployment. Preserve this ordering and avoid duplicate scheduled senders. Do not delete backups or replace historical data as part of routine development.

## GitHub Authentication & Telegram Delivery Runbook

**Do not interpret a sandbox authentication failure as proof that credentials have expired.** On 2026-11-14, sandboxed `gh auth status` reported invalid authentication and workflow dispatch returned HTTP 401, while the same Windows keyring credentials worked outside the sandbox. Missing local Telegram environment variables also do not mean GitHub Actions secrets are missing.

When the user requests Telegram delivery:

1. Read `MIGRATION-STATUS.md` through its final entries and inspect `.github/workflows/dashboard.yml`. Earlier migration entries describe superseded states. Verify recent successful runs in `kns7676-commits/time-etf-dashboard`; do not reactivate the old `time-ai-weekly` sender.
2. Check `gh auth status`. If authentication fails inside the sandbox, use the supported `exec_command` escalation (`sandbox_permissions: "require_escalated"`) to check the existing keyring authentication outside it, subject to the environment's approval policy. Do not bypass a rejection. Never print tokens or inspect secret values.
3. Only conclude that authentication needs repair after checking the appropriate execution environment and returned evidence. Do not request new credentials, secret registration, or browser login solely because the sandbox failed. Prefer the authenticated CLI over browser automation when it works.
4. For an authorized test using existing holdings, run `gh workflow run dashboard.yml --repo kns7676-commits/time-etf-dashboard -f refresh=false` in the working authentication context. Use collection only when requested or needed. This workflow builds and publishes before sending a real Telegram link.
5. Record the returned run URL and monitor that specific run with `gh run watch <run-id> --repo kns7676-commits/time-etf-dashboard --exit-status`. Verify the `Send published dashboard link` step succeeds before reporting delivery success. If dispatch outcome is uncertain, inspect recent runs before retrying to avoid duplicate messages.
6. Distinguish dispatch accepted, workflow completed, Telegram API success, and user-confirmed receipt. Report the verified result and run URL; do not claim handset receipt without user confirmation. If blocked, state the exact failed check and environment rather than saying delivery is impossible.

## Reuse Proven Procedures & Record Success

- Before operational work, read this guide and reuse the applicable verified procedure. Do not restart discovery, repeat unsuccessful approaches, or ask the user to repeat setup already recorded as working. Repeat execution and necessary outcome verification, not the entire troubleshooting process.
- After a newly successful operational procedure or a resolved failure, update this file with its purpose, exact reusable commands, repository, required execution context, prerequisites, verification method, and known failure/fix. Record dated evidence such as run URLs. Store credentials only in their existing secure locations, never in this guide.
- For an unchanged procedure, reuse the entry and record new execution evidence in `MIGRATION-STATUS.md` when useful; do not append duplicate instructions. If behavior changes, revise the affected procedure and clearly supersede stale guidance.
- A past success is the preferred starting point, not a guarantee of external service availability. If it fails, compare the current environment and error with the recorded prerequisites, investigate the specific difference, and update the procedure after verification. Do not silently substitute a previously failed path or report success without checking the current result.

### Verified Telegram Test Delivery — 2026-11-14

- Target: `kns7676-commits/time-etf-dashboard`, workflow `dashboard.yml`; existing GitHub Actions secrets supply Telegram credentials. Local Telegram variables are not required for this path.
- Working context: PowerShell GitHub CLI using the existing Windows keyring **outside the sandbox**, through supported escalation and approval. Sandboxed CLI authentication failed; external CLI authentication succeeded without login or credential changes.
- Reuse the dispatch and monitoring commands in steps 4–5 above in this context. For the same authorized delivery request, start with this known working context instead of repeating the sandbox failure or browser fallback. If access is denied, report the blocker and respect the denial.
- Evidence: [morning successful run](https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43535900007); [subsequent test](https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43539413959), whose dashboard deployment and `Send published dashboard link` steps both succeeded. These establish workflow/API success; handset receipt requires user confirmation.

### Verified Local Dashboard Build — 2026-11-14

- On Windows PowerShell, run `npm.cmd test` to avoid the blocked `npm.ps1` execution-policy wrapper. All 79 tests passed; do not change system execution policy.
- Build with `node --use-system-ca build-all-holdings.mjs`. This uses trusted system CAs and resolved `UNABLE_TO_VERIFY_LEAF_SIGNATURE` without disabling certificate verification. Outputs: `output/site/all-holdings/index.html`, `ai/index.html`, and `bio/index.html`.
- Layout order: shared SOX card, two AI/바이오 navigation links, holdings heading, then theme content. The root and `/ai/` preserve existing non-bio ETF content; `/bio/` starts with the FunETF four-product TOP10 comparison. Confirm tab destinations and this order after changes.

### Daily FunETF Bio Comparison

- Source: the exact four-product `COMPARISON_URL` in `all-holdings/bio-comparison.mjs`. Use its reported counts, TOP10 weights and source date; do not substitute complete official holdings or invent historical values for this table.
- Before building locally, run `node --use-system-ca refresh-bio-comparison.mjs`, then the verified build command above. Collection validates four ordered ETFs, ten ranked rows each, source date and totals; only validated results replace `state/bio-comparison.json` atomically.
- The daily workflow runs comparison collection even for `refresh=false`, then builds, deploys and sends the link. Collection/build failure must stop publication and sending; never add a silent stale-data fallback or `continue-on-error`. Builds require a comparison checked on the current Korean calendar day, with a source date no more than seven days old. Holidays may retain the latest source date; show it separately from the check time.
- Verify `/all-holdings/bio/` contains all four products, forty holdings cells, the source date and the new check timestamp after deployment. Test parser failures and publication guards with `node --test all-holdings/bio-comparison.test.mjs`. Keep secrets out of snapshots and logs.
- Telegram links carry the workflow run ID as `?v=...`; theme links carry the comparison check timestamp. Preserve these version queries so cached earlier pages are not reused after a new publication.
- Preserve daily captures in `state/bio-comparison-history.json`; replace a same-day capture rather than appending duplicates. Commit this file with the latest snapshot before publication. Never backfill invented observations.
- Bio ranking normalizes each ETF's displayed TOP10 by its actual row sum to 100%, then averages across all four ETFs equally (25% each). TOP10-outside contributes zero only to this ranking, not to actual-weight graphs: use unknown/null and gaps there. Show both original and normalized weights. Stock selection must synchronize the ranked button, selector, four-ETF graph, legend and exact-date table. Keep this logic separate from the existing AI holdings history.
