/* v2 · one student profile for every stage: Booked → Admitted, or Cancelled */
import * as D from './tec-data-v2.js';
import { C, kv, H, notice, R, table, stageChip, historyList, feeAccount, conversionTable, feeHeadsTable, instTable, histTable, strip, progCourse, progBranch } from './tec-v2-shared.js';
const { refunds, FIXED, TODAY, inr, fd, sById, templateFee, convertBooking, cancelRecord, refundCalc, convertsOn, daysToConvert, AUTO_DAYS, BKG_POLICY, ADM_POLICY } = D;

/* fee heads × instalments: each head is split across instalments in the same ratio; paid (booking credit first) is shared the same way */
function feePlanTable(s, fa, go) {
  const fixed = Object.values(FIXED).reduce((a, b) => a + b, 0), conc = s.conc || 0;
  const heads = [{ n: 'Tuition fee', sub: conc ? `After ${inr(conc)} concession` : '', amt: s.fee - fixed - conc }, ...Object.entries(FIXED).map(([n, amt]) => ({ n, amt }))];
  const split = (total, k) => { let left = total; return heads.map((h, j) => { const v = j === heads.length - 1 ? left : Math.round(total * h.amt / s.net / 100) * 100; left -= v; return v; })[k]; };
  const BG = '#F7F9FC', rows = [];
  heads.forEach((h, k) => {
    const subs = fa.inv.map(i => { const a = split(i.amt, k), pd = split(i.paid, k), pend = a - pd; return { i, a, pd, pend, st: pend <= 0 ? 'Paid' : i.st === 'Overdue' ? 'Overdue' : pd > 0 ? 'Part paid' : i.st === 'Due soon' ? 'Due soon' : 'Upcoming' }; });
    const pd = subs.reduce((t, x) => t + x.pd, 0), pend = h.amt - pd;
    const st = pend <= 0 ? 'Paid' : subs.some(x => x.st === 'Overdue') ? 'Overdue' : pd > 0 ? 'Part paid' : 'Upcoming';
    rows.push([h.sub ? C.two(h.n, h.sub, { weight: 600, rowBg: BG, color: '#16294B' }) : C.t(h.n, { weight: 600, rowBg: BG, color: '#16294B' }), C.t('', { rowBg: BG }), C.t('', { rowBg: BG }), C.r(inr(h.amt), { weight: 600, rowBg: BG }), C.r(pd ? inr(pd) : '—', { weight: 600, rowBg: BG, color: pd ? '#0B5E0B' : '#1B1B1B' }), C.r(pend > 0 ? inr(pend) : '—', { weight: 600, rowBg: BG }), C.chip(st, { rowBg: BG })]);
    subs.forEach(x => rows.push([C.t(x.i.n, { padL: '34px', color: '#3D4451' }), C.link(x.i.no, () => go(`admissions/invoice/${s.id}/${x.i.k}`), { icon: 'file' }), C.t(fd(x.i.due), { color: '#3D4451' }), C.r(inr(x.a)), C.r(x.pd ? inr(x.pd) : '—', { color: x.pd ? '#0B5E0B' : '#1B1B1B' }), C.r(x.pend > 0 ? inr(x.pend) : '—', { color: x.st === 'Overdue' ? '#A12A42' : '#1B1B1B' }), C.chip(x.st)]));
  });
  return table(['Fee head / instalment', 'Invoice', 'Due date', R('Amount'), R('Paid'), R('Pending'), 'Status'], rows, [C.t('Total'), C.t(''), C.t(''), C.r(inr(s.net)), C.r(inr(s.paid)), C.r(inr(s.due)), C.t('')]);
}

const secFor = (s, A) => A.role === 'Finance' ? (s.stage === 'Cancelled' ? 'cancelled' : 'finance') : stageSection(s);
export const stageSection = s => !s ? 'dashboard' : s.stage === 'Booked' ? 'bookings' : s.stage === 'Admitted' ? 'admissions' : 'cancelled';
const SEC_LABEL = { bookings: 'Bookings', admissions: 'Admissions', cancelled: 'Cancelled', finance: 'Finance' };

