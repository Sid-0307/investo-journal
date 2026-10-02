import test from 'node:test';
import assert from 'node:assert/strict';
import { localDate, localStamp, isMarketDay } from '../scripts/lib.js';

test('converts UTC instants to the correct Asia/Kolkata date and time', () => {
  const d = new Date('2026-10-01T04:30:00.000Z');
  assert.equal(localDate(d), '2026-10-01');
  assert.equal(localStamp(d), '2026-10-01 10:00:00 IST');
});
test('uses Kolkata calendar date near UTC midnight', () => {
  assert.equal(localDate(new Date('2026-10-01T20:00:00.000Z')), '2026-10-02');
});
test('excludes weekends and configured Indian market holidays', () => {
  assert.equal(isMarketDay(new Date('2026-10-03T05:00:00.000Z')), false); // Saturday IST
  const prior = process.env.NSE_HOLIDAYS;
  process.env.NSE_HOLIDAYS = '2026-10-02';
  assert.equal(isMarketDay(new Date('2026-10-02T05:00:00.000Z')), false);
  if (prior === undefined) delete process.env.NSE_HOLIDAYS; else process.env.NSE_HOLIDAYS = prior;
});
