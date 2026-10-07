/* Shared preferred-slot rules for all pages, not a live availability calendar. */
(function () {
  'use strict';
  // Booking dates follow Malaysia time, regardless of the browser's location.
  const zone = 'Asia/Kuala_Lumpur';
  const times = ['08:00', '08:30', '09:00', '09:30', '10:00'];
  // Return Malaysia's date as YYYY-MM-DD; optional now makes boundary tests deterministic.
  function today(now = new Date()) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(now)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  // Tomorrow through three calendar months ahead, clamped to the last month's final day.
  // UTC noon arithmetic avoids daylight-saving shifts when working with calendar dates.
  function windowRange(now = new Date()) {
    const [year, month, day] = today(now).split('-').map(Number);
    const first = new Date(Date.UTC(year, month - 1, day + 1, 12));
    const lastDay = new Date(Date.UTC(year, month + 3, 0, 12)).getUTCDate();
    const last = new Date(Date.UTC(year, month + 2, Math.min(day, lastDay), 12));
    return {
      first: first.toISOString().slice(0, 10),
      last: last.toISOString().slice(0, 10),
      firstMonth: year * 12 + month - 1,
      lastMonth: last.getUTCFullYear() * 12 + last.getUTCMonth(),
    };
  }
  // Require a real date within the window and exclude Saturday/Sunday.
  function validDate(key, now = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return false;
    const range = windowRange(now);
    if (key < range.first || key > range.last) return false;
    const date = new Date(`${key}T12:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === key &&
      ![0, 6].includes(date.getUTCDay())
    );
  }
  // Validate a datetime-local Malaysia slot and convert it to UTC for storage, or return null.
  function slot(value, now = new Date()) {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value || '');
    if (!match || !validDate(match[1], now) || !times.includes(match[2])) return null;
    return new Date(`${value}:00+08:00`).toISOString();
  }
  // Public booking, tracker replies and staff rescheduling share these rules.
  window.UWCAppointmentRules = { zone, times, today, window: windowRange, validDate, slot };
})();
