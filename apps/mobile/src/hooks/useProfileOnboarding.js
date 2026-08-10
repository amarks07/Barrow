import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ASKED_KEY = "barrow:profileOnboardingAsked";

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
// on cold start). Only checks once per app session — "Skip" leaves the
// asked-flag unset (so it's checked again next launch), "Don't ask again"
// persists it via markAsked.
export function useProfileOnboarding(profile, profileHydrated) {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!profileHydrated || checked) return;
    (async () => {
      let asked = false;
      try {
        asked = (await AsyncStorage.getItem(ASKED_KEY)) === "true";
      } catch (e) {
        console.error("Barrow: failed to read " + ASKED_KEY, e);
      }
      if (!asked && getMissingProfileFields(profile).length > 0) setVisible(true);
      setChecked(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileHydrated, checked]);

  const dismiss = () => setVisible(false);

  const persistAsked = async () => {
    try {
      await AsyncStorage.setItem(ASKED_KEY, "true");
    } catch (e) {
      console.error("Barrow: failed to write " + ASKED_KEY, e);
    }
  };

  return { visible, dismiss, persistAsked };
}
