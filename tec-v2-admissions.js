/* v2 · Admissions section */
import * as D from './tec-data-v2.js';
import { C, kv, H, notice, R, table, letterhead, col, tabsOf, stageChip, historyList, feeAccount, conversionTable, feeHeadsTable, instTable, histTable, strip, progCourse, progBranch } from './tec-v2-shared.js';
const { students, payments, QUOTAS, TODAY, inr, inrS, fd, addDays, sById, instPlan, nextDue, allocate, templateFee, convertBooking, cancelRecord, recalc2, ADM_POLICY, BKG_POLICY } = D;

export const admTabs = () => null;
export const finTabs = (A, cur) => tabsOf(A, 'finance', [['', 'Fees due'], ['payments', 'Payments received', payments.length]], cur);
const admitted = () => students.filter(s => s.stage === 'Admitted');
function dueInfo(s) {
  const n = s.due > 0 ? nextDue(s) : null;
  if (!n) return { inst: '—', ndue: '', nbal: 0, dst: 'Fully paid', when: '—' };
  const d = Math.round((Date.parse(n.due) - Date.parse(TODAY)) / 864e5);
  return { inst: n.n, ndue: n.due, nbal: s.overdue || n.bal, dst: d < 0 ? 'Overdue' : d <= 7 ? 'Due this week' : 'Upcoming', when: d < 0 ? `${-d} days late` : d === 0 ? 'Today' : `in ${d} days` };
}

