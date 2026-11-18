/* v2 · Bookings and Cancelled sections */
import * as D from './tec-data-v2.js';
import { C, kv, H, notice, R, table, letterhead, col, tabsOf, seatStat, seatsLeft, occCell, actProgs, progCourse, progBranch, stageChip, historyList, chipColors } from './tec-v2-shared.js';
const { students, refunds, bookingReceipts, QUOTAS, PAY_MODES, TODAY, inr, inrS, fd, sById, BOOKING_FEE, BKG_POLICY, ADM_POLICY, STALE_DAYS, AUTO_DAYS, convertsOn, daysToConvert, daysSince, refundCalc, cancelRecord, newBooking, audit } = D;

export const bookTabs = (A, cur) => tabsOf(A, 'bookings', [['', 'Register', bookingReceipts.length], ['documents', 'Documents', students.filter(s => s.stage === 'Booked' && Object.values(s.docs).includes('Pending')).length], ['seats', 'Seat availability']], cur);
const old = s => daysSince(s.bookedOn) > STALE_DAYS;
function bkKpis(A) {
  const bk = students.filter(s => s.stage === 'Booked'), soon = bk.filter(s => daysToConvert(s) <= 7);
  const cap = actProgs().reduce((t, p) => t + QUOTAS.reduce((x, q) => x + (p.cap[q] || 0), 0), 0), used = students.filter(s => s.stage !== 'Cancelled').length;
  return [
    { label: 'Open bookings', value: bk.length, sub: 'seats held', pct: bk.length / cap * 100, pctOf: 'of all seats', go: () => A.go('bookings') },
    { label: 'Booking fees held', value: inrS(bk.reduce((t, s) => t + s.bkFee, 0)), sub: 'on open bookings', pct: bk.reduce((t, s) => t + s.bkFee, 0) / Math.max(1, bookingReceipts.reduce((t, r) => t + r.amt, 0)) * 100, pctOf: 'of all booking fees', go: () => { A.go('bookings'); A.setSel(['Booked']); } },
    { label: 'Becoming admissions', value: soon.length, sub: 'in the next 7 days', pct: soon.length / Math.max(1, bk.length) * 100, pctOf: 'of open bookings', go: () => { A.go('bookings'); A.setSel(['soon']); } },
    { label: 'Seats left', value: Math.max(0, cap - used), of: ' / ' + cap, sub: 'all programmes and quotas', pct: Math.max(0, cap - used) / cap * 100, pctOf: 'seats left', go: () => A.go('bookings/seats') },
  ];
}

