// Supabase Edge Function: permanently deletes the calling user's account.
// Deleting another user's auth.users row needs the service_role key (the
// anon/authenticated client the app normally uses can never do this,
// same reason revenuecat-webhook needs it to write premium) — so this
// function trusts the caller's own JWT to identify them, then uses the
// admin API with the service_role key to delete exactly that user.
// public.profiles has `id uuid references auth.users (id) on delete
// cascade` (see supabase/schema.sql), so deleting the auth.users row also
// deletes the profiles row — but that cascade only removes the *row*, not
// the S3 object its picture_url points at, so this function deletes that
// object itself first (same DeleteObjectCommand/keyFromPublicUrl approach as
// deleteExistingPicture in profile-picture/index.ts) while the row — and
// the AWS credentials to reach it — are still around to read.
//
// Identity comes from decoding the Authorization JWT's own `sub` claim
// rather than a second network round-trip to /auth/v1/user (what this
// function used to do, via a callerClient.auth.getUser() call) — that
// round-trip turned out to fail unpredictably in production while
// diagnosing the identical pattern in profile-picture (an internal
// non-JSON response from Auth), and it's redundant anyway: `verify_jwt`
// defaults to true for every Edge Function, so the platform has already
// cryptographically verified this token before this code ever runs (see the
// request.sb.jwt.* fields Supabase's own function logs attach to every
// call). Decoding, not re-verifying, is safe specifically because of that
// platform guarantee — this function must never have verify_jwt disabled.
//
// One-time setup this function depends on, none of which lives in this repo:
//   1. Deploy: `supabase functions deploy delete-account`
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, and the AWS_* secrets already
//   set for profile-picture — see that function's own setup comment — are
//   all available here too: `supabase secrets set` is project-wide, not
//   per-function.)
//
// Called from the client via `supabase.functions.invoke("delete-account")`
// (see deleteAccount in useCloudSync.js) — supabase-js attaches the current
// session's access token as the Authorization header automatically.
import { createClient } from "npm:@supabase/supabase-js@2";
import { S3Client, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3";

function s3Client() {
  return new S3Client({
    region: Deno.env.get("AWS_REGION")!,
    credentials: {
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
    },
  });
}

// picture_url is always a full https URL to our own bucket — the S3 key is
// just its path, so no separate key column is needed to know what to
// delete. Mirrors keyFromPublicUrl in profile-picture/index.ts.
function keyFromPublicUrl(url) {
  if (!url) return null;
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
}

// Best-effort, same as deleteExistingPicture in profile-picture/index.ts: a
// missing/already-deleted object, or no picture at all, shouldn't block
// account deletion.
async function deleteProfilePicture(admin, userId) {
  const { data } = await admin.from("profiles").select("picture_url").eq("id", userId).single();
  const key = keyFromPublicUrl(data?.picture_url);
  if (!key) return;
  try {
    await s3Client().send(new DeleteObjectCommand({ Bucket: Deno.env.get("AWS_S3_BUCKET")!, Key: key }));
  } catch {
    // Ignore — see comment above.
  }
}

// Safe to decode without independently verifying the signature here — see
// the module comment above on why the platform's verify_jwt gate already
// covers that before this code runs.
function userIdFromJwt(authHeader) {
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) throw new Error("malformed token");
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const claims = JSON.parse(atob(padded));
  if (!claims.sub) throw new Error("token has no sub claim");
  return claims.sub;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return new Response("Missing authorization", { status: 401 });

  let userId;
  try {
    userId = userIdFromJwt(authHeader);
  } catch (e) {
    return new Response(`Unauthorized: ${e.message}`, { status: 401 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await deleteProfilePicture(admin, userId);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return new Response(deleteError.message, { status: 500 });

  return new Response("ok", { status: 200 });
});
