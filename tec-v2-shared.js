/* Shared helpers for the v2 page models */
import * as D from './tec-data-v2.js';
const { students, payments, refunds, PROGS, QUOTAS, TODAY, inr, fd, addDays, instPlan, FIXED } = D;

const SC = { Booked: 'info', Admitted: 'ok', Cancelled: 'bad', Withdrawn: 'bad', 'Cancelled booking': 'bad', 'Cancelled admission': 'bad', Old: 'warn', 'Up to date': 'ok', Paid: 'ok', 'Part paid': 'warn', 'Due soon': 'warn', 'Fully paid': 'ok', Scheduled: 'info', 'Partly failed': 'warn', Overdue: 'bad', 'Due this week': 'warn', Upcoming: 'grey', Submitted: 'grey', 'Awaiting approval': 'warn', Approved: 'info', Processing: 'violet', Completed: 'ok', Rejected: 'bad', 'On hold': 'grey', Posted: 'ok', Converted: 'info', Reversed: 'bad', Verified: 'ok', Uploaded: 'info', Pending: 'warn', Delivered: 'ok', Failed: 'bad', Queued: 'grey', Sent: 'ok', Active: 'ok', Invited: 'warn', Archived: 'grey', Running: 'violet', Draft: 'grey', Published: 'ok', Full: 'bad', Left: 'warn', 'Booking fee': 'info', Refundable: 'ok', Shown: 'ok', Hidden: 'grey' };
const CH = { ok: ['#E8F4E9', '#0B5E0B', '#9FD3A8'], warn: ['#FBF2E1', '#7A5500', '#E0C27F'], bad: ['#FBEAED', '#A12A42', '#E8AAB7'], grey: ['#F0F2F5', '#4B5361', '#C9CFD8'], info: ['#E8F1FA', '#0B5A9E', '#A9C9EA'], violet: ['#EFEAFB', '#5A3A9E', '#C9B8EE'] };
export const chipColors = s => CH[SC[s] || 'grey'];

export const C = {
  t: (text, o = {}) => ({ k: 'text', text: text ?? '', ...o }),
  r: (text, o = {}) => ({ k: 'text', text: text ?? '', align: 'right', ...o }),
  link: (text, go, o = {}) => ({ k: 'link', text, go, ...o }),
  chip: (s, o = {}) => ({ k: 'chip', text: s, ...o }),
  tag: s => ({ k: 'tag', text: s }),
  tags: a => ({ k: 'tags', tags: a }),
  btn: (text, go, icon, o = {}) => ({ k: 'btn', text, go, icon, ...o }),
  two: (text, sub, o = {}) => ({ k: 'two', text, sub, ...o }),
  faint: text => ({ k: 'text', text, color: '#4B5361' }),
};
export const kv = items => ({ type: 'kv', items: items.map(([k, v]) => ({ k, v: v == null || v === '' ? '—' : String(v) })) });
export const H = text => ({ type: 'h', text });
export const notice = (tone, text) => ({ type: 'notice', tone, text });
export const R = l => ({ l, r: true });
export const table = (head, rows, foot) => ({ type: 'table', head: head.map(h => typeof h === 'string' ? { l: h } : h), rows, foot });
export const letterhead = (title, no, date) => ({ type: 'letterhead', title, no, date });
export const col = (key, label, w, cell, o = {}) => ({ key, label, w, cell, ...o });
export const progCourse = p => p.name.split(' ')[0];
export const progBranch = p => p.name.slice(progCourse(p).length).trim() || p.dept;
export const actProgs = () => PROGS.filter(p => p.active !== false);
export const stageChip = s => s.stage === 'Cancelled' ? (s.cancelKind === 'Withdrawn' ? 'Withdrawn' : s.cancelFrom === 'Booking' ? 'Cancelled booking' : 'Cancelled admission') : s.stage;
export const tabsOf = (A, base, list, cur) => list.map(([k, l, n]) => ({ label: l, count: n ?? '', on: k === cur, go: () => A.go(base + (k ? '/' + k : '')) }));

