-- UWC demonstration only. No live checkout or booking submission is connected.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create table public.packages (
  id text primary key,
  name text not null,
  proposed_price numeric(10,2) not null check (proposed_price >= 0),
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  active boolean not null default true
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  booking_code text unique check (booking_code is null or booking_code ~ '^BK-[A-HJ-KM-NP-Z2-9]{12}$'),
  package_id text not null references public.packages(id),
  package_name text not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  status text not null default 'pending_review'
    check (status in ('pending_review','confirmed','rejected','changes_requested','completed','cancelled')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','failed','refunded')),
  amount_due numeric(10,2) not null check (amount_due >= 0),
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  payment_method text,
  transaction_reference text,
  paid_at timestamptz,
  customer_visible_note text,
  customer_response text,
  customer_requested_at timestamptz,
  suggested_slots timestamptz[] not null default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointment_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  author_id uuid references auth.users(id),
  body text not null check (length(btrim(body)) between 1 and 2000),
  visibility text not null check (visibility in ('internal','customer')),
  created_at timestamptz not null default now()
);

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  actor_id uuid references auth.users(id),
  actor_type text not null check (actor_type in ('admin','customer','system')),
  event_type text not null,
  old_status text,
  new_status text,
  message text,
  created_at timestamptz not null default now()
);

create table private.lookup_attempts (
  ip_hash text not null,
  window_start timestamptz not null,
  attempts integer not null default 1,
  primary key (ip_hash, window_start)
);

create index appointments_schedule_idx on public.appointments (scheduled_at);
create index appointments_status_created_idx on public.appointments (status, created_at desc);
create index appointments_payment_idx on public.appointments (payment_status);
create index appointments_package_idx on public.appointments (package_id);
create index appointment_notes_appointment_idx on public.appointment_notes (appointment_id, created_at desc);
create index appointment_events_appointment_idx on public.appointment_events (appointment_id, created_at desc);
create index appointment_notes_author_idx on public.appointment_notes (author_id);
create index appointment_events_actor_idx on public.appointment_events (actor_id);
create index lookup_attempts_window_idx on private.lookup_attempts (window_start);

alter table public.packages enable row level security;
alter table public.admin_users enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_notes enable row level security;
alter table public.appointment_events enable row level security;
alter table private.lookup_attempts enable row level security;

revoke all on public.packages, public.admin_users, public.appointments,
  public.appointment_notes, public.appointment_events from anon, authenticated;
grant select on public.packages to anon, authenticated;
grant select on public.admin_users, public.appointments,
  public.appointment_notes, public.appointment_events to authenticated;
grant select, insert, update on private.lookup_attempts to service_role;

create function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin')
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create policy packages_visible on public.packages for select to anon, authenticated
  using (active);
create policy admin_users_self on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));
create policy appointments_admin_read on public.appointments for select to authenticated
  using ((select private.is_admin()));
create policy appointment_notes_admin_read on public.appointment_notes for select to authenticated
  using ((select private.is_admin()));
create policy appointment_events_admin_read on public.appointment_events for select to authenticated
  using ((select private.is_admin()));

create function private.random_booking_code()
returns text language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := 'BK-';
  value integer;
begin
  while length(result) < 15 loop
    value := get_byte(extensions.gen_random_bytes(1), 0);
    if value < 248 then
      result := result || substr(alphabet, (value % 31) + 1, 1);
    end if;
  end loop;
  return result;
end;
$$;

create function private.issue_code_after_payment()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  attempt integer;
begin
  if new.payment_status <> 'paid' or new.booking_code is not null then return null; end if;
  for attempt in 1..12 loop
    begin
      update public.appointments
         set booking_code = private.random_booking_code()
       where id = new.id and booking_code is null;
      return null;
    exception when unique_violation then
      -- Retry the rare code collision with fresh cryptographic randomness.
    end;
  end loop;
  raise exception 'Unable to issue a unique booking code';
end;
$$;
create trigger issue_code_after_payment
after insert or update on public.appointments
for each row when (new.payment_status = 'paid' and new.booking_code is null)
execute function private.issue_code_after_payment();

create function private.touch_appointment()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger touch_appointment before update on public.appointments
for each row execute function private.touch_appointment();

create function private.take_lookup_attempt(p_ip_hash text)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare
  count_now integer;
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  insert into private.lookup_attempts (ip_hash, window_start, attempts)
  values (p_ip_hash, date_trunc('minute', now()), 1)
  on conflict (ip_hash, window_start)
  do update set attempts = private.lookup_attempts.attempts + 1
  returning attempts into count_now;
  return count_now <= 10;
end;
$$;

create function public.guest_booking_lookup(p_code text, p_ip_hash text)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare
  normalized text := upper(btrim(coalesce(p_code, '')));
  result jsonb;
