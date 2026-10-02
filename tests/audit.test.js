import test from 'node:test';
import assert from 'node:assert/strict';
import { auditRecords } from '../scripts/audit.js';

const report=(type, extra={})=>({id:`2026-10-01-${type}`,date:'2026-10-01',type,generatedAt:'2026-10-01T04:30:00.000Z',generatedAtIST:'2026-10-01 10:00:00 IST',status:'DATA_UNAVAILABLE',summary:'Provider unavailable.',sources:[],metrics:{},actionLog:[],corrections:[],unavailableReason:'No provider',...extra});
const plan={capitalCents:10000000,deployedCents:0,actions:[]};

test('warns for missing opening/closing and unavailable data, without failing the journal',()=>{
  const a=auditRecords([report('opening')],plan,new Date('2026-10-01T05:00:00Z'))['2026-10-01'];
  assert.equal(a.status,'WARN');
  assert.ok(a.findings.some(x=>x.code==='MISSING_CLOSING'));
  assert.ok(a.findings.some(x=>x.code==='DATA_UNAVAILABLE'));
});
test('fails date/timestamp mismatches and invalid sourced market records',()=>{
  const a=auditRecords([report('opening',{generatedAtIST:'2026-10-02 10:00:00 IST',status:'PUBLISHED',dataAsOf:'2026-10-01T04:30:00Z',sources:[{name:'Bad URL',url:'http://example.com'}]})],plan)['2026-10-01'];
  assert.equal(a.status,'FAIL');
  assert.ok(a.findings.some(x=>x.code==='DATE_MISMATCH'));
  assert.ok(a.findings.some(x=>x.code==='INVALID_SOURCE'));
});
test('fails when the displayed local clock does not match the UTC instant',()=>{
  const a=auditRecords([report('opening',{generatedAtIST:'2026-10-01 09:00:00 IST'})],plan)['2026-10-01'];
  assert.equal(a.status,'FAIL');
  assert.ok(a.findings.some(x=>x.code==='TIMEZONE_MISMATCH'));
});
test('flags unexplained opening/closing action-log contradictions and accepts sourced corrections',()=>{
  const open=report('opening',{actionLog:[{kind:'BUY',amountCents:100}]});
  const close=report('closing',{actionLog:[{kind:'BUY',amountCents:200}]});
  assert.ok(auditRecords([open,close],plan)['2026-10-01'].findings.some(x=>x.code==='ACTION_LOG_CONTRADICTION'));
  close.corrections=[{reason:'Verified against broker contract note',sourceUrl:'https://example.com/contract-note'}];
  assert.ok(!auditRecords([open,close],plan)['2026-10-01'].findings.some(x=>x.code==='ACTION_LOG_CONTRADICTION'));
});
test('flags changed structured analysis claims unless corrected',()=>{
  const open=report('opening',{status:'PUBLISHED',dataAsOf:'2026-10-01T04:30:00Z',sources:[{name:'Source',url:'https://example.com'}],claims:[{id:'risk-level',value:'moderate',sourceUrl:'https://example.com'}]});
  const close=report('closing',{generatedAt:'2026-10-01T09:30:00.000Z',generatedAtIST:'2026-10-01 15:00:00 IST',status:'PUBLISHED',dataAsOf:'2026-10-01T09:30:00Z',sources:[{name:'Source',url:'https://example.com'}],claims:[{id:'risk-level',value:'high',sourceUrl:'https://example.com'}]});
  const a=auditRecords([open,close],plan)['2026-10-01'];
  assert.ok(a.findings.some(x=>x.code==='ANALYSIS_CLAIM_CONTRADICTION'));
  close.corrections=[{reason:'New sourced information changed assessment',sourceUrl:'https://example.com/update'}];
  assert.ok(!auditRecords([open,close],plan)['2026-10-01'].findings.some(x=>x.code==='ANALYSIS_CLAIM_CONTRADICTION'));
});
test('checks portfolio arithmetic and action amounts',()=>{
  const a=auditRecords([report('opening',{actionLog:[{kind:'BUY',amountCents:-1}]})],{...plan,deployedCents:1,actions:[{kind:'BUY',amountCents:50}]},new Date())['2026-10-01'];
  assert.ok(a.status==='FAIL');assert.ok(a.findings.some(x=>x.code==='INVALID_ACTION_AMOUNT'));assert.ok(a.findings.some(x=>x.code==='PORTFOLIO_ACTION_MISMATCH'));
});
