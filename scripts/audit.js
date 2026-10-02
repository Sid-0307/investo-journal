import { readJson, writeJson, localStamp } from './lib.js';

export function auditRecords(reports, portfolio, auditedAt = new Date()) {
const audits = {};
const days = [...new Set(reports.map(r => r.date))];
for (const date of days) {
  const dayReports = reports.filter(r => r.date === date);
  const findings = [];
  const byType = Object.fromEntries(dayReports.map(r => [r.type, r]));
  for (const type of ['opening', 'closing']) if (!byType[type]) findings.push({ level: 'WARN', code: `MISSING_${type.toUpperCase()}`, message: `No ${type} report is recorded for this date.` });
  for (const r of dayReports) {
    if (r.date !== r.generatedAtIST?.slice(0, 10)) findings.push({ level: 'FAIL', code: 'DATE_MISMATCH', reportId: r.id, message: 'Record date does not match its Asia/Kolkata timestamp.' });
    if (!r.generatedAt || !Number.isFinite(Date.parse(r.generatedAt))) findings.push({ level: 'FAIL', code: 'INVALID_TIMESTAMP', reportId: r.id, message: 'Generated timestamp is missing or invalid.' });
    else if (localStamp(new Date(r.generatedAt)) !== r.generatedAtIST) findings.push({ level: 'FAIL', code: 'TIMEZONE_MISMATCH', reportId: r.id, message: 'Local timestamp does not match the UTC instant converted to Asia/Kolkata.' });
    if (!r.summary || !r.status || !r.type) findings.push({ level: 'FAIL', code: 'INCOMPLETE_REPORT', reportId: r.id, message: 'Required report fields are missing.' });
    if (r.status === 'PUBLISHED') {
      if (!r.dataAsOf || !Number.isFinite(Date.parse(r.dataAsOf)) || Date.parse(r.dataAsOf) > Date.parse(r.generatedAt) || Date.parse(r.generatedAt) - Date.parse(r.dataAsOf) > 86400000) findings.push({ level: 'WARN', code: 'STALE_OR_INVALID_DATA', reportId: r.id, message: 'Data timestamp is missing, future-dated, or older than 24 hours.' });
      if (!r.sources?.length) findings.push({ level: 'FAIL', code: 'MISSING_SOURCES', reportId: r.id, message: 'Published analysis has no source links.' });
      for (const s of (r.sources ?? [])) if (!s.name || !/^https:\/\//.test(s.url ?? '')) findings.push({ level: 'FAIL', code: 'INVALID_SOURCE', reportId: r.id, message: 'A source is missing a name or HTTPS link.' });
      for (const [k, v] of Object.entries(r.metrics ?? {})) if (typeof v === 'number' && !Number.isFinite(v)) findings.push({ level: 'FAIL', code: 'INVALID_NUMBER', reportId: r.id, message: `Metric ${k} is not finite.` });
      for (const claim of (r.claims ?? [])) if (!claim.id || claim.value == null || !/^https:\/\//.test(claim.sourceUrl ?? '')) findings.push({ level: 'FAIL', code: 'UNCITED_OR_INCOMPLETE_CLAIM', reportId: r.id, message: 'Structured analysis claims need an ID, value, and HTTPS source URL.' });
    } else findings.push({ level: 'WARN', code: r.status, reportId: r.id, message: r.unavailableReason || 'Market data was unavailable; no figures were invented.' });
    for (const action of (r.actionLog ?? [])) {
      if (!['BUY', 'SELL'].includes(action.kind)) findings.push({ level: 'FAIL', code: 'INVALID_ACTION_KIND', reportId: r.id, message: 'Action log contains an unrecognized action type.' });
      if (action.amountCents != null && (!Number.isInteger(action.amountCents) || action.amountCents < 0)) findings.push({ level: 'FAIL', code: 'INVALID_ACTION_AMOUNT', reportId: r.id, message: 'Action log contains a negative or non-integer amount.' });
      if (action.kind === 'BUY' && action.amountCents != null && action.amountCents > portfolio.capitalCents) findings.push({ level: 'FAIL', code: 'ACTION_EXCEEDS_CAPITAL', reportId: r.id, message: 'Action amount exceeds the total capital plan.' });
    }
  }
  const opening = byType.opening, closing = byType.closing;
  const standaloneCorrections = dayReports.filter(r => r.type === 'correction');
  for (const r of standaloneCorrections) for (const c of (r.corrections ?? [])) if (!c.reason || !/^https:\/\//.test(c.sourceUrl ?? '') || !c.corrects) findings.push({ level: 'FAIL', code: 'UNSUPPORTED_CORRECTION', reportId: r.id, message: 'Every correction needs a reason, HTTPS source URL, and referenced report.' });
  if (opening && closing) {
    const openingActions = opening.actionLog ?? [], closingActions = closing.actionLog ?? [];
    const hasCorrection = (closing.corrections ?? []).length > 0 || reports.some(r => (r.corrections ?? []).some(c => [opening.id, closing.id].includes(c.corrects)));
    if (openingActions.length && closingActions.length && JSON.stringify(openingActions) !== JSON.stringify(closingActions) && !hasCorrection) findings.push({ level: 'WARN', code: 'ACTION_LOG_CONTRADICTION', message: 'Opening and closing action logs differ without an appended correction note.' });
    const closeClaims = new Map((closing.claims ?? []).map(c => [c.id, c]));
    for (const claim of (opening.claims ?? [])) {
      const later = closeClaims.get(claim.id);
      if (later && JSON.stringify(claim.value) !== JSON.stringify(later.value) && !hasCorrection) findings.push({ level: 'WARN', code: 'ANALYSIS_CLAIM_CONTRADICTION', message: `Structured claim “${claim.id}” changed between opening and closing without a correction note.` });
    }
    for (const c of (closing.corrections ?? [])) if (!c.reason || !/^https:\/\//.test(c.sourceUrl ?? '')) findings.push({ level: 'FAIL', code: 'UNSUPPORTED_CORRECTION', message: 'Every closing correction needs a reason and HTTPS source URL.' });
  }
  const recordedActions = portfolio.actions ?? [];
  const actionTotal = recordedActions.reduce((sum, a) => sum + (Number.isInteger(a.amountCents) ? (a.kind === 'BUY' ? a.amountCents : a.kind === 'SELL' ? -a.amountCents : 0) : 0), 0);
  if (actionTotal !== portfolio.deployedCents) findings.push({ level: 'FAIL', code: 'PORTFOLIO_ACTION_MISMATCH', message: 'Portfolio deployed total does not match the sum of logged BUY actions.' });
  if (!Number.isInteger(portfolio.deployedCents) || portfolio.deployedCents < 0 || portfolio.deployedCents > portfolio.capitalCents) findings.push({ level: 'FAIL', code: 'INVALID_PORTFOLIO_TOTAL', message: 'Deployed amount must be a non-negative integer within total capital.' });
  for (const r of dayReports) if (Number.isInteger(r.metrics?.deployedCents) && r.metrics.deployedCents !== portfolio.deployedCents) findings.push({ level: 'FAIL', code: 'REPORT_PORTFOLIO_MISMATCH', reportId: r.id, message: 'Report deployed total does not match the portfolio ledger.' });
  if (Number.isInteger(portfolio.deployedCents) && Number.isInteger(portfolio.capitalCents) && portfolio.capitalCents - portfolio.deployedCents < 0) findings.push({ level: 'FAIL', code: 'NEGATIVE_CASH', message: 'Deployed capital exceeds total capital.' });
  const max = findings.some(f => f.level === 'FAIL') ? 'FAIL' : findings.some(f => f.level === 'WARN') ? 'WARN' : 'PASS';
  audits[date] = { date, status: max, auditedAt: auditedAt.toISOString(), reportIds: dayReports.map(r => r.id), findings };
}
return audits;
}

if (process.argv[1]?.endsWith('audit.js')) {
  const reports = readJson('data/reports/index.json');
  const portfolio = readJson('data/portfolio.json');
  const previous = readJson('data/audits/index.json');
  const latest = auditRecords(reports, portfolio);
  const audits = { ...previous };
  for (const [date, result] of Object.entries(latest)) audits[date] = [...(Array.isArray(previous[date]) ? previous[date] : previous[date] ? [previous[date]] : []), result];
  writeJson('data/audits/index.json', audits);
  console.log(`Audited ${Object.keys(audits).length} journal date(s).`);
}
