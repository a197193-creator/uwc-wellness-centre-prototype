-- Connect the staff UI to the existing booking records. No data is deleted,
-- no admin is auto-created, and no payment state is written by this migration.
begin;

-- Each write gets its own version, even when several actions share a transaction.
create or replace function private.touch_appointment()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.touch_appointment() from public, anon, authenticated;

create or replace function private.staff_slot_valid(p_slot timestamptz)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select coalesce(
    (p_slot at time zone 'Asia/Kuala_Lumpur')::date > (now() at time zone 'Asia/Kuala_Lumpur')::date
    and (p_slot at time zone 'Asia/Kuala_Lumpur')::date <=
      ((now() at time zone 'Asia/Kuala_Lumpur')::date + interval '3 months')::date
    and extract(isodow from p_slot at time zone 'Asia/Kuala_Lumpur') between 1 and 5
    and (p_slot at time zone 'Asia/Kuala_Lumpur')::time in
      (time '08:00', time '08:30', time '09:00', time '09:30', time '10:00'), false)
$$;
revoke all on function private.staff_slot_valid(timestamptz) from public, anon, authenticated;

-- Preserve the existing audited implementation, with the prototype's previously
-- approved no-payment rule. Real (non-demo) bookings still require paid status.
do $$
declare definition text;
begin
  select pg_get_functiondef('private.admin_action(uuid,text,text,timestamptz,timestamptz[])'::regprocedure) into definition;
  definition := replace(definition,
    'p_action in (''approve'', ''complete'') and booking.payment_status <> ''paid'' then',
    'p_action in (''approve'', ''complete'') and booking.payment_status <> ''paid'' and not booking.is_demo then');
  execute definition;
end $$;

create or replace function private.admin_save_action(
  p_id uuid, p_action text, p_note text, p_scheduled_at timestamptz,
  p_suggested_slots timestamptz[], p_expected_updated_at timestamptz
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  booking public.appointments%rowtype;
  result jsonb;
begin
  if (select auth.uid()) is null or not private.is_admin()
     or coalesce((select auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_action is null or p_action not in
    ('approve','reject','request_changes','reschedule','complete','cancel','note_internal','note_customer') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  select * into booking from public.appointments where id = p_id for update;
  if not found then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if p_expected_updated_at is null or booking.updated_at <> p_expected_updated_at then
    raise exception 'This booking changed. Refresh its details before saving.' using errcode = '40001';
  end if;
  if p_action not in ('note_internal','note_customer') and booking.status in ('completed','rejected','cancelled') then
    raise exception 'This booking is closed. You can add a note, but cannot change its status.' using errcode = '22023';
  end if;
  if p_action = 'complete' and booking.status <> 'confirmed' then
    raise exception 'Confirm the appointment before completing it.' using errcode = '22023';
  end if;
  if p_action = 'approve' and booking.status = 'confirmed' then
    raise exception 'This booking is already confirmed.' using errcode = '22023';
  end if;
  if p_action = 'reschedule' and not private.staff_slot_valid(p_scheduled_at) then
    raise exception 'Choose a weekday from tomorrow through three months at a listed morning time (Malaysia time).' using errcode = '22023';
  end if;
  if p_action = 'request_changes' and (
    coalesce(cardinality(p_suggested_slots), 0) > 3
    or exists(select 1 from unnest(p_suggested_slots) as slot where not private.staff_slot_valid(slot))
    or coalesce(cardinality(p_suggested_slots), 0) <> (select count(distinct slot) from unnest(p_suggested_slots) as slot)
  ) then
    raise exception 'Suggest up to three distinct valid morning times.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_note,''))) > 2000 then
    raise exception 'Note is too long' using errcode = '22023';
  end if;
  result := private.admin_action(p_id, p_action, p_note, p_scheduled_at, coalesce(p_suggested_slots, '{}'));
  -- Internal-note actions also advance the record version and notify Realtime.
  update public.appointments set updated_at = clock_timestamp() where id = p_id;
  return result;
end;
$$;

create or replace function public.admin_save_action(
  p_id uuid, p_action text, p_note text, p_scheduled_at timestamptz,
  p_suggested_slots timestamptz[], p_expected_updated_at timestamptz
)
returns jsonb language sql security invoker set search_path = ''
as $$
  select private.admin_save_action(p_id, p_action, p_note, p_scheduled_at, p_suggested_slots, p_expected_updated_at)
$$;
revoke all on function private.admin_save_action(uuid,text,text,timestamptz,timestamptz[],timestamptz) from public, anon;
revoke all on function public.admin_save_action(uuid,text,text,timestamptz,timestamptz[],timestamptz) from public, anon;
grant execute on function private.admin_save_action(uuid,text,text,timestamptz,timestamptz[],timestamptz) to authenticated;
grant execute on function public.admin_save_action(uuid,text,text,timestamptz,timestamptz[],timestamptz) to authenticated;
-- All staff changes must now go through the validated, version-checked entrypoint.
revoke execute on function private.admin_action(uuid,text,text,timestamptz,timestamptz[]) from authenticated;
revoke execute on function public.admin_action(uuid,text,text,timestamptz,timestamptz[]) from authenticated;

-- Reads retain the existing admin-only RLS policies. No anonymous table access.
alter table public.appointments enable row level security;
alter table public.appointment_notes enable row level security;
alter table public.appointment_events enable row level security;
alter table public.admin_users enable row level security;
revoke all on public.appointments, public.appointment_notes, public.appointment_events, public.admin_users from anon;
revoke insert, update, delete, truncate, references, trigger on public.appointments, public.appointment_notes, public.appointment_events, public.admin_users from authenticated;
grant select on public.appointments, public.appointment_notes, public.appointment_events, public.admin_users to authenticated;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='appointments') then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