function tracker(s) {
  const b = { key: 'booking', n: 1, label: 'Booked', count: '', on: s.stage === 'Booked', done: s.stage !== 'Booked' };
  if (s.stage !== 'Cancelled') return [b, { key: 'admission', n: 2, label: 'Admitted', count: '', on: s.stage === 'Admitted', done: false }];
  const out = [b];
  if (s.cancelFrom === 'Admission') out.push({ key: 'admission', n: 2, label: 'Admitted', count: '', on: false, done: true });
  out.push({ key: 'cancelled', n: out.length + 1, label: s.cancelFrom === 'Booking' ? 'Booking cancelled' : s.cancelKind === 'Withdrawn' ? 'Withdrawn' : 'Admission cancelled', count: '', on: true, done: false });
  return out;
}
function bookingReceiptTable(s, go) {
  return table(['Receipt', 'Date', 'Mode', 'Reference', R('Amount')], [[C.link(s.bkRcpt, () => go('bookings/receipt/' + s.id), { tag: 'Booking fee' }), C.t(fd(s.bookedOn)), C.t(s.bkMode), C.faint(s.bkRef), C.r(inr(s.bkFee))]]);
}

export function profile(id, tab, A) {
  const s = sById(id), go = A.go;
  if (!s) return { title: 'Student not found', back: true };
  if (tab === 'cancel') return cancelPage(s, A);
  const fin = A.role === 'Finance';
  tab = (fin ? ['overview', 'fees', 'payments'] : ['overview', 'fees', 'payments', 'documents', 'history']).includes(tab) ? tab : 'overview';
  const req = (D.cancelRequests || []).find(x => x.sid === s.id && x.status === 'Pending');
  const reqNote = req ? [notice('warn', `Cancellation request ${req.no} raised by ${req.raisedBy} on ${fd(req.at)} is awaiting admin approval · refund ${inr(req.amount)}${req.manual ? ' (manual)' : ''}.`)] : [];
  const sec = secFor(s, A), p = D.PROGS.find(x => x.code === s.prog), ro = s.stage === 'Cancelled';
  const r = refunds.find(x => x.sid === s.id);
  let rows;
  if (tab === 'overview' && fin) rows = [{ cards: [{ parts: [...reqNote,
    kv([['Name', s.name], [s.adm ? 'Admission no.' : 'Booking receipt', s.adm || s.bkRcpt], ['Stage', stageChip(s)], ['Programme', s.progName], ['Quota', s.quota], ['Guardian', s.guardian], ['Guardian mobile', '+91 ' + (s.gmobile || s.mobile)]])] }] }];
  else if (tab === 'overview') rows = [{ cards: [{ parts: [...reqNote,
    ...(s.stage === 'Booked' ? [notice('info', `Becomes an admission automatically on ${fd(convertsOn(s))} unless cancelled. The booking fee then counts towards the academic fee and the family pays the rest.`)] : []),
    ...(ro ? [notice('info', 'This record is cancelled and read-only. Every change is listed under History.')] : []),
    H('Student'), kv([['Name', s.name], ['Mobile', '+91 ' + s.mobile], ['Application no.', s.app], ['Admission no.', s.adm || 'Issued on admission'], ['Handled by', s.officer]]),
    H('Guardian · seat booked by'), kv([['Name', s.guardian], ['Relation', s.relation || 'Guardian'], ['Mobile', '+91 ' + (s.gmobile || s.mobile)]]),
    H('Seat'), kv([['Quota', s.quota], ['Course', progCourse(p)], ['Branch', progBranch(p)], ['Department', s.dept]]),
    H('Booking'), kv([['Receipt', s.bkRcpt], ['Booking fee', inr(s.bkFee)], ['Paid on', fd(s.bookedOn)], ['Mode', s.bkMode], ['Reference', s.bkRef], ['Refund policy accepted', `${BKG_POLICY.ver} · ${fd(s.policy.at.slice(0, 10))} ${s.policy.at.slice(11)}`]]),
    ...(s.admittedOn ? [H('Admission'), kv([['Admitted on', fd(s.admittedOn)], ['Admission no.', s.adm], ['Admission policy', s.policy.admVer]])] : []),
    ...(ro ? [H('Cancellation'), kv([['Cancelled on', fd(s.cancelledOn)], ['Stage', s.cancelFrom === 'Booking' ? 'Booking (fee not converted)' : 'Admission (fee converted)'], ['Reason', s.reason]])] : []),
  ] }] }];
  else if (tab === 'fees') {
    if (s.stage === 'Booked') {
      const fee = templateFee(s.prog, s.quota), net = fee - (s.conc || 0);
      rows = [{ cards: [{ parts: [{ type: 'strip', items: [{ k: 'Booking fee paid', v: inr(s.bkFee), color: '#0B5E0B' }, { k: 'Academic fee · Year 1', v: inr(net) }, { k: 'To pay after admission', v: inr(Math.max(0, net - s.bkFee)) }, { k: 'Becomes admission', v: fd(convertsOn(s)) }] }] }] },
        { cards: [{ title: 'What the family will pay', parts: [conversionTable(s, { fee, conc: s.conc || 0 }), notice('info', 'The booking fee is added to the academic fee as a credit on admission and used for Instalment 1 first.')] }] }];
    } else if (ro) {
      const c = refundCalc(s);
      rows = [{ cards: [{ title: 'Refund', action: r ? { label: 'Open refund', icon: 'replay', go: () => go('cancelled/refund/' + r.id) } : null, parts: [
        table(['', R('Amount')], [[C.t(s.cancelFrom === 'Booking' ? 'Booking fee paid' : 'Fees paid (booking fee included)'), C.r(inr(c.paid))], [C.two('Deduction · ' + c.policy, c.slabText), C.r('− ' + inr(c.deduction), { color: '#A12A42' })]], [C.t('Refund due'), C.r(inr(c.amount))]),
        ...(r ? [kv([['Refund no.', r.no], ['Refund status', r.status]])] : [])] }] }];
    } else {
      const fa = feeAccount(s);
      rows = [{ cards: [{ parts: [strip(s, fa.inv)] }] },
        { cards: [{ title: 'Fees and instalments', extra: `Paid includes booking fee ${s.bkRcpt} (${inr(s.bkFee)}), used for Instalment 1 first`, action: { label: 'Statement', icon: 'file', go: () => go('admissions/statement/' + s.id) }, parts: [feePlanTable(s, fa, go)] }] }];
    }
  } else if (tab === 'payments') rows = [{ cards: [{ title: 'Payments', parts: [s.admittedOn ? histTable(s, feeAccount(s), go) : bookingReceiptTable(s, go)] }] }];
  else if (tab === 'documents') rows = [{ cards: [{ title: 'Documents', parts: [{ type: 'list', items: Object.entries(s.docs).map(([d, v]) => ({ icon: 'file', t: d, s: v === 'Pending' ? 'Not received' : d.toLowerCase().replace(/ /g, '_') + '.pdf', chip: v,
    btn: ro ? null : { label: v === 'Uploaded' ? 'Verify' : v === 'Pending' ? 'Upload' : 'View', ghost: v === 'Verified', go: () => { if (v === 'Uploaded') { s.docs[d] = 'Verified'; A.toast('Document verified'); } else A.toast(v === 'Pending' ? 'Choose a file to upload' : 'Opening ' + d); } } })) }] }] }];
  else rows = [{ cards: [{ title: 'History', parts: [historyList(s)] }] }];

  const cancelBtn = req ? { label: 'Cancellation requested', icon: 'clock', disabled: true, go: () => {} } : { label: fin ? 'Request cancellation' : (s.stage === 'Booked' ? 'Cancel booking' : 'Cancel admission'), icon: 'times', kind: 'danger', go: () => go('students/' + s.id + '/cancel') };
  const actions = fin ? (s.stage === 'Cancelled' ? [] : [{ label: 'Send reminder', icon: 'send', go: () => A.toast(`Reminder sent · SMS + WhatsApp to ${s.guardian}`) }, cancelBtn, ...(s.stage === 'Admitted' ? [{ label: 'Collect payment', icon: 'credit-card', kind: 'primary', disabled: !(s.due > 0), go: () => go('admissions/collect/' + s.id) }] : [])])
    : req && A.role === 'Admin' ? [{ label: 'Review request ' + req.no, icon: 'check-square', kind: 'primary', go: () => go('cancelled') }]
    : s.stage === 'Booked' ? [
    { label: 'Booking receipt', icon: 'print', go: () => go('bookings/receipt/' + s.id) },
    { label: 'Admit now', icon: 'arrow-right', go: () => { convertBooking(s); A.toast(`Admitted · ${s.adm} · booking fee ${inr(s.bkFee)} added to the academic fee`); go('students/' + s.id + '/fees', { replace: true }); } },
    cancelBtn]
    : s.stage === 'Admitted' ? [
      { label: 'Fee slip', icon: 'file', go: () => go('admissions/feeslip/' + s.id) },
      cancelBtn,
      { label: 'Collect payment', icon: 'credit-card', kind: 'primary', disabled: !(s.due > 0), go: () => go('admissions/collect/' + s.id) }]
      : r ? [{ label: 'Open refund', icon: 'replay', kind: 'primary', go: () => go('cancelled/refund/' + r.id) }] : [];
  return { title: s.name, crumb: [{ label: SEC_LABEL[sec], go: () => go(sec) }, { label: s.adm || s.bkRcpt }], sub: `${s.progName} · ${s.quota} · Guardian ${s.guardian}`, subChip: stageChip(s),
    actions,
    tabs: (fin ? [['overview', 'Overview'], ['fees', s.stage === 'Cancelled' ? 'Refund' : 'Fee structure'], ['payments', 'Payment history']] : [['overview', 'Overview'], ['fees', s.stage === 'Cancelled' ? 'Refund' : 'Fees'], ['payments', 'Payments'], ['documents', 'Documents'], ['history', 'History']]).map(([k, l]) => ({ label: l, on: k === tab, go: () => go(`students/${s.id}/${k}`) })),
    rows };
}

