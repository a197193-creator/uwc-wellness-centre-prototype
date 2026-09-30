import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';

const config = window.UWC_DEMO_CONFIG;
const supabase = createClient(config.supabaseUrl, config.publishableKey);
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
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
const dateTime = (value) => value ? `${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))} (${timezone})` : '—';
const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'MYR', maximumFractionDigits: 2 }).format(Number(value) || 0);
const node = (tag, className, content) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined && content !== null) element.textContent = String(content);
  return element;
};
let allBookings = [];
let currentPage = 1;
let selectedBooking = null;
let pendingAction = null;
let realtime = null;

function showError(error) { $('#dashboard-message').textContent = error?.message || String(error); }
function localDate(value) { return new Date(value).toLocaleDateString('en-CA'); }

async function verifyAdmin() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;
  const { data, error: roleError } = await supabase.from('admin_users').select('role').eq('user_id', user.id).maybeSingle();
  if (roleError) throw roleError;
  return data?.role === 'admin';
}

async function enterDashboard() {
  const allowed = await verifyAdmin();
  if (!allowed) {
    $('#login-panel').hidden = false;
    $('#dashboard').hidden = true;
    $('#login-message').textContent = 'This account is not assigned the UWC admin role.';
    await supabase.auth.signOut();
    return;
  }
  $('#login-panel').hidden = true;
  $('#dashboard').hidden = false;
  $('#sign-out').hidden = false;
  await loadBookings();
  if (!realtime) {
    realtime = supabase.channel('uwc-admin-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => loadBookings())
      .subscribe();
  }
}

async function loadBookings() {
  const { data, error } = await supabase.from('appointments')
    .select('id,booking_code,package_id,package_name,customer_name,customer_email,customer_phone,scheduled_at,duration_minutes,status,payment_status,amount_due,amount_paid,payment_method,transaction_reference,paid_at,customer_visible_note,customer_response,customer_requested_at,suggested_slots,is_demo,plan_snapshot,created_at,updated_at')
    .order('created_at', { ascending: false }).limit(500);
  if (error) { showError(error); return; }
  allBookings = data || [];
  $('#dashboard-message').textContent = allBookings.length >= 500 ? 'Demo view is limited to the latest 500 bookings.' : '';
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
  const paid = allBookings.filter((row) => row.payment_status === 'paid' &&
    (!from || localDate(row.paid_at || row.created_at) >= from) &&
    (!to || localDate(row.paid_at || row.created_at) <= to));
  $('#count-revenue').textContent = money(paid.reduce((sum, row) => sum + Number(row.amount_paid), 0));
}

function filteredBookings() {
  const search = $('#search').value.trim().toLowerCase();
  const status = $('#filter-status').value, payment = $('#filter-payment').value;
  const packageName = $('#filter-package').value, from = $('#filter-from').value, to = $('#filter-to').value;
  const result = allBookings.filter((row) => {
    const haystack = [row.booking_code, row.customer_name, row.customer_email, row.customer_phone].join(' ').toLowerCase();
    const scheduledDay = localDate(row.scheduled_at);
    return (!search || haystack.includes(search)) && (!status || row.status === status) &&
      (!payment || row.payment_status === payment) && (!packageName || row.package_name === packageName) &&
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
    tr.append(node('td', '', booking.is_demo && booking.payment_status === 'pending' ? 'Not taken' : booking.payment_status), node('td', '', money(booking.amount_due)), node('td', '', dateTime(booking.created_at)));
    const actionCell = node('td'); const button = node('button', 'outline-button compact', 'View');
    button.type = 'button'; button.addEventListener('click', () => openDetails(booking.id));
    actionCell.append(button); tr.append(actionCell); body.append(tr);
  }
  if (!rows.length) {
    const tr = node('tr'); const cell = node('td', 'empty-table', 'No appointments match these filters.');
    cell.colSpan = 10; tr.append(cell); body.append(tr);
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

async function openDetails(id) {
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
    ['Payment status', booking.is_demo && booking.payment_status === 'pending' ? 'Not taken (demo)' : booking.payment_status], ['Indicative total', money(booking.amount_due)],
    ['Amount paid', money(booking.amount_paid)], ['Payment method', booking.payment_method],
    ['Transaction reference', booking.transaction_reference], ['Paid at', dateTime(booking.paid_at)],
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
  content.append(node('p', 'muted', 'Demo requests take no payment. Payment status is read-only; only a trusted payment server or webhook could update a future live payment.'));
  const controls = node('div', 'action-grid');
  for (const [key, label] of Object.entries(actions)) {
    const button = node('button', 'outline-button', label); button.type = 'button';
    button.addEventListener('click', () => openAction(key)); controls.append(button);
  }
  content.append(controls);
  const [notesQuery, eventsQuery] = await Promise.all([
    supabase.from('appointment_notes').select('body,visibility,created_at,author_id').eq('appointment_id', id).order('created_at', { ascending: false }),
    supabase.from('appointment_events').select('event_type,old_status,new_status,message,created_at,actor_type,actor_id').eq('appointment_id', id).order('created_at', { ascending: false })
  ]);
  if (notesQuery.error || eventsQuery.error) showError(notesQuery.error || eventsQuery.error);
  const notesTitle = node('h3', '', 'Notes'); content.append(notesTitle);
  const notes = node('ul', 'history-list');
  for (const note of notesQuery.data || []) notes.append(historyItem(`${note.visibility} · ${dateTime(note.created_at)} · by ${note.author_id || 'system'}`, note.body));
  if (!notes.childNodes.length) notes.append(node('li', 'muted', 'No notes yet.'));
  content.append(notes, node('h3', '', 'Audit history'));
  const events = node('ul', 'history-list');
  for (const event of eventsQuery.data || []) {
    const transition = event.old_status === event.new_status ? '' : ` · ${event.old_status || 'new'} → ${event.new_status || '—'}`;
    events.append(historyItem(`${event.event_type}${transition} · ${dateTime(event.created_at)} · ${event.actor_type}${event.actor_id ? ` ${event.actor_id}` : ''}`, event.message));
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
  $('#suggested-inputs').querySelectorAll('input').forEach((input) => { input.value = ''; });
  $('#confirm-action').textContent = `Confirm ${actions[action].toLowerCase()}`;
  $('#action-dialog').showModal();
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const button = event.target.querySelector('button');
  button.disabled = true; $('#login-message').textContent = 'Signing in…';
  const { error } = await supabase.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value });
  if (error) $('#login-message').textContent = 'Sign in failed. Check your credentials.';
  else {
    try { await enterDashboard(); } catch { $('#login-message').textContent = 'Unable to verify admin access.'; }
  }
  button.disabled = false;
});

function showSignup(show) {
  $('#signup-form').hidden = !show;
  $('#login-form').hidden = show;
  $('#auth-signup-entry').hidden = show;
  $('#auth-title').textContent = show ? 'Create staff account.' : 'Staff sign in.';
  $('#auth-intro').textContent = show
    ? 'Use your work email. Account creation requires email confirmation and UWC admin approval before you can open the dashboard.'
    : 'Use an approved Supabase Auth account assigned the admin role. No password is stored in this website.';
  $('#login-message').textContent = '';
  if (show) $('#signup-email').focus(); else $('#email').focus();
}
$('#show-signup').addEventListener('click', () => showSignup(true));
$('#hide-signup').addEventListener('click', () => showSignup(false));
$('#signup-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = $('#signup-email').value.trim();
  const password = $('#signup-password').value;
  const status = $('#signup-message');
  if (password !== $('#signup-confirm').value) { status.textContent = 'Passwords do not match.'; return; }
  const button = event.target.querySelector('button[type="submit"]');
  button.disabled = true; status.textContent = 'Creating account…';
  try {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: `${window.location.origin}/admin/` }
    });
    if (error) throw error;
    if (data.session) await supabase.auth.signOut();
    status.textContent = 'Check your email to confirm the account. A UWC administrator must approve it before dashboard access is available.';
    event.target.reset();
  } catch (error) {
    status.textContent = error?.message || 'Account creation failed. Please try again.';
  } finally { button.disabled = false; }
});

