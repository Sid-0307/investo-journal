import { readJson, writeJson, isoNow, localDate, localStamp } from './lib.js';

const reason = process.env.INVESTO_CORRECTION_REASON?.trim();
const sourceUrl = process.env.INVESTO_CORRECTION_SOURCE_URL?.trim();
if (!reason || !/^https:\/\//.test(sourceUrl ?? '')) throw new Error('Set a correction reason and HTTPS source URL.');
const now = new Date();
const reports = readJson('data/reports/index.json');
const corrects = process.env.INVESTO_CORRECTS_REPORT || `${localDate(now)}-opening`;
const target = reports.find(r => r.id === corrects);
if (!target) throw new Error(`Referenced report does not exist: ${corrects}`);
const date = localDate(now);
const stamp = now.toISOString().replace(/\D/g, '').slice(0, 17);
const id = `${date}-correction-${stamp}`;
if (reports.some(r => r.id === id)) throw new Error(`Correction record already exists: ${id}`);
reports.push({ id, date, type: 'correction', generatedAt: isoNow(), generatedAtIST: localStamp(now), status: 'CORRECTION_NOTE', marketSession: 'RECORDED', summary: reason, dataAsOf: null, sources: [{ name: 'Correction source', url: sourceUrl }], metrics: {}, sectors: [], tracking: [], claims: [], actionLog: [], corrections: [{ reason, sourceUrl, corrects }], unavailableReason: '' });
reports.sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
writeJson('data/reports/index.json', reports);
console.log(`Appended correction ${id} for ${corrects}`);
