# Investo Journal

A public, read-only investing journal for a long-term Indian equity plan. It starts with the plan supplied by the owner: ₹1,00,000 total, ₹10,000 each month for 10 months from October 2026, with unspent cash carried forward. The journal explicitly excludes swing trading, intraday trading, and F&O.

The site is a dependency-free static website. Dated report and audit JSON files live in the repository, so Git history preserves every published change. GitHub Actions refreshes at 10:00 AM and 3:00 PM Asia/Kolkata on weekdays, audits records, and publishes the static site through GitHub Pages. No database is needed for this read-only use case. Reports are append-only by date and type: a retry never replaces an existing report. Corrections belong in a later closing record with a reason and source link.

## Local preview

Requires Node.js 24 or newer. From the repository root:

```sh
npm test
npm run build
```

Serve the `dist/` directory with any static file server. For example, `npx serve dist` (requires npm/network on first use). No package installation is required by the project itself.

## Create and connect the public GitHub repository

1. Create an empty **public** repository named `investo-journal` on GitHub. Leave README, license, and gitignore unchecked because this folder already contains them.
2. In this folder, initialize and push the project:

   ```sh
   git init -b main
   git add .
   git commit -m "Build Investo journal"
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/investo-journal.git
   git push -u origin main
   ```

   Replace `YOUR_GITHUB_USERNAME`. Authenticate with GitHub CLI or Git credential manager when prompted. If your default branch is not `main`, use that branch consistently instead.
3. In **Settings → Actions → General**, allow workflows to have read and write repository permissions. In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**.
4. Open **Settings → Secrets and variables → Actions**. Add repository secrets `INVESTO_PROVIDER_URL` and `INVESTO_PROVIDER_TOKEN` once a provider is selected. Add repository variable `NSE_HOLIDAYS` with comma-separated `YYYY-MM-DD` Indian market holidays for the covered period. Refresh the holiday list when the exchange publishes a new calendar. Secrets are never stored in this repository.
5. Under **Actions**, enable workflows. A workflow dispatch can be used to run an opening or closing refresh manually. The public site URL appears in the workflow deployment and in **Settings → Pages**.

This workspace has no connected GitHub repository or credentials, so it is not created, pushed, or deployed from here.

## Data provider contract

The scheduled job sends an HTTPS `POST` request to `INVESTO_PROVIDER_URL`; when configured, `INVESTO_PROVIDER_TOKEN` is sent as a Bearer token. The provider should return JSON in this shape (numbers are examples of types only, not market data):

```json
{
  "dataAsOf": "2026-10-01T04:25:00.000Z",
  "summary": "A concise, sourced market summary.",
  "metrics": { "nifty50": 0, "sensex": 0 },
  "sectors": [{ "name": "Sector", "note": "Observation" }],
  "tracking": [{ "name": "Gold", "kind": "Commodity", "value": "Provider-sourced value" }],
  "claims": [{ "id": "stable-claim-id", "value": "A sourced analysis assertion", "sourceUrl": "https://example.org/source" }],
  "actionLog": [],
  "corrections": [],
  "sources": [{ "name": "Primary source", "url": "https://example.org/source" }]
}
```

Every published response must include a recent `dataAsOf`, a summary, and at least one HTTPS source. The refresh rejects missing, future, or more-than-24-hour-old data. Use stable `claims` IDs for analysis assertions that should remain consistent across the opening and closing reviews; the audit flags changed values unless a reasoned correction is recorded. `actionLog` is for executed actions, not recommendations; update `data/portfolio.json` with corresponding action entries and deployed total in cents to keep the portfolio ledger consistent. Corrections should be objects with `reason` and `sourceUrl`; they are appended to the closing report and checked by the audit.

Without a configured provider, with an invalid response, or after a provider failure, the workflow stores a clearly marked `DATA_UNAVAILABLE` record and publishes no invented price or fundamental. A market holiday can be supplied through `NSE_HOLIDAYS`; weekends and configured holidays are recorded as `MARKET_CLOSED`. If the holiday list is missing or incomplete, the site cannot independently verify the exchange calendar, so keep it current.

The market history chart uses provider observations in `metrics.history` formatted as `{ "date": "YYYY-MM-DD", "value": 123 }` for the Nifty 50. Only supplied values are drawn; with fewer than two valid observations the chart stays empty.

## Audit and record policy

Each audit checks opening/closing presence, Asia/Kolkata date alignment, timestamps, required fields, provider staleness, HTTPS source links, numeric validity, portfolio totals, action amounts, opening/closing action-log contradictions, and correction notes. Missing/unavailable data yields WARN; malformed dates, unsupported corrections, invalid amounts, or inconsistent portfolio totals yield FAIL. Audit runs are appended to `data/audits/index.json`; past analysis is never silently rewritten. If a closing report corrects an opening view, include the reason and source in the closing record so the discrepancy is reviewable.

The archive is searchable and filterable. Public visitors have no write or administration controls. Changes are made by repository maintainers or scheduled automation, and because the repository is public all committed reports and portfolio entries are public.

For a correction discovered after the closing report was saved, run **Actions → Investo journal refresh → Run workflow → correction**. Provide the exact report ID, the reason, and an HTTPS source URL. The workflow appends a separately dated correction record; it does not replace the earlier opening or closing record.

## Schedule and deployment

The workflow schedules use the explicit `Asia/Kolkata` timezone at 10:00 AM and 3:00 PM, Monday through Friday. GitHub may delay scheduled runs during high system load, so every report records its actual UTC generation instant and Asia/Kolkata timestamp. “Last successful refresh” is derived from the latest successful provider-backed report, never from a hard-coded date. On a provider outage, that timestamp remains the last known successful refresh while the current archive entry shows the unavailable attempt. Keep the workflow enabled; GitHub can disable scheduled workflows in inactive public repositories.
