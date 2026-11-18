/* Page models for Thejus Admin.dc.html — derived from uploads/app.js. Sample data only. */
import * as D from './tec-data.js';
const { students, payments, refunds, audit, PROGS, QUOTAS, OCCUPY, STATUSES, PAY_MODES, TODAY, inr, inrS, fd, fdShort, addDays, instPlan, allocate, nextDue, recalc, FIXED, POLICY, USERS, sById, pad, pick, TUITION } = D;
export { D };

const SC = { 'Up to date': 'ok', Paid: 'ok', 'Part paid': 'warn', 'Due soon': 'warn', 'Fully paid': 'ok', Scheduled: 'info', 'Partly failed': 'warn', 'Seat booked': 'info', 'Details collected': 'warn', Overdue: 'bad', 'Due this week': 'warn', Upcoming: 'grey', 'Awaiting first payment': 'info', 'Pay now': 'info', Confirmed: 'ok', Cancelled: 'bad', Withdrawn: 'bad', Submitted: 'grey', 'Awaiting approval': 'warn', Approved: 'info', Processing: 'violet', Completed: 'ok', Rejected: 'bad', 'On hold': 'grey', Posted: 'ok', Reversed: 'bad', Verified: 'ok', Uploaded: 'info', Pending: 'warn', Delivered: 'ok', Failed: 'bad', Queued: 'grey', Sent: 'info', Active: 'ok', Invited: 'warn', Archived: 'grey', Running: 'violet', Draft: 'grey', Published: 'ok', Full: 'bad', Left: 'warn' };
const CH = { ok: ['#E8F4E9', '#0E700E', '#BFE3C4'], warn: ['#FBF2E1', '#8A6100', '#EBD9AE'], bad: ['#FBEAED', '#B4304A', '#F0CBD2'], grey: ['#F0F2F5', '#5E6673', '#DDE1E8'], info: ['#E8F1FA', '#0F6CBD', '#CFE0F3'], violet: ['#0E1A2B', '#5FA8FF', '#0E1A2B'] };
export const chipColors = s => CH[SC[s] || 'grey'];

/* cell constructors */
export const C = {
  t: (text, o = {}) => ({ k: 'text', text: text ?? '', ...o }),
  r: (text, o = {}) => ({ k: 'text', text: text ?? '', align: 'right', ...o }),
  link: (text, go, o = {}) => ({ k: 'link', text, go, ...o }),
  chip: (s, o = {}) => ({ k: 'chip', text: s, ...o }),
  tag: s => ({ k: 'tag', text: s }),
  tags: a => ({ k: 'tags', tags: a }),
  sw: on => ({ k: 'switch', on: !!on }),
  btn: (text, go, icon, o = {}) => ({ k: 'btn', text, go, icon, ...o }),
  two: (text, sub, o = {}) => ({ k: 'two', text, sub, ...o }),
  faint: text => ({ k: 'text', text, color: '#6B7280' }),
  input: (value, o = {}) => ({ k: 'input', value, ...o }),
};
const progCourse = p => p.course || p.name.split(' ')[0];
const progBranch = p => p.branch || p.name.slice(progCourse(p).length).trim() || p.dept;
const actProgs = () => PROGS.filter(p => p.active !== false);
const CATEGORY = { Government: 'Merit', Management: 'Management', NRI: 'NRI', 'Lateral entry': 'Merit (Lateral entry)' };
const docCourse = s => { const p = PROGS.find(x => x.code === s.prog); const c = p ? progCourse(p) : s.progName.split(' ')[0]; return s.quota === 'Lateral entry' && c === 'B.Tech' ? 'B.Tech LET' : c; };
const docBranch = s => { const p = PROGS.find(x => x.code === s.prog); return p ? progBranch(p) : s.progName; };
const docExamFull = s => s.entrance && s.entrance !== '—' ? s.entrance : (s.quota === 'Lateral entry' ? 'LET' : '—');

/* fee account: instalments as invoices, receipts applied oldest first */
export function feeAccount(s) {
  const invNo = k => `INV/26/${(s.adm || s.app).slice(-5)}-${k + 1}`;
  const inv = instPlan(s).map((i, k) => ({ ...i, k, no: invNo(k), paid: 0, recs: [] }));
  const pays = payments.filter(x => x.sid === s.id && x.kind === 'Payment').sort((a, b) => a.date.localeCompare(b.date) || a.rcpt.localeCompare(b.rcpt));
  const apply = new Map();
  pays.forEach(x => {
    const parts = []; let left = x.status === 'Reversed' ? 0 : x.amt;
    for (const i of inv) { if (left <= 0) break; const room = i.amt - i.paid; if (room <= 0) continue; const a = Math.min(room, left); i.paid += a; i.recs.push({ x, a }); parts.push({ i, a }); left -= a; }
    if (left > 0) parts.push({ i: null, a: left });
    apply.set(x.id, parts);
  });
  inv.forEach(i => { const bal = i.amt - i.paid, days = Math.round((Date.parse(i.due) - Date.parse(TODAY)) / 864e5); i.bal = bal; i.days = days; i.st = bal <= 0 ? 'Paid' : days < 0 ? 'Overdue' : i.paid > 0 ? 'Part paid' : days <= 7 ? 'Due soon' : 'Upcoming'; });
  return { inv, pays, apply };
}
export function duesData() {
  const rows = students.filter(s => OCCUPY.includes(s.status)).map(s => {
    const n = s.due > 0 ? nextDue(s) : null;
    if (!n) return { ...s, inst: '—', ndue: '', nbal: 0, days: 9999, dst: 'Fully paid', when: '—' };
    const days = Math.round((Date.parse(n.due) - Date.parse(TODAY)) / 864e5);
    const dst = s.status !== 'Confirmed' ? 'Awaiting first payment' : days < 0 ? 'Overdue' : days <= 7 ? 'Due this week' : 'Upcoming';
    return { ...s, inst: n.n, ndue: n.due, nbal: dst === 'Overdue' ? s.overdue : n.bal, days, dst, when: s.status !== 'Confirmed' ? 'At admission' : days < 0 ? `${-days} days late` : days === 0 ? 'Today' : `in ${days} days` };
  }).sort((a, b) => (a.ndue || '9999').localeCompare(b.ndue || '9999') || a.name.localeCompare(b.name));
  const sum = st => rows.filter(r => r.dst === st).reduce((t, r) => t + (st === 'Fully paid' ? r.paid : r.nbal), 0), cnt = st => rows.filter(r => r.dst === st).length;
  return { rows, sum, cnt };
}
const DUE_ST = ['Overdue', 'Due this week', 'Upcoming', 'Awaiting first payment', 'Fully paid'];

const CAMP_AUD = {
  overdue: ['Guardians with overdue fees', () => students.filter(s => s.overdue > 0)],
  due7: ['Instalment due in the next 7 days', () => students.filter(s => OCCUPY.includes(s.status) && s.nextDue && s.nextDue >= TODAY && s.nextDue <= addDays(TODAY, 7))],
  docs: ['Documents still pending', () => students.filter(s => OCCUPY.includes(s.status) && Object.values(s.docs).includes('Pending'))],
  details: ['Seat booked · details pending', () => students.filter(s => s.status === 'Seat booked')],
  all: ['All active admissions 2026–27', () => students.filter(s => OCCUPY.includes(s.status))],
};
const CAMP_TPL = { 'Fee reminder': 'FEE_DUE_EN + ML', 'Overdue reminder': 'FEE_OVERDUE_EN + ML', 'Document reminder': 'DOC_PENDING_EN', 'Announcement': 'ANNOUNCE_EN + ML', 'Fee slip': 'FEE_SLIP_EN' };
export const CAMPAIGNS = [
  ['Instalment 2 due · 7-day reminder', 'Fee reminder', 'Automatic', ['SMS', 'WhatsApp'], 'due7', 64, '2026-11-03 09:00', 'System', 'Completed', 2],
  ['Overdue fees · weekly reminder', 'Overdue reminder', 'Automatic', ['SMS', 'WhatsApp', 'Email'], 'overdue', 41, '2026-11-02 10:00', 'System', 'Completed', 5],
  ['Orientation day · 10 Nov', 'Announcement', 'Manual', ['SMS', 'WhatsApp'], 'all', 168, '2026-11-01 16:30', 'Anita Joseph', 'Completed', 3],
  ['Pending certificates · TC and community', 'Document reminder', 'Manual', ['WhatsApp'], 'docs', 52, '2026-10-29 11:15', 'Bindu Thomas', 'Completed', 1],
  ['Overdue fees · weekly reminder', 'Overdue reminder', 'Automatic', ['SMS', 'WhatsApp', 'Email'], 'overdue', 38, '2026-10-26 10:00', 'System', 'Completed', 4],
  ['Complete your admission details', 'Document reminder', 'Manual', ['SMS'], 'details', 23, '2026-10-22 12:40', 'Reshma P.', 'Completed', 0],
  ['Fee slip · Year 1 schedule', 'Fee slip', 'Manual', ['WhatsApp', 'Email'], 'all', 161, '2026-10-15 15:05', 'George Varghese', 'Partly failed', 19],
  ['Instalment 2 due · 7-day reminder', 'Fee reminder', 'Automatic', ['SMS', 'WhatsApp'], 'due7', 47, '2026-10-06 09:00', 'System', 'Completed', 1],
  ['Diwali holiday · office closed', 'Announcement', 'Manual', ['SMS'], 'all', 166, '2026-10-30 18:20', 'Anita Joseph', 'Completed', 2],
  ['Hostel allotment list published', 'Announcement', 'Manual', ['WhatsApp', 'Email'], 'all', 150, '2026-09-18 14:00', 'Anita Joseph', 'Completed', 6],
  ['Overdue fees · weekly reminder', 'Overdue reminder', 'Automatic', ['SMS', 'WhatsApp', 'Email'], 'overdue', 41, '2026-11-09 10:00', 'System', 'Scheduled', 0],
  ['Semester exam fee notice', 'Announcement', 'Manual', ['SMS', 'Email'], 'all', 168, '—', 'George Varghese', 'Draft', 0],
].map(([name, type, trigger, ch, aud, n, at, by, status, failed], i) => ({ id: 'c' + i, name, type, trigger, ch, aud, n, at, by, status, failed, tpl: CAMP_TPL[type] }));
const campSent = c => c.status === 'Draft' || c.status === 'Scheduled' ? 0 : c.n * c.ch.length;
const campDel = c => { const s = campSent(c); return s ? Math.round((s - c.failed) / s * 1000) / 10 : null; };

