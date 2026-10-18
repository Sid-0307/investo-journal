# Investo Journal

A public, read-only investing journal for a long-term Indian equity plan. It starts with the plan supplied by the owner: ₹1,00,000 total, ₹10,000 each month for 10 months from October 2026, with unspent cash carried forward. The journal explicitly excludes swing trading, intraday trading, and F&O.

The site is a dependency-free static website. Dated report and audit JSON files live in the repository, so Git history preserves every published change. The scheduled Investo assistant researches and writes the 10:00 AM opening and 3:00 PM closing entries on weekdays in Asia/Kolkata. Each entry is sourced, append-only, and reflects analysis rather than an executed portfolio action. GitHub Actions builds and deploys the site after each repository push. The GitHub workflow is not the research model; it publishes the report authored by the scheduled assistant.

## Local preview

Requires Node.js 24 or newer. From the repository root:

```sh
npm test
npm run build
```

Serve the `dist/` directory with any static file server. For example, `npx serve dist` (requires npm/network on first use). No package installation is required by the project itself.

## Publishing flow

1. The scheduled Investo assistant runs at 10:00 AM and 3:00 PM, Monday through Friday, Asia/Kolkata time.
2. It researches current Indian market developments using primary sources first, writes an opening or closing report, and appends it to `data/reports/index.json` with direct source links and actual timestamps.
3. It appends an audit entry to `data/audits/index.json`. Existing reports and audits are not overwritten.
4. The assistant commits the new records to the default branch. A push-triggered GitHub Actions workflow builds the static site and deploys it to GitHub Pages.
5. The public site is available at https://sid-0307.github.io/investo-journal/.

Scheduled reports contain sourced analysis and a deployment/watchlist view aligned with the plan. They do not represent a trade instruction or an executed action. Market prices and exchange data are only included when the source permits public display and archiving. If reliable sources are unavailable, the report states that clearly rather than inventing figures.

GitHub Actions is a publisher only: each push to `main` builds and deploys the saved repository data to Pages. The manual workflow can republish the saved data or append a sourced correction; it does not call a quote or analysis provider. The weekday 10:00 AM and 3:00 PM research schedule belongs to the scheduled assistant.

## Report schema

A report includes an immutable ID (`YYYY-MM-DD-opening`, `YYYY-MM-DD-closing`, or a correction ID), report type, generated UTC and Asia/Kolkata timestamps, status, concise summary, data timestamp where applicable, direct HTTPS source links, metrics, sectors, tracking items, and corrections. `actionLog` records executed actions only; recommendations are analysis and must not be represented as trades.

Corrections are separate records with a reason and source URL; they never replace earlier reports. The dashboard uses the owner-confirmed aggregate in `data/portfolio.json`; it suppresses an older itemized cost split whenever it does not reconcile to that aggregate. Future portfolio changes require the owner's confirmation. Public visitors have no write or administration controls, and all committed reports and portfolio entries are public.

## Audit and record policy

Each audit checks opening/closing presence, Asia/Kolkata date alignment, timestamps, required fields, data freshness where applicable, HTTPS source links, numeric validity, portfolio totals, action amounts, opening/closing action-log contradictions, and correction notes. Missing or unavailable data yields WARN; malformed dates, unsupported corrections, invalid amounts, or inconsistent portfolio totals yield FAIL. Audit runs are appended to `data/audits/index.json`; past analysis is never silently rewritten.

For a correction discovered after a closing report was saved, use **Actions → Investo journal build and publish → Run workflow → correction**. Provide the report ID, reason, and an HTTPS source URL. The workflow appends a separately dated correction record; it does not replace the earlier opening or closing record.
