// Data-layer regression tests. Supabase and storage are fakes: no real login or database writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Record requested tables/RPCs and vary approval/session/error states for each test.
function harness({ admin = true, anonymous = false, session = true, fail = null } = {}) {
  const requests = [],
    storage = new Map();
  let signedOut = false;
  const user = { id: 'staff-id', email: 'staff@example.invalid', is_anonymous: anonymous };
  const client = {
    auth: {
      getSession: async () => ({ data: { session: session ? { user } : null }, error: null }),
      getUser: async () => ({ data: { user }, error: null }),
      signInWithPassword: async (payload) => {
        requests.push(['signIn', payload]);
        return { data: {}, error: null };
      },
      signOut: async () => {
        signedOut = true;
        return { data: {}, error: null };
      },
      startAutoRefresh() {},
      stopAutoRefresh() {},
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    realtime: { disconnect() {} },
    from(table) {
      const query = { table, columns: null, filters: {} };
      const chain = {
        select(columns) {
          query.columns = columns;
          return chain;
        },
        eq(key, value) {
          query.filters[key] = value;
          return chain;
        },
        order() {
          return chain;
        },
        range(start, end) {
          query.range = [start, end];
          return chain;
        },
        maybeSingle() {
          query.single = true;
          return chain;
        },
        single() {
          query.single = true;
          return chain;
        },
        then(resolve, reject) {
          requests.push(query);
          let data = [];
          if (table === 'admin_users') data = admin ? { role: 'admin' } : null;
          if (table === 'appointments')
            data = query.single
              ? { id: 'booking', updated_at: '2026-10-06T01:00:00Z' }
              : [{ id: 'booking' }];
          return Promise.resolve({ data, error: fail }).then(resolve, reject);
        },
      };
      return chain;
    },
    rpc: async (name, args) => {
      requests.push([name, args]);
      return { data: { status: 'confirmed', conflicts: 0 }, error: fail };
    },
    channel() {
      const chain = {
        on() {
          return chain;
        },
        subscribe() {
          return chain;
        },
      };
      return chain;
    },
    removeChannel() {},
  };
  const window = {
    UWC_DEMO_CONFIG: { supabaseUrl: 'https://test.invalid', publishableKey: 'public-only' },
    supabase: {
      createClient(url, key, options) {
        requests.push(['client', key, options.auth]);
        return client;
      },
    },
  };
  const sessionStorage = {
    setItem: (k, v) => storage.set(k, v),
    getItem: (k) => storage.get(k),
    removeItem: (k) => storage.delete(k),
  };
  vm.runInNewContext(fs.readFileSync('admin-data.js', 'utf8'), {
    window,
    sessionStorage,
    AbortSignal,
    fetch,
    TypeError,
  });
  return { data: window.UWCAdminData, requests, storage, signedOut: () => signedOut };
}
test('no session means no admin or booking query', async () => {
  const h = harness({ session: false });
  assert.equal(await h.data.approvedUser(), null);
  assert.equal(h.requests.filter((r) => r.table).length, 0);
});
test('staff membership is checked by immutable user ID, not user metadata', async () => {
  const h = harness();
  assert.equal((await h.data.approvedUser()).id, 'staff-id');
  assert.equal(h.requests.find((r) => r.table === 'admin_users').filters.user_id, 'staff-id');
});
test('non-admin signs out and cannot unlock dashboard', async () => {
  const h = harness({ admin: false });
  await assert.rejects(
    h.data.signIn('staff@example.invalid', 'private password'),
    /awaiting admin approval/,
  );
  assert.equal(h.signedOut(), true);
  assert.equal(
    h.requests.some((r) => r.table === 'appointments'),
    false,
  );
});
test('anonymous auth identity cannot become staff', async () => {
  const h = harness({ anonymous: true });
  await assert.rejects(h.data.approvedUser(), /approved staff/);
  assert.equal(
    h.requests.some((r) => r.table === 'appointments'),
    false,
  );
});
test('staff data client exposes sign-in but no account creation method', () => {
  const h = harness();
  assert.equal(typeof h.data.signIn, 'function');
  assert.equal(h.data.signUp, undefined);
});
test('list selects real appointment fields with deterministic pagination', async () => {
  const h = harness();
  assert.equal((await h.data.list()).length, 1);
  const request = h.requests.find((r) => r.table === 'appointments');
  assert.deepEqual(request.range, [0, 499]);
  assert.match(request.columns, /booking_code/);
  assert.match(request.columns, /plan_snapshot/);
});
test('details fetch notes/history for only the selected booking', async () => {
  const h = harness();
  const result = await h.data.details('booking');
  assert.equal(result.id, 'booking');
  for (const table of ['appointment_notes', 'appointment_events'])
    assert.equal(h.requests.find((r) => r.table === table).filters.appointment_id, 'booking');
});
test('save uses audited RPC and record version, never a direct table or payment update', async () => {
  const h = harness();
  await h.data.save({ id: 'booking', updated_at: 'version' }, 'approve', '', null, []);
  const [name, args] = h.requests.find((r) => Array.isArray(r) && r[0] === 'admin_save_action');
  assert.equal(name, 'admin_save_action');
  assert.equal(args.p_expected_updated_at, 'version');
  assert.equal('payment_status' in args, false);
  assert.equal(
    h.requests.some((r) => r.table === 'appointments'),
    false,
  );
});
test('saving without a fresh record version is refused', async () => {
  const h = harness();
  await assert.rejects(h.data.save({ id: 'booking' }, 'approve', '', null, []), /Refresh/);
});
test('server failure is propagated and not shown as saved', async () => {
  const error = { message: 'This booking changed', code: '40001' };
  const h = harness({ fail: error });
  await assert.rejects(
    h.data.save({ id: 'booking', updated_at: 'version' }, 'approve', '', null, []),
    (e) => e === error,
  );
});
test('staff session stays in this tab and uses a public key only', () => {
  const h = harness();
  const [, key, auth] = h.requests[0];
  assert.equal(key, 'public-only');
  assert.equal(auth.storageKey, 'uwc-staff-auth-v1');
  assert.equal(auth.detectSessionInUrl, false);
});
