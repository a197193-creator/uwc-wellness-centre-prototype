(function () {
  'use strict';
  const config = window.UWC_DEMO_CONFIG;
  const client = window.supabase?.createClient(config.supabaseUrl, config.publishableKey, {
    auth: { storage: sessionStorage, storageKey: 'uwc-staff-auth-v1', persistSession: true,
      autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: (url, options = {}) => fetch(url, { ...options,
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) }) }
  });
  const columns = 'id,booking_code,package_id,package_name,customer_name,customer_email,customer_phone,scheduled_at,duration_minutes,status,payment_status,amount_due,amount_paid,payment_method,transaction_reference,paid_at,customer_visible_note,customer_response,customer_requested_at,suggested_slots,is_demo,created_at,updated_at,plan_snapshot';
  function ready() { if (!client) throw new Error('Staff service could not load. Reload the page.'); }
  function check(result) { if (result.error) throw result.error; return result.data; }
  async function approvedUser() {
    ready();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (!session) return null;
    const user = check(await client.auth.getUser()).user;
    if (user.is_anonymous) throw new Error('An approved staff account is required.');
    const role = check(await client.from('admin_users').select('role').eq('user_id', user.id).maybeSingle());
    if (role?.role !== 'admin') {
      await client.auth.signOut({ scope: 'local' });
      throw new Error('This account is awaiting admin approval. Ask the project owner to approve it.');
    }
    return user;
  }
  window.UWCAdminData = {
    async signIn(email, password) {
      ready(); check(await client.auth.signInWithPassword({ email, password }));
      client.auth.startAutoRefresh();
      return approvedUser();
    },
    async signUp(email, password) {
      ready(); const data = check(await client.auth.signUp({ email, password }));
      // A new account never inserts itself into admin_users or unlocks bookings.
      if (data.session) await client.auth.signOut({ scope: 'local' });
      return Boolean(data.session);
    },
    approvedUser,
    async signOut() {
      ready();
      try { check(await client.auth.signOut({ scope: 'local' })); }
      finally {
        client.auth.stopAutoRefresh(); client.realtime.disconnect();
        sessionStorage.removeItem('uwc-staff-auth-v1');
        sessionStorage.removeItem('uwc-staff-auth-v1-user');
      }
    },
    async list() {
      ready();
      const rows = [];
      for (let start = 0; ; start += 500) {
        const page = check(await client.from('appointments').select(columns)
          .order('created_at', { ascending: false }).order('id', { ascending: false }).range(start, start + 499));
        rows.push(...page);
        if (page.length < 500) return rows;
      }
    },
    async details(id) {
      ready();
      const booking = check(await client.from('appointments').select(columns).eq('id', id).single());
      const [notes, events] = await Promise.all([
        client.from('appointment_notes').select('id,body,visibility,author_id,created_at').eq('appointment_id', id).order('created_at', { ascending: false }),
        client.from('appointment_events').select('id,event_type,old_status,new_status,message,actor_id,actor_type,created_at').eq('appointment_id', id).order('created_at', { ascending: false })
      ]);
      return { ...booking, notes: check(notes), events: check(events) };
    },
    async save(booking, action, note, scheduledAt, suggestedSlots) {
      ready();
      if (!booking.updated_at) throw new Error('Refresh this booking before saving.');
      return check(await client.rpc('admin_save_action', { p_id: booking.id, p_action: action,
        p_note: note || null, p_scheduled_at: scheduledAt, p_suggested_slots: suggestedSlots,
        p_expected_updated_at: booking.updated_at }));
    },
    subscribe(onChange, onStatus) {
      ready();
      const channel = client.channel('uwc-staff-bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, onChange)
        .subscribe(onStatus);
      return () => client.removeChannel(channel);
    },
    onAuthChange(callback) {
      ready(); const { data } = client.auth.onAuthStateChange(callback);
      return () => data.subscription.unsubscribe();
    }
  };
})();
