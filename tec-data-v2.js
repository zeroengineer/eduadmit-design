/* v2 data: Booked → Admitted → (either) Cancelled, booking fee converts into academic fee. Sample data only. */
import * as D from './tec-data.js';
const { students, payments, refunds, audit, PROGS, QUOTAS, TODAY, inr, fd, addDays, pad, POLICY, instPlan, allocate, nextDue, TUITION, FIXED } = D;
export * from './tec-data.js';

export const BOOKING_FEE = { Government: 5000, Management: 25000, NRI: 50000, 'Lateral entry': 5000 };
export const STALE_DAYS = 14;
export const AUTO_DAYS = 14;
export const convertsOn = s => addDays(s.bookedOn, AUTO_DAYS);
export const daysToConvert = s => Math.round((Date.parse(convertsOn(s)) - Date.parse(TODAY)) / 864e5);
export const STAGES = ['Booked', 'Admitted', 'Cancelled'];
export const BKG_POLICY = { ver: 'B1', slabs: [['Cancelled within 7 days of booking', 'Full refund less ₹1,000 processing', d => d <= 7, p => Math.min(p, 1000)], ['Cancelled 8–30 days after booking', '50% of booking fee refunded', d => d <= 30, p => Math.round(p / 2)], ['Cancelled more than 30 days after booking', 'No refund', () => true, p => p]] };
export const ADM_POLICY = POLICY;
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
export const daysSince = iso => days(iso, TODAY);
export const occupies = s => s.stage === 'Booked' || s.stage === 'Admitted';
export const templateFee = (prog, quota) => { const p = PROGS.find(x => x.code === prog); return Math.round(TUITION[quota] * (p ? p.m : 1) / 100) * 100 + Object.values(FIXED).reduce((a, b) => a + b, 0); };

export function recalc2(s) {
  if (s.stage === 'Admitted') {
    s.due = Math.max(0, s.net - s.paid);
    s.overdue = allocate(s).filter(i => i.due < TODAY).reduce((t, i) => t + i.amt - i.paid, 0);
    const nd = nextDue(s); s.nextDue = nd ? nd.due : '';
  } else { s.due = 0; s.overdue = 0; s.nextDue = ''; }
}
export function refundCalc(s) {
  if (s.cancelFrom === 'Booking') {
    const d = days(s.bookedOn, s.cancelledOn), k = BKG_POLICY.slabs.findIndex(x => x[2](d));
    const ded = BKG_POLICY.slabs[k][3](s.paid);
    return { policy: 'Booking policy ' + BKG_POLICY.ver, slabText: BKG_POLICY.slabs[k][0] + ' · ' + BKG_POLICY.slabs[k][1], days: d, paid: s.paid, deduction: ded, amount: s.paid - ded };
  }
  const ded = s.cancelKind === 'Withdrawn' ? 1000 : Math.round(s.paid * .1 / 100) * 100;
  const k = s.cancelKind === 'Withdrawn' ? 0 : 1;
  return { policy: 'Admission policy ' + ADM_POLICY.ver, slabText: ADM_POLICY.slabs[k][0] + ' · ' + ADM_POLICY.slabs[k][1], days: days(s.bookedOn, s.cancelledOn), paid: s.paid, deduction: ded, amount: s.paid - ded };
}

