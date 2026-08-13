import { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import * as LocalAuthentication from "expo-local-authentication";
import { supabase } from "../lib/supabase-client";
import { migrateWorkouts, logError } from "@barrow/core";
import { claimGuestDataForAccount, clearGuestData } from "../state/accountNamespace";

const DEBOUNCE_MS = 1500;
const BIOMETRIC_KEY = "barrow:biometricEnabled";
const BIOMETRIC_ASKED_KEY = "barrow:biometricAsked";

// Supabase sometimes surfaces a failure (most often the auth server failing
// to send an email through a misconfigured custom SMTP provider) as an
// essentially-empty error — message "{}" , "[]", or blank. Rather than show
// that literally, fall back to something a user can act on. Check the
// Supabase dashboard's Authentication → Logs for the real underlying error.
function friendlyAuthError(scope, err) {
  logError(scope, err);
  const msg = err?.message?.trim();
  if (!msg || msg === "{}" || msg === "[]") {
    return "Something went wrong sending the email. This usually means the SMTP configuration in Supabase needs attention — check Authentication → Logs in the Supabase dashboard for the real error.";
  }
  return msg;
}

// Profile height/weight are plain numeric TextInput strings on the client
// (so an empty field can just be "") but integer/numeric columns in
// Postgres, which reject "" — convert to a number or null for the wire.
function toNullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

// Birthday is a plain "" on the client (empty TextInput) but a date column
// in Postgres, which rejects "" — convert to null for the wire.
function toNullableDate(value) {
  return value === "" || value === null || value === undefined ? null : value;
}

// Plain structural equality (no lodash dependency) — used below to tell a
// genuinely stale cloud/local pair apart from one that's merely being
// re-checked (e.g. every app refresh re-runs the pull effect for the same
// signed-in user, since syncedUserIdRef is an in-memory ref that doesn't
// survive a reload).
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(a[key], b[key]));
}

// The union of local and cloud items by id, with the phone's version
// winning wherever an id exists on both sides (mismatched -> phone wins)
// and cloud-only items filling in whatever's missing locally (empty on
// phone -> cloud wins). Used for `exercises` and `routines`, both flat
// arrays of {id, ...}. Returns `localItems` unchanged (same reference) when
// there's nothing to add, so callers can skip a no-op setState.
function mergeById(localItems, cloudItems) {
  if (!cloudItems) return localItems;
  const localIds = new Set(localItems.map((item) => item.id));
  const cloudOnly = cloudItems.filter((item) => !localIds.has(item.id));
  return cloudOnly.length > 0 ? [...localItems, ...cloudOnly] : localItems;
}

// Same merge-by-id idea as above, but for `workouts`, which is keyed by
// date to an array of workouts (each with its own id) rather than a flat
// array — so the merge happens one date at a time.
function mergeWorkouts(localWorkouts, cloudWorkouts) {
  if (!cloudWorkouts) return localWorkouts;
  const merged = { ...localWorkouts };
  for (const [dateKey, cloudDayWorkouts] of Object.entries(cloudWorkouts)) {
    merged[dateKey] = mergeById(merged[dateKey] || [], cloudDayWorkouts);
  }
  return merged;
}

// Per-date content diff between two `{ dateKey: Workout[] }` maps — returns
// the date keys whose array differs. Used by pushNow (diffing current
// workouts against the last-known-synced baseline) and syncSession's
// merge/push-back step (diffing the merged result against what's already in
// workout_logs), so only the date(s) that actually changed get upserted to
// workout_logs instead of the whole history on every write.
//
// Deliberately content-based (deepEqual), not reference-based, even though
// every workouts mutation in packages/core rebuilds the object via a
// shallow spread (which would make reference equality a cheap and correct
// per-date diff on its own): AppStateProvider's foreground-resync effect
// also calls setWorkouts(migrateWorkouts(JSON.parse(raw))) on every app
// foreground transition, which rebuilds the *entire* object from JSON,
// handing every date a brand-new array reference regardless of whether its
// content actually changed. A reference diff would treat every date as
// dirty on nearly every foreground, silently reintroducing a full-history
// push on a new trigger. The CPU cost of a full content diff on each
// debounced push is negligible next to the network/DB write it replaces.
function diffWorkoutDates(current, baseline) {
  const dates = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  const changed = [];
  for (const dateKey of dates) {
    if (!deepEqual(current[dateKey] ?? [], baseline[dateKey] ?? [])) changed.push(dateKey);
  }
  return changed;
}

// Row shape workout_logs upserts share — one row per changed date.
function toWorkoutLogRows(userId, workoutsObj, dateKeys) {
  return dateKeys.map((dateKey) => ({
    user_id: userId,
    workout_date: dateKey,
    data: workoutsObj[dateKey] || [],
    updated_at: new Date().toISOString(),
  }));
}

// Same phone-wins-unless-blank idea as mergeById/mergeWorkouts, but for a
// single scalar field (used for the profile's identity fields) rather than
// a collection: the local value wins whenever it's non-blank, and the
// cloud's value only fills in when the local one is null/undefined/"".
function preferLocal(localValue, cloudValue) {
  return localValue === null || localValue === undefined || localValue === "" ? cloudValue : localValue;
}

// True if the currently-active local namespace holds anything a stranger
// signing in on top of it could lose or have leaked into their account —
// used by the account-conflict check below, which only needs to fire when
// there's actually something at stake in the guest bucket.
function hasMeaningfulLocalData(exercises, routines, workouts, profile) {
  return (
    Object.keys(workouts).length > 0 ||
    routines.length > 0 ||
    exercises.some((e) => e.custom) ||
    !!(profile.firstName || profile.lastName || profile.username || profile.birthday || profile.gender || profile.height || profile.weight)
  );
}

