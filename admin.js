// UI-only dashboard preview. Never connect this public demo login to private appointments.
const $ = (selector) => document.querySelector(selector);
const statusNames = {
  pending_review: 'Pending Review', confirmed: 'Confirmed', rejected: 'Rejected',
  changes_requested: 'Changes Requested', completed: 'Completed', cancelled: 'Cancelled'
};
const actions = {
  approve: 'Approve', reject: 'Reject', request_changes: 'Request changes',
  reschedule: 'Reschedule', complete: 'Mark completed', cancel: 'Cancel',
  note_internal: 'Add internal note', note_customer: 'Add customer-visible note'
};
const malaysiaZone = 'Asia/Kuala_Lumpur';
const malaysiaDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: malaysiaZone, year: 'numeric', month: '2-digit', day: '2-digit'
});
const dateTime = (value) => value ? new Intl.DateTimeFormat('en-GB', {
  timeZone: malaysiaZone, dateStyle: 'medium', timeStyle: 'short'
}).format(new Date(value)) : '—';
const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'MYR', maximumFractionDigits: 2 }).format(Number(value) || 0);
const node = (tag, className, content) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined && content !== null) element.textContent = String(content);
  return element;
};
let allBookings = createDemoBookings();
let currentPage = 1;
let selectedBooking = null;
let pendingAction = null;
function localDate(value) {
  const parts = Object.fromEntries(malaysiaDateFormatter.formatToParts(new Date(value))
    .filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function malaysiaSlot(value) {
  const match = /^(\d{4}-\d{2}-\d{2})T(08:00|08:30|09:00|09:30|10:00)$/.exec(value);
  if (!match) return null;
  const date = new Date(`${match[1]}T${match[2]}:00+08:00`);
  if (!Number.isFinite(date.getTime()) || localDate(date) !== match[1] ||
      [0, 6].includes(new Date(`${match[1]}T00:00:00Z`).getUTCDay()) || date <= new Date()) return null;
  return date.toISOString();
}

function nextWeekday(offset, hour) {
  const date = new Date(`${localDate(new Date())}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  return new Date(`${date.toISOString().slice(0, 10)}T${String(hour).padStart(2, '0')}:00:00+08:00`).toISOString();
}

function createDemoBookings() {
  const packages = [
    ['Precision Baseline Health Screening', 450, 60],
    ['Precision Expanded Health Screening', 1800, 90],
    ['Precision Wellness and Health Status', 4200, 120]
  ];
  return packages.map(([packageName, amount, duration], index) => ({
    id: `demo-${index + 1}`, booking_code: `DEMO-00${index + 1}`,
    customer_name: `Demo Visitor ${String.fromCharCode(65 + index)}`,
    customer_email: `visitor-${index + 1}@example.invalid`, customer_phone: 'Demo only',
    package_name: packageName, scheduled_at: nextWeekday(index, index === 0 ? 9 : 10),
    duration_minutes: duration, amount_due: amount, amount_paid: 0,
    status: ['pending_review', 'changes_requested', 'confirmed'][index],
    customer_visible_note: index === 1 ? 'Please choose another preferred time for this screening.' : null,
    customer_response: null, customer_requested_at: null,
    suggested_slots: index === 1 ? [nextWeekday(5, 9), nextWeekday(8, 10)] : [],
    plan_snapshot: { contact_method: 'Email', first_visit: index === 0 ? 'Yes' : 'No',
      booking_notes: 'Fictional dashboard sample', items: [{name:packageName,price:amount}] },
    created_at: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
    notes: [], events: [{event_type:'demo_record_created',old_status:null,
      new_status:['pending_review', 'changes_requested', 'confirmed'][index],
      message:'Fictional sample record',created_at:new Date(Date.now() - (index + 1) * 86400000).toISOString(),actor_type:'system'}]
  }));
}

function enterDashboard() {
  $('#login-panel').hidden = true;
  $('#dashboard').hidden = false;
  $('#sign-out').hidden = false;
  loadBookings();
}

function loadBookings() {
  $('#dashboard-message').textContent = 'Fictional records only. Actions are a preview and reset on reload.';
  fillPackageFilter(); renderSummary(); renderTable(); renderDay();
}

function fillPackageFilter() {
  const select = $('#filter-package');
  const selected = select.value;
  select.replaceChildren(node('option', '', 'All packages'));
  select.firstChild.value = '';
  for (const name of [...new Set(allBookings.map((row) => row.package_name))].sort()) {
    const option = node('option', '', name); option.value = name; select.append(option);
  }
  select.value = selected;
}

function renderSummary() {
  const today = localDate(new Date());
  $('#count-pending').textContent = allBookings.filter((row) => row.status === 'pending_review').length;
  $('#count-today').textContent = allBookings.filter((row) => localDate(row.scheduled_at) === today).length;
  $('#count-changes').textContent = allBookings.filter((row) => row.status === 'changes_requested').length;
  const from = $('#filter-from').value, to = $('#filter-to').value;
  const selected = allBookings.filter((row) =>
    (!from || localDate(row.scheduled_at) >= from) &&
    (!to || localDate(row.scheduled_at) <= to));
  $('#count-revenue').textContent = money(selected.reduce((sum, row) => sum + Number(row.amount_due), 0));
}

function filteredBookings() {
  const search = $('#search').value.trim().toLowerCase();
  const status = $('#filter-status').value;
  const packageName = $('#filter-package').value, from = $('#filter-from').value, to = $('#filter-to').value;
  const result = allBookings.filter((row) => {
    const haystack = [row.booking_code, row.customer_name, row.customer_email, row.customer_phone].join(' ').toLowerCase();
    const scheduledDay = localDate(row.scheduled_at);
    return (!search || haystack.includes(search)) && (!status || row.status === status) &&
      (!packageName || row.package_name === packageName) &&
      (!from || scheduledDay >= from) && (!to || scheduledDay <= to);
  });
  const sort = $('#sort').value;
  const field = sort.startsWith('scheduled') ? 'scheduled_at' : 'created_at';
  const direction = sort.endsWith('asc') ? 1 : -1;
  result.sort((a, b) => direction * (new Date(a[field]) - new Date(b[field])));
  return result;
}

function badge(status) {
  const span = node('span', 'badge', statusNames[status] || status);
  span.dataset.status = status;
  return span;
}

function renderTable() {
  const rows = filteredBookings();
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  currentPage = Math.min(currentPage, pages);
  const body = $('#appointment-rows'); body.replaceChildren();
  for (const booking of rows.slice((currentPage - 1) * 10, currentPage * 10)) {
    const tr = node('tr');
    for (const content of [booking.booking_code || 'Not issued', booking.customer_name,
      `${booking.customer_email}\n${booking.customer_phone}`, booking.package_name, dateTime(booking.scheduled_at)]) {
      tr.append(node('td', '', content));
    }
    const statusCell = node('td'); statusCell.append(badge(booking.status)); tr.append(statusCell);
    tr.append(node('td', '', money(booking.amount_due)), node('td', '', dateTime(booking.created_at)));
    const actionCell = node('td'); const button = node('button', 'outline-button compact', 'View');
    button.type = 'button'; button.addEventListener('click', () => openDetails(booking.id));
    actionCell.append(button); tr.append(actionCell); body.append(tr);
  }
  if (!rows.length) {
    const tr = node('tr'); const cell = node('td', 'empty-table', 'No appointments match these filters.');
    cell.colSpan = 9; tr.append(cell); body.append(tr);
  }
  $('#row-count').textContent = `${rows.length} matching`;
  $('#page-label').textContent = `Page ${currentPage} of ${pages}`;
  $('#previous-page').disabled = currentPage <= 1;
  $('#next-page').disabled = currentPage >= pages;
}

function renderDay() {
  const date = $('#day-date').value || localDate(new Date());
  const list = $('#day-list'); list.replaceChildren();
  const dayBookings = allBookings.filter((row) => localDate(row.scheduled_at) === date)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  if (!dayBookings.length) { list.append(node('p', 'muted', 'No appointments scheduled for this day.')); return; }
  for (const booking of dayBookings) {
    const row = node('div', 'day-row');
    row.append(node('strong', '', `${dateTime(booking.scheduled_at)} · ${booking.duration_minutes} min`),
      node('span', '', `${booking.customer_name} · ${booking.package_name}`), badge(booking.status));
    const button = node('button', 'outline-button compact', 'View'); button.type = 'button';
    button.addEventListener('click', () => openDetails(booking.id)); row.append(button); list.append(row);
  }
}

function fact(list, label, value) {
  const pair = node('div'); pair.append(node('dt', '', label), node('dd', '', value ?? '—')); list.append(pair);
}

function openDetails(id) {
  const booking = allBookings.find((row) => row.id === id);
  if (!booking) return;
  selectedBooking = booking;
  $('#details-title').textContent = booking.booking_code || 'Booking without code';
  const content = $('#details-content'); content.replaceChildren();
  const info = node('dl', 'detail-facts');
  for (const [label, value] of [
    ['Customer', booking.customer_name], ['Email', booking.customer_email], ['Phone', booking.customer_phone],
    ['Preferred contact', booking.plan_snapshot?.contact_method], ['First visit', booking.plan_snapshot?.first_visit],
    ['Booking notes', booking.plan_snapshot?.booking_notes],
    ['Package', booking.package_name], ['Duration', `${booking.duration_minutes} minutes`],
    ['Appointment', dateTime(booking.scheduled_at)], ['Status', statusNames[booking.status]],
    ['Indicative total', money(booking.amount_due)],
    ['Created', dateTime(booking.created_at)], ['Customer-visible note', booking.customer_visible_note],
    ['Customer response', booking.customer_response], ['New preferred time', dateTime(booking.customer_requested_at)]
  ]) fact(info, label, value);
  content.append(info);
  if (Array.isArray(booking.plan_snapshot?.items) && booking.plan_snapshot.items.length) {
    content.append(node('h3', '', 'Selected plan'));
    const selection = node('ul', 'history-list');
    for (const item of booking.plan_snapshot.items) selection.append(node('li', '', `${item.name} · indicative ${money(item.price)}`));
    content.append(selection);
  }
  content.append(node('p', 'muted', 'Preview only. No payment or real appointment is created.'));
  const controls = node('div', 'action-grid');
  for (const [key, label] of Object.entries(actions)) {
    const button = node('button', 'outline-button', label); button.type = 'button';
    button.addEventListener('click', () => openAction(key)); controls.append(button);
  }
  content.append(controls);
  const notesTitle = node('h3', '', 'Notes'); content.append(notesTitle);
  const notes = node('ul', 'history-list');
  for (const note of booking.notes) notes.append(historyItem(`${note.visibility} · ${dateTime(note.created_at)} · by Demo staff`, note.body));
  if (!notes.childNodes.length) notes.append(node('li', 'muted', 'No notes yet.'));
  content.append(notes, node('h3', '', 'Audit history'));
  const events = node('ul', 'history-list');
  for (const event of booking.events) {
    const transition = event.old_status === event.new_status ? '' : ` · ${event.old_status || 'new'} → ${event.new_status || '—'}`;
    events.append(historyItem(`${event.event_type}${transition} · ${dateTime(event.created_at)} · ${event.actor_type}`, event.message));
  }
  if (!events.childNodes.length) events.append(node('li', 'muted', 'No events yet.'));
  content.append(events);
  $('#details-dialog').showModal();
}

function historyItem(heading, body) {
  const item = node('li'); item.append(node('strong', '', heading), node('p', '', body || '—')); return item;
}

function openAction(action) {
  pendingAction = action;
  $('#details-dialog').close();
  $('#action-title').textContent = actions[action];
  $('#action-description').textContent = `Confirm this action for ${selectedBooking.booking_code || selectedBooking.customer_name}. Changes are logged in the demo audit history.`;
  $('#action-note').value = ''; $('#action-date').value = ''; $('#action-message').textContent = '';
  $('#action-note-label').hidden = !['reject','request_changes','note_internal','note_customer'].includes(action);
  $('#action-note').required = ['reject','request_changes','note_internal','note_customer'].includes(action);
  $('#action-date-label').hidden = action !== 'reschedule';
  $('#action-date').required = action === 'reschedule';
  $('#suggested-inputs').hidden = action !== 'request_changes';
  $('#action-slot-hint').hidden = !['reschedule', 'request_changes'].includes(action);
  $('#suggested-inputs').querySelectorAll('input').forEach((input) => { input.value = ''; });
  $('#confirm-action').textContent = `Confirm ${actions[action].toLowerCase()}`;
  $('#action-dialog').showModal();
}

$('#login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const username = $('#username').value.trim().toLowerCase();
  if (username !== 'demo' || $('#password').value !== 'uwc-demo') {
    $('#login-message').textContent = 'Use the demo username and password shown above.';
    return;
  }
  $('#password').value = '';
  sessionStorage.setItem('uwc-admin-preview', 'open');
  enterDashboard();
});

$('#sign-out').addEventListener('click', () => {
  sessionStorage.removeItem('uwc-admin-preview');
  allBookings = createDemoBookings();
  $('#dashboard').hidden = true; $('#sign-out').hidden = true; $('#login-panel').hidden = false;
  $('#password').value = ''; $('#login-message').textContent = 'Demo closed.';
});

$('#refresh').addEventListener('click', loadBookings);
for (const selector of ['#search','#filter-status','#filter-package','#filter-from','#filter-to','#sort']) {
  $(selector).addEventListener(selector === '#search' ? 'input' : 'change', () => { currentPage = 1; renderSummary(); renderTable(); });
}
$('#day-date').value = localDate(new Date());
$('#day-date').addEventListener('change', renderDay);
$('#previous-page').addEventListener('click', () => { currentPage--; renderTable(); });
$('#next-page').addEventListener('click', () => { currentPage++; renderTable(); });
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));

$('#action-form').addEventListener('submit', (event) => {
  event.preventDefault(); if (!selectedBooking || !pendingAction) return;
  const booking = selectedBooking;
  const action = pendingAction;
  const note = $('#action-note').value.trim();
  const date = $('#action-date').value;
  const suggestedValues = [...$('#suggested-inputs').querySelectorAll('input')]
    .map((input) => input.value).filter(Boolean);
  if ((action === 'reject' || action === 'request_changes' || action.startsWith('note_')) && !note) {
    $('#action-message').textContent = 'Enter a reason or note first.'; return;
  }
  const scheduledAt = action === 'reschedule' ? malaysiaSlot(date) : null;
  if (action === 'reschedule' && !scheduledAt) {
    $('#action-message').textContent = 'Choose a future weekday at 8:00, 8:30, 9:00, 9:30 or 10:00 a.m. Malaysia time.'; return;
  }
  const suggestions = action === 'request_changes' ? suggestedValues.map(malaysiaSlot) : [];
  if (action === 'request_changes' && (suggestions.includes(null) || new Set(suggestions).size !== suggestions.length)) {
    $('#action-message').textContent = 'Suggested times must be distinct future weekdays from 8:00 to 10:00 a.m. Malaysia time.'; return;
  }
  const oldStatus = booking.status;
  const nextStatus = {
    approve:'confirmed',reject:'rejected',request_changes:'changes_requested',
    complete:'completed',cancel:'cancelled'
  }[action];
  if (nextStatus) booking.status = nextStatus;
  if (action === 'reschedule') booking.scheduled_at = scheduledAt;
  if (action === 'request_changes') booking.suggested_slots = suggestions;
  if (note) {
    const visibility = ['reject','request_changes','note_customer'].includes(action) ? 'customer' : 'internal';
    booking.notes.unshift({body:note,visibility,created_at:new Date().toISOString()});
    if (visibility === 'customer') booking.customer_visible_note = note;
  }
  booking.events.unshift({event_type:action,old_status:oldStatus,new_status:booking.status,
    message:note || `Demo ${actions[action].toLowerCase()}`,created_at:new Date().toISOString(),actor_type:'demo staff'});
  const start = new Date(booking.scheduled_at).getTime();
  const end = start + booking.duration_minutes * 60000;
  const conflicts = allBookings.filter((other) => other.id !== booking.id && other.status === 'confirmed' &&
    start < new Date(other.scheduled_at).getTime() + other.duration_minutes * 60000 &&
    end > new Date(other.scheduled_at).getTime()).length;
  $('#action-dialog').close(); loadBookings(); openDetails(booking.id);
  $('#dashboard-message').textContent = conflicts
    ? `Demo change shown until reload. Warning: time overlaps ${conflicts} confirmed sample appointment(s).`
    : 'Demo change shown until reload. No real booking changed.';
});

if (sessionStorage.getItem('uwc-admin-preview') === 'open') enterDashboard();
