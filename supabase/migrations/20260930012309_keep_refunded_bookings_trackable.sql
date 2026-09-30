-- A code is issued after payment, but remains usable if the later payment state changes.
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
  where a.booking_code = normalized;
  return result;
end;
$$;