/* seats: a booking holds a seat */
export function seatStat(p, q) {
  const n = st => students.filter(s => s.prog === p.code && s.quota === q && s.stage === st).length;
  const ad = n('Admitted'), bk = n('Booked'), cap = p.cap[q] || 0;
  return { cap, ad, bk, used: ad + bk };
}
export const seatsLeft = (p, q) => { const s = seatStat(p, q); return s.cap - s.used; };
export const seatSegs = s => [{ w: (s.cap ? s.ad / s.cap * 100 : 0) + '%', c: '#0A3C6E' }, { w: (s.cap ? s.bk / s.cap * 100 : 0) + '%', c: '#5B9BD5' }];
export const occCell = s => { if (!s.cap) return C.faint('Not offered'); const left = Math.max(0, s.cap - s.used); return { k: 'occ', text: String(s.used), cap: ` / ${s.cap}`, badge: left <= 0 ? 'Full' : `${left} left`, badgeChip: left <= 0 || left / s.cap <= .15, segs: seatSegs(s) }; };

/* fee account: booking credit is applied to Instalment 1 first, then receipts oldest first */
export function feeAccount(s) {
  const invNo = k => `INV/26/${(s.adm || s.app).slice(-5)}-${k + 1}`;
  const inv = instPlan(s).map((i, k) => ({ ...i, k, no: invNo(k), paid: 0, recs: [] }));
  const pays = payments.filter(x => x.sid === s.id).sort((a, b) => a.date.localeCompare(b.date) || a.rcpt.localeCompare(b.rcpt));
  const credit = { rcpt: s.bkRcpt, date: s.bookedOn, mode: 'Booking fee converted', amt: s.bkFee, isCredit: true };
  const apply = new Map();
  [credit, ...pays].forEach(x => {
    const parts = []; let left = x.status === 'Reversed' ? 0 : x.amt;
    for (const i of inv) { if (left <= 0) break; const room = i.amt - i.paid; if (room <= 0) continue; const a = Math.min(room, left); i.paid += a; i.recs.push({ x, a }); parts.push({ i, a }); left -= a; }
    if (left > 0) parts.push({ i: null, a: left });
    apply.set(x.rcpt, parts);
  });
  inv.forEach(i => { const bal = i.amt - i.paid, d = Math.round((Date.parse(i.due) - Date.parse(TODAY)) / 864e5); i.bal = bal; i.days = d; i.st = bal <= 0 ? 'Paid' : d < 0 ? 'Overdue' : i.paid > 0 ? 'Part paid' : d <= 7 ? 'Due soon' : 'Upcoming'; });
  return { inv, pays, apply, credit };
}

