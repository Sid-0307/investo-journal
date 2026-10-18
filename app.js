const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUMBER = new Intl.NumberFormat('en-IN');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = cents => INR.format((Number(cents) || 0) / 100);
const dateLabel = date => date ? new Intl.DateTimeFormat('en-IN', { timeZone:'Asia/Kolkata', day:'2-digit', month:'short', year:'numeric' }).format(new Date(date + 'T12:00:00+05:30')) : '—';
const dateTime = instant => instant ? new Intl.DateTimeFormat('en-IN', { timeZone:'Asia/Kolkata', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true }).format(new Date(instant)) + ' IST' : '—';
const safeSource = source => source && /^https:\/\/[^ ]+/i.test(source.url || '');
const sourceLink = source => safeSource(source) ? '<a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(source.name || 'Open source') + ' ↗</a>' : '';
const shortDate = date => new Intl.DateTimeFormat('en-IN', { timeZone:'Asia/Kolkata', day:'2-digit', month:'short' }).format(new Date(date + 'T12:00:00+05:30'));
const byDate = (a, b) => String(a.date).localeCompare(String(b.date));
const colors = ['#92d568','#e6af63','#6b8bdd','#df8273','#60b9a9','#b28bd9'];

async function getJson(path) {
  const response = await fetch(path, { cache:'no-store' });
  if (!response.ok) throw new Error('Could not load ' + path + ' (' + response.status + ')');
  return response.json();
}
function put(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}
function statusLabel(status) {
  if (status === 'PUBLISHED') return 'Sourced';
  if (status === 'DATA_UNAVAILABLE') return 'Unavailable';
  if (status === 'MARKET_CLOSED') return 'Market closed';
  return status || 'Pending';
}