export function bookings(a, b, c, A) {
  const go = A.go;
  if (a === 'new') return newBookingPage(A);
  if (a === 'view') return bookingView(sById(b), A);
  if (a === 'receipt') return bookingReceipt(sById(b), A);
  const acts = [{ label: 'New booking', icon: 'plus', kind: 'primary', go: () => go('bookings/new') }];
  if (a === 'fees__old') {
    const rows = bookingReceipts.map(r => { const s = sById(r.sid); return { ...r, name: s.name, quota: s.quota, prog: s.progName, st: s.stage === 'Booked' ? 'Booked' : s.stage === 'Admitted' ? 'Converted' : 'Cancelled' }; }).sort((x, y) => y.date.localeCompare(x.date));
    const sum = st => rows.filter(r => !st || r.st === st).reduce((t, r) => t + r.amt, 0), cnt = st => rows.filter(r => r.st === st).length;
    return { title: 'Bookings', actions: acts, tabs: bookTabs(A, 'fees'),
      kpis: bkKpis(A), _oldKpis: [{ label: 'Booking fees collected', value: inrS(sum()), sub: `${rows.length} receipts · 2026–27` }, { label: 'Held on open bookings', value: inrS(sum('Booked')), sub: `${cnt('Booked')} bookings not yet converted` }, { label: 'Converted to academic fee', value: inrS(sum('Converted')), sub: `${cnt('Converted')} admissions` }, { label: 'On cancelled records', value: inrS(sum('Cancelled')), sub: `${cnt('Cancelled')} records · see Cancelled` }],
      sheet: { rows, fKey: 'Now', opts: ['Booked', 'Converted', 'Cancelled'].map(x => [x, x, r => r.st === x]), open: r => go('bookings/receipt/' + r.sid), cols: [
        col('rcpt', 'Receipt no.', 150, r => C.link(r.rcpt)), col('date', 'Date', 120, r => C.t(fd(r.date))), col('name', 'Applicant', 190), col('quota', 'Quota', 130), col('prog', 'Programme', 230),
        col('mode', 'Mode', 130), col('ref', 'Reference', 180), col('amt', 'Amount', 130, r => C.r(inr(r.amt))), col('st', 'Now', 130, r => C.chip(r.st))] } };
  }
  if (a === 'documents') {
    const rows = students.filter(s => s.stage === 'Booked').map(s => ({ ...s, ...Object.fromEntries(Object.entries(s.docs).map(([k, v]) => ['d_' + k, v])), pend: Object.values(s.docs).filter(v => v === 'Pending').length }));
    const keys = Object.keys((rows[0] || {}).docs || {});
    return { title: 'Bookings', actions: [{ label: 'Bulk upload', icon: 'upload', go: () => A.toast('Bulk upload · choose a ZIP of scanned certificates') }, ...acts], tabs: bookTabs(A, 'documents'), kpis: bkKpis(A),
      sheet: { rows, fKey: 'Show', opts: [['pend', 'Anything pending', r => r.pend > 0], ['done', 'All received', r => r.pend === 0]], open: r => go('students/' + r.id + '/documents'), cols: [
        col('name', 'Applicant', 190, r => C.link(r.name)), col('bkRcpt', 'Receipt no.', 140), col('progName', 'Course / branch', 220),
        ...keys.map(d => col('d_' + d, d, 170, r => C.chip(r['d_' + d]))), col('pend', 'Pending', 110, r => C.r(r.pend || '—', { color: r.pend ? '#A12A42' : '#1B1B1B' })), col('conv', 'Becomes admission', 160, r => C.t(fd(convertsOn(r))))] } };
  }
  if (a === 'seats') {
    const PA = actProgs(), tot = q => PA.reduce((x, p) => { const s = seatStat(p, q); return { cap: x.cap + s.cap, ad: x.ad + s.ad, bk: x.bk + s.bk, used: x.used + s.used }; }, { cap: 0, ad: 0, bk: 0, used: 0 });
    return { title: 'Bookings', actions: acts, tabs: bookTabs(A, 'seats'), kpis: bkKpis(A),
      rows: [{ cards: [{ title: 'Seats by programme and quota', extra: 'A booking holds a seat until it is converted or cancelled', parts: [
        { type: 'legend', items: [{ c: '#0A3C6E', l: 'Admitted' }, { c: '#5B9BD5', l: 'Booked (seat held)' }] },
        table(['Programme', ...QUOTAS], PA.map(p => [C.two(p.name, p.code), ...QUOTAS.map(q => occCell(seatStat(p, q)))]), [C.t('All programmes'), ...QUOTAS.map(q => occCell(tot(q)))])] }] }] };
  }
  const ST = { Booked: 'Open booking', Admitted: 'Converted', Cancelled: 'Cancelled' };
  const rows = bookingReceipts.map(r => { const x = sById(r.sid); return { ...x, rcptId: r.id, bkRcpt: r.rcpt, bkFee: r.amt, bookedOn: r.date, bkMode: r.mode, now: ST[x.stage], conv: x.stage === 'Booked' ? convertsOn(x) : '', left: x.stage === 'Booked' ? daysToConvert(x) : 99 }; })
    .sort((x, y) => (x.stage === 'Booked' ? 0 : 1) - (y.stage === 'Booked' ? 0 : 1) || (x.conv || x.bookedOn).localeCompare(y.conv || y.bookedOn));
  return { title: 'Bookings', actions: acts, tabs: bookTabs(A, ''), kpis: bkKpis(A),
    sheet: { rows, fKey: 'Show', opts: [['Booked', 'Open bookings', r => r.stage === 'Booked'], ['soon', 'Becoming admissions this week', r => r.left <= 7], ['Admitted', 'Converted to admission', r => r.stage === 'Admitted'], ['Cancelled', 'Cancelled', r => r.stage === 'Cancelled'], ...QUOTAS.map(q => [q, q, r => r.quota === q])], open: r => go('students/' + r.id), cols: [
      col('name', 'Applicant', 190, r => C.link(r.name)), col('guardian', 'Guardian (booked by)', 200), col('quota', 'Quota', 130), col('progName', 'Course / branch', 240),
      col('bkRcpt', 'Receipt no.', 140, r => C.link(r.bkRcpt, () => go('bookings/receipt/' + r.id))), col('bookedOn', 'Booking date', 130, r => C.t(fd(r.bookedOn))), col('bkMode', 'Mode', 120), col('bkFee', 'Booking fee', 130, r => C.r(inr(r.bkFee))),
      col('now', 'Status', 150, r => C.chip(r.stage === 'Booked' ? 'Booked' : r.now)), col('conv', 'Becomes admission', 160, r => r.conv ? C.t(fd(r.conv)) : C.faint('—')),
      col('act', '', 110, r => r.stage === 'Booked' ? C.btn('Cancel', () => go('students/' + r.id + '/cancel'), 'times') : C.t(''))] } };
}

