/* Guest tracking-page controller. No login or direct appointment-table query is used.
   A private booking code goes to the rate-limited server gateway, which returns safe fields only. */
(() => {
  const config = window.UWC_DEMO_CONFIG;
  const form = document.querySelector('#lookup-form');
  const codeInput = document.querySelector('#booking-code');
  const message = document.querySelector('#lookup-message');
  const result = document.querySelector('#booking-result');
  const responseWrap = document.querySelector('#response-wrap');
  const responseForm = document.querySelector('#response-form');
  const appointmentRules = window.UWCAppointmentRules;
  // Match database status keys to readable badges; currentCode identifies the displayed request.
  const statuses = {
    pending_review: 'Pending Review',
    confirmed: 'Confirmed',
    rejected: 'Rejected',
    changes_requested: 'Changes Requested',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  let currentCode = '';

  // Use textContent for returned notes/messages so server data cannot inject HTML into the page.
  const text = (selector, value) => {
    document.querySelector(selector).textContent = value ?? '—';
  };
  // Convert UTC timestamps to the visitor's local time and include its short timezone label.
  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    const when = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
    const zone = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value;
    return `${when}${zone ? ` ${zone}` : ''}`;
  };
  const currency = (value) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'MYR',
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  // Send lookup/respond actions without caching; server validation and rate limits still apply.
  async function callGateway(body) {
    const response = await fetch(config.gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.publishableKey },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Network error. Please try again.');
    return data;
  }

  // Fill the safe booking fields and reveal the response form only for changes_requested status.
  // Staff-only notes, provider IDs and full customer information are not supplied by this endpoint.
  function render(booking) {
    if (!booking || !booking.booking_code)
      throw new Error('Could not find a booking. Check your code and try again.');
    if (currentCode !== booking.booking_code) responseForm.reset();
    document.querySelector('#response-message-status').textContent = '';
    currentCode = booking.booking_code;
    text('#result-package', booking.package_name);
    text('#result-code', currentCode);
    text('#result-date', formatDate(booking.scheduled_at));
    const paymentLabels = {
      paid: 'Paid',
      pending: 'Pending',
      failed: 'Failed',
      refunded: 'Refunded',
    };
    const payment =
      booking.is_demo && booking.payment_status === 'pending'
        ? 'Not taken (demo request)'
        : `${paymentLabels[booking.payment_status] || booking.payment_status}${booking.is_demo ? ' (fictional demo payment)' : ''}`;
    text('#result-payment', payment);
    text('#result-amount', currency(booking.amount_paid));
    text('#result-created', formatDate(booking.created_at));
    const badge = document.querySelector('#result-status');
    badge.textContent = statuses[booking.status] || booking.status;
    badge.dataset.status = booking.status;
    const note = document.querySelector('#customer-note-wrap');
    note.hidden = !booking.customer_visible_note;
    text('#customer-note', booking.customer_visible_note);
    responseWrap.hidden = booking.status !== 'changes_requested';
    const range = appointmentRules.window();
    document.querySelector('#requested-at').min = `${range.first}T08:00`;
    document.querySelector('#requested-at').max = `${range.last}T10:00`;
    const suggestions = document.querySelector('#suggestions');
    suggestions.replaceChildren(suggestions.querySelector('legend'));
    for (const slot of booking.suggested_slots || []) {
      const label = document.createElement('label');
      label.className = 'suggestion';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'suggested-slot';
      radio.value = slot;
      label.append(radio, document.createTextNode(formatDate(slot)));
      suggestions.append(label);
    }
    suggestions.hidden = !(booking.suggested_slots || []).length;
    result.hidden = false;
  }

  // Normalize the code, hide the previous result and handle loading, validation and server failures.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = codeInput.value.replace(/\s+/g, '').toUpperCase();
    codeInput.value = code;
    result.hidden = true;
    if (!code) {
      message.textContent = 'Please enter your booking code.';
      codeInput.focus();
      return;
    }
    const button = form.querySelector('button');
    button.disabled = true;
    message.textContent = 'Finding booking…';
    try {
      const data = await callGateway({ action: 'lookup', code });
      render(data.booking);
      message.textContent = '';
    } catch (error) {
      message.textContent =
        error.name === 'TimeoutError' || error instanceof TypeError
          ? 'Could not connect. Please try again.'
          : error.message;
    } finally {
      button.disabled = false;
    }
  });

  // Offer copying with an accessible fallback when clipboard access is blocked.
  document.querySelector('#copy-code').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      message.textContent = 'Booking code copied.';
    } catch {
      message.textContent = 'Copy is unavailable. Please select the code above.';
    }
  });

  // Send a selected alternative, valid new Malaysia-time preference or message to the gateway.
  // Lock lookup/response controls during submission so the reply cannot target a different code.
  responseForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = responseForm.querySelector('button');
    if (button.disabled) return;
    const responseCode = currentCode;
    const selected = responseForm.querySelector('input[name="suggested-slot"]:checked')?.value;
    const manual = document.querySelector('#requested-at').value;
    const preferred = selected || (manual ? appointmentRules.slot(manual) : null);
    const customerMessage = document.querySelector('#response-message').value.trim();
    const status = document.querySelector('#response-message-status');
    if (!selected && manual && !preferred) {
      status.textContent =
        'Choose a weekday within the next three months at a listed morning time (Malaysia time).';
      return;
    }
    if (!preferred && !customerMessage) {
      status.textContent = 'Choose a time or write a message.';
      return;
    }
    button.disabled = true;
    status.textContent = 'Sending response…';
    const lockedControls = [
      codeInput,
      form.querySelector('button'),
      ...responseForm.querySelectorAll('input, textarea'),
    ];
    lockedControls.forEach((control) => {
      control.disabled = true;
    });
    try {
      await callGateway({
        action: 'respond',
        code: responseCode,
        message: customerMessage,
        requested_at: preferred,
      });
      responseForm.reset();
      responseWrap.hidden = true;
      try {
        const refreshed = await callGateway({ action: 'lookup', code: responseCode });
        render(refreshed.booking);
        message.textContent =
          'Response saved. Your request is back in Pending Review in the prototype tracker.';
      } catch (_) {
        message.textContent =
          'Response saved, but the latest status could not refresh. Find your booking again to view the update.';
      }
    } catch (error) {
      status.textContent =
        error.name === 'TimeoutError' || error instanceof TypeError
          ? 'Could not connect. Please try again.'
          : error.message;
    } finally {
      button.disabled = false;
      lockedControls.forEach((control) => {
        control.disabled = false;
      });
    }
  });
})();
