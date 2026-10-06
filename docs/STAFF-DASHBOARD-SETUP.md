# Connected UWC staff dashboard

Website: https://uwc-wellness-centre-prototype.vercel.app/

Staff dashboard: https://uwc-wellness-centre-prototype.vercel.app/admin/

Booking tracker: https://uwc-wellness-centre-prototype.vercel.app/track/

## First admin: simple setup

The website now uses the same Supabase database as submitted booking requests.
The old public `demo / uwc-demo` credentials no longer work. Your Supabase
organisation login is separate from a staff account in Supabase Auth.

1. Open the staff dashboard and choose **Create staff account**. Enter your email,
   choose a private password of at least 12 characters, and confirm it. Verify your
   email if Supabase sends a confirmation message. Never send your password in chat.
2. As the project owner, open **Authentication → Users**:
   https://supabase.com/dashboard/project/fxgzewuwiccmaqayfclm/auth/users
   Find your account and check that its email is confirmed.
3. Open **SQL Editor** in the same project and run the snippet below. Replace
   `YOUR_STAFF_EMAIL` with the exact account email. This explicitly grants access
   to all booking/customer records, notes and staff actions. Only approve trusted staff.
4. Return to the staff dashboard, choose **Back to sign in**, and use that email
   and the password you chose. The stored booking requests should now appear.

```sql
do $$
declare staff_id uuid;
begin
  select id into staff_id
  from auth.users
  where lower(email) = lower('YOUR_STAFF_EMAIL')
    and email_confirmed_at is not null
    and coalesce(is_anonymous, false) = false;
  if staff_id is null then
    raise exception 'Create and confirm this staff account first.';
  end if;
  insert into public.admin_users(user_id, role)
  values (staff_id, 'admin')
  on conflict (user_id) do update set role = 'admin';
end $$;
```

If you prefer not to use confirmation emails, the project owner can instead
create the user manually in **Authentication → Users → Add user → Create new
user**, enter the private password personally, and select **Auto Confirm User**
when offered. Then run the same approval SQL. This does not disable project-wide
email security or make new signups admins.

To remove staff access, delete only the matching `admin_users` membership. Do not
delete appointments or disable RLS. The UI rechecks membership on refresh, and
the database checks it on every read/action even if an old session token exists.

## What is connected

- `appointments`: saved requests, customer/contact fields, plan snapshot and slot.
- `appointment_notes`: internal versus customer-visible notes.
- `appointment_events`: immutable staff/customer audit history with account IDs.
- `admin_users`: owner-approved role; no public self-promotion.
- Supabase Auth: private staff login, with the session kept in this browser tab.
- Supabase Realtime: new bookings/replies refresh automatically; a 30-second
  refresh is also used as a fallback. Manual refresh remains available.
- Approve, reject, request changes, reschedule, complete and cancel save through
  the role-checked `admin_save_action` RPC, not browser-only changes.
- Search, status/payment/package/date filters, sorting, pagination, summary
  cards, day view and duration-based overlap warnings use stored bookings.

Payment remains disabled. Demonstration requests can be reviewed without a
payment; they do not reserve real UWC slots. Non-demo unpaid bookings cannot be
approved or completed. The dashboard never marks a payment paid or edits payment
fields. Indicative plan totals are not revenue.

## Tests

1. Submit a demo request on the public site using test contact details. Save its code.
2. Sign in as an approved staff user; find that code in the dashboard.
3. Add an internal note and a customer-visible note. Only the customer-visible
   note should appear in the tracker.
4. Request changes with a valid suggested morning time. Check the note/slot in
   the tracker, submit a customer response, and verify Pending Review and the
   response in the dashboard. Refresh details before the next action.
5. Approve or reschedule; reload the dashboard to confirm persistence. Check the
   tracker again. Try completing/cancelling another suitable test record.
6. Open a private browser with no login: no booking table data should load. A
   registered but unapproved account should see an approval message, not bookings.
7. Try saving an old details view after another staff member changes that record:
   the server refuses the stale edit. Refresh and review before retrying.

Automated checks: `npm ci`, then `npm test` (18 code/UI tests).
`supabase/tests/staff_dashboard.sql` contains rollback-only database checks.
All its temporary accounts, notes, events and bookings are rolled back.

## Implementation and deployment

`20261006011026_connect_staff_dashboard.sql` was applied to the existing project
through its SQL Editor. It preserves the existing tables and guest gateway,
adds slot/version validation to staff actions, locks down the older action RPC,
and retains admin-only RLS. No stored bookings are deleted.

The applied migration is recorded in `supabase_migrations.schema_migrations`
with replayable statements; `supabase/record-staff-migration.sql` documents this
one-time metadata step. Security and performance advisors showed zero errors
and warnings. The private rate-limit table intentionally has no public policy;
informational unused-index suggestions were left unchanged for this small dataset.

The backend checks and browser sign-in/create-account layout were verified on
6 October 2026. Initial staff login and live Realtime delivery still require
the first real staff account to be created and approved by the owner; temporary
database test identities are not usable login accounts.

The site remains plain HTML, CSS and JavaScript with the existing PHP endpoint.
The Supabase client is pinned to `2.117.2`, bundled locally in `vendor/`, with
its licence retained. No service-role key or staff password is in the site.

Push the built source to the existing GitHub `main` branch to update the same
Vercel URL. Do not create a new Vercel project or domain.
