/* Staff-page controller: sign in, list/filter bookings, view details and confirm audited actions.
   Supabase Auth + database RLS enforce access; hiding the dashboard is not a security boundary.
   The data client in admin-data.js handles network calls. Payment fields remain read-only. */
const $ = (selector) => document.querySelector(selector);
// Database status/action keys map to readable UI labels; do not rename keys independently of SQL.
const statusNames = {
  pending_review: 'Pending Review',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  changes_requested: 'Changes Requested',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const actions = {
  approve: 'Approve',
  reject: 'Reject',
  request_changes: 'Request changes',
  reschedule: 'Reschedule',
  complete: 'Mark completed',
  cancel: 'Cancel',
  note_internal: 'Add internal note',
  note_customer: 'Add customer-visible note',
};
// Staff scheduling uses Malaysia time; monetary values are displayed in MYR.
const appointmentRules = window.UWCAppointmentRules;
const malaysiaZone = appointmentRules.zone;
const malaysiaDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: malaysiaZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: malaysiaZone,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';
const money = (value) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
// Use textContent for customer/admin text so it cannot be interpreted as executable HTML.
const node = (tag, className, content) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined && content !== null) element.textContent = String(content);
  return element;
};
const database = window.UWCAdminData;
// View state, request sequence counters and timers. Counters ignore late/stale network responses.
let allBookings = [];
let currentPage = 1;
let selectedBooking = null;
let pendingAction = null;
let staffUser = null;
let signingIn = false;
let actionSaving = false;
let loadSequence = 0;
let detailSequence = 0;
let stopRealtime = null;
let refreshTimer = null;
let pollTimer = null;
// Convert a stored timestamp to the Malaysia calendar date used by filters and summary cards.
function localDate(value) {
  const parts = Object.fromEntries(
    malaysiaDateFormatter
      .formatToParts(new Date(value))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Validate staff datetime-local input using the same rules as customer appointment selection.
function malaysiaSlot(value) {
  return appointmentRules.slot(value);
}

// Turn network/auth failures into readable messages without showing a fake success state.
function errorMessage(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || error instanceof TypeError)
    return 'Could not connect. Please try again.';
  if (error?.status === 400 && /credentials|password/i.test(error.message || ''))
    return 'Check your email and password and try again.';
  return error?.message || 'The booking service is unavailable. Please try again.';
}

// Stop updates and clear customer data, open dialogs and password fields when access is lost.
function lockDashboard(message = '') {
  staffUser = null;
  allBookings = [];
  selectedBooking = null;
  pendingAction = null;
  loadSequence++;
  detailSequence++;
  stopRealtime?.();
  stopRealtime = null;
  clearTimeout(refreshTimer);
  clearInterval(pollTimer);
  pollTimer = null;
  document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
  $('#appointment-rows').replaceChildren();
  $('#details-content').replaceChildren();
  $('#day-list').replaceChildren();
  $('#dashboard').hidden = true;
  $('#sign-out').hidden = true;
  $('#login-panel').hidden = false;
  $('#staff-identity').textContent = '';
  $('#password').value = '';
  $('#action-note').value = '';
  $('#action-date').value = '';
  $('#search').value = '';
  $('#details-title').textContent = '';
  $('#action-description').textContent = '';
  $('#filter-package').replaceChildren(node('option', '', 'All packages'));
  $('#login-message').textContent = message;
}

// Open the approved user's dashboard, load bookings and enable Realtime plus fallback polling.
async function enterDashboard(user) {
  staffUser = user;
  $('#login-panel').hidden = true;
  $('#dashboard').hidden = false;
  $('#sign-out').hidden = false;
  $('#staff-identity').textContent =
    `Signed in as ${user.email}. Dates and staff time entry use Malaysia time.`;
  await loadBookings();
  if (!staffUser) return;
  stopRealtime?.();
  stopRealtime = database.subscribe(
    () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => loadBookings(true), 300);
    },
    (status) => {
      if (!staffUser) return;
      $('#realtime-message').textContent =
        status === 'SUBSCRIBED'
          ? 'Live updates connected. New requests and customer replies appear automatically.'
          : 'Live connection reconnecting. Bookings also refresh every 30 seconds.';
    },
  );
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!document.hidden && staffUser && !actionSaving) loadBookings(true);
  }, 30000);
}