export function admissions(a, b, c, A, v1) {
  const go = A.go;
  if (a === 'convert') return convertPage(sById(b), A);
  if (a === 'view') return studentView(sById(b), c || 'details', A);
  if (a === 'receipt') return receipt(payments.find(x => x.id === b), A);
  if (a === 'invoice') return invoice(sById(b), +c, A);
  if (a === 'feeslip') return feeslip(sById(b), A);
  if (a === 'statement') return statement(sById(b), A);
  if (a === 'collect') {
    const n0 = payments.length, m = v1['record-payment'](b, null, null, { ...A, go: (p, o) => go(p.startsWith('receipt/') ? 'admissions/' + p : p, o) });
    const post = m.rp.post; m.rp.post = () => { post(); const p = payments[payments.length - 1]; if (payments.length > n0) { const s = sById(p.sid); recalc2(s); s.history.push({ at: TODAY, t: 'Payment received', d: `${p.rcpt} · ${inr(p.amt)} · ${p.mode}` }); } };
    m.title = 'Collect payment'; m.rp.stuOpts = m.rp.stuOpts.filter(o => sById(o.v).stage === 'Admitted');
    return m;
  }
  const acts = [{ label: 'Collect payment', icon: 'credit-card', kind: 'primary', go: () => go('admissions/collect') }];
  if (a === 'reminders') { const m = v1.notifications('campaigns', null, null, A, go); return { ...m, title: 'Admissions', tabs: admTabs(A, 'reminders'), kpis: m.kpis, actions: [{ label: 'New reminder', icon: 'plus', kind: 'primary', go: () => go('new-campaign') }] }; }
  if (a === 'documents') {
    const rows = admitted().map(s => ({ ...s, ...Object.fromEntries(Object.entries(s.docs).map(([k, v]) => ['d_' + k, v])) }));
    return { title: 'Admissions', actions: [{ label: 'Bulk upload', icon: 'upload', go: () => A.toast('Bulk upload · choose a ZIP of scanned certificates') }], tabs: admTabs(A, 'documents'),
      sheet: { rows, fKey: 'Show', opts: [['pend', 'Anything pending', r => Object.values(r.docs).includes('Pending')]], open: r => go(`admissions/view/${r.id}/documents`), cols: [
        col('adm', 'Admission no.', 150, r => C.link(r.adm)), col('name', 'Student', 190), ...Object.keys(rows[0] ? rows[0].docs : {}).map(d => col('d_' + d, d, 190, r => C.chip(r['d_' + d])))] } };
  }
  if (a === 'dues') {
    const rows = admitted().map(s => ({ ...s, ...dueInfo(s) })).sort((x, y) => (x.ndue || '9').localeCompare(y.ndue || '9'));
    const sum = st => rows.filter(r => r.dst === st).reduce((t, r) => t + r.nbal, 0), cnt = st => rows.filter(r => r.dst === st).length;
    return { title: 'Finance', actions: [{ label: 'Send reminders', icon: 'send', go: () => A.toast(`Reminders sent · SMS + WhatsApp to ${cnt('Overdue') + cnt('Due this week')} guardians`) }, ...acts], tabs: finTabs(A, ''),
      kpis: [['Overdue', '#A12A42'], ['Due this week'], ['Upcoming']].map(([st, color]) => ({ label: st, value: inrS(sum(st)), sub: cnt(st) + ' students', color, pct: sum(st) / Math.max(1, rows.reduce((t, r) => t + r.due, 0)) * 100, pctOf: 'of total outstanding', go: () => A.setSel([st]) })),
      sheet: { rows, fKey: 'Fee status', opts: ['Overdue', 'Due this week', 'Upcoming', 'Fully paid'].map(x => [x, x, r => r.dst === x]), open: r => go(`admissions/view/${r.id}/fees`), cols: [
        col('adm', 'Admission no.', 150, r => C.link(r.adm)), col('name', 'Student', 190), col('inst', 'Next instalment', 230), col('ndue', 'Due date', 130, r => C.t(r.ndue ? fd(r.ndue) : '—')),
        col('when', 'When', 140, r => C.t(r.when, { color: r.dst === 'Overdue' ? '#A12A42' : '#1B1B1B' })), col('nbal', 'Amount due', 140, r => C.r(r.nbal ? inr(r.nbal) : '—')), col('dst', 'Fee status', 150, r => C.chip(r.dst)),
        col('gm', 'Guardian mobile', 160, r => C.t('+91 ' + (r.gmobile || r.mobile))), col('act', 'Collect', 84, r => r.due > 0 ? { k: 'btns', stickyRight: true, btns: [{ icon: 'credit-card', aria: 'Collect payment from ' + r.name, kind: 'primary', go: () => go('admissions/collect/' + r.id) }] } : C.t('', { stickyRight: true }), { stickyRight: true })] } };
  }
  const rows = admitted().map(s => ({ ...s, ...dueInfo(s), pend: Object.values(s.docs).filter(v => v === 'Pending').length, fst: s.due <= 0 ? 'Fully paid' : s.overdue ? 'Overdue' : 'Up to date' }));
  return { title: 'Admissions', actions: [], tabs: admTabs(A, ''),
    sheet: { rows, fKey: 'Fee status', opts: [...['Overdue', 'Up to date', 'Fully paid'].map(x => [x, x, r => r.fst === x]), ['docs', 'Documents pending', r => r.pend > 0], ...QUOTAS.map(q => [q, q, r => r.quota === q])], open: r => go('students/' + r.id), cols: [
      col('adm', 'Admission no.', 150, r => C.link(r.adm)), col('name', 'Student', 190), col('guardian', 'Guardian', 180, r => C.two(r.guardian, r.relation || 'Guardian')), col('gmobile', 'Guardian mobile', 150, r => C.t('+91 ' + (r.gmobile || r.mobile))),
      col('progName', 'Programme', 230), col('quota', 'Quota', 130), col('cat', 'Category', 100), col('entrance', 'Entrance', 140),
      col('bookedOn', 'Booked on', 120, r => C.t(fd(r.bookedOn))), col('admittedOn', 'Admitted on', 120, r => C.t(fd(r.admittedOn))), col('bkRcpt', 'Booking receipt', 150),
      col('net', 'Total fee', 130, r => C.r(inr(r.net))), col('paid', 'Paid', 130, r => C.r(inr(r.paid))), col('due', 'Balance', 130, r => C.r(r.due ? inr(r.due) : '—')),
      col('ndue', 'Next due', 130, r => C.t(r.ndue ? fd(r.ndue) : '—')), col('overdue', 'Overdue', 130, r => r.overdue ? C.r(inr(r.overdue), { color: '#A12A42' }) : C.r('—')),
      col('fst', 'Fee status', 130, r => C.chip(r.fst)), col('pend', 'Documents', 130, r => r.pend ? { k: 'chip', text: r.pend + ' pending', tone: 'warn' } : C.chip('Verified')), col('officer', 'Handled by', 150)] } };
}