begin
  if not private.take_lookup_attempt(p_ip_hash) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if normalized !~ '^BK-[A-HJ-KM-NP-Z2-9]{12}$' then return null; end if;
  select jsonb_build_object(
    'booking_code', a.booking_code,
    'package_name', a.package_name,
    'scheduled_at', a.scheduled_at,
    'duration_minutes', a.duration_minutes,
    'status', a.status,
    'payment_status', a.payment_status,
    'amount_paid', a.amount_paid,
    'customer_visible_note', a.customer_visible_note,
    'suggested_slots', a.suggested_slots,
    'created_at', a.created_at,
    'is_demo', a.is_demo
  ) into result
  from public.appointments a
  where a.booking_code = normalized and a.payment_status = 'paid';
  return result;
end;
$$;

create function public.guest_booking_respond(
  p_code text, p_ip_hash text, p_message text, p_requested_at timestamptz default null
)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare
  normalized text := upper(btrim(coalesce(p_code, '')));
  message_text text := btrim(coalesce(p_message, ''));
  booking public.appointments%rowtype;
begin
  if not private.take_lookup_attempt(p_ip_hash) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if normalized !~ '^BK-[A-HJ-KM-NP-Z2-9]{12}$' then return false; end if;
  if length(message_text) > 1000 or (message_text = '' and p_requested_at is null) then
    raise exception 'response_invalid' using errcode = 'P0001';
  end if;
  if p_requested_at is not null
     and (p_requested_at < now() or p_requested_at > now() + interval '3 months') then
    raise exception 'response_invalid' using errcode = 'P0001';
  end if;
  select * into booking from public.appointments
   where booking_code = normalized and payment_status = 'paid'
   for update;
  if not found or booking.status <> 'changes_requested' then return false; end if;
  update public.appointments
     set status = 'pending_review',
         customer_response = nullif(message_text, ''),
         customer_requested_at = p_requested_at,
         suggested_slots = '{}'
   where id = booking.id;
  insert into public.appointment_events
    (appointment_id, actor_type, event_type, old_status, new_status, message)
  values (booking.id, 'customer', 'change_response', booking.status, 'pending_review',
          coalesce(nullif(message_text, ''), 'Customer selected a new preferred time'));
  return true;
end;
$$;