// Recheck staff approval on every refresh; use sequence IDs so old responses cannot overwrite new ones.
async function loadBookings(background = false) {
  if (!staffUser || (background && actionSaving)) return false;
  const sequence = ++loadSequence;
  if (!background) $('#dashboard-message').textContent = 'Loading bookings…';
  $('#refresh').disabled = true;
  try {
    const user = await database.approvedUser();
    if (!user) {
      lockDashboard('Please sign in again.');
      return false;
    }
    const bookings = await database.list();
    if (!staffUser || sequence !== loadSequence) return false;
    allBookings = bookings;
    fillPackageFilter();
    renderSummary();
    renderTable();
    renderDay();
    if (!background)
      $('#dashboard-message').textContent =
        `${bookings.length} stored booking(s) loaded. Changes are saved to Supabase.`;
    return true;
  } catch (error) {
    if (sequence !== loadSequence) return false;
    // Clear previously loaded personal data on any failed refresh; never show stale records as current.
    lockDashboard(errorMessage(error));
    return false;
  } finally {
    if (sequence === loadSequence || !staffUser) $('#refresh').disabled = false;
  }
}

// Derive available package filters from stored bookings while preserving the chosen filter.
function fillPackageFilter() {
  const select = $('#filter-package');
  const selected = select.value;
  select.replaceChildren(node('option', '', 'All packages'));
  select.firstChild.value = '';
  for (const name of [...new Set(allBookings.map((row) => row.package_name))].sort()) {
    const option = node('option', '', name);
    option.value = name;
    select.append(option);
  }
  select.value = selected;
}

// Display pending/today/change-request counts and the date-filtered indicative plan total, not revenue.
function renderSummary() {
  const today = localDate(new Date());
  $('#count-pending').textContent = allBookings.filter(
    (row) => row.status === 'pending_review',
  ).length;
  $('#count-today').textContent = allBookings.filter(
    (row) => localDate(row.scheduled_at) === today,
  ).length;
  $('#count-changes').textContent = allBookings.filter(
    (row) => row.status === 'changes_requested',
  ).length;
  const from = $('#filter-from').value,
    to = $('#filter-to').value;
  const selected = allBookings.filter(
    (row) =>
      (!from || localDate(row.scheduled_at) >= from) && (!to || localDate(row.scheduled_at) <= to),
  );
  $('#count-revenue').textContent = money(
    selected.reduce((sum, row) => sum + Number(row.amount_due), 0),
  );
}

// Apply contact/code search and status/payment/package/date filters, then sort the result.
function filteredBookings() {
  const search = $('#search').value.trim().toLowerCase();
  const status = $('#filter-status').value;
  const payment = $('#filter-payment').value;
  const packageName = $('#filter-package').value,
    from = $('#filter-from').value,
    to = $('#filter-to').value;
  const result = allBookings.filter((row) => {
    const haystack = [row.booking_code, row.customer_name, row.customer_email, row.customer_phone]
      .join(' ')
      .toLowerCase();
    const scheduledDay = localDate(row.scheduled_at);
    return (
      (!search || haystack.includes(search)) &&
      (!status || row.status === status) &&
      (!payment || row.payment_status === payment) &&
      (!packageName || row.package_name === packageName) &&
      (!from || scheduledDay >= from) &&
      (!to || scheduledDay <= to)
    );
  });
  const sort = $('#sort').value;
  const field = sort.startsWith('scheduled') ? 'scheduled_at' : 'created_at';
  const direction = sort.endsWith('asc') ? 1 : -1;
  result.sort((a, b) => direction * (new Date(a[field]) - new Date(b[field])));
  return result;
}

// Create a text badge; demo.css uses data-status to select the appropriate colour.
function badge(status) {
  const span = node('span', 'badge', statusNames[status] || status);
  span.dataset.status = status;
  return span;
}

