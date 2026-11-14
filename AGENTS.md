ㄴ# Repository Guidelines

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
- Navigation order (superseded 2026-11-14 from three tabs): AI / 바이오 / 미국대표 ETF / KOSPI / KOSDAQ, driven by `COMPARISON_THEMES` in `theme-tabs.mjs`. AI pages retain SOX above navigation. `/bio/`, `/us/`, `/kospi/` and `/kosdaq/` begin with the five theme links and use the complete designed comparison content without SOX: header, comparison, normalized ranking, stock-history chart and return links. BIO must retain the exact `BIO ETF MONITOR` header, Korean title, four-ETF description and local section menus from the sharing file. Confirm tab destinations and this order after changes.

### Daily FunETF Bio Comparison

- Source: the exact four-product `COMPARISON_URL` in `all-holdings/bio-comparison.mjs`. Use its reported counts, TOP10 weights and source date; do not substitute complete official holdings or invent historical values for this table.
- Before building locally, run `node --use-system-ca refresh-bio-comparison.mjs`, then the verified build command above. Collection validates four ordered ETFs, ten ranked rows each, source date and totals; only validated results replace `state/bio-comparison.json` atomically.
- The daily workflow runs comparison collection even for `refresh=false`, then builds, deploys and sends the link. Collection/build failure must stop publication and sending; never add a silent stale-data fallback or `continue-on-error`. Builds require a comparison checked on the current Korean calendar day, with a source date no more than seven days old. Holidays may retain the latest source date; show it separately from the check time.
- Verify `/all-holdings/bio/` contains all four products, forty holdings cells, the source date and the new check timestamp after deployment. Test parser failures and publication guards with `node --test all-holdings/bio-comparison.test.mjs`. Keep secrets out of snapshots and logs.
- Telegram links carry the workflow run ID as `?v=...`; theme links carry the comparison check timestamp. Preserve these version queries so cached earlier pages are not reused after a new publication.
- Preserve daily captures in `state/bio-comparison-history.json`; replace a same-day capture rather than appending duplicates. Commit this file with the latest snapshot before publication. Never backfill invented observations.
- Bio ranking normalizes each ETF's displayed TOP10 by its actual row sum to 100%, then averages across all four ETFs equally (25% each). TOP10-outside contributes zero only to this ranking, not to actual-weight graphs: use unknown/null and gaps there. Show both original and normalized weights. Stock selection must synchronize the ranked button, selector, four-ETF graph, legend and exact-date table. Ranking and the comparison table stay TOP10-only; only the actual-weight graph may use full-holdings history (see "Comparison Trend History" below).
- Verified on 2026-11-14 in [run 43542032376](https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43542032376): 89 tests passed; collection, build, deployment and Telegram API delivery succeeded. Public bio HTML returned HTTP 200 with source date 2026-11-13, forty original holdings cells, twenty-five ranked stocks and check timestamp 2026-11-14T01:41:14.733Z. This is the first captured day; do not claim earlier observed history.
- Display TOP10 comparison and ranking columns as normalized percentages. Use `normalizeTop10` with largest-remainder allocation of hundredths so every displayed ETF column sums to exactly 100.00%; keep raw weights separately labeled and preserve source snapshots. Rank using full-precision normalized values, not rounded display values. Do not merely replace an inconsistent total with the literal 100.
- Both bio tables must use `bioStockColors(snapshot)` for the same security-code-to-color mapping. Preserve the comparison table's color across the entire ranking row, including selection; indicate selection with a border or underline rather than replacing the stock color.
- Netlify sharing artifact: `output/netlify-bio/index.html` is standalone and intentionally excludes AI navigation and the SOX card/script. Preserve these exclusions when refreshing the share file. Beside the stock-history heading, retain the link to `#bio-ranking-title` for returning to the ranking table; verify that its target ID exists exactly once. File edits require re-uploading the folder to update a manually deployed Netlify site.
- Rebuild the designed sharing artifact with `node build-bio-share.mjs` after the normal bio collection/build. This embeds the licensed Pretendard font, applies `bio-design.mjs` and copies the font license. Preserve the reference's white background, fine gray table grid, pale row-group cells and existing security colors. Beside the history heading, keep both return links (`#bio-ranking-title` and `#bio-comparison-title`) visible and wrapping on mobile. Verify each target exists once, all four normalized sums stay 100.00%, and stock-selection scripts still compile.
- Phone layout (2026-11-14, run 43557064765): at widths up to 760px, `comparisonTable` hides the wide table and shows one horizontally swipeable `.bio-mobile-cards` card per ETF (TOP10 names, codes, normalized and raw weights, 100.00% total, same `bioStockColors`). Desktop keeps the table. Comparison row headers are deliberately not sticky (`position:static`) so horizontal scrolling never covers stock names. The ranking table has not been converted to cards yet.
- Comparison stock chart (user-directed 2026-11-14; supersedes the short-lived per-ETF faded-line section `productWeightCharts`, which was removed): one chart per selected stock showing each ETF's actual weight (left axis, fitted range with padding, 0 only when data are near 0) and the stock's daily close as a black dashed line (right axis). Vertical dashed lines mark days when any ETF changed the weight by ±0.5%p or entered/exited (red up, blue down); ▲▼/편입/편출 use the ETF colour. The chart is a wide `figure.flow-chart` (about 62px per date) driven by the shared `zoomScript` from `grouped-weight-report.mjs`, so it auto-scrolls with pause/slower/faster like the AI tab. Do not add faded all-holdings lines to comparison tabs. The AI tab keeps its per-ETF faded-line charts (including TIME 나스닥100 and 글로벌AI) unchanged.
- Stock prices: `build-all-holdings.mjs` fetches prices for every AI product and every comparison `historyId` with at least two holdings source dates (each security once), plus TOP10-only comparison codes that no full-holdings ETF holds (six-digit Korean codes; plain US tickers in overseas universes only). `priceKey` maps "AMD US EQUITY" to "AMD". AI-tab price summaries/tables are collapsed `<details class="price-panel">` (click the title to expand); the price line in the chart stays visible. Price failures never block publication.
- Browser scripts live in template literals: avoid backslash regex escapes there (`\s` collapses to `s`). AI chart scripts bind only to `figure[id^="g-"]`.
- Keep the sharing layout compact: comparison/ranking rows target 46px on desktop (44px on mobile) with 6px vertical padding; headers target 88px/84px. Avoid restoring the earlier 66px rows and oversized section gaps. Keep names, codes and raw weights readable.
- The existing dashboard's bio tab and Netlify `index.html` must use the same `bioThemePage`/`applyBioDesign` rendering and data. Only the dashboard adds AI/바이오 theme navigation. Do not embed or paste a stale exported HTML snapshot into the dashboard. Preserve the complete design, embedded font, compact spacing, comparison/ranking colors and all three section-return links during daily rebuilds.

