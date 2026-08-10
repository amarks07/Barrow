// Supabase Edge Function: permanently deletes the calling user's account.
// Deleting another user's auth.users row needs the service_role key (the
// anon/authenticated client the app normally uses can never do this,
// same reason revenuecat-webhook needs it to write premium) — so this
// function verifies the caller's own JWT identifies them, then uses the
// admin API with the service_role key to delete exactly that user.
// public.profiles has `id uuid references auth.users (id) on delete
// cascade` (see supabase/schema.sql), so deleting the auth.users row also
// deletes the profiles row — nothing further to clean up.
//
// One-time setup this function depends on, none of which lives in this repo:
//   1. Deploy: `supabase functions deploy delete-account`
//   (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
//   already available to every Edge Function automatically — nothing to
//   set for those.)
//
// Called from the client via `supabase.functions.invoke("delete-account")`
// (see deleteAccount in useCloudSync.js) — supabase-js attaches the current
// session's access token as the Authorization header automatically, which
// is what getUser() below verifies.
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return new Response("Missing authorization", { status: 401 });

  // Verifies the bearer token against Supabase Auth and resolves the caller
  // it belongs to — this is what stops any signed-in user from deleting
  // someone else's account, since only the admin client below can delete by
  // an arbitrary id and it's never handed attacker-supplied input.
  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { authorization: authHeader } } }
  );
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) return new Response("Unauthorized", { status: 401 });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return new Response(deleteError.message, { status: 500 });

  return new Response("ok", { status: 200 });
});
