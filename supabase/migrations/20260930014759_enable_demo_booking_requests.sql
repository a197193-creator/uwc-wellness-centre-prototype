-- The public site may submit fictional requests, never real bookings or payments.
alter table public.appointments
  add column plan_snapshot jsonb not null default '{}'::jsonb;

insert into public.packages (id, name, proposed_price, duration_minutes)
values ('custom', 'Custom screening selection', 0, 60);

create or replace function private.issue_code_after_payment()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  attempt integer;
begin
  -- Real appointments get a code only after payment. Fictional demo requests
  -- receive a reference code without falsely marking their payment as paid.
  if (new.payment_status <> 'paid' and not new.is_demo) or new.booking_code is not null then
    return null;
  end if;
  for attempt in 1..12 loop
    begin
      update public.appointments
         set booking_code = private.random_booking_code()
       where id = new.id and booking_code is null;
      return null;
    exception when unique_violation then
      -- Retry a rare collision with fresh cryptographic randomness.
    end;
  end loop;
  raise exception 'Unable to issue a unique booking code';
end;
$$;

drop trigger issue_code_after_payment on public.appointments;
create trigger issue_code_after_payment
after insert or update on public.appointments
for each row when ((new.payment_status = 'paid' or new.is_demo) and new.booking_code is null)
execute function private.issue_code_after_payment();

create or replace function public.guest_booking_lookup(p_code text, p_ip_hash text)
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
  where a.booking_code = normalized and (a.payment_status = 'paid' or a.is_demo);
  return result;
end;
$$;

create or replace function public.guest_booking_respond(
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
   where booking_code = normalized and (payment_status = 'paid' or is_demo)
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

create function public.guest_demo_create(p_data jsonb, p_ip_hash text)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare
  chosen_package public.packages%rowtype;
  chosen_items jsonb;
  visitor_name text := btrim(coalesce(p_data->>'name', ''));
  visitor_email text := lower(btrim(coalesce(p_data->>'email', '')));
  visitor_phone text := btrim(coalesce(p_data->>'phone', ''));
  visitor_note text := btrim(coalesce(p_data->>'notes', ''));
  contact_method text := p_data->>'contact_method';
  first_visit text := p_data->>'first_visit';
  proposed_total numeric(10,2);
  requested_at timestamptz;
  local_time timestamp;
  new_id uuid;
  issued_code text;
begin
  if not private.take_lookup_attempt(p_ip_hash) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 8192 then
    raise exception 'demo_request_invalid' using errcode = 'P0001';
  end if;
  select * into chosen_package from public.packages
   where id = p_data->>'package_id' and active;
  if not found then raise exception 'demo_request_invalid' using errcode = 'P0001'; end if;
  chosen_items := p_data->'items';
  if jsonb_typeof(chosen_items) is distinct from 'array' then
    raise exception 'demo_request_invalid' using errcode = 'P0001';
  end if;
  if jsonb_array_length(chosen_items) not between 1 and 40
     or exists (
       select 1 from jsonb_array_elements(chosen_items) as elem(value)
       where jsonb_typeof(value) <> 'object'
          or coalesce(value->>'kind', '') not in ('package','test')
          or length(coalesce(value->>'id', '')) not between 1 and 80
          or length(coalesce(value->>'name', '')) not between 1 and 160
     ) then
    raise exception 'demo_request_invalid' using errcode = 'P0001';
  end if;
  if (chosen_package.id = 'custom' and exists (
        select 1 from jsonb_array_elements(chosen_items) as elem(value) where value->>'kind' = 'package'
      )) or (chosen_package.id <> 'custom' and not exists (
        select 1 from jsonb_array_elements(chosen_items) as elem(value)
        where value->>'kind' = 'package' and value->>'id' = chosen_package.id
      )) then
    raise exception 'demo_request_invalid' using errcode = 'P0001';
  end if;
  if length(visitor_name) not between 2 and 100
     or visitor_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or length(visitor_email) > 254
     or visitor_phone !~ '^\+?[0-9]{7,15}$'
     or length(visitor_note) > 500
     or coalesce(contact_method, '') not in ('Phone call','WhatsApp','Email')
     or coalesce(first_visit, '') not in ('Yes','No')
     or coalesce(p_data->>'consent', '') <> 'true'
     or coalesce(p_data->>'indicative_total', '') !~ '^[0-9]{1,5}(\.[0-9]{1,2})?$'
     or coalesce(p_data->>'scheduled_at', '') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,3})?Z$' then
    raise exception 'demo_request_invalid' using errcode = 'P0001';
  end if;
  proposed_total := (p_data->>'indicative_total')::numeric;
  if proposed_total < chosen_package.proposed_price or proposed_total > 99999 then
    raise exception 'demo_request_invalid' using errcode = 'P0001';
  end if;
  requested_at := (p_data->>'scheduled_at')::timestamptz;
  local_time := requested_at at time zone 'Asia/Kuala_Lumpur';
  if local_time::date <= (now() at time zone 'Asia/Kuala_Lumpur')::date
     or local_time::date > ((now() at time zone 'Asia/Kuala_Lumpur')::date + interval '3 months')::date
     or extract(isodow from local_time) not between 1 and 5
     or to_char(local_time, 'HH24:MI') not in ('08:00','08:30','09:00','09:30','10:00') then
    raise exception 'demo_request_invalid' using errcode = 'P0001';
  end if;
  insert into public.appointments (
    package_id, package_name, customer_name, customer_email, customer_phone,
    scheduled_at, duration_minutes, status, payment_status, amount_due, amount_paid,
    is_demo, plan_snapshot
  ) values (
    chosen_package.id, chosen_package.name, visitor_name, visitor_email, visitor_phone,
    requested_at, chosen_package.duration_minutes, 'pending_review', 'pending', proposed_total, 0,
    true,
    jsonb_build_object('items', chosen_items, 'contact_method', contact_method,
                       'first_visit', first_visit, 'booking_notes', visitor_note,
                       'indicative_total', proposed_total)
  ) returning id into new_id;
  select booking_code into issued_code from public.appointments where id = new_id;
  if issued_code is null then raise exception 'Code was not issued'; end if;
  insert into public.appointment_events
    (appointment_id, actor_type, event_type, new_status, message)
  values (new_id, 'customer', 'demo_request_created', 'pending_review',
          'Prototype request only; no live appointment or payment');
  return jsonb_build_object('booking_code', issued_code, 'status', 'pending_review',
                            'payment_status', 'pending', 'scheduled_at', requested_at,
                            'package_name', chosen_package.name);
end;
$$;
revoke execute on function public.guest_demo_create(jsonb,text) from public, anon, authenticated;
grant execute on function public.guest_demo_create(jsonb,text) to service_role;

create or replace function private.admin_action(
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
  if p_action in ('approve', 'complete') and booking.payment_status <> 'paid' and not booking.is_demo then
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
