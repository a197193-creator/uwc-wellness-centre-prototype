# UWC database demonstration — setup and test

This is a **prototype demonstration**, not a live booking or payment system. The public site can now save a *demo appointment request* in Supabase and return a tracking code. It does not reserve a real UWC slot or collect payment. Use test contact details only; do not enter patient, identification, medical, or payment information. The seeded records use fictional `example.invalid` addresses and have no payment recorded.

## What's included

- `public.packages`: the four proposed packages and example durations.
- `public.appointments`: fictional samples and submitted demo requests. A PostgreSQL trigger issues unique codes to demo requests without marking them paid; future real bookings still require `payment_status='paid'` before code issuance.
- `public.admin_users`: links a Supabase Auth user to the admin role.
- `public.appointment_notes` and `public.appointment_events`: note visibility and audit history.
- `private.lookup_attempts`: 10 guest code attempts per minute per forwarded IP address, stored as a keyed hash.
- Row-level security (RLS) on every table. Anonymous and non-admin users have no direct appointment SELECT privilege.
- The `booking-gateway` Edge Function handles guest demo submission, lookup and responses. Its service credential is server-side only.

The demo intentionally has no real payment webhook, confirmation email, or live booking submission. A production launch needs those integrations plus UWC approval of slots, durations, retention, and privacy wording.

## Create the first admin securely

1. Visit `/admin/` and select **Create account**, or create/invite the account under Supabase Dashboard → Authentication → Users. Confirm the email. Account creation alone does **not** grant admin access. Do not put credentials in Git or this website.
2. Copy that Auth user's UUID. In the Supabase SQL Editor, run this once, replacing the placeholder:

```sql
insert into public.admin_users (user_id, role)
values ('PASTE-AUTH-USER-UUID-HERE'::uuid, 'admin')
on conflict (user_id) do update set role = excluded.role;
```

3. Visit `/admin/` on the website and sign in. An Auth account without an `admin_users` row cannot read the dashboard data.

Supabase Auth requires the confirmation redirect `https://uwc-wellness-centre-prototype.vercel.app/admin/` in Authentication → URL Configuration. The project's default mailer may send only to pre-authorized team addresses; configure a trusted custom SMTP service before inviting other staff. Do not disable email confirmation just to bypass this requirement.

## Test the sample flow

1. On the public site, select a package, enter **test** contact details, choose a preferred weekday and time, then press **Confirm demo request**. Save the code. The request appears as `pending_review` with payment `pending`, amount paid RM0. No charge is made.
2. In Supabase SQL Editor, you can also get the generated codes for fictional samples (do not share these with real customers):

```sql
select booking_code, package_name, status, is_demo
from public.appointments
where is_demo
order by created_at;
```

3. Open `/track/`, enter the code, and confirm only package, appointment, status, payment status, amount paid, customer-visible note, and creation date appear. The browser formats times in the visitor's local timezone with a short label.
4. Sign in at `/admin/` with an approved admin account. Open the request to view its test contact details and selected plan; try Approve, Reject, Request changes, Reschedule, notes, and day view. All mutations require a confirmation dialog and appear in the audit history. For demo requests, Approve updates the **prototype status only**, even though no payment was taken.
5. For a booking in `changes_requested`, use `/track/` to choose a suggested time or send a message. The status returns to Pending Review and appears in the admin dashboard via Realtime (or Refresh if interrupted).
6. A future real paid-booking confirmation remains separate: a server-created real appointment with `payment_status='pending'` has no code until a trusted payment server updates it to `paid`. Do not mark real payments paid manually.

## Access checks

Run these in SQL Editor after migration. Expected: `false` for `anon` and `authenticated`, `true` for `service_role` on table SELECT. RLS policies additionally restrict admin reads to an approved Auth user.

```sql
select
  has_table_privilege('anon', 'public.appointments', 'select') as anon_can_select,
  has_table_privilege('authenticated', 'public.appointments', 'update') as auth_can_update,
  has_table_privilege('service_role', 'public.appointments', 'select') as service_can_select;
```

The authenticated role has SELECT privilege so RLS can permit admins, but a non-admin receives no rows. Guest lookup is not a table SELECT: the Edge Function calls a service-only RPC that returns a strict safe-field JSON projection. It never returns name, email, phone, payment provider reference, or internal notes. Invalid and unknown codes return the same message.

## Deployment

The SQL migrations are in `supabase/migrations/`, beginning with `20260930010830_uwc_demo_booking_admin.sql`. The Edge Function is `supabase/functions/booking-gateway/index.ts` and uses Supabase's server-side `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEYS`) environment variable. Never copy that secret into `demo-config.js` or the browser. `demo-config.js` contains only the public project URL and publishable key.

The site remains a static HTML/CSS/JavaScript project plus its existing PHP status endpoint. GitHub pushes deploy to the existing Vercel project and its same stable public link.