// Cloud sync: sign in with email + password (or Google), and identity/
// biometric fields (name, username, birthday, gender, height, weight,
// picture) auto-push (debounced) to that account's `profiles` row for
// every signed-in account, free or premium — that's what actually seeds
// the row right after sign-up, since the DB trigger that creates it
// (handle_new_user, supabase/schema.sql) only knows `id`/`email`, not any
// of the local device state this hook pushes once a session exists. Only
// `backup_data` (exercises/routines/workouts/unit) is gated behind the
// `premium` entitlement (set via billing/admin, never by this client) —
// see the `!data.premium` branch in syncSession, and the `profile.premium`
// check inside pushNow below. A signed-in non-premium account still gets
// its profile/biometrics synced across devices; it just never backs up
// workout data. Signing in as premium on a device with existing local data
// merges the cloud copy into local state rather than replacing it: for
// exercises/routines/workouts, an id present on both sides keeps the
// phone's version, and an id only present in the cloud gets added locally.
// `unit` keeps the phone's value unless the phone's is empty. The merged
// result is then pushed back up so the cloud row matches too — no
// confirmation needed since the phone's data is never clobbered.
export function useCloudSync({
  profile, setProfile, resetProfile,
  exercises, setExercises,
  routines, setRoutines,
  workouts, setWorkouts,
  unit, setUnit,
  // Which account's local cache is active right now (null = guest bucket),
  // the function that switches it, and whether every local slice has
  // finished (re)loading from disk for whichever namespace is currently
  // active — all owned by AppStateProvider. See the pull-gate effect below
  // for why a namespace switch must wait on localDataHydrated before
  // syncSession reads workouts/exercises/etc.
  activeAccountId, switchActiveAccount, localDataHydrated,
}) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | authenticating | confirm-email | reset-email-sent | syncing | synced | premium-required | error
  const [error, setError] = useState(null);
  // Whether this account has anything backed up server-side right now,
  // independent of current premium status — a downgraded-from-premium
  // account can still have a stale cloud backup sitting in backup_data.
  // Refreshed on every syncSession pull; DangerZoneSection uses it to decide
  // whether "Clear backup data" is worth showing to a non-premium account.
  const [hasBackupData, setHasBackupData] = useState(false);
  // Supabase sets a temporary session and fires PASSWORD_RECOVERY when
  // someone lands back on the app from a "reset your password" email deep
  // link. While true, the UI shows a "set a new password" prompt instead of
  // treating them as a normal signed-in session.
  const [recoveryMode, setRecoveryMode] = useState(false);
  // Local device preference, not a Supabase concept — gates opening the
  // Profile screen behind Face ID/fingerprint once turned on. Loaded async
  // from AsyncStorage since SecureStore-level secrecy isn't needed for a
  // plain on/off flag.
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  // Shown once, right after an explicit sign-in, offering to turn biometric
  // unlock on. Stays hidden forever after the first answer (see
  // BIOMETRIC_ASKED_KEY) — this is a one-time offer, not a recurring nag.
  const [biometricPromptVisible, setBiometricPromptVisible] = useState(false);
  // True whenever there's a signed-in session that hasn't cleared the
  // mandatory re-auth gate yet (see the pull-on-sign-in effect below) — the
  // rest of the app stays fully usable while this is true, but no data
  // moves to or from the cloud: CloudBackupSection shows a locked state
  // and the debounced auto-push effect below skips pushing local edits.
  const [syncLocked, setSyncLocked] = useState(false);
  // Shown by ReauthModal when unlockSync() can't clear the gate with a
  // biometric check alone (no hardware/nothing enrolled) — offers a
  // password (or "Continue with Google", for an OAuth-only account)
  // re-entry instead.
  const [reauthPromptVisible, setReauthPromptVisible] = useState(false);
  const [reauthError, setReauthError] = useState(null);
  // Whether this device can even attempt Face ID/fingerprint at all —
  // checked once (capability rarely changes mid-session) so ReauthModal can
  // offer a "Use Face ID/fingerprint" retry button when the user backed out
  // of the system prompt instead of it being truly unavailable, without
  // showing that button pointlessly on a device with no biometric hardware.
  const [biometricSupported, setBiometricSupported] = useState(false);
  // True while a fresh explicit sign-in is waiting on the user to resolve
  // "this device has data from another account" (see the pull-gate effect
  // below) — App.js mounts the confirm modal off this flag, the same
  // pattern as reauthPromptVisible/biometricPromptVisible.
  const [accountConflictVisible, setAccountConflictVisible] = useState(false);
  // Holds the session (and its cancelledRef) that triggered the conflict,
  // so resolveAccountConflict can act on the same sign-in attempt the user
  // is actually looking at rather than re-deriving it from whatever
  // `session` happens to be by the time they answer.
  const pendingConflictRef = useRef(null);
  // Set right before a namespace switch that still needs syncSession (or
  // attemptUnlock) to run once the newly-active namespace's local slices
  // finish (re)loading — see the localDataHydrated-watching effect below.
  // Cleared the moment that follow-up actually fires.
  const pendingPostSwitchRef = useRef(null);
  // True for the whole duration of the pull-on-sign-in effect below (fetch
  // through applying the result), so the push effect skips re-uploading
  // whatever was just pulled instead of racing it.
  const isApplyingRemoteRef = useRef(false);
  const pushTimeoutRef = useRef(null);
  // Snapshot of `workouts` as of the last point workout_logs was made to
  // match it (after a successful pushNow, or after syncSession's
  // pull/merge/push-back). pushNow diffs current `workouts` against this via
  // diffWorkoutDates to find which date(s) actually changed since then, so
  // it only needs to upsert those rows instead of the whole history.
  const workoutsBaselineRef = useRef(workouts);
  // Marks which user id the pull-on-sign-in effect has already run for.
  // supabase.auth.onAuthStateChange fires a fresh `session` object (new
  // reference) not just on an explicit sign-in but also on TOKEN_REFRESHED
  // and the cold-start INITIAL_SESSION — without this guard, every one of
  // those re-runs the cloud pull and, if this device already has local
  // data, re-merges against a cloud copy that hasn't actually changed.
  // Reset on sign-out so a later sign-in (same or different account) always
  // re-syncs.
  const syncedUserIdRef = useRef(null);

  // Once biometrics have unlocked the app this session, later Profile-screen
  // visits shouldn't prompt again — otherwise every single visit demands a
  // fresh Face ID/fingerprint check, which is the opposite of "quick
  // unlock". Cleared on sign-out so a different account signing in later on
  // the same device still gets its own check. Plain ref (not state): this
  // is a one-way latch for the current app process, not something any
  // render needs to react to.
  const biometricUnlockedRef = useRef(false);
  // SIGNED_IN fires for an explicit sign-in/sign-up/OAuth completion;
  // restoring an already-persisted session on cold start fires
  // INITIAL_SESSION instead (supabase-js v2) — this gates both the
  // first-sign-in biometric prompt and the mandatory re-auth gate below, so
  // it must stay false for the latter. Only set when the SIGNED_IN event's
  // user id doesn't already match syncedUserIdRef — that ref gets set the
  // instant ANY pull-gate run starts (fresh or locked), so a SIGNED_IN that
  // fires later for the same already-synced-or-locked user (e.g.
  // reauthenticateWithPassword re-verifying an already-signed-in account)
  // correctly reads as "not fresh" instead of leaving a stale true flag
  // that a later cold start would misread as its own fresh sign-in.
  const justSignedInRef = useRef(false);
  // Set alongside justSignedInRef specifically by signUp (see below) when a
  // brand-new account gets an immediate session (no email confirmation
  // required) — distinguishes "just created an account" from "just signed
  // into an existing one" for the pull-gate effect below: guest data has no
  // prior owner, so a fresh sign-up silently adopts it instead of raising
  // the same conflict prompt a sign-in into an *existing*, different
  // account would.
  const justSignedUpRef = useRef(false);
  // Set right before reauthenticateWithGoogle below kicks off, since
  // signInWithGoogle doesn't resolve with a definitive success signal of
  // its own (it opens a browser and comes back later via deep link) — the
  // effect that watches for the resulting session checks and clears this.
  const oauthReauthPendingRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(BIOMETRIC_KEY).then((v) => setBiometricEnabledState(v === "true"));
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]).then(
      ([hasHardware, isEnrolled]) => setBiometricSupported(hasHardware && isEnrolled)
    );
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      if (event === "SIGNED_IN" && syncedUserIdRef.current !== s?.user?.id) justSignedInRef.current = true;
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Deep-link handling for the password-reset email link: it opens the app
  // with `?code=...` (PKCE flow — see supabase-client.js), which needs to be
  // exchanged for a session before onAuthStateChange fires PASSWORD_RECOVERY.
  // Requires this app's redirect URL (Linking.createURL("reset-password")) to
  // be added to the Supabase project's allowed redirect URLs — a one-time
  // manual step in the Supabase dashboard.
  useEffect(() => {
    if (!supabase) return undefined;
    const handleUrl = ({ url }) => {
      const { queryParams } = Linking.parse(url);
      if (queryParams?.code) {
        supabase.auth.exchangeCodeForSession(queryParams.code).catch((e) => logError("cloudSync.deepLink.exchangeCode", e));
      }
    };
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    const sub = Linking.addEventListener("url", handleUrl);
    return () => sub.remove();
  }, []);

  // Fetches the cloud backup for `sess`, reconciles it against local state
  // (see the inSync check below), and either restores or seeds the cloud
  // row. Called right away for a fresh explicit sign-in; for a restored
  // session (cold start / token refresh) it's deferred until unlockSync()
  // clears the mandatory re-auth gate in the effect below — see that
  // effect's comment for why a returning session doesn't sync immediately.
  // `cancelledRef`, when passed, lets the caller bail out of a stale
  // in-flight run; only the automatic pull-gate effect needs that — the
  // manual unlock paths (unlockSync/reauthenticateWithPassword/the OAuth
  // completion effect) are one-off user actions with nothing to race.
  const syncSession = async (sess, cancelledRef) => {
    setStatus("syncing");
    // Held for the whole fetch-and-apply window below, not just around the
    // setProfile/setExercises/etc. calls — the debounced push effect races
    // this pull on every sign-in and cold start (session going truthy
    // arms its 1500ms timer immediately, with whatever profile/exercises/
    // etc. currently sit in memory, which on a fresh device or before
    // local hydration finishes is blank/default). If that SELECT is slow
    // enough (a real risk for the first network request after a cold
    // launch), the old code left this ref false during the entire await,
    // so the push could fire first and overwrite the real cloud profile
    // with blanks before this pull ever got to apply the real data —
    // sometimes permanently, if the pull's own SELECT then read back that
    // same blank write. Guarding the whole window (with try/finally so an
    // early return can't leave it stuck true) closes that gap.
    isApplyingRemoteRef.current = true;
    try {
      const [{ data, error: fetchError }, { data: workoutRows, error: workoutRowsError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("public_id, first_name, last_name, username, picture_url, birthday, gender, height, weight, premium, backup_data")
          .eq("id", sess.user.id)
          .single(),
        // Unconditional (no premium filter — RLS allows select regardless),
        // since hasBackupData below needs to reflect these rows even for a
        // non-premium account with stale leftover data.
        supabase.from("workout_logs").select("workout_date, data").eq("user_id", sess.user.id),
      ]);

      if (cancelledRef?.current) return;
      if (fetchError || workoutRowsError) {
        setError(friendlyAuthError("cloudSync.pull", fetchError || workoutRowsError));
        setStatus("error");
        return;
      }

      // Unlike the identity fields below, profile_id isn't part of the
      // premium-gated cloud sync — every account gets one at signup (see
      // handle_new_user/generate_public_id in supabase/schema.sql)
      // regardless of premium status, so it always overwrites the
      // locally-generated placeholder from DEFAULT_PROFILE.
      //
      // pictureUrl is also pulled unconditionally, unlike the other identity
      // fields below: uploading a profile picture is available to every
      // signed-in user (not premium-gated — see set_profile_picture_url in
      // supabase/schema.sql), so a non-premium user's picture needs to sync
      // across devices too even though their name/username/etc. stay
      // local-only. Same phone-wins-unless-blank merge as those fields.
      setProfile((p) => ({ ...p, profileId: data.public_id, pictureUrl: preferLocal(p.pictureUrl, data.picture_url) }));

      // Computed regardless of premium (both fetches above run unconditionally)
      // so a non-premium account's leftover backup from before a downgrade —
      // in backup_data or in workout_logs — is still reflected in hasBackupData.
      const cloudHasData =
        (data.backup_data && Object.keys(data.backup_data).length > 0) || (workoutRows && workoutRows.length > 0);
      setHasBackupData(!!cloudHasData);

      // The remaining profile identity/biometric fields (name/username/
      // birthday/gender/height/weight) sync for every account, premium or
      // not — only backup_data (below) is a premium entitlement. Same
      // phone-wins merge as exercises/routines/workouts/unit: keep
      // whatever's already on the phone unless that field is blank there,
      // in which case fall back to the cloud's value. Without this, a
      // null/blank cloud field would clobber a populated phone value on
      // every sign-in/re-sync.
      setProfile((p) => ({
        ...p,
        firstName: preferLocal(p.firstName, data.first_name),
        lastName: preferLocal(p.lastName, data.last_name),
        username: preferLocal(p.username, data.username),
        email: sess.user.email,
        birthday: preferLocal(p.birthday, data.birthday === null ? "" : data.birthday),
        gender: preferLocal(p.gender, data.gender),
        height: preferLocal(p.height, data.height === null ? "" : String(data.height)),
        weight: preferLocal(p.weight, data.weight === null ? "" : String(data.weight)),
        // Entitlement flag, not a user-editable field — pulled from the db
        // as the source of truth (set via billing/admin) but deliberately
        // left out of the push payload below so a stale local value can
        // never overwrite it server-side.
        premium: data.premium,
      }));

      // Backup data (exercises/routines/workouts/unit) stays a premium
      // entitlement — a signed-in non-premium account still gets its
      // profile/biometrics synced above, it just never exchanges workout
      // data with the cloud row.
      if (!data.premium) {
        setStatus("premium-required");
      } else {
        const localHasData = Object.keys(workouts).length > 0;

        // Falls back to the pre-rename `templates` key so an old cloud
        // backup still compares/restores correctly. migrateWorkouts also
        // renames each workout's old `templateIds` field to `routineIds`,
        // so cloud workouts need it applied before comparing too, or an
        // old backup would look permanently "out of sync" with local.
        const cloudRoutines = data.backup_data?.routines ?? data.backup_data?.templates;

        // Reconstructed into the same `{ dateKey: Workout[] }` shape
        // backup_data.workouts used to be, so mergeWorkouts/deepEqual below
        // work unchanged against workout_logs rows instead of a blob.
        const workoutRowsByDate = migrateWorkouts(Object.fromEntries((workoutRows || []).map((r) => [r.workout_date, r.data])));

        // One-time lazy migration: zero workout_logs rows but a leftover
        // legacy backup_data.workouts means this account/device hasn't
        // migrated to workout_logs yet — adopt it once. Gated on
        // workoutRows.length === 0 rather than a flag, so it's naturally
        // idempotent (any later syncSession call sees rows already there and
        // skips this) and a failed upsert just gets retried next time. The
        // legacy `workouts` key in backup_data is left untouched here — it
        // drops out for free the next time anything writes backup_data,
        // since pushNow/the push-back below no longer include it.
        let cloudWorkouts = workoutRowsByDate;
        const legacyWorkouts = data.backup_data?.workouts;
        if (workoutRows.length === 0 && legacyWorkouts && Object.keys(legacyWorkouts).length > 0) {
          const migratedLegacy = migrateWorkouts(legacyWorkouts);
          const legacyRows = Object.entries(migratedLegacy).map(([dateKey, dayWorkouts]) => ({
            user_id: sess.user.id,
            workout_date: dateKey,
            data: dayWorkouts,
            updated_at: new Date().toISOString(),
          }));
          if (legacyRows.length > 0) {
            const { error: migrateError } = await supabase
              .from("workout_logs")
              .upsert(legacyRows, { onConflict: "user_id,workout_date" });
            if (!migrateError) cloudWorkouts = migratedLegacy;
          }
          setHasBackupData(true);
        }

        // If cloud and local already agree, this is just a re-check (e.g. a
        // refresh re-running this effect for the same user, or nothing
        // changed since the last sync) — skip the redundant re-merge/re-push
        // below.
        // Built-in exercises are static (SEED_EXERCISES) and reconstructed
        // locally by reconcileExercises on every load, so only user-added
        // custom ones are worth persisting to/comparing against the cloud
        // row — backing up the built-ins too would just bloat backup_data
        // with rows that are identical on every device already.
        const customExercises = exercises.filter((e) => e.custom);
        const inSync =
          cloudHasData &&
          localHasData &&
          deepEqual(data.backup_data.exercises ?? {}, customExercises) &&
          deepEqual(cloudRoutines ?? {}, routines) &&
          deepEqual(cloudWorkouts, workouts) &&
          (data.backup_data.unit ?? unit) === unit;

        if (!inSync) {
          // Merge rather than overwrite: an id present on both sides keeps
          // the phone's version (mismatched -> phone wins), and an id only
          // present in the cloud gets pulled in (empty on phone -> cloud
          // wins). Covers the brand-new-account case too, since mergeById/
          // mergeWorkouts just return the local value unchanged when there's
          // no cloud data to merge in.
          const mergedExercises = mergeById(exercises, data.backup_data?.exercises);
          const mergedRoutines = mergeById(routines, cloudRoutines);
          const mergedWorkouts = mergeWorkouts(workouts, cloudWorkouts);
          const mergedUnit = unit || data.backup_data?.unit;

          if (mergedExercises !== exercises) setExercises(mergedExercises);
          if (mergedRoutines !== routines) setRoutines(mergedRoutines);
          if (mergedWorkouts !== workouts) setWorkouts(mergedWorkouts);
          if (mergedUnit !== unit) setUnit(mergedUnit);

          // Push the merged result back up so the cloud row matches too —
          // profile fields (no `workouts` key anymore) and workout_logs rows
          // separately. Only the date(s) whose content actually differs from
          // what's already in workout_logs get upserted, not the whole
          // history.
          const changedDates = diffWorkoutDates(mergedWorkouts, cloudWorkouts);
          await Promise.all([
            supabase
              .from("profiles")
              .update({
                backup_data: {
                  exercises: mergedExercises.filter((e) => e.custom),
                  routines: mergedRoutines,
                  unit: mergedUnit,
                },
                updated_at: new Date().toISOString(),
              })
              .eq("id", sess.user.id),
            changedDates.length > 0
              ? supabase
                  .from("workout_logs")
                  .upsert(toWorkoutLogRows(sess.user.id, mergedWorkouts, changedDates), { onConflict: "user_id,workout_date" })
              : Promise.resolve(),
          ]);
          setHasBackupData(true);
          workoutsBaselineRef.current = mergedWorkouts;
        } else {
          // Cloud already matches local — record that agreement as the
          // baseline so the next debounced push only pushes genuinely new
          // edits, not a re-diff against a stale/default baseline.
          workoutsBaselineRef.current = workouts;
        }

        setStatus("synced");
      }
    } finally {
      isApplyingRemoteRef.current = false;
    }

    // Offer biometric unlock right after an explicit sign-in, once, if
    // it's not already on and the device can actually do it (no point
    // offering it on web or a device/emulator with no biometrics
    // enrolled). Not on native's cold-start session restore — see
    // justSignedInRef's own comment.
    if (justSignedInRef.current) {
      justSignedInRef.current = false;
      const alreadyAsked = (await AsyncStorage.getItem(BIOMETRIC_ASKED_KEY)) === "true";
      if (!alreadyAsked && !biometricEnabled && Platform.OS !== "web") {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!cancelledRef?.current && hasHardware && isEnrolled) setBiometricPromptVisible(true);
      }
    }
  };

  // Gates cloud sync on `session` behind re-authentication, AND (new) behind
  // making sure the account signing in actually owns whatever's sitting in
  // this device's currently-active local namespace. Waits on
  // localDataHydrated first — this runs as soon as `session` goes truthy,
  // which on a cold start can be before local disk reads finish, and the
  // decision below reads exercises/routines/workouts/profile, so evaluating
  // it against still-loading (empty/default) state could wrongly conclude
  // "nothing at stake" for a device that actually has real guest data.
  //
  // Once hydrated, exactly one of four things happens for a *fresh explicit*
  // sign-in/up/OAuth/password-reset (justSignedInRef true — SignInModal, or
  // updatePassword):
  //   1. Incoming account === the device's already-active account — today's
  //      normal case, sync right away.
  //   2. The active namespace already belongs to a *different* account (or
  //      the guest bucket is empty) — always safe: switch straight to the
  //      incoming account's own namespace (fresh, or its own previously-
  //      cached data if it's used this device before) without touching
  //      whatever's parked under the other account/guest. No prompt.
  //   3. The guest bucket is active and holds real data, and this is a
  //      brand-new sign-*up* (justSignedUpRef true) — guest data has no
  //      prior owner, so it silently becomes this new account's data (same
  //      "seeds the row" behavior as always), no prompt.
  //   4. The guest bucket is active and holds real data, and an *existing*,
  //      different account is signing in — the one ambiguous case (someone
  //      else's phone with real unsynced guest data). Pause and ask via
  //      accountConflictVisible/resolveAccountConflict below.
  //
  // A *restored* session (cold start / token refresh, justSignedInRef
  // false) is never "someone else authenticating" — if the guest bucket is
  // still active, silently claim it for continuity (the common case: every
  // already-signed-in install, the first launch after this shipped) and
  // fall into the same mandatory re-auth gate (attemptUnlock) as before.
  // Skipped during password recovery — that flow isn't a normal sign-in
  // yet, it resolves into one (re-running this effect) once the password
  // is set.
  useEffect(() => {
    if (!supabase || !session || recoveryMode || !localDataHydrated) return undefined;
    if (syncedUserIdRef.current === session.user.id) return undefined;
    syncedUserIdRef.current = session.user.id;
    const cancelledRef = { current: false };
    const incomingId = session.user.id;

    (async () => {
      if (!justSignedInRef.current) {
        setSyncLocked(true);
        if (activeAccountId == null) {
          await switchActiveAccount(incomingId);
          if (cancelledRef.current) return;
          pendingPostSwitchRef.current = { session, cancelledRef, resume: "unlock" };
          return;
        }
        attemptUnlock(session, cancelledRef);
        return;
      }

      const signedUp = justSignedUpRef.current;
      justSignedUpRef.current = false;

      if (activeAccountId === incomingId) {
        setSyncLocked(false);
        syncSession(session, cancelledRef);
        return;
      }

      const guestHasData = activeAccountId == null && hasMeaningfulLocalData(exercises, routines, workouts, profile);

      if (guestHasData && !signedUp) {
        pendingConflictRef.current = { session, cancelledRef, email: session.user.email };
        setAccountConflictVisible(true);
        return;
      }

      if (guestHasData && signedUp) await claimGuestDataForAccount(incomingId);
      await switchActiveAccount(incomingId);
      if (cancelledRef.current) return;
      setSyncLocked(false);
      pendingPostSwitchRef.current = { session, cancelledRef, resume: "sync" };
    })();

    return () => {
      cancelledRef.current = true;
    };
    // Only re-run when the session/recovery/hydration/active-namespace state
    // changes — not on every local edit, which is handled by the push
    // effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, recoveryMode, localDataHydrated, activeAccountId]);

  // Finishes what the effect above started whenever it switched namespaces
  // mid-flow: switchActiveAccount changes the keys every usePersistedState
  // instance in AppStateProvider reads/writes, which makes localDataHydrated
  // dip back to false and then true again once the new namespace has
  // actually loaded — only then is it safe to read exercises/routines/
  // workouts/profile without racing that reload. resume "sync" is a fresh
  // sign-in that already proved identity (syncSession right away); "unlock"
  // is a restored session that silently claimed an empty guest bucket for
  // continuity and still needs the normal mandatory re-auth gate.
  useEffect(() => {
    const pending = pendingPostSwitchRef.current;
    if (!pending || !localDataHydrated) return;
    pendingPostSwitchRef.current = null;
    if (pending.cancelledRef.current) return;
    if (pending.resume === "unlock") attemptUnlock(pending.session, pending.cancelledRef);
    else syncSession(pending.session, pending.cancelledRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDataHydrated]);

  // Resolves the "this device has data from another account" prompt.
  // "replace" wipes the guest bucket outright (the offer's "otherwise the
  // data will be wiped" — a deliberate, user-chosen action, not a silent
  // side effect) and proceeds as the incoming account; "cancel" backs the
  // just-authenticated attempt out entirely, leaving the guest bucket (and
  // whoever's actually using this device) untouched.
  const resolveAccountConflict = async (action) => {
    const pending = pendingConflictRef.current;
    if (!pending) return;
    pendingConflictRef.current = null;
    setAccountConflictVisible(false);

    if (action === "cancel") {
      justSignedInRef.current = false;
      await signOut();
      return;
    }

    const incomingId = pending.session.user.id;
    await clearGuestData();
    await switchActiveAccount(incomingId);
    if (pending.cancelledRef.current) return;
    setSyncLocked(false);
    pendingPostSwitchRef.current = { session: pending.session, cancelledRef: pending.cancelledRef, resume: "sync" };
  };

  // Completes a Google-OAuth re-auth started from ReauthModal (see
  // reauthenticateWithGoogle below): signInWithGoogle doesn't resolve with
  // a definitive "it worked" signal of its own — success arrives later as
  // a fresh session once the deep link comes back — so pick it up here via
  // oauthReauthPendingRef instead. That ref (rather than reusing
  // justSignedInRef) keeps this immune to an unrelated background token
  // refresh coincidentally firing while the modal happens to be open.
  useEffect(() => {
    if (oauthReauthPendingRef.current && session) {
      oauthReauthPendingRef.current = false;
      setReauthPromptVisible(false);
      setSyncLocked(false);
      syncSession(session);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Shared by the debounced auto-push effect below and the manual `syncNow`
  // (the CloudBackupSection "Sync now" button) — pushes the current
  // in-memory state up, unconditionally, right now. Identity/biometric
  // fields go up for every signed-in account; backup_data is only included
  // for premium ones — omitted rather than sent-and-reverted so a
  // non-premium push doesn't stamp updated_at on a write that didn't
  // actually touch anything backup-related, and so hasBackupData isn't
  // reset to true off a write the server-side trigger silently no-ops (see
  // protect_premium_columns in supabase/schema.sql).
  const pushNow = async () => {
    setStatus("syncing");
    const payload = {
      first_name: profile.firstName,
      last_name: profile.lastName,
      username: profile.username,
      picture_url: profile.pictureUrl,
      birthday: toNullableDate(profile.birthday),
      gender: profile.gender,
      height: toNullableNumber(profile.height),
      weight: toNullableNumber(profile.weight),
      updated_at: new Date().toISOString(),
    };
    // `workouts` is deliberately left out — see workout_logs below instead.
    // Any legacy `workouts` key still sitting in backup_data from before
    // this version drops out the instant this write lands, since a JSONB
    // column UPDATE replaces the whole value, not just the keys named here.
    if (profile.premium) {
      payload.backup_data = { exercises: exercises.filter((e) => e.custom), routines, unit };
    }

    const changedDates = profile.premium ? diffWorkoutDates(workouts, workoutsBaselineRef.current) : [];

    const [{ error: pushError }, workoutsResult] = await Promise.all([
      supabase.from("profiles").update(payload).eq("id", session.user.id),
      changedDates.length > 0
        ? supabase
            .from("workout_logs")
            .upsert(toWorkoutLogRows(session.user.id, workouts, changedDates), { onConflict: "user_id,workout_date" })
        : Promise.resolve({ error: null }),
    ]);

    const anyError = pushError || workoutsResult.error;
    setStatus(anyError ? "error" : "synced");
    if (anyError) {
      setError(friendlyAuthError("cloudSync.push", anyError));
    } else if (profile.premium) {
      setHasBackupData(true);
      workoutsBaselineRef.current = workouts;
    }
  };

  // Profile's "Danger zone" — wipes the cloud row's backup_data (gated
  // behind ConfirmActionModal by the caller) without touching anything
  // local. Deliberately doesn't flip syncLocked/premium or otherwise stop
  // future syncing: the next local edit (or a manual "Sync now") re-arms
  // the debounced push effect above and pushes current local state back up
  // like normal, so this is a one-time "empty out what's backed up right
  // now", not a permanent opt-out.
  const clearBackupData = async () => {
    if (!supabase || !session) return;
    setStatus("syncing");
    const [{ error: clearError }, { error: deleteWorkoutLogsError }] = await Promise.all([
      supabase.from("profiles").update({ backup_data: {}, updated_at: new Date().toISOString() }).eq("id", session.user.id),
      supabase.from("workout_logs").delete().eq("user_id", session.user.id),
    ]);
    const anyError = clearError || deleteWorkoutLogsError;
    setStatus(anyError ? "error" : "synced");
    if (anyError) {
      setError(friendlyAuthError("cloudSync.clearBackup", anyError));
    } else {
      setHasBackupData(false);
      // Reset to empty so the *next* push/sync re-uploads everything
      // currently in local `workouts`, not just whatever date happens to be
      // touched next — matches this function's "one-time empty-out, not a
      // permanent opt-out" contract (see the comment above).
      workoutsBaselineRef.current = {};
    }
  };

  // Profile's "Danger zone" — permanently deletes the signed-in account:
  // the delete-account Edge Function verifies the caller's own session and
  // then uses the service_role key (which the client never has) to delete
  // the auth.users row, which cascades to the profiles row too (see
  // supabase/schema.sql), after first deleting the S3 profile picture object
  // (also in that Edge Function, since only it holds the AWS credentials —
  // see supabase/functions/delete-account/index.ts) — so nothing about this
  // account is left on the server. Signs out immediately on success,
  // matching "logs them out instantly"; on failure, leaves the (still-valid)
  // session alone and surfaces the error rather than signing out of an
  // account that wasn't actually deleted. Workout/routine/exercise data on
  // this device is left untouched, same as signOut — but the profile itself
  // (name, username, birthday, gender, height, weight, picture, email) is
  // reset to a blank signed-out placeholder via resetProfile: those fields
  // belong to the account that was just deleted, `pictureUrl` in particular
  // points at an S3 object that no longer exists, and leaving any of them
  // set would otherwise leak into a *different* account signing in later on
  // this device, since syncSession's preferLocal merge keeps whatever
  // non-blank value is already sitting in local `profile` state.
  // Returns the failure message on error (for the caller to show, e.g. via
  // ErrorModal — DangerZoneSection is the only caller) and undefined on
  // success, rather than surfacing the failure itself: this hook has no UI
  // of its own to render it in.
  const deleteAccount = async () => {
    if (!supabase || !session) return undefined;
    setStatus("syncing");
    const { error: fnError } = await supabase.functions.invoke("delete-account");
    if (fnError) {
      const message = friendlyAuthError("cloudSync.deleteAccount", fnError);
      setStatus("error");
      setError(message);
      return message;
    }
    await signOut();
    resetProfile();
    return undefined;
  };

  // Debounced auto-push on every local change, while signed in — for every
  // account, premium or not (pushNow itself decides whether backup_data is
  // part of the payload). This is also what seeds a brand-new sign-up's
  // row with local profile/biometric state, since the DB trigger that
  // creates the row doesn't know it (see the module comment above). Skipped
  // while syncLocked — a restored session that hasn't cleared the re-auth
  // gate yet shouldn't leak local edits to the cloud. syncLocked is listed
  // as a dep (unlike the others below) specifically so unlocking itself
  // re-evaluates this effect and schedules a push for anything that changed
  // locally while it was locked.
  useEffect(() => {
    // localDataHydrated also guards this — right after an account switch it
    // dips back to false until the new namespace's slices finish loading,
    // which (thanks to switchActiveAccount clearing syncLocked before that
    // finishes, so the pull-gate effect's own deferred syncSession can run)
    // would otherwise leave a narrow window where this could push whatever
    // still-loading/default values happen to be in memory up to the
    // newly-active account's cloud row.
    if (!supabase || !session || recoveryMode || isApplyingRemoteRef.current || syncLocked || !localDataHydrated) return undefined;

    if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
    pushTimeoutRef.current = setTimeout(pushNow, DEBOUNCE_MS);

    return () => clearTimeout(pushTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile, exercises, routines, workouts, unit, syncLocked, localDataHydrated]);

  // Manual "Sync now" — skips the debounce and pushes immediately, so a
  // user who wants confidence their latest change is backed up doesn't have
  // to wait out DEBOUNCE_MS or make another edit to re-arm it. Available
  // regardless of premium, same as the debounced push above — CloudBackupSection
  // only renders the button once premium anyway (see its own `!profile.premium`
  // branch), since for a non-premium account there's no backup status worth
  // giving a manual retry for.
  const syncNow = async () => {
    if (!supabase || !session || syncLocked || !localDataHydrated) return;
    if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
    await pushNow();
  };

  const signIn = async (email, password) => {
    if (!supabase) return;
    setStatus("authenticating");
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(friendlyAuthError("cloudSync.signIn", signInError));
      setStatus("error");
    }
    // On success, the auth-state-change listener sets `session` and the
    // pull-on-sign-in effect above takes it from there.
  };

  const signUp = async (email, password) => {
    if (!supabase) return;
    setStatus("authenticating");
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    // Supabase deliberately doesn't always return a hard error for a
    // duplicate email (that'd let an attacker enumerate registered
    // addresses) — instead it returns a user-shaped response with an empty
    // `identities` array. Cover both signals: some project configurations
    // do still return an explicit "already registered" error.
    const alreadyRegistered =
      /already registered|already exists/i.test(signUpError?.message || "") ||
      (!signUpError && data?.user && data.user.identities?.length === 0);

    if (alreadyRegistered) {
      setError("An account with this email already exists. Try signing in instead.");
      setStatus("error");
    } else if (signUpError) {
      setError(friendlyAuthError("cloudSync.signUp", signUpError));
      setStatus("error");
    } else if (!data.session) {
      // Email confirmation is required before the account can sign in.
      setStatus("confirm-email");
    } else {
      // Immediate session (email confirmation disabled for this project) —
      // the SIGNED_IN event about to fire is for a brand-new account, not
      // an existing one, so mark it: the pull-gate effect below reads this
      // to silently adopt any guest data instead of raising the "this
      // device has data from another account" conflict prompt.
      justSignedUpRef.current = true;
    }
  };

  // Browser-based OAuth: on native, opens a system browser tab/Custom Tab
  // for Google's consent screen (expo-web-browser), then exchanges the
  // returned PKCE code directly — same mechanism as the password-reset deep
  // link, just driven from the promise result instead of the passive
  // Linking listener, since iOS's ASWebAuthenticationSession resolves that
  // promise without necessarily firing a Linking 'url' event. On web, a
  // plain full-page redirect is simpler and more reliable than a popup,
  // since the popup flow needs a synchronous user gesture that the awaited
  // OAuth-URL request would break.
  //
  // Requires one-time setup in the Supabase dashboard (Authentication →
  // Providers → Google, with a Google Cloud OAuth client's ID/secret) and
  // this app's redirect URL (Linking.createURL("auth-callback"), e.g.
  // barrow://auth-callback) added to Authentication → URL Configuration →
  // Redirect URLs.
  const signInWithGoogle = async () => {
    if (!supabase) return;
    setStatus("authenticating");
    setError(null);

    if (Platform.OS === "web") {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (oauthError) {
        setError(friendlyAuthError("cloudSync.signInWithGoogle", oauthError));
        setStatus("error");
      }
      return;
    }

    const redirectTo = Linking.createURL("auth-callback");
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (oauthError || !data?.url) {
      setError(friendlyAuthError("cloudSync.signInWithGoogle", oauthError || { message: "Couldn't start Google sign-in." }));
      setStatus("error");
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) {
      setStatus("idle"); // user cancelled/dismissed — not an error
      return;
    }

    const { queryParams } = Linking.parse(result.url);
    if (!queryParams?.code) {
      // A successful redirect back into the app without a `code` almost
      // always means Supabase/Google sent an `error`/`error_description`
      // instead (e.g. redirectTo not in Supabase's allowed Redirect URLs
      // list, or the user denied consent) — surface that instead of a
      // generic message so it's actually actionable.
      const description = queryParams?.error_description || queryParams?.error;
      if (description) logError("cloudSync.signInWithGoogle.redirect", new Error(description));
      setError("Google sign-in didn't work. Please try again.");
      setStatus("error");
      return;
    }
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(queryParams.code);
    if (exchangeError) {
      setError(friendlyAuthError("cloudSync.signInWithGoogle.exchange", exchangeError));
      setStatus("error");
    }
    // On success, the auth-state-change listener sets `session` and the
    // pull-on-sign-in effect above takes it from there.
  };

  const resetPassword = async (email) => {
    if (!supabase) return;
    setStatus("authenticating");
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL("reset-password"),
    });
    if (resetError) {
      setError(friendlyAuthError("cloudSync.resetPassword", resetError));
      setStatus("error");
    } else {
      setStatus("reset-email-sent");
    }
  };

  // Finishes the password-recovery flow: sets the new password and returns
  // to a normal signed-in session (the pull-gate effect then runs). Setting
  // a new password via the emailed reset link is itself strong proof of
  // identity, equivalent to a fresh sign-in — so this counts as "just
  // signed in" for the mandatory re-auth gate too, rather than coming out
  // of recovery mode locked.
  const updatePassword = async (password) => {
    if (!supabase) return;
    setStatus("authenticating");
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(friendlyAuthError("cloudSync.updatePassword", updateError));
      setStatus("error");
    } else {
      justSignedInRef.current = true;
      setRecoveryMode(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    biometricUnlockedRef.current = false;
    syncedUserIdRef.current = null;
    setSyncLocked(false);
    setReauthPromptVisible(false);
    setReauthError(null);
    setHasBackupData(false);
    setStatus("idle");
  };

  // Tries to clear the mandatory re-auth gate for `sess`: Face ID/
  // fingerprint first (regardless of the separate biometricEnabled
  // preference — that one is just a convenience toggle for quick-unlock
  // elsewhere; this gate is mandatory, not opt-in), falling back to
  // ReauthModal (password, or "Continue with Google" for an OAuth-only
  // account) on anything but success — no hardware, nothing enrolled, or a
  // cancelled/failed check all land there, where "Not now" lets the user
  // skip and keep using the app on local data. Shared by the automatic ask
  // at app launch (the pull-gate effect above), the manual "Unlock to
  // sync" retry in CloudBackupSection (unlockSync, below), and ReauthModal's
  // own "Use Face ID/fingerprint" retry button — so a successful check
  // always closes the modal too, whether or not it was already open when
  // this ran. `cancelledRef`, when passed, avoids updating state after the
  // launch effect that triggered this has already been torn down.
  const attemptUnlock = async (sess, cancelledRef) => {
    setReauthError(null);
    const { success } = await promptBiometric("Unlock to sync your data");
    if (cancelledRef?.current) return;
    if (success) {
      setReauthPromptVisible(false);
      setSyncLocked(false);
      syncSession(sess);
    } else {
      setReauthPromptVisible(true);
    }
  };

  // Manual "Unlock to sync" (CloudBackupSection) — same attemptUnlock flow
  // as the automatic ask at launch, just re-triggered on demand for
  // whoever skipped it (or whose biometric check failed) then.
  const unlockSync = () => {
    if (!supabase || !session) return;
    return attemptUnlock(session);
  };

  // ReauthModal's password path — re-verifies the already-signed-in
  // account's password (rather than starting a brand-new sign-in) before
  // clearing the sync lock.
  const reauthenticateWithPassword = async (password) => {
    if (!supabase || !session) return false;
    setStatus("authenticating");
    setReauthError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: session.user.email, password });
    if (signInError) {
      setReauthError(friendlyAuthError("cloudSync.reauthenticate", signInError));
      setStatus("error");
      return false;
    }
    setReauthPromptVisible(false);
    setSyncLocked(false);
    syncSession(session);
    return true;
  };

  // ReauthModal's Google path, for an OAuth-only account — see
  // oauthReauthPendingRef and the effect that watches for it above.
  const reauthenticateWithGoogle = () => {
    oauthReauthPendingRef.current = true;
    return signInWithGoogle();
  };

  const dismissReauthPrompt = () => {
    setReauthPromptVisible(false);
    setReauthError(null);
  };

  // Clears a one-shot status (confirm-email, reset-email-sent, error) once
  // the user has dismissed it, so reopening SignInModal later starts fresh
  // instead of immediately re-showing the same message. Not used for
  // syncing/synced — those reflect the actual signed-in sync state shown in
  // CloudBackupSection, not a message to dismiss.
  const dismissMessage = () => {
    setStatus("idle");
    setError(null);
  };

  // Not supported on web (no Face ID/fingerprint API there) or in Expo Go
  // (Face ID needs a development build) — hasHardwareAsync/isEnrolledAsync
  // just resolve false in those cases rather than throwing, so this is a
  // plain capability check, not error handling.
  const promptBiometric = async (promptMessage) => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) return { success: false, unsupported: true };
    const result = await LocalAuthentication.authenticateAsync({ promptMessage });
    return { success: result.success, unsupported: false };
  };

  // Requires a successful biometric check before turning the preference on,
  // so "enabled" always means it actually works on this device rather than
  // silently gating access with something that'll never succeed.
  const enableBiometric = async () => {
    const { success, unsupported } = await promptBiometric("Enable Face ID / fingerprint unlock");
    if (unsupported) {
      Alert.alert("Not available", "This device doesn't support Face ID/fingerprint, or none is enrolled in its settings.");
      return false;
    }
    if (success) {
      setBiometricEnabledState(true);
      await AsyncStorage.setItem(BIOMETRIC_KEY, "true");
      // That check just satisfied the same unlock this session would
      // otherwise ask for again a moment later — no reason to immediately
      // re-prompt right after turning it on.
      biometricUnlockedRef.current = true;
    }
    return success;
  };

  const disableBiometric = async () => {
    setBiometricEnabledState(false);
    await AsyncStorage.setItem(BIOMETRIC_KEY, "false");
  };

  // Gate before opening the Profile screen once biometric unlock is on.
  // Only asks once per app session (biometricUnlockedRef) — otherwise every
  // single visit to Profile would demand a fresh check, which defeats the
  // point of a "quick unlock". Fails open (lets the caller through) if the
  // device no longer supports biometrics — losing enrollment shouldn't
  // permanently lock someone out of their own already-signed-in account
  // with no fallback.
  const unlockWithBiometric = async () => {
    if (!biometricEnabled || biometricUnlockedRef.current) return true;
    const { success, unsupported } = await promptBiometric("Unlock Barrow");
    if (success || unsupported) biometricUnlockedRef.current = true;
    return success || unsupported;
  };

  // Answers to the one-time post-sign-in setup offer (see the pull-on-sign-
  // in effect above). Either way, mark it asked so it never shows again.
  const acceptBiometricPrompt = async () => {
    const enabled = await enableBiometric();
    await AsyncStorage.setItem(BIOMETRIC_ASKED_KEY, "true");
    setBiometricPromptVisible(false);
    return enabled;
  };

  const dismissBiometricPrompt = async () => {
    await AsyncStorage.setItem(BIOMETRIC_ASKED_KEY, "true");
    setBiometricPromptVisible(false);
  };

  return {
    available: !!supabase,
    session,
    recoveryMode,
    status,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    syncNow,
    clearBackupData,
    hasBackupData,
    deleteAccount,
    resetPassword,
    updatePassword,
    dismissMessage,
    biometricEnabled,
    enableBiometric,
    disableBiometric,
    unlockWithBiometric,
    biometricPromptVisible,
    acceptBiometricPrompt,
    dismissBiometricPrompt,
    syncLocked,
    unlockSync,
    reauthPromptVisible,
    reauthError,
    biometricSupported,
    reauthenticateWithPassword,
    reauthenticateWithGoogle,
    dismissReauthPrompt,
    accountConflictVisible,
    conflictAccountEmail: pendingConflictRef.current?.email || "",
    resolveAccountConflict,
  };
}
