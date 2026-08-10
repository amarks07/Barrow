import { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import * as LocalAuthentication from "expo-local-authentication";
import { supabase } from "../lib/supabase-client";
import { migrateWorkouts } from "@barrow/core";

const DEBOUNCE_MS = 1500;
const BIOMETRIC_KEY = "barrow:biometricEnabled";
const BIOMETRIC_ASKED_KEY = "barrow:biometricAsked";

// Supabase sometimes surfaces a failure (most often the auth server failing
// to send an email through a misconfigured custom SMTP provider) as an
// essentially-empty error — message "{}" , "[]", or blank. Rather than show
// that literally, fall back to something a user can act on. Check the
// Supabase dashboard's Authentication → Logs for the real underlying error.
function friendlyAuthError(err) {
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

// Same phone-wins-unless-blank idea as mergeById/mergeWorkouts, but for a
// single scalar field (used for the profile's identity fields) rather than
// a collection: the local value wins whenever it's non-blank, and the
// cloud's value only fills in when the local one is null/undefined/"".
function preferLocal(localValue, cloudValue) {
  return localValue === null || localValue === undefined || localValue === "" ? cloudValue : localValue;
}

// Optional cloud backup, gated behind the `premium` entitlement on the
// user's `profiles` row (set via billing/admin, never by this client): sign
// in with email + password, and once the account is confirmed premium,
// every local change to profile/exercises/routines/workouts/unit is
// auto-pushed (debounced) to that row. A signed-in non-premium account
// stays fully usable on local data — it just never pulls from or pushes to
// the cloud (see the `!data.premium` branch in syncSession, and the
// `profile.premium` checks on the push effect/syncNow below). Signing in as
// premium on a device with existing local data merges the cloud copy into
// local state rather than replacing it: for exercises/routines/workouts, an
// id present on both sides keeps the phone's version, and an id only
// present in the cloud gets added locally. `unit` keeps the phone's value
// unless the phone's is empty. The merged result is then pushed back up so
// the cloud row matches too — no confirmation needed since the phone's data
// is never clobbered.
export function useCloudSync({ profile, setProfile, exercises, setExercises, routines, setRoutines, workouts, setWorkouts, unit, setUnit }) {
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
  // True for the whole duration of the pull-on-sign-in effect below (fetch
  // through applying the result), so the push effect skips re-uploading
  // whatever was just pulled instead of racing it.
  const isApplyingRemoteRef = useRef(false);
  const pushTimeoutRef = useRef(null);
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
      if (queryParams?.code) supabase.auth.exchangeCodeForSession(queryParams.code).catch(() => {});
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
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("public_id, first_name, last_name, username, picture_url, birthday, gender, height, weight, premium, backup_data")
        .eq("id", sess.user.id)
        .single();

      if (cancelledRef?.current) return;
      if (fetchError) {
        setError(friendlyAuthError(fetchError));
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

      // Computed regardless of premium (the select above always fetches
      // backup_data) so a non-premium account's leftover backup from before
      // a downgrade is still reflected in hasBackupData.
      const cloudHasData = data.backup_data && Object.keys(data.backup_data).length > 0;
      setHasBackupData(!!cloudHasData);

      // Cloud sync (pull, merge, and the auto/manual push below) is a
      // premium entitlement — a signed-in non-premium account stays fully
      // usable on local data, it just never exchanges anything with the
      // cloud row. Still record the entitlement flag itself (source of
      // truth for the rest of the hook's premium checks) even when it's
      // false, so CloudBackupSection can show the right state.
      if (!data.premium) {
        setProfile((p) => ({ ...p, premium: false }));
        setStatus("premium-required");
      } else {
        // The remaining profile identity fields (name/username/birthday/
        // gender/height/weight) follow the same phone-wins merge as
        // exercises/routines/workouts/unit below: keep whatever's already
        // on the phone unless that field is blank there, in which case fall
        // back to the cloud's value. Without this, a null/blank cloud field
        // would clobber a populated phone value on every sign-in/re-sync.
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
          premium: true,
        }));

        const localHasData = Object.keys(workouts).length > 0;

        // Falls back to the pre-rename `templates` key so an old cloud
        // backup still compares/restores correctly. migrateWorkouts also
        // renames each workout's old `templateIds` field to `routineIds`,
        // so cloud workouts need it applied before comparing too, or an
        // old backup would look permanently "out of sync" with local.
        const cloudRoutines = data.backup_data?.routines ?? data.backup_data?.templates;
        const cloudWorkouts = data.backup_data?.workouts && migrateWorkouts(data.backup_data.workouts);

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
          deepEqual(cloudWorkouts ?? {}, workouts) &&
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

          // Push the merged result back up so the cloud row matches too.
          await supabase
            .from("profiles")
            .update({
              backup_data: {
                exercises: mergedExercises.filter((e) => e.custom),
                routines: mergedRoutines,
                workouts: mergedWorkouts,
                unit: mergedUnit,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", sess.user.id);
          setHasBackupData(true);
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

  // Gates cloud sync on `session` behind re-authentication. A fresh
  // explicit sign-in (SIGNED_IN — e.g. from SignInModal, or a password
  // reset via updatePassword) just proved identity, so it syncs right
  // away. A *restored* session — cold start, or a token refresh for a
  // session that was already sitting there — did not, so it's locked and
  // immediately asked for right here (attemptUnlock, below): Face ID/
  // fingerprint first, falling back to ReauthModal (password, or
  // "Continue with Google") on anything but success. Either path can be
  // skipped ("Not now" in ReauthModal, or just backgrounding the app) —
  // the rest of the app stays fully usable on local data regardless, and
  // "Unlock to sync" in CloudBackupSection re-asks later on demand.
  // Skipped during password recovery — that flow isn't a normal sign-in
  // yet, it resolves into one (re-running this effect) once the password
  // is set.
  useEffect(() => {
    if (!supabase || !session || recoveryMode) return undefined;
    if (syncedUserIdRef.current === session.user.id) return undefined;
    syncedUserIdRef.current = session.user.id;
    const cancelledRef = { current: false };

    if (justSignedInRef.current) {
      setSyncLocked(false);
      syncSession(session, cancelledRef);
    } else {
      setSyncLocked(true);
      attemptUnlock(session, cancelledRef);
    }

    return () => {
      cancelledRef.current = true;
    };
    // Only re-run when the session or recovery state changes — not on every
    // local edit, which is handled by the push effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, recoveryMode]);

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
  // in-memory state up, unconditionally, right now.
  const pushNow = async () => {
    setStatus("syncing");
    const { error: pushError } = await supabase
      .from("profiles")
      .update({
        first_name: profile.firstName,
        last_name: profile.lastName,
        username: profile.username,
        picture_url: profile.pictureUrl,
        birthday: toNullableDate(profile.birthday),
        gender: profile.gender,
        height: toNullableNumber(profile.height),
        weight: toNullableNumber(profile.weight),
        backup_data: { exercises: exercises.filter((e) => e.custom), routines, workouts, unit },
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);
    setStatus(pushError ? "error" : "synced");
    if (pushError) setError(friendlyAuthError(pushError));
    else setHasBackupData(true);
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
    const { error: clearError } = await supabase
      .from("profiles")
      .update({ backup_data: {}, updated_at: new Date().toISOString() })
      .eq("id", session.user.id);
    setStatus(clearError ? "error" : "synced");
    if (clearError) setError(friendlyAuthError(clearError));
    else setHasBackupData(false);
  };

  // Profile's "Danger zone" — permanently deletes the signed-in account:
  // the delete-account Edge Function verifies the caller's own session and
  // then uses the service_role key (which the client never has) to delete
  // the auth.users row, which cascades to the profiles row too (see
  // supabase/schema.sql) — so nothing about this account is left on the
  // server. Signs out immediately on success, matching "logs them out
  // instantly"; on failure, leaves the (still-valid) session alone and
  // surfaces the error rather than signing out of an account that wasn't
  // actually deleted. Local on-device data is untouched, same as signOut.
  const deleteAccount = async () => {
    if (!supabase || !session) return;
    setStatus("syncing");
    const { error: fnError } = await supabase.functions.invoke("delete-account");
    if (fnError) {
      const message = friendlyAuthError(fnError);
      setStatus("error");
      setError(message);
      Alert.alert("Couldn't delete account", message);
      return;
    }
    await signOut();
  };

  // Debounced auto-push on every local change, while signed in. Skipped
  // while syncLocked — a restored session that hasn't cleared the re-auth
  // gate yet shouldn't leak local edits to the cloud — and while
  // !profile.premium, since cloud sync is a premium entitlement (see
  // syncSession). syncLocked is listed as a dep (unlike the others below)
  // specifically so unlocking itself re-evaluates this effect and schedules
  // a push for anything that changed locally while it was locked.
  useEffect(() => {
    if (!supabase || !session || recoveryMode || isApplyingRemoteRef.current || syncLocked || !profile.premium) return undefined;

    if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
    pushTimeoutRef.current = setTimeout(pushNow, DEBOUNCE_MS);

    return () => clearTimeout(pushTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile, exercises, routines, workouts, unit, syncLocked]);

  // Manual "Sync now" — skips the debounce and pushes immediately, so a
  // user who wants confidence their latest change is backed up doesn't have
  // to wait out DEBOUNCE_MS or make another edit to re-arm it.
  const syncNow = async () => {
    if (!supabase || !session || syncLocked || !profile.premium) return;
    if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
    await pushNow();
  };

  const signIn = async (email, password) => {
    if (!supabase) return;
    setStatus("authenticating");
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(friendlyAuthError(signInError));
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
      setError(friendlyAuthError(signUpError));
      setStatus("error");
    } else if (!data.session) {
      // Email confirmation is required before the account can sign in.
      setStatus("confirm-email");
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
        setError(friendlyAuthError(oauthError));
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
      setError(friendlyAuthError(oauthError || { message: "Couldn't start Google sign-in." }));
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
      setError("Google sign-in didn't return a valid code.");
      setStatus("error");
      return;
    }
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(queryParams.code);
    if (exchangeError) {
      setError(friendlyAuthError(exchangeError));
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
      setError(friendlyAuthError(resetError));
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
      setError(friendlyAuthError(updateError));
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
      setReauthError(friendlyAuthError(signInError));
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
  };
}