function renderReview(review, latestReport) {
  const latestIsNewer = latestReport && Date.parse(latestReport.generatedAt || 0) > Date.parse(review.reviewedAt || 0);
  const latestType = latestReport?.type === 'opening' ? 'OPENING REVIEW' : latestReport?.type === 'closing' ? 'CLOSING REVIEW' : latestReport?.type === 'correction' ? 'CORRECTION NOTE' : 'SCHEDULED REPORT';
  if (latestIsNewer && latestReport.status === 'PUBLISHED') {
    put('#review-label', 'LATEST SAVED ' + latestType);
    put('#review-date', 'Published ' + dateTime(latestReport.generatedAt));
    put('#hero-brief-title', latestReport.headline || latestType[0] + latestType.slice(1).toLowerCase() + ' · ' + dateLabel(latestReport.date));
    put('#hero-summary', latestReport.summary || review.summary || 'No summary is saved.');
    put('#data-through', dateLabel(latestReport.dataAsOf || latestReport.date));
    put('#review-stamp', 'Latest saved report · ' + latestType.toLowerCase() + ' · ' + dateLabel(latestReport.date));
  } else if (latestIsNewer) {
    put('#review-label', 'LATEST SCHEDULED CHECK · NO DATA');
    put('#review-date', latestType + ' · ' + dateTime(latestReport.generatedAt));
    put('#hero-brief-title', 'The latest scheduled slot had no sourced data');
    put('#hero-summary', (latestReport.unavailableReason || 'The report could not publish sourced analysis.') + ' The latest saved market synthesis is through ' + dateLabel(review.dataThrough) + '.');
    put('#data-through', 'Prior review · ' + dateLabel(review.dataThrough));
    put('#review-stamp', 'Latest slot unavailable · useful context through ' + dateLabel(review.dataThrough));
  } else {
    put('#review-label', review.label || 'LATEST MARKET REVIEW');
    put('#review-date', 'Reviewed ' + dateTime(review.reviewedAt));
    put('#hero-brief-title', review.title || 'Market review');
    put('#hero-summary', review.summary || 'No synthesis is saved.');
    put('#data-through', dateLabel(review.dataThrough));
    put('#review-stamp', 'Context through ' + dateLabel(review.dataThrough) + ' · reviewed ' + dateTime(review.reviewedAt));
  }
  put('#plan-view', review.planView || 'No deployment view recorded.');
  const observationRoot = document.querySelector('#observations');
  const currentReportCard = latestIsNewer ? '<article class="observation-card observation-latest"><div class="observation-number">↻</div><div class="observation-body"><div class="observation-label">MOST RECENT SCHEDULED ENTRY · ' + esc(latestType) + ' · ' + esc(statusLabel(latestReport.status)) + '</div><h3>' + esc(latestReport.status === 'PUBLISHED' ? (latestReport.headline || 'New sourced journal entry') : 'No sourced update for this slot') + '</h3><p>' + esc(latestReport.status === 'PUBLISHED' ? latestReport.summary : (latestReport.unavailableReason || 'This scheduled slot has no sourced analysis.')) + '</p><div class="source-row">' + (latestReport.sources || []).map(sourceLink).join('') + '</div></div></article>' : '';
  observationRoot.innerHTML = currentReportCard + (review.observations || []).map((item, index) =>
    '<article class="observation-card"><div class="observation-number">0' + (index + 1) + '</div><div class="observation-body"><div class="observation-label">' + esc(item.label) + '</div><h3>' + esc(item.title) + '</h3><p>' + esc(item.text) + '</p>' + (item.readThrough ? '<div class="read-through"><strong>Why it matters</strong><span>' + esc(item.readThrough) + '</span></div>' : '') + '<div class="source-row">' + (item.sources || []).map(sourceLink).join('') + '</div></div></article>'
  ).join('');
  const earnings = review.earnings || [];
  const max = Math.max(1, ...earnings.map(item => Math.abs(Number(item.growthYoyCc) || 0)));
  document.querySelector('#earnings-bars').innerHTML = earnings.map((item, i) =>
    '<div class="earnings-row"><div class="earnings-label"><strong>' + esc(item.company) + '</strong><span>' + esc(item.metricLabel) + '</span></div><div class="bar-line"><span class="bar-fill" style="width:' + Math.max(4, Math.abs(Number(item.growthYoyCc) || 0) / max * 100) + '%;background:' + colors[i] + '"></span></div><strong class="bar-value">' + (Number(item.growthYoyCc) > 0 ? '+' : '') + Number(item.growthYoyCc).toFixed(1) + '%</strong></div>'
  ).join('');
  document.querySelector('#earnings-footnotes').innerHTML = earnings.map(item => '<p><strong>' + esc(item.company) + ':</strong> ' + esc(item.footnote) + ' ' + (item.source ? sourceLink(item.source) : '') + '</p>').join('');
  put('#review-implication', review.implication || '');
  document.querySelector('#review-sources').innerHTML = (review.sources || []).map(sourceLink).join('');
}

function renderCandidates(review) {
  const list = document.querySelector('#next-candidates');
  const items = review.nextCandidates || [];
  put('#watchlist-asof', 'Research checked ' + dateLabel(review.watchlistAsOf || review.reviewedAt?.slice(0, 10)));
  list.innerHTML = items.length ? items.map((item, index) =>
    '<article class="candidate-card candidate-' + esc(item.stageKey || 'watch') + '">' +
      '<div class="candidate-card-top"><span class="candidate-step">0' + (index + 1) + ' · RESEARCH QUEUE</span><span class="candidate-stage">' + esc(item.stage || 'Watch') + '</span></div>' +
      '<h3>' + esc(item.name) + '</h3><p class="candidate-ticker">NSE ' + esc(item.nse || '—') + ' <span>·</span> BSE ' + esc(item.bse || '—') + '</p>' +
      '<div class="candidate-evidence"><strong>Latest evidence</strong><p>' + esc(item.evidence) + '</p></div>' +
      '<p class="candidate-thesis">' + esc(item.thesis) + '</p>' +
      '<div class="candidate-check"><strong>Next checkpoint</strong><p>' + esc(item.nextCheck) + '</p></div>' +
      '<div class="candidate-risk"><strong>Risk to watch</strong><p>' + esc(item.risk) + '</p></div>' +
      '<div class="source-row">' + (item.sources || []).map(sourceLink).join('') + '</div>' +
    '</article>'
  ).join('') : '<div class="watchlist-empty">No current source-backed stock candidates are saved.</div>';
}

