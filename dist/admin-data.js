/* Staff data layer. admin.js manages the UI; this file talks to Supabase.
   RLS and audited server functions enforce access even if someone bypasses the UI. */
(function () {
  'use strict';
  const config = window.UWC_DEMO_CONFIG;
  // Store the staff session in this tab, use a public key and bound each request with a timeout.
  const client = window.supabase?.createClient(config.supabaseUrl, config.publishableKey, {
    auth: {
      storage: sessionStorage,
      storageKey: 'uwc-staff-auth-v1',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (url, options = {}) =>
        fetch(url, {
          ...options,
          signal: options.signal
            ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
            : AbortSignal.timeout(20000),
        }),
    },
  });
  // Full booking fields are for approved staff only; guest lookup uses a separate safe-field gateway.
  const columns =
    'id,booking_code,package_id,package_name,customer_name,customer_email,customer_phone,scheduled_at,duration_minutes,status,payment_status,amount_due,amount_paid,payment_method,transaction_reference,paid_at,customer_visible_note,customer_response,customer_requested_at,suggested_slots,is_demo,created_at,updated_at,plan_snapshot';
  // Report a failed client load before trying any Auth or database operation.
  function ready() {
    if (!client) throw new Error('Staff service could not load. Reload the page.');
  }
  // Supabase returns { data, error }; propagate errors instead of presenting failed operations as saved.
  function check(result) {
    if (result.error) throw result.error;
    return result.data;
  }
  // Validate the Auth user, then check admin_users by immutable user ID, never editable metadata.
  // Unapproved users are signed out locally; database RLS remains the final permission check.
  async function approvedUser() {
    ready();
    const {
      data: { session },
      error,
    } = await client.auth.getSession();
    if (error) throw error;
    if (!session) return null;
    const user = check(await client.auth.getUser()).user;
    if (user.is_anonymous) throw new Error('An approved staff account is required.');
    const role = check(
      await client.from('admin_users').select('role').eq('user_id', user.id).maybeSingle(),
    );
    if (role?.role !== 'admin') {
      await client.auth.signOut({ scope: 'local' });
      throw new Error(
        'This account is awaiting admin approval. Ask the project owner to approve it.',
      );
    }
    return user;
  }
  window.UWCAdminData = {
    // Password login does not grant a role: approval is checked before opening the dashboard.
    async signIn(email, password) {
      ready();
      check(await client.auth.signInWithPassword({ email, password }));
      client.auth.startAutoRefresh();
      return approvedUser();
    },
    approvedUser,
    // Close the local session, token refresh and Realtime connection, even if sign-out fails remotely.
    async signOut() {
      ready();
      try {
        check(await client.auth.signOut({ scope: 'local' }));
      } finally {
        client.auth.stopAutoRefresh();
        client.realtime.disconnect();
        sessionStorage.removeItem('uwc-staff-auth-v1');
        sessionStorage.removeItem('uwc-staff-auth-v1-user');
      }
    },
    // Read bookings in ordered batches of 500 so the server's row limit does not truncate the list.
    async list() {
      ready();
      const rows = [];
      for (let start = 0; ; start += 500) {
        const page = check(
          await client
            .from('appointments')
            .select(columns)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(start, start + 499),
        );
        rows.push(...page);
        if (page.length < 500) return rows;
      }
    },
    // Fetch one booking and only its related notes/history; do not mix records between customers.
    async details(id) {
      ready();
      const booking = check(
        await client.from('appointments').select(columns).eq('id', id).single(),
      );
      const [notes, events] = await Promise.all([
        client
          .from('appointment_notes')
          .select('id,body,visibility,author_id,created_at')
          .eq('appointment_id', id)
          .order('created_at', { ascending: false }),
        client
          .from('appointment_events')
          .select('id,event_type,old_status,new_status,message,actor_id,actor_type,created_at')
          .eq('appointment_id', id)
          .order('created_at', { ascending: false }),
      ]);
      return { ...booking, notes: check(notes), events: check(events) };
    },
    // Audited RPC applies staff actions and checks the record version to reject stale edits.
    // No direct client table update or client-side payment-status write is allowed here.
    async save(booking, action, note, scheduledAt, suggestedSlots) {
      ready();
      if (!booking.updated_at) throw new Error('Refresh this booking before saving.');
      return check(
        await client.rpc('admin_save_action', {
          p_id: booking.id,
          p_action: action,
          p_note: note || null,
          p_scheduled_at: scheduledAt,
          p_suggested_slots: suggestedSlots,
          p_expected_updated_at: booking.updated_at,
        }),
      );
    },
    // Subscribe to appointment changes; the returned function releases the channel on logout.
    subscribe(onChange, onStatus) {
      ready();
      const channel = client
        .channel('uwc-staff-bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, onChange)
        .subscribe(onStatus);
      return () => client.removeChannel(channel);
    },
    // Allow the UI to lock itself when the staff session ends.
    onAuthChange(callback) {
      ready();
      const { data } = client.auth.onAuthStateChange(callback);
      return () => data.subscription.unsubscribe();
    },
  };
})();
