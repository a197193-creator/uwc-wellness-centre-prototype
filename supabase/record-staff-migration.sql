-- Owner-only bookkeeping after the equivalent migration has been applied and
-- tested through SQL Editor. Store replayable definitions, not an empty history.
insert into supabase_migrations.schema_migrations(version, name, statements)
values ('20261006011026', 'connect_staff_dashboard', array[
  'begin;',
  pg_get_functiondef('private.touch_appointment()'::regprocedure),
  pg_get_functiondef('private.staff_slot_valid(timestamptz)'::regprocedure),
  pg_get_functiondef('private.admin_action(uuid,text,text,timestamptz,timestamptz[])'::regprocedure),
  pg_get_functiondef('private.admin_save_action(uuid,text,text,timestamptz,timestamptz[],timestamptz)'::regprocedure),
  pg_get_functiondef('public.admin_save_action(uuid,text,text,timestamptz,timestamptz[],timestamptz)'::regprocedure),
  'revoke all on function private.touch_appointment() from public, anon, authenticated;',
  'revoke all on function private.staff_slot_valid(timestamptz) from public, anon, authenticated;',
  'revoke all on function private.admin_save_action(uuid,text,text,timestamptz,timestamptz[],timestamptz) from public, anon;',
  'revoke all on function public.admin_save_action(uuid,text,text,timestamptz,timestamptz[],timestamptz) from public, anon;',
  'grant execute on function private.admin_save_action(uuid,text,text,timestamptz,timestamptz[],timestamptz) to authenticated;',
  'grant execute on function public.admin_save_action(uuid,text,text,timestamptz,timestamptz[],timestamptz) to authenticated;',
  'revoke execute on function private.admin_action(uuid,text,text,timestamptz,timestamptz[]) from authenticated;',
  'revoke execute on function public.admin_action(uuid,text,text,timestamptz,timestamptz[]) from authenticated;',
  'alter table public.appointments enable row level security;',
  'alter table public.appointment_notes enable row level security;',
  'alter table public.appointment_events enable row level security;',
  'alter table public.admin_users enable row level security;',
  'revoke all on public.appointments, public.appointment_notes, public.appointment_events, public.admin_users from anon;',
  'revoke insert, update, delete, truncate, references, trigger on public.appointments, public.appointment_notes, public.appointment_events, public.admin_users from authenticated;',
  'grant select on public.appointments, public.appointment_notes, public.appointment_events, public.admin_users to authenticated;',
  $$do $p$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='appointments') then alter publication supabase_realtime add table public.appointments; end if; end $p$;$$,
  $$notify pgrst, 'reload schema';$$,
  'commit;'
])
on conflict (version) do nothing;