### US Representative ETF Tab

- `/all-holdings/us/` uses the identical BIO design and controls with five products in this order: TIME 미국나스닥100액티브 (426030), TIME 글로벌AI인공지능액티브 (456600), KoAct 글로벌AI메모리반도체액티브 (0174B0), KoAct 미국로봇피지컬AI액티브 (0186L0), KoAct 미국나스닥성장기업액티브 (0015B0). Verified FunETF ISINs and names are in `comparison-config.mjs`.
- Collect with `node --use-system-ca refresh-bio-comparison.mjs us`; retain `state/us-comparison.json` and `state/us-comparison-history.json` separately from BIO history. The workflow checks both sources before building, then commits both histories before deployment and sending. Failed validation stops the run.
- Reuse the same renderer and stock selection behavior. Expect fifty TOP10 entries and five ETF lines; normalize each displayed ETF column to exactly 100.00% and weight each ETF 20% for ranking. Preserve exact BIO wording on BIO; use US wording only on the US page.
- Foreign tickers, Japanese numeric codes and alphanumeric Korean tickers must validate. FunETF may omit a ticker for a futures contract: retain the actual instrument name as a stable internal `NAME:` key and display `코드 미제공`; never invent a market ticker or drop that row. The page notes that global ETF holdings can include Korean/Japanese stocks, ETFs and futures. TOP10-outside remains unknown for actual-weight history charts.
- Verify `node --test all-holdings/us-comparison.test.mjs` and the full suite. Confirm three navigation links, correct active tab, BIO/share main-content parity after removing only theme navigation, all section anchors, embedded font, same compact design, and no SOX in either comparison page.
- Verified deployment: [run 43548249470](https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43548249470) passed 94 tests, collected both sources, deployed and sent the Telegram link. Public AI, BIO and US pages returned HTTP 200 with three tabs and the expected content. Both comparison source dates were 2026-11-13; US observations begin 2026-11-14. Preserve this working flow rather than maintaining a separate manually copied BIO page.
- Do not assume a raw TOP10 total over 100 is solely rounding. On 2026-11-13, TIGER official data had ten stocks totaling 100.24% and an eleventh entry, 원화예금, at -0.23% (combined rounded total 100.01%). FunETF's one-decimal TOP10 values sum to 100.2%. Check all holdings before explaining discrepancies; preserve negative cash in official source data.