const feeHeadRows = [
  ['TUI', 'Tuition fee', 'Non-refundable', 'Exempt (education)', 'Per year', 1], ['ADM', 'Admission fee', 'Non-refundable', 'Exempt', 'One-time', 1], ['CAU', 'Caution deposit', 'Refundable', 'Exempt', 'One-time', 1],
  ['EXM', 'University exam fee', 'Non-refundable', 'Exempt', 'Per semester', 1], ['APP', 'Application fee', 'Non-refundable', 'Exempt', 'One-time', 1], ['BUS', 'Bus fee', 'Partly refundable', 'GST 18%', 'Per term', 1],
  ['HST', 'Hostel fee', 'Partly refundable', 'Exempt', 'Per term', 1], ['LIB', 'Library & lab fee', 'Non-refundable', 'Exempt', 'Per year', 1], ['UNI', 'Uniform & ID card', 'Non-refundable', 'GST 5%', 'One-time', 0],
].map(([code, name, refund, tax, freq, a]) => ({ code, name, refund, tax, freq, active: a ? 'Active' : 'Archived' }));
const templates = [];
PROGS.forEach(p => QUOTAS.forEach(q => { if (!p.cap[q]) return; const tui = Math.round(TUITION[q] * p.m / 100) * 100; templates.push({ code: `FT-26-${p.code}-${q.slice(0, 4).toUpperCase()}`, year: '2026–27', prog: p.name, quota: q, cat: 'All', ver: p.code === 'BT-CSE' && q === 'Management' ? 'v3' : q === 'NRI' ? 'v2' : 'v1', tui, total: tui + 18500, assigned: students.filter(s => s.prog === p.code && s.quota === q && s.fee).length, status: 'Active', updated: p.code === 'BT-CSE' && q === 'Management' ? '2026-11-03' : '2026-05-20' }); }));
const concRows = students.filter(s => s.conc).map((s, i) => ({ ...s, type: ['Merit scholarship', 'Sibling concession', 'Management discretion', 'Staff ward'][i % 4], basis: i % 3 ? 'Amount' : 'Percent', cst: i % 4 === 0 ? 'Awaiting approval' : 'Approved', appr: i % 4 === 0 ? '—' : 'Dr. Suma Rajan' }));
const REPORTS = {
  Admissions: ['Daily admission register', 'Admissions by programme & branch', 'Admissions by quota & category', 'Seat availability summary', 'Staff performance', 'Cancellations & withdrawals'],
  'Fees & collections': ['Fee collection register', 'Mode-wise collection summary', 'Assessed vs collected', 'Outstanding dues by student', 'Overdue instalments ageing', 'Concessions & scholarships granted'],
  'Payments & refunds': ['Day book', 'Receipt cancellation & reversal register', 'Cashier-wise collection', 'Refund register', 'Refunds pending approval', 'Caution deposit liability'],
};
const REP_FMT = { Admissions: 'Excel · PDF', 'Fees & collections': 'Excel · CSV · PDF', 'Payments & refunds': 'Excel · PDF' };

/* seat occupancy stats */
const Z = { cap: 0, cf: 0, dc: 0, sb: 0, used: 0 };
const add = (a, b) => ({ cap: a.cap + b.cap, cf: a.cf + b.cf, dc: a.dc + b.dc, sb: a.sb + b.sb, used: a.used + b.used });
const stat = (p, q) => { const n = st => students.filter(s => s.prog === p.code && s.quota === q && s.status === st).length; const cf = n('Confirmed'), dc = n('Details collected'), sb = n('Seat booked'); return { cap: p.cap[q] || 0, cf, dc, sb, used: cf + dc + sb }; };
const pct = (v, c) => c ? v / c * 100 : 0;
const segs = s => [{ w: pct(s.cf, s.cap) + '%', c: '#0A3C6E' }, { w: pct(s.dc, s.cap) + '%', c: '#1783C1' }, { w: pct(s.sb, s.cap) + '%', c: '#A2CDE6' }];
const occCell = s => { if (!s.cap) return C.faint('Not offered'); const left = Math.max(0, s.cap - s.used); return { k: 'occ', text: String(s.used), cap: ` / ${s.cap}`, badge: left <= 0 ? 'Full' : `${left} left`, badgeChip: left <= 0 || left / s.cap <= .15, segs: segs(s) }; };

/* shared bits */
const kv = items => ({ type: 'kv', items: items.map(([k, v]) => ({ k, v: v == null || v === '' ? '—' : String(v) })) });
const H = text => ({ type: 'h', text });
const notice = (tone, text) => ({ type: 'notice', tone, text });
const table = (head, rows, foot) => ({ type: 'table', head: head.map(h => typeof h === 'string' ? { l: h } : h), rows, foot });
const R = l => ({ l, r: true });
const letterhead = (title, no, date) => ({ type: 'letterhead', title, no, date });

function feeHeadsTable(s) {
  return table(['Head', 'Type', R('Amount')], [
    [C.t('Tuition fee'), C.tag('Non-refundable'), C.r(inr(s.fee - 18500))],
    ...Object.entries(FIXED).map(([k, v]) => [C.t(k), C.tag(k === 'Caution deposit' ? 'Refundable' : 'Non-refundable'), C.r(inr(v))]),
    ...(s.conc ? [[C.t('Concession · Merit scholarship'), C.chip('Approved'), C.r('− ' + inr(s.conc), { color: '#0E700E' })]] : []),
  ], [C.t('Net payable'), C.t(''), C.r(inr(s.net))]);
}
function instTable(s, inv, go, collect) {
  return table(['Instalment', 'Due date', R('Amount'), R('Paid'), R('Balance'), 'Status', R('')],
    inv.map(i => [C.two(i.n, i.no), C.two(fd(i.due), i.st === 'Overdue' ? `${-i.days} days late` : i.bal > 0 && i.days >= 0 ? (i.days ? `in ${i.days} days` : 'today') : '', { subColor: i.st === 'Overdue' ? '#B4304A' : '#6B7280' }),
      C.r(inr(i.amt)), C.r(i.paid ? inr(i.paid) : '—'), C.r(i.bal > 0 ? inr(i.bal) : '—'), C.chip(i.st),
      i.bal <= 0 ? C.btn('View invoice', () => go(`invoice/${s.id}/${i.k}`), 'file') : collect ? C.btn('Collect', () => go('record-payment/' + s.id), 'credit-card') : C.faint('—')]),
    [C.t('Total'), C.t(''), C.r(inr(s.net)), C.r(inr(s.paid)), C.r(inr(s.due)), C.t(''), C.t('')]);
}
function histTable(s, pays, apply, go) {
  let run = s.net;
  return pays.length ? table(['Receipt', 'Date', 'Mode', 'Reference', 'Applied to', R('Amount'), R('Balance after')],
    pays.map(x => { if (x.status !== 'Reversed') run -= x.amt; return [C.link(x.rcpt, () => go('receipt/' + x.id), { tag: x.alloc === 'Booking fee' ? 'Booking fee' : '' }), C.t(fd(x.date)), C.t(x.mode), C.faint(x.ref),
      C.t((apply.get(x.id) || []).map(({ i, a }) => i ? `${i.no} · ${inr(a)}` : `Advance ${inr(a)}`).join(', ')), C.r(inr(x.amt)), C.r(inr(Math.max(0, run)))]; })) : { type: 'empty', text: 'No payments recorded yet.' };
}
function strip(s, inv, withStatus) {
  const next = inv.find(i => i.bal > 0), overdueInv = inv.filter(i => i.st === 'Overdue');
  const overall = !OCCUPY.includes(s.status) ? s.status : s.due <= 0 ? 'Fully paid' : overdueInv.length ? 'Overdue' : next && next.st === 'Due soon' ? 'Due soon' : 'Up to date';
  return { type: 'strip', items: [
    ...(withStatus ? [{ k: 'Payment status', chip: overall }] : []),
    { k: 'Assessed', v: inr(s.net) }, { k: 'Paid', v: s.paid ? inr(s.paid) : '—', color: '#0E700E' }, { k: 'Balance', v: s.due > 0 ? inr(s.due) : '—' },
    { k: 'Overdue', v: s.overdue ? inr(s.overdue) : '—', color: s.overdue ? '#B4304A' : '#1B1B1B' }, { k: 'Next due', v: next ? inr(next.bal) : 'Fully paid', sub: next ? fd(next.due) : '' }] };
}
function duesKpis(A, onStudents) {
  const { sum, cnt } = duesData();
  return [['Overdue', '#D93025'], ['Due this week', ''], ['Upcoming', ''], ['Awaiting first payment', ''], ['Fully paid', '#0E700E']].map(([st, c]) => ({
    label: st, value: inrS(sum(st)), sub: `${cnt(st)} students${st === 'Fully paid' ? ' · collected' : ''}`, color: c || '#1B1B1B',
    go: () => onStudents ? A.setSel([st]) : A.go('payments/students', { sel: [st] }) }));
}
function msgKpis() {
  const done = CAMPAIGNS.filter(c => campSent(c)), month = done.filter(c => c.at.startsWith('2026-11'));
  const sent = done.reduce((t, c) => t + campSent(c), 0), failed = done.reduce((t, c) => t + c.failed, 0);
  return [
    { label: 'Campaigns this month', value: month.length, sub: `${CAMPAIGNS.filter(c => c.status === 'Scheduled').length} scheduled · ${CAMPAIGNS.filter(c => c.status === 'Draft').length} draft` },
    { label: 'Messages sent', value: sent.toLocaleString('en-IN'), sub: `across ${done.length} runs` },
    { label: 'Delivered', value: (sent ? Math.round((sent - failed) / sent * 1000) / 10 : 0) + '%', sub: 'SMS, WhatsApp and email', color: '#0E700E' },
    { label: 'Failed', value: failed, sub: 'retried automatically once' }];
}
const tabsOf = (A, base, list, cur) => list.map(([k, l, n]) => ({ label: l, count: n ?? '', on: k === cur, go: () => A.go(base + '/' + k) }));
const PHASES = [
  ['booking', 'Booking', ['Seat booked', 'Details collected'], 'Seat booked, details pending'],
  ['admission', 'Admission', ['Confirmed'], 'Fee paid, confirmed'],
  ['cancelled', 'Cancelled', ['Cancelled', 'Withdrawn'], 'Cancelled or withdrawn'],
];
const phaseOf = s => (PHASES.find(p => p[2].includes(s.status)) || PHASES[0])[0];
const admFlow = (A, cur, done) => PHASES.map(([k, l, sts, d], i) => ({ n: i + 1, key: k, label: l, desc: d, count: students.filter(s => sts.includes(s.status)).length, on: k === cur, done: !!(done && done.includes(k)), go: () => A.go('admissions/' + k) }));
const admTabs = (A, cur) => tabsOf(A, 'admissions', [['register', 'Register 2026–27'], ['docs', 'Document checklist']], cur);
const payTabs = (A, cur) => tabsOf(A, 'payments', [['daybook', 'Recent payments'], ['students', 'Students'], ['refunds', 'Refunds']], cur);
const NOTE_TABS = [['campaigns', 'Campaigns'], ['events', 'Events & channels'], ['log', 'Delivery log'], ['templates', 'Templates']];
const FEE_TABS = [['heads', 'Fee heads'], ['templates', 'Fee templates'], ['schedules', 'Instalment schedules'], ['concessions', 'Concessions'], ['late', 'Late fee rules']];
const SET = [['organisation', 'Organisation'], ['users', 'Users'], ['roles', 'Roles & permissions'], ['branding', 'Branding'], ['integrations', 'Integrations']];
const ADMSET = [['seats', 'Seat matrix'], ['fees', 'Fee setup'], ['documents', 'Documents'], ['form', 'Admission form'], ['policy', 'Booking & refund policy'], ['numbering', 'Numbering']];
const col = (key, label, w, cell, o = {}) => ({ key, label, w, cell, ...o });
const statusOpts = () => [...STATUSES.map(s => [s, s, r => r.status === s]), ['overdue', 'Overdue', r => r.overdue > 0]];

