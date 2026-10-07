/* Guest Edge Function: create_demo, lookup and respond actions only.
   Service keys stay in server environment variables, never in browser code.
   SQL RPCs validate data, enforce rate limits and choose safe fields to return.
   Staff use their separate authenticated/RLS-protected data layer. */
// Existing public domain and local previews. CORS does not replace server validation.
const originAllowlist = new Set([
  'https://uwc-wellness-centre-prototype.vercel.app',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);
const genericMessage = 'No booking found for that code.';

// Return JSON without caching booking data; add CORS only for a recognized origin.
function response(body: unknown, status: number, origin: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  };
  if (origin && originAllowlist.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

// Read a privileged key from the server environment, supporting legacy and newer key setup.
function serviceKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
  return Object.values(keys).find((value) => typeof value === 'string') as string | undefined;
}

// Hash the gateway-provided address with a server-only pepper for the SQL rate-limit bucket.
// This function does not send the raw visitor address to the database.
async function hashIp(req: Request, pepper: string) {
  // Supabase's gateway forwards the visitor address to the function.
  const forwarded =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const bytes = new TextEncoder().encode(`${pepper}:${forwarded}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

// HTTP entry point: preflight, method/content limits, validation and then one allowed RPC.
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (origin && !originAllowlist.has(origin))
    return response({ error: 'Origin not allowed' }, 403, origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || 'https://uwc-wellness-centre-prototype.vercel.app',
        'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        Vary: 'Origin',
      },
    });
  }
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405, origin);
  if (!req.headers.get('content-type')?.startsWith('application/json')) {
    return response({ error: 'JSON required' }, 415, origin);
  }
  const contentLength = Number(req.headers.get('content-length') || '0');
  if (contentLength > 8192) return response({ error: 'Request too large' }, 413, origin);
  const key = serviceKey();
  const baseUrl = Deno.env.get('SUPABASE_URL');
  if (!key || !baseUrl) return response({ error: 'Service unavailable' }, 503, origin);

  // Bound the body and require a JSON object, regardless of browser-side validation.
  let payload: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 8192) return response({ error: 'Request too large' }, 413, origin);
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      throw Error('Invalid body');
  } catch {
    return response({ error: 'Invalid request' }, 400, origin);
  }

  // Fixed action allowlist: never accept arbitrary table or SQL function names.
  const action = payload.action;
  if (action !== 'lookup' && action !== 'respond' && action !== 'create_demo') {
    return response({ error: 'Invalid request' }, 400, origin);
  }
  if (
    action === 'create_demo' &&
    (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data))
  ) {
    return response({ error: 'Check the request details and try again.' }, 400, origin);
  }
  // Normalize codes; invalid and missing codes use the same generic not-found reply.
  const code = typeof payload.code === 'string' ? payload.code.trim().toUpperCase() : '';
  if (code.length > 80) return response({ error: genericMessage }, 404, origin);
  const ipHash = await hashIp(req, key);
  const argumentsForRpc: Record<string, unknown> =
    action === 'create_demo'
      ? { p_data: payload.data, p_ip_hash: ipHash }
      : { p_code: code, p_ip_hash: ipHash };
  // Bound the reply; SQL separately verifies the code, status and appointment rules.
  if (action === 'respond') {
    const message = typeof payload.message === 'string' ? payload.message.trim() : '';
    const requestedAt = payload.requested_at;
    if (
      message.length > 1000 ||
      (requestedAt !== null &&
        requestedAt !== undefined &&
        (typeof requestedAt !== 'string' ||
          requestedAt.length > 50 ||
          !Number.isFinite(Date.parse(requestedAt))))
    ) {
      return response({ error: 'Enter a valid message or date.' }, 400, origin);
    }
    argumentsForRpc.p_message = message;
    argumentsForRpc.p_requested_at = requestedAt || null;
  }

  // Only these server-owned RPCs can be called; SQL creates codes and audit history.
  try {
    const rpc =
      action === 'lookup'
        ? 'guest_booking_lookup'
        : action === 'respond'
          ? 'guest_booking_respond'
          : 'guest_demo_create';
    const result = await fetch(`${baseUrl}/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(argumentsForRpc),
    });
    const data = await result.json();
    // Translate known failures into safe messages, without exposing SQL internals.
    if (!result.ok) {
      if (data?.message === 'rate_limited')
        return response({ error: 'Too many attempts. Please wait a minute.' }, 429, origin);
      if (data?.message === 'response_invalid')
        return response({ error: 'Enter a valid message or date.' }, 400, origin);
      if (data?.message === 'demo_request_invalid')
        return response({ error: 'Check the request details and try again.' }, 400, origin);
      return response({ error: 'Booking service is temporarily unavailable.' }, 503, origin);
    }
    if (!data) return response({ error: genericMessage }, 404, origin);
    if (action === 'respond') return response({ accepted: true }, 200, origin);
    if (action === 'create_demo') return response({ booking: data }, 201, origin);
    return response({ booking: data }, 200, origin);
  } catch {
    return response({ error: 'Network error. Please try again.' }, 503, origin);
  }
});
