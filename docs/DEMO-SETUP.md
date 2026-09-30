# UWC database demonstration — setup and test

This is a **prototype demonstration**, not a live booking or payment system. The public package-selection journey does not write to Supabase. The two seeded records use fictional `example.invalid` addresses and `Demo only` payment labels; no charge took place. Do not enter real customer or payment data into the sample dashboard.

## What's included

- `public.packages`: the four proposed packages and example durations.
- `public.appointments`: fictional bookings with unique codes issued by a PostgreSQL trigger only when `payment_status='paid'`.
- `public.admin_users`: links a Supabase Auth user to the admin role.
- `public.appointment_notes` and `public.appointment_events`: note visibility and audit history.
- `private.lookup_attempts`: 10 guest code attempts per minute per forwarded IP address, stored as a keyed hash.
- Row-level security (RLS) on every table. Anonymous and non-admin users have no direct appointment SELECT privilege.
- The `booking-gateway` Edge Function handles guest lookup and responses. Its service credential is server-side only.

The demo intentionally has no real payment webhook, confirmation email, or public booking submission. A production launch needs those integrations plus UWC approval of slots, durations, retention, and privacy wording.

## Create the first admin securely

1. In the Supabase Dashboard, open Authentication → Users and create/invite your staff account with a strong password. Do not put its credentials in Git or this website.
2. Copy that Auth user's UUID. In the Supabase SQL Editor, run this once, replacing the placeholder:

```sql
insert into public.admin_users (user_id, role)
values ('PASTE-AUTH-USER-UUID-HERE'::uuid, 'admin')
on conflict (user_id) do update set role = excluded.role;
```

3. Visit `/admin/` on the website and sign in. An Auth account without an `admin_users` row cannot read the dashboard data.

## Test the sample flow

1. In Supabase SQL Editor, get the generated demo codes (do not share these with real customers):

```sql
select booking_code, package_name, status, is_demo
from public.appointments
where is_demo
order by created_at;
```

2. Open `/track/`, enter a code, and confirm only package, appointment, status, payment status, amount, customer-visible note, and creation date appear. The browser formats times in the visitor's local timezone.
3. Sign in at `/admin/` with the seeded admin account. Open a booking and try Approve, Reject, Request changes, Reschedule, notes, and day view. All mutations require a confirmation dialog and appear in the audit history.
4. For the sample booking in `changes_requested`, use `/track/` to choose a suggested time or send a message. The status returns to Pending Review and appears in the admin dashboard via Realtime (or Refresh if the connection is interrupted).
5. To demonstrate a future paid-booking confirmation, insert a **fictional** appointment server-side with `payment_status='pending'`. It has no code. Have a trusted server update it to `paid`; the database then generates the code. Do not mark real payments paid manually.

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
