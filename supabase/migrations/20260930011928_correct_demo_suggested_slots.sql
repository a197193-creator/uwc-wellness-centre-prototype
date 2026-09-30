-- Keep fictional suggested appointments on weekdays regardless of migration date.
update public.appointments a
set suggested_slots = (
  select array_agg(day order by day)
  from (
    select a.scheduled_at + make_interval(days => day_offset) as day
    from generate_series(1, 14) as day_offset
    where extract(isodow from a.scheduled_at + make_interval(days => day_offset)) between 1 and 5
    order by day
    limit 2
  ) next_weekdays
)
where a.is_demo and a.customer_email = 'visitor-b@example.invalid';