function bookingView(s, A) {
  const go = A.go;
  if (!s || s.stage !== 'Booked') return s ? { redirect: s.stage === 'Admitted' ? 'admissions/view/' + s.id : 'cancelled/view/' + s.id } : { title: 'Booking not found', back: true };
  const ds = daysSince(s.bookedOn);
  return { title: s.name, crumb: [{ label: 'Bookings', go: () => go('bookings') }, { label: s.bkRcpt }], sub: `${s.progName} · ${s.quota} · booked by ${s.guardian}`, subChip: 'Booked',
    actions: [{ label: 'Booking receipt', icon: 'print', go: () => go('bookings/receipt/' + s.id) }, { label: 'Cancel booking', kind: 'danger', go: () => { cancelRecord(s, 'Cancelled at the desk'); A.toast(`Booking cancelled · refund raised under booking policy ${BKG_POLICY.ver}`); go('cancelled/view/' + s.id); } }, { label: 'Convert to admission', icon: 'arrow-right', kind: 'primary', go: () => go('admissions/convert/' + s.id) }],
    rows: [
      ...(ds > STALE_DAYS ? [{ cards: [{ parts: [notice('warn', `This booking is ${ds} days old and hasn't been converted. The seat stays held until you convert or cancel it.`)] }] }] : []),
      { cards: [{ parts: [{ type: 'strip', items: [{ k: 'Stage', chip: 'Booked' }, { k: 'Booking fee paid', v: inr(s.bkFee) }, { k: 'Booked on', v: fd(s.bookedOn) }, { k: 'Days since booking', v: String(ds) }, { k: 'Seats left in quota', v: String(seatsLeft(D.PROGS.find(p => p.code === s.prog), s.quota)) }] }] }] },
      { cards: [{ title: 'Booking', parts: [
        H('Applicant'), kv([['Applicant', s.name], ['Mobile', '+91 ' + s.mobile], ['Application no.', s.app], ['Handled by', s.officer]]),
        H('Guardian · seat booked by'), kv([['Name', s.guardian], ['Relation', s.relation], ['Mobile', '+91 ' + (s.gmobile || s.mobile)]]),
        H('Seat'), kv([['Quota', s.quota], ['Course', progCourse(D.PROGS.find(p => p.code === s.prog))], ['Branch', progBranch(D.PROGS.find(p => p.code === s.prog))], ['Department', s.dept]]),
        H('Booking fee'), kv([['Receipt', s.bkRcpt], ['Amount', inr(s.bkFee)], ['Mode', s.bkMode], ['Reference', s.bkRef], ['Received by', s.bkCashier]]),
        H('Refund policy accepted'), kv([['Booking policy', BKG_POLICY.ver], ['Accepted by', s.guardian], ['Accepted at', fd(s.policy.at.slice(0, 10)) + ' · ' + s.policy.at.slice(11)]])] },
        { title: 'History', parts: [historyList(s)] }] }] };
}