function renderPortfolio(plan) {
  const positions = plan.positions || [];
  const legacyCostTotal = positions.reduce((sum, item) => sum + (Number(item.costCents) || 0), 0);
  const total = Number.isInteger(plan.ownerConfirmedInvestedCents) ? plan.ownerConfirmedInvestedCents : legacyCostTotal;
  const allocation = Number(plan.currentTranche?.allocationCents || plan.monthlyTrancheCents || 0);
  const remainder = Math.max(0, allocation - total);
  const percent = allocation ? Math.min(100, total / allocation * 100) : 0;
  put('#october-deployed', money(total));
  put('#october-percent', percent.toFixed(1) + '% deployed');
  put('#october-remaining', money(remainder));
  put('#position-count', NUMBER.format(plan.ownerConfirmedPositionCount || positions.length));
  put('#portfolio-total', money(total));
  put('#allocation-percent', percent.toFixed(1) + '% of October');
  put('#allocation-remaining', money(remainder) + ' remains before fees');
  document.querySelector('#october-progress').style.width = percent + '%';
  const ring = document.querySelector('#allocation-donut');
  ring.style.background = 'conic-gradient(#5c9c48 0% ' + percent + '%, #e4e9e5 ' + percent + '% 100%)';
  ring.setAttribute('aria-label', 'October tranche ' + percent.toFixed(1) + '% deployed');
  const types = { NIFTYBEES:'Broad-market ETF', HDFCBANK:'Private bank', GOLDBEES:'Gold ETF', SOUTHBANK:'Bank', POONAWALLA:'NBFC' };
  document.querySelector('#holdings-body').innerHTML = positions.map(item =>
    '<tr><td><strong>' + esc(item.symbol) + '</strong><span>' + esc(item.name) + '</span></td><td>' + NUMBER.format(item.quantity) + '</td><td>' + esc(types[item.symbol] || 'Equity') + '</td><td><span class="verification ' + (item.verification === 'SCREENSHOT_MATCHED' ? 'verification-match' : 'verification-reported') + '">' + (item.verification === 'SCREENSHOT_MATCHED' ? 'Screenshot matched' : 'User-reported') + '</span></td></tr>'
  ).join('');
  const bar = document.querySelector('#october-progress');
  bar.setAttribute('aria-valuenow', percent.toFixed(1));
  document.querySelector('#footer-status').textContent = '₹' + NUMBER.format(total / 100) + ' invested · owner-confirmed ' + dateLabel(plan.ownerConfirmedAsOf) + ' · no live value or P&L shown';
}

function renderPlan(plan) {
  const capital = Number(plan.capitalCents) || 0;
  const monthly = Number(plan.currentTranche?.allocationCents || plan.monthlyTrancheCents) || 0;
  const legacyCostTotal = (plan.positions || []).reduce((sum, item) => sum + (Number(item.costCents) || 0), 0);
  const invested = Number.isInteger(plan.ownerConfirmedInvestedCents) ? plan.ownerConfirmedInvestedCents : legacyCostTotal;
  const remaining = Math.max(0, monthly - invested);
  const future = Math.max(0, capital - monthly);
  const percent = monthly ? Math.min(100, invested / monthly * 100) : 0;
  put('#plan-total', money(capital));
  put('#plan-monthly', money(monthly));
  put('#plan-invested', money(invested));
  put('#plan-remaining', money(remaining));
  put('#tranche-percent', percent.toFixed(1) + '% deployed');
  put('#future-capital', money(future));
  document.querySelector('#plan-track-fill').style.width = percent + '%';
  const months = plan.months || [];
  document.querySelector('#month-timeline').innerHTML = months.map((item, index) => {
    const current = item.current === true;
    return '<div class="month-cell ' + (current ? 'month-current' : 'month-future') + '"><span class="month-index">' + String(index + 1).padStart(2, '0') + '</span><strong>' + esc(item.label) + '</strong><small>' + (current ? percent.toFixed(0) + '% used' : 'planned') + '</small></div>';
  }).join('');
}

