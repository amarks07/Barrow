// Supabase Edge Function: receives RevenueCat's webhook and is the *only*
// writer of profiles.premium / profiles.premium_renewal (enforced at the db
// level by the protect_premium_columns trigger in supabase/schema.sql — any
// write from here uses the service_role key, which is the one role that
// trigger lets through).
//
// One-time setup this function depends on, none of which lives in this repo:
//   1. Deploy: `supabase functions deploy revenuecat-webhook`
//   2. Set a secret this function checks incoming requests against:
//      `supabase secrets set REVENUECAT_WEBHOOK_SECRET=<a random string you pick>`
//      (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are already available to
//      every Edge Function automatically — nothing to set for those.)
//   3. In the RevenueCat dashboard (Project settings → Integrations →
//      Webhooks): set the URL to this function's deployed URL, and set
//      "Authorization header value" to the same string as
//      REVENUECAT_WEBHOOK_SECRET above.
//   4. The mobile client must configure the RevenueCat SDK with
//      `appUserID: <the signed-in Supabase auth user's id>` (Purchases.configure)
//      so event.app_user_id below lines up with profiles.id. Without this,
//      RevenueCat's own anonymous id is used instead and nothing here matches.
//
// RevenueCat webhook payload shape: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
import { createClient } from "npm:@supabase/supabase-js@2";

const GRANTING_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
]);
// CANCELLATION isn't in either set on purpose — a cancelled subscription
// still runs through to its already-paid-for expiration_at_ms, so access
// shouldn't drop until RevenueCat actually sends EXPIRATION.
const REVOKING_EVENTS = new Set(["EXPIRATION"]);

Deno.serve(async (req) => {
  const expectedAuth = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!expectedAuth || req.headers.get("authorization") !== expectedAuth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { event } = await req.json();
  const userId = event?.app_user_id;
  if (!userId) return new Response("Missing app_user_id", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (GRANTING_EVENTS.has(event.type)) {
    const { error } = await supabase
      .from("profiles")
      .update({
        premium: true,
        premium_renewal: new Date(event.expiration_at_ms).toISOString(),
      })
      .eq("id", userId);
    if (error) return new Response(error.message, { status: 500 });
  } else if (REVOKING_EVENTS.has(event.type)) {
    const { error } = await supabase
      .from("profiles")
      .update({ premium: false })
      .eq("id", userId);
    if (error) return new Response(error.message, { status: 500 });
  }
  // Other event types (CANCELLATION, BILLING_ISSUE, TRANSFER, ...) are
  // acknowledged but intentionally no-ops for now.

  return new Response("ok", { status: 200 });
});