/* ================= pages ================= */
export function build(path, A) {
  const [p, a, b, c] = path.split('/');
  const go = A.go;
  const back = () => A.back();
  const P = PAGES[p];
  return P ? P(a, b, c, A, go, back) : null;
}
const PAGES = {};

PAGES.admissions = (a, b, c, A, go, back) => {
  if (a === 'new') return bookSeat(A);
  if (a === 'view') return studentView(sById(b), c || 'details', A);
  if (a === 'docs') {
    const rows = students.filter(s => s.adm).map(s => ({ ...s, ...Object.fromEntries(Object.entries(s.docs).map(([k, v]) => ['d_' + k, v])) }));
    return { title: 'Admissions', actions: [{ label: 'Bulk upload', icon: 'upload', kind: 'primary', go: () => A.toast('Bulk upload · choose a ZIP of scanned certificates') }], crumb: [{ label: 'Admissions', go: () => go('admissions') }, { label: 'Document checklist' }],
      sheet: { rows, fKey: 'Status', opts: statusOpts(), open: r => go(`admissions/view/${r.id}/documents`), cols: [
        col('adm', 'Admission no.', 128, r => C.link(r.adm)), col('name', 'Student name', 170), col('progName', 'Programme', 190),
        ...Object.keys(students[0].docs).map(d => col('d_' + d, d, 150, r => C.chip(r['d_' + d]))), col('status', 'Admission status', 140, r => C.chip(r.status))] } };
  }
  const ph = PHASES.find(x => x[0] === a) || PHASES[0], phRows = students.filter(s => ph[2].includes(s.status));
  const phOpts = [...ph[2].map(s => [s, s, r => r.status === s]), ...(ph[0] !== 'cancelled' ? [['overdue', 'Overdue', r => r.overdue > 0]] : [])];
  return { title: 'Admissions', actions: [{ label: 'Document checklist', icon: 'file', go: () => go('admissions/docs') }, { label: 'Book seat', icon: 'plus', kind: 'primary', go: () => go('admissions/new') }], flow: admFlow(A, ph[0]),
    sheet: { rows: phRows, fKey: 'Status', opts: phOpts, open: r => go('admissions/view/' + r.id), cols: [
      col('adm', 'Admission no.', 128, r => C.link(r.adm)), col('name', 'Student name', 170), col('progName', 'Programme', 190), col('quota', 'Quota', 110), col('cat', 'Category', 80),
      col('status', 'Status', 140, r => C.chip(r.status)), col('bfee', 'Booking fee', 116, r => C.r(r.bfee ? inr(r.bfee) : '—')), col('mobile', 'Mobile', 110), col('entrance', 'Entrance', 130), col('officer', 'Handled by', 130), col('created', 'Created', 104, r => C.t(fd(r.created)))] } };
};

function studentView(s, tab, A) {
  const go = A.go;
  if (!s) return { title: 'Admission not found', actions: [{ label: 'Back to Admissions', go: () => go('admissions') }] };
  const primary = s.status === 'Seat booked' ? { label: 'Collect details', icon: 'user', kind: 'primary', go: () => A.toast('Details collected · status moved to Details collected') }
    : s.status === 'Details collected' ? { label: 'Take payment', icon: 'credit-card', kind: 'primary', go: () => go('record-payment/' + s.id) }
      : { label: 'Record payment', icon: 'credit-card', kind: 'primary', disabled: !(s.due > 0 && OCCUPY.includes(s.status)), go: () => go('record-payment/' + s.id) };
  let rows;
  if (tab === 'details') rows = [{ cards: [{ parts: [
    H('Personal details'), kv([['Student name', s.name], ['Date of birth', fd(s.dob)], ['Gender', s.gender], ['Blood group', s.blood], ['Mobile', s.mobile ? '+91 ' + s.mobile : ''], ['Email', s.email], ['Aadhaar', 'XXXX XXXX ' + s.mobile.slice(-4)], ['Nationality', s.nat], ['Religion', s.religion], ['Community', s.community ? '•••• (masked)' : ''], ['Annual income', s.income ? '•••• (masked)' : ''], ['Address', s.address]]),
    H('Parent / guardian'), kv([['Name', s.guardian], ['Relation', s.relation || 'Guardian'], ['Mobile', s.gmobile || s.mobile], ['Email', s.gemail], ['Occupation', s.gocc]]),
    H('Admission'), kv([['Admission no.', s.adm], ['Application no.', s.app], ['Academic year', '2026–27'], ['Admission date', fd(s.created)], ['Faculty in charge', s.officer], ['Fee category', s.cat]]),
    H('Quota, course & branch'), kv([['Admission category', CATEGORY[s.quota] || s.quota], ['Quota', s.quota], ['Course', docCourse(s)], ['Branch', docBranch(s)], ['Department', s.dept]]),
    H('Academic & entrance'), kv([['Qualifying exam', s.qual], ['Board / university', s.board], ['Year of passing', s.yop], ['Marks %', s.marks], ['School / college', s.school], ['Entrance', docExamFull(s)], ['Roll no.', s.examRoll]]),
  ] }] }];
  else if (tab === 'documents') {
    const pend = Object.values(s.docs).filter(v => v === 'Pending').length;
    rows = [{ cards: [{ title: 'Submitted documents', extra: pend ? `${pend} pending` : 'All received', parts: [{ type: 'list', items: Object.entries(s.docs).map(([d, v]) => ({
      icon: 'file', t: d, s: v === 'Pending' ? 'Not uploaded' : d.toLowerCase().replace(/ /g, '_') + '.pdf · 412 KB', chip: v,
      btn: { label: v === 'Uploaded' ? 'Verify' : v === 'Pending' ? 'Upload' : 'View', ghost: v === 'Verified', go: () => { if (v === 'Uploaded') { s.docs[d] = 'Verified'; A.toast('Document verified'); } else A.toast(v === 'Pending' ? 'Choose a file to upload' : 'Opening ' + d); } } })) }] }] }];
  } else {
    const { inv, pays, apply } = feeAccount(s), pane = A.ui.faPane || 'sched';
    rows = [
      { cards: [{ parts: [strip(s, inv, false)] }] },
      { cards: [{ seg: [{ label: `Instalments`, count: inv.length, on: pane === 'sched', go: () => A.setUi({ faPane: 'sched' }) }, { label: 'Payment history', count: pays.length, on: pane === 'hist', go: () => A.setUi({ faPane: 'hist' }) }], extra: 'Year 1 2026–27 · payments are applied to the oldest instalment first',
        parts: [pane === 'sched' ? instTable(s, inv, go, false) : histTable(s, pays, apply, go)] }] },
      { cards: [{ title: 'Fee heads', extra: `FT-26-${s.prog}-${s.quota.slice(0, 4).toUpperCase()} v3`, parts: [feeHeadsTable(s)] }] }];
  }
  return { title: s.name, crumb: [{ label: 'Admissions', go: () => go('admissions/' + phaseOf(s)) }, { label: s.adm || s.app }], sub: `${s.adm || s.app} · ${s.progName} · ${s.quota}`, subChip: s.status,
    actions: [{ label: 'Back to Admissions', go: () => go('admissions') }, { label: 'Cancel admission', kind: 'danger', go: () => A.toast('Cancellation request created · refund form ready to print') }, primary],
    flow: (() => { const cur = phaseOf(s); return admFlow(A, cur, cur === 'admission' ? ['booking'] : cur === 'cancelled' ? ['booking'] : []); })(), flowSmall: true,
    tabs: [['details', 'Details'], ['documents', 'Documents'], ['finance', 'Finance']].map(([k, l]) => ({ label: l, on: k === tab, go: () => go(`admissions/view/${s.id}/${k}`) })), rows };
}

