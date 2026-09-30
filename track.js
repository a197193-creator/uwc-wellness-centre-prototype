(() => {
  const config = window.UWC_DEMO_CONFIG;
  const form = document.querySelector('#lookup-form');
  const codeInput = document.querySelector('#booking-code');
  const message = document.querySelector('#lookup-message');
  const result = document.querySelector('#booking-result');
  const responseWrap = document.querySelector('#response-wrap');
  const responseForm = document.querySelector('#response-form');
  const statuses = {
    pending_review: 'Pending Review', confirmed: 'Confirmed', rejected: 'Rejected',
    changes_requested: 'Changes Requested', completed: 'Completed', cancelled: 'Cancelled'
  };
  let currentCode = '';

  const text = (selector, value) => { document.querySelector(selector).textContent = value ?? '—'; };
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  const formatDate = (value) => value ? `${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))} (${timezone})` : '—';
  const currency = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'MYR', maximumFractionDigits: 2 }).format(Number(value) || 0);

  async function callGateway(body) {
    const response = await fetch(config.gatewayUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: config.publishableKey },
      body: JSON.stringify(body), cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Network error. Please try again.');
    return data;
  }

  function render(booking) {
    currentCode = booking.booking_code;
    text('#result-package', booking.package_name);
    text('#result-code', currentCode);
    text('#result-date', formatDate(booking.scheduled_at));
    const paymentLabels = { paid: 'Paid', pending: 'Pending', failed: 'Failed', refunded: 'Refunded' };
    text('#result-payment', `${paymentLabels[booking.payment_status] || booking.payment_status}${booking.is_demo ? ' (fictional demo payment)' : ''}`);
    text('#result-amount', currency(booking.amount_paid));
    text('#result-created', formatDate(booking.created_at));
    const badge = document.querySelector('#result-status');
    badge.textContent = statuses[booking.status] || booking.status;
    badge.dataset.status = booking.status;
    const note = document.querySelector('#customer-note-wrap');
    note.hidden = !booking.customer_visible_note;
    text('#customer-note', booking.customer_visible_note);
    responseWrap.hidden = booking.status !== 'changes_requested';
    const suggestions = document.querySelector('#suggestions');
    suggestions.replaceChildren(suggestions.querySelector('legend'));
    for (const slot of booking.suggested_slots || []) {
      const label = document.createElement('label');
      label.className = 'suggestion';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'suggested-slot'; radio.value = slot;
      label.append(radio, document.createTextNode(formatDate(slot)));
      suggestions.append(label);
    }
    suggestions.hidden = !(booking.suggested_slots || []).length;
    result.hidden = false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = codeInput.value.trim().toUpperCase();
    codeInput.value = code;
    result.hidden = true;
    if (!code) { message.textContent = 'Please enter your booking code.'; codeInput.focus(); return; }
    const button = form.querySelector('button');
    button.disabled = true; message.textContent = 'Finding booking…';
    try {
      const data = await callGateway({ action: 'lookup', code });
      render(data.booking); message.textContent = '';
    } catch (error) { message.textContent = error.message; }
    finally { button.disabled = false; }
  });

  document.querySelector('#copy-code').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(currentCode); message.textContent = 'Booking code copied.'; }
    catch { message.textContent = 'Copy is unavailable. Please select the code above.'; }
  });

  responseForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selected = responseForm.querySelector('input[name="suggested-slot"]:checked')?.value;
    const manual = document.querySelector('#requested-at').value;
    const preferred = selected || (manual ? new Date(manual).toISOString() : null);
    const customerMessage = document.querySelector('#response-message').value.trim();
    const status = document.querySelector('#response-message-status');
    if (!preferred && !customerMessage) { status.textContent = 'Choose a time or write a message.'; return; }
    const button = responseForm.querySelector('button');
    button.disabled = true; status.textContent = 'Sending response…';
    try {
      await callGateway({ action: 'respond', code: currentCode, message: customerMessage, requested_at: preferred });
      status.textContent = 'Response sent. Your booking is back in Pending Review.';
      const refreshed = await callGateway({ action: 'lookup', code: currentCode });
      render(refreshed.booking);
      message.textContent = 'Your response was sent to the demo dashboard.';
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
})();
