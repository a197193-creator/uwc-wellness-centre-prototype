-- Run as the project owner in SQL Editor. All test users, bookings and changes
-- are rolled back. No passwords, emails, payments or real bookings are created.
begin;
do $$
declare
  staff_id uuid := gen_random_uuid();
  booking_id uuid := gen_random_uuid();
  real_booking_id uuid := gen_random_uuid();
  current_version timestamptz;
  original_version timestamptz := now() - interval '1 minute';
  booking_code text;
  safe jsonb;
  count_rows integer;
  valid_slot timestamptz;
  weekend_slot timestamptz;
begin
  if has_table_privilege('anon','public.appointments','select') then raise exception 'Anonymous SELECT is allowed'; end if;
  if has_table_privilege('authenticated','public.appointments','update') then raise exception 'Direct payment/status UPDATE is allowed'; end if;
  if has_function_privilege('anon','public.admin_save_action(uuid,text,text,timestamptz,timestamptz[],timestamptz)','execute') then raise exception 'Anonymous staff action is allowed'; end if;
  if has_function_privilege('authenticated','public.admin_action(uuid,text,text,timestamptz,timestamptz[])','execute') then raise exception 'Unvalidated legacy action remains callable'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into count_rows from public.appointments;
  if count_rows <> 0 then raise exception 'Non-admin can read bookings'; end if;
  select count(*) into count_rows from public.appointment_notes;
  if count_rows <> 0 then raise exception 'Non-admin can read notes'; end if;
  select count(*) into count_rows from public.appointment_events;
  if count_rows <> 0 then raise exception 'Non-admin can read history'; end if;
  begin
    perform public.admin_save_action(booking_id,'approve',null,null,'{}',original_version);
    raise exception 'Non-admin can change bookings';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- Temporary identities have no credentials and cannot sign in. They never commit.
  insert into auth.users(id, aud, role, email) values(staff_id,'authenticated','authenticated','staff-test@example.invalid');
  insert into public.admin_users(user_id) values(staff_id);
  valid_slot := (((now() at time zone 'Asia/Kuala_Lumpur')::date + 1)::text || ' 08:30:00')::timestamp at time zone 'Asia/Kuala_Lumpur';
  while extract(isodow from valid_slot at time zone 'Asia/Kuala_Lumpur') > 5 loop valid_slot := valid_slot + interval '1 day'; end loop;
  weekend_slot := valid_slot;
  while extract(isodow from weekend_slot at time zone 'Asia/Kuala_Lumpur') <> 6 loop weekend_slot := weekend_slot + interval '1 day'; end loop;
  if not private.staff_slot_valid(valid_slot) or private.staff_slot_valid(weekend_slot)
     or private.staff_slot_valid(valid_slot + interval '4 months')
     or private.staff_slot_valid(date_trunc('day',valid_slot at time zone 'Asia/Kuala_Lumpur') at time zone 'Asia/Kuala_Lumpur' + interval '11 hours') then
    raise exception 'Slot validation failed';
  end if;
  insert into public.appointments(id,package_id,package_name,customer_name,customer_email,customer_phone,scheduled_at,duration_minutes,amount_due,is_demo,updated_at)
    values(booking_id,'baseline','Test package','Test Visitor','test@example.invalid','+60000000000',valid_slot,60,450,true,original_version),
          (real_booking_id,'baseline','Test unpaid non-demo','Test Visitor','test@example.invalid','+60000000000',valid_slot,60,450,false,original_version);
  -- Issuing a prototype code updates the inserted booking through its trigger.
  select updated_at into original_version from public.appointments where id=booking_id;
  update public.appointments set updated_at=original_version where id=real_booking_id;
  perform set_config('request.jwt.claims', jsonb_build_object('sub',staff_id,'role','authenticated','is_anonymous',false)::text,true);
  execute 'set local role authenticated';
  select count(*) into count_rows from public.appointments where id=booking_id;
  if count_rows <> 1 then raise exception 'Approved admin cannot read the test booking'; end if;
  begin
    perform public.admin_save_action(booking_id,'reschedule',null,weekend_slot,'{}',original_version);
    raise exception 'Weekend accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.admin_save_action(booking_id,'request_changes','Choose another time',null,array[valid_slot,valid_slot],original_version);
    raise exception 'Duplicate alternatives accepted';
  exception when invalid_parameter_value then null; end;
  begin
    select updated_at into current_version from public.appointments where id=real_booking_id;
    perform public.admin_save_action(real_booking_id,'approve',null,null,'{}',current_version);
    raise exception 'Unpaid non-demo booking approved';
  exception when raise_exception then
    if sqlerrm <> 'Payment is not confirmed' then raise; end if;
  end;
  perform public.admin_save_action(booking_id,'approve',null,null,'{}',original_version);
  if not exists(select 1 from public.appointments where id=booking_id and status='confirmed' and payment_status='pending' and amount_paid=0) then
    raise exception 'No-payment demo approval failed'; end if;
  begin
    perform public.admin_save_action(booking_id,'cancel',null,null,'{}',original_version);
    raise exception 'Stale version accepted';
  exception when serialization_failure then null; end;
  select updated_at into current_version from public.appointments where id=booking_id;
  perform public.admin_save_action(booking_id,'note_internal','PRIVATE TEST NOTE',null,'{}',current_version);
  select updated_at into current_version from public.appointments where id=booking_id;
  perform public.admin_save_action(booking_id,'request_changes','Please choose another morning.',null,array[valid_slot + interval '30 minutes'],current_version);
  if not exists(select 1 from public.appointment_notes where appointment_id=booking_id and visibility='internal' and author_id=staff_id) then raise exception 'Internal note/audit author missing'; end if;
  if not exists(select 1 from public.appointment_events where appointment_id=booking_id and actor_id=staff_id) then raise exception 'Audit missing'; end if;
  select a.booking_code into booking_code from public.appointments a where id=booking_id;
  execute 'reset role';
  safe := public.guest_booking_lookup(booking_code,repeat('a',64));
  if safe is null or safe->>'status' <> 'changes_requested' or safe->>'customer_visible_note' <> 'Please choose another morning.'
     or safe ?| array['customer_name','customer_email','customer_phone','transaction_reference','notes','payment_method']
     or safe::text like '%PRIVATE TEST NOTE%' then raise exception 'Guest safe projection failed'; end if;
  if not public.guest_booking_respond(booking_code,repeat('a',64),'I can attend the proposed morning.',valid_slot + interval '30 minutes') then raise exception 'Customer response failed'; end if;
  if not exists(select 1 from public.appointments where id=booking_id and status='pending_review' and customer_response='I can attend the proposed morning.') then raise exception 'Customer reply not saved for staff'; end if;
end $$;
rollback;
select 'PASS: admin RLS, anonymous denial, RPC guards, slots, stale versions, notes, audit, no payment and guest response. All test changes rolled back.' as result;