const REASONS = { Booked: ['Got a seat elsewhere', 'Family changed plans', 'Changed course preference', 'Other'], Admitted: ['Moved to an allotment college', 'Withdrawn by family', 'Did not report for classes', 'Other'] };
const num = v => +String(v || '').replace(/[^\d]/g, '') || 0;
function cancelPage(s, A) {
  const go = A.go;
  if (s.stage === 'Cancelled') return { redirect: 'students/' + s.id };
  const ui = A.ui.cx && A.ui.cx.id === s.id ? A.ui.cx : { id: s.id }, set = o => A.setUi({ cx: { ...ui, ...o } });
  const list = REASONS[s.stage], reason = ui.reason || list[0], other = reason === 'Other';
  const from = s.stage === 'Booked' ? 'Booking' : 'Admission', c = refundCalc({ ...s, cancelFrom: from, cancelKind: 'Cancelled', cancelledOn: TODAY });
  const manual = !!ui.manual, amt = manual ? num(ui.amt) : c.amount, what = s.stage === 'Booked' ? 'booking' : 'admission';
  const errs = { other: other && !(ui.otherText || '').trim() ? 'Describe the reason.' : '', amt: manual && amt > c.paid ? `Can't be more than the ${inr(c.paid)} paid.` : manual && ui.amt === undefined ? 'Enter the refund amount.' : '', why: manual && !(ui.why || '').trim() ? 'Say why the policy amount is being overridden. This is logged.' : '' };
  const show = k => ui.tried ? errs[k] : '';
  const confirm = () => {
    if (Object.values(errs).some(Boolean)) return set({ tried: true });
    if (A.role === 'Finance') { const rq = D.raiseCancelRequest(s, { reason: other ? ui.otherText.trim() : reason, manual, amount: amt, why: (ui.why || '').trim() }); A.setUi({ cx: null }); A.toast(`Cancellation request ${rq.no} sent · waiting for admin approval`); go('cancelled', { replace: true }); return; }
    const r = cancelRecord(s, other ? ui.otherText.trim() : reason);
    if (manual && amt !== r.amount) {
      r.override = { policyAmount: r.amount, why: ui.why.trim(), by: 'Anita Joseph' }; r.amount = amt; r.deduction = r.paid - amt;
      s.history.push({ at: TODAY, t: 'Refund amount overridden', d: `${r.no} · ${inr(r.override.policyAmount)} → ${inr(amt)} · ${r.override.why}` });
      D.audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' ' + new Date().toTimeString().slice(0, 5), user: 'Anita Joseph', role: 'Admin', module: 'Refunds', action: 'refund.override', record: r.no, detail: r.override.why, before: inr(r.override.policyAmount), after: inr(amt), ip: '10.12.4.1' });
    }
    A.setUi({ cx: null }); A.toast(`${what[0].toUpperCase() + what.slice(1)} cancelled · refund ${r.no} raised for ${inr(r.amount)}`); go('students/' + s.id, { replace: true });
  };
  if ((D.cancelRequests || []).some(x => x.sid === s.id && x.status === 'Pending')) return { redirect: 'students/' + s.id };
  return { title: A.role === 'Finance' ? 'Request cancellation · ' + what : 'Cancel ' + what, crumb: [{ label: SEC_LABEL[secFor(s, A)], go: () => go(secFor(s, A)) }, { label: s.name, go: () => go('students/' + s.id) }, { label: 'Cancel' }], sub: `${s.name} · ${s.progName} · ${s.quota}`, subChip: s.stage,
    actions: [{ label: 'Keep ' + what, go: () => A.back() }, { label: A.role === 'Finance' ? 'Send for approval' : 'Confirm cancellation', icon: A.role === 'Finance' ? 'send' : 'times', kind: 'danger', go: confirm }],
    rows: [{ narrow: true, cards: [{ title: 'Reason', seg: list.map(x => ({ label: x, on: x === reason, go: () => set({ reason: x }) })), parts: [
      ...(other ? [{ type: 'field', area: true, label: 'Describe the reason (required)', value: ui.otherText || '', onInput: e => set({ otherText: e.target.value }), placeholder: 'e.g. Family relocating abroad', err: show('other') }] : []),
      notice('warn', `The seat is released and this record becomes read-only. ${s.stage === 'Booked' ? `The booking fee hasn't become part of the academic fee yet, so booking policy ${BKG_POLICY.ver} applies.` : `The booking fee is already part of the academic fee, so all fees paid follow admission policy ${ADM_POLICY.ver}.`}`)] }] },
      { narrow: true, cards: [{ title: 'Refund', seg: [{ label: 'Use policy amount', on: !manual, go: () => set({ manual: false }) }, { label: 'Enter amount manually', on: manual, go: () => set({ manual: true, amt: ui.amt ?? String(c.amount) }) }], parts: [
        table(['', R('Amount')], [[C.t(from === 'Booking' ? 'Booking fee paid' : 'Fees paid (booking fee included)'), C.r(inr(c.paid))], [C.two('Deduction · ' + c.policy, c.slabText), C.r('− ' + inr(c.deduction), { color: '#A12A42' })], ...(manual ? [[C.t('Refund by policy'), C.r(inr(c.amount), { color: '#4B5361' })]] : [])], [C.t(manual ? 'Refund due · manual' : 'Refund due'), C.r(inr(amt))]),
        ...(manual ? [{ type: 'field', label: 'Refund amount (₹)', value: ui.amt ?? '', inputMode: 'numeric', maxW: '260px', onInput: e => set({ amt: e.target.value }), err: show('amt') }, { type: 'field', area: true, label: 'Reason for override (required, logged in history)', value: ui.why || '', placeholder: 'e.g. Management approved full refund on medical grounds', onInput: e => set({ why: e.target.value }), err: show('why') }] : [])] }] }] };
}