function bookingReceipt(s, A) {
  if (!s) return { title: 'Receipt not found', back: true };
  return { back: true, title: 'Booking receipt ' + s.bkRcpt, subChip: s.stage === 'Admitted' ? 'Converted' : s.stage, actions: [{ label: 'Resend', icon: 'send', go: () => A.toast('Booking receipt resent to ' + s.guardian) }, { label: 'Print', icon: 'print', kind: 'primary', go: () => A.toast('Sent to printer') }],
    rows: [{ paper: true, cards: [{ parts: [letterhead('BOOKING RECEIPT', s.bkRcpt, fd(s.bookedOn)),
      kv([['Received from', `${s.guardian} · ${s.relation}`], ['Applicant', s.name], ['Programme', `${s.progName} · ${s.quota}`], ['Mode', s.bkMode], ['Reference', s.bkRef], ['Application no.', s.app]]),
      table(['Particulars', R('Amount')], [[C.t(`Booking fee · ${s.quota} quota · holds one seat`), C.r(inr(s.bkFee))]], [C.t('Total received'), C.r(inr(s.bkFee))]),
      ...(s.stage === 'Admitted' ? [notice('info', `Converted to the academic fee on ${fd(s.admittedOn)} for admission ${s.adm}. This receipt is unchanged; the credit appears on the fee account.`)] : []),
      ...(s.stage === 'Cancelled' && s.cancelFrom === 'Booking' ? [notice('bad', `Booking cancelled on ${fd(s.cancelledOn)}. Refund under booking policy ${BKG_POLICY.ver}.`)] : []),
      { type: 'sign', left: `Booking policy ${BKG_POLICY.ver} accepted by ${s.guardian} on ${fd(s.policy.at.slice(0, 10))}. The booking fee becomes part of the academic fee on admission. Computer-generated receipt.`, sig: s.bkCashier.split(' ')[0], role: 'Cashier' }] }] }] };
}

function newBookingPage(A) {
  const nb = A.ui.nb || {}, set = o => A.setUi({ nb: { ...nb, ...o } });
  const quota = nb.quota || 'Government';
  const offered = actProgs().filter(p => (p.cap[quota] || 0) > 0), courses = [...new Set(offered.map(progCourse))];
  const course = courses.includes(nb.course) ? nb.course : courses[0], branches = offered.filter(p => progCourse(p) === course);
  const p = branches.find(x => x.code === nb.prog) || branches[0], left = p ? seatsLeft(p, quota) : 0;
  const amount = nb.amount ?? String(BOOKING_FEE[quota]), amt = +String(amount).replace(/[^\d]/g, '') || 0;
  const missing = [!amt && 'booking fee amount', !nb.name && 'applicant name', !nb.guardian && 'guardian name', !nb.mobile && 'guardian mobile', !nb.accept && 'refund policy acceptance', !nb.mode && 'payment mode'].filter(Boolean);
  return { title: 'New booking', crumb: [{ label: 'Bookings', go: () => A.go('bookings') }, { label: 'New booking' }], form: 'newbook', nb: {
    quotaOpts: QUOTAS.map(q => ({ v: q, l: q })), quota, onQuota: e => set({ quota: e.target.value, course: null, prog: null, amount: null }),
    amount, onAmount: e => set({ amount: e.target.value }), feeLabel: `Booking fee (₹) · usual for ${quota}: ${inr(BOOKING_FEE[quota])}`,
    courseOpts: courses.map(c => ({ v: c, l: c })), course, onCourse: e => set({ course: e.target.value, prog: null }),
    branchOpts: branches.map(x => ({ v: x.code, l: progBranch(x) })), prog: p ? p.code : '', onProg: e => set({ prog: e.target.value }),
    seatOk: left > 0, seatText: !p ? `No course offers the ${quota} quota.` : left > 0 ? `${left} of ${p.cap[quota]} seats left in ${p.name} · ${quota}. Booking fee for this quota: ${inr(BOOKING_FEE[quota])}. This booking will hold one seat.` : `No seats left in ${p.name} · ${quota}. Booking is blocked.`,
    name: nb.name || '', onName: e => set({ name: e.target.value }), guardian: nb.guardian || '', onGuardian: e => set({ guardian: e.target.value }), mobile: nb.mobile || '', onMobile: e => set({ mobile: e.target.value }), onRelation: e => set({ relation: e.target.value }),
    policyVer: BKG_POLICY.ver, policyRows: BKG_POLICY.slabs.map(([w, r]) => ({ w, r })), accept: !!nb.accept, onAccept: e => set({ accept: e.target.checked }), acceptedAt: nb.accept ? `Recorded: policy ${BKG_POLICY.ver} · ${fd(TODAY)} ${new Date().toTimeString().slice(0, 5)}` : 'Not yet accepted',
    fee: inr(BOOKING_FEE[quota]), modes: PAY_MODES.map(m => ({ label: m, on: nb.mode === m, go: () => set({ mode: m }) })), showRef: !!nb.mode && nb.mode !== 'Cash', ref: nb.ref || '', onRef: e => set({ ref: e.target.value }),
    err: nb.tried && missing.length ? 'Still needed: ' + missing.join(', ') + '.' : '',
    submit: () => { if (missing.length || left <= 0) return set({ tried: true }); const s = newBooking({ ...nb, amount, quota, prog: p.code }); A.setUi({ nb: null }); A.toast(`Seat booked · ${s.bkRcpt} · ${inr(s.bkFee)} received · becomes an admission on ${fd(convertsOn(s))}`); A.go('students/' + s.id, { replace: true }); },
  } };
}