create function private.admin_action(
  p_id uuid, p_action text, p_note text default null,
  p_scheduled_at timestamptz default null, p_suggested_slots timestamptz[] default '{}'
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  booking public.appointments%rowtype;
  next_status text;
  note_text text := btrim(coalesce(p_note, ''));
  note_visibility text;
  conflict_count integer := 0;
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  select * into booking from public.appointments where id = p_id for update;
  if not found then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if length(note_text) > 2000 then raise exception 'Note is too long'; end if;

  if p_action in ('note_internal', 'note_customer') then
    if note_text = '' then raise exception 'A note is required'; end if;
    note_visibility := case when p_action = 'note_internal' then 'internal' else 'customer' end;
    insert into public.appointment_notes (appointment_id, author_id, body, visibility)
      values (p_id, auth.uid(), note_text, note_visibility);
    if note_visibility = 'customer' then
      update public.appointments set customer_visible_note = note_text where id = p_id;
    end if;
    insert into public.appointment_events
      (appointment_id, actor_id, actor_type, event_type, old_status, new_status, message)
    values (p_id, auth.uid(), 'admin', 'note_added', booking.status, booking.status,
            case when note_visibility = 'internal' then 'Internal note added' else note_text end);
    return jsonb_build_object('status', booking.status, 'conflicts', 0);
  end if;

  if p_action in ('reject', 'request_changes') and note_text = '' then
    raise exception 'A customer-visible reason is required';
  end if;
  if p_action in ('approve', 'complete') and booking.payment_status <> 'paid' then
    raise exception 'Payment is not confirmed';
  end if;
  if p_action = 'reschedule' and (p_scheduled_at is null or p_scheduled_at <= now()) then
    raise exception 'Choose a future date and time';
  end if;
  if p_action = 'request_changes' and (
      coalesce(array_length(p_suggested_slots, 1), 0) > 3
      or exists (select 1 from unnest(p_suggested_slots) as slot where slot <= now())
    ) then
    raise exception 'Suggest up to three future times';
  end if;

  next_status := case p_action
    when 'approve' then 'confirmed'
    when 'reject' then 'rejected'
    when 'request_changes' then 'changes_requested'
    when 'complete' then 'completed'
    when 'cancel' then 'cancelled'
    when 'reschedule' then booking.status
    else null end;
  if next_status is null then raise exception 'Unknown action'; end if;

  update public.appointments
     set status = next_status,
         scheduled_at = case when p_action = 'reschedule' then p_scheduled_at else scheduled_at end,
         customer_visible_note = case when p_action in ('reject', 'request_changes')
                                      then note_text else customer_visible_note end,
         suggested_slots = case when p_action = 'request_changes'
                                then coalesce(p_suggested_slots, '{}') else suggested_slots end
   where id = p_id;

  if note_text <> '' then
    note_visibility := case when p_action in ('reject','request_changes')
                            then 'customer' else 'internal' end;
    insert into public.appointment_notes (appointment_id, author_id, body, visibility)
      values (p_id, auth.uid(), note_text, note_visibility);
    insert into public.appointment_events
      (appointment_id, actor_id, actor_type, event_type, old_status, new_status, message)
    values (p_id, auth.uid(), 'admin', 'note_added', booking.status, next_status,
            case when note_visibility = 'internal' then 'Internal note added' else note_text end);
  end if;
  insert into public.appointment_events
    (appointment_id, actor_id, actor_type, event_type, old_status, new_status, message)
  values (p_id, auth.uid(), 'admin',
          case when p_action = 'reschedule' then 'rescheduled' else 'status_changed' end,
          booking.status, next_status,
          case when p_action = 'reschedule' then 'Appointment time updated' else p_action end);

  select count(*) into conflict_count from public.appointments other
   where other.id <> p_id and other.status = 'confirmed'
     and tstzrange(other.scheduled_at,
           other.scheduled_at + make_interval(mins => other.duration_minutes), '[)')
         && tstzrange(
           case when p_action = 'reschedule' then p_scheduled_at else booking.scheduled_at end,
           (case when p_action = 'reschedule' then p_scheduled_at else booking.scheduled_at end)
             + make_interval(mins => booking.duration_minutes), '[)');
  return jsonb_build_object('status', next_status, 'conflicts', conflict_count);
end;
$$;

create function public.admin_action(
  p_id uuid, p_action text, p_note text default null,
  p_scheduled_at timestamptz default null, p_suggested_slots timestamptz[] default '{}'
)
returns jsonb language sql security invoker set search_path = ''
as $$
  select private.admin_action(p_id, p_action, p_note, p_scheduled_at, p_suggested_slots)
$$;

revoke execute on all functions in schema private from public, anon;
revoke execute on function public.guest_booking_lookup(text,text) from public, anon, authenticated;
revoke execute on function public.guest_booking_respond(text,text,text,timestamptz) from public, anon, authenticated;
revoke execute on function public.admin_action(uuid,text,text,timestamptz,timestamptz[]) from public, anon;
grant execute on function public.guest_booking_lookup(text,text) to service_role;
grant execute on function public.guest_booking_respond(text,text,text,timestamptz) to service_role;
grant execute on function private.take_lookup_attempt(text) to service_role;
grant execute on function private.admin_action(uuid,text,text,timestamptz,timestamptz[]) to authenticated;
grant execute on function public.admin_action(uuid,text,text,timestamptz,timestamptz[]) to authenticated;

insert into public.packages (id, name, proposed_price, duration_minutes) values
  ('baseline', 'Precision Baseline Health Screening', 450, 60),
  ('expanded', 'Precision Expanded Health Screening', 1800, 90),
  ('wellness-status', 'Precision Wellness and Health Status', 4200, 120),
  ('longevity', 'Precision Longevity', 7500, 180);

insert into public.appointments
  (package_id, package_name, customer_name, customer_email, customer_phone,
   scheduled_at, duration_minutes, status, payment_status, amount_due, amount_paid,
   payment_method, transaction_reference, paid_at, is_demo)
values
  ('baseline', 'Precision Baseline Health Screening', 'Demo Visitor A',
   'visitor-a@example.invalid', '+60000000001', now() + interval '7 days', 60,
   'pending_review', 'paid', 450, 450, 'Demo only', 'DEMO-NO-CHARGE-A',
   now() - interval '1 day', true),
  ('expanded', 'Precision Expanded Health Screening', 'Demo Visitor B',
   'visitor-b@example.invalid', '+60000000002', now() + interval '9 days', 90,
   'changes_requested', 'paid', 1800, 1800, 'Demo only', 'DEMO-NO-CHARGE-B',
   now() - interval '2 days', true);

update public.appointments
   set customer_visible_note = 'Please choose a later morning time for this longer screening.',
       suggested_slots = array[scheduled_at + interval '1 day', scheduled_at + interval '2 days']
 where customer_email = 'visitor-b@example.invalid';

insert into public.appointment_events
  (appointment_id, actor_type, event_type, new_status, message)
select id, 'system', 'demo_created', status, 'Fictional sample booking; no payment was charged'
from public.appointments where is_demo;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;