const BK_SECS = ['Quota, course & branch', 'Admission details', 'Personal details', 'Parent / guardian · seat booked by', 'Academic details', 'Entrance exam', 'Documents received at the desk', 'Booking fee collected'];
function bookSeat(A) {
  const bk = A.ui.bk || {}, at = bk.at || 0, done = bk.done || [];
  const quota = bk.quota || 'Government';
  const offered = actProgs().filter(p => (p.cap[quota] || 0) > 0);
  const courses = [...new Set(offered.map(progCourse))];
  const course = courses.includes(bk.course) ? bk.course : courses[0];
  const branches = offered.filter(p => progCourse(p) === course);
  const p = branches.find(x => x.code === bk.prog) || branches[0];
  const cap = p ? p.cap[quota] || 0 : 0, used = p ? students.filter(x => x.prog === p.code && x.quota === quota && OCCUPY.includes(x.status)).length : 0, left = cap - used;
  const mt = p && p.code === 'MT-CSE', mba = p && p.code === 'MBA';
  const set = o => A.setUi({ bk: { ...bk, ...o } });
  const goSec = i => set({ at: Math.max(0, Math.min(BK_SECS.length - 1, i)), done: [...new Set([...done, at])] });
  const nDone = done.length;
  return { title: 'Book a seat', crumb: [{ label: 'Admissions', go: () => A.go('admissions') }, { label: 'New admission' }], actions: [{ label: 'Cancel', icon: 'times', go: () => A.go('admissions') }],
    form: 'book',
    bk: {
      progress: `${nDone} of ${BK_SECS.length} sections complete`, bar: nDone / BK_SECS.length * 100 + '%',
      steps: BK_SECS.map((t, i) => ({ label: t, on: i === at, done: done.includes(i) && i !== at, go: () => goSec(i) })),
      sec: BK_SECS.map((_, i) => i === at), stepN: `Step ${at + 1} of ${BK_SECS.length}`, left: BK_SECS.length - nDone ? ` · ${BK_SECS.length - nDone} sections to complete` : ' · all sections complete',
      isFirst: at === 0, isLast: at === BK_SECS.length - 1, next: () => goSec(at + 1), prev: () => goSec(at - 1),
      book: () => { A.toast(`Seat booked · TEC/2026/${pad(students.length + 1, 5)} · booking fee received`); A.setUi({ bk: null }); A.go('admissions'); },
      quotaOpts: QUOTAS.map(q => ({ v: q, l: q })), quota, onQuota: e => set({ quota: e.target.value, course: null, prog: null }),
      courseOpts: courses.map(c => ({ v: c, l: c })), course, onCourse: e => set({ course: e.target.value, prog: null }),
      branchOpts: branches.map(x => ({ v: x.code, l: progBranch(x) })), prog: p ? p.code : '', onProg: e => set({ prog: e.target.value }),
      seatOk: !!p && left > 0, seatText: !p ? `No active course offers the ${quota} quota.` : left > 0 ? `${left} of ${cap} seats available in ${p.name} · ${quota}.` : `No seats left in ${p.name} · ${quota}. Booking is blocked to prevent over-booking.`,
      exam: mt ? 'GATE' : mba ? 'KMAT / CAT' : 'KEAM', rankLabel: mt ? 'GATE score' : mba ? 'KMAT / CAT score' : 'KEAM rank',
      qualOpts: (mt ? ['B.Tech / B.E.'] : mba ? ['Any degree'] : quota === 'Lateral entry' ? ['Diploma (Polytechnic)'] : ['Plus Two (Kerala HSE)', 'CBSE XII', 'ISC XII', 'Other board']).map(x => ({ v: x, l: x })),
      appNo: 'APP-26-' + (1040 + students.length), today: TODAY,
      modes: PAY_MODES.map(m => ({ label: m, on: bk.mode === m, go: () => set({ mode: m }) })), showRef: !!bk.mode && bk.mode !== 'Cash',
    } };
}

PAGES.payments = (a, b, c, A, go) => {
  if (a === 'student') return payStudent(sById(b), c === 'history' ? 'history' : '', A);
  if (a === 'students') {
    const { rows, cnt } = duesData();
    return { title: 'Payments', actions: [{ label: 'Send reminders', icon: 'send', go: () => A.toast(`Reminders sent · SMS + WhatsApp to ${cnt('Overdue') + cnt('Due this week')} guardians`) }, { label: 'Record payment', icon: 'plus', kind: 'primary', go: () => go('record-payment') }],
      kpis: duesKpis(A, true), tabs: payTabs(A, 'students'),
      sheet: { rows, fKey: 'Fee status', opts: DUE_ST.map(s => [s, s, r => r.dst === s]), open: r => go('payments/student/' + r.id), cols: [
        col('adm', 'Admission no.', 136, r => C.link(r.adm)), col('name', 'Student', 170), col('progName', 'Programme', 190), col('quota', 'Quota', 110),
        col('net', 'Assessed', 108, r => C.r(inr(r.net))), col('paid', 'Paid', 108, r => C.r(r.paid ? inr(r.paid) : '—')), col('due', 'Balance', 108, r => C.r(r.due ? inr(r.due) : '—')),
        col('inst', 'Next instalment', 190), col('ndue', 'Due date', 110, r => C.t(r.ndue ? fd(r.ndue) : '—')), col('days', 'When', 110, r => C.t(r.when, { color: r.dst === 'Overdue' ? '#B4304A' : '#1B1B1B' })),
        col('nbal', 'Amount due', 116, r => C.r(r.nbal ? inr(r.nbal) : '—')), col('dst', 'Fee status', 170, r => C.chip(r.dst)), col('gm', 'Guardian mobile', 130, r => C.t(r.gmobile || r.mobile)),
        col('act', '', 100, r => r.due > 0 ? C.btn('Collect', () => go('record-payment/' + r.id)) : C.t(''))] } };
  }
  if (a === 'refunds') {
    const st = ['Submitted', 'Awaiting approval', 'Approved', 'Processing', 'Completed', 'Rejected', 'On hold'];
    const rows = refunds.map(r => { const s = sById(r.sid); return { ...r, sname: s.name, sadm: s.adm }; });
    return { title: 'Payments', actions: [{ label: 'Raise refund', icon: 'plus', kind: 'primary', go: () => A.toast('Pick a student, then choose “Cancel admission” to raise a refund') }],
      kpis: duesKpis(A, false), tabs: payTabs(A, 'refunds'),
      sheet: { rows, fKey: 'Status', opts: st.map(s => [s, s, r => r.status === s]), open: r => go('refund/' + r.id), cols: [
        col('no', 'Refund no.', 130, r => C.link(r.no)), col('raised', 'Raised', 104, r => C.t(fd(r.raised))), col('sname', 'Student', 160), col('sadm', 'Admission no.', 124),
        col('reason', 'Reason', 240), col('paid', 'Paid', 96, r => C.r(inr(r.paid))), col('deduction', 'Deduction', 96, r => C.r(inr(r.deduction))), col('amount', 'Refund', 100, r => C.r(inr(r.amount))),
        col('mode', 'Approval mode', 170), col('status', 'Status', 150, r => C.chip(r.status)), col('raisedBy', 'Raised by', 120)] } };
  }
  const rows = payments.map(x => { const s = sById(x.sid); return { ...x, sname: s.name, sadm: s.adm, notify: 'Delivered' }; }).sort((x, y) => y.date.localeCompare(x.date) || y.rcpt.localeCompare(x.rcpt));
  return { title: 'Payments', actions: [{ label: 'Record payment', icon: 'plus', kind: 'primary', go: () => go('record-payment') }], kpis: duesKpis(A, false), tabs: payTabs(A, 'daybook'),
    sheet: { rows, fKey: 'Mode', opts: PAY_MODES.map(m => [m, m, r => r.mode === m]), open: r => go('payments/student/' + r.sid), cols: [
      col('rcpt', 'Receipt no.', 140, r => C.link(r.rcpt, () => go('receipt/' + r.id))), col('date', 'Date', 104, r => C.t(fd(r.date))), col('sname', 'Student', 170), col('sadm', 'Admission no.', 124), col('mode', 'Mode', 110),
      col('ref', 'Reference', 170), col('amt', 'Amount', 110, r => C.r(inr(r.amt))), col('cashier', 'Recorded by', 120), col('status', 'Status', 100, r => C.chip(r.status)), col('notify', 'SMS', 90, r => C.chip('Delivered'))] } };
};
function payStudent(s, tab, A) {
  const go = A.go;
  if (!s) return { title: 'Payments', actions: [{ label: 'Back to Payments', go: () => go('payments') }] };
  const { inv, pays, apply } = feeAccount(s);
  return { title: s.name, crumb: [{ label: 'Payments', go: () => go('payments') }, { label: s.adm || s.app }], sub: `${s.adm || s.app} · ${docCourse(s)} ${docBranch(s)} · ${s.quota} · Guardian ${s.guardian} · +91 ${s.gmobile || s.mobile}`,
    actions: [{ label: 'Back to Payments', go: () => go('payments') }, { label: 'Send reminder', icon: 'send', go: () => A.toast('Reminder sent to ' + s.guardian) }, { label: 'Print statement', icon: 'print', go: () => go('statement/' + s.id) }, ...(s.due > 0 ? [{ label: 'Record payment', icon: 'credit-card', kind: 'primary', go: () => go('record-payment/' + s.id) }] : [])],
    preTabs: [{ cards: [{ parts: [strip(s, inv, true)] }] }],
    tabs: [['', 'Instalments', inv.length], ['history', 'Payment history', pays.length]].map(([k, l, n]) => ({ label: l, count: n, on: k === tab, go: () => go(`payments/student/${s.id}${k ? '/' + k : ''}`) })),
    rows: [{ cards: [tab === '' ? { title: 'Instalments', extra: 'payments are applied to the oldest first', parts: [instTable(s, inv, go, true)] }
      : { title: 'Payment history', extra: `${pays.length} receipt${pays.length === 1 ? '' : 's'}`, parts: [histTable(s, pays, apply, go)] }] }] };
}