function convertPage(s, A) {
  const go = A.go;
  if (!s || s.stage !== 'Booked') return { title: 'Only open bookings can be converted', back: true };
  const cv = A.ui.cv && A.ui.cv.id === s.id ? A.ui.cv : { id: s.id }, set = o => A.setUi({ cv: { ...cv, ...o } });
  const fee = templateFee(s.prog, s.quota), conc = +String(cv.conc || '').replace(/[^\d]/g, '') || 0, net = fee - conc;
  const plan = instPlan({ net, created: TODAY, d1: TODAY }); let credit = s.bkFee;
  const planRows = plan.map(i => { const cr = Math.min(credit, i.amt); credit -= cr; return [C.t(i.n), C.t(fd(i.due)), C.r(inr(i.amt)), C.r(cr ? '− ' + inr(cr) : '—', { color: cr ? '#0B5E0B' : '#1B1B1B' }), C.r(inr(i.amt - cr))]; });
  const docs = cv.docs || s.docs;
  return { title: 'Convert to admission', crumb: [{ label: 'Bookings', go: () => go('bookings') }, { label: s.name, go: () => go('bookings/view/' + s.id) }, { label: 'Convert' }], sub: `${s.progName} · ${s.quota} · ${s.bkRcpt}`, subChip: 'Booked', form: 'convert',
    cv: {
      docs: Object.entries(docs).map(([d, v]) => ({ d, on: v !== 'Pending', onChange: e => set({ docs: { ...docs, [d]: e.target.checked ? 'Verified' : 'Pending' } }) })),
      template: `FT-26-${s.prog}-${s.quota.slice(0, 4).toUpperCase()} · ${inr(fee)}`, conc: cv.conc || '', onConc: e => set({ conc: e.target.value }),
      conversion: conversionTable(s, { fee, conc }), plan: table(['Instalment', 'Due', R('Amount'), R('Booking credit'), R('To pay')], planRows, [C.t('Total'), C.t(''), C.r(inr(net)), C.r('− ' + inr(s.bkFee)), C.r(inr(Math.max(0, net - s.bkFee)))]),
      creditNote: `The booking fee of ${inr(s.bkFee)} is used for Instalment 1 by default. The booking receipt ${s.bkRcpt} stays as it is; the conversion is logged in the audit log.`,
      confirm: () => { s.conc = conc; s.docs = docs; convertBooking(s); A.setUi({ cv: null }); A.toast(`Admission ${s.adm} issued · fee slip and receipt ready`); go(`admissions/view/${s.id}/fees`, { replace: true }); },
      cancel: () => go('bookings/view/' + s.id),
    } };
}

