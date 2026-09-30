# UWC prototype — demo dashboard and request flow

This is a **prototype demonstration**, not a live booking or payment system. The public site can now save a *demo appointment request* in Supabase and return a tracking code. It does not reserve a real UWC slot or collect payment. Use test contact details only; do not enter patient, identification, medical, or payment information. The seeded records use fictional `example.invalid` addresses and have no payment recorded.

## What's included

- `public.packages`: the four proposed packages and example durations.
- `public.appointments`: fictional samples and submitted demo requests. A PostgreSQL trigger issues unique codes to demo requests without marking them paid; future real bookings still require `payment_status='paid'` before code issuance.
- `public.admin_users`: links a Supabase Auth user to the admin role.
- `public.appointment_notes` and `public.appointment_events`: note visibility and audit history.
- `private.lookup_attempts`: 10 guest code attempts per minute per forwarded IP address, stored as a keyed hash.
- Row-level security (RLS) on every table. Anonymous and non-admin users have no direct appointment SELECT privilege.
- The `booking-gateway` Edge Function handles guest demo submission, lookup and responses. Its service credential is server-side only.

The `/admin/` page is now a **standalone UI preview**: its fictional records and actions stay in the browser tab. It does not read or change Supabase appointments. No account, real email, or SMTP configuration is required to use that page. The Supabase admin-role table and RLS remain in place for a future authenticated dashboard.

The prototype intentionally has no real payment webhook, confirmation email, or live booking submission. A production launch needs those integrations plus UWC approval of slots, durations, retention, and privacy wording.

## Open the admin demo

Visit `/admin/` and sign in with the credentials shown on the page: username `demo`, password `uwc-demo`. They are deliberately public and provide **no security boundary**. The dashboard contains only fictional sample data, not submitted customer details. Use Approve, Reject, Request changes, Reschedule, notes, filters, and the day view to explore the design. Changes reset on page reload or sign-out.

Do not use this demo password to protect real records. A future connected staff dashboard must restore Supabase Auth and the database-enforced admin role.

## Test the sample flow

1. On the public site, select a package, enter **test** contact details, choose a preferred weekday and time, review all information, then press **Send demo request**. Save the code shown on the confirmation screen. The request appears as `pending_review` with payment `pending`, amount paid RM0. No charge is made. A second demo request may be started immediately; the first need not be completed.
2. In Supabase SQL Editor, you can also get the generated codes for fictional samples (do not share these with real customers):

```sql
select booking_code, package_name, status, is_demo
from public.appointments
where is_demo
order by created_at;
```

3. Open `/track/`, enter the code, and confirm only package, appointment, status, payment status, amount paid, customer-visible note, and creation date appear. The browser formats times in the visitor's local timezone with a short label.
4. Open `/admin/` with the public demo credentials above. Its fictional sample records let you preview staff actions, but they are **not linked** to the public request you just submitted. Dashboard changes do not appear in `/track/`.
5. For a backend sample booking already in `changes_requested`, use `/track/` to choose a suggested time or send a message. The status returns to Pending Review in Supabase. The current standalone admin demo will not display that change.
6. A future real paid-booking confirmation remains separate: a server-created real appointment with `payment_status='pending'` has no code until a trusted payment server updates it to `paid`. Do not mark real payments paid manually.

## Access checks

Run these in SQL Editor after migration. Expected: `false` for `anon` and `authenticated`, `true` for `service_role` on table SELECT. RLS policies additionally restrict admin reads to an approved Auth user.

```sql
select
  has_table_privilege('anon', 'public.appointments', 'select') as anon_can_select,
  has_table_privilege('authenticated', 'public.appointments', 'update') as auth_can_update,
  has_table_privilege('service_role', 'public.appointments', 'select') as service_can_select;
```

The authenticated role has SELECT privilege so RLS can permit a future approved admin, but a non-admin receives no rows. The current demo dashboard makes no appointment-table queries. Guest lookup is not a table SELECT: the Edge Function calls a service-only RPC that returns a strict safe-field JSON projection. It never returns name, email, phone, payment provider reference, or internal notes. Invalid and unknown codes return the same message.

## Deployment

The SQL migrations are in `supabase/migrations/`, beginning with `20260930010830_uwc_demo_booking_admin.sql`. The Edge Function is `supabase/functions/booking-gateway/index.ts` and uses Supabase's server-side `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEYS`) environment variable. Never copy that secret into `demo-config.js` or the browser. `demo-config.js` contains only the public project URL and publishable key.

The site remains a static HTML/CSS/JavaScript project plus its existing PHP status endpoint. GitHub pushes deploy to the existing Vercel project and its same stable public link.