/* overlay pages (opened from a row, Back returns) */
PAGES.receipt = (id, b, c, A) => {
  const p = payments.find(x => x.id === id); if (!p) return null; const s = sById(p.sid), { apply } = feeAccount(s);
  return { back: true, title: 'Receipt ' + p.rcpt, subChip: p.status, actions: [{ label: 'Resend', icon: 'send', go: () => A.toast('Receipt resent to ' + s.guardian) }, { label: 'Fee slip', icon: 'file', go: () => A.go('feeslip/' + s.id) }, { label: 'Print', icon: 'print', kind: 'primary', go: () => A.toast('Sent to printer') }],
    rows: [{ paper: true, cards: [{ parts: [letterhead('FEE RECEIPT', p.rcpt, fd(p.date)),
      kv([['Received from', s.guardian], ['Student', s.name], ['Admission no.', s.adm], ['Programme', `${s.progName} · ${s.quota}`], ['Mode', p.mode], ['Reference', p.ref]]),
      table(['Applied to', R('Amount')], (apply.get(p.id) || [{ i: null, a: p.amt }]).map(({ i, a }) => [C.t(i ? `${i.no} · ${i.n}${p.alloc === 'Booking fee' ? ' (booking fee)' : ''}` : 'Advance / unallocated'), C.r(inr(a))]), [C.t('Total received'), C.r(inr(p.amt))]),
      { type: 'sign', left: `Balance: ${inr(s.due)}${s.nextDue ? ` · next due ${fd(s.nextDue)}` : ''}. Refund policy ${s.policy.ver} accepted by ${s.guardian}. Computer-generated receipt. Verify at thejus.edu.in/verify`, sig: p.cashier.split(' ')[0], role: 'Cashier' }] }] }],
    foot: 'SMS delivered · Email sent' };
};
PAGES.invoice = (sid, k, c, A) => {
  const s = sById(sid); if (!s) return null; const i = feeAccount(s).inv[+k];
  return { back: true, title: 'Invoice ' + i.no, subChip: i.st, actions: [{ label: 'Print', icon: 'print', go: () => A.toast('Sent to printer') }, ...(i.bal > 0 ? [{ label: 'Collect ' + inr(i.bal), icon: 'credit-card', kind: 'primary', go: () => A.go('record-payment/' + s.id) }] : [])],
    rows: [{ paper: true, cards: [{ parts: [letterhead('FEE INVOICE · DEMAND NOTE', i.no, fd(i.due)),
      kv([['Invoice no.', i.no], ['Due on or before', fd(i.due)], ['Student', s.name], ['Admission no.', s.adm || s.app], ['Course · branch', `${docCourse(s)} · ${docBranch(s)}`], ['Admission category', CATEGORY[s.quota] || s.quota]]),
      H('Particulars'), table(['Description', R('Amount')], [[C.t(`${i.n} · Year 1 fees 2026–27`), C.r(inr(i.amt))]], [C.t('Invoice total'), C.r(inr(i.amt))]),
      H('Payments received against this invoice'), table(['Receipt', 'Date', 'Mode', R('Applied')], i.recs.length ? i.recs.map(({ x, a }) => [C.t(x.rcpt), C.t(fd(x.date)), C.t(x.mode), C.r(inr(a))]) : [[C.faint('No payment yet'), C.t(''), C.t(''), C.t('')]], [C.t('Balance due'), C.t(''), C.t(''), C.r(inr(i.bal))]),
      { type: 'sign', left: '', sig: 'Accounts', role: 'Accounts in charge' }] }] }] };
};
PAGES.feeslip = (sid, b, c, A) => {
  const s = sById(sid); if (!s) return null; const nd = nextDue(s), al = allocate(s);
  return { back: true, title: 'Fee slip · ' + s.name, actions: [{ label: 'Send to ' + s.guardian, icon: 'send', go: () => A.toast('Fee slip sent') }, { label: 'Print', icon: 'print', kind: 'primary', go: () => A.toast('Sent to printer') }],
    rows: [{ paper: true, cards: [{ parts: [letterhead('FEE SLIP · PAYMENT SCHEDULE', 'Academic year 2026–27', fd(TODAY)),
      kv([['Student', s.name], ['Admission no.', s.adm], ['Programme', `${s.progName} · ${s.quota}`], ['Seat booked by', `${s.guardian} · ${s.relation || 'Guardian'}`]]),
      H('Fee structure'), feeHeadsTable(s),
      H('Payment schedule'), table(['Instalment', 'Due date', R('Amount'), R('Paid'), R('Balance'), ''], al.map(i => { const bal = i.amt - i.paid; return [C.t(i.n), C.t(fd(i.due)), C.r(inr(i.amt)), C.r(i.paid ? inr(i.paid) : '—'), C.r(inr(bal)), C.chip(bal <= 0 ? 'Completed' : i.due < TODAY ? 'Overdue' : 'Pending')]; }), [C.t('Total'), C.t(''), C.t(''), C.r(inr(s.paid)), C.r(inr(Math.max(0, s.net - s.paid))), C.t('')]),
      notice('info', nd ? `Next payment ${inr(nd.bal)} due on ${fd(nd.due)} · ${nd.n}` : 'Fully paid for 2026–27'),
      { type: 'text', faint: true, text: `Pay at the accounts counter (cash, UPI, cheque, DD) or by bank transfer to SBI A/c XXXXXX4521, IFSC SBIN0070123. Quote the admission number. Refund policy ${s.policy.ver} accepted by ${s.guardian} on ${fd(s.policy.at)}.` },
      { type: 'sign', left: '', sig: 'Accounts', role: 'Finance department' }] }] }] };
};
PAGES.statement = (sid, b, c, A) => {
  const s = sById(sid); if (!s) return null; const { inv, pays, apply } = feeAccount(s); let run = s.net;
  return { back: true, title: 'Fee statement · ' + s.name, actions: [{ label: 'Print', icon: 'print', kind: 'primary', go: () => A.toast('Sent to printer') }],
    rows: [{ paper: true, cards: [{ parts: [letterhead('FEE STATEMENT · 2026–27', s.adm || s.app, fd(TODAY)),
      kv([['Student', s.name], ['Admission no.', s.adm || s.app], ['Course · branch', `${docCourse(s)} · ${docBranch(s)}`], ['Statement date', fd(TODAY)]]),
      H('Invoices'), table(['Invoice', 'Due', R('Amount'), R('Paid'), R('Balance')], inv.map(i => [C.t(i.no), C.t(fd(i.due)), C.r(inr(i.amt)), C.r(inr(i.paid)), C.r(inr(i.bal))]), [C.t('Total'), C.t(''), C.r(inr(s.net)), C.r(inr(s.paid)), C.r(inr(s.due))]),
      H('Payments'), table(['Receipt', 'Date', 'Mode', 'Applied to', R('Amount'), R('Balance')], pays.map(x => { run -= x.amt; return [C.t(x.rcpt), C.t(fd(x.date)), C.t(x.mode), C.t((apply.get(x.id) || []).map(({ i }) => i ? i.no : 'Advance').join(', ')), C.r(inr(x.amt)), C.r(inr(Math.max(0, run)))]; })),
      { type: 'sign', left: '', sig: 'Accounts', role: 'Accounts in charge' }] }] }] };
};
PAGES['record-payment'] = (sid, b, c, A) => {
  const opts = students.filter(s => s.status === 'Confirmed' && s.due > 0);
  const rp = A.ui.rp || {};
  const s = sById(rp.sid || sid) || opts[0];
  const amt = rp.amt ?? String(s.overdue || (nextDue(s) || { bal: s.due }).bal);
  const n = +String(amt).replace(/[^\d]/g, '') || 0;
  let rem = n;
  const alloc = allocate(s).map(i => { const bal = i.amt - i.paid; const a = Math.min(bal, rem); rem -= a; return [C.t(i.n), C.t(fd(i.due)), C.r(inr(bal)), C.r(a ? inr(a) : '—', { color: '#0F5A9E' }), C.r(inr(bal - a))]; });
  const ref = (rp.ref || '').trim(), dup = ref && payments.find(x => x.ref.toLowerCase() === ref.toLowerCase());
  const set = o => A.setUi({ rp: { ...rp, sid: s.id, amt, ...o } });
  return { back: true, title: 'Record payment', form: 'pay', rp: {
    stuOpts: (opts.includes(s) ? opts : [s, ...opts]).map(o => ({ v: o.id, l: `${o.name} · ${o.adm} · balance ${inr(o.due)}` })), sid: s.id, onStu: e => A.setUi({ rp: { sid: e.target.value } }),
    today: TODAY, modes: PAY_MODES.map(m => ({ label: m, on: rp.mode === m, go: () => set({ mode: m }) })), showRef: rp.mode !== 'Cash', modeErr: rp.err && !rp.mode ? 'Choose how the payment was received.' : '',
    amt, onAmt: e => set({ amt: e.target.value }), ref: rp.ref || '', onRef: e => set({ ref: e.target.value }),
    dup: !!dup, dupText: dup ? `Reference already used on ${dup.rcpt} (${inr(dup.amt)}, ${fd(dup.date)}). To post anyway, enter a reason — it will be logged.` : '',
    alloc: table(['Instalment', 'Due', R('Balance'), R('This payment'), R('After')], alloc), advance: rem > 0, advanceText: `${inr(rem)} exceeds the balance and will be held as an advance.`,
    post: () => {
      if (!rp.mode) return set({ err: true });
      if (!n) return;
      const p = { id: 'p' + Date.now(), rcpt: 'TEC/RCP/26/' + pad(payments.length + 1, 5), sid: s.id, amt: n, date: TODAY, mode: rp.mode, cashier: 'Anita Joseph', ref: rp.mode === 'Cash' ? '—' : (ref || '—'), kind: 'Payment', status: 'Posted' };
      p.alloc = (nextDue(s) || { n: 'Fee instalment' }).n; payments.push(p); s.paid += n; recalc(s);
      audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' 10:41', user: 'Anita Joseph', role: 'Admin', module: 'Payments', action: 'payment.record', record: p.rcpt, detail: `${inr(n)} · ${rp.mode} · ${s.name}`, before: '—', after: `ledger +${inr(n)}`, ip: '10.12.4.1' });
      A.setUi({ rp: null }); A.toast(`${p.rcpt} posted · ledger updated · SMS queued to guardian`); A.go('receipt/' + p.id, { replace: true });
    } } };
};
PAGES.refund = (id, b, c, A) => {
  const r = refunds.find(x => x.id === id); if (!r) return null; const s = sById(r.sid);
  const after = ['Approved', 'Processing', 'Completed'].includes(r.status), canApprove = ['Awaiting approval', 'Submitted', 'On hold'].includes(r.status);
  const act = st => () => { const prev = r.status; r.status = st; audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' 10:52', user: 'Anita Joseph', role: 'Admin', module: 'Refunds', action: 'refund.' + st.toLowerCase().replace(' ', '_'), record: r.no, detail: `${prev} → ${st}`, before: prev, after: st, ip: '10.12.4.1' }); A.toast(`${r.no} → ${st} · guardian notified`); };
  const actions = canApprove ? [{ label: 'Hold', go: act('On hold') }, { label: 'Reject', kind: 'danger', go: act('Rejected') }, { label: 'Approve', icon: 'check', kind: 'primary', go: act('Approved') }]
    : r.status === 'Approved' ? [{ label: 'Execute refund', kind: 'primary', go: act('Processing') }] : r.status === 'Processing' ? [{ label: 'Mark completed', kind: 'primary', go: act('Completed') }] : [];
  return { back: true, title: r.no, sub: `${s.name} · ${s.adm}`, subChip: r.status, actions,
    rows: [{ narrow: true, cards: [{ parts: [
      kv([['Reason', r.reason], ['Raised by', `${r.raisedBy} · ${fd(r.raised)}`], ['Refundable heads', r.heads], ['Approval mode', r.mode], ['Seat booked by', `${s.guardian} · ${s.relation || 'Guardian'}`], ['Refund policy', `${s.policy.ver} accepted ${fd(s.policy.at)}`]]),
      H('Calculation'), table(['', R('')], [[C.t('Amount paid'), C.r(inr(r.paid))], [C.t(r.slab >= 0 ? `Deduction · policy ${s.policy.ver}: ${POLICY.slabs[r.slab][0].toLowerCase()}` : 'Deduction · none (excess payment)'), C.r('− ' + inr(r.deduction), { color: '#B4304A' })]], [C.t('Refund payable'), C.r(inr(r.amount))]),
      H('Approval chain · ' + (r.amount > 10000 ? '2 levels (above ₹10,000)' : '1 level')),
      { type: 'list', items: [
        { num: '1', t: 'Anita Joseph', s: 'Admin · approval' + (after ? ' · ' + fd(addDays(r.raised, 1)) : ''), chip: after ? 'Approved' : r.status === 'Rejected' ? 'Rejected' : r.status === 'Awaiting approval' ? 'Awaiting approval' : '', right: !after && !['Rejected', 'Awaiting approval'].includes(r.status) ? 'Not started' : '' },
        { num: '2', t: 'Finance · Joby Mathew', s: 'Execution — must differ from approvers', chip: r.status === 'Completed' ? 'Approved' : r.status === 'Processing' ? 'Awaiting approval' : '', right: ['Completed', 'Processing'].includes(r.status) ? '' : 'Not started' }] },
      ...(r.mode.startsWith('Physical') ? [H('Physical form'), { type: 'list', items: [{ icon: 'pen-to-square', t: 'Signed refund form', s: after ? `refund_form_${r.no.slice(-4)}.pdf · uploaded by Manoj Pillai` : 'Print the form, get it signed, then upload the scan to confirm the signature', chip: after ? 'Verified' : '', btn: after ? null : { label: 'Upload scan', go: () => A.toast('Choose the scanned form') } }] }] : []),
      H('Payout'), kv([['Pay to', s.guardian], ['Bank account', `XXXXXXXX${s.mobile.slice(-4)} · SBIN0070${s.mobile.slice(-3)}`]])] }] }] };
};
PAGES.campaign = (id, b, c, A) => {
  const cp = CAMPAIGNS.find(x => x.id === id); if (!cp) return null; const people = CAMP_AUD[cp.aud][1]().slice(0, 8), sent = campSent(cp);
  const per = cp.ch.map((ch, i) => { const f = Math.round(cp.failed * (i === 0 ? .6 : .4 / Math.max(1, cp.ch.length - 1))); return [ch, sent ? cp.n : 0, sent ? cp.n - f : 0, sent ? f : 0]; });
  return { back: true, title: cp.name, subChip: cp.status, actions: [...(cp.failed && sent ? [{ label: 'Retry failed', icon: 'replay', go: () => A.toast(`Retrying ${cp.failed} failed messages`) }] : []), { label: 'Duplicate', icon: 'copy', go: () => A.toast('Campaign copied as a draft') }, { label: 'Run again', icon: 'send', kind: 'primary', go: () => A.toast(`${cp.name} queued · ${cp.n} recipients`) }],
    rows: [{ narrow: true, cards: [{ parts: [
      kv([['Type', cp.type], ['Trigger', cp.trigger + (cp.trigger === 'Automatic' ? ' · from Events & channels' : '')], ['Audience', CAMP_AUD[cp.aud][0]], ['Template', cp.tpl], [cp.status === 'Scheduled' ? 'Scheduled for' : 'Run', cp.at === '—' ? 'Not sent' : fd(cp.at.slice(0, 10)) + ' · ' + cp.at.slice(11)], ['Run by', cp.by]]),
      H('Delivery by channel'), table(['Channel', R('Sent'), R('Delivered'), R('Failed')], per.map(([ch, x, d, f]) => [C.t(ch), C.r(x || '—'), C.r(x ? d : '—'), C.r(f ? f : (x ? 0 : '—'), { color: f ? '#B4304A' : '#1B1B1B' })]), [C.t('Total'), C.r(sent || '—'), C.r(sent ? sent - cp.failed : '—'), C.r(sent ? cp.failed : '—')]),
      H(`Recipients · first ${people.length} of ${cp.n}`),
      people.length ? { type: 'list', items: people.map(s => ({ t: s.guardian, s: `for ${s.name} · ${s.adm}`, right: '+91 ' + (s.gmobile || s.mobile), go: () => A.go('admissions/view/' + s.id) })) } : { type: 'empty', text: 'No one matches this audience today.' }] }] }] };
};
PAGES['new-campaign'] = (a, b, c, A) => ({ back: true, title: 'New campaign', form: 'campaign', nc: {
  types: Object.keys(CAMP_TPL).map(t => ({ v: t, l: t })), auds: Object.entries(CAMP_AUD).map(([k, [l, f]]) => ({ v: k, l: `${l} · ${f().length}` })), later: !!(A.ui.nc && A.ui.nc.later), onWhen: e => A.setUi({ nc: { later: e.target.value === 'later' } }),
  min: addDays(TODAY, 1) + 'T09:00', draft: () => { A.toast('Campaign saved as draft'); A.back(); }, send: () => { A.toast(A.ui.nc && A.ui.nc.later ? 'Scheduled · recipients will get it at the set time' : 'Sending now · SMS and WhatsApp'); A.back(); } } });
