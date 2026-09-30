// Public code-based demo lookup. The database remains private to the service role.
const originAllowlist = new Set([
  "https://uwc-wellness-centre-prototype.vercel.app",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const genericMessage = "No booking found for that code.";

function response(body: unknown, status: number, origin: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  };
  if (origin && originAllowlist.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

function serviceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  return Object.values(keys).find((value) => typeof value === "string") as string | undefined;
}

async function hashIp(req: Request, pepper: string) {
  // Supabase's gateway forwards the visitor address to the function.
  const forwarded = req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bytes = new TextEncoder().encode(`${pepper}:${forwarded}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && !originAllowlist.has(origin)) return response({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "https://uwc-wellness-centre-prototype.vercel.app",
        "Access-Control-Allow-Headers": "content-type, apikey, authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        Vary: "Origin",
      },
    });
  }
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405, origin);
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return response({ error: "JSON required" }, 415, origin);
  }
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 4096) return response({ error: "Request too large" }, 413, origin);
  const key = serviceKey();
  const baseUrl = Deno.env.get("SUPABASE_URL");
  if (!key || !baseUrl) return response({ error: "Service unavailable" }, 503, origin);

  let payload: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 4096) return response({ error: "Request too large" }, 413, origin);
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw Error("Invalid body");
  } catch {
    return response({ error: "Invalid request" }, 400, origin);
  }

  const action = payload.action;
  if (action !== "lookup" && action !== "respond") return response({ error: "Invalid request" }, 400, origin);
  const code = typeof payload.code === "string" ? payload.code.trim().toUpperCase() : "";
  if (code.length > 80) return response({ error: genericMessage }, 404, origin);
  const ipHash = await hashIp(req, key);
  const argumentsForRpc: Record<string, unknown> = { p_code: code, p_ip_hash: ipHash };
  if (action === "respond") {
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    const requestedAt = payload.requested_at;
    if (message.length > 1000 || (requestedAt !== null && requestedAt !== undefined &&
      (typeof requestedAt !== "string" || requestedAt.length > 50 || !Number.isFinite(Date.parse(requestedAt))))) {
      return response({ error: "Enter a valid message or date." }, 400, origin);
    }
    argumentsForRpc.p_message = message;
    argumentsForRpc.p_requested_at = requestedAt || null;
  }

  try {
    const rpc = action === "lookup" ? "guest_booking_lookup" : "guest_booking_respond";
    const result = await fetch(`${baseUrl}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(argumentsForRpc),
    });
    const data = await result.json();
    if (!result.ok) {
      if (data?.message === "rate_limited") return response({ error: "Too many attempts. Please wait a minute." }, 429, origin);
      if (data?.message === "response_invalid") return response({ error: "Enter a valid message or date." }, 400, origin);
      return response({ error: "Booking service is temporarily unavailable." }, 503, origin);
    }
    if (!data) return response({ error: genericMessage }, 404, origin);
    if (action === "respond") return response({ accepted: true }, 200, origin);
    return response({ booking: data }, 200, origin);
  } catch {
    return response({ error: "Network error. Please try again." }, 503, origin);
  }
});