// Render ten filtered records per page, including an empty state and bounded pagination controls.
function renderTable() {
  const rows = filteredBookings();
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  currentPage = Math.min(currentPage, pages);
  const body = $('#appointment-rows');
  body.replaceChildren();
  for (const booking of rows.slice((currentPage - 1) * 10, currentPage * 10)) {
    const tr = node('tr');
    for (const content of [
      booking.booking_code || 'Not issued',
      booking.customer_name,
      `${booking.customer_email}\n${booking.customer_phone}`,
      booking.package_name,
      dateTime(booking.scheduled_at),
    ]) {
      tr.append(node('td', '', content));
    }
    const statusCell = node('td');
    statusCell.append(badge(booking.status));
    tr.append(statusCell);
    tr.append(
      node(
        'td',
        '',
        booking.is_demo && booking.payment_status === 'pending'
          ? 'Not collected (prototype)'
          : booking.payment_status,
      ),
      node('td', '', money(booking.amount_due)),
      node('td', '', dateTime(booking.created_at)),
    );
    const actionCell = node('td');
    const button = node('button', 'outline-button compact', 'View');
    button.type = 'button';
    button.addEventListener('click', () => openDetails(booking.id));
    actionCell.append(button);
    tr.append(actionCell);
    body.append(tr);
  }
  if (!rows.length) {
    const tr = node('tr');
    const cell = node('td', 'empty-table', 'No appointments match these filters.');
    cell.colSpan = 10;
    tr.append(cell);
    body.append(tr);
  }
  $('#row-count').textContent = `${rows.length} matching`;
  $('#page-label').textContent = `Page ${currentPage} of ${pages}`;
  $('#previous-page').disabled = currentPage <= 1;
  $('#next-page').disabled = currentPage >= pages;
}

// Show the chosen day's requests in time order with package duration and detail links.
function renderDay() {
  const date = $('#day-date').value || localDate(new Date());
  const list = $('#day-list');
  list.replaceChildren();
  const dayBookings = allBookings
    .filter((row) => localDate(row.scheduled_at) === date)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  if (!dayBookings.length) {
    list.append(node('p', 'muted', 'No appointments scheduled for this day.'));
    return;
  }
  for (const booking of dayBookings) {
    const row = node('div', 'day-row');
    row.append(
      node('strong', '', `${dateTime(booking.scheduled_at)} · ${booking.duration_minutes} min`),
      node('span', '', `${booking.customer_name} · ${booking.package_name}`),
      badge(booking.status),
    );
    const button = node('button', 'outline-button compact', 'View');
    button.type = 'button';
    button.addEventListener('click', () => openDetails(booking.id));
    row.append(button);
    list.append(row);
  }
}

// Append one label/value pair to the details definition list, using a dash for absent values.
function fact(list, label, value) {
  const pair = node('div');
  pair.append(node('dt', '', label), node('dd', '', value ?? '—'));
  list.append(pair);
}

// Count confirmed bookings whose [start, end) time ranges overlap this booking's duration.
// This is a warning from the loaded view; the server also checks conflicts when saving.
function conflictCount(booking, scheduledAt = booking.scheduled_at) {
  const start = new Date(scheduledAt).getTime();
  const end = start + booking.duration_minutes * 60000;
  return allBookings.filter(
    (other) =>
      other.id !== booking.id &&
      other.status === 'confirmed' &&
      start < new Date(other.scheduled_at).getTime() + other.duration_minutes * 60000 &&
      end > new Date(other.scheduled_at).getTime(),
  ).length;
}

// Refresh the overlap warning for approval or a proposed reschedule, without saving anything.
function showConflictWarning() {
  const warning = $('#action-conflict-warning');
  const proposed =
    pendingAction === 'reschedule'
      ? malaysiaSlot($('#action-date').value)
      : selectedBooking?.scheduled_at;
  const conflicts =
    selectedBooking && ['approve', 'reschedule'].includes(pendingAction) && proposed
      ? conflictCount(selectedBooking, proposed)
      : 0;
  warning.hidden = !conflicts;
  warning.textContent = conflicts
    ? `This time overlaps ${conflicts} confirmed appointment(s). Check the duration before confirming.`
    : '';
}