PAGES.report = (name, b, c, A) => {
  name = decodeURIComponent(name || '');
  const rows = PROGS.map(p => { const x = students.filter(s => s.prog === p.code && s.fee); const as = x.reduce((t, s) => t + s.net, 0), pd = x.reduce((t, s) => t + s.paid, 0); return { p: p.name, n: x.length, as, pd, bal: as - pd, od: x.reduce((t, s) => t + s.overdue, 0), pct: as ? Math.round(pd / as * 100) + '%' : '—' }; });
  const sum = k => rows.reduce((t, r) => t + r[k], 0);
  return { back: true, title: name, actions: [{ label: 'Excel', go: () => A.toast('Excel export started') }, { label: 'CSV', go: () => A.toast('CSV export started') }, { label: 'PDF', icon: 'download', kind: 'primary', go: () => A.toast('PDF export started') }],
    rows: [{ cards: [{ extra: 'Thejus Engineering College · 2026–27 · 01 Jun 2026 – ' + fd(TODAY), parts: [table(['Programme', R('Students'), R('Assessed'), R('Collected'), R('Balance'), R('Overdue'), R('%')],
      rows.map(r => [C.t(r.p), C.r(r.n), C.r(inr(r.as)), C.r(inr(r.pd)), C.r(inr(r.bal)), C.r(inr(r.od), { color: '#B4304A' }), C.r(r.pct)]),
      [C.t('Total'), C.r(sum('n')), C.r(inr(sum('as'))), C.r(inr(sum('pd'))), C.r(inr(sum('bal'))), C.r(inr(sum('od'))), C.t('')])] }] }] };
};
PAGES['audit-event'] = (id, b, c, A) => {
  const e = audit.find(x => x.id === id); if (!e) return null;
  return { back: true, title: 'Audit event', rows: [{ narrow: true, cards: [{ parts: [kv([['When', e.at], ['Who', `${e.user} · ${e.role}`], ['Action', e.action], ['Record', e.record], ['IP', e.ip]]),
    H('Change'), { type: 'beforeAfter', before: e.before, after: e.after }, { type: 'text', text: e.detail }] }] }] };
};