/* ---- transform the v1 sample into the v2 model ---- */
export const bookingReceipts = [];
const CASH = ['Joby Mathew', 'Divya Suresh'], MODES = ['UPI', 'Cash', 'Bank transfer', 'UPI', 'Cheque', 'UPI', 'DD'];
let bi = 0, ci = 0;
students.forEach((s, i) => {
  const old = s.status;
  s.bkFee = BOOKING_FEE[s.quota];
  if (old === 'Seat booked' || old === 'Details collected') {
    s.stage = 'Booked';
    s.bookedOn = addDays(TODAY, -((bi++ * 5) % AUTO_DAYS));
    s.adm = ''; s.paid = s.bkFee;
  } else if (old === 'Confirmed') {
    s.stage = 'Admitted';
    s.bookedOn = addDays(s.created, -AUTO_DAYS);
    s.admittedOn = s.created;
  } else {
    s.stage = 'Cancelled';
    s.cancelKind = old === 'Withdrawn' ? 'Withdrawn' : 'Cancelled';
    s.cancelFrom = old === 'Withdrawn' ? 'Admission' : (ci++ % 2 === 0 ? 'Booking' : 'Admission');
    s.bookedOn = addDays(s.created, -AUTO_DAYS);
    if (s.cancelFrom === 'Booking') { s.adm = ''; s.paid = s.bkFee; s.cancelledOn = addDays(s.bookedOn, [3, 9, 12][i % 3]); }
    else { s.admittedOn = s.created; s.cancelledOn = addDays(s.created, 6 + (i % 20)); }
    if (s.cancelledOn > TODAY) s.cancelledOn = TODAY;
  }
  s.bkMode = MODES[i % MODES.length]; s.bkCashier = CASH[i % 2];
  s.bkRef = s.bkMode === 'Cash' ? '—' : s.bkMode === 'UPI' ? 'UPI' + (400000000000 + i * 7919) : s.bkMode === 'Cheque' ? 'CHQ ' + (300100 + i) : s.bkMode === 'DD' ? 'DD ' + (500200 + i) : 'NEFT' + (8800000000 + i * 31);
  s.policy = { ver: BKG_POLICY.ver, admVer: ADM_POLICY.ver, at: s.bookedOn + ' ' + pad(9 + i % 8, 2) + ':' + pad((i * 7) % 60, 2) };
  s.history = [{ at: s.bookedOn, t: 'Seat booked', d: `${s.guardian} accepted booking policy ${BKG_POLICY.ver}` }];
});
/* booking receipts in date order */
[...students].sort((a, b) => a.bookedOn.localeCompare(b.bookedOn) || a.id.localeCompare(b.id)).forEach((s, k) => {
  s.bkRcpt = 'BKG/26/' + pad(k + 1, 4);
  bookingReceipts.push({ id: 'b' + k, rcpt: s.bkRcpt, sid: s.id, amt: s.bkFee, date: s.bookedOn, mode: s.bkMode, ref: s.bkRef, cashier: s.bkCashier });
  s.history[0].d = `${s.bkRcpt} · ${inr(s.bkFee)} · ` + s.history[0].d;
});
/* academic receipts: drop the booking share from the first receipt, remove receipts of bookings that were never converted */
for (let k = payments.length - 1; k >= 0; k--) {
  const p = payments[k], s = D.sById(p.sid);
  if (s.stage === 'Booked' || s.cancelFrom === 'Booking') { payments.splice(k, 1); continue; }
  if (p.alloc === 'Booking fee') { p.alloc = 'Instalment 1'; p.amt = Math.max(0, p.amt - s.bkFee); if (!p.amt) payments.splice(k, 1); }
}
students.forEach(s => {
  if (s.admittedOn) s.history.push({ at: s.admittedOn, t: 'Converted to admission automatically', d: `${s.adm} · booking fee ${s.bkRcpt} converted · −${inr(s.bkFee)} against the academic fee` });
  payments.filter(p => p.sid === s.id).forEach(p => s.history.push({ at: p.date, t: 'Payment received', d: `${p.rcpt} · ${inr(p.amt)} · ${p.mode}` }));
  if (s.stage === 'Cancelled') s.history.push({ at: s.cancelledOn, t: s.cancelKind === 'Withdrawn' ? 'Admission withdrawn' : s.cancelFrom === 'Booking' ? 'Booking cancelled' : 'Admission cancelled', d: s.cancelFrom === 'Booking' ? 'Booking fee not converted · booking refund policy applies' : 'Fees paid handled under the admission refund policy' });
  recalc2(s);
});
/* refunds: one per cancelled record, recomputed from the policy accepted */
refunds.length = 0;
const RST = ['Submitted', 'Awaiting approval', 'Awaiting approval', 'Approved', 'Processing', 'Completed', 'Completed', 'Rejected', 'On hold'];
students.filter(s => s.stage === 'Cancelled').sort((a, b) => a.cancelledOn.localeCompare(b.cancelledOn)).forEach((s, k) => {
  const c = refundCalc(s);
  s.reason = s.cancelFrom === 'Booking' ? ['Got a government seat elsewhere', 'Family decided on another college', 'Changed course preference'][k % 3] : s.cancelKind === 'Withdrawn' ? 'Withdrawn within 7 days of admission' : 'Admission cancelled · moved to KEAM allotment college';
  refunds.push({ id: 'r' + k, no: 'TEC/RFD/26/' + pad(k + 1, 4), sid: s.id, raised: s.cancelledOn, reason: s.reason, paid: c.paid, deduction: c.deduction, amount: c.amount, policy: c.policy, slabText: c.slabText, status: c.amount > 0 ? RST[k % RST.length] : 'Completed', mode: k % 3 === 0 ? 'In-app e-approval' : 'Physical signature + scan', raisedBy: s.officer });
  s.history.push({ at: s.cancelledOn, t: 'Refund raised', d: `TEC/RFD/26/${pad(k + 1, 4)} · ${inr(c.amount)} · ${c.policy}` });
});
students.forEach(s => s.history.sort((a, b) => a.at.localeCompare(b.at)));

