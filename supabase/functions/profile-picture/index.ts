// Supabase Edge Function: mints a short-lived presigned S3 PUT URL for the
// caller's own profile picture, and deletes the S3 object on replace/remove.
// AWS credentials never reach the client — this function is the only place
// that holds them. It never writes to Postgres itself: the client uploads
// the bytes directly to S3 with the presigned URL, then calls the
// set_profile_picture_url() Postgres function (see supabase/schema.sql) to
// persist the resulting URL — that function is a narrow, deliberate
// exception to profiles_update_own's premium requirement, since picture
// upload is available to every signed-in user, not just premium.
//
// Identity comes from decoding the Authorization JWT's own `sub` claim
// rather than a second network round-trip to /auth/v1/user (what an earlier
// version of this function did, matching delete-account's pattern) — that
// round-trip turned out to fail unpredictably in production (an internal
// non-JSON response from Auth), and it's redundant anyway: `verify_jwt`
// defaults to true for every Edge Function, so the platform has already
// cryptographically verified this token before this code ever runs (see the
// request.sb.jwt.* fields Supabase's own function logs attach to every
// call). Decoding, not re-verifying, is safe specifically because of that
// platform guarantee — this function must never have verify_jwt disabled.
//
// One-time setup this function depends on, none of which lives in this repo:
//   1. Create the S3 bucket, its public-read bucket policy (scoped to the
//      profile-pictures/ prefix), CORS config, and an IAM user restricted to
//      that same prefix — see the project's profile-picture-feature plan for
//      the exact JSON.
//   2. Deploy: `supabase functions deploy profile-picture`
//   3. `supabase secrets set AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=... AWS_S3_BUCKET=...`
//      (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are already available to
//      every Edge Function automatically — nothing to set for those.)
//
// Called from the client via a plain fetch (see callProfilePictureFunction
// in useProfilePicture.js) with { mode: "upload", contentType } or
// { mode: "remove" } as the JSON body and the session's access token as the
// Authorization bearer.
import { createClient } from "npm:@supabase/supabase-js@2";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";

const CONTENT_TYPE_EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png" };
const UPLOAD_URL_TTL_SECONDS = 300;

function s3Client() {
  return new S3Client({
    region: Deno.env.get("AWS_REGION")!,
    credentials: {
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
    },
  });
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

// picture_url is always a full https URL to our own bucket (see publicUrl
// below) — the S3 key is just its path, so no separate key column is needed
// on profiles to know what to delete.
function keyFromPublicUrl(url) {
  if (!url) return null;
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
}

// Best-effort: a missing/already-deleted object shouldn't block the caller's
// upload or removal, so failures here are swallowed rather than surfaced.
// Uses the service-role client rather than a per-request anon client scoped
// by RLS — safe because `userId` already comes from the platform-verified
// JWT, not client input, so scoping the query to it by hand is equivalent.
async function deleteExistingPicture(s3, bucket, admin, userId) {
  const { data } = await admin.from("profiles").select("picture_url").eq("id", userId).single();
  const key = keyFromPublicUrl(data?.picture_url);
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    // Ignore — see comment above.
  }
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

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const bucket = Deno.env.get("AWS_S3_BUCKET")!;
  const s3 = s3Client();
  const { mode, contentType } = await req.json();

  if (mode === "remove") {
    await deleteExistingPicture(s3, bucket, admin, userId);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  }

  if (mode === "upload") {
    const ext = CONTENT_TYPE_EXTENSIONS[contentType];
    if (!ext) return new Response("Unsupported content type", { status: 400 });

    await deleteExistingPicture(s3, bucket, admin, userId);

    const key = `profile-pictures/${userId}/${crypto.randomUUID()}.${ext}`;
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS }
    );
    const publicUrl = `https://${bucket}.s3.${Deno.env.get("AWS_REGION")}.amazonaws.com/${key}`;

    return new Response(JSON.stringify({ uploadUrl, publicUrl }), { status: 200, headers: { "content-type": "application/json" } });
  }

  return new Response("Unknown mode", { status: 400 });
});