PAGES.notifications = (a, b, c, A, go) => {
  const tab = NOTE_TABS.some(([k]) => k === a) ? a : 'campaigns';
  const base = { title: 'Messages', actions: [{ label: 'New campaign', icon: 'plus', kind: 'primary', go: () => go('new-campaign') }], kpis: msgKpis(), tabs: tabsOf(A, 'notifications', NOTE_TABS, tab) };
  if (tab === 'events') {
    const rows = [['Seat booked', 1, 1, 1], ['Payment received', 1, 1, 1], ['Instalment due (3 days before)', 1, 1, 0], ['Instalment overdue', 1, 1, 1], ['Refund status changed', 1, 0, 1], ['Document ready', 0, 1, 1], ['Admission cancelled', 1, 0, 1]]
      .map(([e, sms, wa, em]) => ({ e, sms, wa, em, rem: e.includes('overdue') ? 'Every 5 days' : e.includes('due') ? '3 days before' : '' }));
    return { ...base, sheet: { rows, noExport: true, cols: [col('e', 'Event', 280), col('sms', 'SMS', 110, r => C.sw(r.sms)), col('wa', 'WhatsApp', 130, r => C.sw(r.wa)), col('em', 'Email', 110, r => C.sw(r.em)), col('lang', 'Languages', 140, () => C.tags(['EN', 'ML'])), col('rem', 'Reminder', 160, r => r.rem ? C.t(r.rem) : C.faint('—'))] },
      rows: [{ cards: [{ title: 'Credits & delivery', parts: [
        { type: 'meters', items: [{ k: 'SMS credits', v: '18,240', w: '46%', c: '#0F6CBD' }, { k: 'WhatsApp credits', v: '4,120', w: '21%', c: '#E37400' }] },
        { type: 'strip', items: [{ k: 'Sent this month', v: '6,402' }, { k: 'Delivered', v: '98.7%', color: '#0E700E' }, { k: 'Failed, retried', v: '61' }] },
        notice('warn', 'WhatsApp credits will run out in about 9 days at the current rate.')] }] }] };
  }
  if (tab === 'log') {
    const rows = payments.slice(-60).reverse().map((p, i) => { const s = sById(p.sid); return { at: p.date, to: '+91 ' + s.mobile, name: s.guardian, ev: 'Payment received', ch: i % 3 === 0 ? 'WhatsApp' : 'SMS', tpl: 'PAY_RCVD_EN', st: i % 23 === 7 ? 'Failed' : i < 2 ? 'Queued' : 'Delivered', ref: p.rcpt }; });
    return { ...base, actions: [], sheet: { rows, cols: [col('at', 'Date', 104, r => C.t(fd(r.at))), col('name', 'Recipient', 160), col('to', 'Number', 130), col('ev', 'Event', 150), col('ch', 'Channel', 96), col('tpl', 'Template', 120), col('ref', 'Related', 140), col('st', 'Status', 100, r => C.chip(r.st))] } };
  }
  if (tab === 'templates') return { ...base, actions: [{ label: 'New template', icon: 'plus', kind: 'primary', go: () => A.toast('New template') }], sheet: { rows: [
    { c: 'SEAT_BKD_EN', e: 'Seat booked', ch: 'SMS', l: 'EN', dlt: '1107169xxxx2231', b: 'Dear {guardian}, seat booked for {student} in {programme}. Adm no {adm_no}. -THEJUS' },
    { c: 'PAY_RCVD_EN', e: 'Payment received', ch: 'SMS', l: 'EN', dlt: '1107169xxxx2240', b: 'Received Rs {amount} for {student}. Receipt {receipt_no}. Balance Rs {balance}. -THEJUS' },
    { c: 'PAY_RCVD_ML', e: 'Payment received', ch: 'WhatsApp', l: 'ML', dlt: '—', b: '{student} ന്റെ ഫീസ് Rs {amount} ലഭിച്ചു. രസീത് {receipt_no}.' },
    { c: 'DUE_SOON_EN', e: 'Instalment due', ch: 'SMS', l: 'EN', dlt: '1107169xxxx2255', b: 'Reminder: Rs {amount} due on {due_date} for {student}. Pay: {link} -THEJUS' },
    { c: 'OVERDUE_EN', e: 'Instalment overdue', ch: 'Email', l: 'EN', dlt: '—', b: 'Fee overdue for {student}: Rs {amount} since {due_date}…' },
    { c: 'RFD_STATUS_EN', e: 'Refund status', ch: 'SMS', l: 'EN', dlt: '1107169xxxx2290', b: 'Refund {refund_no} for {student} is now {status}. -THEJUS' }],
    cols: [col('c', 'Code', 140), col('e', 'Event', 160), col('ch', 'Channel', 90), col('l', 'Lang', 60), col('dlt', 'DLT template ID', 160), col('b', 'Body', 420)] } };
  const rows = [...CAMPAIGNS].sort((x, y) => (y.at === '—' ? '9' : y.at).localeCompare(x.at === '—' ? '9' : x.at));
  return { ...base, sheet: { rows, fKey: 'Status', opts: ['Completed', 'Running', 'Scheduled', 'Partly failed', 'Draft'].map(x => [x, x, r => r.status === x]), open: r => go('campaign/' + r.id), cols: [
    col('at', 'Run date', 132, r => r.at === '—' ? C.faint('Not sent') : C.t(fd(r.at.slice(0, 10)) + ' ' + r.at.slice(11))), col('name', 'Campaign', 250, r => C.link(r.name)), col('type', 'Type', 140), col('trigger', 'Trigger', 100),
    col('ch', 'Channels', 190, r => C.tags(r.ch), { text: r => r.ch.join(' ') }), col('aud', 'Audience', 230, r => C.t(CAMP_AUD[r.aud][0])), col('n', 'Recipients', 96, r => C.r(r.n)),
    col('sent', 'Messages', 96, r => campSent(r) ? C.r(campSent(r).toLocaleString('en-IN')) : C.r('—', { color: '#6B7280' })),
    col('del', 'Delivered', 96, r => campDel(r) == null ? C.r('—', { color: '#6B7280' }) : C.r(campDel(r) + '%', { color: campDel(r) < 95 ? '#8A6100' : '#0E700E' })),
    col('failed', 'Failed', 76, r => C.r(r.failed, { color: r.failed ? '#B4304A' : '#6B7280' })), col('status', 'Status', 120, r => C.chip(r.status)), col('by', 'Run by', 140)] } };
};

PAGES.reports = (a, b, c, A, go) => {
  const tab = a === 'list' ? 'list' : 'analytics';
  const PA = actProgs(), byQ = QUOTAS.map(q => PA.reduce((x, p) => add(x, stat(p, q)), Z)), all = byQ.reduce(add, Z);
  const card = (label, s) => ({ label, value: s.used, of: ` / ${s.cap}`, segs: segs(s), footL: `${Math.round(pct(s.used, s.cap))}% filled`, footR: `${Math.max(0, s.cap - s.used)} left` });
  const base = { title: 'Reports & analytics', kpis: [card('All quotas', all), ...QUOTAS.map((q, k) => card(q, byQ[k]))], tabs: tabsOf(A, 'reports', [['analytics', 'Analytics'], ['list', 'Reports']], tab) };
  if (tab === 'list') {
    const cats = Object.keys(REPORTS), cat = cats.includes(A.ui.repCat) ? A.ui.repCat : 'all';
    const allR = cats.flatMap(g => REPORTS[g].map((r, i) => ({ r, g, last: addDays(TODAY, -((r.length * 7 + i * 3) % 12)) })));
    const rs = cat === 'all' ? allR : allR.filter(x => x.g === cat);
    return { ...base, rows: [{ cards: [{ seg: [['all', 'All', allR.length], ...cats.map(g => [g, g, REPORTS[g].length])].map(([k, l, n]) => ({ label: l, count: n, on: k === cat, go: () => A.setUi({ repCat: k }) })), extra: `${rs.length} report${rs.length === 1 ? '' : 's'}`,
      parts: [table(['Report', 'Category', 'Formats', 'Last generated', R('')], rs.map(x => [C.link(x.r, () => go('report/' + encodeURIComponent(x.r)), { icon: 'file-excel' }), C.tag(x.g), C.faint(REP_FMT[x.g]), C.t(fd(x.last)), C.btn('Open', () => go('report/' + encodeURIComponent(x.r)))]))] }] }] };
  }
  const views = [['seats', 'Seat occupancy'], ['fees', 'Fee collection by programme'], ['quota', 'Seats filled by quota']];
  const view = views.some(([k]) => k === A.ui.repView) ? A.ui.repView : 'seats';
  const occ = students.filter(s => OCCUPY.includes(s.status));
  const progs = PROGS.map(p => { const x = occ.filter(s => s.prog === p.code); const as = x.reduce((t, s) => t + s.net, 0), pd = x.reduce((t, s) => t + s.paid, 0); return { p, n: x.length, as, pd, pct: as ? Math.round(pd / as * 100) : 0 }; }).filter(r => r.n);
  const totA = progs.reduce((t, r) => t + r.as, 0), totP = progs.reduce((t, r) => t + r.pd, 0);
  const byQuota = QUOTAS.map(q => [q, occ.filter(s => s.quota === q).length]), maxQ = Math.max(1, ...byQuota.map(x => x[1]));
  const note = { seats: 'Seat occupancy · 2026–27', fees: `${inrS(totP)} of ${inrS(totA)} collected · ${totA ? Math.round(totP / totA * 100) : 0}%`, quota: `${occ.length} seats filled · 2026–27` }[view];
  const body = view === 'seats' ? table(['Programme', ...QUOTAS, R('Total')], [
    ...PA.map(p => { const row = QUOTAS.map(q => stat(p, q)), t = row.reduce(add, Z); return [C.two(p.name, `${p.dept} · ${p.code}`), ...row.map(occCell), C.two(`${t.used} / ${t.cap}`, `${Math.round(pct(t.used, t.cap))}% filled`, { align: 'right' })]; })],
    [C.t('All programmes'), ...byQ.map(occCell), C.two(`${all.used} / ${all.cap}`, `${Math.round(pct(all.used, all.cap))}% filled`, { align: 'right' })])
    : { type: 'bars', items: view === 'fees' ? progs.map(r => ({ label: r.p.name, w: pct(r.pd, r.as || 1) + '%', val: r.pct + '%', faint: '· ' + inrS(r.pd) })) : byQuota.map(([q, n]) => ({ label: q, w: n / maxQ * 100 + '%', val: n, faint: '· ' + (occ.length ? Math.round(n / occ.length * 100) : 0) + '%' })) };
  return { ...base, rows: [{ cards: [{ seg: views.map(([k, l]) => ({ label: l, on: k === view, go: () => A.setUi({ repView: k }) })), extra: note, parts: [body] }] }] };
};

PAGES.audit = (a, b, c, A, go) => ({ title: 'Audit log', sheet: { rows: audit, noExport: true, open: r => go('audit-event/' + r.id), cols: [
  col('at', 'Timestamp', 140), col('user', 'User', 170), col('role', 'Role', 150), col('action', 'Action', 140, r => C.tag(r.action)), col('record', 'Record', 160), col('detail', 'Detail', 280), col('before', 'Before', 120), col('after', 'After', 130), col('ip', 'IP', 110)] } });

