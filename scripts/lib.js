import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TZ = 'Asia/Kolkata';
export const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
export const writeJson = (p, v) => fs.writeFileSync(path.join(ROOT, p), `${JSON.stringify(v, null, 2)}\n`);
export const isoNow = () => new Date().toISOString();
export function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
export function localDate(date = new Date()) { const p = localParts(date); return `${p.year}-${p.month}-${p.day}`; }
export function localStamp(date = new Date()) { const p = localParts(date); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} IST`; }
export function isMarketDay(date = new Date()) {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(date);
  const holidays = (process.env.NSE_HOLIDAYS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return day !== 'Sat' && day !== 'Sun' && !holidays.includes(localDate(date));
}
export function formatINR(cents) { return `₹${Math.round(cents / 100).toLocaleString('en-IN')}`; }
