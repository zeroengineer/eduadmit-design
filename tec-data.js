/* Sample data for Thejus Engineering College admin — extracted from uploads/app.js */
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


export { students, payments, refunds, audit, PROGS, QUOTAS, OCCUPY, STATUSES, PAY_MODES, TODAY, inr, inrS, fd, fdShort, addDays, instPlan, allocate, nextDue, recalc, FIXED, POLICY, USERS, sById, pad, pick, TUITION };