### KOSPI / KOSDAQ Comparison Tabs

- `/all-holdings/kospi/`: TIME 코스피액티브 (385720), KoAct 코스피액티브 (0193G0), TIME 코리아밸류업액티브 (495060), KoAct 코리아밸류업액티브 (495230); 25% each. `/all-holdings/kosdaq/`: TIME 코스닥액티브 (0162Y0), KoAct 코스닥액티브 (0163Y0); 50% each. Pairs follow the TIME–KoAct matching analysis below. ISINs (check digits validated against existing ISINs) and FunETF headers were verified on 2026-11-14 in `comparison-config.mjs`.
- Collect with `node --use-system-ca refresh-bio-comparison.mjs kospi` and `... kosdaq`; state is `state/{kospi,kosdaq}-comparison(.json|-history.json)`. The workflow verifies all four universes before building and commits all histories. Domestic universes (`market:'국내주식'`) require six-character codes like BIO.

### Comparison Trend History

- `all-holdings/comparison-trends.mjs` joins each comparison ETF with `state/cumulative.json` through `historyId` in `comparison-config.mjs` (product name must match exactly). Full holdings give actual weight, or 0% as verified non-holding; TOP10-only days outside the TOP10 and days before collection stay null/gaps. US venue suffixes (UW/UQ/UN/UA → US) are aliased; unresolvable `NAME:` instruments show `코드 연결 불가`, except the verified `NQZ6 INDEX` alias. Past holdings appear as `과거 기록` selections; cash is excluded.
- `refresh.mjs` adds TIME K바이오 (idx 13, `theme:'bio'`) and, via `bio-holdings.mjs`, full official holdings for TIGER 364970, KoAct 462900 and KODEX 244580. A failed bio source only leaves that ETF's day unknown and emits a `::warning::`; it never blocks the AI refresh or substitutes older data. HTTP 429/5xx stops the date walk-back immediately. Bio products are excluded from the AI tab by `themeHistory`.
- First run 2026-11-14: TIME 13, TIGER and KODEX saved (source date 2026-11-13); KoAct (samsungactive.co.kr) returned HTTP 429 repeatedly and was skipped. Avoid repeated local retries against that host. State before the first run is backed up in `backups/pre-bio-holdings-20261114/`.
- KoAct full holdings (all seven comparison-tab KoAct ETFs, `KOACT_PRODUCTS` in `bio-holdings.mjs`; ids 2ETFU5/U7/Q1/V2/P3/U6/J9) come from `https://www.samsungactive.co.kr/api/v1/product/etf-pdf/{id}.do?gijunYMD=YYYYMMDD`, which serves any past business date. Codes look like `MU US Equity`, `6857 JP Equity`, `005930` and link through `comparison-trends.mjs`. Stored in `cumulative.json` under the ticker with `theme:'koact'` (bio fund `theme:'bio'`); `themeHistory(...,'ai')` and `build-dashboard.mjs` exclude any themed product so the AI tab and root dashboard stay TIME-only.
- `refresh.mjs` fetches KoAct daily, sequentially with 1.5s pauses; HTTP 429/5xx stops immediately and skips the rest with `::warning::` (that ETF-day stays unknown). Past days: `node --use-system-ca backfill-koact.mjs`, or dispatch the workflow with `-f backfill_koact=true`. It fills each existing day with KoAct holdings for that day's TIME source date, saves after every day, stops on a rate limit and resumes on the next run. Never change the User-Agent or otherwise try to evade the rate limit; wait or run from GitHub Actions.
- KoAct overseas funds list an unweighted `CASH00000001 설정현금액` line; `parseSamsungHoldings` skips unweighted `KRD…`/`CASH<digit>…` cash lines only. Validation errors name the offending rows. All seven KoAct ETFs were backfilled for 62 days (2026-09-13 onward) on 2026-11-14 (runs 43561180023 and 43563454552).
- Bio TIME K바이오 (13), TIGER 364970 and KODEX 244580 past days come from FunETF dated holdings (`funetf-holdings.mjs`: `/api/public/product/view/etfpdf?itemId={ISIN}&gijunYmd=YYYYMMDD&etfPdfYmd=YYYYMMDD`, weight `evP`, cash by `grpItmNo` KRD…). Run `node --use-system-ca backfill-funetf.mjs` (2s pacing, same resume rules); daily days still come from official sources via `refresh.mjs`. Filled 2026-11-14 locally: 183 product-days, backup in `backups/pre-funetf-bio-20261114/`.
- Return trend: every comparison tab shows FunETF cumulative NAV returns (`returns-chart.mjs`, `/api/public/compare/view/etfchart`, `schSuikMode=T`) under the comparison table; fetched at build time, failure only omits the section.
- Range selector (2026-11-14): 1년/3년/5년/10년 buttons plus start/end date inputs and 조회; the browser rebases every series to the selected start ((1+v)/(1+base)−1). `fetchLongReturns` requests each ETF alone (a multi-ETF request is cut to the youngest listing): `schSuikPeriod=120` (weekly, FunETF's 10-year limit) and `12` (daily), joined by `spliceReturns`; indices come from the ETF reaching back furthest. Later-listed ETFs start at 0% on their first point. If the long fetch fails, the build falls back to the old combined 12-month request.
- Tests: `node --test all-holdings/comparison-trends.test.mjs bio-holdings.test.mjs funetf-holdings.test.mjs all-holdings/returns-chart.test.mjs`. Verified deployment: [run 43553793396](https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43553793396) passed 104 tests, verified all four comparison universes, deployed and sent the Telegram link; public bio/us/kospi/kosdaq pages returned HTTP 200 with five tabs and 100.00% normalized totals.

### Period TOP10 Comparison (기간별 TOP10)

- Every comparison tab shows `ETF별 구성종목 TOP10 기간 비교` after `선택 종목 · ETF별 날짜별 비중 변화` (`all-holdings/period-holdings.mjs`): ETF buttons, period buttons 1개월 전 / 3개월 전 / 6개월 전 / 상장일, left = current TOP10 with change (current − past, %p, `신규` if not held then), right = past TOP10 (`현재 미보유` tag). Cash rows are excluded; securities match by ISIN (`grpItmNo`).
- Both sides use FunETF dated PDF (`etfpdf`, weight `evP`) so the change column compares the same source; FunETF weights differ slightly from official lists. Verified 2026-11-14: FunETF 2026-10-13 KoAct 0174B0 weights match official KoAct history within cash scaling.
- Listing date: single-ISIN `etfchart` with `schSuikPeriod=120` starts in the listing week; the first day with ≥5 weighted rows near it is the listing (pre-listing days list only `설정현금액`). FunETF publishes no weights (evP null) for many active ETFs before 2023-12-13; those ETFs binary-search the first weighted date and label it `FunETF 비중 공개 시작`, never as the listing date. KODEX 바이오 has weights to FunETF's 10-year limit.
- Cache: `state/period-holdings.json` (committed by the workflow); dated holdings are fetched once, unreferenced dates pruned. Pacing 1.5s; HTTP 429/5xx stops further requests; failures only omit that ETF/period with `::warning::`. Test: `node --test all-holdings/period-holdings.test.mjs`.

### TIME–KoAct Matching Analysis

- Verified 2026-11-13 same-date official holdings for 18 TIME and 24 KoAct ETFs; results and source URLs are in `reports/analysis/time-koact-matching-20261113.md` and `.json`. Two other KoAct products (China bio and global K-culture) returned HTTP 429 and are unverified; do not claim an exhaustive 26-product holdings comparison. Respect rate limits and reuse dated snapshots.
- Match security codes across complete holdings, not fund names or TOP10 alone. Compare positive directly held stocks after normalizing each fund's included equity weights to 100%; overlap is the sum of the smaller normalized weight for each shared stock. Exclude cash, bonds, futures and ETF units; do not silently look through ETFs. Report stock coverage and separate strategy suitability from the numerically highest overlap. Keep US venue aliases consistent, recognize C1/C2 equity codes and unlisted equity ISINs, and keep different share classes/ADRs distinct.
- Baseline thematic pairs for current TIME five: global AI ↔ KoAct global AI & robots; Nasdaq100 ↔ Nasdaq growth companies; KOSPI ↔ KOSPI; Korea value-up ↔ Korea value-up; KOSDAQ ↔ KOSDAQ. Domestic bio is an additional pair. These are comparison candidates, not identical substitutes. Global AI vs KoAct AI memory semiconductors had only five common stocks and 5.73% normalized equity overlap on that date; do not infer closeness from the shared AI label.