// Load fresh booking details, read-only payments, selected items, notes and audit history.
// Buttons obey the current status, but the server independently validates every action.
async function openDetails(id) {
  if (!staffUser) return;
  const sequence = ++detailSequence;
  selectedBooking = null;
  $('#details-title').textContent = 'Loading booking…';
  $('#details-content').replaceChildren(
    node('p', 'muted', 'Loading the latest details and history…'),
  );
  if (!$('#details-dialog').open) $('#details-dialog').showModal();
  let booking;
  try {
    booking = await database.details(id);
  } catch (error) {
    if (sequence === detailSequence && staffUser)
      $('#details-content').replaceChildren(node('p', 'message', errorMessage(error)));
    return;
  }
  if (!staffUser || sequence !== detailSequence || !$('#details-dialog').open) return;
  selectedBooking = booking;
  $('#details-title').textContent = booking.booking_code || 'Booking without code';
  const content = $('#details-content');
  content.replaceChildren();
  const info = node('dl', 'detail-facts');
  for (const [label, value] of [
    ['Customer', booking.customer_name],
    ['Email', booking.customer_email],
    ['Phone', booking.customer_phone],
    ['Preferred contact', booking.plan_snapshot?.contact_method],
    ['First visit', booking.plan_snapshot?.first_visit],
    ['Booking notes', booking.plan_snapshot?.booking_notes],
    ['Package', booking.package_name],
    ['Duration', `${booking.duration_minutes} minutes`],
    ['Appointment', dateTime(booking.scheduled_at)],
    ['Status', statusNames[booking.status]],
    ['Indicative total', money(booking.amount_due)],
    [
      'Payment status',
      booking.is_demo && booking.payment_status === 'pending'
        ? 'Not collected (prototype)'
        : booking.payment_status,
    ],
    ['Amount paid', money(booking.amount_paid)],
    ['Payment method', booking.payment_method],
    ['Transaction reference', booking.transaction_reference],
    ['Paid at', dateTime(booking.paid_at)],
    ['Record type', booking.is_demo ? 'Prototype request / test record' : 'Booking'],
    ['Created', dateTime(booking.created_at)],
    ['Customer-visible note', booking.customer_visible_note],
    ['Customer response', booking.customer_response],
    ['New preferred time', dateTime(booking.customer_requested_at)],
  ])
    fact(info, label, value);
  content.append(info);
  const overlaps = booking.status === 'confirmed' ? conflictCount(booking) : 0;
  if (overlaps)
    content.append(
      node('p', 'notice', `Schedule warning: overlaps ${overlaps} confirmed appointment(s).`),
    );
  if (Array.isArray(booking.plan_snapshot?.items) && booking.plan_snapshot.items.length) {
    content.append(node('h3', '', 'Selected plan'));
    const selection = node('ul', 'history-list');
    for (const item of booking.plan_snapshot.items)
      selection.append(node('li', '', `${item.name} · indicative ${money(item.price)}`));
    content.append(selection);
  }
  content.append(
    node(
      'p',
      'muted',
      'Staff actions are saved. Prototype requests do not reserve real UWC slots. Payment information is read-only.',
    ),
  );
  const controls = node('div', 'action-grid');
  for (const [key, label] of Object.entries(actions)) {
    const button = node('button', 'outline-button', label);
    button.type = 'button';
    const terminal = ['completed', 'cancelled', 'rejected'].includes(booking.status);
    button.disabled =
      (!key.startsWith('note_') && terminal) ||
      (key === 'complete' && booking.status !== 'confirmed') ||
      (key === 'approve' && booking.status === 'confirmed');
    button.addEventListener('click', () => openAction(key));
    controls.append(button);
  }
  content.append(controls);
  const notesTitle = node('h3', '', 'Notes');
  content.append(notesTitle);
  const notes = node('ul', 'history-list');
  for (const note of booking.notes)
    notes.append(
      historyItem(
        `${note.visibility} · ${dateTime(note.created_at)} · staff ${note.author_id || '—'}`,
        note.body,
      ),
    );
  if (!notes.childNodes.length) notes.append(node('li', 'muted', 'No notes yet.'));
  content.append(notes, node('h3', '', 'Audit history'));
  const events = node('ul', 'history-list');
  for (const event of booking.events) {
    const transition =
      event.old_status === event.new_status
        ? ''
        : ` · ${event.old_status || 'new'} → ${event.new_status || '—'}`;
    events.append(
      historyItem(
        `${event.event_type}${transition} · ${dateTime(event.created_at)} · ${event.actor_type}${event.actor_id ? ` ${event.actor_id}` : ''}`,
        event.message,
      ),
    );
  }
  if (!events.childNodes.length) events.append(node('li', 'muted', 'No events yet.'));
  content.append(events);
}

