import { readJson, writeJson, isoNow, localDate, localStamp, isMarketDay } from './lib.js';

const slot = process.env.INVESTO_SLOT === 'closing' ? 'closing' : 'opening';
const now = new Date();
const date = localDate(now);
const key = `${date}-${slot}`;
const reports = readJson('data/reports/index.json');
if (reports.some(r => r.id === key)) {
  console.log(`Immutable record already exists: ${key}; leaving it unchanged.`);
  process.exit(0);
}

const report = {
  id: key, date, type: slot, generatedAt: isoNow(), generatedAtIST: localStamp(now),
  status: 'DATA_UNAVAILABLE', marketSession: isMarketDay(now) ? 'OPEN_SESSION_EXPECTED' : 'MARKET_CLOSED',
  summary: '', dataAsOf: null, sources: [], metrics: {}, sectors: [], tracking: [], claims: [], actionLog: [], corrections: [],
  unavailableReason: ''
};

if (!isMarketDay(now)) {
  report.status = 'MARKET_CLOSED';
  report.summary = 'No Indian market session expected today. No price or fundamental data was requested or inferred.';
  report.unavailableReason = 'Weekend or configured NSE holiday.';
} else if (!process.env.INVESTO_PROVIDER_URL) {
  report.summary = 'Data refresh unavailable. Connect a trusted provider to publish sourced market analysis.';
  report.unavailableReason = 'INVESTO_PROVIDER_URL is not configured.';
} else {
  try {
    const response = await fetch(process.env.INVESTO_PROVIDER_URL, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.INVESTO_PROVIDER_TOKEN ? { authorization: `Bearer ${process.env.INVESTO_PROVIDER_TOKEN}` } : {}) },
      body: JSON.stringify({ date, slot, timezone: 'Asia/Kolkata', policy: 'long-term Indian equities only; no swing, intraday, or F&O' }), signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
    const data = await response.json();
    if (!data.dataAsOf || !Array.isArray(data.sources) || !data.sources.length || !data.summary) throw new Error('Provider response is missing dataAsOf, summary, or source links.');
    const asOf = new Date(data.dataAsOf);
    if (!Number.isFinite(asOf.getTime()) || asOf > now || now - asOf > 24 * 60 * 60 * 1000) throw new Error('Provider data timestamp is invalid, future-dated, or more than 24 hours old.');
    if (data.sources.some(s => !s.name || !/^https:\/\//.test(s.url))) throw new Error('Every source must have a name and HTTPS URL.');
    report.status = 'PUBLISHED'; report.dataAsOf = asOf.toISOString(); report.summary = data.summary;
    report.metrics = data.metrics ?? {}; report.sectors = data.sectors ?? []; report.tracking = data.tracking ?? [];
    report.sources = data.sources; report.claims = data.claims ?? []; report.actionLog = data.actionLog ?? []; report.corrections = data.corrections ?? [];
    // Action log entries are executed actions; no recommendations or market values are synthesized here.
  } catch (error) {
    report.status = 'DATA_UNAVAILABLE'; report.summary = 'Data refresh unavailable. No market figures or analysis were published.';
    report.unavailableReason = error.message;
  }
}
reports.push(report);
reports.sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
writeJson('data/reports/index.json', reports);
console.log(`Saved immutable ${report.status} report ${key}`);