function slotState(reports, date, type) {
  const record = reports.find(item => item.date === date && item.type === type);
  if (!record) return { state:'missing', label:'No entry' };
  if (record.status === 'PUBLISHED') return { state:'published', label:'Sourced' };
  if (record.status === 'MARKET_CLOSED') return { state:'closed', label:'Closed' };
  return { state:'unavailable', label:'No data' };
}

function lastTenWeekdays() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Kolkata', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date()).split('-').map(Number);
  const cursor = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6) cursor.setUTCDate(cursor.getUTCDate() - 1);
  const dates = [];
  while (dates.length < 10) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates.reverse();
}
function renderCoverage(review, reports) {
  const dates = lastTenWeekdays();
  put('#coverage-period', dates.length ? dateLabel(dates[0]) + ' – ' + dateLabel(dates[dates.length - 1]) + ' · scheduled weekdays' : 'No dates');
  let sourced = 0, unavailable = 0, missing = 0;
  const corrections = reports.filter(item => item.type === 'correction' && item.status === 'PUBLISHED');
  const rows = dates.map(date => {
    const opening = slotState(reports, date, 'opening');
    const closing = slotState(reports, date, 'closing');
    [opening, closing].forEach(item => {
      if (item.state === 'published') sourced++;
      else if (item.state === 'unavailable') unavailable++;
      else if (item.state === 'missing') missing++;
    });
    const dateCorrections = corrections.filter(item => item.date === date);
    return '<article class="coverage-day"><div class="coverage-date">' + esc(shortDate(date)) + '<span>' + esc(new Intl.DateTimeFormat('en-IN',{weekday:'short',timeZone:'Asia/Kolkata'}).format(new Date(date + 'T12:00:00+05:30'))) + '</span></div><div class="coverage-slot"><span>Open</span><b class="slot-' + opening.state + '">' + opening.label + '</b></div><div class="coverage-slot"><span>Close</span><b class="slot-' + closing.state + '">' + closing.label + '</b></div>' + (dateCorrections.length ? '<div class="correction-mark">+' + dateCorrections.length + ' correction' + (dateCorrections.length === 1 ? '' : 's') + '</div>' : '') + '</article>';
  }).join('');
  const total = dates.length * 2;
  put('#coverage-sourced', sourced + ' / ' + total);
  put('#coverage-unavailable', unavailable + ' slots recorded with no sourced analysis');
  put('#coverage-missing', missing + ' slots have no entry');
  put('#coverage-corrections', corrections.length + ' published correction/supplement notes');
  document.querySelector('#coverage-grid').innerHTML = rows;
}