// Display history text safely, including who acted and when, with no HTML interpretation.
function historyItem(heading, body) {
  const item = node('li');
  item.append(node('strong', '', heading), node('p', '', body || '—'));
  return item;
}

// Configure the confirmation dialog: required reason, new date or suggested alternative slots.
function openAction(action) {
  pendingAction = action;
  $('#details-dialog').close();
  $('#action-title').textContent = actions[action];
  $('#action-description').textContent =
    `Confirm this action for ${selectedBooking.booking_code || selectedBooking.customer_name}. It will be saved to the database and logged under your staff account.${selectedBooking.is_demo ? ' This is a prototype request, not a real slot reservation.' : ''}`;
  $('#action-note').value = '';
  $('#action-date').value = '';
  $('#action-message').textContent = '';
  $('#action-note-label').hidden = ![
    'reject',
    'request_changes',
    'note_internal',
    'note_customer',
  ].includes(action);
  $('#action-note').required = [
    'reject',
    'request_changes',
    'note_internal',
    'note_customer',
  ].includes(action);
  $('#action-date-label').hidden = action !== 'reschedule';
  $('#action-date').required = action === 'reschedule';
  $('#suggested-inputs').hidden = action !== 'request_changes';
  $('#action-slot-hint').hidden = !['reschedule', 'request_changes'].includes(action);
  $('#suggested-inputs')
    .querySelectorAll('input')
    .forEach((input) => {
      input.value = '';
    });
  $('#confirm-action').textContent = `Confirm ${actions[action].toLowerCase()}`;
  const range = appointmentRules.window();
  $('#action-date').min = `${range.first}T08:00`;
  $('#action-date').max = `${range.last}T10:00`;
  $('#suggested-inputs')
    .querySelectorAll('input')
    .forEach((input) => {
      input.min = `${range.first}T08:00`;
      input.max = `${range.last}T10:00`;
    });
  showConflictWarning();
  $('#action-dialog').showModal();
}
$('#action-date').addEventListener('input', showConflictWarning);

// Sign-in only. Staff creation/approval is done by the owner, as documented in the HTML comment.
// Block double submission and clear the password after both success and failure.
$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (signingIn) return;
  const email = $('#email').value.trim();
  const password = $('#password').value;
  signingIn = true;
  $('#auth-submit').disabled = true;
  $('#login-message').textContent = 'Checking staff access…';
  try {
    const user = await database.signIn(email, password);
    if (user) await enterDashboard(user);
  } catch (error) {
    $('#login-message').textContent = errorMessage(error);
  } finally {
    $('#password').value = '';
    signingIn = false;
    $('#auth-submit').disabled = false;
  }
});

// Lock immediately on sign-out, then ask the data client to close the session and subscriptions.
$('#sign-out').addEventListener('click', async () => {
  if (actionSaving) return;
  sessionStorage.removeItem('uwc-admin-preview');
  lockDashboard('Signed out.');
  try {
    await database.signOut();
  } catch {
    $('#login-message').textContent =
      'The local dashboard is locked. Reload before signing in again.';
  }
});