/* settings */
function subnav(A, cur, role) {
  return [{ head: 'Organisation' }, ...(role === 'Admin' ? SET.map(([k, l]) => ({ label: l, on: 'settings/' + k === cur, go: () => A.go('settings/' + k) })) : []),
    { head: 'Admission' }, ...ADMSET.map(([k, l]) => ({ label: l, on: 'admset/' + k === cur, go: () => A.go('admset/' + k) }))].filter((x, i, arr) => !(x.head && arr[i + 1] && arr[i + 1].head));
}
PAGES.settings = (a, b, c, A) => {
  if (A.role !== 'Admin') return PAGES.admset('seats', null, null, A);
  const k = SET.some(([x]) => x === a) ? a : 'organisation';
  const base = { settings: true, subnav: subnav(A, 'settings/' + k, A.role), setTitle: SET.find(x => x[0] === k)[1], form: 'set-' + k };
  if (k === 'users') return { ...base, form: null, rows: [{ cards: [{ title: `${USERS.length} users`, action: { label: 'Invite user', icon: 'plus', go: () => A.toast('Invite sent') }, parts: [
    table(['Name', 'Role', 'Scope', '2FA', 'Last active', 'Status'], USERS.map(u => [{ k: 'avatar', text: u.name, sub: u.email, ini: u.name.split(' ').filter(w => /^[A-Z]/.test(w)).slice(-2).map(w => w[0]).join('') }, C.t(u.role), C.faint(u.scope), u.twofa ? C.t('✓', { color: '#0E700E' }) : C.faint('Optional'), C.faint(u.last), C.chip(u.status)])),
    { type: 'text', faint: true, text: '2FA is mandatory for finance and admin roles. A user can hold roles in several institutions and switch between them without logging out.' }] }] }] };
  if (k === 'roles') return { ...base, roles: [['Book seat / create or edit admission', 'y,v'], ['Configure seat matrix and structure', 'y,n'], ['Configure fee templates', 'y,y'], ['Assign fee to student', 'y,y'], ['Record payment', 'y,y'], ['Approve refund', 'y,n'], ['Execute refund', 'y,c:After approval'], ['Messages and templates', 'y,n'], ['Manage users and roles', 'y,n'], ['Organisation settings', 'y,n'], ['Reports', 'y,y'], ['View audit log', 'y,c:Finance module']]
    .map(([a2, v]) => ({ action: a2, cells: v.split(',').map(x => x === 'y' ? { t: 'Yes', bg: '#E8F4E9', fg: '#0E700E' } : x === 'n' ? { t: 'No', bg: '#F0F2F5', fg: '#5E6673' } : x === 'v' ? { t: 'View', bg: '#E8F1FA', fg: '#0F6CBD' } : { t: x.slice(2), bg: '#FBF2E1', fg: '#8A6100' }) })),
    roleCounts: ['Admin', 'Finance'].map(r => ({ r, n: USERS.filter(u => u.role === r).length + ' users' })) };
  return base;
};
PAGES.admset = (a, b, c, A, go) => {
  const k = ADMSET.some(([x]) => x === a) ? a : 'seats';
  const base = { settings: true, subnav: subnav(A, 'admset/' + k, A.role), setTitle: ADMSET.find(x => x[0] === k)[1] };
  if (k === 'seats') return { ...base, setActions: [{ label: 'Add course', icon: 'plus', kind: 'primary', go: () => A.toast('Add course · name and duration') }], form: 'seats',
    seats: { quotas: QUOTAS.map(q => q + ' seats'), courses: [...new Set(PROGS.map(progCourse))].map(cn => ({ name: cn, add: () => A.toast('Add department to ' + cn), depts: PROGS.filter(p => progCourse(p) === cn).map(p => ({ name: progBranch(p), code: p.code, caps: QUOTAS.map(q => ({ v: p.cap[q] || 0 })), on: p.active !== false, bg: p.active === false ? '#F0F2F5' : '#fff', label: p.active === false ? 'Inactive' : 'Active', toggle: () => { p.active = p.active === false; A.toast(`${p.name} is now ${p.active ? 'active' : 'inactive'}`); } })) })),
      foot: [`${[...new Set(PROGS.map(progCourse))].length} courses · ${actProgs().length} active departments`, ...QUOTAS.map(q => actProgs().reduce((t, p) => t + (p.cap[q] || 0), 0))] } };
  if (k === 'fees') {
    const t = FEE_TABS.some(([x]) => x === b) ? b : 'heads';
    const tabs = tabsOf(A, 'admset/fees', FEE_TABS, t);
    const S = {
      heads: [{ label: 'Add fee head', icon: 'plus', kind: 'primary' }, { rows: feeHeadRows, cols: [col('code', 'Code', 70), col('name', 'Fee head', 200), col('refund', 'Refundable', 150, r => r.refund === 'Refundable' ? C.chip('Refundable', { tone: 'ok' }) : C.tag(r.refund)), col('tax', 'Tax code', 150), col('freq', 'Frequency', 120), col('active', 'Status', 110, r => C.chip(r.active))] }],
      templates: [{ label: 'New template', icon: 'plus', kind: 'primary' }, { rows: templates, cols: [col('code', 'Template', 190, r => C.link(r.code)), col('year', 'Year', 80), col('prog', 'Programme', 190), col('quota', 'Quota', 110), col('cat', 'Category', 80), col('ver', 'Version', 74, r => C.tag(r.ver)), col('tui', 'Tuition', 100, r => C.r(inr(r.tui))), col('total', 'Year 1 total', 110, r => C.r(inr(r.total))), col('assigned', 'Students', 84, r => C.r(r.assigned)), col('status', 'Status', 90, r => C.chip(r.status)), col('updated', 'Updated', 104, r => C.t(fd(r.updated)))] }],
      schedules: [{ label: 'New schedule', icon: 'plus', kind: 'primary' }, { rows: [
        { n: 'Standard 3-part', type: 'Instalment', parts: 'At admission 40% · 30% · 30%', rule: 'At admission · booking + 45 days · 20 Jan', used: 16 }, { n: 'MBA annual', type: 'Annual', parts: 'Booking ₹10,000 · Balance 100%', rule: 'Booking + 21 days', used: 3 },
        { n: 'M.Tech semester split', type: 'Semester', parts: 'Sem 1 50% · Sem 2 50%', rule: '1 Aug · 20 Jan', used: 2 }, { n: 'Hostel termly', type: 'Term', parts: 'Term 1 · Term 2 · Term 3', rule: '10th of Jul, Nov, Mar', used: 1 }, { n: 'Bus monthly', type: 'Monthly', parts: '10 × monthly', rule: '5th of every month', used: 1 }],
        cols: [col('n', 'Schedule', 210), col('type', 'Type', 100), col('parts', 'Instalments', 260), col('rule', 'Due-date rule', 240), col('used', 'Templates', 90, r => C.r(r.used))] }],
      concessions: [{ label: 'Grant concession', icon: 'plus', kind: 'primary' }, { rows: concRows, open: r => go(`admissions/view/${r.id}/finance`), cols: [col('adm', 'Admission no.', 128, r => C.link(r.adm)), col('name', 'Student', 170), col('type', 'Concession', 170), col('basis', 'Basis', 80), col('conc', 'Amount', 100, r => C.r(inr(r.conc))), col('officer', 'Requested by', 130), col('appr', 'Approved by', 130), col('cst', 'Status', 150, r => C.chip(r.cst))] }],
      late: [{ label: 'New rule', icon: 'plus', kind: 'primary' }, { rows: [
        { n: 'Tuition late fee', type: 'Per day', v: '₹50 / day', g: '7 days', cap: '₹2,500', on: 'All B.Tech & M.Tech templates', st: 'Active' }, { n: 'MBA late fee', type: 'Flat', v: '₹1,000', g: '10 days', cap: '—', on: 'MBA annual', st: 'Active' }, { n: 'Hostel late fine', type: 'Per day', v: '₹25 / day', g: '5 days', cap: '₹1,000', on: 'Hostel termly', st: 'Active' }],
        noSearch: true, noExport: true, cols: [col('n', 'Rule', 220), col('type', 'Type', 100), col('v', 'Value', 120), col('g', 'Grace', 90), col('cap', 'Cap', 100), col('on', 'Applies to', 240), col('st', 'Status', 90, r => C.chip(r.st))] }],
    }[t];
    const acts = [...(t === 'templates' ? [{ label: 'Bulk assign to batch', icon: 'clone', go: () => A.toast('Fees assigned to 4 students · 2 overrides sent for approval') }] : []), { ...S[0], go: () => A.toast(S[0].label) }];
    return { ...base, setActions: acts, tabs, sheet: S[1] };
  }
  if (k === 'documents') return { ...base, setActions: [{ label: 'Bulk generate', icon: 'clone', go: () => A.toast('Bulk generate started') }, { label: 'New template', icon: 'plus', kind: 'primary', go: () => A.toast('New template') }], form: 'docs',
    reqDocs: [['SSLC certificate', 'All programmes', 1], ['Plus Two mark sheet', 'B.Tech, Lateral entry', 1], ['Transfer certificate (TC)', 'All programmes', 1], ['Community certificate', 'SC, ST, OBC, OEC, EWS', 1], ['Degree certificate', 'M.Tech, MBA', 1], ['GATE scorecard', 'M.Tech', 1], ['KEAM / KMAT score', 'B.Tech, MBA', 0], ['Passport & visa', 'NRI quota', 1], ['Passport photo', 'All programmes', 1], ['Aadhaar', 'All programmes', 0]].map(([d, f, m]) => ({ d, f, m: !!m })),
    docTpls: [['Admission form', 'P0', 'Admissions'], ['Fee structure slip', 'P0', 'Fees'], ['Fee demand note', 'P0', 'Fees'], ['Fee receipt', 'P0', 'Payments'], ['Acknowledgement', 'P0', 'Admissions'], ['Refund form', 'P0', 'Refunds'], ['Bonafide certificate', 'P1', 'Students'], ['Transfer certificate', 'P1', 'Students'], ['Conduct certificate', 'P1', 'Students'], ['ID card', 'P1', 'Students']].map(([n, p, m]) => ({ n, p1: p === 'P1', m: m + ' · Thejus letterhead · edited 2 Oct', go: () => A.toast('Template editor · ' + n) })) };
  if (k === 'policy') return { ...base, form: 'policy', policy: { ver: POLICY.ver, slabs: POLICY.slabs.map(([w, r]) => ({ w, r })), statuses: STATUSES.map((s, i) => ({ s, arrow: i < 2 })) } };
  if (k === 'numbering') return { ...base, form: 'numbering', numbering: [['Admission number', '{INST}/{YEAR}/{SEQ:5}', 'TEC/2026/' + pad(students.length + 1, 5)], ['Receipt', '{INST}/RCP/{YY}/{SEQ:5}', 'TEC/RCP/26/' + pad(payments.length + 1, 5)], ['Contra / reversal', '{INST}/CTR/{YY}/{SEQ:5}', 'TEC/CTR/26/00002'], ['Refund', '{INST}/RFD/{YY}/{SEQ:4}', 'TEC/RFD/26/' + pad(refunds.length + 1, 4)], ['Fee demand / invoice', '{INST}/INV/{YY}/{SEQ:5}', 'TEC/INV/26/00412'], ['Application', 'APP-{YY}-{SEQ:4}', 'APP-26-' + (1040 + students.length)]].map(([s, f, n]) => ({ s, f, n })) };
  return { ...base, form: 'form' };
};

export { PAGES };