/* Total academic fee − booking fee converted = balance payable */
export function conversionTable(s, o = {}) {
  const fee = o.fee ?? s.fee, conc = o.conc ?? s.conc ?? 0, net = fee - conc;
  return table(['', R('Amount')], [
    [C.t('Total academic fee · Year 1 2026–27 (fee template)'), C.r(inr(fee))],
    ...(conc ? [[C.t('Concession · Merit scholarship'), C.r('− ' + inr(conc), { color: '#0B5E0B' })]] : []),
    [C.two('Booking fee converted · ' + s.bkRcpt + ' · ' + fd(s.bookedOn), 'Credited to Instalment 1. The booking receipt itself is unchanged.'), C.r('− ' + inr(s.bkFee), { color: '#0B5E0B' })],
  ], [C.t('Balance payable'), C.r(inr(Math.max(0, net - s.bkFee)))]);
}
export function feeHeadsTable(s) {
  return table(['Fee head', 'Type', R('Amount')], [
    [C.t('Tuition fee'), C.tag('Non-refundable'), C.r(inr(s.fee - Object.values(FIXED).reduce((a, b) => a + b, 0)))],
    ...Object.entries(FIXED).map(([k, v]) => [C.t(k), C.tag(k === 'Caution deposit' ? 'Refundable' : 'Non-refundable'), C.r(inr(v))]),
    ...(s.conc ? [[C.t('Concession · Merit scholarship'), C.chip('Approved'), C.r('− ' + inr(s.conc), { color: '#0B5E0B' })]] : []),
  ], [C.t('Total academic fee'), C.t(''), C.r(inr(s.net))]);
}
export function instTable(s, inv, go, collect) {
  return table(['Instalment', 'Due date', R('Amount'), R('Paid or credited'), R('Balance'), 'Status', R('')],
    inv.map(i => [C.two(i.n, i.k === 0 ? `${i.no} · includes booking credit ${inr(Math.min(s.bkFee, i.amt))}` : i.no), C.two(fd(i.due), i.st === 'Overdue' ? `${-i.days} days late` : i.bal > 0 && i.days >= 0 ? (i.days ? `in ${i.days} days` : 'today') : '', { subColor: i.st === 'Overdue' ? '#A12A42' : '#4B5361' }),
      C.r(inr(i.amt)), C.r(i.paid ? inr(i.paid) : '—'), C.r(i.bal > 0 ? inr(i.bal) : '—'), C.chip(i.st),
      i.bal <= 0 ? C.btn('Invoice', () => go(`admissions/invoice/${s.id}/${i.k}`), 'file') : collect ? C.btn('Collect', () => go('admissions/collect/' + s.id), 'credit-card') : C.faint('—')]),
    [C.t('Total'), C.t(''), C.r(inr(s.net)), C.r(inr(s.paid)), C.r(inr(s.due)), C.t(''), C.t('')]);
}
export function histTable(s, fa, go) {
  let run = s.net;
  const rows = [fa.credit, ...fa.pays].map(x => { if (x.status !== 'Reversed') run -= x.amt; return [
    x.isCredit ? C.link(x.rcpt, () => go('bookings/receipt/' + s.id), { tag: 'Booking fee converted' }) : C.link(x.rcpt, () => go('admissions/receipt/' + x.id)),
    C.t(fd(x.date)), C.t(x.isCredit ? 'Credit' : x.mode), C.t((fa.apply.get(x.rcpt) || []).map(({ i, a }) => i ? `${i.no} · ${inr(a)}` : `Advance ${inr(a)}`).join(', ')), C.r(inr(x.amt)), C.r(inr(Math.max(0, run)))]; });
  return table(['Receipt', 'Date', 'Mode', 'Applied to', R('Amount'), R('Balance after')], rows);
}
export function strip(s, inv) {
  const next = inv.find(i => i.bal > 0), od = inv.some(i => i.st === 'Overdue');
  return { type: 'strip', items: [
    { k: 'Payment status', chip: s.due <= 0 ? 'Fully paid' : od ? 'Overdue' : next && next.st === 'Due soon' ? 'Due soon' : 'Up to date' },
    { k: 'Total academic fee', v: inr(s.net) }, { k: 'Booking fee converted', v: '− ' + inr(s.bkFee) }, { k: 'Paid since admission', v: s.paid - s.bkFee ? inr(s.paid - s.bkFee) : '—' },
    { k: 'Balance', v: s.due > 0 ? inr(s.due) : '—' }, { k: 'Overdue', v: s.overdue ? inr(s.overdue) : '—', color: s.overdue ? '#A12A42' : '#1B1B1B' },
    { k: 'Next due', v: next ? inr(next.bal) : 'Fully paid', sub: next ? fd(next.due) : '' }] };
}
export const historyList = s => ({ type: 'list', items: s.history.map(h => ({ icon: /cancel|withdrawn/i.test(h.t) ? 'times-circle' : /refund/i.test(h.t) ? 'replay' : /payment/i.test(h.t) ? 'credit-card' : /convert/i.test(h.t) ? 'arrow-right' : 'bookmark', t: h.t, s: h.d, right: fd(h.at) })) });