// Bind refresh, filtering, day selection and pagination controls to the current view.
$('#refresh').addEventListener('click', () => loadBookings());
for (const selector of [
  '#search',
  '#filter-status',
  '#filter-payment',
  '#filter-package',
  '#filter-from',
  '#filter-to',
  '#sort',
]) {
  $(selector).addEventListener(selector === '#search' ? 'input' : 'change', () => {
    currentPage = 1;
    renderSummary();
    renderTable();
  });
}
$('#day-date').value = localDate(new Date());
$('#day-date').addEventListener('change', renderDay);
$('#previous-page').addEventListener('click', () => {
  currentPage--;
  renderTable();
});
$('#next-page').addEventListener('click', () => {
  currentPage++;
  renderTable();
});
// Prevent dialog dismissal during a save and restore keyboard focus within open dialogs.
document.querySelectorAll('[data-close]').forEach((button) =>
  button.addEventListener('click', () => {
    if (actionSaving) return;
    $(`#${button.dataset.close}`).close();
    detailSequence++;
  }),
);
$('#action-dialog').addEventListener('cancel', (event) => {
  if (actionSaving) event.preventDefault();
});
document.querySelectorAll('dialog').forEach((dialog) =>
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [
      ...dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
      ),
    ].filter((control) => control.getClientRects().length);
    const first = controls[0],
      last = controls[controls.length - 1];
    if (
      (event.shiftKey && document.activeElement === first) ||
      (!event.shiftKey && document.activeElement === last)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  }),
);

// Validate the action, disable controls and wait for the audited server result before showing success.
// Stale/network failures keep the action form open so the user can review and retry safely.
$('#action-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!staffUser || !selectedBooking || !pendingAction || actionSaving) return;
  const booking = selectedBooking;
  const action = pendingAction;
  const note = $('#action-note').value.trim();
  const date = $('#action-date').value;
  const suggestedValues = [...$('#suggested-inputs').querySelectorAll('input')]
    .map((input) => input.value)
    .filter(Boolean);
  if (
    (action === 'reject' || action === 'request_changes' || action.startsWith('note_')) &&
    !note
  ) {
    $('#action-message').textContent = 'Enter a reason or note first.';
    return;
  }
  const scheduledAt = action === 'reschedule' ? malaysiaSlot(date) : null;
  if (action === 'reschedule' && !scheduledAt) {
    $('#action-message').textContent =
      'Choose a weekday from tomorrow through the next three months at a listed morning time (Malaysia time).';
    return;
  }
  const suggestions = action === 'request_changes' ? suggestedValues.map(malaysiaSlot) : [];
  if (
    action === 'request_changes' &&
    (suggestions.includes(null) || new Set(suggestions).size !== suggestions.length)
  ) {
    $('#action-message').textContent =
      'Suggested times must be distinct weekdays from tomorrow through the next three months at a listed morning time (Malaysia time).';
    return;
  }
  actionSaving = true;
  const controls = [...$('#action-form').querySelectorAll('input,textarea,button')];
  controls.forEach((control) => {
    control.disabled = true;
  });
  $('#sign-out').disabled = true;
  $('#action-form').setAttribute('aria-busy', 'true');
  $('#action-message').textContent = 'Saving to Supabase…';
  try {
    const result = await database.save(booking, action, note, scheduledAt, suggestions);
    $('#action-dialog').close();
    const refreshed = await loadBookings();
    if (refreshed) {
      await openDetails(booking.id);
      $('#dashboard-message').textContent = result.conflicts
        ? `Saved. Warning: overlaps ${result.conflicts} confirmed appointment(s).`
        : 'Saved to Supabase. Customer-visible updates are available in the booking tracker.';
    } else
      $('#login-message').textContent =
        'Your action was saved, but the latest view could not refresh. Sign in again to check it.';
  } catch (error) {
    $('#action-message').textContent =
      `${errorMessage(error)} Refresh and check the booking before retrying.`;
  } finally {
    actionSaving = false;
    controls.forEach((control) => {
      control.disabled = false;
    });
    $('#sign-out').disabled = false;
    $('#action-form').removeAttribute('aria-busy');
  }
});

// Ignore the old browser-only demo flag; restore only a server-verified approved staff session.
sessionStorage.removeItem('uwc-admin-preview');
if (database) {
  database.onAuthChange((event) => {
    if (event === 'SIGNED_OUT' && staffUser)
      lockDashboard('Your session ended. Please sign in again.');
  });
  database
    .approvedUser()
    .then((user) => {
      if (user && !signingIn) enterDashboard(user);
    })
    .catch((error) => lockDashboard(errorMessage(error)));
}
