/* v2 router: Bookings · Admissions · Cancelled, plus Dashboard, Reports, Audit log, Settings */
import * as D from './tec-data-v2.js';
import { PAGES as V1, CAMPAIGNS } from './tec-model.js';
import { C, kv, H, notice, R, table, col, tabsOf, seatStat, occCell, actProgs, chipColors, letterhead } from './tec-v2-shared.js';
import { bookings, cancelled } from './tec-v2-sections.js';
import { admissions, finance } from './tec-v2-admissions.js';
import { profile, stageSection } from './tec-v2-profile.js';
export { D, chipColors };
const { students, payments, refunds, bookingReceipts, QUOTAS, TODAY, inr, inrS, fd, fdShort, addDays, STALE_DAYS, AUTO_DAYS, convertsOn, daysToConvert, daysSince, BOOKING_FEE, BKG_POLICY, ADM_POLICY, STAGES } = D;

export function normalize(path) {
  const p = (path || '').replace(/^#/, '').replace(/\?stage=(booking|admission)/, '/$1');
  const [a, b, c, d] = p.split('/');
  const R1 = {
    '': 'dashboard', payments: b === 'students' || !b || b === 'daybook' ? 'finance' : b === 'refunds' ? 'cancelled' : b === 'student' ? `admissions/view/${c}/${d === 'history' ? 'payments' : 'fees'}` : null,
    notifications: !b || b === 'campaigns' ? 'campaigns' : `settings/messaging/${b}`,
    receipt: `admissions/receipt/${b}`, invoice: `admissions/invoice/${b}/${c}`, feeslip: `admissions/feeslip/${b}`, statement: `admissions/statement/${b}`,
    'record-payment': 'admissions/collect' + (b ? '/' + b : ''), refund: `cancelled/refund/${b}`,
  };
  if (a === 'audit' || a === 'audit-event') return 'dashboard';
  if (a === 'admissions' && b === 'reminders') return 'campaigns';
  if (a === 'bookings' && b === 'fees') return 'bookings';
  if (a === 'reports' && b === 'list') return 'reports';
  if (a === 'admissions' && b === 'dues') return 'finance';
  if (a === 'admissions' && (b === 'documents' || b === 'docs')) return 'bookings/documents';
  if ((a === 'bookings' || a === 'cancelled') && b === 'view' && c) return 'students/' + c;
  if (a === 'admissions' && b === 'view' && c) return 'students/' + c + '/' + ({ finance: 'fees', details: 'overview', activity: 'history' }[d] || d || 'overview');
  if (a in R1 && R1[a]) return R1[a];
  if (a === 'admissions') {
    if (b === 'new') return 'bookings/new';
    if (b === 'register') return 'admissions';
    if (b === 'docs') return 'bookings/documents';
    if (b === 'booking') return 'bookings';
    if (b === 'admission') return 'admissions';
    if (b === 'cancelled') return 'cancelled';
    if (b === 'view' && c === 'finance') return `admissions/view/${c}/fees`;
    if (b === 'view' && d === 'finance') return `admissions/view/${c}/fees`;
  }
  return p;
}
export const isOverlay = path => { const [a, b] = path.split('/'); return ['report', 'audit-event', 'campaign', 'new-campaign'].includes(a) || ['receipt', 'invoice', 'feeslip', 'statement', 'collect', 'refund'].includes(b); };
export const sectionOf = path => { const [a, b] = path.split('/'); if (a === 'students') return stageSection(D.sById(b)); return { admset: 'settings', report: 'reports', 'audit-event': 'audit', campaign: 'campaigns', 'new-campaign': 'campaigns' }[a] || a; };

export function build(path, A) {
  for (let n = 0; n < 4; n++) {
    path = normalize(path);
    const [a, b, c, d] = path.split('/');
    D.runAutoConvert();
    const P = { account: () => accountPage(A), finance: () => finance(b, A, V1), report: () => reportPage(decodeURIComponent(b || ''), A), campaigns: () => campaigns(b, A), students: () => profile(b, c, A), bookings: () => bookings(b, c, d, A), admissions: () => admissions(b, c, d, A, V1), cancelled: () => cancelled(b, c, d, A), dashboard: () => dashboard(A), reports: () => reports(b, A), settings: () => settings(b, c, A), admset: () => admset(b, c, A) }[a];
    const m = P ? P() : V1[a] ? V1[a](b, c, d, A, A.go, A.back) : null;
    if (m && m.redirect) { path = m.redirect; continue; }
    if (m) m.path = path;
    return m;
  }
  return null;
}

/* ---------- Dashboard ---------- */
const SECS = [['all', 'All sections'], ['bookings', 'Bookings'], ['admissions', 'Admissions'], ['cancelled', 'Cancelled']];
function lineChart(days, series, fmt, aria) {
  const nice = v => { if (v <= 4) return 4; const mag = Math.pow(10, Math.floor(Math.log10(v))), n = v / mag; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag; };
  const max = nice(Math.max(1, ...series.flatMap(s => s.vals))), step = 1000 / (days.length - 1), cl = y => Math.min(300, Math.max(0, y));
  const path = vals => { const pts = vals.map((v, i) => [i * step, 300 - v / max * 300]); let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${cl(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${cl(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; } return d; };
  const every = Math.ceil(days.length / 10);
  return { type: 'line', aria, grid: [0, 75, 150, 225, 300].map(y => `M0,${y} H1000`).join(' '), yTicks: [4, 3, 2, 1, 0].map(k => ({ l: fmt(max * k / 4) })), xLabels: days.filter((_, i) => i % every === 0 || i === days.length - 1).map(d => ({ l: fdShort(d) })),
    series: series.map(s => ({ name: s.name, color: s.color, total: s.total })), s1d: series[0] ? path(series[0].vals) : '', s1c: series[0] ? series[0].color : 'none', s2d: series[1] ? path(series[1].vals) : '', s2c: series[1] ? series[1].color : 'none' };
}
function dashboard(A) {
  if (A.role === 'Finance') return financeDashboard(A);
  const go = A.go;
  const bk = students.filter(s => s.stage === 'Booked'), ad = students.filter(s => s.stage === 'Admitted'), cx = students.filter(s => s.stage === 'Cancelled');
  const soon = bk.filter(s => daysToConvert(s) <= 7), odS = ad.filter(s => s.overdue > 0), od = odS.reduce((t, s) => t + s.overdue, 0);
  const net = ad.reduce((t, s) => t + s.net, 0), coll = ad.reduce((t, s) => t + s.paid, 0), out = ad.reduce((t, s) => t + s.due, 0);
  const reqs = (D.cancelRequests || []).filter(r => r.status === 'Pending'), rfPend = refunds.filter(r => ['Submitted', 'Awaiting approval', 'Approved', 'Processing'].includes(r.status));
  const cap = actProgs().reduce((t, p) => t + QUOTAS.reduce((x, q) => x + (p.cap[q] || 0), 0), 0), docsPend = ad.filter(s => Object.values(s.docs).includes('Pending')).length;
  const tiles = [
    { icon: 'bookmark', title: 'Booking', bg: '#0F6CBD', shadow: 'rgba(15,108,189,.25)', stat: bk.length + ad.length, of: ' / ' + cap, statLabel: 'seats filled', pct: (bk.length + ad.length) / cap * 100, pctOf: 'of seats filled', sub: `${bk.length} open bookings · ${soon.length} become admissions this week`, cta: 'Book a seat', go: () => go('bookings/new') },
    { icon: 'id-card', title: 'Admission', bg: '#0B6B3A', shadow: 'rgba(11,107,58,.25)', stat: inrS(coll), statLabel: 'fees collected of ' + inrS(net), pct: coll / Math.max(1, net) * 100, pctOf: 'of fees collected', sub: `${ad.length} admitted · ${docsPend} with documents pending`, cta: 'Open admissions', go: () => go('admissions') },
    { icon: 'wallet', title: 'Finance', bg: '#9A5B00', shadow: 'rgba(154,91,0,.25)', stat: inrS(od), statLabel: `overdue from ${odS.length} students`, pct: od / Math.max(1, out) * 100, pctOf: 'of outstanding is overdue', sub: `${inrS(out)} outstanding in total`, cta: 'Collect payment', go: () => go('finance') },
    { icon: 'times-circle', title: 'Cancellation', bg: '#A12A42', shadow: 'rgba(161,42,66,.25)', stat: inrS(rfPend.reduce((t, r) => t + r.amount, 0)), statLabel: `refunds to pay · ${rfPend.length} refunds`, sub: `${reqs.length} requests awaiting approval · ${cx.length} cancelled`, cta: reqs.length ? 'Review requests' : 'Open cancellations', go: () => go('cancelled') },
  ];
  const kpis = [];
  const days = [...Array(30)].map((_, i) => addDays(TODAY, i - 29));
  const s1 = days.map(d => payments.filter(p => p.date === d).reduce((t, p) => t + p.amt, 0)), s2 = days.map(d => bookingReceipts.filter(r => r.date === d).reduce((t, r) => t + r.amt, 0));
  const line = lineChart(days, [{ name: 'Academic fees', color: '#0A3C6E', vals: s1, total: inrS(s1.reduce((a, b) => a + b, 0)) }, { name: 'Booking fees', color: '#5B9BD5', vals: s2, total: inrS(s2.reduce((a, b) => a + b, 0)) }], v => inrS(v), 'Money received per day');
  const seg = [['Admitted', ad.length, '#0A3C6E'], ['Booked', bk.length, '#5B9BD5'], ['Seats left', Math.max(0, cap - ad.length - bk.length), '#E1E5EB']];
  let acc = 0; const grad = 'conic-gradient(' + seg.map(([, v, c]) => { const a = acc / cap * 360, b = (acc += v) / cap * 360; return `${c} ${a}deg ${b}deg`; }).join(',') + ')';
  const att = [
    ...reqs.slice(0, 3).map(r => { const s = D.sById(r.sid); return { icon: 'inbox', t: `Cancellation request · ${s.name}`, s: `${r.no} · ${r.raisedBy} · refund ${inr(r.amount)}`, chip: 'Awaiting approval', go: () => go('cancelled') }; }),
    ...[...odS].sort((a, b) => b.overdue - a.overdue).slice(0, 3).map(s => ({ icon: 'exclamation-circle', t: s.name, s: `${s.adm} · ${inr(s.overdue)} overdue`, chip: 'Overdue', go: () => go('students/' + s.id + '/fees') })),
    ...[...soon].sort((a, b) => daysToConvert(a) - daysToConvert(b)).slice(0, 2).map(s => ({ icon: 'bookmark', t: s.name, s: `Becomes an admission on ${fd(convertsOn(s))} · ${s.bkRcpt}`, chip: 'Due soon', go: () => go('students/' + s.id) })),
  ];
  const mod = mm => mm === 'Payments' ? 'credit-card' : mm === 'Refunds' ? 'replay' : mm === 'Admissions' ? 'id-card' : mm === 'Bookings' ? 'bookmark' : mm === 'Cancellations' ? 'times-circle' : 'shield';
  const act = D.audit.slice(0, 7).map(a => ({ icon: mod(a.module), t: a.detail, s: `${a.user} · ${fdShort(a.at.slice(0, 10))} ${a.at.slice(11)}`, right: a.module }));
  return { title: 'Dashboard', tiles, kpis,
    rows: [{ cards: [
      { title: 'Money received', sub: 'Rupees per day · last 30 days', span: 2, parts: [line] },
      { title: 'Seat occupancy', sub: cap + ' seats across all programmes', parts: [{ type: 'donut', grad, center: Math.round((ad.length + bk.length) / cap * 100) + '%', centerSub: 'filled', aria: 'Seat occupancy', items: seg.map(([l, v, c]) => ({ c, l, v, pct: Math.round(v / cap * 100) + '%' })) }] },
      { title: 'Needs attention', sub: att.length + ' items', span: 2, parts: [att.length ? { type: 'list', items: att } : { type: 'empty', text: 'Nothing needs attention right now.' }] },
      { title: 'Recent activity', parts: [{ type: 'list', items: act }] }] }] };
}

/* ---------- Reports ---------- */
const REPS = { bookings: ['Bookings register', 'Booking fees collected', 'Seat availability', 'Bookings becoming admissions this week'], admissions: ['Admissions register', 'Fee collection register', 'Outstanding dues by student', 'Overdue instalments ageing', 'Booking fee conversion ledger'], cancelled: ['Cancellations register', 'Refund register', 'Refunds pending approval', 'Caution deposit liability'] };
function reports(a, A) {
  const go = A.go, sec = ['bookings', 'admissions', 'cancelled'].includes(a) ? a : 'all', tab = a === 'list' ? 'list' : 'charts';
  const base = { title: 'Analytics', tabsFirst: true, tabs: tabsOf(A, 'reports', [['', 'Overview'], ['bookings', 'Bookings'], ['admissions', 'Admissions'], ['cancelled', 'Cancellations']], a || '') };
  if (tab === 'list') return reports('', A);
  if (false) {
    const list = Object.entries(REPS).flatMap(([k, rs]) => rs.map(r => ({ r, k })));
    return { ...base, kpis: reports('', A).kpis, rows: [{ cards: [{ title: list.length + ' reports', sub: 'Open a report to filter by dates, quota, programme and status, then download', parts: [table(['Report', 'Section', 'Formats', R('')], list.map(x => [C.link(x.r, () => go('report/' + encodeURIComponent(x.r)), { icon: 'file-excel' }), C.tag(x.k === 'cancelled' ? 'Cancellations' : x.k[0].toUpperCase() + x.k.slice(1)), C.faint('Excel · CSV · PDF'), C.btn('Open', () => go('report/' + encodeURIComponent(x.r)))]))] }] }] };
  }
  const PA = actProgs(), show = k => sec === 'all' || sec === k, cards = [];
  const nice = v => { if (v <= 4) return 4; const mag = Math.pow(10, Math.floor(Math.log10(v))), n = v / mag; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag; };
  const smooth = pts => { if (!pts.length) return ''; let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; const c1 = [p1[0] + (p2[0] - p0[0]) / 6, Math.min(300, Math.max(0, p1[1] + (p2[1] - p0[1]) / 6))], c2 = [p2[0] - (p3[0] - p1[0]) / 6, Math.min(300, Math.max(0, p2[1] - (p3[1] - p1[1]) / 6))]; d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; } return d; };
  const line = (days, series, fmt, aria) => {
    const max = nice(Math.max(1, ...series.flatMap(s => s.vals))), step = 1000 / (days.length - 1);
    const path = vals => smooth(vals.map((v, i) => [i * step, 300 - v / max * 300]));
    const every = Math.ceil(days.length / 10);
    return { type: 'line', aria, grid: [0, 75, 150, 225, 300].map(y => `M0,${y} H1000`).join(' '), yTicks: [4, 3, 2, 1, 0].map(k => ({ l: fmt(max * k / 4) })),
      xLabels: days.filter((_, i) => i % every === 0 || i === days.length - 1).map(d => ({ l: fdShort(d) })),
      series: series.map(s => ({ name: s.name, color: s.color, total: s.total })), s1d: series[0] ? path(series[0].vals) : '', s1c: series[0] ? series[0].color : 'none', s2d: series[1] ? path(series[1].vals) : '', s2c: series[1] ? series[1].color : 'none' };
  };
  const hbars = (items, fmt, color) => { const max = nice(Math.max(1, ...items.map(i => i.v))); return { type: 'hbars', items: items.map(i => ({ label: i.label, title: i.title || '', val: fmt(i.v), w: (i.v / max * 100) + '%', c: color })), ticks: [0, 1, 2, 3, 4].map(k => ({ l: fmt(max * k / 4) })) }; };
  const donut = (title, sub, parts, center, centerSub) => { const tot = parts.reduce((t, p) => t + p.v, 0) || 1; let acc = 0; const stops = parts.map(p => { const a = acc / tot * 360, b = (acc += p.v) / tot * 360; return `${p.c} ${a}deg ${b}deg`; }); return { title, sub, parts: [{ type: 'donut', grad: `conic-gradient(${stops.join(',')})`, center, centerSub, aria: title + ': ' + parts.map(p => p.l + ' ' + p.v).join(', '), items: parts.map(p => ({ c: p.c, l: p.l, v: p.fmt || p.v, pct: Math.round(p.v / tot * 100) + '%' })) }] }; };
  const PAL = ['#0A3C6E', '#1783C1', '#5B9BD5', '#A2CDE6'];
  const days = [...Array(30)].map((_, i) => addDays(TODAY, i - 29)), count = (list, key) => days.map(d => list.filter(x => x[key] === d).length);
  const bkAll = students.filter(s => s.bookedOn), adAll = students.filter(s => s.admittedOn);
  /* KPIs */
  const bk = students.filter(s => s.stage === 'Booked'), ad = students.filter(s => s.stage === 'Admitted');
  const cap = PA.reduce((t, p) => t + QUOTAS.reduce((x, q) => x + (p.cap[q] || 0), 0), 0);
  const coll = ad.reduce((t, s) => t + s.paid, 0), net = ad.reduce((t, s) => t + s.net, 0), pend = refunds.filter(r => ['Submitted', 'Awaiting approval', 'Approved', 'Processing'].includes(r.status));
  const kpis = [
    { label: 'Seats filled', value: bk.length + ad.length, of: ' / ' + cap, pct: (bk.length + ad.length) / cap * 100, pctOf: 'of seats', sub: `${ad.length} admitted · ${bk.length} booked` },
    { label: 'Booking fees held', value: inrS(bk.reduce((t, s) => t + s.bkFee, 0)), sub: `${bk.length} open bookings`, pct: bk.reduce((t, s) => t + s.bkFee, 0) / Math.max(1, bookingReceipts.reduce((t, r) => t + r.amt, 0)) * 100, pctOf: 'of booking fees' },
    { label: 'Fees collected', value: inrS(coll), pct: net ? coll / net * 100 : 0, pctOf: 'of assessed', sub: `${net ? Math.round(coll / net * 100) : 0}% of ${inrS(net)} · ${inrS(net - coll)} outstanding` },
    { label: 'Refunds pending', value: pend.length, pct: pend.length / Math.max(1, refunds.length) * 100, pctOf: 'of refunds', sub: inr(pend.reduce((t, r) => t + r.amount, 0)) + ' to pay out' },
  ];
  if (show('bookings') || show('admissions')) {
    const series = [...(show('bookings') ? [{ name: 'Bookings', color: '#5B9BD5', vals: count(bkAll, 'bookedOn') }] : []), ...(show('admissions') ? [{ name: 'Admissions', color: '#0A3C6E', vals: count(adAll, 'admittedOn') }] : [])].map(s => ({ ...s, total: s.vals.reduce((a, b) => a + b, 0) }));
    cards.push({ title: 'Bookings and admissions', sub: 'Both are counts of students, so they share one axis · last 30 days', span: 2, parts: [line(days, series, v => String(Math.round(v)), 'Bookings and admissions per day')] });
    const top = PA.map(p => ({ label: p.code, title: p.name, v: students.filter(s => s.prog === p.code && (show('admissions') ? s.stage === 'Admitted' : s.stage === 'Booked')).length })).filter(x => x.v).sort((a, b) => b.v - a.v).slice(0, 6);
    cards.push({ title: 'Top programmes by ' + (show('admissions') ? 'admissions' : 'bookings'), sub: top.length + ' programmes with activity', parts: [hbars(top, v => String(Math.round(v * 10) / 10), '#1783C1')] });
  }
  if (show('bookings') || show('admissions')) {
    const series = [...(show('admissions') ? [{ name: 'Academic fees', color: '#0A3C6E', vals: days.map(d => payments.filter(p => p.date === d).reduce((t, p) => t + p.amt, 0)) }] : []), ...(show('bookings') ? [{ name: 'Booking fees', color: '#5B9BD5', vals: days.map(d => bookingReceipts.filter(r => r.date === d).reduce((t, r) => t + r.amt, 0)) }] : [])].map(s => ({ ...s, total: inrS(s.vals.reduce((a, b) => a + b, 0)) }));
    cards.push({ title: 'Money received', sub: 'Rupees per day · last 30 days', span: 2, parts: [line(days, series, v => inrS(v), 'Money received per day')] });
    const grp = show('admissions') ? ad : bk;
    cards.push(donut(show('admissions') ? 'Admissions by quota' : 'Open bookings by quota', grp.length + (show('admissions') ? ' admitted students' : ' open bookings'), QUOTAS.map((q, i) => ({ l: q, v: grp.filter(s => s.quota === q).length, c: PAL[i] })), grp.length, show('admissions') ? 'admitted' : 'booked'));
  }
  if (show('admissions')) {
    const it = PA.map(p => { const x = ad.filter(s => s.prog === p.code); return { label: p.code, title: p.name, v: x.reduce((t, s) => t + s.due, 0) }; }).filter(x => x.v).sort((a, b) => b.v - a.v).slice(0, 6);
    cards.push({ title: 'Outstanding fees by programme', sub: 'Balance still to be paid by admitted students', span: 2, parts: [hbars(it, v => inrS(v), '#0A3C6E')] });
  }
  if (show('cancelled')) {
    const st = ['Submitted', 'Awaiting approval', 'Approved', 'Processing', 'Completed', 'Rejected', 'On hold'], SCOL = ['#C9CFD8', '#E0A33A', '#5B9BD5', '#1783C1', '#0B5E0B', '#A12A42', '#8A94A6'];
    cards.push(donut('Refunds by status', refunds.length + ' refunds raised', st.map((x, i) => { const rs = refunds.filter(r => r.status === x); return { l: x, v: rs.length, c: SCOL[i], fmt: rs.length + ' · ' + inr(rs.reduce((t, r) => t + r.amount, 0)) }; }).filter(x => x.v), refunds.length, 'refunds'));
    const cx = students.filter(s => s.stage === 'Cancelled');
    const series = [{ name: 'Admissions cancelled', color: '#A12A42', vals: days.map(d => cx.filter(s => s.cancelledOn === d && s.cancelFrom !== 'Booking').length) }, { name: 'Bookings cancelled', color: '#E8AAB7', vals: days.map(d => cx.filter(s => s.cancelledOn === d && s.cancelFrom === 'Booking').length) }].map(s => ({ ...s, total: s.vals.reduce((a, b) => a + b, 0) }));
    cards.push({ title: 'Cancellations', sub: 'Counts of students · last 30 days', span: 2, parts: [line(days, series, v => String(Math.round(v)), 'Cancellations per day')] });
  }
  return { ...base, kpis, rows: [{ cards }] };
}

/* ---------- Settings ---------- */
const addMessaging = (m, cur) => { if (!m.subnav) return m; const i = m.subnav.findIndex(n => n.head === 'Admission'); const item = { label: 'Messaging', on: cur, go: () => m._A.go('settings/messaging') }; m.subnav.splice(i < 0 ? m.subnav.length : i, 0, item); return m; };
function settings(b, c, A) {
  if (b === 'messaging') {
    const tab = ['events', 'log', 'templates'].includes(c) ? c : 'events';
    const v = V1.notifications(tab, null, null, A, A.go), host = V1.admset('seats', null, null, A);
    const m = { settings: true, subnav: host.subnav.map(n => ({ ...n, on: false })), setTitle: 'Messaging', setActions: tab === 'templates' ? v.actions : [], tabs: tabsOf(A, 'settings/messaging', [['events', 'Events & channels'], ['log', 'Delivery log'], ['templates', 'Templates']], tab), sheet: v.sheet, rows: v.rows, _A: A };
    return addMessaging(m, true);
  }
  if (b === 'branding') {
    const host = V1.settings('branding', null, null, A, A.go);
    const tabs = tabsOf(A, 'settings/branding', [['', 'Brand'], ['layouts', 'Document layouts']], c === 'layouts' ? 'layouts' : '');
    if (c !== 'layouts') return addMessaging({ ...host, _A: A, tabs }, false);
    const pay = payments.find(p => p.amt > 0) || payments[0], adm = D.sById(pay.sid), bk = students.find(s => s.stage === 'Booked') || adm, rf = refunds[0];
    const DOCS = [['receipt', 'Fee receipt', 'admissions/receipt/' + pay.id, 'A5 landscape'], ['booking', 'Booking receipt', 'bookings/receipt/' + bk.id, 'A5 landscape'], ['invoice', 'Invoice', `admissions/invoice/${adm.id}/1`, 'A4 portrait'], ['feeslip', 'Fee structure', 'admissions/feeslip/' + adm.id, 'A4 portrait'], ['statement', 'Fee statement', 'admissions/statement/' + adm.id, 'A4 portrait'], ['refund', 'Refund form', rf ? 'refund-form' : '', 'A4 portrait']].filter(d => d[2]);
    const cur = DOCS.find(d => d[0] === A.ui.layoutDoc) || DOCS[0];
    const rfs = rf && D.sById(rf.sid);
    const page = cur[0] === 'refund' ? { rows: [{ paper: true, cards: [{ parts: [letterhead('REFUND REQUEST FORM', rf.no, fd(rf.raised)),
      kv([['Student', rfs.name], [rfs.adm ? 'Admission no.' : 'Booking receipt', rfs.adm || rfs.bkRcpt], ['Programme', rfs.progName + ' · ' + rfs.quota], ['Guardian', rfs.guardian + ' · ' + (rfs.relation || 'Guardian')], ['Reason', rf.reason], ['Pay to', 'A/c XXXXXXXX' + rfs.mobile.slice(-4) + ' · ' + rfs.guardian]]),
      H('Refund calculation · ' + rf.policy), table(['', R('Amount')], [[C.t('Amount paid'), C.r(inr(rf.paid))], [C.two('Deduction', rf.slabText), C.r('− ' + inr(rf.deduction))]], [C.t('Refund payable'), C.r(inr(rf.amount))]),
      { type: 'sign', left: `I, ${rfs.guardian}, request a refund of ${inr(rf.amount)} under the accepted refund policy. Signature of guardian: ____________________`, sig: 'Principal', role: 'Approved by' }] }] }] } : (build(cur[2], { ...A, go: () => {}, toast: () => {} }) || { rows: [] });
    const paper = (page.rows || []).find(r => r.paper || r.narrow) || page.rows[0] || { cards: [] };
    const allOpt = A.ui.layoutOpt || {}, opt = allOpt[cur[0]] || {}, on = k => opt[k] ?? (k !== 'qr'), tog = k => () => A.setUi({ layoutOpt: { ...allOpt, [cur[0]]: { ...opt, [k]: !on(k) } } });
    const OPTS = [['logo', 'College logo and name'], ['address', 'Address and affiliation line'], ['qr', 'Verification link'], ['sign', 'Signature block'], ['footer', 'Receipt footer note']];
    return addMessaging({ ...host, _A: A, form: null, tabs, setActions: [{ label: 'Reset to default', icon: 'refresh', go: () => A.setUi({ layoutOpt: { ...allOpt, [cur[0]]: {} } }) }, { label: 'Save layout', icon: 'check', kind: 'primary', go: () => A.toast(`${cur[1]} layout saved · used for all new documents`) }],
      rows: [{ cards: [{ title: 'Document', seg: DOCS.map(d => ({ label: d[1], on: d === cur, go: () => A.setUi({ layoutDoc: d[0] }) })), extra: 'Paper ' + cur[3] + ' · Thejus letterhead', parts: [
        { type: 'list', items: OPTS.map(([k, l]) => ({ icon: on(k) ? 'eye' : 'eye-slash', t: l, s: on(k) ? 'Shown on ' + cur[1].toLowerCase() : 'Hidden', chip: on(k) ? 'Shown' : 'Hidden', btn: { label: on(k) ? 'Hide' : 'Show', go: tog(k) } })) }] }] },
        { paper: true, cards: [{ title: 'Preview · ' + cur[1], extra: 'Sample data', parts: (paper.cards[0] ? paper.cards[0].parts : []).filter(p => on('sign') || p.type !== 'sign').map(p => p.type === 'letterhead' ? { ...p, showLogo: on('logo'), showAddr: on('address') } : p.type === 'sign' ? { ...p, showLeft: on('footer'), showQr: on('qr') } : p) }] }] }, false);
  }
  const m = V1.settings(b, c, null, A, A.go); m._A = A;
  if (m.roles) m.roles = [['Bookings · create booking, take booking fee', 'y,y'], ['Bookings · convert to admission', 'y,y'], ['Bookings · cancel booking', 'y,y'], ['Admissions · edit student details', 'y,n'], ['Admissions · collect payment, fee account', 'y,y'], ['Admissions · reminders and documents', 'y,n'], ['Cancelled · view records', 'y,y'], ['Cancelled · approve refund', 'y,n'], ['Cancelled · execute refund', 'y,c:After approval'], ['Reports', 'y,y'], ['Settings · seat matrix, form, numbering', 'y,n'], ['Settings · fee setup and booking fee', 'y,y'], ['Users and roles', 'y,n']]
    .map(([action, v]) => ({ action, cells: v.split(',').map(x => x === 'y' ? { t: 'Yes', bg: '#E8F4E9', fg: '#0B5E0B' } : x === 'n' ? { t: 'No', bg: '#F0F2F5', fg: '#4B5361' } : { t: x.slice(2), bg: '#FBF2E1', fg: '#7A5500' }) }));
  return addMessaging(m, false);
}
function admset(b, c, A) {
  if (b === 'fees' && (c === 'booking' || !c)) {
    const host = V1.admset('fees', 'heads', null, A, A.go);
    return addMessaging({ ...host, _A: A, sheet: null, setActions: [{ label: 'Save', kind: 'primary', go: () => A.toast('Booking fees saved') }], tabs: [{ label: 'Booking fee', on: true, go: () => A.go('admset/fees/booking') }, ...host.tabs.map(t => ({ ...t, on: false }))],
      rows: [{ cards: [{ title: 'Booking fee per quota', extra: 'Receipt series BKG/26/####', parts: [
        table(['Quota', R('Booking fee'), R('Open bookings'), R('Held')], QUOTAS.map(q => { const bk = students.filter(s => s.stage === 'Booked' && s.quota === q); return [C.t(q), C.r(inr(BOOKING_FEE[q])), C.r(bk.length), C.r(inr(bk.length * BOOKING_FEE[q]))]; })),
        notice('info', `Bookings become admissions automatically ${AUTO_DAYS} days after booking unless cancelled. The booking fee is not charged again. It is credited against the total academic fee and used for Instalment 1 by default.`)] }] }] }, false);
  }
  const m = V1.admset(b, c, null, A, A.go); m._A = A;
  if (m.tabs && b === 'fees') m.tabs = [{ label: 'Booking fee', on: false, go: () => A.go('admset/fees/booking') }, ...m.tabs];
  if (m.policy) {
    m.policy = { ...m.policy, statuses: STAGES.map((s, i) => ({ s, arrow: i < 1 })) };
    m.rows = [{ cards: [{ title: 'Booking refund policy · ' + BKG_POLICY.ver, extra: 'Applies while the booking fee is not converted', parts: [table(['When cancelled', 'Refund'], BKG_POLICY.slabs.map(([w, r]) => [C.t(w), C.t(r)])), notice('info', `Status model: Booked → Admitted. Either can move to Cancelled, and the stage it was cancelled from is kept. After conversion, all fees paid follow admission policy ${ADM_POLICY.ver} below.`)] }] }];
  }
  return addMessaging(m, false);
}

/* ---------- Campaigns ---------- */
function campaigns(tab, A) {
  const go = A.go, tabs = tabsOf(A, 'campaigns', [['', 'Campaigns', CAMPAIGNS.length], ['templates', 'Templates']], tab === 'templates' ? 'templates' : '');
  if (tab === 'templates') { const v = V1.notifications('templates', null, null, A, go); return { title: 'Campaigns', tabs, actions: [{ label: 'New template', icon: 'plus', kind: 'primary', go: () => A.toast('New template') }], sheet: v.sheet }; }
  const ST = { Completed: 'Sent', 'Partly failed': 'Failed', Scheduled: 'Scheduled', Draft: 'Draft', Running: 'Running' };
  const rows = [...CAMPAIGNS].sort((x, y) => (y.at === '—' ? '9' : y.at).localeCompare(x.at === '—' ? '9' : x.at)).map((c, i) => {
    const done = c.status === 'Completed' || c.status === 'Partly failed' ? c.n : c.status === 'Running' ? Math.round(c.n / 2) : 0;
    return { ...c, sl: i + 1, st: ST[c.status] || c.status, done, pct: c.n ? Math.round(done / c.n * 100) : 0, created: c.at === '—' ? '' : c.at };
  });
  const time = t => { const [h, mi] = t.split(':').map(Number); return String(((h + 11) % 12) + 1).padStart(2, '0') + ':' + String(mi).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
  return { title: 'Campaigns', tabs, actions: [{ label: 'New campaign', icon: 'plus', kind: 'primary', go: () => go('new-campaign') }],
    sheet: { rows, fKey: 'Status', opts: ['Sent', 'Failed', 'Scheduled', 'Draft'].map(x => [x, x, r => r.st === x]), open: r => go('campaign/' + r.id), cols: [
      col('sl', 'Sl. No', 80, r => C.t(String(r.sl), { align: 'center' })), col('name', 'Campaign', 300, r => C.link(r.name)), col('st', 'Status', 130, r => C.chip(r.st)),
      col('n', 'Recipients', 120, r => C.r(r.n)), col('pct', 'Progress', 240, r => ({ k: 'prog', text: `${r.done} of ${r.n} processed (${r.pct}%)`, w: r.pct + '%', c: r.st === 'Failed' ? '#D98A98' : '#4FAE9B' })),
      col('created', 'Created', 150, r => r.created ? C.two(fd(r.created.slice(0, 10)), time(r.created.slice(11))) : C.faint('Not sent'))] } };
}

/* ---------- Report with filters ---------- */
function reportPage(name, A) {
  const sec = Object.keys(REPS).find(k => REPS[k].includes(name)) || 'admissions';
  const ui = A.ui.rf && A.ui.rf.name === name ? A.ui.rf : { name }, set = o => A.setUi({ rf: { ...ui, ...o } });
  const from = ui.from || '2026-06-01', to = ui.to || TODAY, quota = ui.quota || 'all', prog = ui.prog || 'all', st = ui.st || 'all', mode = ui.mode || 'all';
  const progName = s => s.progName;
  let rows, statuses, hasMode = false, cols, foot;
  if (sec === 'bookings') {
    hasMode = true; statuses = ['Booked', 'Converted', 'Cancelled'];
    rows = bookingReceipts.map(r => { const s = D.sById(r.sid); return { s, date: r.date, no: r.rcpt, amt: r.amt, mode: r.mode, status: s.stage === 'Booked' ? 'Booked' : s.stage === 'Admitted' ? 'Converted' : 'Cancelled' }; });
  } else if (sec === 'cancelled') {
    statuses = ['Submitted', 'Awaiting approval', 'Approved', 'Processing', 'Completed', 'Rejected', 'On hold'];
    rows = refunds.map(r => { const s = D.sById(r.sid); return { s, date: r.raised, no: r.no, amt: r.amount, paid: r.paid, status: r.status, stage: s.cancelFrom === 'Booking' ? 'Booking' : 'Admission' }; });
  } else if (/collection register/i.test(name)) {
    hasMode = true; statuses = ['Posted', 'Reversed'];
    rows = payments.map(p => { const s = D.sById(p.sid); return { s, date: p.date, no: p.rcpt, amt: p.amt, mode: p.mode, status: p.status || 'Posted' }; });
  } else if (/conversion/i.test(name)) {
    statuses = ['Admitted', 'Cancelled'];
    rows = students.filter(s => s.admittedOn).map(s => ({ s, date: s.admittedOn, no: s.bkRcpt, amt: s.bkFee, status: s.stage }));
  } else {
    statuses = ['Up to date', 'Overdue', 'Fully paid'];
    rows = students.filter(s => s.stage === 'Admitted').map(s => ({ s, date: s.admittedOn, no: s.adm, amt: s.net, paid: s.paid, due: s.due, od: s.overdue, status: s.due <= 0 ? 'Fully paid' : s.overdue ? 'Overdue' : 'Up to date' }));
  }
  rows = rows.filter(r => r.date >= from && r.date <= to && (quota === 'all' || r.s.quota === quota) && (prog === 'all' || r.s.prog === prog) && (st === 'all' || r.status === st) && (mode === 'all' || r.mode === mode))
    .sort((a, b) => b.date.localeCompare(a.date));
  const sum = k => rows.reduce((t, r) => t + (r[k] || 0), 0);
  const base = [C.t(''), C.t('')];
  if (sec === 'bookings') { cols = ['Receipt no.', 'Date', 'Applicant', 'Quota', 'Programme', 'Mode', R('Amount'), 'Status']; rows2 = rows.map(r => [C.link(r.no, () => A.go('bookings/receipt/' + r.s.id)), C.t(fd(r.date)), C.link(r.s.name, () => A.go('students/' + r.s.id)), C.t(r.s.quota), C.t(progName(r.s)), C.t(r.mode), C.r(inr(r.amt)), C.chip(r.status)]); foot = [C.t('Total · ' + rows.length + ' receipts'), C.t(''), C.t(''), C.t(''), C.t(''), C.t(''), C.r(inr(sum('amt'))), C.t('')]; }
  else if (sec === 'cancelled') { cols = ['Refund no.', 'Raised', 'Name', 'Stage', 'Quota', 'Programme', R('Paid'), R('Refund'), 'Status']; rows2 = rows.map(r => [C.link(r.no, () => A.go('cancelled/refund/' + r.no)), C.t(fd(r.date)), C.link(r.s.name, () => A.go('students/' + r.s.id)), C.t(r.stage), C.t(r.s.quota), C.t(progName(r.s)), C.r(inr(r.paid)), C.r(inr(r.amt)), C.chip(r.status)]); foot = [C.t('Total · ' + rows.length), C.t(''), C.t(''), C.t(''), C.t(''), C.t(''), C.r(inr(sum('paid'))), C.r(inr(sum('amt'))), C.t('')]; }
  else if (hasMode) { cols = ['Receipt no.', 'Date', 'Student', 'Admission no.', 'Quota', 'Programme', 'Mode', R('Amount'), 'Status']; rows2 = rows.map(r => [C.t(r.no), C.t(fd(r.date)), C.link(r.s.name, () => A.go('students/' + r.s.id)), C.t(r.s.adm), C.t(r.s.quota), C.t(progName(r.s)), C.t(r.mode), C.r(inr(r.amt)), C.chip(r.status)]); foot = [C.t('Total · ' + rows.length + ' receipts'), C.t(''), C.t(''), C.t(''), C.t(''), C.t(''), C.t(''), C.r(inr(sum('amt'))), C.t('')]; }
  else if (/conversion/i.test(name)) { cols = ['Booking receipt', 'Converted on', 'Student', 'Admission no.', 'Quota', 'Programme', R('Booking fee credited'), 'Now']; rows2 = rows.map(r => [C.t(r.no), C.t(fd(r.date)), C.link(r.s.name, () => A.go('students/' + r.s.id)), C.t(r.s.adm), C.t(r.s.quota), C.t(progName(r.s)), C.r(inr(r.amt)), C.chip(r.status)]); foot = [C.t('Total · ' + rows.length), C.t(''), C.t(''), C.t(''), C.t(''), C.t(''), C.r(inr(sum('amt'))), C.t('')]; }
  else { cols = ['Admission no.', 'Admitted on', 'Student', 'Quota', 'Programme', R('Total fee'), R('Paid'), R('Balance'), R('Overdue'), 'Status']; rows2 = rows.map(r => [C.t(r.no), C.t(fd(r.date)), C.link(r.s.name, () => A.go('students/' + r.s.id)), C.t(r.s.quota), C.t(progName(r.s)), C.r(inr(r.amt)), C.r(inr(r.paid)), C.r(r.due ? inr(r.due) : '—'), C.r(r.od ? inr(r.od) : '—', { color: r.od ? '#A12A42' : '#1B1B1B' }), C.chip(r.status)]); foot = [C.t('Total · ' + rows.length + ' students'), C.t(''), C.t(''), C.t(''), C.t(''), C.r(inr(sum('amt'))), C.r(inr(sum('paid'))), C.r(inr(sum('due'))), C.r(inr(sum('od'))), C.t('')]; }
  const opt = (all, list) => [{ v: 'all', l: all }, ...list.map(x => typeof x === 'string' ? { v: x, l: x } : x)];
  const preset = v => v === 'week' ? addDays(TODAY, -7) : v === '30' ? addDays(TODAY, -30) : v === 'month' ? TODAY.slice(0, 8) + '01' : '2026-06-01';
  const items = [
    { label: 'Period', value: ui.preset || 'year', opts: [{ v: 'year', l: 'This academic year' }, { v: 'month', l: 'This month' }, { v: '30', l: 'Last 30 days' }, { v: 'week', l: 'Last 7 days' }, { v: 'custom', l: 'Custom dates' }], onChange: e => { const v = e.target.value; set(v === 'custom' ? { preset: v } : { preset: v, from: preset(v), to: TODAY }); } },
    { label: 'From', type: 'date', value: from, onChange: e => set({ from: e.target.value, preset: 'custom' }) },
    { label: 'To', type: 'date', value: to, onChange: e => set({ to: e.target.value, preset: 'custom' }) },
    { label: 'Quota', value: quota, opts: opt('All quotas', QUOTAS), onChange: e => set({ quota: e.target.value }) },
    { label: 'Programme', value: prog, opts: opt('All programmes', D.PROGS.map(p => ({ v: p.code, l: p.name }))), onChange: e => set({ prog: e.target.value }) },
    { label: 'Status', value: st, opts: opt('All statuses', statuses), onChange: e => set({ st: e.target.value }) },
    ...(hasMode ? [{ label: 'Payment mode', value: mode, opts: opt('All modes', D.PAY_MODES), onChange: e => set({ mode: e.target.value }) }] : []),
  ];
  const desc = [fd(from) + ' – ' + fd(to), quota !== 'all' && quota, prog !== 'all' && prog, st !== 'all' && st, mode !== 'all' && mode].filter(Boolean).join(' · ');
  const exp = fmt => () => A.toast(`${fmt} download started · ${name} · ${rows.length} rows · ${desc}`);
  return { back: true, title: name, sub: (sec[0].toUpperCase() + sec.slice(1)) + ' report · ' + desc,
    actions: [{ label: 'Excel', icon: 'file-excel', go: exp('Excel') }, { label: 'CSV', icon: 'file', go: exp('CSV') }, { label: 'PDF', icon: 'download', kind: 'primary', go: exp('PDF') }],
    rows: [{ cards: [{ title: 'Filters', extra: 'Downloads use the same filters', parts: [{ type: 'filters', items, reset: () => A.setUi({ rf: { name } }) }] }] },
      { cards: [{ title: rows.length + ' rows', extra: desc, parts: [rows.length ? table(cols, rows2, foot) : { type: 'empty', text: 'Nothing matches these filters.' }] }] }] };
}
var rows2;

/* ---------- Export modal (per section) ---------- */
const EXPORTS = { bookings: ['Bookings register', 'Seat availability', 'Bookings becoming admissions this week'], admissions: ['Admissions register', 'Booking fee conversion ledger'], finance: ['Fee collection register', 'Outstanding dues by student', 'Overdue instalments ageing'], cancelled: ['Cancellations register', 'Refund register', 'Refunds pending approval'] };
const SEC_NAME = { bookings: 'bookings', admissions: 'admissions', finance: 'finance', cancelled: 'cancellations' };
export function exportModal(sec, A, close) {
  const list = EXPORTS[sec]; if (!list) return null;
  const ex = A.ui.ex && A.ui.ex.sec === sec ? A.ui.ex : { sec, name: list[0], fmt: 'Excel' };
  const set = o => A.setUi({ ex: { ...ex, ...o } });
  const fake = { ...A, ui: { ...A.ui, rf: { ...ex } }, setUi: o => { if (o.rf) A.setUi({ ex: { sec, fmt: ex.fmt, ...o.rf, name: ex.name } }); } };
  const page = reportPage(ex.name, fake), filt = page.rows[0].cards[0].parts[0], count = page.rows[1].cards[0].title, desc = page.sub.split(' · ').slice(1).join(' · ');
  return { title: 'Export ' + SEC_NAME[sec], reportOpts: list.map(r => ({ v: r, l: r })), report: ex.name, onReport: e => set({ name: e.target.value }),
    items: filt.items, reset: filt.reset, fmts: ['Excel', 'CSV', 'PDF'].map(x => ({ label: x, on: x === ex.fmt, go: () => set({ fmt: x }) })), count, desc,
    download: () => { A.toast(`${ex.fmt} download started · ${ex.name} · ${count} · ${desc}`); close(); },
    preview: () => { A.setUi({ rf: { ...ex } }); close(); A.go('report/' + encodeURIComponent(ex.name)); } };
}

/* ---------- Finance dashboard ---------- */
function financeDashboard(A) {
  const go = A.go, ad = students.filter(s => s.stage === 'Admitted'), month = TODAY.slice(0, 7);
  const net = ad.reduce((t, s) => t + s.net, 0), coll = ad.reduce((t, s) => t + s.paid, 0), out = ad.reduce((t, s) => t + s.due, 0);
  const odS = ad.filter(s => s.overdue > 0), od = odS.reduce((t, s) => t + s.overdue, 0);
  const monthPay = payments.filter(p => p.date.startsWith(month)), monthBk = bookingReceipts.filter(r => r.date.startsWith(month));
  const rfPend = refunds.filter(r => ['Submitted', 'Awaiting approval', 'Approved', 'Processing'].includes(r.status)), myReq = (D.cancelRequests || []).filter(r => r.status === 'Pending');
  const kpis = [
    { label: 'Collected this month', value: inrS(monthPay.reduce((t, p) => t + p.amt, 0) + monthBk.reduce((t, r) => t + r.amt, 0)), sub: `${monthPay.length} fee receipts · ${monthBk.length} booking fees`, tone: 'ok', icon: 'wallet', go: () => go('finance/payments') },
    { label: 'Outstanding', value: inrS(out), sub: `${Math.round(coll / Math.max(1, net) * 100)}% of ${inrS(net)} collected`, pct: out / Math.max(1, net) * 100, pctOf: 'of fees billed', tone: 'warn', go: () => go('finance') },
    { label: 'Overdue', value: inrS(od), sub: odS.length + ' students', pct: od / Math.max(1, out) * 100, pctOf: 'of outstanding', tone: 'bad', go: () => go('finance', { sel: ['Overdue'] }) },
    { label: 'Refunds to pay', value: inrS(rfPend.reduce((t, r) => t + r.amount, 0)), sub: `${rfPend.length} refunds · ${myReq.length} requests awaiting admin`, tone: 'bad', icon: 'replay', go: () => go('cancelled') },
  ];
  const days = [...Array(30)].map((_, i) => addDays(TODAY, i - 29)), nice = v => { const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1, v)))), n = v / mag; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag; };
  const s1 = days.map(d => payments.filter(p => p.date === d).reduce((t, p) => t + p.amt, 0)), s2 = days.map(d => bookingReceipts.filter(r => r.date === d).reduce((t, r) => t + r.amt, 0));
  const max = nice(Math.max(1, ...s1, ...s2)), step = 1000 / 29;
  const smooth = vals => { const pts = vals.map((v, i) => [i * step, 300 - v / max * 300]); let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, cl = y => Math.min(300, Math.max(0, y)); d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${cl(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${cl(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; } return d; };
  const lineP = { type: 'line', aria: 'Money received per day', grid: [0, 75, 150, 225, 300].map(y => `M0,${y} H1000`).join(' '), yTicks: [4, 3, 2, 1, 0].map(k => ({ l: inrS(max * k / 4) })), xLabels: days.filter((_, i) => i % 3 === 0 || i === 29).map(d => ({ l: fdShort(d) })),
    series: [{ name: 'Academic fees', color: '#0A3C6E', total: inrS(s1.reduce((a, b) => a + b, 0)) }, { name: 'Booking fees', color: '#5B9BD5', total: inrS(s2.reduce((a, b) => a + b, 0)) }], s1d: smooth(s1), s1c: '#0A3C6E', s2d: smooth(s2), s2c: '#5B9BD5' };
  const dst = s => s.due <= 0 ? 'Fully paid' : s.overdue ? 'Overdue' : (s.nextDue && s.nextDue <= addDays(TODAY, 7)) ? 'Due this week' : 'Upcoming';
  const parts = [['Overdue', '#A12A42'], ['Due this week', '#E0A33A'], ['Upcoming', '#5B9BD5'], ['Fully paid', '#0B5E0B']].map(([l, c]) => ({ l, c, v: ad.filter(s => dst(s) === l).length }));
  const tot = parts.reduce((t, x) => t + x.v, 0) || 1; let acc = 0; const grad = 'conic-gradient(' + parts.map(x => { const a = acc / tot * 360, b = (acc += x.v) / tot * 360; return `${x.c} ${a}deg ${b}deg`; }).join(',') + ')';
  const att = [...odS].sort((a, b) => b.overdue - a.overdue).slice(0, 6).map(s => ({ icon: 'exclamation-circle', t: s.name, s: `${s.adm} · ${inr(s.overdue)} overdue since ${fd(s.nextDue)}`, chip: 'Overdue', go: () => go('students/' + s.id + '/fees') }));
  const recent = [...payments].sort((a, b) => b.date.localeCompare(a.date) || b.rcpt.localeCompare(a.rcpt)).slice(0, 6).map(p => { const s = D.sById(p.sid); return { icon: 'credit-card', t: `${inr(p.amt)} · ${s.name}`, s: `${p.rcpt} · ${p.mode} · ${fd(p.date)}`, go: () => go('admissions/receipt/' + p.id) }; });
  return { title: 'Dashboard', kpis, actions: [{ label: 'Collect payment', icon: 'credit-card', kind: 'primary', go: () => go('admissions/collect') }],
    rows: [{ cards: [{ title: 'Money received', sub: 'Rupees per day · last 30 days', span: 2, parts: [lineP] }, { title: 'Students by fee status', sub: ad.length + ' admitted students', parts: [{ type: 'donut', grad, center: odS.length, centerSub: 'overdue', aria: 'Students by fee status', items: parts.map(x => ({ c: x.c, l: x.l, v: x.v, pct: Math.round(x.v / tot * 100) + '%' })) }] }] },
      { cards: [{ title: 'Overdue · follow up', action: { label: 'Send reminders', icon: 'send', go: () => A.toast(`Reminders sent · SMS + WhatsApp to ${odS.length} guardians`) }, parts: [att.length ? { type: 'list', items: att } : { type: 'empty', text: 'No overdue fees.' }] }, { title: 'Recent payments', action: { label: 'View all', icon: 'arrow-right', go: () => go('finance/payments') }, parts: [{ type: 'list', items: recent }] }] }] };
}

/* ---------- My account ---------- */
const ACCT = { Admin: { name: 'Anita Joseph', title: 'Admissions Officer', email: 'anita.joseph@thejus.ac.in', mobile: '9847012345', emp: 'TEC/EMP/0142', dept: 'Admissions Office', since: '2019-06-03' }, Finance: { name: 'Joby Mathew', title: 'Accounts Officer', email: 'joby.mathew@thejus.ac.in', mobile: '9895054321', emp: 'TEC/EMP/0087', dept: 'Accounts', since: '2016-01-18' } };
function accountPage(A) {
  const u = ACCT[A.role] || ACCT.Admin, ac = (A.ui.acct || {})[A.role] || {}, setAc = o => A.setUi({ acct: { ...(A.ui.acct || {}), [A.role]: { ...ac, ...o } } });
  const pw = A.ui.pw || {}, setPw = o => A.setUi({ pw: { ...pw, ...o } });
  const name = ac.name ?? u.name, mobile = ac.mobile ?? u.mobile, nw = pw.nw || '';
  const rules = [[nw.length >= 8, 'At least 8 characters'], [/[A-Z]/.test(nw) && /[a-z]/.test(nw), 'Upper and lower case letters'], [/\d/.test(nw), 'A number'], [/[^A-Za-z0-9]/.test(nw), 'A symbol']];
  const strength = rules.filter(r => r[0]).length;
  const err = { cur: !pw.cur ? 'Enter your current password.' : '', nw: strength < 4 ? 'Password doesn\'t meet all the rules below.' : nw === pw.cur ? 'New password must be different from the current one.' : '', cf: pw.cf !== nw ? 'Passwords don\'t match.' : '' };
  const show = k => pw.tried ? err[k] : '';
  const twofa = ac.twofa ?? true, notif = { email: true, sms: true, digest: false, ...(ac.notif || {}) };
  const sessions = (ac.sessions || [['This device · Chrome on macOS', 'Thrissur · active now', true], ['Chrome on Windows', 'Office desktop · 2 hours ago', false], ['Safari on iPhone', 'Thrissur · yesterday', false]]);
  const tog = (on, label, sub, flip) => ({ icon: on ? 'check-circle' : 'circle', t: label, s: sub, chip: on ? 'Active' : 'Hidden', btn: { label: on ? 'Turn off' : 'Turn on', go: flip } });
  return { back: true, title: 'My account', sub: `${u.title} · ${A.role}`,
    rows: [
      { cards: [
        { title: 'Profile', action: { label: 'Save changes', icon: 'check', go: () => A.toast(!name.trim() || !/^\d{10}$/.test(mobile) ? 'Enter your name and a 10-digit mobile number' : 'Profile updated') }, parts: [
          { type: 'field', label: 'Full name', value: name, onInput: e => setAc({ name: e.target.value }), maxW: '420px', autoComplete: 'name' },
          { type: 'field', label: 'Mobile number', value: mobile, inputMode: 'numeric', onInput: e => setAc({ mobile: e.target.value }), maxW: '420px', err: mobile && !/^\d{10}$/.test(mobile) ? 'Enter a 10-digit mobile number.' : '' },
          kv([['Email (sign-in ID)', u.email], ['Role', A.role], ['Employee ID', u.emp], ['Department', u.dept], ['With the college since', fd(u.since)]]),
          notice('info', 'Email and role are managed by an administrator in Settings → Users.')] },
        { title: 'Change password', action: { label: 'Update password', icon: 'lock', go: () => { if (err.cur || err.nw || err.cf) return setPw({ tried: true }); A.setUi({ pw: null }); A.toast('Password changed · other devices were signed out'); } }, parts: [
          { type: 'field', label: 'Current password', inputType: 'password', autoComplete: 'current-password', value: pw.cur || '', onInput: e => setPw({ cur: e.target.value }), maxW: '420px', err: show('cur') },
          { type: 'field', label: 'New password', inputType: 'password', autoComplete: 'new-password', value: nw, onInput: e => setPw({ nw: e.target.value }), maxW: '420px', err: show('nw') },
          { type: 'meters', items: [{ k: 'Password strength', v: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][strength], w: strength * 25 + '%', c: ['#C9CFD8', '#A12A42', '#E0A33A', '#1783C1', '#0B5E0B'][strength] }] },
          { type: 'list', items: rules.map(([ok, l]) => ({ icon: ok ? 'check-circle' : 'circle', t: l, s: '', chip: ok ? 'Verified' : '' })) },
          { type: 'field', label: 'Confirm new password', inputType: 'password', autoComplete: 'new-password', value: pw.cf || '', onInput: e => setPw({ cf: e.target.value }), maxW: '420px', err: show('cf') }] }] },
    ] };
}