/* ---- actions ---- */
const log = (user, module, action, record, detail, before, after, on) => audit.unshift({ id: 'a' + Date.now() + Math.random(), at: (on || TODAY) + ' ' + (on ? '06:00' : new Date().toTimeString().slice(0, 5)), user, role: 'Admin', module, action, record, detail, before, after, ip: '10.12.4.1' });
let admSeq = Math.max(...students.map(s => +(s.adm || '0/0/0').split('/')[2] || 0));
export function convertBooking(s, user = 'Anita Joseph', on = TODAY, auto = false) {
  s.adm = 'TEC/2026/' + pad(++admSeq, 5);
  s.stage = 'Admitted'; s.status = 'Confirmed'; s.admittedOn = on; s.created = on; s.d1 = on;
  s.fee = templateFee(s.prog, s.quota); s.net = s.fee - (s.conc || 0); s.paid = s.bkFee;
  recalc2(s);
  s.history.push({ at: on, t: auto ? 'Converted to admission automatically' : 'Converted to admission', d: `${s.adm} · booking fee ${s.bkRcpt} converted · −${inr(s.bkFee)} against the academic fee` });
  log(user, 'Admissions', 'booking.convert', s.adm, `Booking fee → academic fee · ${s.bkRcpt} · ${inr(s.bkFee)} credited to Instalment 1`, 'Booked', 'Admitted', on);
  return s;
}
export function cancelRecord(s, reason, user = 'Anita Joseph') {
  s.cancelFrom = s.stage === 'Booked' ? 'Booking' : 'Admission'; s.cancelKind = 'Cancelled';
  s.stage = 'Cancelled'; s.status = 'Cancelled'; s.cancelledOn = TODAY; s.reason = reason || 'Cancelled at the desk';
  recalc2(s);
  const c = refundCalc(s), r = { id: 'r' + Date.now(), no: 'TEC/RFD/26/' + pad(refunds.length + 1, 4), sid: s.id, raised: TODAY, reason: s.reason, paid: c.paid, deduction: c.deduction, amount: c.amount, policy: c.policy, slabText: c.slabText, status: 'Submitted', mode: 'Physical signature + scan', raisedBy: user };
  refunds.push(r);
  s.history.push({ at: TODAY, t: s.cancelFrom === 'Booking' ? 'Booking cancelled' : 'Admission cancelled', d: s.reason }, { at: TODAY, t: 'Refund raised', d: `${r.no} · ${inr(r.amount)} · ${c.policy}` });
  log(user, s.cancelFrom === 'Booking' ? 'Bookings' : 'Admissions', 'record.cancel', s.adm || s.bkRcpt, `${s.name} · ${s.reason}`, s.cancelFrom === 'Booking' ? 'Booked' : 'Admitted', 'Cancelled');
  return r;
}
export function newBooking(o, user = 'Anita Joseph') {
  const p = PROGS.find(x => x.code === o.prog), i = students.length, amt = +String(o.amount || '').replace(/[^\d]/g, '') || BOOKING_FEE[o.quota];
  const s = { id: 's' + i, app: 'APP-26-' + (1040 + i), adm: '', name: o.name || 'New applicant', guardian: o.guardian || 'Guardian', relation: o.relation || 'Father', mobile: o.mobile || '9800000000', prog: p.code, progName: p.name, dept: p.dept, quota: o.quota, cat: 'General', stage: 'Booked', status: 'Seat booked', created: TODAY, bookedOn: TODAY, officer: user, entrance: '—', fee: 0, conc: 0, net: 0, d1: TODAY, paid: amt, bkFee: amt, bkMode: o.mode, bkRef: o.ref || '—', bkCashier: user, docs: { SSLC: 'Pending', 'Plus Two': 'Pending', TC: 'Pending', 'Community certificate': 'Pending' }, policy: { ver: BKG_POLICY.ver, admVer: ADM_POLICY.ver, at: TODAY + ' ' + new Date().toTimeString().slice(0, 5) } };
  s.bkRcpt = 'BKG/26/' + pad(bookingReceipts.length + 1, 4);
  bookingReceipts.push({ id: 'b' + bookingReceipts.length, rcpt: s.bkRcpt, sid: s.id, amt: s.bkFee, date: TODAY, mode: s.bkMode, ref: s.bkRef, cashier: user });
  s.history = [{ at: TODAY, t: 'Seat booked', d: `${s.bkRcpt} · ${inr(s.bkFee)} · ${s.guardian} accepted booking policy ${BKG_POLICY.ver}` }];
  recalc2(s); students.push(s);
  log(user, 'Bookings', 'booking.create', s.bkRcpt, `${s.name} · ${p.name} · ${s.quota} · ${inr(s.bkFee)}`, '—', 'Booked');
  return s;
}

