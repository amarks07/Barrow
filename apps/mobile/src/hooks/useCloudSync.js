import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase-client";

const DEBOUNCE_MS = 1500;

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

// RN has no blocking window.confirm — Alert.alert is callback-based, so the
// web app's `if (window.confirm(...))` branch becomes an awaited Promise.
function confirmRestore() {
  return new Promise((resolve) => {
    Alert.alert(
      "Restore cloud backup?",
      "This account already has a cloud backup. Restore it now? This replaces the workouts/exercises/templates currently on this device.",
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Restore", style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

// Optional cloud backup: sign in with email + password, then every local
// change to profile/exercises/templates/workouts/unit is auto-pushed
// (debounced) to that user's `profiles` row. Signing in on a device with
// existing local data pulls the cloud copy down and REPLACES local state
// (last-write-wins, single active session — no real multi-device conflict
// resolution), so the caller confirms with the user first when there's
// local data at stake.
export function useCloudSync({ profile, setProfile, exercises, setExercises, templates, setTemplates, workouts, setWorkouts, unit, setUnit }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | authenticating | confirm-email | reset-email-sent | syncing | synced | error
  const [error, setError] = useState(null);
  // Supabase sets a temporary session and fires PASSWORD_RECOVERY when
  // someone lands back on the app from a "reset your password" email deep
  // link. While true, the UI shows a "set a new password" prompt instead of
  // treating them as a normal signed-in session.
  const [recoveryMode, setRecoveryMode] = useState(false);
  const isApplyingRemoteRef = useRef(false);
  const pushTimeoutRef = useRef(null);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
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

  // Pull the cloud backup down on sign-in. A brand-new profile (empty
  // backup_data) instead adopts whatever's already on this device. Skipped
  // during password recovery — that flow isn't a normal sign-in yet, it
  // resolves into one (re-running this effect) once the password is set.
  useEffect(() => {
    if (!supabase || !session || recoveryMode) return undefined;
    let cancelled = false;

    (async () => {
      setStatus("syncing");
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("first_name, last_name, username, picture_url, backup_data")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;
      if (fetchError) {
        setError(friendlyAuthError(fetchError));
        setStatus("error");
        return;
      }

      const cloudHasData = data.backup_data && Object.keys(data.backup_data).length > 0;
      const localHasData = Object.keys(workouts).length > 0;
      const shouldRestore = cloudHasData && (!localHasData || (await confirmRestore()));

      if (shouldRestore) {
        isApplyingRemoteRef.current = true;
        setProfile((p) => ({
          ...p,
          firstName: data.first_name,
          lastName: data.last_name,
          username: data.username,
          pictureUrl: data.picture_url,
          email: session.user.email,
        }));
        if (data.backup_data.exercises) setExercises(data.backup_data.exercises);
        if (data.backup_data.templates) setTemplates(data.backup_data.templates);
        if (data.backup_data.workouts) setWorkouts(data.backup_data.workouts);
        if (data.backup_data.unit) setUnit(data.backup_data.unit);
        isApplyingRemoteRef.current = false;
      } else {
        // Seed the cloud row from local state on this device.
        await supabase
          .from("profiles")
          .update({
            first_name: profile.firstName,
            last_name: profile.lastName,
            username: profile.username,
            picture_url: profile.pictureUrl,
            backup_data: { exercises, templates, workouts, unit },
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.user.id);
      }

      setStatus("synced");
    })();

    return () => {
      cancelled = true;
    };
    // Only re-run when the session or recovery state changes — not on every
    // local edit, which is handled by the push effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, recoveryMode]);

  // Debounced auto-push on every local change, while signed in.
  useEffect(() => {
    if (!supabase || !session || recoveryMode || isApplyingRemoteRef.current) return undefined;

    if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
    pushTimeoutRef.current = setTimeout(async () => {
      setStatus("syncing");
      const { error: pushError } = await supabase
        .from("profiles")
        .update({
          first_name: profile.firstName,
          last_name: profile.lastName,
          username: profile.username,
          picture_url: profile.pictureUrl,
          backup_data: { exercises, templates, workouts, unit },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);
      setStatus(pushError ? "error" : "synced");
      if (pushError) setError(friendlyAuthError(pushError));
    }, DEBOUNCE_MS);

    return () => clearTimeout(pushTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile, exercises, templates, workouts, unit]);

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
  // to a normal signed-in session (the pull-on-sign-in effect then runs).
  const updatePassword = async (password) => {
    if (!supabase) return;
    setStatus("authenticating");
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(friendlyAuthError(updateError));
      setStatus("error");
    } else {
      setRecoveryMode(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setStatus("idle");
  };

  return {
    available: !!supabase,
    session,
    recoveryMode,
    status,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };
}
