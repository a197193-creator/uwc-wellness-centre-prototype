update public.appointments
set customer_visible_note = 'Please choose another weekday for this longer screening.'
where is_demo and customer_email = 'visitor-b@example.invalid';