/* bookings that are not cancelled become admissions automatically AUTO_DAYS after booking */
export function runAutoConvert() {
  const due = students.filter(s => s.stage === 'Booked' && daysSince(s.bookedOn) >= AUTO_DAYS);
  due.forEach(s => convertBooking(s, 'System', convertsOn(s), true));
  return due.length;
}
runAutoConvert();

/* ---- cancellation requests: Finance raises, Admin approves ---- */
export const cancelRequests = [];
export function raiseCancelRequest(s, o, user = 'Joby Mathew', at = TODAY) {
  const c = refundCalc({ ...s, cancelFrom: s.stage === 'Booked' ? 'Booking' : 'Admission', cancelKind: 'Cancelled', cancelledOn: at });
  const r = { id: 'cr' + cancelRequests.length, no: 'CR/26/' + pad(cancelRequests.length + 1, 4), sid: s.id, fromStage: s.stage === 'Booked' ? 'Booking' : 'Admission', at, raisedBy: user, reason: o.reason, paid: c.paid, policyAmount: c.amount, amount: o.manual ? o.amount : c.amount, manual: !!o.manual, why: o.why || '', status: 'Pending' };
  cancelRequests.push(r);
  s.history.push({ at, t: 'Cancellation requested', d: `${r.no} · by ${user} · refund ${inr(r.amount)}${r.manual ? ' (manual)' : ''} · awaiting admin approval` });
  log(user, 'Cancellations', 'cancel.request', r.no, `${s.name} · ${o.reason}`, s.stage, 'Requested');
  return r;
}
export function decideCancelRequest(r, approve, user = 'Anita Joseph', note = '') {
  const s = D.sById(r.sid);
  r.status = approve ? 'Approved' : 'Rejected'; r.decidedBy = user; r.decidedAt = TODAY; r.note = note;
  if (!approve) { s.history.push({ at: TODAY, t: 'Cancellation request rejected', d: `${r.no} · by ${user}${note ? ' · ' + note : ''}` }); log(user, 'Cancellations', 'cancel.reject', r.no, s.name, 'Requested', 'Rejected'); return null; }
  s.history.push({ at: TODAY, t: 'Cancellation request approved', d: `${r.no} · by ${user}` });
  const rf = cancelRecord(s, r.reason, user);
  if (r.manual && r.amount !== rf.amount) { rf.override = { policyAmount: rf.amount, why: r.why, by: r.raisedBy }; rf.amount = r.amount; rf.deduction = rf.paid - r.amount; }
  r.refundNo = rf.no; r.refundId = rf.id;
  return rf;
}
(() => {
  const bk = students.filter(s => s.stage === 'Booked'), ad = students.filter(s => s.stage === 'Admitted');
  [[bk[2], 'Got a seat elsewhere', 'Joby Mathew', 1], [ad[4], 'Moved to an allotment college', 'Divya Suresh', 2], [bk[7], 'Family changed plans', 'Joby Mathew', 0], [ad[9], 'Withdrawn by family', 'Joby Mathew', 3]].forEach(([s, reason, user, ago]) => { if (s) raiseCancelRequest(s, { reason }, user, addDays(TODAY, -ago)); });
  const r = ad[12] && raiseCancelRequest(ad[12], { reason: 'Did not report for classes' }, 'Divya Suresh', addDays(TODAY, -5));
  if (r) decideCancelRequest(r, false, 'Anita Joseph', 'Student reported on 30 Oct');
})();