function renderArchive(reports, audits) {
  const list = document.querySelector('#archive-list');
  const query = document.querySelector('#search');
  const filter = document.querySelector('#report-filter');
  function draw() {
    const q = query.value.trim().toLowerCase();
    const type = filter.value;
    const sorted = [...reports].sort((a, b) => byDate(b, a) || String(b.generatedAt).localeCompare(String(a.generatedAt)));
    const groups = [];
    sorted.forEach(item => {
      let group = groups.find(row => row.date === item.date);
      if (!group) { group = { date:item.date, items:[] }; groups.push(group); }
      if ((type === 'all' || item.type === type) && (!q || (item.summary + ' ' + item.status + ' ' + item.type + ' ' + (item.unavailableReason || '')).toLowerCase().includes(q))) group.items.push(item);
    });
    const visible = groups.filter(group => group.items.length);
    put('#record-count', reports.length + ' saved entries · ' + groups.filter(group => group.items.length).length + ' matching dates');
    list.innerHTML = visible.length ? visible.map(group => {
      const auditList = audits[group.date];
      const audit = (Array.isArray(auditList) ? auditList[auditList.length - 1] : auditList) || { status:'PENDING', findings:[] };
      return '<article class="archive-day"><div class="archive-day-head"><strong>' + esc(dateLabel(group.date)) + '</strong><span class="audit-pill audit-' + esc(String(audit.status || 'PENDING').toLowerCase()) + '">' + esc(audit.status || 'PENDING') + ' audit</span></div>' + group.items.map(item => {
        const kind = item.type === 'opening' ? 'Opening review' : item.type === 'closing' ? 'Closing review' : item.type === 'correction' ? 'Correction / supplement' : 'Journal entry';
        return '<details class="archive-entry"><summary><span class="archive-time">' + esc(dateTime(item.generatedAt)) + '</span><span class="archive-title">' + esc(kind) + '<small>' + esc(statusLabel(item.status)) + '</small></span><span class="archive-chevron">+</span></summary><div class="archive-copy"><p>' + esc(item.summary) + '</p>' + (item.unavailableReason ? '<p class="unavailable-reason">' + esc(item.unavailableReason) + '</p>' : '') + '<dl><div><dt>Generated</dt><dd>' + esc(item.generatedAtIST || item.generatedAt || '—') + '</dd></div><div><dt>Market context as of</dt><dd>' + esc(item.dataAsOf || 'Not recorded') + '</dd></div></dl><div class="source-row">' + (item.sources || []).map(sourceLink).join('') + '</div>' + (item.corrections || []).map(correction => '<p class="correction-copy"><strong>Correction:</strong> ' + esc(correction.reason) + ' ' + (safeSource({url:correction.sourceUrl,name:'Source'}) ? sourceLink({url:correction.sourceUrl,name:'Open source'}) : '') + '</p>').join('') + '<div class="audit-findings">' + (audit.findings || []).map(finding => '<span>' + esc(finding.level || 'INFO') + ' · ' + esc(finding.message) + '</span>').join('') + '</div></div></details>';
      }).join('') + '</article>';
    }).join('') : '<div class="archive-empty">No saved entries match that search.</div>';
  }
  if (!query.dataset.bound) {
    query.addEventListener('input', draw);
    filter.addEventListener('change', draw);
    query.dataset.bound = 'true';
  }
  draw();
}

async function loadJournal() {
  const status = document.querySelector('#refresh-status');
  try {
    status.textContent = 'Reading saved research…';
    const [reports, audits, plan, review] = await Promise.all([
      getJson('data/reports/index.json'),
      getJson('data/audits/index.json'),
      getJson('data/portfolio.json'),
      getJson('data/period-review.json')
    ]);
    const latest = [...reports].sort((a,b) => String(b.generatedAt).localeCompare(String(a.generatedAt)))[0];
    renderReview(review, latest);
    renderCandidates(review);
    renderPortfolio(plan);
    renderPlan(plan);
    renderCoverage(review, reports);
    renderArchive(reports, audits);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Kolkata', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
    const weekday = new Intl.DateTimeFormat('en-IN', { timeZone:'Asia/Kolkata', weekday:'short' }).format(new Date());
    const todaySlots = reports.filter(item => item.date === today && ['opening', 'closing'].includes(item.type)).length;
    const todayState = todaySlots >= 2 ? '2/2 updates saved' : todaySlots === 1 ? '1/2 updates saved' : ['Sat', 'Sun'].includes(weekday) ? 'market closed' : 'no update saved';
    status.textContent = 'Today ' + shortDate(today) + ' · ' + todayState;
    status.title = 'Latest archive entry: ' + (latest ? dateLabel(latest.date) : 'none') + ' · market analysis through ' + dateLabel(review.dataThrough);
    document.querySelector('#refresh-button').setAttribute('aria-label', 'Refresh saved journal data');
  } catch (error) {
    status.textContent = 'Journal data could not be loaded';
    put('#hero-brief-title', 'Saved research did not load');
    put('#hero-summary', 'Refresh the page in a moment. The website does not fetch market quotes.');
    put('#footer-status', error.message || 'Data unavailable');
  }
}
document.querySelector('#refresh-button').addEventListener('click', loadJournal);
loadJournal();