function studentView(s, tab, A) {
  const go = A.go;
  if (!s) return { title: 'Admission not found', back: true };
  if (s.stage !== 'Admitted') return { redirect: s.stage === 'Booked' ? 'bookings/view/' + s.id : 'cancelled/view/' + s.id };
  const fa = feeAccount(s), p = D.PROGS.find(x => x.code === s.prog);
  let rows;
  if (tab === 'details') rows = [{ cards: [{ parts: [
    H('Student'), kv([['Name', s.name], ['Date of birth', fd(s.dob)], ['Mobile', '+91 ' + s.mobile], ['Category', s.cat], ['Entrance', s.entrance]]),
    H('Guardian · seat booked by'), kv([['Name', s.guardian], ['Relation', s.relation], ['Mobile', '+91 ' + (s.gmobile || s.mobile)]]),
    H('Admission'), kv([['Admission no.', s.adm], ['Application no.', s.app], ['Booked on', fd(s.bookedOn)], ['Admitted on', fd(s.admittedOn)], ['Quota', s.quota], ['Course', progCourse(p)], ['Branch', progBranch(p)], ['Handled by', s.officer], ['Policies accepted', `Booking ${s.policy.ver}, admission ${s.policy.admVer}`]])] }] }];
  else if (tab === 'documents') rows = [{ cards: [{ title: 'Documents', parts: [{ type: 'list', items: Object.entries(s.docs).map(([d, v]) => ({ icon: 'file', t: d, s: v === 'Pending' ? 'Not received' : d.toLowerCase().replace(/ /g, '_') + '.pdf', chip: v, btn: { label: v === 'Uploaded' ? 'Verify' : v === 'Pending' ? 'Upload' : 'View', ghost: v === 'Verified', go: () => { if (v === 'Uploaded') { s.docs[d] = 'Verified'; A.toast('Document verified'); } else A.toast(v === 'Pending' ? 'Choose a file to upload' : 'Opening ' + d); } } })) }] }] }];
  else if (tab === 'payments') rows = [{ cards: [{ title: 'Payments and credits', extra: `${fa.pays.length} receipts + booking credit`, parts: [histTable(s, fa, go)] }] }];
  else if (tab === 'activity') rows = [{ cards: [{ title: 'Activity', parts: [historyList(s)] }] }];
  else rows = [
    { cards: [{ parts: [strip(s, fa.inv)] }] },
    { cards: [{ title: 'Fee conversion', parts: [conversionTable(s)] }, { title: 'Fee structure', extra: `FT-26-${s.prog}-${s.quota.slice(0, 4).toUpperCase()}`, parts: [feeHeadsTable(s)] }] },
    { cards: [{ title: 'Instalments and invoices', extra: 'Booking credit applied to Instalment 1, then receipts oldest first', action: { label: 'Statement', icon: 'file', go: () => go('admissions/statement/' + s.id) }, parts: [instTable(s, fa.inv, go, true)] }] }];
  return { title: s.name, crumb: [{ label: 'Admissions', go: () => go('admissions') }, { label: s.adm }], sub: `${s.adm} · ${s.progName} · ${s.quota}`, subChip: 'Admitted',
    actions: [{ label: 'Cancel admission', kind: 'danger', go: () => { cancelRecord(s, 'Admission cancelled at the desk'); A.toast(`Admission cancelled · refund raised under admission policy ${ADM_POLICY.ver}`); go('cancelled/view/' + s.id); } }, { label: 'Fee slip', icon: 'file', go: () => go('admissions/feeslip/' + s.id) }, { label: 'Collect payment', icon: 'credit-card', kind: 'primary', disabled: !(s.due > 0), go: () => go('admissions/collect/' + s.id) }],
    tabs: [['details', 'Details'], ['fees', 'Fee account'], ['payments', 'Payments'], ['documents', 'Documents'], ['activity', 'Activity']].map(([k, l]) => ({ label: l, on: k === tab, go: () => go(`admissions/view/${s.id}/${k}`) })), rows };
}