$('#sign-out').addEventListener('click', async () => {
  if (realtime) { await supabase.removeChannel(realtime); realtime = null; }
  await supabase.auth.signOut(); allBookings = [];
  $('#dashboard').hidden = true; $('#sign-out').hidden = true; $('#login-panel').hidden = false;
  $('#password').value = ''; $('#login-message').textContent = 'Signed out.';
});

$('#refresh').addEventListener('click', loadBookings);
for (const selector of ['#search','#filter-status','#filter-payment','#filter-package','#filter-from','#filter-to','#sort']) {
  $(selector).addEventListener(selector === '#search' ? 'input' : 'change', () => { currentPage = 1; renderSummary(); renderTable(); });
}
$('#day-date').value = localDate(new Date());
$('#day-date').addEventListener('change', renderDay);
$('#previous-page').addEventListener('click', () => { currentPage--; renderTable(); });
$('#next-page').addEventListener('click', () => { currentPage++; renderTable(); });
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));

$('#action-form').addEventListener('submit', async (event) => {
  event.preventDefault(); if (!selectedBooking || !pendingAction) return;
  const button = $('#confirm-action'); button.disabled = true; $('#action-message').textContent = 'Saving…';
  const date = $('#action-date').value;
  const suggestions = [...$('#suggested-inputs').querySelectorAll('input')].filter((input) => input.value).map((input) => new Date(input.value).toISOString());
  const { data, error } = await supabase.rpc('admin_action', {
    p_id: selectedBooking.id, p_action: pendingAction, p_note: $('#action-note').value.trim() || null,
    p_scheduled_at: date ? new Date(date).toISOString() : null, p_suggested_slots: suggestions
  });
  if (error) { $('#action-message').textContent = error.message; button.disabled = false; return; }
  const id = selectedBooking.id;
  $('#action-dialog').close(); await loadBookings(); await openDetails(id);
  $('#dashboard-message').textContent = data?.conflicts ? `Saved. Warning: this appointment overlaps ${data.conflicts} confirmed booking(s).` : 'Change saved and recorded in the audit history.';
  button.disabled = false;
});

supabase.auth.getSession().then(async ({ data }) => {
  if (data.session) {
    try { await enterDashboard(); } catch { $('#login-message').textContent = 'Unable to load admin access.'; }
  }
});
