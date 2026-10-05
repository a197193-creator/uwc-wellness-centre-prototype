# UWC review corrections and technical checks — 5 October 2026

The user requested the recorded corrections for UWC09. No new supervisor comments were present in the Google Sheet. This release includes the pending 1 October appointment/admin fixes from PR #1 plus the corrections found in today's technical review. UWC officer acceptance is still required under UWC08.

## Corrections

- Use Malaysia dates for the admin list, date filters and day view; keep sample times within the displayed morning options.
- Apply the same rolling three-month weekday and five morning-slot rules to public appointments, admin rescheduling/suggestions and manual tracker responses. Interpret entered service times as Malaysia time; show tracker results in the visitor's local timezone.
- Repair the admin layout at 320px. Keep the wide appointments table scrollable inside its card.
- Show overlap warnings before an admin confirms an approval/reschedule and inside the details dialog afterwards. Duration is included in the calculation; touching endpoints do not overlap.
- Keep keyboard focus inside dialogs and return it to the opening control when closed.
- Disable review editing and duplicate clicks while a demo request is being sent. A failed connection or timeout restores the controls.
- Normalize booking-code spaces/case, clear response drafts when switching bookings, reject invalid manual times and acknowledge responses in the prototype tracker. If a saved response cannot refresh, explain that it was saved and ask the customer to look up the code again.

## Observed checks

| Area | Result |
| --- | --- |
| Public journey | Package → plan → customer details → appointment → final review → demo submission → booking-code confirmation passed. One fictional request was saved on 5 October for 6 October at 9:00 a.m. Malaysia time. |
| Validation | Blank required fields, name digits, phone letters, missing date/time, weekends, same-day dates, out-of-window dates, invalid calendar dates and unlisted times were handled. A January 31 three-month window clamps to April 30. |
| Network failure | Simulated gateway failure kept the review open and restored retry controls. Escape and edit controls could not change a request while sending. The actual request was tested from the gateway's allowed local origin on port 4173. |
| Confirmation and exports | Code `BK-GD77PUJCGGQW` displayed; generated PDF had a PDF header and code; print summary included the code. |
| Repeat request | A second request can start immediately with plan/contact details retained and a fresh required date/time. The first code remained available in the tracker. |
| Actual tracking | Saved request returned Pending Review, the correct date/time with GMT+8 in the Malaysia test browser, payment not taken and MYR 0.00 paid. Input containing spaces/lowercase found the same request. |
| Lookup boundary | The actual lookup returned only status, demo flag, created date, amount paid, code, package, appointment, payment status, suggested slots, duration and customer-visible note. Direct anonymous `appointments?select=id&limit=1` returned HTTP 401. |
| Tracker response UI | Controlled responses verified no cross-booking draft carryover, invalid-time rejection, Malaysia-time conversion, Pending Review refresh and recoverable network errors. These UI checks did not alter another stored booking. |
| Admin preview | Wrong demo password rejected; reschedule, approval, change request, internal note, complete/cancel actions, audit history, filters and empty results passed. Duplicate suggested slots were rejected. Overlap warnings were visible before confirmation and in details. |
| Responsive layout | Public, tracker and admin checked at 320px and 390px; no page-level horizontal overflow. Customer and conflict dialogs remained within the viewport. |
| Keyboard | Visible labels/focus and dialog Tab/Shift+Tab boundaries checked. Escape closed a ready dialog and returned focus to its opener. Reduced-motion preference was recognized. This is a technical check, not a formal accessibility certification. |
| Build | JavaScript syntax, website build, source/dist parity and Git whitespace checks passed. |

## Review links

- Public website: https://uwc-wellness-centre-prototype.vercel.app/
- Tracker: https://uwc-wellness-centre-prototype.vercel.app/track/
- Admin preview: https://uwc-wellness-centre-prototype.vercel.app/admin/ — username `demo`, password `uwc-demo`
- Source and correction review: https://github.com/a197193-creator/uwc-wellness-centre-prototype/pull/1

The admin preview continues to use separate fictional records and cannot update submitted requests. No payment is collected and no real UWC slot is reserved. UWC must still confirm catalogue prices/scope, holidays, service-time rules and privacy wording before a production phase. The 6 October final pass/demonstration preparation and 7 October meeting remain ahead.
