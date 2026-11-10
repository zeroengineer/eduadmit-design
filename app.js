/* EduAdmit — v1 clickable prototype (no build step). Sample data only. */
(() => {
'use strict';

/* ================= helpers ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const inrS = n => n >= 1e7 ? '₹' + (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(2) + ' L' : inr(n);
const TODAY = '2026-11-04';
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fd = iso => iso ? new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
const fdShort = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const pad = (n, w) => String(n).padStart(w, '0');
let seed = 20261104;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const wpick = pairs => { let t = rnd() * pairs.reduce((s, p) => s + p[1], 0); for (const [v, w] of pairs) { if ((t -= w) <= 0) return v; } return pairs[0][0]; };

const PI = { left: 'arrow-left', admset: 'sliders-h', dashboard: 'th-large', admissions: 'user-plus', dues: 'calendar-clock', seats: 'table', fees: 'indian-rupee', payments: 'credit-card', refunds: 'replay', documents: 'file', notifications: 'comments', bell: 'bell', reports: 'chart-bar', audit: 'shield', settings: 'cog', search: 'search', plus: 'plus', download: 'download', upload: 'upload', filter: 'filter', x: 'times', check: 'check', chevron: 'chevron-down', right: 'chevron-right', help: 'question-circle', printer: 'print', send: 'send', clock: 'clock', user: 'user', lock: 'lock', rotate: 'refresh', alert: 'exclamation-triangle', link: 'link', eye: 'eye', sms: 'mobile', mail: 'envelope', chat: 'whatsapp', building: 'building', more: 'ellipsis-h', grip: 'bars', copy: 'copy', layers: 'clone', sheet: 'file-excel', hand: 'pen-to-square', info: 'info-circle' };
const ic = (n, s = 14) => `<i class="ic pi pi-${PI[n] || n}" style="font-size:${s}px"></i>`;

/* ================= sample data ================= */
const PROGS = [
  { code: 'BT-CSE', name: 'B.Tech Computer Science', dept: 'Computer Science', m: 1, cap: { Government: 30, Management: 18, NRI: 6, 'Lateral entry': 6 } },
  { code: 'BT-ECE', name: 'B.Tech Electronics & Comm.', dept: 'Electronics', m: 1, cap: { Government: 30, Management: 15, NRI: 3, 'Lateral entry': 6 } },
  { code: 'BT-ME', name: 'B.Tech Mechanical', dept: 'Mechanical', m: 1, cap: { Government: 30, Management: 12, NRI: 3, 'Lateral entry': 6 } },
  { code: 'BT-CE', name: 'B.Tech Civil', dept: 'Civil', m: 1, cap: { Government: 24, Management: 9, NRI: 3, 'Lateral entry': 6 } },
  { code: 'MT-CSE', name: 'M.Tech Computer Science', dept: 'Computer Science', m: 1.15, cap: { Government: 9, Management: 9, NRI: 0, 'Lateral entry': 0 } },
  { code: 'MBA', name: 'MBA', dept: 'Management Studies', m: 1.3, cap: { Government: 24, Management: 24, NRI: 6, 'Lateral entry': 0 } },
];
const QUOTAS = ['Government', 'Management', 'NRI', 'Lateral entry'];
const TUITION = { Government: 52000, Management: 98000, NRI: 265000, 'Lateral entry': 64000 };
const FIXED = { 'Application fee': 5000, 'Caution deposit': 10000, 'University & other fees': 3500 };
const PAY_MODES = ['Cash', 'UPI', 'Bank transfer', 'Cheque', 'DD'];
const modePicked = () => { const b = $('#pMode .on'); if (b) return b.textContent; $('#pMode').classList.add('invalid'); const e = $('#pModeErr'); if (e) e.textContent = 'Choose how the payment was received.'; return ''; };
const STATUSES = ['Seat booked', 'Details collected', 'Confirmed', 'Cancelled', 'Withdrawn'];
const OCCUPY = ['Seat booked', 'Details collected', 'Confirmed'];
const POLICY = { ver: 'v2', slabs: [['Cancelled within 7 days of booking', 'Full refund less ₹1,000 processing'], ['Cancelled before classes begin', 'Refund less 10% of fees paid'], ['Cancelled after classes begin', 'Caution deposit only'], ['Seat vacated after last admission date', 'No refund except caution deposit']] };
/* Instalment schedule: 40% at admission · 30% after 45 days · 30% on 20 Jan */
function instPlan(s) {
  const a1 = Math.round(s.net * .4 / 100) * 100, a2 = Math.round(s.net * .3 / 100) * 100;
  return [
    { n: 'Instalment 1 · at admission', due: s.d1, amt: a1 },
    { n: 'Instalment 2', due: addDays(s.created, 45), amt: a2 },
    { n: 'Instalment 3', due: '2027-01-20', amt: s.net - a1 - a2 },
  ];
}
function allocate(s) { let left = s.paid; return instPlan(s).map(i => { const p = Math.max(0, Math.min(i.amt, left)); left -= p; return { ...i, paid: p }; }); }
function nextDue(s) { const i = allocate(s).find(x => x.amt - x.paid > 0); return i ? { ...i, bal: i.amt - i.paid } : null; }
function recalc(s) {
  const occ = OCCUPY.includes(s.status);
  s.due = occ ? Math.max(0, s.net - s.paid) : 0;
  s.overdue = s.status === 'Confirmed' ? allocate(s).filter(i => i.due < TODAY).reduce((t, i) => t + i.amt - i.paid, 0) : 0;
  const nd = occ ? nextDue(s) : null; s.nextDue = nd ? nd.due : '';
}
const FIRST = ['Arjun', 'Aparna', 'Nikhil', 'Fathima', 'Rahul', 'Anjali', 'Mohammed', 'Sreelakshmi', 'Vishnu', 'Athira', 'Abhinav', 'Nandana', 'Gokul', 'Ameya', 'Sanjay', 'Riya', 'Aswin', 'Devika', 'Harikrishnan', 'Meera', 'Adithya', 'Gayathri', 'Joel', 'Neha', 'Akhil', 'Sneha', 'Rohan', 'Lakshmi', 'Muhammed', 'Anagha', 'Sidharth', 'Hiba', 'Kiran', 'Parvathy', 'Alan', 'Diya'];
const LAST = ['Nair', 'Menon', 'K. S.', 'Pillai', 'Thomas', 'Varghese', 'Rahman', 'Krishnan', 'P. R.', 'George', 'Joseph', 'Babu', 'Kurian', 'Iyer', 'Das', 'Mathew', 'Antony', 'Shaji'];
const OFFICERS = ['Bindu Thomas', 'Sajeev Kumar', 'Reshma P.'];
const CASHIERS = ['Joby Mathew', 'Divya Suresh'];

const students = [], payments = [], refunds = [], audit = [];
const filled = {};
let admSeq = 0;
for (let i = 0; i < 196; i++) {
  const p = wpick([[PROGS[0], 30], [PROGS[1], 18], [PROGS[2], 14], [PROGS[3], 10], [PROGS[4], 6], [PROGS[5], 22]]);
  let quota = wpick([['Government', 45], ['Management', 35], ['NRI', 8], ['Lateral entry', 12]]);
  if (!p.cap[quota]) quota = 'Government';
  let status = wpick([['Seat booked', 10], ['Details collected', 14], ['Confirmed', 62], ['Cancelled', 7], ['Withdrawn', 4]]);
  const key = p.code + '|' + quota;
  if (OCCUPY.includes(status)) { if ((filled[key] || 0) >= p.cap[quota]) status = 'Withdrawn'; else filled[key] = (filled[key] || 0) + 1; }
  const created = status === 'Seat booked' ? addDays(TODAY, -Math.floor(rnd() * 6)) : status === 'Details collected' ? addDays(TODAY, -Math.floor(rnd() * 12)) : addDays('2026-06-01', Math.floor(Math.pow(rnd(), 0.8) * 150));
  const name = pick(FIRST) + ' ' + pick(LAST);
  const fee = Math.round(TUITION[quota] * p.m / 100) * 100 + 18500;
  const conc = fee && rnd() < .12 ? wpick([[5000, 2], [10000, 2], [Math.round(fee * .1 / 100) * 100, 1]]) : 0;
  const net = fee - conc;
  const d1 = addDays(created, status === 'Confirmed' ? Math.floor(rnd() * 3) : 3);
  const plan = instPlan({ net, created, d1 });
  let paid = 0;
  if (status === 'Confirmed') { const r = rnd(); paid = r < .5 ? plan[0].amt : r < .8 ? plan[0].amt + plan[1].amt : net; if (plan[1].due > TODAY && paid > plan[0].amt && rnd() < .7) paid = plan[0].amt; }
  else if (status === 'Cancelled' || status === 'Withdrawn') paid = plan[0].amt;
  const occupying = OCCUPY.includes(status);
  const s = {
    id: 's' + i,
    app: 'APP-26-' + (1040 + i),
    adm: 'TEC/2026/' + pad(++admSeq, 5),
    name, dob: `${2007 + Math.floor(rnd() * 2) - (p.code === 'MBA' || p.code === 'MT-CSE' ? 4 : 0)}-${pad(1 + Math.floor(rnd() * 12), 2)}-${pad(1 + Math.floor(rnd() * 28), 2)}`,
    mobile: '9' + Math.floor(100000000 + rnd() * 899999999),
    guardian: pick(FIRST) + ' ' + name.split(' ').slice(-1)[0], relation: pick(['Father', 'Mother', 'Father', 'Guardian']),
    prog: p.code, progName: p.name, dept: p.dept, quota,
    cat: wpick([['General', 45], ['OBC', 25], ['EWS', 9], ['SC', 12], ['ST', 4], ['OEC', 5]]),
    status, created, officer: pick(OFFICERS),
    entrance: p.code === 'MBA' ? 'KMAT ' + (40 + Math.floor(rnd() * 50)) + '%' : p.code === 'MT-CSE' ? 'GATE ' + (300 + Math.floor(rnd() * 400)) : 'KEAM rank ' + (2000 + Math.floor(rnd() * 48000)),
    fee, conc, net, d1, paid, policy: { ver: POLICY.ver, at: created },
    details: status !== 'Seat booked',
    docs: { SSLC: rnd() < .9 ? 'Verified' : 'Uploaded', 'Plus Two': rnd() < .75 ? 'Verified' : rnd() < .5 ? 'Uploaded' : 'Pending', TC: rnd() < .55 ? 'Verified' : rnd() < .5 ? 'Uploaded' : 'Pending', 'Community certificate': rnd() < .6 ? 'Verified' : 'Pending' },
  };
  if (status === 'Seat booked') s.docs = { SSLC: 'Pending', 'Plus Two': 'Pending', TC: 'Pending', 'Community certificate': 'Pending' };
  recalc(s);
  s.bfee = 10000;
  students.push(s);
}

// payments
let rawPays = [];
students.forEach(s => {
  if (!s.paid) return;
  const mk = (amt, date) => rawPays.push({ sid: s.id, amt, date: date > TODAY ? [addDays(TODAY, -Math.floor(rnd() * 25)), s.d1].sort()[1] : date, mode: wpick([['UPI', 38], ['Cash', 22], ['Bank transfer', 20], ['Cheque', 10], ['DD', 6]]), cashier: pick(CASHIERS) });
  const pl = instPlan(s); let left = s.paid;
  pl.forEach((i, k) => { if (left <= 0) return; const a = Math.min(i.amt, left); left -= a; mk(a, k === 0 ? s.d1 : addDays(i.due, -Math.floor(rnd() * 6))); });
});
rawPays.sort((a, b) => a.date.localeCompare(b.date));
rawPays.forEach((p, i) => {
  const ref = p.mode === 'Cash' ? '—' : p.mode === 'UPI' ? 'UPI' + Math.floor(1e11 + rnd() * 8e11) : p.mode === 'Cheque' ? 'CHQ ' + Math.floor(100000 + rnd() * 899999) : p.mode === 'DD' ? 'DD ' + Math.floor(100000 + rnd() * 899999) : p.mode === 'Payment link' ? 'pay_' + Math.random().toString(36).slice(2, 12) : 'NEFT' + Math.floor(1e9 + rnd() * 8e9);
  payments.push({ id: 'p' + i, rcpt: 'TEC/RCP/26/' + pad(i + 1, 5), ...p, ref, kind: 'Payment', status: 'Posted' });
});
students.forEach(s => { const p = payments.find(x => x.sid === s.id); if (p) { s.bfee = p.amt; p.alloc = 'Booking fee'; } });

// refunds
const RSTAT = ['Submitted', 'Awaiting approval', 'Awaiting approval', 'Approved', 'Processing', 'Completed', 'Completed', 'Rejected', 'On hold'];
let rIdx = 0;
students.filter(s => s.status === 'Cancelled' || s.status === 'Withdrawn').forEach(s => {
  const status = RSTAT[rIdx % RSTAT.length]; rIdx++;
  const deduction = s.status === 'Withdrawn' ? 1000 : Math.round(s.paid * .1 / 100) * 100;
  refunds.push({ id: 'r' + rIdx, no: 'TEC/RFD/26/' + pad(rIdx, 4), sid: s.id, raised: addDays(s.created, 8 + Math.floor(rnd() * 20)) > TODAY ? TODAY : addDays(s.created, 8 + Math.floor(rnd() * 20)), reason: s.status === 'Cancelled' ? 'Admission cancelled — got government seat elsewhere' : 'Withdrawn within 7 days of booking', heads: 'Instalment 1 (tuition, caution deposit)', paid: s.paid, deduction, amount: s.paid - deduction, status, mode: rIdx % 3 === 0 ? 'In-app e-approval' : 'Physical signature + scan', raisedBy: pick(OFFICERS), slab: s.status === 'Withdrawn' ? 0 : 1 });
});
// an extra caution-deposit refund for a confirmed student
const cs = students.find(s => s.status === 'Confirmed' && s.paid === s.net);
if (cs) refunds.push({ id: 'r99', no: 'TEC/RFD/26/' + pad(++rIdx, 4), sid: cs.id, raised: '2026-11-02', reason: 'Excess payment — duplicate UPI transfer', heads: 'Advance', paid: 12500, deduction: 0, amount: 12500, status: 'Awaiting approval', mode: 'In-app e-approval', raisedBy: 'Divya Suresh', slab: -1 });


// audit
const USERS = [
  { name: 'Anita Joseph', role: 'Admin', email: 'anita@thejus.edu.in', scope: 'Organisation', twofa: true, last: '2 min ago', status: 'Active' },
  { name: 'Fr. Thomas Kuriakose', role: 'Organisation owner', email: 'chairman@thejus.edu.in', scope: 'Organisation', twofa: true, last: 'Yesterday', status: 'Active' },
  { name: 'Dr. Suma Rajan', role: 'Institution head', email: 'principal@tec.thejus.edu.in', scope: 'Thejus Engineering College', twofa: true, last: '1 h ago', status: 'Active' },
  { name: 'Bindu Thomas', role: 'Admin', email: 'bindu@tec.thejus.edu.in', scope: 'Thejus Engineering College', twofa: false, last: '5 min ago', status: 'Active' },
  { name: 'Sajeev Kumar', role: 'Admin', email: 'sajeev@tec.thejus.edu.in', scope: 'Programme · B.Tech', twofa: false, last: '20 min ago', status: 'Active' },
  { name: 'Reshma P.', role: 'Admin', email: 'reshma@tec.thejus.edu.in', scope: 'Programme · MBA', twofa: false, last: '3 h ago', status: 'Active' },
  { name: 'George Varghese', role: 'Finance', email: 'accounts@thejus.edu.in', scope: 'Organisation', twofa: true, last: '12 min ago', status: 'Active' },
  { name: 'Joby Mathew', role: 'Finance', email: 'joby@tec.thejus.edu.in', scope: 'Thejus Engineering College', twofa: true, last: 'Just now', status: 'Active' },
  { name: 'Divya Suresh', role: 'Finance', email: 'divya@tec.thejus.edu.in', scope: 'Thejus Engineering College', twofa: true, last: '1 h ago', status: 'Active' },
  { name: 'Manoj Pillai', role: 'Finance', email: 'manager@tec.thejus.edu.in', scope: 'Thejus Engineering College', twofa: true, last: 'Today 09:12', status: 'Active' },
  { name: 'K. R. Associates', role: 'Finance', email: 'audit@krassociates.in', scope: 'Fees, Payments, Refunds', twofa: true, last: '12 Oct 2026', status: 'Active' },
  { name: 'Liya Francis', role: 'Admin', email: 'liya@tec.thejus.edu.in', scope: 'Thejus Engineering College', twofa: false, last: '—', status: 'Invited' },
];
const sById = id => students.find(s => s.id === id);
(() => {
  const ev = [];
  const t = (d, h) => `${d} ${pad(9 + (h % 8), 2)}:${pad((h * 7) % 60, 2)}`;
  payments.slice(-26).forEach((p, i) => ev.push({ at: t(p.date, i), user: p.cashier, role: 'Finance', module: 'Payments', action: p.kind === 'Reversal' ? 'payment.reverse' : 'payment.record', record: p.rcpt, detail: `${inr(p.amt)} · ${p.mode} · ${sById(p.sid).name}`, before: '—', after: `ledger +${inr(p.amt)}`, ip: '10.12.4.' + (20 + i) }));
  students.filter(s => s.status === 'Seat booked').slice(0, 10).forEach((s, i) => ev.push({ at: t(s.created, i + 3), user: s.officer, role: 'Admin', module: 'Admissions', action: 'admission.status', record: s.adm, detail: `${s.name} · seat booked by ${s.guardian} · refund policy ${POLICY.ver} accepted`, before: '—', after: 'Seat booked', ip: '10.12.4.5' }));
  refunds.filter(r => ['Approved', 'Completed', 'Processing'].includes(r.status)).forEach((r, i) => ev.push({ at: t(addDays(r.raised, 2) > TODAY ? TODAY : addDays(r.raised, 2), i + 1), user: 'Manoj Pillai', role: 'Finance', module: 'Refunds', action: 'refund.approve', record: r.no, detail: `Level 1 approved · ${inr(r.amount)}`, before: 'Awaiting approval', after: 'Approved', ip: '10.12.4.9' }));
  ev.push({ at: '2026-11-03 17:42', user: 'George Varghese', role: 'Finance', module: 'Fees', action: 'template.publish', record: 'FT-26-BTECH-MGMT v3', detail: 'Published new version; 0 assigned plans changed', before: 'v2 active', after: 'v3 active', ip: '10.12.4.2' });
  ev.push({ at: '2026-11-03 11:05', user: 'Anita Joseph', role: 'Admin', module: 'Settings', action: 'role.permission', record: 'Finance', detail: 'Enabled payment.record for Initial fee', before: 'No', after: 'Yes', ip: '10.12.4.1' });
  ev.push({ at: '2026-11-02 16:20', user: 'Platform support · Rahul', role: 'Platform support', module: 'Platform access', action: 'support.session', record: 'Ticket #4182', detail: 'Read-only session with tenant consent, 30 min', before: '—', after: 'Ended 16:50', ip: '13.232.8.14' });
  ev.push({ at: '2026-11-01 10:14', user: 'K. R. Associates', role: 'Finance', module: 'Reports', action: 'export', record: 'Fee collection register', detail: 'Excel export · Oct 2026', before: '—', after: '—', ip: '49.37.12.88' });
  ev.push({ at: '2026-11-04 08:58', user: 'Joby Mathew', role: 'Finance', module: 'Auth', action: 'login', record: '—', detail: 'Password + OTP', before: '—', after: '—', ip: '10.12.4.31' });
  ev.sort((a, b) => b.at.localeCompare(a.at));
  ev.forEach((e, i) => audit.push({ id: 'a' + i, ...e }));
})();

/* ================= state ================= */
const ROLES = {
  'Admin': null,
  'Finance': ['dashboard', 'admissions', 'admset', 'dues', 'payments', 'refunds', 'reports', 'audit'],
};
const state = { role: 'Admin', preset: null, ay: '2026–27' };

const NAV = [
  ['Overview', [['dashboard', 'Dashboard']]],
  ['Admissions', [['admissions', 'Admissions']]],
  ['Finance', [['payments', 'Payments']]],
  ['Operations', [['notifications', 'Messages'], ['reports', 'Reports & analytics'], ['audit', 'Audit log']]],
  ['Organisation', [['settings', 'Settings']]],
];
const allowed = p => !ROLES[state.role] || ROLES[state.role].includes(p);

function renderNav(active) {
  const pendingRef = refunds.filter(r => r.status === 'Awaiting approval' || r.status === 'Submitted').length;
  const badges = { admissions: students.filter(s => s.status === 'Seat booked' || s.status === 'Details collected').length, payments: students.filter(s => s.overdue > 0).length };
  $('#sidebar').innerHTML = NAV.map(([g, items]) => {
    const vis = items.filter(([k]) => allowed(k) || (k === 'settings' && allowed('admset')));
    if (!vis.length) return '';
    return (g === 'Overview' ? '' : '<div class="nav-sep"></div>') + vis.map(([k, l]) => `<a class="nav-item ${k === active ? 'active' : ''}" href="#${k === 'settings' && !allowed('settings') ? 'admset' : k}" title="${l}">${ic(k)}<span class="nav-label">${l}</span>${badges[k] ? `<span class="badge">${badges[k]}</span>` : ''}</a>`).join('');
  }).join('') + `<button class="nav-collapse" data-navtoggle title="Collapse menu ( [ )"><i class="pi pi-angle-double-left"></i><span class="nav-label">Collapse</span></button>`;
}

/* ================= UI primitives ================= */
const STATUS_CLS = { 'Up to date': 'ok', Paid: 'ok', 'Part paid': 'warn', 'Due soon': 'warn', 'Fully paid': 'ok', Scheduled: '', 'Partly failed': 'warn', 'Seat booked': '', 'Details collected': 'warn', Overdue: 'bad', 'Due this week': 'warn', Upcoming: 'grey', 'Awaiting first payment': '', 'Policy accepted': 'ok', 'Pay now': '', Confirmed: 'ok', Cancelled: 'bad', Withdrawn: 'bad', Submitted: 'grey', 'Awaiting approval': 'warn', Approved: '', Processing: 'violet', Completed: 'ok', Rejected: 'bad', 'On hold': 'grey', Posted: 'ok', Reversed: 'bad', Verified: 'ok', Uploaded: '', Pending: 'warn', Delivered: 'ok', Failed: 'bad', Queued: 'grey', Sent: '', New: '', Contacted: 'violet', 'Visit scheduled': 'warn', 'Application started': '', Converted: 'ok', Lost: 'grey', Active: 'ok', Invited: 'warn', Draft_: 'grey', Archived: 'grey', Running: 'violet', Ready: 'ok', 'Signed · scanned': 'ok', Printed: '', 'Awaiting signature': 'warn' };
const chip = s => `<span class="chip ${STATUS_CLS[s] ?? 'grey'}">${esc(s)}</span>`;

function toast(msg) {
  const [sum, ...rest] = String(msg).split(' · ');
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<i class="pi pi-check-circle"></i><div><div class="t-s">${sum}</div>${rest.length ? `<div class="t-d">${rest.join(' · ')}</div>` : ''}</div>`;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
}
/* no overlays: what used to be a modal or a drawer opens as a full page; Back returns to the page underneath */
let pageView = false;
function openPage(html, kind) {
  const main = $('#main'); pageView = true;
  main.innerHTML = `<div class="mp-page mp-${kind}"><div class="mp-back"><button class="btn ghost" data-close-modal>${ic('left', 14)}Back</button></div><div class="mp-card">${html}</div></div>`;
  main.scrollTop = 0;
}
function openDrawer(html) { openPage(html, 'drawer'); }
function openModal(html) { openPage(html, 'modal'); }
function closeModal() { if (!pageView) return; pageView = false; route(); }
function closeDrawer() { closeModal(); }
function openMenu(anchor, html) {
  const m = $('#menu'); m.innerHTML = html; m.classList.add('on');
  const r = anchor.getBoundingClientRect();
  m.style.top = r.bottom + 6 + 'px';
  m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 10) + 'px';
}
const closeMenu = () => $('#menu').classList.remove('on');
const mHead = t => `<div class="m-head"><h2>${t}</h2><button class="icon-btn" data-close-modal>${ic('x')}</button></div>`;

function pageHead(title, sub, actions = '', crumb = '') {
  return `<div class="page-head"><div>${crumb ? `<div class="crumb">${crumb}</div>` : ''}<h1>${title}</h1></div><div class="actions">${actions}</div></div>`;
}

/* ================= Admission settings shell ================= */
const ADMSET = [['seats', 'Seat matrix'], ['fees', 'Fee setup'], ['documents', 'Documents'], ['form', 'Admission form'], ['policy', 'Booking & refund policy'], ['numbering', 'Numbering']];
const setTitle = (title, actions = '') => `<div class="set-title"><h2>${title}</h2><div class="actions">${actions}</div></div>`;
const admHead = (sec, actions = '') => setTitle(ADMSET.find(x => x[0] === sec)[1], actions);
const admWrap = (sec, body, actions = '') => `<div class="fill">${admHead(sec, actions)}<div class="content">${body}</div></div>`;
function settingsShell(cur, inner) {
  const groups = [['Organisation', state.role === 'Admin' ? SET.map(([k, l]) => ['#settings/' + k, l, 'settings/' + k]) : []], ['Admission', allowed('admset') ? ADMSET.map(([k, l]) => ['#admset/' + k, l, 'admset/' + k]) : []]];
  return `<div class="set-page">${pageHead('Settings')}<div class="content"><div class="split"><nav class="subnav">${groups.filter(g => g[1].length).map(([g, items]) => `<div class="subnav-h">${g}</div>${items.map(([href, l, id]) => `<a href="${href}" class="${id === cur ? 'on' : ''}">${l}</a>`).join('')}`).join('')}</nav><div class="set-body">${inner}</div></div></div></div>`;
}

/* ================= DataTable (PrimeReact style) ================= */
const S = { cols: [], rows: [], view: [], sort: null, q: '', filter: null, onOpen: null, col: null, page: 0, rpp: 25 };
function sheet({ cols, rows, onOpen, toolbar = '', chips = '', chipLabel = 'Status', tabs = '', lead = '', search = true, exportBtn = true }) {
  Object.assign(S, { cols, rows, onOpen, sort: null, q: '', filter: null, col: null, view: rows, page: 0, sel: [] });
  return `<div class="sheet-card">
    ${tabs}
    ${search || chips || lead || toolbar || exportBtn ? `<div class="toolbar">
      ${search ? `<div class="tsearch">${ic('search', 14)}<input id="sheetSearch" placeholder="Keyword search"></div>` : ''}
      ${chips ? `<div class="fdrop" id="fdrop"><button class="fdrop-btn" data-fdrop>${ic('filter', 13)}<span class="fdrop-k">${chipLabel}:</span><span id="fdropLabel">All</span><b id="fdropCount"></b><i class="pi pi-chevron-down fdrop-chev"></i></button><div class="fdrop-menu" id="fchips">${chips}</div></div>` : ''}
      ${lead ? `<div class="tlead">${lead}</div>` : ''}
      <div style="margin-left:auto;display:flex;gap:6px;align-items:center">${toolbar}
        ${exportBtn ? `<button class="btn sm" data-export>${ic('download', 14)}Export</button>` : ''}</div>
    </div>` : ''}
    <div class="sheet" id="sheet"></div>
    <div class="statusbar"><span id="rowCount"></span><div class="paginator" id="pager"></div></div>
  </div>`;
}
const L = i => i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26);
function renderSheet() {
  const el = $('#sheet'); if (!el) return;
  let rows = S.rows;
  if (S.filter) rows = rows.filter(S.filter);
  if (S.q) { const q = S.q.toLowerCase(); rows = rows.filter(r => S.cols.some(c => String(c.text ? c.text(r) : r[c.key] ?? '').toLowerCase().includes(q))); }
  if (S.sort) { const { key, dir } = S.sort; rows = [...rows].sort((a, b) => { const x = a[key], y = b[key]; return (x > y ? 1 : x < y ? -1 : 0) * dir; }); }
  S.view = rows;
  const pages = Math.max(1, Math.ceil(rows.length / S.rpp)); if (S.page >= pages) S.page = pages - 1;
  const st = S.page * S.rpp, pageRows = rows.slice(st, st + S.rpp);
  /* inside Settings the table fills its panel: columns share the width in proportion to w, and it scrolls below 80% of the designed width */
  const fit = !!el.closest('.set-body'), tot = S.cols.reduce((t, c) => t + (c.w || 120), 0);
  const colW = c => fit ? `${((c.w || 120) / tot * 100).toFixed(3)}%` : `${c.w || 120}px`;
  el.innerHTML = `<table class="grid"${fit ? ` style="min-width:${Math.round(tot * 0.8)}px"` : ''}><colgroup>${S.cols.map(c => `<col style="width:${colW(c)}">`).join('')}</colgroup>
  <thead><tr class="hdr">${S.cols.map(c => `<th data-sort="${c.key}" class="${c.align || ''} ${S.sort && S.sort.key === c.key ? 'sorted' : ''}">${c.label}<i class="pi ${S.sort && S.sort.key === c.key ? (S.sort.dir > 0 ? 'pi-sort-amount-up-alt' : 'pi-sort-amount-down') : 'pi-sort-alt'} sort-ic"></i></th>`).join('')}</tr></thead>
  <tbody>${pageRows.map((r, i) => { const ri = st + i; return `<tr data-ri="${ri}" class="${r._strike ? 'strike' : ''}">${S.cols.map((c, ci) => `<td data-ci="${ci}" class="${c.align || ''}">${c.render ? c.render(r) : esc(c.fmt ? c.fmt(r[c.key]) : r[c.key])}</td>`).join('')}</tr>`; }).join('')}</tbody></table>${rows.length ? '' : '<div class="empty">No rows match this view.</div>'}`;
  const rc = $('#rowCount'); if (rc) rc.textContent = rows.length ? `Showing ${st + 1} to ${Math.min(st + S.rpp, rows.length)} of ${rows.length.toLocaleString('en-IN')} entries` : 'No entries';
  const pg = $('#pager');
  if (pg) {
    const p = S.page, from = Math.max(0, Math.min(p - 2, pages - 5)), nums = [];
    for (let i = from; i < Math.min(pages, from + 5); i++) nums.push(i);
    pg.innerHTML = `<button data-pg="0" ${p === 0 ? 'disabled' : ''} title="First"><i class="pi pi-angle-double-left"></i></button><button data-pg="${p - 1}" ${p === 0 ? 'disabled' : ''} title="Previous"><i class="pi pi-angle-left"></i></button>${nums.map(n => `<button data-pg="${n}" class="${n === p ? 'on' : ''}">${n + 1}</button>`).join('')}<button data-pg="${p + 1}" ${p >= pages - 1 ? 'disabled' : ''} title="Next"><i class="pi pi-angle-right"></i></button><button data-pg="${pages - 1}" ${p >= pages - 1 ? 'disabled' : ''} title="Last"><i class="pi pi-angle-double-right"></i></button><select id="rppSel">${[10, 25, 50, 100].map(n => `<option ${n === S.rpp ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    $('#rppSel').onchange = e => { S.rpp = +e.target.value; S.page = 0; renderSheet(); };
  }
  renderAgg();
}
function renderAgg() {
  const a = $('#agg'); if (!a) return;
  if (S.col == null) { a.innerHTML = ''; return; }
  const c = S.cols[S.col];
  const vals = S.view.map(r => r[c.key]).filter(v => typeof v === 'number');
  if (!vals.length || !c.sum) { a.innerHTML = `<span>Count: <b>${S.view.length}</b></span>`; return; }
  const sum = vals.reduce((x, y) => x + y, 0);
  const f = c.sum === 'inr' ? inr : n => n.toLocaleString('en-IN');
  a.innerHTML = `<span>${esc(c.label)}</span><span>Sum: <b>${f(sum)}</b></span><span>Average: <b>${f(sum / vals.length)}</b></span><span>Count: <b>${vals.length}</b></span>`;
}
const fchip = (id, label, count, on) => `<button class="fchip ${on ? 'on' : ''}" data-fchip="${id}" data-label="${label}"><span class="fck"><i class="pi pi-check"></i></span><span class="fl">${label}</span>${count != null ? `<b>${count}</b>` : ''}</button>`;
/* multi-select filter: S.sel holds the selected ids, [] means All */
function setChips(ids) {
  S.sel = ids.filter(i => i !== 'all'); S.page = 0;
  const btns = $$('#fchips .fchip');
  btns.forEach(b => b.classList.toggle('on', S.sel.length ? S.sel.includes(b.dataset.fchip) : b.dataset.fchip === 'all'));
  const on = btns.filter(b => S.sel.includes(b.dataset.fchip)), lbl = $('#fdropLabel'), n = $('#fdropCount');
  if (lbl) lbl.textContent = !on.length ? 'All' : on.length === 1 ? on[0].dataset.label : `${on.length} selected`;
  if (n) n.textContent = '';
  $('#fdrop')?.classList.toggle('active', on.length > 0);
  if (chipHandler) chipHandler(S.sel);
}
const sheetTabs = (page, tabs, cur) => `<div class="sheet-tabs">${tabs.map(([k, l]) => `<a class="sheet-tab ${k === cur ? 'on' : ''}" href="#${page}/${k}">${l}</a>`).join('')}</div>`;

/* ================= pages ================= */
const PAGES = {};
let chipHandler = null;

/* ---------- Dashboard ---------- */
PAGES.dashboard = () => {
  const occ = students.filter(s => OCCUPY.includes(s.status));
  const cap = PROGS.reduce((t, p) => t + Object.values(p.cap).reduce((a, b) => a + b, 0), 0);
  const assessed = occ.reduce((t, s) => t + s.net, 0);
  const collected = payments.reduce((t, p) => t + p.amt, 0);
  const outstanding = occ.reduce((t, s) => t + s.due, 0);
  const overdueS = occ.filter(s => s.overdue > 0);
  const overdue = overdueS.reduce((t, s) => t + s.overdue, 0);
  const refPend = refunds.filter(r => ['Submitted', 'Awaiting approval', 'Approved', 'Processing'].includes(r.status));
  // collections last 14 days
  const days = [...Array(14)].map((_, i) => addDays(TODAY, i - 13));
  const byDay = days.map(d => payments.filter(p => p.date === d).reduce((t, p) => t + p.amt, 0));
  const maxD = Math.max(...byDay, 1);
  const colSvg = (W, H) => {
  const X0 = 54, bw = (W - X0) / 14, PH = H - 40;
  const bars = days.map((d, i) => { const h = Math.max(2, byDay[i] / maxD * PH); return `<g><rect x="${X0 + i * bw + 7}" y="${H - 22 - h}" width="${bw - 14}" height="${h}" rx="4" fill="${d === TODAY ? '#0A3C6E' : '#E5E5E5'}" opacity="1"><title>${fd(d)}: ${inr(byDay[i])}</title></rect>${i % 2 === 1 || d === TODAY ? `<text x="${X0 + i * bw + bw / 2}" y="${H - 4}" text-anchor="middle">${fdShort(d)}</text>` : ''}</g>`; }).join('');
  const grid = [0, .5, 1].map(f => `<line x1="${X0}" x2="${W}" y1="${H - 22 - f * PH}" y2="${H - 22 - f * PH}" stroke="#E6EAF0" stroke-dasharray="${f ? '3 3' : ''}"/><text x="${X0 - 8}" y="${H - 18 - f * PH}" text-anchor="end">${f ? inrS(maxD * f) : '₹0'}</text>`).join('');
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block">${grid}${bars}</svg>`;
  };
  window.fitCol = () => { const el = document.getElementById('colChart'); if (!el) return; el.innerHTML = ''; const w = el.clientWidth; el.dataset.w = w; el.innerHTML = colSvg(Math.max(320, w), Math.max(220, el.clientHeight)); };
  setTimeout(() => {
    window.fitCol();
    // redraw when the card changes width (sidebar collapse, window resize, layout changes)
    const host = document.querySelector('.col-body'); if (!host || !window.ResizeObserver) return;
    new ResizeObserver(() => { const el = document.getElementById('colChart'); if (el && Math.abs(host.clientWidth - 2 * 18 - (+el.dataset.w || 0)) > 2) window.fitCol(); }).observe(host);
  });
  // programme bars
  const progRows = actProgs().map(p => {
    const c = Object.values(p.cap).reduce((a, b) => a + b, 0);
    const n = st => students.filter(s => s.prog === p.code && s.status === st).length;
    const cf = n('Confirmed'), pp = n('Details collected'), sb = n('Seat booked');
    return `<div class="hbar" data-go="admissions" data-preset='{"prog":"${p.code}"}' style="cursor:pointer"><span class="lbl">${p.name}</span><span class="track"><i style="width:${cf / c * 100}%;background:#0A3C6E"></i><i style="width:${pp / c * 100}%;background:#1783C1"></i><i style="width:${sb / c * 100}%;background:#A2CDE6"></i></span><span class="val">${cf + pp + sb} <span class="faint">/ ${c}</span></span></div>`;
  }).join('');
  const quotaRows = QUOTAS.map(q => {
    const a = occ.filter(s => s.quota === q); const as = a.reduce((t, s) => t + s.net, 0), pd = a.reduce((t, s) => t + s.paid, 0);
    return `<tr><td>${q}</td><td class="r">${a.length}</td><td class="r">${inrS(as)}</td><td class="r">${inrS(pd)}</td><td style="width:110px"><div class="meter"><i style="width:${as ? pd / as * 100 : 0}%"></i></div></td></tr>`;
  }).join('');
  const att = [...overdueS].sort((a, b) => b.overdue - a.overdue).slice(0, 5);
  return `<div>${pageHead('Good morning, Anita', 'Thejus Engineering College · Admission cycle 2026–27 · Wednesday, 4 Nov 2026',
    `<div class="seg" id="dashRange"><button>Today</button><button>7 days</button><button class="on">This cycle</button></div>`)}
  <div class="content">
    <div class="kpis" style="grid-template-columns:repeat(5,minmax(0,1fr))">
      <button class="kpi hero" data-go="reports"><div class="k-l">${ic('seats', 14)}Seats filled</div><div class="k-v">${occ.length}<span style="font-size:14px;color:rgba(255,255,255,.72)"> / ${cap}</span></div><div class="k-s">${Math.round(occ.length / cap * 100)}% of capacity · <span style="color:#fff">+14 this week</span></div></button>
      <button class="kpi" data-go="admset/fees"><div class="k-l">${ic('fees', 14)}Assessed</div><div class="k-v">${inrS(assessed)}</div><div class="k-s">Net of ${inr(occ.reduce((t, s) => t + s.conc, 0))} concessions</div></button>
      <button class="kpi" data-go="payments"><div class="k-l">${ic('payments', 14)}Collected</div><div class="k-v">${inrS(collected)}</div><div class="k-s">${Math.round(collected / assessed * 100)}% of assessed · 100% receipted</div></button>
      <button class="kpi" data-go="payments/students" data-preset='{"f":"Overdue"}'><div class="k-l">${ic('clock', 14)}Overdue</div><div class="k-v" style="color:#D93025">${inrS(overdue)}</div><div class="k-s">${overdueS.length} students · outstanding ${inrS(outstanding)}</div></button>
      <button class="kpi" data-go="refunds"><div class="k-l">${ic('refunds', 14)}Refunds pending</div><div class="k-v">${refPend.length}</div><div class="k-s">${inr(refPend.reduce((t, r) => t + r.amount, 0))} awaiting action</div></button>
    </div>
    <div class="grid-3" style="margin-bottom:14px">
      <div class="card span-2 col-card"><div class="card-h"><h3>Collections · last 14 days</h3><span class="muted num">${inr(byDay.reduce((a, b) => a + b, 0))}</span></div>
        <div class="card-b col-body"><div id="colChart">${colSvg(760, 290)}</div></div></div>
      <div class="card"><div class="card-h"><h3>Needs attention</h3></div><div class="card-b">
        ${att.map(s => `<div class="list-row" data-student="${s.id}" style="cursor:pointer"><span class="dotico" style="background:var(--bad-bg);color:var(--bad)">${ic('clock', 14)}</span><div class="grow"><div class="t">${esc(s.name)}</div><div class="s">${s.adm} · due ${fd(s.nextDue)}</div></div><span class="num" style="color:var(--bad)">${inr(s.overdue)}</span></div>`).join('')}
        ${refunds.filter(r => r.status === 'Awaiting approval').slice(0, 2).map(r => `<div class="list-row" data-refund="${r.id}" style="cursor:pointer"><span class="dotico" style="background:var(--warn-bg);color:var(--warn)">${ic('refunds', 14)}</span><div class="grow"><div class="t">Refund ${r.no}</div><div class="s">Awaiting your approval</div></div><span class="num">${inr(r.amount)}</span></div>`).join('')}
      </div></div>
    </div>
    <div style="margin-bottom:14px">
      <div class="card"><div class="card-h"><h3>Admissions by programme</h3><div class="legend" style="margin-left:auto"><span><i style="background:#0A3C6E"></i>Confirmed</span><span><i style="background:#1783C1"></i>Details collected</span><span><i style="background:#A2CDE6"></i>Seat booked</span></div></div><div class="card-b">${progRows}</div></div>
    </div>
    <div>
      <div class="card"><div class="card-h"><h3>Recent activity</h3><a class="muted" href="#audit">View audit log</a></div><div class="card-b">
        ${audit.slice(0, 6).map(a => `<div class="list-row"><span class="dotico">${ic(a.module === 'Payments' ? 'payments' : a.module === 'Refunds' ? 'refunds' : a.module === 'Admissions' ? 'admissions' : 'audit', 14)}</span><div class="grow"><div class="t">${esc(a.detail)}</div><div class="s">${esc(a.user)} · ${a.at.slice(11)} · ${fdShort(a.at.slice(0, 10))}</div></div><span class="tag">${a.action}</span></div>`).join('')}
      </div></div>
    </div>
  </div></div>`;
};

/* ---------- Admissions ---------- */
const admCols = () => [
  { key: 'adm', label: 'Admission no.', w: 128, render: r => r.adm ? `<span class="lnk" data-open>${r.adm}</span>` : `<span class="faint">${r.app}</span>`, text: r => r.adm + ' ' + r.app },
  { key: 'name', label: 'Student name', w: 170 },
  { key: 'progName', label: 'Programme', w: 190 },
  { key: 'quota', label: 'Quota', w: 110 },
  { key: 'cat', label: 'Category', w: 80 },
  { key: 'status', label: 'Status', w: 140, render: r => chip(r.status) },
  { key: 'bfee', label: 'Booking fee', w: 116, align: 'r', sum: 'inr', fmt: v => v ? inr(v) : '—' },
  { key: 'mobile', label: 'Mobile', w: 110 },
  { key: 'entrance', label: 'Entrance', w: 130 },
  { key: 'officer', label: 'Handled by', w: 130 },
  { key: 'created', label: 'Created', w: 104, fmt: fd },
];
const progCourse = p => p.course || p.name.split(' ')[0];                          // B.Tech · M.Tech · MBA
const progBranch = p => p.branch || p.name.slice(progCourse(p).length).trim() || p.dept; // Computer Science …
/* Admissions tabs share the same filters: Status (multi-select) · Course · Branch */
function admFilterUI(rows) {
  const counts = st => rows.filter(s => s.status === st).length;
  return {
    chips: fchip('all', 'All', rows.length, true) + STATUSES.map(s => fchip(s, s, counts(s))).join('') + fchip('overdue', 'Overdue', rows.filter(s => s.overdue).length),
    lead: `<select class="input tsel" id="crsFilter" aria-label="Course"><option value="">All courses</option>${[...new Set(PROGS.map(progCourse))].map(c => `<option>${esc(c)}</option>`).join('')}</select><select class="input tsel" id="brFilter" aria-label="Branch"></select>`,
  };
}
function admFilterBind() {
  let status = [], crs = '', prog = '';
  const courseOf = code => { const p = PROGS.find(x => x.code === code); return p ? progCourse(p) : ''; };
  const apply = () => { S.filter = r => (!status.length || status.some(id => id === 'overdue' ? r.overdue > 0 : r.status === id)) && (!crs || courseOf(r.prog) === crs) && (!prog || r.prog === prog); S.page = 0; renderSheet(); };
  const fillBranches = () => {
    const list = PROGS.filter(p => !crs || progCourse(p) === crs);
    if (!list.some(p => p.code === prog)) prog = '';
    $('#brFilter').innerHTML = `<option value="">All branches</option>` + list.map(p => `<option value="${p.code}" ${p.code === prog ? 'selected' : ''}>${esc(crs ? progBranch(p) : progCourse(p) + ' · ' + progBranch(p))}</option>`).join('');
  };
  chipHandler = ids => { status = ids; apply(); };
  setTimeout(() => {
    if (!$('#crsFilter')) return;
    fillBranches();
    $('#crsFilter').onchange = e => { crs = e.target.value; fillBranches(); apply(); };
    $('#brFilter').onchange = e => { prog = e.target.value; apply(); };
    if (state.preset) { const p = state.preset; state.preset = null; if (p.status) setChips([p.status]); if (p.f) setChips([p.f]); if (p.prog) { crs = courseOf(p.prog); prog = p.prog; $('#crsFilter').value = crs; fillBranches(); apply(); } }
  });
}
PAGES.admissions = () => {
  const yr = students.filter(inAy), F = admFilterUI(yr);
  const html = `<div class="fill">${pageHead('Admissions', 'One row per student. Same columns as your old admission register — now with live fees, seats and audit.',
    `<button class="btn primary act-write" data-action="new-admission">${ic('plus', 14)}Book seat</button>`)}
    <div class="content">${sheet({ cols: admCols(), rows: yr, onOpen: r => openStudent(r.id), chips: F.chips, lead: F.lead, tabs: admTabs('register') })}</div></div>`;
  admFilterBind();
  return html;
};
PAGES['admissions/docs'] = () => {
  const rows = students.filter(s => s.adm && inAy(s)).map(s => ({ ...s, ...Object.fromEntries(Object.entries(s.docs).map(([k, v]) => ['d_' + k, v])) })), F = admFilterUI(rows);
  const html = `<div class="fill">${pageHead('Admissions', 'Document checklist — upload and verify certificates per student.', `<button class="btn primary act-write">${ic('upload', 14)}Bulk upload</button>`)}
  <div class="content">${sheet({ cols: [
    { key: 'adm', label: 'Admission no.', w: 128, render: r => `<span class="lnk" data-open>${r.adm}</span>` }, { key: 'name', label: 'Student name', w: 170 }, { key: 'progName', label: 'Programme', w: 190 },
    ...Object.keys(students[0].docs).map(d => ({ key: 'd_' + d, label: d, w: 150, render: r => chip(r['d_' + d]) })),
    { key: 'status', label: 'Admission status', w: 140, render: r => chip(r.status) }], rows, onOpen: r => openStudent(r.id, 'docs'),
    chips: F.chips, lead: F.lead, tabs: admTabs('docs') })}</div></div>`;
  admFilterBind();
  return html;
};

/* ---------- Student drawer ---------- */
function stepper(status) {
  const flow = ['Seat booked', 'Details collected', 'Payment & receipt', 'Fee slip issued'];
  if (status === 'Cancelled' || status === 'Withdrawn') return `<div class="stepper"><span class="step done"><i>${ic('check', 10)}</i>Seat booked</span><span class="step-line"></span><span class="step" style="color:var(--bad)"><i style="border-color:var(--bad);background:var(--bad-bg)"></i>${status}</span></div>`;
  const idx = { 'Seat booked': 1, 'Details collected': 2, Confirmed: 4 }[status] ?? 0;
  return `<div class="stepper">${flow.map((f, i) => `${i ? `<span class="step-line ${i < idx ? 'done' : ''}"></span>` : ''}<span class="step ${i < idx ? 'done' : i === idx ? 'cur' : ''}"><i>${i < idx ? ic('check', 10) : i + 1}</i>${f}</span>`).join('')}</div>`;
}
function studentTabBody(id, tab) {
  const s = sById(id);
  const pays = payments.filter(p => p.sid === id);
  const tabs = [['overview', 'Overview'], ['fees', 'Fee plan'], ['payments', `Payments (${pays.length})`], ['docs', 'Documents'], ['activity', 'Activity']];
  let body = '';
  if (tab === 'overview') body = `
    <div class="section-t">Personal</div>
    <div class="kv"><div><span>Full name</span>${esc(s.name)}</div><div><span>Date of birth</span>${fd(s.dob)}</div><div><span>Mobile</span>+91 ${s.mobile}</div><div><span>Seat booked by</span>${esc(s.guardian)} · ${s.relation || 'Guardian'}</div><div><span>Category</span>${s.cat}</div><div><span>Aadhaar</span><span class="masked">XXXX XXXX ${s.mobile.slice(-4)}</span> ${ic('lock', 12).replace('class="ic"', 'class="ic" style="display:inline;vertical-align:-1px;color:var(--faint)"')}</div></div>
    <div class="section-t">Admission</div>
    <div class="kv"><div><span>Application no.</span>${s.app}</div><div><span>Admission no.</span>${s.adm || '—'}</div><div><span>Programme</span>${s.progName}</div><div><span>Department</span>${s.dept}</div><div><span>Quota</span>${s.quota}</div><div><span>Entrance</span>${s.entrance}</div><div><span>Admission officer</span>${s.officer}</div><div><span>Created</span>${fd(s.created)}</div></div>
    <div class="section-t">Refund policy</div>
    <div class="notice ok">${ic('check', 14)}<div style="flex:1">Refund policy <b>${s.policy.ver}</b> read and accepted by the seat booker <b>${esc(s.guardian)}</b> on ${fd(s.policy.at)}.</div><button class="btn sm" data-policy="${s.id}">View</button></div>
    <div class="section-t">Notifications sent to guardian</div>
    <div class="list-row"><span class="dotico">${ic('sms', 14)}</span><div class="grow"><div class="t">Seat booked — ${s.adm || s.app}</div><div class="s">SMS · DLT 1107xxxx2231 · ${fd(s.created)}</div></div>${chip('Delivered')}</div>
    ${s.paid ? `<div class="list-row"><span class="dotico">${ic('chat', 14)}</span><div class="grow"><div class="t">Receipt + fee slip sent</div><div class="s">WhatsApp + SMS · ${fd(s.d1)}</div></div>${chip('Delivered')}</div>` : ''}`;
  if (tab === 'fees') {
    const inst = allocate(s);
    body = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn sm" data-feeslip="${s.id}">${ic('printer', 12)}Fee slip</button></div><div class="notice" style="margin-bottom:14px">${ic('layers', 16)}<div>Fee template <b style="font-weight:400;color:var(--blue-600)">FT-26-${s.prog}-${s.quota.slice(0, 4).toUpperCase()} v3</b> assigned on ${fd(s.created)}. Later template changes won't alter this plan unless re-assigned with approval.</div></div>
    <div class="section-t">Fee heads</div>
    <table class="simple"><thead><tr><th>Head</th><th>Type</th><th class="r">Amount</th></tr></thead><tbody>
      <tr><td>Tuition fee</td><td><span class="tag">Non-refundable</span></td><td class="r">${inr(s.fee - 18500)}</td></tr>
      ${Object.entries(FIXED).map(([k, v]) => `<tr><td>${k}</td><td><span class="tag">${k === 'Caution deposit' ? 'Refundable' : 'Non-refundable'}</span></td><td class="r">${inr(v)}</td></tr>`).join('')}
      ${s.conc ? `<tr><td>Concession · Merit scholarship</td><td>${chip('Approved')}</td><td class="r neg" style="color:var(--ok)">− ${inr(s.conc)}</td></tr>` : ''}
    </tbody><tfoot><tr><td colspan="2">Net payable</td><td class="r">${inr(s.net)}</td></tr></tfoot></table>
    <div class="section-t">Payment schedule · allocation oldest first</div>
    <table class="simple"><thead><tr><th>Instalment</th><th>Due</th><th class="r">Amount</th><th class="r">Paid</th><th class="r">Balance</th><th></th></tr></thead><tbody>
    ${inst.map(i => { const bal = i.amt - i.paid; const st = bal <= 0 ? 'Completed' : i.due < TODAY ? 'Overdue' : 'Pending'; return `<tr><td>${i.n}</td><td>${fd(i.due)}</td><td class="r">${inr(i.amt)}</td><td class="r">${inr(i.paid)}</td><td class="r">${inr(bal)}</td><td>${st === 'Overdue' ? '<span class="chip bad">Overdue</span>' : chip(st === 'Completed' ? 'Completed' : 'Pending')}</td></tr>`; }).join('')}
    </tbody></table>`;
  }
  if (tab === 'payments') body = pays.length ? `<table class="simple"><thead><tr><th>Receipt</th><th>Date</th><th>Mode</th><th>Reference</th><th class="r">Amount</th><th></th></tr></thead><tbody>
    ${pays.map(p => `<tr><td><span class="lnk" style="color:var(--blue-500);cursor:pointer" data-receipt="${p.id}">${p.rcpt}</span></td><td>${fd(p.date)}</td><td>${p.mode}</td><td class="faint" style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.ref)}</td><td class="r" style="${p.amt < 0 ? 'color:var(--bad)' : ''}">${inr(p.amt)}</td><td>${chip(p.status)}</td></tr>`).join('')}
    </tbody></table><p class="faint" style="margin-top:12px">Corrections are posted as contra entries. Original receipts are never edited or deleted.</p>` : `<div class="empty">No payments recorded.</div>`;
  if (tab === 'docs') body = `${Object.entries(s.docs).map(([d, v]) => `<div class="check-row"><span class="dotico">${ic('documents', 14)}</span><div style="flex:1"><div>${d}</div><div class="faint" style="font-size:12px">${v === 'Pending' ? 'Not uploaded' : d.toLowerCase().replace(/ /g, '_') + '.pdf · 412 KB'}</div></div>${chip(v)}${v === 'Uploaded' ? '<button class="btn sm act-write" data-verify>Verify</button>' : v === 'Pending' ? '<button class="btn sm act-write">Upload</button>' : '<button class="btn sm ghost">View</button>'}</div>`).join('')}
    <div class="section-t" style="margin-top:22px">Generated documents</div>
    ${['Admission form', 'Fee structure slip', 'Fee demand note', 'Acknowledgement'].map(d => `<div class="check-row"><span class="dotico">${ic('printer', 14)}</span><div style="flex:1">${d}</div><button class="btn sm ghost" data-doc-preview="${d}">Preview</button><button class="btn sm">${ic('download', 13)}PDF</button></div>`).join('')}`;
  if (tab === 'activity') body = [
    [s.created, s.officer, 'Created admission record from form v4'],
    [s.created, s.officer, `Seat booked by ${s.guardian} · refund policy ${s.policy.ver} accepted`],
    ...(s.details ? [[s.created, s.officer, 'Details and documents collected']] : []),
    ...pays.map(p => [p.date, p.cashier, `${p.kind === 'Reversal' ? 'Reversal' : 'Payment'} ${inr(p.amt)} · ${p.rcpt}`]),
    ...(s.status === 'Confirmed' ? [[s.d1, 'System', 'Confirmed · receipt and fee slip issued to guardian']] : []),
  ].map(([d, u, t]) => `<div class="list-row"><span class="dotico">${ic('clock', 14)}</span><div class="grow"><div class="t">${esc(t)}</div><div class="s">${esc(u)} · ${fd(d)}</div></div></div>`).join('');
  return body;
}
/* a student opens as a page: #admissions/view/<id>[/<tab>] */
function openStudent(id, tab = 'details') {
  closeDrawer();
  const h = 'admissions/view/' + id + (tab && tab !== 'details' && tab !== 'overview' ? '/' + tab : '');
  if (location.hash === '#' + h) route(); else location.hash = h;
}

/* ---------- Booking wizard: book seat → collect details → payment → receipt & fee slip ---------- */
const WZ_STEPS = ['Book seat', 'Collect details', 'Payment', 'Receipt & fee slip'];
function wzHead(step, s) {
  return `<div class="m-head"><h2>${s ? esc(s.name) + ` <span class="faint" style="font-size:13px;font-weight:400">${s.adm}</span>` : 'Book a seat'}</h2><button class="icon-btn" data-close-modal>${ic('x')}</button></div>
  <div class="wz-steps">${WZ_STEPS.map((t, i) => `<div class="wz-step ${i + 1 < step ? 'done' : i + 1 === step ? 'cur' : ''}"><i>${i + 1 < step ? ic('check', 11) : i + 1}</i><span>${t}</span></div>`).join('<span class="wz-line"></span>')}</div>`;
}
function policyTable() { return `<table class="simple"><thead><tr><th>When cancelled</th><th>Refund</th></tr></thead><tbody>${POLICY.slabs.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table>`; }
function feeHeadsTable(s) {
  return `<table class="simple"><thead><tr><th>Fee head</th><th>Type</th><th class="r">Amount</th></tr></thead><tbody>
    <tr><td>Tuition fee</td><td><span class="tag">Non-refundable</span></td><td class="r">${inr(s.fee - 18500)}</td></tr>
    ${Object.entries(FIXED).map(([k, v]) => `<tr><td>${k}</td><td><span class="tag">${k === 'Caution deposit' ? 'Refundable' : 'Non-refundable'}</span></td><td class="r">${inr(v)}</td></tr>`).join('')}
    ${s.conc ? `<tr><td>Concession · Merit scholarship</td><td>${chip('Approved')}</td><td class="r" style="color:var(--ok)">− ${inr(s.conc)}</td></tr>` : ''}
  </tbody><tfoot><tr><td colspan="2">Total fee for the year</td><td class="r">${inr(s.net)}</td></tr></tfoot></table>`;
}
function scheduleTable(s, highlightFirst) {
  return `<table class="simple"><thead><tr><th>Instalment</th><th>Due date</th><th class="r">Amount</th><th class="r">Paid</th><th class="r">Balance</th><th></th></tr></thead><tbody>
  ${allocate(s).map((i, k) => { const bal = i.amt - i.paid; const st = bal <= 0 ? 'Completed' : i.due < TODAY ? 'Overdue' : (highlightFirst && k === 0 ? 'Pay now' : 'Pending'); return `<tr ${highlightFirst && k === 0 && bal > 0 ? 'style="background:var(--p-primary-50)"' : ''}><td>${i.n}</td><td>${k === 0 && s.status !== 'Confirmed' ? 'At admission' : fd(i.due)}</td><td class="r">${inr(i.amt)}</td><td class="r">${i.paid ? inr(i.paid) : '—'}</td><td class="r">${inr(bal)}</td><td>${st === 'Pay now' ? '<span class="chip">Pay now</span>' : st === 'Overdue' ? '<span class="chip bad">Overdue</span>' : chip(st)}</td></tr>`; }).join('')}
  </tbody><tfoot><tr><td colspan="3">Total</td><td class="r">${inr(s.paid)}</td><td class="r">${inr(Math.max(0, s.net - s.paid))}</td><td></td></tr></tfoot></table>`;
}
function bookingWizard(sid, step = 1, pid) {
  const s = sid ? sById(sid) : null;
  if (step === 1) {
    /* Admission form — sections per PRD ADM-02 (personal, academic, entrance exam, admission details),
       guardian/seat booker (§3), masked community + income (§3, §7), document checklist (ADM-07),
       booking fee received at the desk. Mandatory + duplicate check on name + DOB + mobile (ADM-03). */
    const F = (label, name, opts = {}) => `<div class="field${opts.full ? ' full' : ''}"${opts.span ? ` style="grid-column:span ${opts.span}"` : ''}><label>${label}${opts.req ? ' <span class="req">*</span>' : ''}${opts.hint ? ` <span class="faint" style="font-weight:400">· ${opts.hint}</span>` : ''}</label>${opts.html || `<input class="input" name="${name}"${opts.type ? ` type="${opts.type}"` : ''}${opts.ph ? ` placeholder="${opts.ph}"` : ''}${opts.attr || ''}>`}</div>`;
    const SEL = (name, list, attr = '') => `<select class="input" name="${name}"${attr}>${list.map(o => Array.isArray(o) ? `<option value="${o[0]}">${o[1]}</option>` : `<option>${o}</option>`).join('')}</select>`;
    const host = $('#bkHost'); if (!host) { location.hash = 'admissions/new'; return; }
    host.innerHTML = (`<form id="wzForm" class="bk-form" autocomplete="off">
      <div class="form-sec">Quota, course &amp; branch</div>
      <div class="form-grid">
        ${F('Quota', 'quota', { req: true, html: SEL('quota', QUOTAS, ' id="nQuota"') })}
        ${F('Course', 'course', { req: true, html: '<select class="input" id="nCourse"></select>' })}
        ${F('Branch', 'prog', { req: true, html: '<select class="input" name="prog" id="nProg"></select>' })}
      </div>
      <div id="seatInfo" style="margin-top:12px"></div>
      <div class="form-sec">Admission details</div>
      <div class="form-grid">
        ${F('Academic year', 'ay', { html: SEL('ay', [state.ay]) })}
        ${F('Fee category', 'cat', { req: true, html: SEL('cat', ['General', 'OBC', 'EWS', 'SC', 'ST', 'OEC']) })}
        ${F('Admission date', 'adate', { type: 'date', attr: ` value="${TODAY}"` })}
        ${F('Application no.', 'appno', { html: `<input class="input" value="APP-26-${1040 + students.length}" disabled>` })}
      </div>
      <div class="form-sec">Personal details</div>
      <div class="form-grid">
        ${F('Student name', 'name', { req: true, ph: 'As in SSLC certificate' })}
        ${F('Date of birth', 'dob', { req: true, type: 'date' })}
        ${F('Gender', 'gender', { req: true, html: SEL('gender', ['', 'Female', 'Male', 'Other'].map(g => [g, g || 'Select'])) })}
        ${F('Student mobile', 'mobile', { req: true, ph: '10-digit', attr: ' inputmode="numeric" maxlength="10"' })}
        ${F('Email', 'email', { type: 'email', ph: 'student@example.com' })}
        ${F('Aadhaar no.', 'aadhaar', { hint: 'stored encrypted', ph: '12-digit', attr: ' inputmode="numeric" maxlength="12"' })}
        ${F('Nationality', 'nat', { html: SEL('nat', ['Indian', 'NRI / OCI', 'Foreign national']) })}
        ${F('Religion', 'religion', { html: SEL('religion', ['—', 'Hindu', 'Muslim', 'Christian', 'Other', 'Prefer not to say']) })}
        ${F('Community / caste', 'community', { hint: 'masked', ph: 'As in community certificate' })}
        ${F('Annual family income (₹)', 'income', { hint: 'masked', ph: 'e.g. 450000', attr: ' inputmode="numeric"' })}
        ${F('Blood group', 'blood', { html: SEL('blood', ['—', 'A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−']) })}
        ${F('Address', 'address', { span: 3, html: '<textarea class="input" name="address" rows="2" placeholder="House, street, city, district, PIN"></textarea>' })}
      </div>
      <div class="form-sec">Parent / guardian · seat booked by</div>
      <div class="form-grid">
        ${F('Name', 'guardian', { req: true, ph: 'Parent or guardian' })}
        ${F('Relation', 'relation', { html: SEL('relation', ['Father', 'Mother', 'Guardian', 'Self']) })}
        ${F('Mobile', 'gmobile', { req: true, ph: 'Receipts and reminders go here', attr: ' inputmode="numeric" maxlength="10"' })}
        ${F('Email', 'gemail', { type: 'email' })}
        ${F('Occupation', 'gocc')}
      </div>
      <div class="form-sec">Academic details</div>
      <div class="form-grid">
        ${F('Qualifying exam', 'qual', { req: true, html: `<select class="input" name="qual" id="nQual"></select>` })}
        ${F('Board / university', 'board', { ph: 'e.g. Kerala HSE' })}
        ${F('Year of passing', 'yop', { html: SEL('yop', ['2026', '2025', '2024', '2023']) })}
        ${F('Marks %', 'marks', { req: true, ph: 'e.g. 88.5', attr: ' inputmode="decimal"' })}
        ${F('School / college', 'school', { span: 2 })}
      </div>
      <div class="form-sec">Entrance exam</div>
      <div class="form-grid">
        ${F('Exam', 'exam', { html: `<input class="input" name="exam" id="nExam" readonly>` })}
        <div class="field"><label id="nRankL">Rank / score</label><input class="input" name="rank" id="nRank"></div>
        ${F('Roll no.', 'roll')}
      </div>
      <div class="form-sec">Documents received at the desk</div>
      <div class="doc-checks">${['SSLC', 'Plus Two', 'TC', 'Community certificate'].map(d => `<label class="doc-check"><input type="checkbox" name="doc" value="${d}"><span>${d}</span></label>`).join('')}</div>
      <div class="form-sec">Booking fee collected</div>
      <div class="form-grid">
        ${F('Amount (₹)', 'amt', { req: true, html: '<input class="input num" id="pAmt" inputmode="numeric" placeholder="e.g. 10000">' })}
        <div class="field" style="grid-column:span 2"><label>Mode <span class="req">*</span></label><div class="seg" id="pMode" role="radiogroup" aria-label="Mode of payment">${PAY_MODES.map(m => `<button type="button">${m}</button>`).join('')}</div><span class="hint mode-err" id="pModeErr"></span></div>
        <div class="field hidden" id="pRefF" style="grid-column:1/-1"><label>Reference no.</label><input class="input" id="pRef" placeholder="UTR / cheque / DD no. (optional)"></div>
        ${F('Scholarship (₹ per year)', 'schol', { ph: '0', attr: ' inputmode="numeric"' })}
        ${F('Sponsorship (₹ per year)', 'spons', { ph: '0', attr: ' inputmode="numeric"' })}
        ${F('Fee remarks', 'fremarks', { ph: 'Shown on the fee structure slip' })}
      </div>
      <div id="dupWarn" class="hidden" style="margin-top:10px"></div>
      <div id="wzErr"></div>
    </form>
    <div class="bk-foot"><span class="bk-stepn" id="bkStepN"></span><span class="faint" id="bkCount" style="margin-right:auto"></span><a class="btn ghost" href="#admissions">Cancel</a><button class="btn" id="bkPrev" type="button">${ic('left', 12)}Back</button><button class="btn primary" id="bkNext" type="button">Next${ic('right', 12)}</button><button class="btn primary hidden" id="wzBook">Book seat</button></div>`);
    bkSetup();
    const upd = () => {
      const p = PROGS.find(x => x.code === $('#nProg').value), q = $('#nQuota').value;
      if (!p) { $('#seatInfo').innerHTML = `<div class="notice bad">${ic('alert', 14)}<div>No active course offers the ${q} quota. Add seats in Settings → Seat matrix.</div></div>`; $('#wzBook').disabled = true; return; }
      const cap = p.cap[q] || 0, used = students.filter(x => x.prog === p.code && x.quota === q && OCCUPY.includes(x.status)).length, left = cap - used;
      $('#seatInfo').innerHTML = left > 0
        ? `<div class="notice ok">${ic('seats', 14)}<div><b>${left} of ${cap}</b> seats available in ${p.name} · ${q}.</div></div>`
        : `<div class="notice bad">${ic('alert', 14)}<div>${cap ? 'No seats left' : 'This quota has no seats'} in ${p.name} · ${q}. Booking is blocked to prevent over-booking.</div></div>`;
      $('#wzBook').disabled = left <= 0;
      // entrance exam + qualifying exam follow the programme (GATE only for M.Tech, per PRD)
      const mt = p.code === 'MT-CSE', mba = p.code === 'MBA';
      $('#nExam').value = mt ? 'GATE' : mba ? 'KMAT / CAT' : 'KEAM';
      $('#nRankL').innerHTML = (mt ? 'GATE score' : mba ? 'KMAT / CAT score' : 'KEAM rank') + (mt ? ' <span class="req">*</span>' : '');
      const quals = mt ? ['B.Tech / B.E.'] : mba ? ['Any degree'] : q === 'Lateral entry' ? ['Diploma (Polytechnic)'] : ['Plus Two (Kerala HSE)', 'CBSE XII', 'ISC XII', 'Other board'];
      $('#nQual').innerHTML = quals.map(x => `<option>${x}</option>`).join('');
    };
    // course = first word of the programme (B.Tech / M.Tech / MBA); branch = the rest
    const crs = p => p.name.split(' ')[0];
    const brn = p => p.name.slice(crs(p).length).trim() || p.dept;
    const offered = q => actProgs().filter(p => (p.cap[q] || 0) > 0);
    const fillBranches = () => {
      const q = $('#nQuota').value, c = $('#nCourse').value, cur = $('#nProg').value;
      $('#nProg').innerHTML = offered(q).filter(p => crs(p) === c).map(p => `<option value="${p.code}" ${p.code === cur ? 'selected' : ''}>${esc(brn(p))}</option>`).join('');
      upd();
    };
    const fillCourses = () => {
      const q = $('#nQuota').value, cur = $('#nCourse').value, cs = [...new Set(offered(q).map(crs))];
      $('#nCourse').innerHTML = cs.map(c => `<option ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('');
      fillBranches();
    };
    $('#nQuota').onchange = fillCourses; $('#nCourse').onchange = fillBranches; $('#nProg').onchange = upd; fillCourses();
    $('#pMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('#pMode button').forEach(x => x.classList.toggle('on', x === b)); $('#pRefF').classList.toggle('hidden', b.textContent === 'Cash'); $('#pMode').classList.remove('invalid'); $('#pModeErr').textContent = ''; };
    const dupCheck = () => {
      const f = new FormData($('#wzForm')); const n = (f.get('name') || '').trim().toLowerCase(), m = (f.get('mobile') || '').trim(), dob = f.get('dob');
      const hit = n.length > 3 && students.find(x => (x.name.toLowerCase() === n && (!dob || !x.dob || x.dob === dob)) || (m.length >= 10 && x.mobile === m));
      const w = $('#dupWarn'); w.classList.toggle('hidden', !hit);
      if (hit) w.innerHTML = `<div class="notice warn">${ic('alert', 14)}<div>Possible duplicate: <b>${esc(hit.name)}</b> · ${hit.adm} · ${hit.progName} (${hit.status}). <span class="lnk" style="cursor:pointer;font-weight:400" data-student="${hit.id}">Open record</span></div></div>`;
    };
    $$('#wzForm input').forEach(i => i.addEventListener('input', dupCheck));
    $('#wzBook').onclick = () => {
      const f = new FormData($('#wzForm'));
      const v = k => (f.get(k) || '').toString().trim();
      const p = PROGS.find(x => x.code === v('prog')), quota = v('quota'), mt = p.code === 'MT-CSE';
      const amt = +($('#pAmt').value.replace(/[^\d]/g, '')) || 0, mode = $('#pMode .on')?.textContent || '';
      const miss = [!v('name') && 'student name', !v('dob') && 'date of birth', !v('gender') && 'gender', v('mobile').length < 10 && 'student mobile',
        !v('guardian') && 'guardian name', v('gmobile').length < 10 && 'guardian mobile', !v('marks') && 'marks %', mt && !v('rank') && 'GATE score',
        v('aadhaar') && v('aadhaar').length !== 12 && 'valid 12-digit Aadhaar', !amt && 'booking fee amount', !mode && 'payment mode'].filter(Boolean);
      if (!mode) modePicked();
      if (miss.length) { $('#wzErr').innerHTML = `<div class="notice bad" style="margin-top:12px">${ic('alert', 14)}<div>Required: ${miss.join(', ')}.</div></div>`; $('#wzErr').scrollIntoView({ block: 'nearest' }); return; }
      const fee = Math.round(TUITION[quota] * p.m / 100) * 100 + 18500;
      const docs = f.getAll('doc');
      const ns = { id: 's' + students.length, app: 'APP-26-' + (1040 + students.length), adm: 'TEC/2026/' + pad(++admSeq, 5), ay: v('ay'),
        name: v('name'), dob: v('dob'), gender: v('gender'), mobile: v('mobile'), email: v('email'), aadhaar: v('aadhaar') ? 'XXXX XXXX ' + v('aadhaar').slice(-4) : '', nat: v('nat'), religion: v('religion'),
        community: v('community'), income: +v('income') || 0, blood: v('blood'), address: v('address'),
        guardian: v('guardian'), relation: v('relation'), gmobile: v('gmobile'), gemail: v('gemail'), gocc: v('gocc'),
        qual: v('qual'), board: v('board'), yop: v('yop'), marks: v('marks'), school: v('school'),
        prog: p.code, progName: p.name, dept: p.dept, quota, cat: v('cat'), status: 'Details collected', created: v('adate') || TODAY, officer: 'Anita Joseph',
        entrance: v('rank') ? `${v('exam')} ${v('rank')}` : '—', examRoll: v('roll'), fee, schol: Math.max(0, +v('schol') || 0), spons: Math.max(0, +v('spons') || 0), feeRemarks: v('fremarks'), conc: Math.max(0, +v('schol') || 0) + Math.max(0, +v('spons') || 0), net: fee - (Math.max(0, +v('schol') || 0) + Math.max(0, +v('spons') || 0)), d1: TODAY, paid: 0, policy: { ver: POLICY.ver, at: TODAY }, details: true,
        docs: Object.fromEntries(['SSLC', 'Plus Two', 'TC', 'Community certificate'].map(d => [d, docs.includes(d) ? 'Uploaded' : 'Pending'])) };
      const pay = { id: 'p' + Date.now(), rcpt: 'TEC/RCP/26/' + pad(payments.filter(x => x.kind === 'Payment').length + 1, 5), sid: ns.id, amt, date: TODAY, mode, cashier: 'Anita Joseph', ref: mode === 'Cash' ? '—' : ($('#pRef').value.trim() || '—'), kind: 'Payment', status: 'Posted', alloc: 'Booking fee' };
      ns.paid = amt; ns.bfee = amt; students.unshift(ns); payments.push(pay); recalc(ns);
      audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' 10:22', user: 'Anita Joseph', role: state.role, module: 'Admissions', action: 'seat.book', record: ns.adm, detail: `${ns.name} · seat booked by ${ns.guardian} · booking fee ${inr(amt)} (${mode})`, before: '—', after: ns.status, ip: '10.12.4.1' });
      state.justBooked = ns.id; location.hash = 'admissions/view/' + ns.id; toast(`Seat booked · ${ns.adm} · booking fee ${inr(amt)} received`);
    };
  }
  if (step === 2) {
    const mt = s.prog === 'MT-CSE', mba = s.prog === 'MBA';
    openModal(`${wzHead(2, s)}<div class="m-body"><form id="wzForm" autocomplete="off">
      <div class="form-sec">Personal</div>
      <div class="form-grid">
        <div class="field"><label>Date of birth <span class="req">*</span></label><input class="input" name="dob" type="date" value="${s.dob || ''}"></div>
        <div class="field"><label>Gender</label><select class="input"><option>Female</option><option>Male</option><option>Other</option></select></div>
        <div class="field"><label>Category</label><select class="input" name="cat">${['General', 'OBC', 'EWS', 'SC', 'ST', 'OEC'].map(c => `<option ${c === s.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Email</label><input class="input" type="email"></div>
        <div class="field"><label>Aadhaar</label><input class="input" placeholder="Stored encrypted, shown masked"></div>
        <div class="field"><label>Blood group</label><select class="input"><option>—</option><option>A+</option><option>B+</option><option>O+</option><option>AB+</option></select></div>
        <div class="field full"><label>Address</label><textarea class="input" rows="2"></textarea></div>
      </div>
      <div class="form-sec">Academic</div>
      <div class="form-grid">
        <div class="field"><label>Qualifying exam</label><select class="input"><option>${mt ? 'B.Tech' : mba ? 'Degree' : 'Plus Two (Kerala HSE)'}</option><option>CBSE XII</option><option>Diploma</option></select></div>
        <div class="field"><label>Marks %</label><input class="input" placeholder="e.g. 88.5"></div>
        <div class="field"><label>${mt ? 'GATE score' : mba ? 'KMAT / CAT score' : 'KEAM rank'} ${mt ? '<span class="req">*</span>' : ''}</label><input class="input" name="entrance"></div>
      </div>
      <div class="form-sec">Documents received at the desk</div>
      <div class="doc-checks">${Object.keys(s.docs).map(d => `<label class="doc-check"><input type="checkbox" name="doc" value="${d}" ${s.docs[d] !== 'Pending' ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div>
      <div id="wzErr"></div>
    </form></div>
    <div class="m-foot"><button class="btn" style="margin-right:auto" id="wzLater">Save &amp; finish later</button><button class="btn primary" id="wzNext">Save &amp; continue to payment ${ic('right', 12)}</button></div>`, true);
    const save = () => {
      const f = new FormData($('#wzForm'));
      s.dob = f.get('dob') || s.dob; s.cat = f.get('cat'); if (f.get('entrance')) s.entrance = (mt ? 'GATE ' : mba ? 'KMAT ' : 'KEAM rank ') + f.get('entrance');
      const got = f.getAll('doc'); Object.keys(s.docs).forEach(d => { s.docs[d] = got.includes(d) ? (s.docs[d] === 'Verified' ? 'Verified' : 'Uploaded') : 'Pending'; });
    };
    $('#wzLater').onclick = () => { save(); closeModal(); route(); toast('Details saved · admission stays at Seat booked'); };
    $('#wzNext').onclick = () => {
      if (!$('[name="dob"]').value) { $('#wzErr').innerHTML = `<div class="notice bad" style="margin-top:12px">${ic('alert', 14)}<div>Date of birth is required.</div></div>`; return; }
      save(); s.details = true; s.status = 'Details collected'; recalc(s);
      audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' 10:31', user: 'Anita Joseph', role: state.role, module: 'Admissions', action: 'admission.details', record: s.adm, detail: `${s.name} · details and documents collected`, before: 'Seat booked', after: 'Details collected', ip: '10.12.4.1' });
      route(); bookingWizard(s.id, 3);
    };
  }
  if (step === 3) {
    const first = allocate(s)[0], dueNow = first.amt - first.paid;
    openModal(`${wzHead(3, s)}<div class="m-body"><div class="wz-pay">
      <div><div class="section-t">Fee structure · ${esc(s.progName)} · ${s.quota}</div>${feeHeadsTable(s)}
        <div class="section-t">Payment schedule</div>${scheduleTable(s, true)}</div>
      <div class="wz-paybox"><div class="faint" style="font-size:12px">Pay now · Instalment 1</div><div class="wz-amt">${inr(dueNow)}</div>
        <div class="field" style="margin-top:14px"><label>Mode of payment <span class="req">*</span></label><div class="seg" id="pMode" role="radiogroup" aria-label="Mode of payment">${PAY_MODES.map(m => `<button type="button">${m}</button>`).join('')}</div><span class="hint mode-err" id="pModeErr"></span></div>
        <div class="field" style="margin-top:12px"><label>Amount received (₹) <span class="req">*</span></label><input class="input num" id="pAmt" value="${dueNow}" style="font-size:16px;height:42px"></div>
        <div class="field" id="pRefF" style="margin-top:12px"><label>Reference no. <span class="req">*</span></label><input class="input" id="pRef" placeholder="UTR / cheque / DD / link transaction no."></div>
        <div id="pNote" style="margin-top:12px"></div>
      </div></div></div>
    <div class="m-foot"><span class="faint" style="margin-right:auto">${ic('lock', 12)} Ledger, receipt, fee slip and SMS are issued together.</span><button class="btn" data-close-modal>Pay later</button><button class="btn primary" id="wzPay">Post payment ${ic('right', 12)}</button></div>`, true);
    const note = () => { const a = +($('#pAmt').value.replace(/[^\d]/g, '')) || 0; $('#pNote').innerHTML = a && a < dueNow ? `<div class="notice warn">${ic('alert', 14)}<div>Part payment. The admission is confirmed only when Instalment 1 is fully paid.</div></div>` : ''; };
    $('#pAmt').addEventListener('input', note);
    $('#pMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('#pMode button').forEach(x => x.classList.toggle('on', x === b)); $('#pRefF').classList.toggle('hidden', b.textContent === 'Cash'); $('#pMode').classList.remove('invalid'); $('#pModeErr').textContent = ''; };
    $('#wzPay').onclick = () => {
      const amt = +($('#pAmt').value.replace(/[^\d]/g, '')) || 0, mode = modePicked(), ref = mode === 'Cash' ? '—' : $('#pRef').value.trim();
      if (!amt) return $('#pAmt').focus();
      if (!mode) return;
      if (mode !== 'Cash' && !ref) return $('#pRef').focus();
      const p = { id: 'p' + Date.now(), rcpt: 'TEC/RCP/26/' + pad(payments.filter(x => x.kind === 'Payment').length + 1, 5), sid: s.id, amt, date: TODAY, mode, cashier: 'Anita Joseph', ref, kind: 'Payment', status: 'Posted', alloc: 'Instalment 1 · at admission (tuition, admission fee, caution deposit, exam fee)' };
      payments.push(p); s.paid += amt; s.d1 = TODAY;
      if (s.paid >= allocate(s)[0].amt) s.status = 'Confirmed';
      recalc(s);
      audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' 10:40', user: 'Anita Joseph', role: state.role, module: 'Payments', action: 'payment.record', record: p.rcpt, detail: `${inr(amt)} · ${mode} · ${s.name} · receipt + fee slip issued`, before: '—', after: `ledger +${inr(amt)}`, ip: '10.12.4.1' });
      route(); toast(`${p.rcpt} posted · receipt and fee slip sent to ${s.guardian}`);
      bookingWizard(s.id, 4, p.id);
    };
  }
  if (step === 4) {
    const p = payments.find(x => x.id === pid) || payments.filter(x => x.sid === s.id).slice(-1)[0];
    openModal(`${wzHead(5, s)}<div class="m-body" style="background:var(--bg);padding-top:16px">
      <div style="display:flex;justify-content:center;margin-bottom:14px"><div class="seg" id="wzDoc"><button class="on" data-d="r">Receipt ${p ? p.rcpt : ''}</button><button data-d="f">Fee slip · upcoming payments</button></div></div>
      <div id="wzR">${p ? receiptPaper(p) : '<div class="empty">No payment yet.</div>'}</div><div id="wzF" class="hidden">${feeSlipPaper(s)}</div></div>
    <div class="m-foot"><span class="faint" style="margin-right:auto">${ic('check', 12)} Sent to ${esc(s.guardian)} by SMS + WhatsApp</span><button class="btn">${ic('send', 14)}Resend</button><button class="btn">${ic('printer', 14)}Print both</button><button class="btn primary" data-close-modal data-toast="Admission complete · ${s.adm} handed to Finance for the next payments">Done</button></div>`, true);
    $('#wzDoc').onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('#wzDoc button').forEach(x => x.classList.toggle('on', x === b)); $('#wzR').classList.toggle('hidden', b.dataset.d !== 'r'); $('#wzF').classList.toggle('hidden', b.dataset.d !== 'f'); };
  }
}

/* ---------- Book seat: full page with section progress ---------- */
PAGES['admissions/new'] = () => {
  setTimeout(() => bookingWizard(null, 1));
  return `<div class="bk-page">${pageHead('Book a seat', '', `<a class="btn" href="#admissions">${ic('x', 13)}Cancel</a>`, `<a href="#admissions">Admissions</a> / New admission`)}
    <div class="content"><div class="bk-progress"><div class="bk-progress-t"><b id="bkDone">0</b> of <span id="bkTotal">0</span> sections complete</div><div class="meter"><i id="bkBar" style="width:0%"></i></div></div>
    <div class="bk-layout"><nav class="subnav bk-steps" id="bkSteps" aria-label="Form sections"></nav><div id="bkHost"></div></div></div></div>`;
};
function bkSetup() {
  // one section per page: wrap each heading + its fields, then show one at a time
  const form = $('#wzForm'), secs = []; let cur = null, at = 0;
  [...form.children].forEach(ch => {
    if (ch.classList.contains('form-sec')) { cur = document.createElement('section'); cur.className = 'bk-sec'; cur.id = 'bk-sec-' + secs.length; form.insertBefore(cur, ch); secs.push({ el: cur, title: ch.textContent.trim() }); }
    if (cur) cur.appendChild(ch);
  });
  $('#bkTotal').textContent = secs.length;
  $('#bkSteps').innerHTML = `<div class="subnav-h">Admission form</div>` + secs.map((x, i) => `<a class="bk-step" href="#" data-bk-go="${i}"><span class="bk-lbl">${esc(x.title)}</span><span class="bk-dot" aria-hidden="true"></span></a>`).join('');
  const filled = f => { const c = f.querySelector('input:not([type=checkbox]):not([disabled]), select, textarea, .seg'); if (!c) return true; if (c.classList.contains('seg')) return !!c.querySelector('.on'); return !!c.value && c.value !== '—'; };
  const required = i => [...secs[i].el.querySelectorAll('.field')].filter(f => f.querySelector('label .req') && !f.classList.contains('hidden'));
  const missing = i => required(i).filter(f => !filled(f));
  const status = i => {
    const req = required(i);
    if (req.length) return req.every(filled) ? 'done' : req.some(filled) ? 'part' : '';
    return [...secs[i].el.querySelectorAll('input, select, textarea')].some(x => x.type === 'checkbox' ? x.checked : (x.value && x.value !== '—' && !x.disabled && !x.readOnly && x.type !== 'date')) ? 'done' : '';
  };
  const refresh = () => {
    if (!document.body.contains(form) || !$('#bkSteps')) return;
    let done = 0;
    secs.forEach((x, i) => { const st = status(i); if (st === 'done') done++; const a = $(`[data-bk-go="${i}"]`); a.classList.toggle('done', st === 'done'); a.classList.toggle('part', st === 'part'); a.querySelector('.bk-dot').innerHTML = st === 'done' ? ic('check', 12) : ''; a.title = st === 'done' ? 'Complete' : st === 'part' ? 'Partly filled' : ''; });
    $('#bkDone').textContent = done; $('#bkBar').style.width = (done / secs.length * 100) + '%';
    const left = secs.length - done; $('#bkCount').textContent = left ? ` · ${left} section${left > 1 ? 's' : ''} to complete` : ' · all sections complete';
  };
  const show = i => {
    at = Math.max(0, Math.min(secs.length - 1, i));
    secs.forEach((x, k) => x.el.classList.toggle('hidden', k !== at));
    $$('.bk-step').forEach((a, k) => a.classList.toggle('cur', k === at));
    const last = at === secs.length - 1;
    $('#bkPrev').disabled = at === 0; $('#bkNext').classList.toggle('hidden', last); $('#wzBook').classList.toggle('hidden', !last);
    $('#bkStepN').textContent = `Step ${at + 1} of ${secs.length}`;
    $('#main').scrollTop = 0;
    const f = secs[at].el.querySelector('input:not([disabled]):not([readonly]):not([type=checkbox]), select, textarea'); if (f) f.focus({ preventScroll: true });
  };
  const flag = i => { const m = missing(i); secs[i].el.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid')); m.forEach(f => f.classList.add('invalid')); return m; };
  $('#bkNext').onclick = () => {
    const m = flag(at);
    if (m.length) { toast(`Fill ${m.length === 1 ? 'the required field' : `the ${m.length} required fields`} to continue`); const c = m[0].querySelector('input, select, textarea'); if (c) c.focus(); return; }
    show(at + 1);
  };
  $('#bkPrev').onclick = () => show(at - 1);
  $('#bkSteps').onclick = e => { const a = e.target.closest('[data-bk-go]'); if (!a) return; e.preventDefault(); show(+a.dataset.bkGo); };
  // on Book seat, jump to the first page that still has gaps
  $('#wzBook').addEventListener('click', () => { const i = secs.findIndex((x, k) => missing(k).length); if (i >= 0) { show(i); flag(i); } }, true);
  form.addEventListener('input', e => { const f = e.target.closest('.field'); if (f) f.classList.remove('invalid'); refresh(); });
  form.addEventListener('change', e => { const f = e.target.closest('.field'); if (f) f.classList.remove('invalid'); refresh(); });
  form.addEventListener('click', () => setTimeout(refresh));
  form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); if (at < secs.length - 1) $('#bkNext').click(); } });
  $('#main').onscroll = null;
  show(0); setTimeout(refresh);
}

