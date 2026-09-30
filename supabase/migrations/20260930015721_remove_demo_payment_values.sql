-- Demo requests do not collect or simulate a payment. Preserve their codes and status history.
update public.appointments
   set payment_status = 'pending',
       amount_paid = 0,
       payment_method = null,
       transaction_reference = null,
       paid_at = null
 where is_demo
   and (payment_status <> 'pending' or amount_paid <> 0
        or payment_method is not null or transaction_reference is not null or paid_at is not null);
