// Public configuration only. Never put a Supabase secret/service-role key here.
// One project connects the public booking page, tracker and approved staff dashboard.
// RLS and server validation enforce permissions, not secrecy of these browser-safe values.
window.UWC_DEMO_CONFIG = Object.freeze({
  // Project API URL, not an administration login URL.
  supabaseUrl: 'https://fxgzewuwiccmaqayfclm.supabase.co',
  // Publishable browser key only; never replace this with a privileged service-role key.
  publishableKey: 'sb_publishable_lhAAwKmCOK2BW6Q0WszZ7g_Mhx5-88f',
  // Guest actions go through this server function instead of direct table queries.
  gatewayUrl: 'https://fxgzewuwiccmaqayfclm.supabase.co/functions/v1/booking-gateway',
});