/* ---------- Admission summary + college documents (receipt, fee structure slip) ---------- */
const CATEGORY = { Government: 'Merit', Management: 'Management', NRI: 'NRI', 'Lateral entry': 'Merit (Lateral entry)' };
const dmy = iso => iso ? iso.split('-').reverse().join('.') : '—';
const docCourse = s => { const p = PROGS.find(x => x.code === s.prog); const c = p ? progCourse(p) : s.progName.split(' ')[0]; return s.quota === 'Lateral entry' && c === 'B.Tech' ? 'B.Tech LET' : c; };
const docBranch = s => { const p = PROGS.find(x => x.code === s.prog); return p ? progBranch(p) : s.progName; };
const docExam = s => s.quota === 'Lateral entry' ? 'LET' : (s.entrance && s.entrance !== '—' ? s.entrance.replace(/\s+rank\b/i, '').split(' ')[0].replace(/\/$/, '') : 'Other');
const docExamFull = s => s.entrance && s.entrance !== '—' ? s.entrance : (s.quota === 'Lateral entry' ? 'LET' : '—');
const bookingPay = s => payments.find(x => x.sid === s.id && x.alloc === 'Booking fee') || payments.filter(x => x.sid === s.id && x.kind === 'Payment').sort((a, b) => a.date.localeCompare(b.date))[0] || (s.bfee ? { amt: s.bfee, date: s.created, mode: 'Cash', ref: '—', rcpt: '—' } : null);
function feeModel(s) {
  const tuition = s.fee - Object.values(FIXED).reduce((a, b) => a + b, 0);
  const schol = s.schol ?? (s.conc || 0), spons = s.spons || 0;
  const annualNet = Math.max(0, tuition - schol - spons);
  const y1 = annualNet + Object.values(FIXED).reduce((a, b) => a + b, 0);
  const years = docCourse(s) === 'B.Tech' ? 4 : docCourse(s) === 'B.Tech LET' ? 3 : 2;
  const firstSem = docCourse(s) === 'B.Tech LET' ? 3 : 1;
  const yr = +(s.created || TODAY).slice(0, 4);
  const bp = bookingPay(s), inst1 = Math.min(y1, bp ? bp.amt : Math.round(y1 * .4 / 100) * 100);
  const nov = `${yr}-11-30` > (s.created || TODAY) ? `${yr}-11-30` : addDays(s.created || TODAY, 30);
  const rows = [{ k: 'Year 1', n: 'Payment schedule — Instalment 1', amt: inst1, due: bp ? bp.date : s.created }, { k: 'Year 1', n: 'Payment schedule — Instalment 2', amt: y1 - inst1, due: nov }];
  for (let y = 1; y < years; y++) for (let h = 0; h < 2; h++) {
    const sem = firstSem + 2 * y + h;
    rows.push({ k: 'Semester ' + sem, n: 'Payment schedule', amt: h ? annualNet - Math.round(annualNet / 2) : Math.round(annualNet / 2), due: `${yr + y}-${h ? '11-30' : '06-30'}` });
  }
  return { tuition, schol, spons, annualNet, y1, paid: s.paid, bal: Math.max(0, y1 - s.paid), rows, years };
}
const COLLEGE = `<div class="cd-head"><span class="logo">T</span><div><h4>Thejus Engineering College</h4><div class="cd-sub">Vellarakad P.O., Thrissur, Kerala — 680584 · Promoted by Cheruvathur Foundation</div></div></div>`;
const cdTable = rows => `<table class="cd-t"><tbody>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>`;
function admReceiptDoc(s) {
  const bp = bookingPay(s), m = feeModel(s);
  return `<div class="paper cd">${COLLEGE}
    <div class="cd-title">Admission Registration Receipt — ${(s.created || TODAY).slice(0, 4)}</div>
    <div class="cd-h">1. Admission details</div>
    ${cdTable([['Receipt no.', bp ? bp.rcpt : '—'], ['Date', dmy(bp ? bp.date : s.created)], ['Student name', esc(s.name)], ['Date of birth', dmy(s.dob)], ['Admission category', CATEGORY[s.quota] || s.quota], ['Course', docCourse(s)], ['Entrance exam', esc(docExam(s))], ['Branch', esc(docBranch(s))], ['Contact no.', s.mobile || '—']])}
    <div class="cd-h">2. Fee details</div>
    <table class="cd-t cd-fee"><thead><tr><th>Fee particulars</th><th class="r">Amount</th></tr></thead><tbody>
      <tr><td>Fee per year (tuition fee)</td><td class="r">${inr(m.tuition)}</td></tr>
      <tr><td>Caution deposit (refundable)</td><td class="r">${inr(FIXED['Caution deposit'])}</td></tr>
      <tr><td>Application fee</td><td class="r">${inr(FIXED['Application fee'])}</td></tr>
      <tr><td>University fee &amp; other fees</td><td class="r">${inr(FIXED['University & other fees'])}</td></tr></tbody></table>
    <div class="cd-h">3. Faculty in charge</div>
    <div class="cd-line"><b>Mr./Ms.</b> ${esc(s.officer || '—')}</div>
    <table class="cd-t cd-sign"><thead><tr><th>Authorisation</th><th>Signature</th></tr></thead><tbody>${['Signature of the faculty in charge', 'Verified by', 'Signature of student', 'Signature of parent'].map(x => `<tr><td>${x}</td><td></td></tr>`).join('')}</tbody></table>
    <div class="cd-h">4. Fee payment receipt</div>
    ${cdTable([['Fee received', bp ? `<b>${inr(bp.amt)}</b>` : '—'], ['Date', dmy(bp ? bp.date : '')], ['Mode of payment', bp ? bp.mode : '—'], ['Transaction ID', bp && bp.ref && bp.ref !== '—' ? esc(bp.ref) : (bp && bp.mode === 'Cash' ? 'Cash' : '—')]])}
    <div class="cd-sig">Signature of the accounts in charge</div>
  </div>`;
}
function feeStructureDoc(s) {
  const m = feeModel(s), ay = state.ay || '2026–27';
  return `<div class="paper cd">${COLLEGE}
    <div class="cd-sub cd-acc">Accredited by NAAC · Affiliated to APJ Abdul Kalam Technological University · Approved by AICTE</div>
    <div class="cd-title">Fee Structure — Academic Year ${ay} Admissions</div>
    <div class="cd-h">1. Admission details</div>
    ${cdTable([['Course', docCourse(s)], ['Branch', esc(docBranch(s))], ['Date of admission', dmy(s.created)], ['Admission number', s.adm], ['Admission mode', CATEGORY[s.quota] || s.quota], ['Student name', esc(s.name)], ['Date of birth', dmy(s.dob)]])}
    <div class="cd-h">2. Annual fee details</div>
    <table class="cd-t cd-fee"><thead><tr><th>Fee particulars</th><th class="r">Amount</th><th>Payment frequency / remarks</th></tr></thead><tbody>
      <tr><td>Annual fee</td><td class="r">${inr(m.tuition)}</td><td>Annual</td></tr>
      <tr><td>Application fee</td><td class="r">${inr(FIXED['Application fee'])}</td><td>First year only</td></tr>
      <tr><td>Caution deposit</td><td class="r">${inr(FIXED['Caution deposit'])}</td><td>First year only · refundable</td></tr>
      <tr><td>University &amp; other fees</td><td class="r">${inr(FIXED['University & other fees'])}</td><td>First year</td></tr>
      <tr><td>Sponsorship</td><td class="r">${inr(m.spons)}</td><td></td></tr>
      <tr><td>Scholarship</td><td class="r">${inr(m.schol)}</td><td></td></tr>
      <tr><td>Remarks</td><td colspan="2">${esc(s.feeRemarks || '—')}</td></tr></tbody>
      <tfoot><tr><td>Annual fee / year</td><td class="r">${inr(m.annualNet)}</td><td>After scholarship and sponsorship</td></tr></tfoot></table>
    <div class="cd-h">3. Fee payment and schedule</div>
    <table class="cd-t cd-fee"><tbody>
      <tr><td>Net fee payable in Year 1 (${ay})</td><td class="r">${inr(m.y1)}</td></tr>
      <tr><td>Net annual fee payable from Year II</td><td class="r">${inr(m.annualNet)}</td></tr>
      <tr><td>Year I fee paid</td><td class="r">${inr(m.paid)}</td></tr>
      <tr><td><b>Year I fee balance payable</b></td><td class="r"><b>${inr(m.bal)}</b></td></tr></tbody></table>
    <div class="cd-sh">Instalment schedule</div>
    <table class="cd-t cd-fee"><thead><tr><th>Year / semester</th><th>Payment particulars</th><th class="r">Amount</th><th>Due on or before</th></tr></thead><tbody>
      ${m.rows.map(r => `<tr><td>${r.k}</td><td>${r.n}</td><td class="r">${inr(r.amt)}</td><td>${dmy(r.due)}</td></tr>`).join('')}</tbody></table>
    <div class="cd-h">4. Declaration by student and parent</div>
    <p class="cd-decl">I understand the fee structure for my preferred course at TEC as described above, and I hereby declare that I am liable to pay the fee as agreed upon mutually. Transport, hostel, uniform, miscellaneous fee and university exam fee are not included in the above fee. Scholarship offered will be cancelled from Year II if the student fails to make the payment in the preceding year.</p>
    <table class="cd-t cd-decl-t"><thead><tr><th>Student</th><th>Parent</th></tr></thead><tbody>
      <tr><td>Name: ${esc(s.name)}</td><td>Name: ${esc(s.guardian || '—')}</td></tr>
      <tr><td>Signature:</td><td>Signature:</td></tr>
      <tr><td>Date: ${dmy(TODAY)}</td><td>Date: ${dmy(TODAY)}</td></tr></tbody></table>
  </div>`;
}
function printDocs(html) {
  let el = $('#printArea'); if (!el) { el = document.createElement('div'); el.id = 'printArea'; document.body.appendChild(el); }
  el.innerHTML = html; document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); el.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 50);
}
PAGES['admissions/view'] = () => {
  const parts = location.hash.slice(1).split('/'), s = sById(parts[2] || '');
  /* legacy tab keys from older links fold into the three sections */
  const tab = { overview: 'details', activity: 'details', fees: 'finance', payments: 'finance', docs: 'documents', print: 'documents' }[parts[3]] || parts[3] || 'details';
  if (!s) return `<div>${pageHead('Admission not found')}<div class="content"><a class="btn" href="#admissions">Back to Admissions</a></div></div>`;
  const bp = bookingPay(s);
  const TABS = [['details', 'Details'], ['documents', 'Documents'], ['finance', 'Finance']];
  const card = (t, body, extra = '') => `<div class="card sum-card"><div class="card-h"><h3>${t}</h3>${extra}</div><div class="card-b">${body}</div></div>`;
  let body;
  const sec = (t, rows) => `<section class="sv-sec"><h3>${t}</h3><div class="sv-kv">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v || '—'}</b></div>`).join('')}</div></section>`;
  if (tab === 'details') body = `<div class="card sv-sheet">
      ${sec('Personal details', [['Student name', esc(s.name)], ['Date of birth', fd(s.dob)], ['Gender', s.gender], ['Blood group', s.blood], ['Mobile', s.mobile ? '+91 ' + s.mobile : ''], ['Email', esc(s.email)], ['Aadhaar', s.aadhaar || (s.mobile ? 'XXXX XXXX ' + s.mobile.slice(-4) : '')], ['Nationality', s.nat], ['Religion', s.religion], ['Community', s.community ? '•••• (masked)' : ''], ['Annual income', s.income ? '•••• (masked)' : ''], ['Address', esc(s.address)]])}
      ${sec('Parent / guardian', [['Name', esc(s.guardian)], ['Relation', s.relation || 'Guardian'], ['Mobile', s.gmobile || s.mobile], ['Email', esc(s.gemail)], ['Occupation', esc(s.gocc)]])}
      ${sec('Admission', [['Admission no.', s.adm], ['Application no.', s.app], ['Academic year', s.ay || state.ay], ['Admission date', fd(s.created)], ['Faculty in charge', esc(s.officer)], ['Fee category', s.cat]])}
      ${sec('Quota, course & branch', [['Admission category', CATEGORY[s.quota] || s.quota], ['Quota', s.quota], ['Course', docCourse(s)], ['Branch', esc(docBranch(s))], ['Department', esc(s.dept)]])}
      ${sec('Academic & entrance', [['Qualifying exam', esc(s.qual)], ['Board / university', esc(s.board)], ['Year of passing', s.yop], ['Marks %', s.marks], ['School / college', esc(s.school)], ['Entrance', esc(docExamFull(s))], ['Roll no.', esc(s.examRoll)]])}
    </div>`;
  else if (tab === 'documents') {
    const docRow = ([d, v]) => `<div class="check-row"><span class="dotico">${ic('documents', 14)}</span><div style="flex:1"><div>${d}</div><div class="faint" style="font-size:12px">${v === 'Pending' ? 'Not uploaded' : d.toLowerCase().replace(/ /g, '_') + '.pdf · 412 KB'}</div></div>${chip(v)}${v === 'Uploaded' ? '<button class="btn sm act-write" data-verify>Verify</button>' : v === 'Pending' ? '<button class="btn sm act-write">Upload</button>' : '<button class="btn sm ghost">View</button>'}</div>`;
    const pend = Object.values(s.docs).filter(v => v === 'Pending').length;
    body = card('Submitted documents', Object.entries(s.docs).map(docRow).join(''), `<span class="muted" style="margin-left:auto">${pend ? `${pend} pending` : 'All received'}</span>`);
  }
  else body = `${feeAccountView(s)}
    <div class="sv-docs" style="margin-top:16px">
      ${card('Fee heads', `<table class="simple"><thead><tr><th>Head</th><th>Type</th><th class="r">Amount</th></tr></thead><tbody>
        <tr><td>Tuition fee</td><td><span class="tag">Non-refundable</span></td><td class="r">${inr(s.fee - 18500)}</td></tr>
        ${Object.entries(FIXED).map(([k, v]) => `<tr><td>${k}</td><td><span class="tag">${k === 'Caution deposit' ? 'Refundable' : 'Non-refundable'}</span></td><td class="r">${inr(v)}</td></tr>`).join('')}
        ${s.conc ? `<tr><td>Concession · Merit scholarship</td><td>${chip('Approved')}</td><td class="r" style="color:var(--ok)">− ${inr(s.conc)}</td></tr>` : ''}
        </tbody><tfoot><tr><td colspan="2">Net payable</td><td class="r">${inr(s.net)}</td></tr></tfoot></table>`, `<span class="muted" style="margin-left:auto">FT-26-${s.prog}-${s.quota.slice(0, 4).toUpperCase()} v3</span>`)}
      ${card('Refund policy', `<div class="notice ok">${ic('check', 14)}<div style="flex:1">Policy <b>${s.policy.ver}</b> accepted by <b>${esc(s.guardian)}</b> on ${fd(s.policy.at)}.</div><button class="btn sm" data-policy="${s.id}">View</button></div>`)}
    </div>`;
  const primary = s.status === 'Seat booked' ? `<button class="btn primary act-write" data-wizard="${s.id}" data-step="2">${ic('user', 14)}Collect details</button>`
    : s.status === 'Details collected' ? `<button class="btn primary act-write" data-wizard="${s.id}" data-step="3">${ic('payments', 14)}Take payment</button>`
    : `<button class="btn primary act-write" data-action="record-payment" data-sid="${s.id}" ${s.due > 0 && OCCUPY.includes(s.status) ? '' : 'disabled'}>${ic('payments', 14)}Record payment</button>`;
  const justBooked = state.justBooked === s.id; state.justBooked = null;
  return `<div class="sv-page"><div class="page-head"><div><div class="crumb"><a href="#admissions">Admissions</a> / ${s.adm || s.app}</div><h1>${esc(s.name)}</h1>
      <div class="sv-sub">${s.adm || s.app} · ${esc(s.progName)} · ${s.quota} ${chip(s.status)}</div></div>
    <div class="actions"><a class="btn" href="#admissions">Back to Admissions</a><button class="btn danger act-write" data-action="cancel-adm" data-sid="${s.id}">Cancel admission</button>${primary}</div></div>
  <div class="content">
    ${justBooked ? `<div class="notice ok sum-ok">${ic('check', 16)}<div><b>Seat booked · ${s.adm}</b> — booking fee ${bp ? `<b>${inr(bp.amt)}</b> received by ${bp.mode} · receipt ${bp.rcpt}` : 'not recorded'}.</div></div>` : ''}
    <div class="sheet-tabs sv-tabs">${TABS.map(([k, l]) => `<a class="sheet-tab ${k === tab ? 'on' : ''}" href="#admissions/view/${s.id}${k === 'details' ? '' : '/' + k}">${l}</a>`).join('')}</div>
    <div class="sv-main">${body}</div>
  </div></div>`;
};

/* ---------- Fee account: instalments as invoices, receipts applied oldest first ---------- */
const invNo = (s, k) => `INV/26/${(s.adm || s.app).slice(-5)}-${k + 1}`;
function feeAccount(s) {
  const inv = instPlan(s).map((i, k) => ({ ...i, k, no: invNo(s, k), issued: k === 0 ? s.created : addDays(i.due, -15) < s.created ? s.created : addDays(i.due, -15), paid: 0, recs: [] }));
  const pays = payments.filter(x => x.sid === s.id && x.kind === 'Payment').sort((a, b) => a.date.localeCompare(b.date) || a.rcpt.localeCompare(b.rcpt));
  const apply = new Map();
  pays.forEach(x => {
    const parts = []; let left = x.status === 'Reversed' ? 0 : x.amt;
    for (const i of inv) { if (left <= 0) break; const room = i.amt - i.paid; if (room <= 0) continue; const a = Math.min(room, left); i.paid += a; i.recs.push({ x, a }); parts.push({ i, a }); left -= a; }
    if (left > 0) parts.push({ i: null, a: left });
    apply.set(x.id, parts);
  });
  inv.forEach(i => { const bal = i.amt - i.paid, days = Math.round((Date.parse(i.due) - Date.parse(TODAY)) / 864e5); i.bal = bal; i.st = bal <= 0 ? 'Paid' : days < 0 ? 'Overdue' : i.paid > 0 ? 'Part paid' : days <= 7 ? 'Due soon' : 'Upcoming'; i.days = days; });
  return { inv, pays, apply };
}
function invoicePaper(s, i) {
  return `<div class="paper cd">${COLLEGE}
    <div class="cd-title">Fee Invoice · Demand Note</div>
    ${cdTable([['Invoice no.', i.no], ['Issued', dmy(i.issued)], ['Due on or before', `<b>${dmy(i.due)}</b>`], ['Student', esc(s.name)], ['Admission no.', s.adm || s.app], ['Course · branch', `${docCourse(s)} · ${esc(docBranch(s))}`], ['Admission category', CATEGORY[s.quota] || s.quota]])}
    <div class="cd-h">Particulars</div>
    <table class="cd-t cd-fee"><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody>
      <tr><td>${esc(i.n)} · Year 1 fees ${state.ay}</td><td class="r">${inr(i.amt)}</td></tr></tbody>
      <tfoot><tr><td>Invoice total</td><td class="r">${inr(i.amt)}</td></tr></tfoot></table>
    <div class="cd-h">Payments received against this invoice</div>
    <table class="cd-t cd-fee"><thead><tr><th>Receipt</th><th>Date</th><th>Mode</th><th class="r">Applied</th></tr></thead><tbody>
      ${i.recs.length ? i.recs.map(({ x, a }) => `<tr><td>${x.rcpt}</td><td>${dmy(x.date)}</td><td>${x.mode}</td><td class="r">${inr(a)}</td></tr>`).join('') : '<tr><td colspan="4">No payment yet</td></tr>'}</tbody>
      <tfoot><tr><td colspan="3">Balance due</td><td class="r">${inr(i.bal)}</td></tr></tfoot></table>
    <div class="cd-sig">Accounts in charge</div></div>`;
}
function showInvoice(sid, k) {
  const s = sById(sid), i = feeAccount(s).inv[k];
  openModal(`${mHead('Invoice ' + i.no + ' ' + chip(i.st))}<div class="m-body" style="background:var(--bg)">${invoicePaper(s, i)}</div>
  <div class="m-foot"><button class="btn" id="invPrint">${ic('printer', 14)}Print</button>${i.bal > 0 ? `<button class="btn primary act-write" data-action="record-payment" data-sid="${s.id}">${ic('payments', 14)}Collect ${inr(i.bal)}</button>` : ''}</div>`, true);
  $('#invPrint').onclick = () => printDocs(invoicePaper(s, i));
}
/* instalment schedule table, shared by Admissions › Finance and Payments › Instalments.
   collect: show a Collect button on unpaid rows */
function instTable(s, inv, hlNos = new Set(), collect = false) {
  return `<table class="simple fa-tbl"><thead><tr><th>Instalment</th><th>Due date</th><th class="r">Amount</th><th class="r">Paid</th><th class="r">Balance</th><th>Status</th><th class="r"></th></tr></thead><tbody>
    ${inv.map(i => `<tr class="${hlNos.has(i.no) ? 'hl' : ''}">
      <td><div class="fa-n">${esc(i.n)}</div><div class="faint">${i.no}</div></td>
      <td>${fd(i.due)}${i.st === 'Overdue' ? `<div class="fa-late">${-i.days} days late</div>` : i.bal > 0 && i.days >= 0 ? `<div class="faint">${i.days ? `in ${i.days} days` : 'today'}</div>` : ''}</td>
      <td class="r">${inr(i.amt)}</td><td class="r">${i.paid ? inr(i.paid) : '—'}</td><td class="r"><b>${i.bal > 0 ? inr(i.bal) : '—'}</b></td>
      <td>${chip(i.st)}</td>
      <td class="r">${i.bal <= 0 ? `<button class="btn sm" data-invoice="${s.id}" data-k="${i.k}">${ic('file', 13)}View invoice</button>`
        : collect ? `<button class="btn sm act-write" data-action="record-payment" data-sid="${s.id}">${ic('payments', 13)}Collect</button>` : '<span class="faint">—</span>'}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="2">Total</td><td class="r">${inr(s.net)}</td><td class="r">${inr(s.paid)}</td><td class="r">${inr(s.due)}</td><td colspan="2"></td></tr></tfoot></table>`;
}
function feeAccountView(s) {
  const { inv, pays, apply } = feeAccount(s), hl = state.hlPay; state.hlPay = null;
  const hlInv = hl ? new Set((apply.get(hl) || []).filter(x => x.i).map(x => x.i.no)) : new Set();
  const next = inv.find(i => i.bal > 0);
  let run = s.net;
  setTimeout(() => { const r = $('.fa-pay.hl'); if (r) r.scrollIntoView({ block: 'center' }); });
  return `<div class="fa">
    <div class="card fa-sum"><div class="card-b">
      <div><span>Assessed</span><b>${inr(s.net)}</b></div><div><span>Paid</span><b style="color:var(--ok)">${inr(s.paid)}</b></div>
      <div><span>Balance</span><b>${inr(s.due)}</b></div><div><span>Overdue</span><b style="color:${s.overdue ? 'var(--bad)' : 'inherit'}">${s.overdue ? inr(s.overdue) : '—'}</b></div>
      <div><span>Next due</span><b>${next ? `${inr(next.bal)} <em>on ${fd(next.due)}</em>` : 'Fully paid'}</b></div>
    </div></div>
    <div class="card"><div class="card-h"><h3>Payment schedule · Year 1 ${state.ay}</h3><span class="muted" style="margin-left:auto">payments are applied to the oldest instalment first</span></div><div class="card-b" style="overflow:auto">
      ${instTable(s, inv, hlInv)}
    </div></div>
    <div class="card"><div class="card-h"><h3>Payment history</h3><span class="muted" style="margin-left:auto">${pays.length} receipt${pays.length === 1 ? '' : 's'}</span></div><div class="card-b">
      ${pays.length ? `<table class="simple fa-hist"><thead><tr><th>Receipt</th><th>Date</th><th>Mode</th><th>Reference</th><th>Applied to</th><th class="r">Amount</th><th class="r">Balance after</th></tr></thead><tbody>
      ${pays.map(x => { if (x.status !== 'Reversed') run -= x.amt; return `<tr class="fa-pay ${x.id === hl ? 'hl' : ''}"><td><button class="lnk" data-receipt="${x.id}">${x.rcpt}</button>${x.alloc === 'Booking fee' ? ' <span class="tag">Booking fee</span>' : ''}</td><td>${fd(x.date)}</td><td>${x.mode}</td><td class="faint">${esc(x.ref)}</td>
        <td>${(apply.get(x.id) || []).map(({ i, a }) => i ? `<button class="lnk" data-invoice="${s.id}" data-k="${i.k}">${i.no}</button> <span class="faint">${inr(a)}</span>` : `<span class="faint">Advance ${inr(a)}</span>`).join('<br>')}</td>
        <td class="r">${inr(x.amt)}</td><td class="r">${inr(Math.max(0, run))}</td></tr>`; }).join('')}</tbody></table>` : '<div class="empty">No payments recorded yet.</div>'}
    </div></div></div>`;
}

/* ---------- Payments → one student's payment page (timeline + invoices + history) ---------- */
PAGES['payments/student'] = () => {
  const pparts = location.hash.slice(1).split('/'), s = sById(pparts[2] || ''), ptab = pparts[3] === 'history' ? 'history' : '';
  if (!s) return `<div>${pageHead('Payments')}<div class="content"><a class="btn" href="#payments">Back to Payments</a></div></div>`;
  const { inv, pays, apply } = feeAccount(s), hl = state.hlPay; state.hlPay = null;
  const next = inv.find(i => i.bal > 0), overdueInv = inv.filter(i => i.st === 'Overdue');
  const overall = !OCCUPY.includes(s.status) ? s.status : s.due <= 0 ? 'Fully paid' : overdueInv.length ? 'Overdue' : next && next.st === 'Due soon' ? 'Due soon' : 'Up to date';
  let run = s.net;
  setTimeout(() => { const r = $('.fa-tbl tr.hl'); if (r) r.scrollIntoView({ block: 'center' }); });
  return `<div class="pp-page">${pageHead(esc(s.name), '', `<a class="btn" href="#payments">Back to Payments</a><button class="btn act-write" data-action="remind" data-n="1">${ic('send', 14)}Send reminder</button><button class="btn" id="ppPrint">${ic('printer', 14)}Print statement</button>${s.due > 0 ? `<button class="btn primary act-write" data-action="record-payment" data-sid="${s.id}">${ic('payments', 14)}Record payment</button>` : ''}`, `<a href="#payments">Payments</a> / ${s.adm || s.app}`)}
  <div class="content">
    <div class="pp-meta">${s.adm || s.app} · ${esc(docCourse(s))} ${esc(docBranch(s))} · ${s.quota} · Guardian ${esc(s.guardian)} · +91 ${s.gmobile || s.mobile}</div>
    <div class="card pp-strip"><div class="card-b">
      <div><span>Payment status</span>${chip(overall)}</div>
      <div><span>Assessed</span><b>${inr(s.net)}</b></div>
      <div><span>Paid</span><b style="color:var(--ok)">${s.paid ? inr(s.paid) : '—'}</b></div>
      <div><span>Balance</span><b>${s.due > 0 ? inr(s.due) : '—'}</b></div>
      <div><span>Overdue</span><b style="color:${s.overdue ? 'var(--bad)' : 'inherit'}">${s.overdue ? inr(s.overdue) : '—'}</b></div>
      <div><span>Next due</span><b>${next ? `${inr(next.bal)}<em>${fd(next.due)}</em>` : '—'}</b></div>
    </div></div>
    <div class="sheet-tabs sv-tabs">${[['', `Instalments <span class="pp-n">${inv.length}</span>`], ['history', `Payment history <span class="pp-n">${pays.length}</span>`]].map(([k, l]) => `<a class="sheet-tab ${k === ptab ? 'on' : ''}" href="#payments/student/${s.id}${k ? '/' + k : ''}">${l}</a>`).join('')}</div>
    ${ptab === '' ? `<div class="card"><div class="card-h"><h3>Instalments</h3><span class="muted" style="margin-left:auto">payments are applied to the oldest first</span></div><div class="card-b" style="overflow:auto">
      ${instTable(s, inv, new Set(inv.filter(i => hl && i.recs.some(r => r.x.id === hl)).map(i => i.no)), true)}
    </div></div>` : `<div class="card"><div class="card-h"><h3>Payment history</h3><span class="muted" style="margin-left:auto">${pays.length} receipt${pays.length === 1 ? '' : 's'}</span></div><div class="card-b">
      ${pays.length ? `<table class="simple fa-hist"><thead><tr><th>Receipt</th><th>Date</th><th>Mode</th><th>Reference</th><th>Applied to</th><th class="r">Amount</th><th class="r">Balance after</th></tr></thead><tbody>
      ${pays.map(x => { if (x.status !== 'Reversed') run -= x.amt; return `<tr class="${x.id === hl ? 'hl' : ''}"><td><button class="lnk" data-receipt="${x.id}">${x.rcpt}</button>${x.alloc === 'Booking fee' ? ' <span class="tag">Booking fee</span>' : ''}</td><td>${fd(x.date)}</td><td>${x.mode}</td><td class="faint">${esc(x.ref)}</td>
        <td>${(apply.get(x.id) || []).map(({ i, a }) => i ? `<button class="lnk" data-invoice="${s.id}" data-k="${i.k}">${i.no}</button> <span class="faint">${inr(a)}</span>` : `<span class="faint">Advance ${inr(a)}</span>`).join('<br>')}</td>
        <td class="r">${inr(x.amt)}</td><td class="r">${inr(Math.max(0, run))}</td></tr>`; }).join('')}</tbody></table>` : '<div class="empty">No payments recorded yet.</div>'}
    </div></div>`}
  </div></div>`;
};
function statementPaper(s) {
  const { inv, pays, apply } = feeAccount(s); let run = s.net;
  return `<div class="paper cd">${COLLEGE}<div class="cd-title">Fee Statement · ${state.ay}</div>
    ${cdTable([['Student', esc(s.name)], ['Admission no.', s.adm || s.app], ['Course · branch', `${docCourse(s)} · ${esc(docBranch(s))}`], ['Statement date', dmy(TODAY)]])}
    <div class="cd-h">Invoices</div><table class="cd-t cd-fee"><thead><tr><th>Invoice</th><th>Due</th><th class="r">Amount</th><th class="r">Paid</th><th class="r">Balance</th></tr></thead><tbody>${inv.map(i => `<tr><td>${i.no}</td><td>${dmy(i.due)}</td><td class="r">${inr(i.amt)}</td><td class="r">${inr(i.paid)}</td><td class="r">${inr(i.bal)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="2">Total</td><td class="r">${inr(s.net)}</td><td class="r">${inr(s.paid)}</td><td class="r">${inr(s.due)}</td></tr></tfoot></table>
    <div class="cd-h">Payments</div><table class="cd-t cd-fee"><thead><tr><th>Receipt</th><th>Date</th><th>Mode</th><th>Applied to</th><th class="r">Amount</th><th class="r">Balance</th></tr></thead><tbody>${pays.map(x => { run -= x.amt; return `<tr><td>${x.rcpt}</td><td>${dmy(x.date)}</td><td>${x.mode}</td><td>${(apply.get(x.id) || []).map(({ i }) => i ? i.no : 'Advance').join(', ')}</td><td class="r">${inr(x.amt)}</td><td class="r">${inr(Math.max(0, run))}</td></tr>`; }).join('') || '<tr><td colspan="6">No payments</td></tr>'}</tbody></table>
    <div class="cd-sig">Accounts in charge</div></div>`;
}
document.addEventListener('click', e => { if (e.target.closest('#ppPrint')) { const s = sById(location.hash.slice(1).split('/')[2]); if (s) printDocs(statementPaper(s)); } });
function feeSlipPaper(s) {
  const nd = nextDue(s);
  return `<div class="paper">
    <div class="lh"><span class="logo">T</span><div style="flex:1"><h4>Thejus Engineering College</h4><div class="faint">Vellarakkad, Thrissur, Kerala 680584 · Affiliated to APJ Abdul Kalam Technological University</div></div><div class="qr"></div></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:14px"><div><div style="font-size:14px;font-weight:400;color:var(--navy-800)">FEE SLIP · PAYMENT SCHEDULE</div><div class="faint">Academic year 2026–27</div></div><div style="text-align:right"><div class="faint">Issued</div>${fd(TODAY)}</div></div>
    <div class="kv" style="margin-bottom:14px"><div><span>Student</span>${esc(s.name)}</div><div><span>Admission no.</span>${s.adm}</div><div><span>Programme</span>${s.progName} · ${s.quota}</div><div><span>Seat booked by</span>${esc(s.guardian)} · ${s.relation || 'Guardian'}</div></div>
    <div class="section-t">Fee structure</div>${feeHeadsTable(s)}
    <div class="section-t">Payment schedule</div>${scheduleTable(s)}
    <div class="slip-next">${nd ? `<div><div class="faint">Next payment</div><b>${inr(nd.bal)}</b> due on <b>${fd(nd.due)}</b> · ${nd.n}</div>` : '<div><b>Fully paid</b> for 2026–27</div>'}</div>
    <p class="faint" style="margin:12px 0 0">Pay at the accounts counter (cash, UPI, cheque, DD) or by bank transfer to SBI A/c XXXXXX4521, IFSC SBIN0070123. Quote the admission number.<br>Refund policy ${s.policy.ver} accepted by ${esc(s.guardian)} on ${fd(s.policy.at)}. Refunds follow the policy slabs.</p>
    <div style="display:flex;justify-content:flex-end;margin-top:18px"><div style="text-align:center"><div style="font-family:cursive;color:var(--blue-600);font-size:14px">Accounts</div><div class="faint" style="border-top:1px solid var(--line-2);padding-top:3px">Finance department</div></div></div>
  </div>`;
}
function showFeeSlip(sid) {
  const s = sById(sid);
  openModal(`${mHead('Fee slip · ' + esc(s.name))}<div class="m-body" style="background:var(--bg);padding-top:16px">${feeSlipPaper(s)}</div>
  <div class="m-foot"><button class="btn">${ic('send', 14)}Send to ${esc(s.guardian)}</button><button class="btn primary">${ic('printer', 14)}Print</button></div>`, true);
}
function showPolicy(sid) {
  const s = sid ? sById(sid) : null;
  openModal(`${mHead('Refund policy ' + POLICY.ver)}<div class="m-body">${policyTable()}
  ${s ? `<div class="notice ok" style="margin-top:14px">${ic('check', 14)}<div>Read and accepted by the seat booker <b>${esc(s.guardian)}</b> (${s.relation || 'Guardian'}) on ${fd(s.policy.at)} while booking ${s.adm}. Signed copy on file.</div></div>` : `<div class="notice" style="margin-top:14px">${ic('info', 14)}<div>The seat booker sees this at the desk and must tick acceptance before a seat can be booked.</div></div>`}</div>
  <div class="m-foot"><button class="btn" data-close-modal>Close</button><button class="btn primary">${ic('printer', 14)}Print</button></div>`);
}

/* ---------- Due payments (Finance) ---------- */
/* fee-status rows + KPI strip shared by every Payments tab */
function duesData() {
  const rows = students.filter(s => OCCUPY.includes(s.status) && inAy(s)).map(s => {
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
/* on the Students tab a card filters the table; on other tabs it opens Students with that filter */
function duesKpis(onStudents) {
  const { sum, cnt } = duesData();
  return `<div class="kpis" style="grid-template-columns:repeat(5,minmax(0,1fr))">
    ${[['Overdue', 'clock', 'color:var(--bad)'], ['Due this week', 'calendar', ''], ['Upcoming', 'calendar-plus', ''], ['Awaiting first payment', 'user', ''], ['Fully paid', 'check', 'color:var(--ok)']].map(([st, i, c]) => `<button class="kpi" ${onStudents ? `data-fchip="${st}"` : `data-go="payments/students" data-preset='{"f":"${st}"}'`}><div class="k-l">${ic(i)}${st}</div><div class="k-v" style="${c}">${inrS(sum(st))}</div><div class="k-s">${cnt(st)} students${st === 'Fully paid' ? ' · collected' : ''}</div></button>`).join('')}
  </div>`;
}
PAGES['payments/students'] = PAGES['payments/dues'] = PAGES.dues = () => {
  const { rows, cnt } = duesData(), ST = DUE_ST;
  const html = `<div class="fill">${pageHead('Payments', '', `<button class="btn act-write" data-action="remind" data-n="${cnt('Overdue') + cnt('Due this week')}">${ic('send', 14)}Send reminders</button><button class="btn primary act-write" data-action="record-payment">${ic('plus', 14)}Record payment</button>`)}
  <div class="content">${duesKpis(true)}
  ${sheet({ cols: [
    { key: 'adm', label: 'Admission no.', w: 136, render: r => `<span class="lnk" data-open>${r.adm}</span>` }, { key: 'name', label: 'Student', w: 170 }, { key: 'progName', label: 'Programme', w: 190 }, { key: 'quota', label: 'Quota', w: 110 },
    { key: 'net', label: 'Assessed', w: 108, align: 'r', fmt: inr, sum: 'inr' }, { key: 'paid', label: 'Paid', w: 108, align: 'r', fmt: v => v ? inr(v) : '—', sum: 'inr' }, { key: 'due', label: 'Balance', w: 108, align: 'r', fmt: v => v ? inr(v) : '—', sum: 'inr' },
    { key: 'inst', label: 'Next instalment', w: 190 }, { key: 'ndue', label: 'Due date', w: 110, fmt: v => v ? fd(v) : '—' }, { key: 'days', label: 'When', w: 110, render: r => `<span style="${r.dst === 'Overdue' ? 'color:var(--bad)' : ''}">${r.when}</span>` },
    { key: 'nbal', label: 'Amount due', w: 116, align: 'r', fmt: v => v ? inr(v) : '—', sum: 'inr' }, { key: 'dst', label: 'Fee status', w: 170, render: r => chip(r.dst) },
    { key: 'gm', label: 'Guardian mobile', w: 130, render: r => r.gmobile || r.mobile },
    { key: 'act', label: '', w: 100, render: r => r.due > 0 ? `<button class="btn sm act-write" data-action="record-payment" data-sid="${r.id}">Collect</button>` : '' }], rows, onOpen: r => { location.hash = 'payments/student/' + r.id; },
    chips: fchip('all', 'All', rows.length, true) + ST.map(s => fchip(s, s, cnt(s))).join(''), chipLabel: 'Fee status', tabs: payTabs('students') })}</div></div>`;
  chipHandler = ids => { S.filter = ids.length ? r => ids.includes(r.dst) : null; renderSheet(); };
  setTimeout(() => { if (state.preset && state.preset.f) { const f = state.preset.f; state.preset = null; setChips([f]); } });
  return html;
};

/* ---------- Record payment ---------- */
function recordPayment(sid, presetMode) {
  const opts = students.filter(s => s.status === 'Confirmed' && s.due > 0);
  const s = sid ? sById(sid) : opts[0]; if (s.status !== 'Confirmed') return bookingWizard(s.id, s.status === 'Seat booked' ? 2 : 3);
  openModal(`${mHead('Record payment')}
  <div class="m-body">
    <div class="form-grid" style="grid-template-columns:2fr 1fr">
      <div class="field"><label>Student <span class="req">*</span></label><select class="input" id="pStu">${opts.map(o => `<option value="${o.id}" ${o.id === s.id ? 'selected' : ''}>${esc(o.name)} · ${o.adm} · balance ${inr(o.due)}</option>`).join('')}</select></div>
      <div class="field"><label>Date</label><input class="input" type="date" value="${TODAY}"></div>
    </div>
    <div class="field" style="margin-top:12px"><label>Mode of payment <span class="req">*</span></label><div class="seg" id="pMode" role="radiogroup" aria-label="Mode of payment">${PAY_MODES.map(m => `<button type="button">${m}</button>`).join('')}</div><span class="hint mode-err" id="pModeErr"></span></div>
    <div class="form-grid" style="grid-template-columns:1fr 1fr;margin-top:12px">
      <div class="field"><label>Amount (₹) <span class="req">*</span></label><input class="input num" id="pAmt" style="font-size:16px;height:38px"></div>
      <div class="field" id="pRefF"><label>Reference no. <span class="req">*</span></label><input class="input" id="pRef" placeholder="UTR / cheque / DD / link transaction no."><span class="hint">Try an existing reference to see the duplicate warning</span></div>
    </div>
    <div id="pDup" style="margin-top:10px"></div>
    <div class="section-t" style="margin-top:16px">Allocation preview · oldest instalment first</div>
    <div id="pAlloc"></div>
  </div>
  <div class="m-foot"><span class="faint" style="margin-right:auto">${ic('lock', 12).replace('class="ic"', 'class="ic" style="display:inline;vertical-align:-1px"')} Ledger, receipt and SMS are posted together.</span><button class="btn" data-close-modal>Cancel</button><button class="btn primary" id="pPost">Post payment</button></div>`);
  const upd = () => {
    const st = sById($('#pStu').value), amt = +($('#pAmt').value.replace(/[^\d]/g, '')) || 0;
    let rem = amt;
    const rows = allocate(st).map(i => { const bal = i.amt - i.paid; const a = Math.min(bal, rem); rem -= a; return `<tr><td>${i.n}</td><td>${fd(i.due)}</td><td class="r">${inr(bal)}</td><td class="r" style="color:var(--blue-600)">${a ? inr(a) : '—'}</td><td class="r">${inr(bal - a)}</td></tr>`; }).join('');
    $('#pAlloc').innerHTML = `<table class="simple"><thead><tr><th>Instalment</th><th>Due</th><th class="r">Balance</th><th class="r">This payment</th><th class="r">After</th></tr></thead><tbody>${rows}</tbody></table>${rem > 0 ? `<div class="notice" style="margin-top:10px">${ic('alert', 16)}<div>${inr(rem)} exceeds the balance and will be held as an advance.</div></div>` : ''}`;
    const ref = $('#pRef').value.trim();
    const dup = ref && payments.find(p => p.ref.toLowerCase() === ref.toLowerCase());
    $('#pDup').innerHTML = dup ? `<div class="notice warn">${ic('alert', 16)}<div style="flex:1">Reference already used on <b style="font-weight:400">${dup.rcpt}</b> (${inr(dup.amt)}, ${fd(dup.date)}). To post anyway, enter a reason — it will be logged.<input class="input" style="margin-top:8px;background:#fff" placeholder="Override reason" id="pOver"></div></div>` : '';
  };
  $('#pMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('#pMode button').forEach(x => x.classList.toggle('on', x === b)); $('#pRefF').classList.toggle('hidden', b.textContent === 'Cash'); $('#pMode').classList.remove('invalid'); $('#pModeErr').textContent = ''; };
  ['pStu', 'pAmt', 'pRef'].forEach(i => $('#' + i).addEventListener('input', upd));
  if (presetMode) { const b = $$('#pMode button').find(x => x.textContent === presetMode); if (b) b.click(); }
  $('#pAmt').value = String(s.overdue || (nextDue(s) || { bal: s.due }).bal); upd();
  $('#pPost').onclick = () => {
    const st = sById($('#pStu').value), amt = +($('#pAmt').value.replace(/[^\d]/g, '')) || 0;
    const mode = modePicked(), ref = mode === 'Cash' ? '—' : $('#pRef').value.trim();
    if (!amt) return $('#pAmt').focus();
      if (!mode) return;
    if (mode !== 'Cash' && !ref) return $('#pRef').focus();
    if ($('#pOver') && !$('#pOver').value.trim()) return $('#pOver').focus();
    const p = { id: 'p' + Date.now(), rcpt: 'TEC/RCP/26/' + pad(payments.filter(x => x.kind === 'Payment').length + 1, 5), sid: st.id, amt, date: TODAY, mode, cashier: 'Anita Joseph', ref, kind: 'Payment', status: 'Posted' };
    payments.push(p);
    p.alloc = (nextDue(st) || { n: 'Fee instalment' }).n; st.paid += amt; recalc(st);
    audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' 10:41', user: 'Anita Joseph', role: 'Admin', module: 'Payments', action: 'payment.record', record: p.rcpt, detail: `${inr(amt)} · ${mode} · ${st.name}`, before: '—', after: `ledger +${inr(amt)}`, ip: '10.12.4.1' });
    closeModal(); closeDrawer(); route();
    toast(`${p.rcpt} posted · ledger updated · SMS queued to guardian`);
    setTimeout(() => showReceipt(p.id), 300);
  };
}
function receiptPaper(p) {
  const s = sById(p.sid);
  return `<div class="paper">
    <div class="lh"><span class="logo">T</span><div style="flex:1"><h4>Thejus Engineering College</h4><div class="faint">Vellarakkad, Thrissur, Kerala 680584 · Affiliated to APJ Abdul Kalam Technological University</div></div><div class="qr" title="Scan to verify"></div></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:14px"><div><div style="font-size:14px;color:var(--navy-800)">FEE RECEIPT</div><div class="faint">${p.rcpt}</div></div><div style="text-align:right"><div class="faint">Date</div>${fd(p.date)}</div></div>
    <div class="kv" style="margin-bottom:12px"><div><span>Received from</span>${esc(s.guardian)}</div><div><span>Student</span>${esc(s.name)}</div><div><span>Admission no.</span>${s.adm}</div><div><span>Programme</span>${s.progName} · ${s.quota}</div><div><span>Mode</span>${p.mode}</div><div><span>Reference</span>${esc(p.ref)}</div></div>
    <table class="simple"><thead><tr><th>Applied to</th><th class="r">Amount</th></tr></thead><tbody>${(feeAccount(s).apply.get(p.id) || [{ i: null, a: p.amt }]).map(({ i, a }) => `<tr><td>${i ? `${i.no} · ${esc(i.n)}${p.alloc === 'Booking fee' ? ' (booking fee)' : ''}` : 'Advance / unallocated'}</td><td class="r">${inr(a)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total received</td><td class="r">${inr(p.amt)}</td></tr></tfoot></table>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:28px"><div class="faint">Balance: ${inr(s.due)}${s.nextDue ? ` · next due ${fd(s.nextDue)}` : ''}<br>Refund policy ${s.policy.ver} accepted by ${esc(s.guardian)}.<br>Computer-generated receipt. Verify at thejus.edu.in/verify</div><div style="text-align:center"><div style="font-family:cursive;color:var(--blue-600);font-size:16px">${p.cashier.split(' ')[0]}</div><div class="faint" style="border-top:1px solid var(--line-2);padding-top:3px">Cashier</div></div></div>
  </div>`;
}
function showReceipt(pid) {
  const p = payments.find(x => x.id === pid);
  openModal(`${mHead('Receipt ' + p.rcpt + ' ' + chip(p.status))}<div class="m-body" style="background:var(--bg)">${receiptPaper(p)}</div>
  <div class="m-foot"><span class="faint" style="margin-right:auto">${ic('sms', 12).replace('class="ic"', 'class="ic" style="display:inline;vertical-align:-1px"')} SMS delivered · ${ic('mail', 12).replace('class="ic"', 'class="ic" style="display:inline;vertical-align:-1px"')} Email sent</span><button class="btn">${ic('send', 14)}Resend</button><button class="btn" data-feeslip="${p.sid}">${ic('documents', 14)}Fee slip</button><button class="btn primary">${ic('printer', 14)}Print</button></div>`, true);
}

/* ---------- Seat matrix ---------- */
/* ---------- Seat occupancy (Reports → Analytics): Table · Bar chart · Pie chart, filterable by quota ---------- */
const SM_COL = { cf: '#0A3C6E', dc: '#1783C1', sb: '#A2CDE6', av: '#EBEBEB' };
const SM_LBL = { cf: 'Confirmed', dc: 'Details collected', sb: 'Seat booked', av: 'Available' };
const seatOccupancy = () => `<div id="smOcc">${smInner()}</div><div class="sm-tip" id="smTip" role="tooltip"></div>`;
function smInner() {
  const view = state.smView || 'table', qf = state.smQuota || '';
  const QS = qf ? [qf] : QUOTAS, PROGS_A = actProgs();
  const stat = (p, q) => { const n = st => students.filter(s => s.prog === p.code && s.quota === q && s.status === st && inAy(s)).length; const cf = n('Confirmed'), dc = n('Details collected'), sb = n('Seat booked'); return { cap: p.cap[q] || 0, cf, dc, sb, used: cf + dc + sb }; };
  const add = (a, b) => ({ cap: a.cap + b.cap, cf: a.cf + b.cf, dc: a.dc + b.dc, sb: a.sb + b.sb, used: a.used + b.used });
  const Z = { cap: 0, cf: 0, dc: 0, sb: 0, used: 0 };
  const sumQ = (p, qs) => qs.map(q => stat(p, q)).reduce(add, Z);
  const byQAll = QUOTAS.map(q => PROGS_A.reduce((a, p) => add(a, stat(p, q)), Z));
  const all = (qf ? [byQAll[QUOTAS.indexOf(qf)]] : byQAll).reduce(add, Z);
  const pct = (v, c) => c ? v / c * 100 : 0;
  const av = s => Math.max(0, s.cap - s.used);
  const tip = (title, s) => `${esc(title)}|${s.cf} confirmed · ${s.dc} details collected · ${s.sb} seat booked · ${av(s)} available`;
  const bar = (s, big, title = '') => `<div class="sm-bar ${big ? 'big' : ''}" data-tip="${tip(title, s)}"><i class="cf" style="width:${pct(s.cf, s.cap)}%"></i><i class="dc" style="width:${pct(s.dc, s.cap)}%"></i><i class="sb" style="width:${pct(s.sb, s.cap)}%"></i></div>`;
  const badge = s => { const left = av(s); return left <= 0 ? '<span class="chip bad">Full</span>' : left / s.cap <= .15 ? `<span class="chip warn">${left} left</span>` : `<span class="sm-left">${left} left</span>`; };
  const cell = (s, title) => s.cap ? `<div class="sm-cell"><div class="sm-top"><span class="sm-num">${s.used}<span> / ${s.cap}</span></span>${badge(s)}</div>${bar(s, false, title)}</div>` : '<span class="sm-na">Not offered</span>';
  const card = (key, label, s) => `<button type="button" class="card sm-card ${qf === key ? 'on' : ''}" data-smquota="${key}"><div class="sm-card-l">${label}</div><div class="sm-card-v">${s.used}<span> / ${s.cap}</span></div>${bar(s, true, label)}<div class="sm-card-s"><span>${Math.round(pct(s.used, s.cap))}% filled</span><span>${av(s)} left</span></div></button>`;
  const legend = `<div class="sm-legend">${['cf', 'dc', 'sb', 'av'].map(k => `<span><i style="background:${SM_COL[k]}"></i>${SM_LBL[k]} <b>${k === 'av' ? av(all) : all[k]}</b></span>`).join('')}</div>`;
  const controls = `<div class="sm-ctl"><div class="seg" role="radiogroup" aria-label="View">${[['table', 'Table', 'table'], ['bar', 'Bar chart', 'chart-bar'], ['pie', 'Pie chart', 'chart-pie']].map(([k, l, i]) => `<button type="button" class="${view === k ? 'on' : ''}" data-smview="${k}"><i class="pi pi-${i}"></i>${l}</button>`).join('')}</div>
    <label class="sm-qf">Quota<select class="input" id="smQuota"><option value="">All quotas</option>${QUOTAS.map(q => `<option ${q === qf ? 'selected' : ''}>${q}</option>`).join('')}</select></label></div>`;
  let body = '';
  if (view === 'table') {
    body = `<div class="card sm-wrap">${legend}<table class="sm-table"><thead><tr><th>Programme</th>${QS.map(q => `<th>${q}</th>`).join('')}<th class="r">Total</th></tr></thead>
    <tbody>${PROGS_A.map(p => { const row = QS.map(q => stat(p, q)), t = row.reduce(add, Z); return t.cap ? `<tr><td><div class="sm-prog">${p.name}</div><div class="sm-sub">${p.dept} · ${p.code}</div></td>${row.map((x, i) => `<td>${cell(x, p.name + ' · ' + QS[i])}</td>`).join('')}<td class="r"><div class="sm-num">${t.used}<span> / ${t.cap}</span></div><div class="sm-sub">${Math.round(pct(t.used, t.cap))}% filled</div></td></tr>` : ''; }).join('')}</tbody>
    <tfoot><tr><td>All programmes</td>${QS.map(q => { const x = PROGS_A.reduce((a, p) => add(a, stat(p, q)), Z); return `<td>${cell(x, 'All programmes · ' + q)}</td>`; }).join('')}<td class="r"><div class="sm-num">${all.used}<span> / ${all.cap}</span></div><div class="sm-sub">${Math.round(pct(all.used, all.cap))}% filled</div></td></tr></tfoot></table></div>`;
  }
  if (view === 'bar') {
    const rows = PROGS_A.map(p => ({ p, s: sumQ(p, QS) })).filter(r => r.s.cap), maxCap = Math.max(1, ...rows.map(r => r.s.cap));
    const seg = (r, k) => r.s[k] ? `<i style="width:${r.s[k] / r.s.cap * 100}%;background:${SM_COL[k]}" data-tip="${esc(r.p.name)}|${SM_LBL[k]}: ${r.s[k]} of ${r.s.cap} seats"></i>` : '';
    body = `<div class="card sm-chart">${legend}<div class="sm-bars">${rows.map(r => `<div class="sm-brow"><div class="sm-blbl"><div class="sm-prog">${esc(r.p.name)}</div><div class="sm-sub">${esc(r.p.dept)}</div></div>
      <div class="sm-btrack-wrap"><div class="sm-btrack" style="width:${r.s.cap / maxCap * 100}%" data-tip="${tip(r.p.name, r.s)}">${['cf', 'dc', 'sb'].map(k => seg(r, k)).join('')}</div></div>
      <div class="sm-bval"><b>${r.s.used}</b> / ${r.s.cap}<span>${Math.round(pct(r.s.used, r.s.cap))}%</span></div></div>`).join('')}</div>
      <div class="sm-note">Bar length = seats available in the programme${qf ? ' for ' + qf : ''}; filled part split by status. Hover a segment for the exact count.</div></div>`;
  }
  if (view === 'pie') {
    const donut = (s, r, w, big, title) => {
      const C = 2 * Math.PI * r, tot = Math.max(1, s.cap), parts = [['cf', s.cf], ['dc', s.dc], ['sb', s.sb], ['av', av(s)]].filter(x => x[1] > 0);
      const gap = parts.length > 1 ? 2 : 0; let off = 0;
      const arcs = parts.map(([k, v]) => { const len = Math.max(0, v / tot * C - gap); const el = `<circle r="${r}" cx="0" cy="0" fill="none" stroke="${SM_COL[k]}" stroke-width="${w}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" data-tip="${esc(title)}|${SM_LBL[k]}: ${v} (${Math.round(v / tot * 100)}%)"/>`; off += v / tot * C; return el; }).join('');
      const R = r + w / 2 + 2;
      return `<svg viewBox="${-R} ${-R} ${2 * R} ${2 * R}" width="${2 * R}" height="${2 * R}" class="sm-donut" role="img" aria-label="${esc(title)}: ${s.used} of ${s.cap} seats filled"><g transform="rotate(-90)">${arcs}</g>
        <text class="d-v" y="${big ? 2 : 4}" text-anchor="middle">${big ? s.used : Math.round(pct(s.used, s.cap)) + '%'}</text>${big ? `<text class="d-s" y="22" text-anchor="middle">of ${s.cap} seats</text>` : ''}</svg>`;
    };
    const rows = PROGS_A.map(p => ({ p, s: sumQ(p, QS) })).filter(r => r.s.cap);
    body = `<div class="sm-pies"><div class="card sm-chart sm-pie-main"><div class="card-h"><h3>${qf || 'All quotas'} · all programmes</h3></div><div class="card-b sm-pie-body">${donut(all, 70, 22, true, 'All programmes')}
        <div class="sm-pie-legend">${['cf', 'dc', 'sb', 'av'].map(k => { const v = k === 'av' ? av(all) : all[k]; return `<div><i style="background:${SM_COL[k]}"></i><span>${SM_LBL[k]}</span><b>${v}</b><em>${Math.round(pct(v, all.cap))}%</em></div>`; }).join('')}</div></div></div>
      <div class="card sm-chart"><div class="card-h"><h3>By programme</h3><span class="muted">% of seats filled</span></div><div class="card-b sm-pie-grid">${rows.map(r => `<div class="sm-mini">${donut(r.s, 30, 10, false, r.p.name)}<div class="sm-prog">${esc(r.p.name)}</div><div class="sm-sub">${r.s.used} / ${r.s.cap} · ${av(r.s)} left</div></div>`).join('')}</div></div></div>`;
  }
  return `<div class="sm-cards">${card('', 'All quotas', byQAll.reduce(add, Z))}${QUOTAS.map((q, k) => card(q, q, byQAll[k])).join('')}</div>${controls}${body}`;
}
function smRerender() { const el = $('#smOcc'); if (el) el.innerHTML = smInner(); }
document.addEventListener('click', e => {
  const v = e.target.closest('[data-smview]'); if (v) { state.smView = v.dataset.smview; try { localStorage.setItem('ta.smView', state.smView); } catch (x) { /* storage unavailable */ } return smRerender(); }
  const q = e.target.closest('[data-smquota]'); if (q) { state.smQuota = q.dataset.smquota === state.smQuota ? '' : q.dataset.smquota; return smRerender(); }
});
document.addEventListener('change', e => { if (e.target.id === 'smQuota') { state.smQuota = e.target.value; smRerender(); } });
document.addEventListener('mousemove', e => {
  const t = $('#smTip'); if (!t) return;
  const el = e.target.closest('#smOcc [data-tip]');
  if (!el) { t.style.display = 'none'; return; }
  const [h, b] = el.dataset.tip.split('|');
  t.innerHTML = `<b>${h}</b>${b ? `<span>${b}</span>` : ''}`; t.style.display = 'block';
  const x = Math.min(e.clientX + 14, window.innerWidth - t.offsetWidth - 8), y = e.clientY + 16 + t.offsetHeight > window.innerHeight ? e.clientY - t.offsetHeight - 10 : e.clientY + 16;
  t.style.left = x + 'px'; t.style.top = y + 'px';
});
try { state.smView = localStorage.getItem('ta.smView') || 'table'; } catch (x) { /* storage unavailable */ }

/* ---------- Seat matrix (Settings): capacity editor ---------- */
const actProgs = () => PROGS.filter(p => p.active !== false);
const seatsUsed = (code, q) => students.filter(s => s.prog === code && (!q || s.quota === q) && OCCUPY.includes(s.status)).length;
const deptList = () => [...new Set([...PROGS.map(p => p.dept), ...((STRUCT.kids[0] || {}).kids || []).map(d => d.name)])];
const capTotal = p => QUOTAS.reduce((t, q) => t + (p.cap[q] || 0), 0);
/* courses first, departments inside each course */
let COURSES = null;
const courseList = () => COURSES || (COURSES = [...new Set(PROGS.map(progCourse))]);
const progsOf = c => PROGS.filter(p => progCourse(p) === c);
function smRows() {
  return courseList().map(c => {
    const ps = progsOf(c);
    const head = `<tr class="sm-course"><td colspan="${QUOTAS.length + 3}"><div class="sm-ch"><span class="sm-cic"><i class="pi pi-book"></i></span><input class="input sm-cname" data-sm-course="${esc(c)}" value="${esc(c)}" aria-label="Course name"><button class="btn sm act-write sm-adddept" data-sm-add="${esc(c)}">${ic('plus', 12)}Add department</button></div></td></tr>`;
    const rows = ps.map((p, i) => {
      const off = p.active === false;
      return `<tr class="sm-dept ${off ? 'sm-off' : ''} ${i === ps.length - 1 ? 'last' : ''}">
        <td><div class="sm-dn"><span class="sm-tl"></span><input class="input sm-name" data-sm-branch="${p.code}" value="${esc(progBranch(p))}" aria-label="Department name"></div></td>
        <td><span class="sm-code">${p.code}</span>${off ? '<div class="sm-sub">inactive</div>' : ''}</td>
        ${QUOTAS.map(q => `<td class="r"><input class="input num sm-cap" type="number" min="0" step="1" data-sm-cap="${p.code}|${q}" value="${p.cap[q] || 0}" aria-label="${q} seats"></td>`).join('')}
        <td><button class="switch ${off ? '' : 'on'}" data-sm-active="${p.code}" title="${off ? 'Inactive — click to activate' : 'Active — click to deactivate'}"></button></td></tr>`;
    }).join('') || `<tr class="sm-dept sm-empty last"><td colspan="${QUOTAS.length + 3}"><div class="sm-dn"><span class="sm-tl"></span><span class="faint">No departments yet ·</span> <button class="lnk" data-sm-add="${esc(c)}">add the first department</button></div></td></tr>`;
    return head + rows;
  }).join('');
}
const smFoot = () => { const A = actProgs(); return `<tr><td colspan="2">${courseList().length} courses · ${A.length} active departments</td>${QUOTAS.map(q => `<td class="r">${A.reduce((t, p) => t + (p.cap[q] || 0), 0)}</td>`).join('')}<td class="r">${A.reduce((t, p) => t + capTotal(p), 0)}</td><td></td></tr>`; };
function smRender() { const b = $('#smBody'); if (!b) return; b.innerHTML = smRows(); }
PAGES.seats = () => `<div class="fill">${admHead('seats', `<button class="btn primary act-write" data-sm-addcourse>${ic('plus', 14)}Add course</button>`)}
  <div class="content"><div class="card"><div class="card-h"><h3>Seats by course and department</h3><span class="muted" style="margin-left:auto">Create a course, then add its departments · 0 = quota not offered</span></div>
  <div class="card-b" style="overflow:auto"><table class="simple sm-edit"><thead><tr><th style="min-width:280px">Course / department</th><th style="min-width:90px">Code</th>${QUOTAS.map(q => `<th class="r">${q} seats</th>`).join('')}<th>Active</th></tr></thead>
  <tbody id="smBody">${smRows()}</tbody></table></div></div>
  <p class="faint" style="margin-top:10px">Changes save as you go. Inactive departments can't be booked. Seats filled, totals and availability are in <a class="lnk" href="#reports">Reports &amp; analytics</a>.</p></div></div>`;
function smAddCourse() {
  openModal(`${mHead('Add course')}<div class="m-body"><form id="ncForm" autocomplete="off">
    <div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <div class="field"><label>Course name <span class="req">*</span></label><input class="input" id="ncName" placeholder="e.g. B.Arch, BCA, M.Tech"></div>
      <div class="field"><label>Duration</label><select class="input" id="ncYears">${[1, 2, 3, 4, 5].map(y => `<option value="${y}" ${y === 4 ? 'selected' : ''}>${y} year${y > 1 ? 's' : ''}</option>`).join('')}</select></div>
    </div>
    <p class="faint" style="margin-top:10px">After creating the course, add its departments (branches) with seats per quota.</p>
    <div id="ncErr"></div></form></div>
  <div class="m-foot"><button class="btn" data-close-modal>Cancel</button><button class="btn primary" id="ncSave">Create course</button></div>`);
  $('#ncSave').onclick = () => {
    const name = $('#ncName').value.trim();
    const err = !name ? 'Enter a course name.' : courseList().some(c => c.toLowerCase() === name.toLowerCase()) ? `${name} already exists.` : '';
    if (err) { $('#ncErr').innerHTML = `<div class="notice bad" style="margin-top:12px">${ic('alert', 14)}<div>${err}</div></div>`; return; }
    courseList().push(name);
    audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' 11:05', user: 'Anita Joseph', role: state.role, action: 'seats.course_add', record: name, detail: `${name} · ${$('#ncYears').value} years`, before: '—', after: 'Created', ip: '10.12.4.1' });
    closeModal(); toast(`${name} created · now add its departments`);
  };
}
function smAddModal(course) {
  const cs = courseList(), c0 = course && cs.includes(course) ? course : cs[0];
  openModal(`${mHead('Add department')}<div class="m-body"><form id="npForm" autocomplete="off">
    <div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <div class="field"><label>Course <span class="req">*</span></label><select class="input" id="npCourse">${cs.map(c => `<option ${c === c0 ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Department <span class="req">*</span></label><select class="input" id="npDept">${deptList().map(d => `<option>${esc(d)}</option>`).join('')}<option value="__new">+ New department…</option></select></div>
      <div class="field hidden" id="npNewF"><label>New department name <span class="req">*</span></label><input class="input" id="npNew" placeholder="e.g. Artificial Intelligence"></div>
      <div class="field"><label>Code <span class="req">*</span></label><input class="input" id="npCode" placeholder="e.g. BT-AI" style="text-transform:uppercase"></div>
    </div>
    <div class="np-preview" id="npPrev"></div>
    <div class="form-sec">Seats per quota</div>
    <div class="form-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${QUOTAS.map(q => `<div class="field"><label>${q}</label><input class="input num" type="number" min="0" step="1" value="0" data-np-q="${q}"></div>`).join('')}</div>
    <div class="check-row" style="margin-top:14px"><span style="flex:1">Active — open for booking</span><button type="button" class="switch on" id="npActive"></button></div>
    <div id="npErr"></div></form></div>
  <div class="m-foot"><button class="btn" data-close-modal>Cancel</button><button class="btn primary" id="npSave">Add department</button></div>`);
  let codeTouched = false;
  const dept = () => $('#npDept').value === '__new' ? $('#npNew').value.trim() : $('#npDept').value;
  const initials = w => w.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean).map(x => x[0]).join('').toUpperCase();
  const preview = () => {
    const c = $('#npCourse').value, d = dept();
    $('#npPrev').innerHTML = d ? `Programme will appear as <b>${esc(c)} ${esc(d)}</b> · in Book seat: course <b>${esc(c)}</b>, branch <b>${esc(d)}</b>` : '';
    if (!codeTouched && d) $('#npCode').value = `${initials(c.replace('.', ' ')).slice(0, 2)}-${initials(d).slice(0, 4)}`;
  };
  $('#npCode').oninput = () => { codeTouched = true; };
  $('#npCourse').onchange = preview; $('#npNew').oninput = preview;
  $('#npDept').onchange = e => { $('#npNewF').classList.toggle('hidden', e.target.value !== '__new'); preview(); };
  $('#npActive').onclick = e => { e.stopPropagation(); e.currentTarget.classList.toggle('on'); };
  preview();
  $('#npSave').onclick = () => {
    const c = $('#npCourse').value, d = dept(), isNew = $('#npDept').value === '__new', code = $('#npCode').value.trim().toUpperCase();
    const cap = Object.fromEntries($$('[data-np-q]').map(i => [i.dataset.npQ, Math.max(0, Math.floor(+i.value || 0))]));
    const err = [!d && 'department', !code && 'code', code && PROGS.some(x => x.code === code) && `a unique code (${code} is taken)`, progsOf(c).some(p => progBranch(p).toLowerCase() === (d || '').toLowerCase()) && `${d} already exists in ${c}`, !Object.values(cap).some(Boolean) && 'at least one seat'].filter(Boolean);
    if (err.length) { $('#npErr').innerHTML = `<div class="notice bad" style="margin-top:12px">${ic('alert', 14)}<div>Required: ${err.join(', ')}.</div></div>`; return; }
    const name = `${c} ${d}`;
    PROGS.push({ code, name, course: c, branch: d, dept: d, m: 1, cap, active: $('#npActive').classList.contains('on') });
    const inst = STRUCT.kids[0]; let dn = inst.kids.find(k => k.name === d);
    if (!dn) { dn = { name: d, lvl: 'Department', kids: [] }; inst.kids.push(dn); }
    dn.kids.push(prog(name));
    audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' 11:05', user: 'Anita Joseph', role: state.role, action: 'seats.department_add', record: code, detail: `${name} · ${QUOTAS.map(q => `${q} ${cap[q]}`).join(', ')}`, before: '—', after: `${Object.values(cap).reduce((x, y) => x + y, 0)} seats`, ip: '10.12.4.1' });
    closeModal(); toast(`${d} added to ${c}${isNew ? ' (new department)' : ''}`);
  };
}
document.addEventListener('change', e => {
  const t = e.target, d = t.dataset || {};
  const P = code => PROGS.find(x => x.code === code);
  if (d.smCap) {
    const [code, q] = d.smCap.split('|'), p = P(code), v = Math.max(0, Math.floor(+t.value || 0)), u = seatsUsed(code, q);
    if (v < u) { t.value = p.cap[q] || 0; return toast(`${p.name} · ${q} already has ${u} seats taken — capacity can't go below that`); }
    const was = p.cap[q] || 0; p.cap[q] = v; smRender();
    if (v !== was) toast(`${p.name} · ${q}: ${was} → ${v} seats`);
  }
  if (d.smCourse !== undefined) {
    const old = d.smCourse, v = t.value.trim();
    if (!v || (v !== old && courseList().includes(v))) { t.value = old; return toast(v ? `${v} already exists` : 'Course name can\'t be empty'); }
    progsOf(old).forEach(p => { const br = progBranch(p), single = p.name === old; p.course = v; p.branch = br; p.name = single ? v : `${v} ${br}`; students.filter(x => x.prog === p.code).forEach(x => { x.progName = p.name; }); });
    COURSES[COURSES.indexOf(old)] = v; smRender(); toast(`Course renamed to ${v}`);
  }
  if (d.smBranch) {
    const p = P(d.smBranch), v = t.value.trim(); if (!v) { t.value = progBranch(p); return; }
    const c = progCourse(p), single = p.name === c;
    p.course = c; p.branch = v; p.dept = v; if (!single) p.name = `${c} ${v}`;
    students.filter(x => x.prog === p.code).forEach(x => { x.progName = p.name; x.dept = v; }); toast(`Department renamed · ${p.name}`);
  }
});

/* ---------- Fees ---------- */
const FEE_TABS = [['heads', 'Fee heads'], ['templates', 'Fee templates'], ['schedules', 'Instalment schedules'], ['concessions', 'Concessions'], ['late', 'Late fee rules']];
const feeHeadRows = [
  ['TUI', 'Tuition fee', 'Non-refundable', 'Exempt (education)', 'Per year', true], ['ADM', 'Admission fee', 'Non-refundable', 'Exempt', 'One-time', true], ['CAU', 'Caution deposit', 'Refundable', 'Exempt', 'One-time', true],
  ['EXM', 'University exam fee', 'Non-refundable', 'Exempt', 'Per semester', true], ['APP', 'Application fee', 'Non-refundable', 'Exempt', 'One-time', true], ['BUS', 'Bus fee', 'Partly refundable', 'GST 18%', 'Per term', true],
  ['HST', 'Hostel fee', 'Partly refundable', 'Exempt', 'Per term', true], ['LIB', 'Library & lab fee', 'Non-refundable', 'Exempt', 'Per year', true], ['UNI', 'Uniform & ID card', 'Non-refundable', 'GST 5%', 'One-time', false],
].map(([code, name, refund, tax, freq, active]) => ({ code, name, refund, tax, freq, active: active ? 'Active' : 'Archived' }));
const templates = [];
PROGS.forEach(p => QUOTAS.forEach(q => { if (!p.cap[q]) return; const tui = Math.round(TUITION[q] * p.m / 100) * 100; templates.push({ code: `FT-26-${p.code}-${q.slice(0, 4).toUpperCase()}`, year: '2026–27', prog: p.name, quota: q, cat: 'All', ver: p.code === 'BT-CSE' && q === 'Management' ? 'v3' : q === 'NRI' ? 'v2' : 'v1', tui, total: tui + 18500, assigned: students.filter(s => s.prog === p.code && s.quota === q && s.fee).length, status: 'Active', updated: p.code === 'BT-CSE' && q === 'Management' ? '2026-11-03' : '2026-05-20' }); }));
PAGES.fees = PAGES['fees/heads'] = () => `<div class="fill">${admHead('fees', `<button class="btn primary act-write">${ic('plus', 14)}Add fee head</button>`)}
  <div class="content">${sheet({ cols: [{ key: 'code', label: 'Code', w: 70 }, { key: 'name', label: 'Fee head', w: 200 }, { key: 'refund', label: 'Refundable', w: 150, render: r => `<span class="tag" style="${r.refund === 'Refundable' ? 'background:var(--ok-bg);color:var(--ok)' : ''}">${r.refund}</span>` }, { key: 'tax', label: 'Tax code', w: 150 }, { key: 'freq', label: 'Frequency', w: 120 }, { key: 'active', label: 'Status', w: 110, render: r => chip(r.active) }], rows: feeHeadRows, onOpen: r => toast('Edit ' + r.name), tabs: sheetTabs('admset/fees', FEE_TABS, 'heads') })}</div></div>`;
PAGES['fees/templates'] = () => `<div class="fill">${admHead('fees', `<button class="btn act-write" data-action="bulk-fee">${ic('layers', 14)}Bulk assign to batch</button><button class="btn primary act-write">${ic('plus', 14)}New template</button>`)}
  <div class="content">${sheet({ cols: [{ key: 'code', label: 'Template', w: 190, render: r => `<span class="lnk" data-open>${r.code}</span>` }, { key: 'year', label: 'Year', w: 80 }, { key: 'prog', label: 'Programme', w: 190 }, { key: 'quota', label: 'Quota', w: 110 }, { key: 'cat', label: 'Category', w: 80 }, { key: 'ver', label: 'Version', w: 74, render: r => `<span class="chip plain">${r.ver}</span>` }, { key: 'tui', label: 'Tuition', w: 100, align: 'r', fmt: inr, sum: 'inr' }, { key: 'total', label: 'Year 1 total', w: 110, align: 'r', fmt: inr, sum: 'inr' }, { key: 'assigned', label: 'Students', w: 84, align: 'r', sum: 'n' }, { key: 'status', label: 'Status', w: 90, render: r => chip(r.status) }, { key: 'updated', label: 'Updated', w: 104, fmt: fd }], rows: templates, onOpen: openTemplate, tabs: sheetTabs('admset/fees', FEE_TABS, 'templates') })}</div></div>`;
function openTemplate(t) {
  openDrawer(`<div class="d-head"><div class="d-top"><div style="flex:1"><div class="d-title">${t.code}</div><div class="d-sub">${t.prog} · ${t.quota} · ${t.year} ${chip('Active')}<span class="chip plain">${t.ver}</span></div></div><button class="icon-btn" data-close-drawer>${ic('x')}</button></div><div class="d-tabs"><button class="d-tab on">Heads &amp; schedule</button></div></div>
  <div class="d-body">
    <div class="section-t">Fee heads</div>
    <table class="simple"><thead><tr><th>Head</th><th>Refundable</th><th>Instalment</th><th class="r">Amount</th></tr></thead><tbody>
    <tr><td>Tuition fee</td><td>No</td><td>40% · 30% · 30%</td><td class="r">${inr(t.tui)}</td></tr><tr><td>Admission fee</td><td>No</td><td>Instalment 1</td><td class="r">${inr(5000)}</td></tr><tr><td>Caution deposit</td><td>Yes</td><td>Instalment 1</td><td class="r">${inr(10000)}</td></tr><tr><td>University exam fee</td><td>No</td><td>Instalment 1</td><td class="r">${inr(3500)}</td></tr>
    </tbody><tfoot><tr><td colspan="3">Year 1 total</td><td class="r">${inr(t.total)}</td></tr></tfoot></table>
    <div class="section-t">Instalment schedule</div>
    <table class="simple"><thead><tr><th>Instalment</th><th>Due rule</th><th class="r">Share</th></tr></thead><tbody><tr><td>Instalment 1</td><td>At admission, after details are collected</td><td class="r">40%</td></tr><tr><td>Instalment 2</td><td>45 days after seat booking</td><td class="r">30%</td></tr><tr><td>Instalment 3</td><td>20 Jan 2027</td><td class="r">30%</td></tr></tbody></table>
    <div class="section-t">Version history</div>
    ${(t.ver === 'v3' ? [['v3', '03 Nov 2026', 'George Varghese', 'Exam fee ₹3,000 → ₹3,500', 'Active'], ['v2', '12 Jul 2026', 'George Varghese', 'Tuition revised per AICTE order', 'Superseded'], ['v1', '20 May 2026', 'Anita Joseph', 'Created', 'Superseded']] : [[t.ver, '20 May 2026', 'Anita Joseph', 'Created', 'Active']]).map(([v, d, u, n, st]) => `<div class="list-row"><span class="chip plain">${v}</span><div class="grow"><div class="t">${n}</div><div class="s">${u} · ${d}</div></div>${chip(st === 'Active' ? 'Active' : 'Archived')}</div>`).join('')}
    <div class="notice" style="margin-top:14px">${ic('lock', 16)}<div>${t.assigned} students hold this template on the version they were assigned. To move them to ${t.ver}, use bulk re-assign — overrides need approval.</div></div>
  </div><div class="d-foot"><button class="btn">${ic('copy', 14)}Clone</button><button class="btn primary act-write">Edit as new version</button></div>`);
}
PAGES['fees/schedules'] = () => `<div class="fill">${admHead('fees', `<button class="btn primary act-write">${ic('plus', 14)}New schedule</button>`)}
  <div class="content">${sheet({ cols: [{ key: 'n', label: 'Schedule', w: 210 }, { key: 'type', label: 'Type', w: 100 }, { key: 'parts', label: 'Instalments', w: 260 }, { key: 'rule', label: 'Due-date rule', w: 240 }, { key: 'used', label: 'Templates', w: 90, align: 'r' }], rows: [
    { n: 'Standard 3-part', type: 'Instalment', parts: 'At admission 40% · 30% · 30%', rule: 'At admission · booking + 45 days · 20 Jan', used: 16 },
    { n: 'MBA annual', type: 'Annual', parts: 'Booking ₹10,000 · Balance 100%', rule: 'Booking + 21 days', used: 3 },
    { n: 'M.Tech semester split', type: 'Semester', parts: 'Sem 1 50% · Sem 2 50%', rule: '1 Aug · 20 Jan', used: 2 },
    { n: 'Hostel termly', type: 'Term', parts: 'Term 1 · Term 2 · Term 3', rule: '10th of Jul, Nov, Mar', used: 1 },
    { n: 'Bus monthly', type: 'Monthly', parts: '10 × monthly', rule: '5th of every month', used: 1 }], onOpen: () => { }, tabs: sheetTabs('admset/fees', FEE_TABS, 'schedules') })}</div></div>`;
PAGES['fees/concessions'] = () => {
  const rows = students.filter(s => s.conc).map((s, i) => ({ ...s, type: pick(['Merit scholarship', 'Sibling concession', 'Management discretion', 'Staff ward']), basis: i % 3 ? 'Amount' : 'Percent', cst: i % 4 === 0 ? 'Awaiting approval' : 'Approved', appr: i % 4 === 0 ? '—' : 'Dr. Suma Rajan' }));
  return `<div class="fill">${admHead('fees', `<button class="btn primary act-write">${ic('plus', 14)}Grant concession</button>`)}
  <div class="content">${sheet({ cols: [{ key: 'adm', label: 'Admission no.', w: 128, render: r => `<span class="lnk" data-open>${r.adm}</span>` }, { key: 'name', label: 'Student', w: 170 }, { key: 'type', label: 'Concession', w: 170 }, { key: 'basis', label: 'Basis', w: 80 }, { key: 'conc', label: 'Amount', w: 100, align: 'r', fmt: inr, sum: 'inr' }, { key: 'officer', label: 'Requested by', w: 130 }, { key: 'appr', label: 'Approved by', w: 130 }, { key: 'cst', label: 'Status', w: 150, render: r => chip(r.cst) }], rows, onOpen: r => openStudent(r.id, 'fees'), tabs: sheetTabs('admset/fees', FEE_TABS, 'concessions') })}</div></div>`;
};
PAGES['fees/late'] = () => `<div class="fill">${admHead('fees', `<button class="btn primary act-write">${ic('plus', 14)}New rule</button>`)}
  <div class="content">${sheet({ cols: [{ key: 'n', label: 'Rule', w: 220 }, { key: 'type', label: 'Type', w: 100 }, { key: 'v', label: 'Value', w: 120 }, { key: 'g', label: 'Grace', w: 90 }, { key: 'cap', label: 'Cap', w: 100 }, { key: 'on', label: 'Applies to', w: 240 }, { key: 'st', label: 'Status', w: 90, render: r => chip(r.st) }], rows: [
    { n: 'Tuition late fee', type: 'Per day', v: '₹50 / day', g: '7 days', cap: '₹2,500', on: 'All B.Tech & M.Tech templates', st: 'Active' },
    { n: 'MBA late fee', type: 'Flat', v: '₹1,000', g: '10 days', cap: '—', on: 'MBA annual', st: 'Active' },
    { n: 'Hostel late fine', type: 'Per day', v: '₹25 / day', g: '5 days', cap: '₹1,000', on: 'Hostel termly', st: 'Active' }], onOpen: () => { }, tabs: sheetTabs('admset/fees', FEE_TABS, 'late'), search: false, exportBtn: false })}</div></div>`;
function bulkFee() {
  openModal(`${mHead('Bulk assign fees to a batch')}<div class="m-body">
  <div class="form-grid" style="grid-template-columns:1fr 1fr">
    <div class="field"><label>Batch</label><select class="input"><option>B.Tech CSE · 2026–30 · Management</option><option>B.Tech ECE · 2026–30 · Government</option></select></div>
    <div class="field"><label>Template</label><select class="input"><option>FT-26-BT-CSE-MANA v3 · ₹1,16,500</option></select></div>
  </div>
  <div class="section-t" style="margin-top:16px">Dry run</div>
  <table class="simple"><tbody><tr><td>Students in batch</td><td class="r">18</td></tr><tr><td>Will receive v3</td><td class="r">4</td></tr><tr><td>Already on v2 — unchanged</td><td class="r">14</td></tr><tr><td>Per-student overrides (need approval)</td><td class="r">2</td></tr></tbody></table>
  <div class="notice warn" style="margin-top:12px">${ic('alert', 16)}<div>2 overrides will go to an Admin for approval before they apply.</div></div>
  </div><div class="m-foot"><button class="btn" data-close-modal>Cancel</button><button class="btn primary" data-close-modal data-toast="Fees assigned to 4 students · 2 overrides sent for approval">Assign</button></div>`);
}

/* ---------- Payments ---------- */
const PAY_TABS = [['daybook', 'Recent payments'], ['students', 'Students'], ['refunds', 'Refunds']];
/* academic year: a record belongs to its student's intake year */
const AYS = ['2026–27', '2025–26', '2024–25'];
const ayOf = sid => sById(sid)?.ay || '2026–27';
const inAy = r => ayOf(r.sid ?? r.id) === state.ay;
const ayPick = () => `<label class="ay-pick">Academic year<select class="input" id="aySel">${AYS.map(y => `<option ${y === state.ay ? 'selected' : ''}>${y}</option>`).join('')}</select></label>`;
const admTabs = cur => sheetTabs('admissions', [['register', 'Register ' + state.ay], ['docs', 'Document checklist']], cur).replace(/<\/div>$/, ayPick() + '</div>');
const payTabs = (cur, withAy = true) => {
  const t = sheetTabs('payments', PAY_TABS.filter(([k]) => k === 'students' ? allowed('dues') : k === 'refunds' ? allowed('refunds') : true), cur);
  return withAy ? t.replace(/<\/div>$/, ayPick() + '</div>') : t;
};
const payCols = () => [
  { key: 'rcpt', label: 'Receipt no.', w: 140, render: r => `<span class="lnk" data-open>${r.rcpt}</span>` }, { key: 'date', label: 'Date', w: 104, fmt: fd },
  { key: 'sname', label: 'Student', w: 170 }, { key: 'sadm', label: 'Admission no.', w: 124 }, { key: 'mode', label: 'Mode', w: 110 },
  { key: 'ref', label: 'Reference', w: 170 }, { key: 'amt', label: 'Amount', w: 110, align: 'r', sum: 'inr', render: r => `<span style="${r.amt < 0 ? 'color:var(--bad)' : ''}">${inr(r.amt)}</span>` },
  { key: 'cashier', label: 'Recorded by', w: 120 }, { key: 'status', label: 'Status', w: 100, render: r => chip(r.status) }, { key: 'notify', label: 'SMS', w: 90, render: () => chip('Delivered') }];
const payRows = () => payments.filter(inAy).map(p => { const s = sById(p.sid); return { ...p, sname: s.name, sadm: s.adm, _strike: p.status === 'Reversed' }; }).sort((a, b) => b.date.localeCompare(a.date) || b.rcpt.localeCompare(a.rcpt));
PAGES.payments = PAGES['payments/daybook'] = () => {
  const modes = PAY_MODES, pr = payRows();
  const html = `<div class="fill">${pageHead('Payments', 'Recent payments, newest first. Every payment posts to the ledger, issues a numbered receipt and notifies the guardian.', `<button class="btn primary act-write" data-action="record-payment">${ic('plus', 14)}Record payment</button>`)}
  <div class="content">${duesKpis(false)}${sheet({ cols: payCols(), rows: pr, onOpen: r => { state.hlPay = r.id; location.hash = 'payments/student/' + r.sid; }, chips: fchip('all', 'All', pr.length, true) + modes.map(m => fchip(m, m, pr.filter(p => p.mode === m).length)).join(''), chipLabel: 'Mode', tabs: payTabs('daybook') })}</div></div>`;
  chipHandler = ids => { S.filter = ids.length ? r => ids.includes(r.mode) : null; renderSheet(); };
  return html;
};
PAGES['payments/counter'] = () => {
  const today = payments.filter(p => p.date >= addDays(TODAY, -1));
  const by = m => today.filter(p => p.mode === m).reduce((t, p) => t + p.amt, 0);
  const modes = ['Cash', 'UPI', 'Bank transfer', 'Cheque', 'DD'];
  return `<div class="fill">${pageHead('Payments', 'Close the counter at the end of the day and hand over cash to the next cashier. <span class="p1">P1</span>', `<button class="btn primary act-write" data-toast="Counter closed · handover note sent to George Varghese">${ic('lock', 14)}Close counter</button>`)}
  <div class="content" style="overflow:auto"><div class="grid-3">
    <div class="card span-2"><div class="card-h"><h3>Counter 1 · Joby Mathew · opened 09:00</h3><span class="muted">${fd(TODAY)}</span></div><div class="card-b">
      <table class="simple"><thead><tr><th>Mode</th><th class="r">Receipts</th><th class="r">System total</th><th class="r">Counted</th><th class="r">Difference</th></tr></thead><tbody>
      ${modes.map(m => `<tr><td>${m}</td><td class="r">${today.filter(p => p.mode === m).length}</td><td class="r">${inr(by(m))}</td><td class="r">${m === 'Cash' ? `<input class="input num" style="width:120px;height:28px;text-align:right" value="${by(m) - 500}">` : inr(by(m))}</td><td class="r" style="${m === 'Cash' ? 'color:var(--bad)' : ''}">${m === 'Cash' ? '− ₹500' : '₹0'}</td></tr>`).join('')}
      </tbody><tfoot><tr><td>Total</td><td class="r">${today.length}</td><td class="r">${inr(today.reduce((t, p) => t + p.amt, 0))}</td><td></td><td></td></tr></tfoot></table>
      <div class="notice warn" style="margin-top:12px">${ic('alert', 16)}<div>Cash short by ₹500. Add a note before closing — the difference will be logged.</div></div>
    </div></div>
    <div class="card"><div class="card-h"><h3>Cash denominations</h3></div><div class="card-b"><table class="simple"><tbody>${[[500, 38], [200, 12], [100, 22], [50, 9], [20, 6], [10, 4]].map(([d, n]) => `<tr><td>₹${d} ×</td><td><input class="input num" style="width:70px;height:26px" value="${n}"></td><td class="r">${inr(d * n)}</td></tr>`).join('')}</tbody></table>
      <div class="field" style="margin-top:12px"><label>Hand over to</label><select class="input"><option>Divya Suresh (evening counter)</option><option>George Varghese (Finance)</option></select></div></div></div>
  </div></div>${payTabs('counter', false)}</div>`;
};
/* ---------- Refunds ---------- */
PAGES['payments/refunds'] = PAGES.refunds = () => {
  const st = ['Submitted', 'Awaiting approval', 'Approved', 'Processing', 'Completed', 'Rejected', 'On hold'];
  const rows = refunds.filter(inAy).map(r => { const s = sById(r.sid); return { ...r, sname: s.name, sadm: s.adm, prog: s.progName }; });
  const html = `<div class="fill">${pageHead('Payments', 'Requests move through an approval chain before Finance can pay them out. Whoever approves a refund cannot also execute it.', `<button class="btn primary act-write" data-action="new-refund">${ic('plus', 14)}Raise refund</button>`)}
  <div class="content">${duesKpis(false)}${sheet({ cols: [
    { key: 'no', label: 'Refund no.', w: 130, render: r => `<span class="lnk" data-open>${r.no}</span>` }, { key: 'raised', label: 'Raised', w: 104, fmt: fd }, { key: 'sname', label: 'Student', w: 160 }, { key: 'sadm', label: 'Admission no.', w: 124 },
    { key: 'reason', label: 'Reason', w: 240 }, { key: 'paid', label: 'Paid', w: 96, align: 'r', fmt: inr }, { key: 'deduction', label: 'Deduction', w: 96, align: 'r', fmt: inr, sum: 'inr' }, { key: 'amount', label: 'Refund', w: 100, align: 'r', fmt: inr, sum: 'inr' },
    { key: 'mode', label: 'Approval mode', w: 170 }, { key: 'status', label: 'Status', w: 150, render: r => chip(r.status) }, { key: 'raisedBy', label: 'Raised by', w: 120 }], rows, onOpen: r => openRefund(r.id),
    chips: fchip('all', 'All', rows.length, true) + st.map(s => fchip(s, s, rows.filter(r => r.status === s).length)).join(''), tabs: payTabs('refunds') })}</div></div>`;
  chipHandler = ids => { S.filter = ids.length ? r => ids.includes(r.status) : null; renderSheet(); };
  return html;
};
function openRefund(id) {
  const r = refunds.find(x => x.id === id), s = sById(r.sid);
  const two = r.amount > 10000;
  const lv = (n, who, role, st, note) => `<div class="ch-item ${st}"><span class="ch-dot">${st === 'done' ? ic('check', 14) : st === 'no' ? ic('x', 14) : st === 'wait' ? ic('clock', 14) : n}</span><div><div>${who}</div><div class="faint" style="font-size:12px">${role}${note ? ' · ' + note : ''}</div></div><div>${st === 'done' ? chip('Approved') : st === 'wait' ? chip('Awaiting approval') : st === 'no' ? chip('Rejected') : '<span class="faint">Not started</span>'}</div></div>`;
  const after = ['Approved', 'Processing', 'Completed'].includes(r.status);
  const chain = [
    lv(1, 'Anita Joseph', 'Admin · approval', after ? 'done' : r.status === 'Rejected' ? 'no' : r.status === 'Awaiting approval' ? 'wait' : '', after ? fd(addDays(r.raised, 1)) : ''),
    lv(2, 'Finance · Joby Mathew', 'Execution — must differ from approvers', r.status === 'Completed' ? 'done' : r.status === 'Processing' ? 'wait' : '', r.status === 'Completed' ? 'NEFT ' + (r.no.slice(-4)) + '7781' : ''),
  ].join('');
  const canApprove = r.status === 'Awaiting approval' || r.status === 'Submitted' || r.status === 'On hold';
  openDrawer(`<div class="d-head"><div class="d-top"><div style="flex:1"><div class="d-title">${r.no}</div><div class="d-sub">${esc(s.name)} · ${s.adm} · ${chip(r.status)}</div></div><button class="icon-btn" data-close-drawer>${ic('x')}</button></div><div class="d-tabs"><button class="d-tab on">Request</button></div></div>
  <div class="d-body">
    <div class="kv"><div><span>Reason</span>${esc(r.reason)}</div><div><span>Raised by</span>${r.raisedBy} · ${fd(r.raised)}</div><div><span>Refundable heads</span>${r.heads}</div><div><span>Approval mode</span>${r.mode}</div><div><span>Seat booked by</span>${esc(s.guardian)} · ${s.relation || 'Guardian'}</div><div><span>Refund policy</span>${s.policy.ver} accepted ${fd(s.policy.at)}</div></div>
    <div class="section-t">Calculation</div>
    <table class="simple"><tbody><tr><td>Amount paid</td><td class="r">${inr(r.paid)}</td></tr><tr><td>${r.slab >= 0 ? `Deduction · policy ${s.policy.ver}: ${POLICY.slabs[r.slab][0].toLowerCase()}` : 'Deduction · none (excess payment)'}</td><td class="r" style="color:var(--bad)">− ${inr(r.deduction)}</td></tr></tbody><tfoot><tr><td>Refund payable</td><td class="r">${inr(r.amount)}</td></tr></tfoot></table>
    <div class="section-t">Approval chain · ${two ? '2 levels (above ₹10,000)' : '1 level'}</div>
    <div class="chain">${chain}</div>
    ${r.mode.startsWith('Physical') ? `<div class="section-t">Physical form</div><div class="check-row"><span class="dotico">${ic('hand', 14)}</span><div style="flex:1"><div>Signed refund form</div><div class="faint" style="font-size:12px">${after ? 'refund_form_' + r.no.slice(-4) + '.pdf · uploaded by Manoj Pillai' : 'Print the form, get it signed, then upload the scan to confirm the signature'}</div></div>${after ? chip('Verified') : '<button class="btn sm act-write">' + ic('upload', 13) + 'Upload scan</button>'}</div>` : ''}
    <div class="section-t">Payout</div>
    <div class="kv"><div><span>Pay to</span>${esc(s.guardian)}</div><div><span>Bank account</span><span class="masked">XXXXXXXX${s.mobile.slice(-4)}</span> · SBIN0070${s.mobile.slice(-3)}</div></div>
  </div>
  <div class="d-foot">${canApprove ? `<button class="btn act-write" data-refund-act="On hold" data-rid="${id}">Hold</button><button class="btn danger act-write" data-refund-act="Rejected" data-rid="${id}">Reject</button><button class="btn primary act-write" data-refund-act="Approved" data-rid="${id}">${ic('check', 14)}Approve</button>` :
      r.status === 'Approved' ? `<span class="faint" style="margin-right:auto">Approved by Manoj Pillai — they cannot execute it.</span><button class="btn primary act-write" data-refund-act="Processing" data-rid="${id}">Execute refund</button>` :
        r.status === 'Processing' ? `<button class="btn primary act-write" data-refund-act="Completed" data-rid="${id}">Mark completed</button>` : `<button class="btn" data-close-drawer>Close</button>`}</div>`);
}

/* ---------- Documents ---------- */
const DOCS = [['Admission form', 'P0', 'Admissions'], ['Fee structure slip', 'P0', 'Fees'], ['Fee demand note', 'P0', 'Fees'], ['Fee receipt', 'P0', 'Payments'], ['Acknowledgement', 'P0', 'Admissions'], ['Refund form', 'P0', 'Refunds'], ['Bonafide certificate', 'P1', 'Students'], ['Transfer certificate', 'P1', 'Students'], ['Conduct certificate', 'P1', 'Students'], ['ID card', 'P1', 'Students']];
PAGES.documents = () => `<div class="fill">${admHead('documents', `<button class="btn act-write">${ic('layers', 14)}Bulk generate</button><button class="btn primary act-write">${ic('plus', 14)}New template</button>`)}
  <div class="content" style="overflow:auto;display:block">
  <div class="card" style="margin-bottom:16px"><div class="card-h"><h3>Required documents</h3><button class="btn sm act-write" style="margin-left:auto">${ic('plus', 12)}Add document</button></div><div class="card-b"><table class="simple"><thead><tr><th>Document</th><th>Required for</th><th>Collected at</th><th>Verify</th><th style="text-align:center">Mandatory</th></tr></thead><tbody>
  ${[['SSLC certificate', 'All programmes', 1], ['Plus Two mark sheet', 'B.Tech, Lateral entry', 1], ['Transfer certificate (TC)', 'All programmes', 1], ['Community certificate', 'SC, ST, OBC, OEC, EWS', 1], ['Degree certificate', 'M.Tech, MBA', 1], ['GATE scorecard', 'M.Tech', 1], ['KEAM / KMAT score', 'B.Tech, MBA', 0], ['Passport & visa', 'NRI quota', 1], ['Passport photo', 'All programmes', 1], ['Aadhaar', 'All programmes', 0]].map(([d, f, m]) => `<tr><td>${d}</td><td class="muted">${f}</td><td><span class="tag">Collect details</span></td><td class="muted">At the desk</td><td style="text-align:center"><button class="switch ${m ? 'on' : ''}"></button></td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="card-h" style="padding:6px 2px 12px"><h3>Document templates</h3></div>
  <div class="doc-cards">${DOCS.map(([n, p, m]) => `<div class="doc-card" data-doc-edit="${n}"><div class="doc-thumb"><div class="pg"><i class="h"></i><i></i><i style="width:80%"></i><i></i><i style="width:60%"></i><i></i><i style="width:70%"></i></div></div><div class="doc-meta"><div>${n}${p === 'P1' ? '<span class="p1">P1</span>' : ''}</div><div class="faint" style="font-size:12px;margin-top:3px">${m} · Thejus letterhead · edited 2 Oct</div></div></div>`).join('')}</div></div></div>`;
function docEditor(name) {
  const p = payments[payments.length - 3];
  const fields = ['{student.name}', '{student.admission_no}', '{programme.name}', '{quota}', '{guardian.name}', '{receipt.no}', '{receipt.date}', '{payment.amount}', '{payment.amount_words}', '{payment.mode}', '{balance.after}', '{institution.name}', '{signature.cashier}', '{qr.verify}'];
  openModal(`${mHead('Template · ' + name)}<div class="m-body" style="display:grid;grid-template-columns:200px 1fr;gap:18px;background:var(--bg)">
    <div><div class="section-t">Merge fields</div><div class="merge-list">${fields.map(f => `<span class="token">${f}</span>`).join('')}</div>
    <div class="section-t">Settings</div><div class="field"><label>Institution</label><select class="input"><option>Thejus Engineering College</option></select></div><div class="field" style="margin-top:8px"><label>Paper</label><select class="input"><option>A4 portrait</option><option>A5 (receipt)</option></select></div>
    <div class="check-row" style="margin-top:6px"><span style="flex:1">QR verification</span><button class="switch on"></button></div></div>
    <div>${name === 'Fee receipt' ? receiptPaper(p).replace(/(TEC\/RCP\/26\/\d+)/, '<span class="mf">{receipt.no}</span>').replace(esc(sById(p.sid).name), '<span class="mf">{student.name}</span>') : `<div class="paper"><div class="lh"><span class="logo">T</span><div style="flex:1"><h4>Thejus Engineering College</h4><div class="faint">Vellarakkad, Thrissur, Kerala 680584</div></div><div class="qr"></div></div><div style="text-align:center;font-size:14px;color:var(--navy-800);margin:6px 0 16px">${name.toUpperCase()}</div><p>This is to record that <span class="mf">{student.name}</span>, admission no. <span class="mf">{student.admission_no}</span>, has been admitted to <span class="mf">{programme.name}</span> under the <span class="mf">{quota}</span> quota for the academic year 2026–27.</p><p>Guardian: <span class="mf">{guardian.name}</span></p><div style="height:70px"></div><div style="display:flex;justify-content:space-between"><div class="faint">Date: <span class="mf">{today}</span></div><div style="text-align:center"><span class="mf">{signature.principal}</span><div class="faint">Principal</div></div></div></div>`}</div>
  </div><div class="m-foot"><span class="faint" style="margin-right:auto">Version 6 · last published 2 Oct 2026 by Anita Joseph</span><button class="btn">${ic('eye', 14)}Preview with student</button><button class="btn primary" data-close-modal data-toast="Template published · version 7">Publish</button></div>`, true);
}

/* ---------- Notifications ---------- */
const NOTE_TABS = [['campaigns', 'Campaigns'], ['events', 'Events & channels'], ['log', 'Delivery log'], ['templates', 'Templates']];

/* ---------- Messages → Campaigns: every campaign run ---------- */
const CAMP_AUD = {
  overdue: ['Guardians with overdue fees', () => students.filter(s => s.overdue > 0)],
  due7: ['Instalment due in the next 7 days', () => students.filter(s => OCCUPY.includes(s.status) && s.nextDue && s.nextDue >= TODAY && s.nextDue <= addDays(TODAY, 7))],
  docs: ['Documents still pending', () => students.filter(s => OCCUPY.includes(s.status) && Object.values(s.docs).includes('Pending'))],
  details: ['Seat booked · details pending', () => students.filter(s => s.status === 'Seat booked')],
  all: ['All active admissions 2026–27', () => students.filter(s => OCCUPY.includes(s.status))],
};
const CAMP_TPL = { 'Fee reminder': 'FEE_DUE_EN + ML', 'Overdue reminder': 'FEE_OVERDUE_EN + ML', 'Document reminder': 'DOC_PENDING_EN', 'Announcement': 'ANNOUNCE_EN + ML', 'Fee slip': 'FEE_SLIP_EN' };
const CAMPAIGNS = [
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
const campDel = c => { const sent = campSent(c); return sent ? Math.round((sent - c.failed) / sent * 1000) / 10 : null; };
/* Messages: the same KPI row on every tab */
function msgKpis() {
  const done = CAMPAIGNS.filter(c => campSent(c)), month = done.filter(c => c.at.startsWith('2026-11'));
  const sent = done.reduce((t, c) => t + campSent(c), 0), failed = done.reduce((t, c) => t + c.failed, 0);
  return `<div class="kpis camp-kpis">
    <div class="kpi"><div class="k-l">Campaigns this month</div><div class="k-v">${month.length}</div><div class="k-s">${CAMPAIGNS.filter(c => c.status === 'Scheduled').length} scheduled · ${CAMPAIGNS.filter(c => c.status === 'Draft').length} draft</div></div>
    <div class="kpi"><div class="k-l">Messages sent</div><div class="k-v">${sent.toLocaleString('en-IN')}</div><div class="k-s">across ${done.length} runs</div></div>
    <div class="kpi"><div class="k-l">Delivered</div><div class="k-v" style="color:var(--ok)">${sent ? (Math.round((sent - failed) / sent * 1000) / 10) : 0}%</div><div class="k-s">SMS, WhatsApp and email</div></div>
    <div class="kpi"><div class="k-l">Failed</div><div class="k-v">${failed}</div><div class="k-s">retried automatically once</div></div>
  </div>`;
}
PAGES.notifications = PAGES['notifications/campaigns'] = () => {
  const done = CAMPAIGNS.filter(c => campSent(c)), month = done.filter(c => c.at.startsWith('2026-11'));
  const sent = done.reduce((t, c) => t + campSent(c), 0), failed = done.reduce((t, c) => t + c.failed, 0);
  const rows = [...CAMPAIGNS].sort((a, b) => (b.at === '—' ? '9' : b.at).localeCompare(a.at === '—' ? '9' : a.at));
  const st = ['Completed', 'Running', 'Scheduled', 'Partly failed', 'Draft'];
  const html = `<div class="fill">${pageHead('Messages', '', `<button class="btn primary act-write" data-action="new-campaign">${ic('plus', 14)}New campaign</button>`)}
  <div class="content">${msgKpis()}
  ${sheet({ cols: [
    { key: 'at', label: 'Run date', w: 132, render: r => r.at === '—' ? '<span class="faint">Not sent</span>' : fd(r.at.slice(0, 10)) + ' <span class="faint">' + r.at.slice(11) + '</span>' },
    { key: 'name', label: 'Campaign', w: 250, render: r => `<span class="lnk" data-open>${esc(r.name)}</span>` },
    { key: 'type', label: 'Type', w: 140 },
    { key: 'trigger', label: 'Trigger', w: 100 },
    { key: 'ch', label: 'Channels', w: 190, render: r => r.ch.map(c => `<span class="tag">${c}</span>`).join(' '), text: r => r.ch.join(' ') },
    { key: 'aud', label: 'Audience', w: 230, render: r => esc(CAMP_AUD[r.aud][0]), text: r => CAMP_AUD[r.aud][0] },
    { key: 'n', label: 'Recipients', w: 96, align: 'r', sum: 'num' },
    { key: 'sent', label: 'Messages', w: 96, align: 'r', render: r => campSent(r) ? campSent(r).toLocaleString('en-IN') : '<span class="faint">—</span>' },
    { key: 'del', label: 'Delivered', w: 96, align: 'r', render: r => campDel(r) == null ? '<span class="faint">—</span>' : `<span style="color:${campDel(r) < 95 ? 'var(--warn)' : 'var(--ok)'}">${campDel(r)}%</span>` },
    { key: 'failed', label: 'Failed', w: 76, align: 'r', render: r => r.failed ? `<span class="neg">${r.failed}</span>` : '<span class="faint">0</span>' },
    { key: 'status', label: 'Status', w: 120, render: r => chip(r.status) },
    { key: 'by', label: 'Run by', w: 140 }],
    rows, onOpen: r => openCampaign(r.id),
    chips: fchip('all', 'All', rows.length, true) + st.map(x => fchip(x, x, rows.filter(c => c.status === x).length)).join(''),
    tabs: sheetTabs('notifications', NOTE_TABS, 'campaigns') })}</div></div>`;
  chipHandler = ids => { S.filter = ids.length ? r => ids.includes(r.status) : null; renderSheet(); };
  return html;
};
function openCampaign(id) {
  const c = CAMPAIGNS.find(x => x.id === id), people = CAMP_AUD[c.aud][1]().slice(0, 8), sent = campSent(c);
  const per = c.ch.map((ch, i) => { const f = Math.round(c.failed * (i === 0 ? .6 : .4 / Math.max(1, c.ch.length - 1))); return [ch, sent ? c.n : 0, sent ? c.n - f : 0, sent ? f : 0]; });
  openModal(`${mHead(esc(c.name) + ' ' + chip(c.status))}<div class="m-body">
    <div class="kv"><div><span>Type</span>${c.type}</div><div><span>Trigger</span>${c.trigger}${c.trigger === 'Automatic' ? ' · from Events & channels' : ''}</div><div><span>Audience</span>${esc(CAMP_AUD[c.aud][0])}</div><div><span>Template</span>${c.tpl}</div><div><span>${c.status === 'Scheduled' ? 'Scheduled for' : 'Run'}</span>${c.at === '—' ? 'Not sent' : fd(c.at.slice(0, 10)) + ' · ' + c.at.slice(11)}</div><div><span>Run by</span>${esc(c.by)}</div></div>
    <div class="section-t">Delivery by channel</div>
    <table class="simple"><thead><tr><th>Channel</th><th class="r">Sent</th><th class="r">Delivered</th><th class="r">Failed</th></tr></thead><tbody>${per.map(([ch, a, d, f]) => `<tr><td>${ch}</td><td class="r">${a || '—'}</td><td class="r">${a ? d : '—'}</td><td class="r">${f ? `<span class="neg">${f}</span>` : (a ? 0 : '—')}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td><td class="r">${sent || '—'}</td><td class="r">${sent ? sent - c.failed : '—'}</td><td class="r">${sent ? c.failed : '—'}</td></tr></tfoot></table>
    <div class="section-t">Recipients · first ${people.length} of ${c.n}</div>
    ${people.map(s => `<div class="list-row" style="cursor:pointer" data-student="${s.id}"><span class="grow"><span class="t">${esc(s.guardian)}</span> <span class="faint">· for ${esc(s.name)} · ${s.adm}</span></span><span class="faint">+91 ${s.gmobile || s.mobile}</span></div>`).join('') || '<div class="empty">No one matches this audience today.</div>'}
  </div>
  <div class="m-foot">${c.failed && sent ? `<button class="btn" data-close-modal data-toast="Retrying ${c.failed} failed messages">${ic('replay', 14)}Retry failed</button>` : ''}<button class="btn" data-close-modal data-toast="Campaign copied as a draft">${ic('copy', 14)}Duplicate</button><button class="btn primary act-write" data-close-modal data-toast="${esc(c.name)} queued · ${c.n} recipients">${ic('send', 14)}Run again</button></div>`, true);
}
function newCampaignModal() {
  openModal(`${mHead('New campaign')}<div class="m-body"><form id="cmpForm" autocomplete="off">
    <div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <div class="field" style="grid-column:1/-1"><label>Campaign name <span class="req">*</span></label><input class="input" id="cmpName" placeholder="e.g. Orientation day reminder"></div>
      <div class="field"><label>Type</label><select class="input" id="cmpType">${Object.keys(CAMP_TPL).map(t => `<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Audience</label><select class="input" id="cmpAud">${Object.entries(CAMP_AUD).map(([k, [l, f]]) => `<option value="${k}">${l} · ${f().length}</option>`).join('')}</select></div>
      <div class="field" style="grid-column:1/-1"><label>Channels <span class="req">*</span></label><div style="display:flex;gap:16px">${['SMS', 'WhatsApp', 'Email'].map((c, i) => `<label class="doc-check"><input type="checkbox" name="cmpCh" value="${c}" ${i < 2 ? 'checked' : ''}><span>${c}</span></label>`).join('')}</div></div>
      <div class="field"><label>When</label><select class="input" id="cmpWhen"><option value="now">Send now</option><option value="later">Schedule</option></select></div>
      <div class="field hidden" id="cmpAtF"><label>Date and time</label><input class="input" id="cmpAt" type="datetime-local" value="${addDays(TODAY, 1)}T09:00"></div>
    </div><div id="cmpErr"></div></form></div>
    <div class="m-foot"><button class="btn" data-close-modal>Cancel</button><button class="btn" id="cmpDraft">Save draft</button><button class="btn primary" id="cmpGo">${ic('send', 14)}Send</button></div>`);
  $('#cmpWhen').onchange = e => { $('#cmpAtF').classList.toggle('hidden', e.target.value !== 'later'); $('#cmpGo').innerHTML = `${ic('send', 14)}${e.target.value === 'later' ? 'Schedule' : 'Send'}`; };
  const save = draft => {
    const name = $('#cmpName').value.trim(), ch = $$('[name="cmpCh"]:checked').map(x => x.value), aud = $('#cmpAud').value, type = $('#cmpType').value, later = $('#cmpWhen').value === 'later';
    if (!name || !ch.length) { $('#cmpErr').innerHTML = `<div class="notice bad" style="margin-top:12px">${ic('alert', 14)}<div>Required: ${[!name && 'campaign name', !ch.length && 'at least one channel'].filter(Boolean).join(', ')}.</div></div>`; return; }
    const n = CAMP_AUD[aud][1]().length, at = draft ? '—' : later ? $('#cmpAt').value.replace('T', ' ') : TODAY + ' ' + new Date().toTimeString().slice(0, 5);
    CAMPAIGNS.unshift({ id: 'c' + Date.now(), name, type, trigger: 'Manual', ch, aud, n, at, by: 'Anita Joseph', status: draft ? 'Draft' : later ? 'Scheduled' : 'Running', failed: 0, tpl: CAMP_TPL[type] });
    closeModal(); location.hash === '#notifications/campaigns' ? route() : (location.hash = 'notifications/campaigns');
    toast(draft ? 'Campaign saved as draft' : later ? `Scheduled · ${n} recipients` : `Sending to ${n} recipients on ${ch.join(', ')}`);
  };
  $('#cmpGo').onclick = () => save(false); $('#cmpDraft').onclick = () => save(true);
}
PAGES['notifications/events'] = () => {
  const ev = [['Seat booked', 1, 1, 1], ['Payment received', 1, 1, 1], ['Instalment due (3 days before)', 1, 1, 0], ['Instalment overdue', 1, 1, 1], ['Refund status changed', 1, 0, 1], ['Document ready', 0, 1, 1], ['Admission cancelled', 1, 0, 1]];
  return `<div class="fill">${pageHead('Messages', 'Pick a channel for each event. Templates are per language and use your own sender IDs and DLT template IDs.', `<button class="btn">${ic('clock', 14)}Quiet hours 21:00–08:00</button>`)}
  <div class="content" style="overflow:auto">${msgKpis()}<div class="grid-3"><div class="card span-2"><table class="perm"><thead><tr><th>Event</th><th>SMS</th><th>WhatsApp <span class="p1">P1</span></th><th>Email</th><th>Languages</th><th>Reminder</th></tr></thead><tbody>
  ${ev.map(([e, a, b, c]) => `<tr><td>${e}</td>${[a, b, c].map(v => `<td><button class="switch ${v ? 'on' : ''}" data-toggle></button></td>`).join('')}<td><span class="tag">EN</span> <span class="tag">ML</span></td><td class="faint">${e.includes('due') ? '3 days before' : e.includes('overdue') ? 'Every 5 days' : '—'}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="card"><div class="card-h"><h3>Credits &amp; delivery</h3></div><div class="card-b">
    <div class="usage-row"><span>SMS credits</span><span class="num">18,240</span></div><div class="meter"><i style="width:46%"></i></div>
    <div class="usage-row"><span>WhatsApp credits</span><span class="num">4,120</span></div><div class="meter"><i style="width:21%;background:#E37400"></i></div>
    <div class="notice warn" style="margin-top:12px">${ic('alert', 16)}<div>WhatsApp credits will run out in about 9 days at the current rate.</div></div>
    <div class="list-row" style="margin-top:8px"><span class="grow">Sent this month</span><span class="num">6,402</span></div>
    <div class="list-row"><span class="grow">Delivered</span><span class="num" style="color:var(--ok)">98.7%</span></div>
    <div class="list-row"><span class="grow">Failed, retried</span><span class="num">61</span></div>
    <button class="btn primary" style="margin-top:12px;width:100%;justify-content:center">Top up credits</button>
  </div></div></div></div>${sheetTabs('notifications', NOTE_TABS, 'events')}</div>`;
};
PAGES['notifications/log'] = () => {
  const rows = payments.slice(-60).reverse().map((p, i) => { const s = sById(p.sid); return { at: p.date, to: '+91 ' + s.mobile, name: s.guardian, ev: 'Payment received', ch: i % 3 === 0 ? 'WhatsApp' : 'SMS', tpl: 'PAY_RCVD_EN', st: i % 23 === 7 ? 'Failed' : i < 2 ? 'Queued' : 'Delivered', ref: p.rcpt }; });
  return `<div class="fill">${pageHead('Messages', 'Every message with its delivery status. Sending is idempotent, so a retry never sends the same message twice.')}
  <div class="content">${msgKpis()}${sheet({ cols: [{ key: 'at', label: 'Date', w: 104, fmt: fd }, { key: 'name', label: 'Recipient', w: 160 }, { key: 'to', label: 'Number', w: 130 }, { key: 'ev', label: 'Event', w: 150 }, { key: 'ch', label: 'Channel', w: 96 }, { key: 'tpl', label: 'Template', w: 120 }, { key: 'ref', label: 'Related', w: 140 }, { key: 'st', label: 'Status', w: 100, render: r => chip(r.st) }], rows, onOpen: () => { }, tabs: sheetTabs('notifications', NOTE_TABS, 'log') })}</div></div>`;
};
PAGES['notifications/templates'] = () => `<div class="fill">${pageHead('Messages', 'One message template per event, channel and language.', `<button class="btn primary act-write">${ic('plus', 14)}New template</button>`)}
  <div class="content">${msgKpis()}${sheet({ cols: [{ key: 'c', label: 'Code', w: 140 }, { key: 'e', label: 'Event', w: 160 }, { key: 'ch', label: 'Channel', w: 90 }, { key: 'l', label: 'Lang', w: 60 }, { key: 'dlt', label: 'DLT template ID', w: 160 }, { key: 'b', label: 'Body', w: 420 }], rows: [
    { c: 'SEAT_BKD_EN', e: 'Seat booked', ch: 'SMS', l: 'EN', dlt: '1107169xxxx2231', b: 'Dear {guardian}, seat booked for {student} in {programme}. Adm no {adm_no}. -THEJUS' },
    { c: 'PAY_RCVD_EN', e: 'Payment received', ch: 'SMS', l: 'EN', dlt: '1107169xxxx2240', b: 'Received Rs {amount} for {student}. Receipt {receipt_no}. Balance Rs {balance}. -THEJUS' },
    { c: 'PAY_RCVD_ML', e: 'Payment received', ch: 'WhatsApp', l: 'ML', dlt: '—', b: '{student} ന്റെ ഫീസ് Rs {amount} ലഭിച്ചു. രസീത് {receipt_no}.' },
    { c: 'DUE_SOON_EN', e: 'Instalment due', ch: 'SMS', l: 'EN', dlt: '1107169xxxx2255', b: 'Reminder: Rs {amount} due on {due_date} for {student}. Pay: {link} -THEJUS' },
    { c: 'OVERDUE_EN', e: 'Instalment overdue', ch: 'Email', l: 'EN', dlt: '—', b: 'Fee overdue for {student}: Rs {amount} since {due_date}…' },
    { c: 'RFD_STATUS_EN', e: 'Refund status', ch: 'SMS', l: 'EN', dlt: '1107169xxxx2290', b: 'Refund {refund_no} for {student} is now {status}. -THEJUS' }], onOpen: () => { }, tabs: sheetTabs('notifications', NOTE_TABS, 'templates') })}</div></div>`;

/* ---------- Reports ---------- */
const REPORTS = {
  Admissions: ['Daily admission register', 'Admissions by programme & branch', 'Admissions by quota & category', 'Seat availability summary', 'Staff performance', 'Cancellations & withdrawals'],
  'Fees & collections': ['Fee collection register', 'Mode-wise collection summary', 'Assessed vs collected', 'Outstanding dues by student', 'Overdue instalments ageing', 'Concessions & scholarships granted'],
  'Payments & refunds': ['Day book', 'Receipt cancellation & reversal register', 'Cashier-wise collection', 'Refund register', 'Refunds pending approval', 'Caution deposit liability'],
};
/* ---------- Reports & analytics: two sections ---------- */
const REP_TABS = [['analytics', 'Analytics'], ['list', 'Reports']];
const repTabs = cur => `<div class="sheet-tabs sv-tabs">${REP_TABS.map(([k, l]) => `<a class="sheet-tab ${k === cur ? 'on' : ''}" href="#reports/${k}">${l}</a>`).join('')}</div>`;
PAGES.reports = PAGES['reports/analytics'] = () => {
  const yr = students.filter(inAy), occ = yr.filter(s => OCCUPY.includes(s.status));
  const progs = PROGS.map(p => { const a = occ.filter(s => s.prog === p.code); const as = a.reduce((t, s) => t + s.net, 0), pd = a.reduce((t, s) => t + s.paid, 0); return { p, n: a.length, as, pd, pct: as ? Math.round(pd / as * 100) : 0 }; }).filter(r => r.n);
  const totA = progs.reduce((t, r) => t + r.as, 0), totP = progs.reduce((t, r) => t + r.pd, 0);
  const byStatus = STATUSES.map(st => [st, yr.filter(s => s.status === st).length]), maxS = Math.max(1, ...byStatus.map(x => x[1]));
  const byQuota = QUOTAS.map(q => [q, occ.filter(s => s.quota === q).length]), maxQ = Math.max(1, ...byQuota.map(x => x[1]));
  const bar = (v, max, color) => `<span class="track"><i style="width:${v / max * 100}%;background:${color}"></i></span>`;
  return `<div>${pageHead('Reports & analytics', '')}
  <div class="content">${repTabs('analytics')}
    <div class="rep-h">Seat occupancy · ${state.ay}</div>${seatOccupancy()}
    <div class="grid-2 rep-grid">
      <div class="card"><div class="card-h"><h3>Fee collection by programme</h3><span class="muted num">${inrS(totP)} of ${inrS(totA)} · ${totA ? Math.round(totP / totA * 100) : 0}%</span></div><div class="card-b">
        ${progs.map(r => `<div class="hbar"><span class="lbl">${esc(r.p.name)}</span>${bar(r.pd, r.as || 1, '#0A3C6E')}<span class="val">${r.pct}% <span class="faint">· ${inrS(r.pd)}</span></span></div>`).join('')}
      </div></div>
      <div class="card"><div class="card-h"><h3>Admissions by status</h3><span class="muted num">${yr.length} admissions</span></div><div class="card-b">
        ${byStatus.map(([st, n]) => `<div class="hbar" data-go="admissions" data-preset='{"status":"${st}"}' style="cursor:pointer"><span class="lbl">${chip(st)}</span>${bar(n, maxS, st === 'Cancelled' || st === 'Withdrawn' ? '#D4D4D4' : '#1783C1')}<span class="val">${n} <span class="faint">· ${yr.length ? Math.round(n / yr.length * 100) : 0}%</span></span></div>`).join('')}
        <div class="rep-sub">Seats filled by quota</div>
        ${byQuota.map(([q, n]) => `<div class="hbar"><span class="lbl">${q}</span>${bar(n, maxQ, '#0A3C6E')}<span class="val">${n}</span></div>`).join('')}
      </div></div>
    </div>
  </div></div>`;
};
PAGES['reports/list'] = () => `<div>${pageHead('Reports & analytics', '')}
  <div class="content">${repTabs('list')}
  <p class="muted rep-note">The standard reports, filtered to your role. Large exports run in the background and you get a download link.</p>
  <div class="grid-3">${Object.entries(REPORTS).map(([g, list]) => `<div class="card"><div class="card-h"><h3>${g}</h3><span class="muted">${list.length}</span></div><div class="card-b">${list.map(r => `<div class="list-row" style="cursor:pointer" data-report="${r}"><span class="dotico">${ic('sheet', 14)}</span><span class="grow t">${r}</span><button class="icon-btn" title="Export">${ic('download', 14)}</button></div>`).join('')}</div></div>`).join('')}</div>
  <div class="card" style="margin-top:16px"><div class="card-h"><h3>Background exports</h3></div><div class="card-b">
  ${[['Fee collection register · Apr–Oct 2026', 'Excel · 14,882 rows', 'Running'], ['Outstanding dues by student', 'PDF · 196 students', 'Ready'], ['Daily admission register · Oct', 'CSV · 512 rows', 'Ready']].map(([n, m, s]) => `<div class="list-row"><span class="dotico">${ic('download', 14)}</span><div class="grow"><div class="t">${n}</div><div class="s">${m} · requested by Anita Joseph</div></div>${chip(s)}${s === 'Ready' ? '<button class="btn sm">Download</button>' : ''}</div>`).join('')}
  </div></div></div></div>`;
function openReport(name) {
  const rows = PROGS.map(p => { const a = students.filter(s => s.prog === p.code && s.fee); const as = a.reduce((t, s) => t + s.net, 0), pd = a.reduce((t, s) => t + s.paid, 0); return { p: p.name, n: a.length, as, pd, bal: as - pd, od: a.reduce((t, s) => t + s.overdue, 0), pct: as ? Math.round(pd / as * 100) + '%' : '—' }; });
  openModal(`${mHead(name)}<div class="m-body"><div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><select class="input" style="width:auto"><option>Thejus Engineering College</option></select><select class="input" style="width:auto"><option>2026–27</option></select><input class="input" type="date" value="2026-06-01" style="width:auto"><input class="input" type="date" value="${TODAY}" style="width:auto"></div>
  <table class="simple"><thead><tr><th>Programme</th><th class="r">Students</th><th class="r">Assessed</th><th class="r">Collected</th><th class="r">Balance</th><th class="r">Overdue</th><th class="r">%</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.p}</td><td class="r">${r.n}</td><td class="r">${inr(r.as)}</td><td class="r">${inr(r.pd)}</td><td class="r">${inr(r.bal)}</td><td class="r" style="color:var(--bad)">${inr(r.od)}</td><td class="r">${r.pct}</td></tr>`).join('')}</tbody>
  <tfoot><tr><td>Total</td><td class="r">${rows.reduce((t, r) => t + r.n, 0)}</td><td class="r">${inr(rows.reduce((t, r) => t + r.as, 0))}</td><td class="r">${inr(rows.reduce((t, r) => t + r.pd, 0))}</td><td class="r">${inr(rows.reduce((t, r) => t + r.bal, 0))}</td><td class="r">${inr(rows.reduce((t, r) => t + r.od, 0))}</td><td></td></tr></tfoot></table></div>
  <div class="m-foot"><button class="btn">Excel</button><button class="btn">CSV</button><button class="btn primary">${ic('download', 14)}PDF</button></div>`, true);
}

/* ---------- Audit ---------- */
PAGES.audit = () => {
  const html = `<div class="fill">${pageHead('Audit log', 'An append-only record of every change, approval, export, login and permission change. Entries can never be edited.')}
  <div class="content">${sheet({ cols: [{ key: 'at', label: 'Timestamp', w: 140 }, { key: 'user', label: 'User', w: 170 }, { key: 'role', label: 'Role', w: 150 }, { key: 'action', label: 'Action', w: 140, render: r => `<span class="tag">${r.action}</span>` }, { key: 'record', label: 'Record', w: 160 }, { key: 'detail', label: 'Detail', w: 280 }, { key: 'before', label: 'Before', w: 120 }, { key: 'after', label: 'After', w: 130 }, { key: 'ip', label: 'IP', w: 110 }], rows: audit, onOpen: openAudit, search: false })}</div></div>`;
  return html;
};
function openAudit(a) {
  openModal(`${mHead('Audit event')}<div class="m-body"><div class="kv"><div><span>When</span>${a.at}</div><div><span>Who</span>${esc(a.user)} · ${a.role}</div><div><span>Action</span><span class="tag">${a.action}</span></div><div><span>Record</span>${esc(a.record)}</div><div><span>IP</span>${a.ip}</div></div>
  <div class="section-t">Change</div><div class="grid-2"><div class="notice bad" style="display:block"><div class="faint" style="font-size:11px">Before</div>${esc(a.before)}</div><div class="notice ok" style="display:block"><div class="faint" style="font-size:11px">After</div>${esc(a.after)}</div></div><p class="muted">${esc(a.detail)}</p></div>`);
}

/* ---------- Settings ---------- */
const SET = [['organisation', 'Organisation'], ['users', 'Users'], ['roles', 'Roles & permissions'], ['branding', 'Branding'], ['integrations', 'Integrations']];
function settingsPage(sub) {
  const body = SETTINGS[sub] ? SETTINGS[sub]() : '';
  return settingsShell('settings/' + sub, setTitle(SET.find(x => x[0] === sub)[1]) + body);
}
const SETTINGS = {};
PAGES['admset/form'] = () => admWrap('form', SETTINGS.forms());
PAGES['admset/policy'] = () => admWrap('policy', SETTINGS.workflows());
PAGES['admset/numbering'] = () => admWrap('numbering', SETTINGS.numbering());
SETTINGS.organisation = () => `<div class="card"><div class="card-b" style="padding-top:16px"><div class="form-grid">
  ${[['Legal name', 'Thejus Educational Trust'], ['Display name', 'Thejus Group of Institutions'], ['Registration no.', 'TCR/IV/112/2004'], ['GSTIN', '32AABTT1234F1Z5'], ['PAN', 'AABTT1234F'], ['Affiliating university', 'APJ Abdul Kalam Technological University'], ['Country', 'India'], ['Timezone', 'Asia/Kolkata (IST)'], ['Currency', 'INR (₹)']].map(([l, v]) => `<div class="field"><label>${l}</label><input class="input" value="${v}"></div>`).join('')}
  <div class="field full"><label>Registered address</label><textarea class="input" rows="2">Vellarakkad, Thrissur, Kerala 680584</textarea></div>
  <div class="field"><label>Languages</label><input class="input" value="English, Malayalam"></div><div class="field"><label>Date format</label><select class="input"><option>04 Nov 2026</option><option>04/11/2026</option></select></div><div class="field"><label>Data retention</label><select class="input"><option>8 years after leaving</option></select></div>
  </div><div style="margin-top:16px;display:flex;justify-content:flex-end"><button class="btn primary" data-toast="Organisation details saved">Save</button></div></div></div>`;
/* ---------- Structure: editable hierarchy ---------- */
const PROG_META = 'Batch 2026–30 · Sections A, B';
const prog = name => ({ name, lvl: 'Programme', meta: PROG_META });
const STRUCT = { name: 'Thejus Group of Institutions', lvl: 'Organisation', kids: [
  { name: 'Thejus Engineering College', lvl: 'Institution', tag: 'Engineering college', kids: [
    { name: 'Computer Science', lvl: 'Department', kids: [prog('B.Tech · CSE'), prog('M.Tech · CSE')] },
    { name: 'Electronics', lvl: 'Department', kids: [prog('B.Tech · ECE')] },
    { name: 'Mechanical', lvl: 'Department', kids: [prog('B.Tech · ME')] },
    { name: 'Civil', lvl: 'Department', kids: [prog('B.Tech · CE')] },
    { name: 'Management Studies', lvl: 'Department', kids: [prog('MBA')] }] },
  { name: 'Thejus Polytechnic', lvl: 'Institution', tag: 'Polytechnic', kids: [] },
  { name: 'Thejus Public School', lvl: 'Institution', tag: 'K-12 school', kids: [] }] };
const ST_NEXT = { Organisation: 'Institution', Institution: 'Department', Department: 'Programme' };
const ST_LABEL = {};           // renamed level labels, e.g. { Department: 'School' }
let stEdit = null;             // path of the node being renamed, e.g. '0.1.2'
const stLbl = l => ST_LABEL[l] || l;
const stGet = path => path.split('.').slice(1).reduce((n, i) => n.kids[+i], STRUCT);
const ST_CLOSED = new Set();       // collapsed branches (paths)
const ST_ICON = { Organisation: 'building', Institution: 'building', Department: 'sitemap', Programme: 'book' };
const stPlural = (lvl, n) => { const w = stLbl(lvl).toLowerCase(); return `${n} ${n === 1 ? w : w + 's'}`; };
function stNode(n, path) {
  const next = ST_NEXT[n.lvl], kids = n.kids || [], open = !ST_CLOSED.has(path);
  const name = stEdit === path
    ? `<input class="input st-in" id="stIn" data-st-path="${path}" value="${esc(n.name)}" aria-label="${esc(stLbl(n.lvl))} name">`
    : `<span class="st-name" data-st-rename="${path}" title="Click to rename">${esc(n.name)}</span>`;
  const right = n.meta ? `<span class="tr-meta">${esc(n.meta)}</span>` : n.tag ? `<span class="chip plain">${esc(n.tag)}</span>` : '';
  const acts = `<span class="st-acts">`
    + `<button class="st-btn" data-st-rename="${path}" title="Rename">${ic('pencil', 13)}</button>`
    + (next ? `<button class="st-btn" data-st-add="${path}" title="Add ${esc(stLbl(next).toLowerCase())}">${ic('plus', 13)}</button>` : '')
    + (n.lvl !== 'Organisation' ? `<button class="st-btn danger" data-st-del="${path}" title="Delete">${ic('trash', 13)}</button>` : '')
    + `</span>`;
  const caret = kids.length ? `<button class="tr-caret ${open ? 'open' : ''}" data-st-toggle="${path}" aria-expanded="${open}" aria-label="${open ? 'Collapse' : 'Expand'} ${esc(n.name)}"><i class="pi pi-chevron-right"></i></button>` : '<span class="tr-caret-sp"></span>';
  return `<li class="tr-li tr-${n.lvl.toLowerCase()}"><div class="tr-row">${caret}<span class="tr-ic"><i class="pi pi-${ST_ICON[n.lvl] || 'circle'}"></i></span>
      <div class="tr-main">${name}<span class="tr-lvl">${esc(stLbl(n.lvl))}</span>${kids.length && next ? `<span class="tr-count">${stPlural(next, kids.length)}</span>` : ''}</div>
      <span class="st-right">${right}</span>${acts}</div>`
    + (kids.length && open ? `<ul>${kids.map((k, i) => stNode(k, path + '.' + i)).join('')}</ul>` : '') + `</li>`;
}
function stAllPaths(n = STRUCT, path = '0', out = []) { if ((n.kids || []).length) { out.push(path); n.kids.forEach((k, i) => stAllPaths(k, path + '.' + i, out)); } return out; }
function stRender() {
  const t = $('#stTree'); if (!t) return;
  t.innerHTML = `<ul class="tr">${stNode(STRUCT, '0')}</ul>`;
  const i = $('#stIn'); if (i) { i.focus(); i.select(); }
}
function stSave(commit) {
  const i = $('#stIn'); if (!i) return;
  const v = i.value.trim(), n = stGet(i.dataset.stPath);
  stEdit = null;
  if (commit && v && v !== n.name) { n.name = v; toast(`Renamed to ${v}`); }
  stRender();
}
document.addEventListener('keydown', e => { if (e.target.id === 'stIn') { if (e.key === 'Enter') { e.preventDefault(); stSave(true); } if (e.key === 'Escape') stSave(false); } });
document.addEventListener('focusout', e => { if (e.target.id !== 'stIn') return; const path = e.target.dataset.stPath; setTimeout(() => { const i = $('#stIn'); if (i && i.dataset.stPath === path && document.activeElement !== i) stSave(true); }); });
document.addEventListener('input', e => { const l = e.target.dataset && e.target.dataset.stLabel; if (l) { ST_LABEL[l] = e.target.value.trim() || l; stRender(); } });
SETTINGS.structure = () => { setTimeout(stRender); return `<div class="grid-3"><div class="card span-2"><div class="card-h"><h3>Hierarchy</h3><span class="muted" style="margin-left:auto;margin-right:10px">Click a name to rename</span><button class="btn sm ghost" data-st-expand="1">Expand all</button><button class="btn sm ghost" data-st-expand="0" style="margin-right:6px">Collapse all</button><button class="btn sm act-write" data-st-add="0">${ic('plus', 13)}Add institution</button></div><div class="card-b tree" id="stTree"></div></div>
  <div class="card"><div class="card-h"><h3>Level labels</h3></div><div class="card-b">${['Institution', 'Department', 'Programme', 'Branch', 'Batch', 'Section'].map((l, i) => `<div class="check-row"><span style="flex:1">${l}</span><input class="input" style="width:120px;height:28px" value="${esc(stLbl(l))}" data-st-label="${l}"><button class="switch ${i === 3 ? '' : 'on'}" data-toggle title="Use this level"></button></div>`).join('')}
  <div class="section-t" style="margin-top:14px">Academic calendar</div><div class="list-row"><span class="grow">2026–27</span><span class="muted">01 Jun 2026 – 31 May 2027</span></div><div class="list-row"><span class="grow">Admission window</span><span class="muted">01 Jun – 30 Nov</span></div></div></div></div>`; };
SETTINGS.users = () => `<div class="card"><div class="card-h"><h3>${USERS.length} users</h3><button class="btn primary sm" style="margin-left:auto">${ic('plus', 13)}Invite user</button></div><div class="card-b"><table class="simple"><thead><tr><th>Name</th><th>Role</th><th>Scope</th><th>2FA</th><th>Last active</th><th>Status</th></tr></thead><tbody>
  ${USERS.map(u => `<tr><td><div style="display:flex;gap:10px;align-items:center"><span class="avatar" style="width:26px;height:26px;font-size:11px">${u.name.split(' ').filter(w => /^[A-Z]/.test(w)).slice(-2).map(w => w[0]).join('')}</span><div><div>${u.name}</div><div class="faint" style="font-size:12px">${u.email}</div></div></div></td><td>${u.role}</td><td class="muted">${u.scope}</td><td>${u.twofa ? `<span style="color:var(--ok)">${ic('check', 14)}</span>` : '<span class="faint">Optional</span>'}</td><td class="muted">${u.last}</td><td>${chip(u.status)}</td></tr>`).join('')}
  </tbody></table><p class="faint" style="margin-top:10px">2FA is mandatory for finance and admin roles. A user can hold roles in several institutions and switch between them without logging out.</p></div></div>`;
SETTINGS.roles = () => {
  const R = ['Admin', 'Finance'];
  const M = [['Book seat / create or edit admission', 'y,v'], ['Configure seat matrix and structure', 'y,n'], ['Configure fee templates', 'y,y'], ['Assign fee to student', 'y,y'], ['Record payment', 'y,y'], ['Approve refund', 'y,n'], ['Execute refund', 'y,c:After approval'], ['Messages and templates', 'y,n'], ['Manage users and roles', 'y,n'], ['Organisation settings', 'y,n'], ['Reports', 'y,y'], ['View audit log', 'y,c:Finance module']];
  const cell = v => v === 'y' ? '<span class="pv y">Yes</span>' : v === 'n' ? '<span class="pv n">No</span>' : v === 'v' ? '<span class="pv v">View</span>' : `<span class="pv c">${v.slice(2)}</span>`;
  return `<div class="card"><div class="card-h"><h3>Default permission matrix</h3><span class="muted">action × module × scope · click a cell to change</span></div><div class="card-b" style="overflow:auto"><table class="perm"><thead><tr><th>Action</th>${R.map(r => `<th>${r}</th>`).join('')}</tr></thead><tbody>
  ${M.map(([a, v]) => `<tr><td>${a}</td>${v.split(',').map(x => `<td style="cursor:pointer">${cell(x)}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div></div>
  <div class="grid-2" style="margin-top:16px"><div class="card"><div class="card-h"><h3>Field masking</h3></div><div class="card-b">${[['Caste / community', 'Admin'], ['Annual income', 'Admin'], ['Bank account', 'Admin, Finance'], ['Aadhaar', 'Masked for everyone · last 4 shown']].map(([f, w]) => `<div class="list-row"><span class="dotico">${ic('lock', 14)}</span><div class="grow"><div class="t">${f}</div><div class="s">Visible to: ${w}</div></div></div>`).join('')}</div></div>
  <div class="card"><div class="card-h"><h3>Roles</h3><span class="muted" style="margin-left:auto">Admin has access to everything</span></div><div class="card-b">${['Admin', 'Finance'].map(r => `<div class="list-row"><span class="grow">${r}</span><span class="faint">${USERS.filter(u => u.role === r).length} users</span></div>`).join('')}</div></div></div>`;
};
SETTINGS.workflows = () => `<div class="card"><div class="card-h"><h3>Admission status pipeline</h3><span class="muted">Drag to reorder · rename freely</span></div><div class="card-b"><div class="pipeline">${STATUSES.map((s, i) => `<span class="pipe-step">${ic('grip', 14)}${chip(s)}</span>${i < 2 ? ic('right', 14) : ''}`).join('')}</div>
  <div class="check-row" style="margin-top:12px"><span style="flex:1">Seat is booked</span><div class="seg"><button class="on">At the desk, before payment</button><button>Only after first payment</button></div></div>
  <div class="check-row"><span style="flex:1">Seat booker must accept the refund policy to book</span><button class="switch on"></button></div></div></div>
  <div class="card" style="margin-top:16px"><div class="card-h"><h3>Refund policy · ${POLICY.ver}</h3></div><div class="card-b">${policyTable()}
  <div style="display:flex;gap:8px;margin-top:12px"><button class="btn sm" data-policy="">${ic('eye', 12)}Preview as booker</button><button class="btn sm">Publish new version</button></div></div></div>
  <div class="grid-2" style="margin-top:16px"><div class="card"><div class="card-h"><h3>Refund approval chain</h3></div><div class="card-b">
    <div class="chain">${[['Admin', 'Approves all amounts'], ['Finance', 'Executes the payout after approval']].map(([r, w], i) => `<div class="ch-item"><span class="ch-dot">${i + 1}</span><div><div>${r}</div><div class="faint" style="font-size:12px">${w}</div></div><button class="icon-btn">${ic('more')}</button></div>`).join('')}</div>
    <div class="check-row"><span style="flex:1">Approval mode</span><div class="seg"><button class="on">Physical signature + scan</button><button>In-app e-approval</button></div></div>
    <div class="check-row"><span style="flex:1">Executor must differ from approvers</span><button class="switch on"></button></div></div></div>
  <div class="card"><div class="card-h"><h3>Maker–checker thresholds</h3></div><div class="card-b">${[['Payment reversal', 'Always'], ['Fee override on a student', 'Always'], ['Concession', 'Above ₹10,000'], ['Refund', 'Per chain'], ['Duplicate reference override', 'Reason required']].map(([a, t]) => `<div class="check-row"><span style="flex:1">${a}</span><span class="muted">${t}</span><button class="switch on" data-toggle></button></div>`).join('')}</div></div></div>`;
SETTINGS.forms = () => {
  const sec = [['Personal details', [['Full name', 'Text', 1], ['Date of birth', 'Date', 1], ['Mobile', 'Phone', 1], ['Guardian / seat booker', 'Text', 1], ['Category', 'Dropdown', 0], ['Aadhaar', 'Masked', 0]]], ['Academic & entrance', [['Qualifying exam', 'Dropdown', 1], ['Marks %', 'Number', 1], ['KEAM rank', 'Number', 0], ['GATE score', 'Number · only if programme = M.Tech', 1]]], ['Admission details', [['Programme', 'Hierarchy', 1], ['Quota', 'Dropdown', 1], ['Hostel required', 'Yes / No', 0]]]];
  return `<div class="grid-3"><div class="card span-2"><div class="card-h"><h3>Engineering admission form · v4</h3><span class="chip ok" style="margin-left:auto">Published</span></div><div class="card-b">${sec.map(([s, f]) => `<div class="form-sec">${s}</div>${f.map(([n, t, r]) => `<div class="check-row">${ic('grip', 14)}<div style="flex:1"><div>${n}${r ? ' <span style="color:var(--bad)">*</span>' : ''}</div><div class="faint" style="font-size:12px">${t}</div></div><button class="icon-btn">${ic('more')}</button></div>`).join('')}`).join('')}<button class="btn" style="margin-top:12px">${ic('plus', 14)}Add field</button></div></div>
  <div class="card"><div class="card-h"><h3>Field palette</h3></div><div class="card-b">${['Text', 'Number', 'Date', 'Dropdown', 'Phone', 'Email', 'File upload', 'Yes / No', 'Section break'].map(f => `<div class="list-row" style="cursor:grab"><span class="dotico">${ic('plus', 14)}</span><span class="grow">${f}</span></div>`).join('')}<div class="notice" style="margin-top:12px">${ic('help', 16)}<div>Duplicate check runs on name + DOB + mobile + application no.</div></div></div></div></div>`;
};
SETTINGS.numbering = () => `<div class="card"><div class="card-b" style="padding-top:12px"><table class="simple"><thead><tr><th>Series</th><th>Format</th><th>Next number</th><th>Reset</th></tr></thead><tbody>
  ${[['Admission number', '{INST}/{YEAR}/{SEQ:5}', 'TEC/2026/' + pad(admSeq + 1, 5)], ['Receipt', '{INST}/RCP/{YY}/{SEQ:5}', 'TEC/RCP/26/' + pad(payments.length + 1, 5)], ['Contra / reversal', '{INST}/CTR/{YY}/{SEQ:5}', 'TEC/CTR/26/00002'], ['Refund', '{INST}/RFD/{YY}/{SEQ:4}', 'TEC/RFD/26/' + pad(refunds.length + 1, 4)], ['Fee demand / invoice', '{INST}/INV/{YY}/{SEQ:5}', 'TEC/INV/26/00412'], ['Application', 'APP-{YY}-{SEQ:4}', 'APP-26-' + (1040 + students.length)]].map(([s, f, n]) => `<tr><td>${s}</td><td><input class="input" style="font-family:ui-monospace,Menlo,monospace;font-size:12px;height:28px;max-width:260px" value="${f}"></td><td><span class="token">${n}</span></td><td class="muted">Every academic year</td></tr>`).join('')}
  </tbody></table><div style="margin-top:12px" class="faint">Tokens: <span class="token">{INST}</span> <span class="token">{YEAR}</span> <span class="token">{YY}</span> <span class="token">{PROG}</span> <span class="token">{QUOTA}</span> <span class="token">{SEQ:n}</span></div></div></div>`;
SETTINGS.branding = () => `<div class="grid-2"><div class="card"><div class="card-b" style="padding-top:16px">
  <div class="field"><label>Logo</label><div style="display:flex;gap:12px;align-items:center"><span class="logo" style="width:48px;height:48px;font-size:24px;border-radius:12px">T</span><button class="btn sm">${ic('upload', 13)}Replace</button></div></div>
  <div class="field" style="margin-top:14px"><label>Brand colours</label><div style="display:flex;gap:8px">${['#0A3C6E', '#1783C1', '#0A0A0A', '#737373', '#E5E5E5', '#E8F2FA', '#F5F5F5'].map(c => `<span title="${c}" style="width:36px;height:36px;border-radius:9px;background:${c};border:1px solid var(--line)"></span>`).join('')}</div></div>
  <div class="field" style="margin-top:14px"><label>Portal address</label><input class="input" value="admissions.thejus.edu.in" style="width:280px"></div>
  <div class="field" style="margin-top:14px"><label>Custom domain (optional)</label><input class="input" placeholder="admissions.thejus.edu.in"></div>
  <div class="field" style="margin-top:14px"><label>Signatures</label><div class="list-row"><span class="grow">Principal · Dr. Suma Rajan</span>${chip('Uploaded')}</div><div class="list-row"><span class="grow">Cashier · Joby Mathew</span>${chip('Uploaded')}</div></div>
  <div class="field" style="margin-top:14px"><label>Receipt footer</label><textarea class="input" rows="2">Fees once paid are not refundable except as per university norms.</textarea></div>
  </div></div><div class="card"><div class="card-h"><h3>Letterhead preview</h3></div><div class="card-b" style="background:var(--bg);border-radius:0 0 10px 10px;padding-top:16px">${receiptPaper(payments[5])}</div></div></div>`;
SETTINGS.integrations = () => `<div class="grid-3">${[['SMS provider', 'MSG91 · DLT', 'Connected', 'Sender ID THEJUS · 14 templates', 'sms'], ['WhatsApp Business', 'Gupshup', 'Connected', 'Opt-in captured per contact', 'chat'], ['Email domain', 'thejus.edu.in', 'Connected', 'SPF + DKIM verified', 'mail'], ['Single sign-on', 'Google Workspace', 'Not connected', 'Optional for staff', 'lock']].map(([t, n, s, d, i]) => `<div class="card"><div class="card-b" style="padding-top:16px"><div style="display:flex;gap:10px;align-items:center"><span class="dotico">${ic(i, 15)}</span><div style="flex:1"><div class="faint" style="font-size:12px">${t}</div><div>${n}</div></div>${chip(s === 'Connected' ? 'Active' : 'On hold')}</div><div class="faint" style="margin-top:12px">${d}</div><button class="btn sm" style="margin-top:12px">${s === 'Connected' ? 'Manage' : 'Connect'}</button></div></div>`).join('')}</div>`;
/* ================= router ================= */
function route() {
  pageView = false;
  const h = (location.hash || '#dashboard').slice(1);
  let [page, sub] = h.split('/');
  if (page === 'dues' || page === 'refunds') { location.replace('#payments/' + (page === 'dues' ? 'students' : page)); return; }
  if (page === 'payments' && (sub === 'dues' || sub === 'counter')) { location.replace('#payments/' + (sub === 'dues' ? 'students' : 'daybook')); return; }
  if (page === 'payments' && ((sub === 'students' && !allowed('dues')) || (sub === 'refunds' && !allowed('refunds')))) sub = '';
  if (page === 'settings' && !allowed('settings') && allowed('admset')) { page = 'admset'; sub = ''; }
  if (!allowed(page)) page = 'dashboard';
  chipHandler = null;
  renderNav(page === 'admset' ? 'settings' : page);
  const crumbLabel = page === 'admset' ? 'Settings' : (NAV.flatMap(g => g[1]).find(([k]) => k === page) || [0, 'Dashboard'])[1];
  $('#crumbs').innerHTML = `<span>Thejus Engineering College</span><i class="pi pi-angle-right"></i><b>${crumbLabel}</b>`;
  let key = sub && PAGES[page + '/' + sub] ? page + '/' + sub : page;
  let sec = '', sub2 = '';
  if (page === 'admset') {
    sec = ADMSET.some(([k]) => k === sub) ? sub : 'seats', sub2 = h.split('/')[2];
    key = sec === 'fees' ? (PAGES['fees/' + sub2] ? 'fees/' + sub2 : 'fees/heads') : sec === 'seats' ? 'seats' : sec === 'documents' ? 'documents' : 'admset/' + sec;
  }
  const main = $('#main');
  const moved = { workflows: 'policy', forms: 'form', numbering: 'numbering' };
  if (page === 'settings' && moved[sub]) { location.replace('#admset/' + moved[sub]); return; }
  if (page === 'settings') main.innerHTML = settingsPage(SET.some(x => x[0] === sub) ? sub : 'organisation');
  else if (page === 'admset') main.innerHTML = settingsShell('admset/' + sec, PAGES[key]());
  else main.innerHTML = (PAGES[key] || PAGES.dashboard)();
  main.scrollTop = 0;
  renderSheet();
  const ss = $('#sheetSearch'); if (ss) ss.oninput = e => { S.q = e.target.value; S.page = 0; renderSheet(); };
}

/* ================= events ================= */
document.addEventListener('click', e => {
  const t = e.target;
  const q = sel => t.closest(sel);
  if (!q('#menu') && !q('#meBtn')) closeMenu();
  if (!q('#fdrop')) $('#fdrop')?.classList.remove('open');
  let el;
  if ((el = q('[data-close-drawer]')) || t === $('#scrim')) return closeDrawer();
  if ((el = q('[data-close-modal]'))) { if (el.dataset.toast) toast(el.dataset.toast); return closeModal(); }
  if (t === $('#modalWrap')) return closeModal();
  if ((el = q('[data-toast]'))) toast(el.dataset.toast);
  if ((el = q('[data-go]'))) { state.preset = el.dataset.preset ? JSON.parse(el.dataset.preset) : null; if (location.hash === '#' + el.dataset.go) route(); else location.hash = el.dataset.go; return; }
  if ((el = q('[data-student]'))) { closeModal(); return openStudent(el.dataset.student); }
  if ((el = q('[data-refund]'))) return openRefund(el.dataset.refund);
  if ((el = q('[data-stab]'))) return openStudent(el.dataset.sid, el.dataset.stab);
  if ((el = q('[data-invoice]'))) return showInvoice(el.dataset.invoice, +el.dataset.k);
  if ((el = q('[data-receipt]'))) return showReceipt(el.dataset.receipt);
  if ((el = q('[data-feeslip]'))) return showFeeSlip(el.dataset.feeslip);
  if ((el = q('[data-policy]'))) return showPolicy(el.dataset.policy);
  if ((el = q('[data-wizard]'))) { closeDrawer(); return bookingWizard(el.dataset.wizard, +el.dataset.step); }
  if ((el = q('[data-report]'))) return openReport(el.dataset.report);
  if ((el = q('[data-doc-edit]'))) return docEditor(el.dataset.docEdit);
  if ((el = q('[data-doc-preview]'))) return docEditor(el.dataset.docPreview);
  if ((el = q('[data-sm-active]'))) { const p = PROGS.find(x => x.code === el.dataset.smActive); p.active = p.active === false; smRender(); return toast(`${p.name} is now ${p.active ? 'active — open for booking' : 'inactive — hidden from booking'}`); }
  if ((el = q('[data-toggle]')) || (el = q('.switch'))) return el.classList.toggle('on');
  if ((el = q('[data-verify]'))) { const row = el.closest('.check-row'); row.querySelector('.chip').outerHTML = chip('Verified'); el.textContent = 'View'; el.classList.add('ghost'); return toast('Document verified'); }
  if ((el = q('.seg button')) && !q('#pMode')) { $$('button', el.parentElement).forEach(b => b.classList.toggle('on', b === el)); }
  if ((el = q('[data-sm-addcourse]'))) return smAddCourse();
  if ((el = q('[data-sm-add]'))) return smAddModal(el.dataset.smAdd);
  if ((el = q('[data-st-toggle]'))) { const p = el.dataset.stToggle; if (ST_CLOSED.has(p)) ST_CLOSED.delete(p); else ST_CLOSED.add(p); return stRender(); }
  if ((el = q('[data-st-expand]'))) { ST_CLOSED.clear(); if (el.dataset.stExpand === '0') stAllPaths().filter(p => p.split('.').length >= 3).forEach(p => ST_CLOSED.add(p)); return stRender(); }
  if ((el = q('[data-st-rename]'))) { if (stEdit) stSave(true); stEdit = el.dataset.stRename; return stRender(); }
  if ((el = q('[data-st-add]'))) {
    if (stEdit) stSave(true);
    const parent = stGet(el.dataset.stAdd), lvl = ST_NEXT[parent.lvl]; ST_CLOSED.delete(el.dataset.stAdd);
    const n = { name: 'New ' + stLbl(lvl).toLowerCase(), lvl };
    if (lvl === 'Programme') n.meta = PROG_META; else n.kids = [];
    if (lvl === 'Institution') n.tag = 'Institution';
    parent.kids.push(n); stEdit = el.dataset.stAdd + '.' + (parent.kids.length - 1); return stRender();
  }
  if ((el = q('[data-st-del]'))) {
    const path = el.dataset.stDel, n = stGet(path), parent = stGet(path.split('.').slice(0, -1).join('.'));
    const under = n.kids && n.kids.length ? ` and the ${n.kids.length} ${n.kids.length === 1 ? 'item' : 'items'} under it` : '';
    if (el.dataset.armed !== '1') { el.dataset.armed = '1'; el.classList.add('armed'); el.title = 'Click again to delete'; toast(`Click delete again to remove ${stLbl(n.lvl).toLowerCase()} "${n.name}"${under}`); setTimeout(() => { el.dataset.armed = ''; el.classList.remove('armed'); el.title = 'Delete'; }, 3500); return; }
    parent.kids.splice(+path.split('.').pop(), 1); stEdit = null; stRender(); return toast(`Deleted ${n.name}`);
  }
  if ((el = q('[data-fdrop]'))) return el.parentElement.classList.toggle('open');
  if ((el = q('[data-fchip]')) && chipHandler) {
    const id = el.dataset.fchip;
    if (!el.closest('#fchips')) return setChips([id]); // KPI shortcut: select just that one
    return setChips(id === 'all' ? [] : S.sel.includes(id) ? S.sel.filter(x => x !== id) : [...S.sel, id]);
  }
  if ((el = q('[data-export]'))) return toast('Export started · large files arrive as a download link');
  if ((el = q('[data-refund-act]'))) {
    const r = refunds.find(x => x.id === el.dataset.rid); const prev = r.status; r.status = el.dataset.refundAct;
    audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' 10:5' + Math.floor(Math.random() * 9), user: 'Anita Joseph', role: state.role, module: 'Refunds', action: 'refund.' + r.status.toLowerCase().replace(' ', '_'), record: r.no, detail: `${prev} → ${r.status}`, before: prev, after: r.status, ip: '10.12.4.1' });
    route(); openRefund(r.id); return toast(`${r.no} → ${r.status} · guardian notified`);
  }
  if ((el = q('[data-action]'))) {
    const a = el.dataset.action;
    if (a === 'new-admission') { location.hash = 'admissions/new'; return; }
    if (a === 'new-campaign') return newCampaignModal();
    if (a === 'remind') { CAMPAIGNS.unshift({ id: 'c' + Date.now(), name: 'Fee reminder · from Due payments', type: 'Fee reminder', trigger: 'Manual', ch: ['SMS', 'WhatsApp'], aud: 'overdue', n: +(el.dataset.n || 0), at: TODAY + ' ' + new Date().toTimeString().slice(0, 5), by: 'Anita Joseph', status: 'Running', failed: 0, tpl: CAMP_TPL['Fee reminder'] }); return toast('Reminders sent · SMS + WhatsApp with the fee slip to ' + (el.dataset.n || 'selected') + ' guardians · see Messages → Campaigns'); }
    if (a === 'record-payment') return recordPayment(el.dataset.sid);
    if (a === 'bulk-fee') return bulkFee();
    if (a === 'new-refund') { const s = students.find(x => x.status === 'Confirmed'); return toast('Pick a student, then choose “Cancel admission” to raise a refund'); }
    if (a === 'cancel-adm') { closeDrawer(); closeModal(); return toast('Cancellation request created · refund form ready to print'); }
  }
  // sheet interactions
  if ((el = q('[data-pg]'))) { S.page = +el.dataset.pg; renderSheet(); $('#sheet').scrollTop = 0; return; }
  if ((el = q('th[data-sort]'))) { const k = el.dataset.sort; S.sort = S.sort && S.sort.key === k ? (S.sort.dir > 0 ? { key: k, dir: -1 } : null) : { key: k, dir: 1 }; return renderSheet(); }
  if ((el = q('#sheet tbody tr'))) { const row = S.view[+el.dataset.ri]; if (row && S.onOpen) S.onOpen(row); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeDrawer(); closeMenu(); }
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#globalSearch').focus(); }
});
$('#globalSearch').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const v = e.target.value.trim().toLowerCase(); if (!v) return;
  const s = students.find(x => x.name.toLowerCase().includes(v) || x.adm.toLowerCase().includes(v) || x.app.toLowerCase().includes(v));
  const p = payments.find(x => x.rcpt.toLowerCase().includes(v));
  if (s) openStudent(s.id); else if (p) showReceipt(p.id); else toast('No match for “' + esc(v) + '”');
});
$('#meBtn').addEventListener('click', e => {
  openMenu(e.currentTarget, `<div class="mh">Switch role (demo)</div>${Object.keys(ROLES).map(r => `<button class="mi ${r === state.role ? 'on' : ''}" data-role="${r}">${ic('user', 14)}${r}</button>`).join('')}<div class="mh" style="border-top:1px solid var(--line);margin-top:6px;padding-top:10px">Account</div><button class="mi">${ic('lock', 14)}Password &amp; 2FA</button><button class="mi">${ic('x', 14)}Sign out</button>`);
  $('#menu').style.left = 'auto'; $('#menu').style.right = '10px';
});
$('#menu').addEventListener('click', e => {
  const r = e.target.closest('[data-role]'); const i = e.target.closest('[data-inst]');
  if (r) { state.role = r.dataset.role; $('#meRole').textContent = state.role;  closeMenu(); route(); toast('Viewing as ' + state.role); }
  if (i) { $('#instName').textContent = i.dataset.inst; closeMenu(); toast('Switched to ' + i.dataset.inst); }
});

// collapsible sidebar (remembered per browser)
const setNav = collapsed => {
  document.body.classList.toggle('nav-collapsed', collapsed);
  const b = $('#navToggle'); b.title = collapsed ? 'Expand menu' : 'Collapse menu'; b.setAttribute('aria-expanded', String(!collapsed)); b.setAttribute('aria-label', b.title);
  const c = $('.nav-collapse'); if (c) c.title = (collapsed ? 'Expand menu' : 'Collapse menu') + ' ( [ )';
  try { localStorage.setItem('eduadmit.nav', collapsed ? '1' : '0'); } catch (e) { /* storage unavailable */ }
};
try { if (localStorage.getItem('eduadmit.nav') === '1') setNav(true); } catch (e) { /* storage unavailable */ }
$('#navToggle').addEventListener('click', () => setNav(!document.body.classList.contains('nav-collapsed')));
document.addEventListener('click', e => { if (e.target.closest('[data-navtoggle]')) setNav(!document.body.classList.contains('nav-collapsed')); });
document.addEventListener('keydown', e => { if (e.key === '[' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) setNav(!document.body.classList.contains('nav-collapsed')); });
// icons in static header
$$('[data-ic]').forEach(el => el.innerHTML = ic(el.dataset.ic, el.classList.contains('ic-wrap') ? 15 : 18));
document.addEventListener('change', e => { if (e.target.id === 'aySel') { state.ay = e.target.value; route(); } });
window.addEventListener('resize', () => window.fitCol && window.fitCol());
window.addEventListener('hashchange', () => { route(); });
route();
})();