function receipt(p, A) {
  if (!p) return { title: 'Receipt not found', back: true };
  const s = sById(p.sid), fa = feeAccount(s);
  return { back: true, title: 'Receipt ' + p.rcpt, subChip: p.status, actions: [{ label: 'Fee slip', icon: 'file', go: () => A.go('admissions/feeslip/' + s.id) }, { label: 'Print', icon: 'print', kind: 'primary', go: () => A.toast('Sent to printer') }],
    rows: [{ paper: true, cards: [{ parts: [letterhead('FEE RECEIPT', p.rcpt, fd(p.date)),
      kv([['Received from', s.guardian], ['Student', s.name], ['Admission no.', s.adm], ['Programme', `${s.progName} · ${s.quota}`], ['Mode', p.mode], ['Reference', p.ref]]),
      table(['Applied to', R('Amount')], (fa.apply.get(p.rcpt) || [{ i: null, a: p.amt }]).map(({ i, a }) => [C.t(i ? `${i.no} · ${i.n}` : 'Advance'), C.r(inr(a))]), [C.t('Total received'), C.r(inr(p.amt))]),
      { type: 'sign', left: `Balance ${inr(s.due)}${s.nextDue ? ` · next due ${fd(s.nextDue)}` : ''}. Booking fee ${s.bkRcpt} (${inr(s.bkFee)}) already credited to Instalment 1.`, sig: p.cashier.split(' ')[0], role: 'Cashier' }] }] }] };
}
function invoice(s, k, A) {
  if (!s) return { title: 'Invoice not found', back: true };
  const i = feeAccount(s).inv[k];
  return { back: true, title: 'Invoice ' + i.no, subChip: i.st, actions: [{ label: 'Print', icon: 'print', kind: 'primary', go: () => A.toast('Sent to printer') }],
    rows: [{ paper: true, cards: [{ parts: [letterhead('FEE INVOICE', i.no, fd(i.due)), kv([['Student', s.name], ['Admission no.', s.adm], ['Due on or before', fd(i.due)]]),
      table(['Particulars', R('Amount')], [[C.t(`${i.n} · Year 1 fees 2026–27`), C.r(inr(i.amt))], ...i.recs.map(({ x, a }) => [C.t(x.isCredit ? `Booking fee converted · ${x.rcpt} · ${fd(x.date)}` : `Received · ${x.rcpt} · ${fd(x.date)}`), C.r('− ' + inr(a), { color: '#0B5E0B' })])], [C.t('Balance due'), C.r(inr(i.bal))]),
      { type: 'sign', left: '', sig: 'Accounts', role: 'Accounts in charge' }] }] }] };
}
function feeslip(s, A) {
  if (!s) return { title: 'Fee slip not found', back: true };
  const fa = feeAccount(s);
  return { back: true, title: 'Fee slip · ' + s.name, actions: [{ label: 'Send to ' + s.guardian, icon: 'send', go: () => A.toast('Fee slip sent') }, { label: 'Print', icon: 'print', kind: 'primary', go: () => A.toast('Sent to printer') }],
    rows: [{ paper: true, cards: [{ parts: [letterhead('FEE SLIP · 2026–27', s.adm, fd(TODAY)), kv([['Student', s.name], ['Admission no.', s.adm], ['Programme', `${s.progName} · ${s.quota}`], ['Guardian', s.guardian]]),
      H('Fee structure'), feeHeadsTable(s), H('Fee conversion'), conversionTable(s),
      H('Payment schedule'), table(['Instalment', 'Due', R('Amount'), R('Paid or credited'), R('Balance')], fa.inv.map(i => [C.t(i.n), C.t(fd(i.due)), C.r(inr(i.amt)), C.r(i.paid ? inr(i.paid) : '—'), C.r(inr(i.bal))]), [C.t('Total'), C.t(''), C.r(inr(s.net)), C.r(inr(s.paid)), C.r(inr(s.due))]),
      { type: 'sign', left: `Booking policy ${s.policy.ver} and admission policy ${s.policy.admVer} accepted by ${s.guardian}.`, sig: 'Accounts', role: 'Finance department' }] }] }] };
}
function statement(s, A) {
  if (!s) return { title: 'Statement not found', back: true };
  const fa = feeAccount(s);
  return { back: true, title: 'Fee statement · ' + s.name, actions: [{ label: 'Print', icon: 'print', kind: 'primary', go: () => A.toast('Sent to printer') }],
    rows: [{ paper: true, cards: [{ parts: [letterhead('FEE STATEMENT · 2026–27', s.adm, fd(TODAY)), kv([['Student', s.name], ['Admission no.', s.adm], ['Statement date', fd(TODAY)]]),
      H('Fee conversion'), conversionTable(s), H('Invoices'), table(['Invoice', 'Due', R('Amount'), R('Paid or credited'), R('Balance')], fa.inv.map(i => [C.t(i.no), C.t(fd(i.due)), C.r(inr(i.amt)), C.r(inr(i.paid)), C.r(inr(i.bal))]), [C.t('Total'), C.t(''), C.r(inr(s.net)), C.r(inr(s.paid)), C.r(inr(s.due))]),
      H('Payments and credits'), histTable(s, fa, A.go), { type: 'sign', left: '', sig: 'Accounts', role: 'Accounts in charge' }] }] }] };
}

export function finance(a, A, v1) {
  if (a === 'payments') {
    const go = A.go, rows = payments.map(p => { const s = sById(p.sid); return { ...p, name: s.name, adm: s.adm, quota: s.quota, sid: s.id }; }).sort((x, y) => y.date.localeCompare(x.date) || y.rcpt.localeCompare(x.rcpt));
    return { title: 'Finance', tabs: finTabs(A, 'payments'), actions: [{ label: 'Collect payment', icon: 'credit-card', kind: 'primary', go: () => go('admissions/collect') }],
      sheet: { rows, fKey: 'Mode', opts: D.PAY_MODES.map(m => [m, m, r => r.mode === m]), open: r => go('admissions/receipt/' + r.id), cols: [
        col('rcpt', 'Receipt no.', 160, r => C.link(r.rcpt)), col('date', 'Date', 120, r => C.t(fd(r.date))), col('name', 'Student', 190, r => C.link(r.name, () => go('students/' + r.sid))), col('adm', 'Admission no.', 150), col('quota', 'Quota', 130),
        col('mode', 'Mode', 120), col('ref', 'Reference', 180), col('amt', 'Amount', 130, r => C.r(inr(r.amt))), col('cashier', 'Recorded by', 150), col('status', 'Status', 110, r => C.chip(r.status || 'Posted'))] } };
  }
  return admissions('dues', null, null, A, v1);
}