/* ---------- Cancelled ---------- */
const isBk = s => s.cancelFrom === 'Booking';
export function cancelled(a, b, c, A) {
  const go = A.go, admin = A.role === 'Admin';
  if (a === 'view') return cancelledView(sById(b), A);
  if (a === 'refund') return refundPage(refunds.find(r => r.id === b) || refunds.find(r => r.sid === b), A);
  if (a === 'new') {
    const rows = students.filter(s => (s.stage === 'Booked' || s.stage === 'Admitted') && !D.cancelRequests.some(r => r.sid === s.id && r.status === 'Pending')).sort((x, y) => x.name.localeCompare(y.name));
    return { title: admin ? 'Cancel a booking or admission' : 'New cancellation request', crumb: [{ label: 'Cancelled', go: () => go('cancelled') }, { label: admin ? 'New cancellation' : 'New request' }], sub: 'Search for the student, then choose ' + (admin ? 'Cancel' : 'Request'),
      sheet: { rows, noExport: true, fKey: 'Stage', opts: [['Booked', 'Booked', r => r.stage === 'Booked'], ['Admitted', 'Admitted', r => r.stage === 'Admitted']], open: r => go('students/' + r.id + '/cancel'), cols: [
        col('name', 'Name', 200, r => C.link(r.name)), col('stage', 'Stage', 120, r => C.chip(r.stage)), col('ref', 'Admission / receipt no.', 190, r => C.t(r.adm || r.bkRcpt)), col('guardian', 'Guardian', 180),
        col('progName', 'Programme', 230), col('quota', 'Quota', 130), col('paid', 'Paid so far', 130, r => C.r(inr(r.paid))),
        col('act', '', 150, r => C.btn(admin ? 'Cancel' : 'Request', () => go('students/' + r.id + '/cancel'), 'times'))] } };
  }
  const all = students.filter(s => s.stage === 'Cancelled').map(s => ({ ...s, r: refunds.find(x => x.sid === s.id) || {} })).sort((x, y) => y.cancelledOn.localeCompare(x.cancelledOn));
  const reqs = D.cancelRequests, pendReq = reqs.filter(r => r.status === 'Pending'), pendRf = all.filter(s => ['Submitted', 'Awaiting approval', 'Approved', 'Processing'].includes(s.r.status));
  const base = { title: 'Cancelled', actions: [{ label: admin ? 'Cancel a booking or admission' : 'New cancellation request', icon: 'times', kind: 'primary', go: () => go('cancelled/new') }],
    kpis: [{ label: 'Requests awaiting approval', pct: pendReq.length / Math.max(1, reqs.length) * 100, pctOf: 'of requests', value: pendReq.length, sub: inr(pendReq.reduce((t, r) => t + r.amount, 0)) + ' in refunds', go: () => go('cancelled') }, { label: 'Cancelled', pct: all.length / Math.max(1, students.length) * 100, pctOf: 'of all records', value: all.length, sub: `${all.filter(s => s.cancelFrom === 'Booking').length} bookings · ${all.filter(s => s.cancelFrom !== 'Booking').length} admissions`, go: () => go('cancelled/list') }, { label: 'Refunds pending', pct: pendRf.length / Math.max(1, all.length) * 100, pctOf: 'of cancelled', value: pendRf.length, sub: inr(pendRf.reduce((t, s) => t + (s.r.amount || 0), 0)) + ' to pay out', go: () => go('cancelled/list') }],
    tabs: tabsOf(A, 'cancelled', [['', 'Cancellation requests', pendReq.length], ['list', 'Cancelled', all.length]], a === 'list' ? 'list' : '') };
  if (a === 'list' || a === 'booking' || a === 'admission') return { ...base,
    sheet: { rows: all, fKey: 'Show', opts: [['bk', 'Cancelled bookings', r => r.cancelFrom === 'Booking'], ['ad', 'Cancelled admissions', r => r.cancelFrom !== 'Booking'], ...['Submitted', 'Awaiting approval', 'Approved', 'Processing', 'Completed', 'Rejected', 'On hold'].map(x => [x, 'Refund ' + x.toLowerCase(), r => r.r.status === x])], open: r => go('students/' + r.id), cols: [
      col('name', 'Name', 190, r => C.link(r.name)), col('cancelFrom', 'Cancelled at', 140, r => C.chip(r.cancelFrom === 'Booking' ? 'Booking' : 'Admission', { tone: r.cancelFrom === 'Booking' ? 'info' : 'bad' })), col('cancelledOn', 'Date', 120, r => C.t(fd(r.cancelledOn))), col('reason', 'Reason', 280),
      col('paid', 'Amount paid', 130, r => C.r(inr(r.paid))), col('due', 'Refund due', 130, r => C.r(inr(r.r.amount || 0))), col('rs', 'Refund status', 170, r => C.chip(r.r.status))] } };
  const rows = reqs.map(r => { const s = sById(r.sid); return { ...r, name: s.name, quota: s.quota, prog: s.progName }; }).sort((x, y) => (x.status === 'Pending' ? 0 : 1) - (y.status === 'Pending' ? 0 : 1) || y.at.localeCompare(x.at));
  const sel = (A.ui.reqSel || []).filter(id => reqs.some(r => r.id === id && r.status === 'Pending')), setSel = v => A.setUi({ reqSel: v });
  const decideIds = (ids, ok) => { const done = ids.map(id => reqs.find(x => x.id === id)).filter(r => r && r.status === 'Pending').map(r => { const rf = D.decideCancelRequest(r, ok); return { r, rf }; });
    if (!done.length) return A.toast('Tick one or more pending requests first');
    A.toast(done.length === 1 ? (ok ? `Request ${done[0].r.no} approved · ${sById(done[0].r.sid).name} cancelled · refund ${done[0].rf.no} raised` : `Request ${done[0].r.no} rejected · Finance notified`) : `${done.length} requests ${ok ? 'approved · refunds raised' : 'rejected · Finance notified'}`); setSel([]); };
  const pendIds = rows.filter(r => r.status === 'Pending').map(r => r.id), allOn = pendIds.length > 0 && pendIds.every(id => sel.includes(id));
  return { ...base,
    actions: admin ? [{ label: allOn ? 'Clear selection' : 'Select all pending', icon: allOn ? 'minus-circle' : 'check-square', go: () => setSel(allOn ? [] : pendIds) }, { label: `Reject${sel.length ? ' (' + sel.length + ')' : ''}`, icon: 'times', kind: 'danger', disabled: !sel.length, go: () => decideIds(sel, false) }, { label: `Approve${sel.length ? ' (' + sel.length + ')' : ''}`, icon: 'check', kind: 'primary', disabled: !sel.length, go: () => decideIds(sel, true) }] : base.actions,
    sheet: { rows, fKey: 'Status', opts: ['Pending', 'Approved', 'Rejected'].map(x => [x, x, r => r.status === x]), open: r => go('students/' + r.sid), cols: [
      ...(admin ? [col('sel', '', 52, r => ({ k: 'check', on: sel.includes(r.id), disabled: r.status !== 'Pending', text: 'Select ' + r.no, go: () => setSel(sel.includes(r.id) ? sel.filter(x => x !== r.id) : [...sel, r.id]) })), col('act', '', 96, r => r.status === 'Pending' ? { k: 'btns', btns: [{ icon: 'check', aria: 'Approve ' + r.no, kind: 'ok', go: () => decideIds([r.id], true) }, { icon: 'times', aria: 'Reject ' + r.no, kind: 'danger', go: () => decideIds([r.id], false) }] } : C.chip(r.status))] : []),
      col('no', 'Request no.', 140, r => C.link(r.no)), col('at', 'Raised', 120, r => C.t(fd(r.at))), col('name', 'Name', 190), col('fromStage', 'Stage', 120, r => C.chip(r.fromStage, { tone: r.fromStage === 'Booking' ? 'info' : 'ok' })), col('reason', 'Reason', 260),
      col('paid', 'Paid', 120, r => C.r(inr(r.paid))), col('amount', 'Refund requested', 170, r => r.manual ? C.two(inr(r.amount), 'Manual · policy ' + inr(r.policyAmount), { align: 'right' }) : C.r(inr(r.amount))),
      col('raisedBy', 'Raised by', 150), col('status', 'Status', 150, r => C.chip(r.status === 'Pending' ? 'Awaiting approval' : r.status))] } };
}
function cancelledView(s, A) {
  const go = A.go;
  if (!s || s.stage !== 'Cancelled') return s ? { redirect: s.stage === 'Booked' ? 'bookings/view/' + s.id : 'admissions/view/' + s.id } : { title: 'Record not found', back: true };
  const r = refunds.find(x => x.sid === s.id), c = refundCalc(s);
  return { title: s.name, crumb: [{ label: 'Cancelled', go: () => go('cancelled') }, { label: s.adm || s.bkRcpt }], sub: `${s.progName} · ${s.quota} · cancelled ${fd(s.cancelledOn)}`, subChip: stageChip(s),
    actions: [{ label: 'Print record', icon: 'print', go: () => A.toast('Sent to printer') }, ...(r ? [{ label: 'Open refund', icon: 'replay', kind: 'primary', go: () => go('cancelled/refund/' + r.id) }] : [])],
    rows: [
      { cards: [{ parts: [notice('info', 'This record is read-only. Cancelled bookings and admissions can\'t be edited; every change is in the history below.')] }] },
      { cards: [{ title: 'Record', parts: [
        kv([['Stage when cancelled', isBk(s) ? 'Booking (fee not converted)' : 'Admission (fee converted)'], ['Type', s.cancelKind], ['Cancelled on', fd(s.cancelledOn)], ['Reason', s.reason], ['Admission no.', s.adm || 'Not issued'], ['Booking receipt', s.bkRcpt], ['Guardian', `${s.guardian} · ${s.relation}`], ['Policy accepted', `Booking ${s.policy.ver}, admission ${s.policy.admVer}`]]),
        H('Refund'), table(['', R('Amount')], [[C.t(isBk(s) ? 'Booking fee paid' : `Fees paid (including booking fee ${s.bkRcpt} converted)`), C.r(inr(c.paid))], [C.two('Deduction · ' + c.policy, c.slabText), C.r('− ' + inr(c.deduction), { color: '#A12A42' })]], [C.t('Refund due'), C.r(inr(c.amount))]),
        ...(r ? [kv([['Refund no.', r.no], ['Refund status', r.status]])] : [])] },
        { title: 'Full history', parts: [historyList(s)] }] }] };
}
const FLOW = ['Submitted', 'Awaiting approval', 'Approved', 'Processing', 'Completed'];
function refundPage(r, A) {
  if (!r) return { title: 'Refund not found', back: true };
  const s = sById(r.sid), idx = FLOW.indexOf(r.status);
  const act = st => () => { const prev = r.status; r.status = st; s.history.push({ at: TODAY, t: 'Refund ' + st.toLowerCase(), d: `${r.no} · ${prev} → ${st}` }); audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' ' + new Date().toTimeString().slice(0, 5), user: 'Anita Joseph', role: 'Admin', module: 'Refunds', action: 'refund.' + st.toLowerCase().replace(/ /g, '_'), record: r.no, detail: `${prev} → ${st}`, before: prev, after: st, ip: '10.12.4.1' }); A.toast(`${r.no} → ${st} · guardian notified`); };
  const actions = r.status === 'Submitted' ? [{ label: 'Send for approval', kind: 'primary', go: act('Awaiting approval') }]
    : ['Awaiting approval', 'On hold'].includes(r.status) ? [{ label: 'Hold', go: act('On hold') }, { label: 'Reject', kind: 'danger', go: act('Rejected') }, { label: 'Approve', icon: 'check', kind: 'primary', go: act('Approved') }]
      : r.status === 'Approved' ? [{ label: 'Start payout', kind: 'primary', go: act('Processing') }] : r.status === 'Processing' ? [{ label: 'Mark completed', kind: 'primary', go: act('Completed') }] : [];
  const ov = A.ui.ov && A.ui.ov.id === r.id ? A.ui.ov : null, setOv = o => A.setUi({ ov: { ...(ov || { id: r.id }), ...o } }), num = v => +String(v || '').replace(/[^\d]/g, '') || 0;
  const canEdit = !['Completed', 'Rejected', 'Processing'].includes(r.status);
  const ovErr = ov && ov.tried ? (num(ov.amt) > r.paid ? `Can't be more than the ${inr(r.paid)} paid.` : !String(ov.amt || '').trim() ? 'Enter the refund amount.' : !(ov.why || '').trim() ? 'Say why. This is logged.' : '') : '';
  const saveOv = () => { const a = num(ov.amt); if (!String(ov.amt || '').trim() || a > r.paid || !(ov.why || '').trim()) return setOv({ tried: true });
    const before = r.amount; r.override = { policyAmount: r.override ? r.override.policyAmount : before, why: ov.why.trim(), by: 'Anita Joseph' }; r.amount = a; r.deduction = r.paid - a;
    s.history.push({ at: TODAY, t: 'Refund amount overridden', d: `${r.no} · ${inr(before)} → ${inr(a)} · ${r.override.why}` });
    audit.unshift({ id: 'a' + Date.now(), at: TODAY + ' ' + new Date().toTimeString().slice(0, 5), user: 'Anita Joseph', role: 'Admin', module: 'Refunds', action: 'refund.override', record: r.no, detail: r.override.why, before: inr(before), after: inr(a), ip: '10.12.4.1' });
    A.setUi({ ov: null }); A.toast(`Refund amount changed · ${inr(before)} → ${inr(a)} · logged`); };
  if (canEdit) { if (ov) { actions.length = 0; actions.push({ label: 'Cancel override', go: () => A.setUi({ ov: null }) }, { label: 'Save new amount', icon: 'check', kind: 'primary', go: saveOv }); } else actions.unshift({ label: 'Override amount', icon: 'pencil', go: () => setOv({ amt: String(r.amount) }) }); }
  return { back: true, title: 'Refund ' + r.no, sub: `${s.name} · ${stageChip(s)}`, subChip: r.status, actions,
    rows: [{ narrow: true, cards: [{ parts: [
      H('Workflow'), { type: 'list', items: FLOW.map((st, i) => ({ num: String(i + 1), t: st, s: i < idx || r.status === 'Completed' ? 'Done' : i === idx ? 'Current step' : '', chip: i === idx ? r.status : i < idx || r.status === 'Completed' ? 'Completed' : '', right: i > idx && r.status !== 'Completed' ? 'Not started' : '' })) },
      ...(['Rejected', 'On hold'].includes(r.status) ? [notice(r.status === 'Rejected' ? 'bad' : 'warn', `This refund is ${r.status.toLowerCase()}.`)] : []),
      H('Calculation · ' + r.policy), table(['', R('Amount')], [[C.t('Amount paid'), C.r(inr(r.paid))], [C.two(r.override ? 'Deduction · manual override' : 'Deduction', r.override ? `Policy amount was ${inr(r.override.policyAmount)} · ${r.override.why}` : r.slabText), C.r('− ' + inr(r.deduction), { color: '#A12A42' })]], [C.t('Refund payable'), C.r(inr(r.amount))]),
      ...(ov ? [H('Override refund amount'), { type: 'field', label: 'Refund amount (₹)', value: ov.amt ?? '', inputMode: 'numeric', maxW: '260px', onInput: e => setOv({ amt: e.target.value }) }, { type: 'field', area: true, label: 'Reason for override (required, logged)', value: ov.why || '', placeholder: 'e.g. Approved by the Principal', onInput: e => setOv({ why: e.target.value }), err: ovErr }] : []),
      H('Details'), kv([['Reason', r.reason], ['Raised by', `${r.raisedBy} · ${fd(r.raised)}`], ['Approval mode', r.mode], ['Pay to', s.guardian], ['Bank account', `XXXXXXXX${s.mobile.slice(-4)}`]])] }] }] };
}
