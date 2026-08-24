import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ASKED_KEY = "barrow:profileOnboardingAsked";
// Same delay/reasoning as useCloudSync's BIOMETRIC_PROMPT_DELAY_MS: checking
// immediately on profileHydrated caught a cold-start restored session before
// syncSession had pulled the account's real birthday/gender/height/weight
// down from the cloud, so a device with a bare/incomplete local cache popped
// this up even though the signed-in account's profile was actually complete.
const PROMPT_DELAY_MS = 10000;

// Order they're cycled through when the user taps "Continue" — birthday
// first since HeightPicker/BirthdayPicker both silently commit a fallback
// value on mount (see their own comments), so putting the picked-vs-default
// distinction least importance last (weight) keeps the earliest steps the
// ones most worth a deliberate answer.
export const PROFILE_ONBOARDING_FIELDS = ["birthday", "gender", "height", "weight"];

export function getMissingProfileFields(profile) {
  return PROFILE_ONBOARDING_FIELDS.filter((field) => !profile[field]);
}

// Gates the one-time "complete your profile" prompt shown on app open (see
// ProfileOnboardingModal). Waits on `profileHydrated` so it never flashes
// for an existing user whose real profile hasn't loaded from AsyncStorage
// yet (usePersistedState's `profile` briefly equals the all-empty default
// on cold start) — and, via the two delayed checks below, gives a
// signed-in session time to actually finish pulling the account's cloud
// profile down before deciding anything is missing. Only shows once per
// app session — "Skip" leaves the asked-flag unset (so it's checked again
// next launch), "Don't ask again" persists it via markAsked.
export function useProfileOnboarding(profile, profileHydrated, cloudSync) {
  const [visible, setVisible] = useState(false);
  // Latches true once shown-and-dismissed or found not-applicable this
  // session, so the second delayed check (below) doesn't re-open something
  // the user just skipped, or re-run a check that already ran and found
  // nothing missing.
  const settledRef = useRef(false);

  // Reassigned every render (see useCloudSync's identical maybeShowBiometric-
  // PromptRef for why) so the two timers below always read the latest
  // profile/profileHydrated/cloudSync.status instead of whatever they were
  // back when the timer was scheduled.
  const maybeShowRef = useRef(() => {});
  maybeShowRef.current = async () => {
    if (!profileHydrated || settledRef.current || cloudSync?.status === "authenticating") return;
    let asked = false;
    try {
      asked = (await AsyncStorage.getItem(ASKED_KEY)) === "true";
    } catch (e) {
      console.error("Barrow: failed to read " + ASKED_KEY, e);
    }
    if (asked) {
      settledRef.current = true;
      return;
    }
    if (getMissingProfileFields(profile).length > 0) {
      setVisible(true);
      settledRef.current = true;
    }
  };

  // "10 seconds after the app starts" — the other trigger (10s after a
  // fresh sign-in) is the session-watching effect right below.
  useEffect(() => {
    const t = setTimeout(() => maybeShowRef.current(), PROMPT_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Re-checks 10s after `cloudSync.session` goes from signed-out to
  // signed-in — covers signing in mid-session (well after the app-start
  // timer already ran and found nothing to show, e.g. because no one was
  // signed in yet) once that account's real profile has had time to sync
  // down.
  const hadSessionRef = useRef(!!cloudSync?.session);
  useEffect(() => {
    const justGotSession = !hadSessionRef.current && !!cloudSync?.session;
    hadSessionRef.current = !!cloudSync?.session;
    if (!justGotSession) return undefined;
    const t = setTimeout(() => maybeShowRef.current(), PROMPT_DELAY_MS);
    return () => clearTimeout(t);
  }, [cloudSync?.session]);

  const dismiss = () => {
    setVisible(false);
    settledRef.current = true;
  };

  const persistAsked = async () => {
    try {
      await AsyncStorage.setItem(ASKED_KEY, "true");
    } catch (e) {
      console.error("Barrow: failed to write " + ASKED_KEY, e);
    }
  };

  return { visible, dismiss, persistAsked };
}
