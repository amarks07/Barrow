import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase-client";
import { CURRENT_VERSION } from "../content/patchNotes";

const DISMISSED_VERSION_KEY = "barrow:updateDismissedVersion";

// Drives UpdateAvailableModal. Compares the installed build's version
// (CURRENT_VERSION — kept in sync with app.json by the pre-commit hook, see
// scripts/sync-version-from-patch-notes.js) against `app_config.mobile_version`,
// written by the release pipeline right after each build ships (see
// .github/workflows/build-android-apk.yml). "Never show again" persists the
// *fetched* version rather than a blanket flag, so a later release still
// prompts — only nagging about the specific version already declined gets
// silenced.
export function useAppVersionCheck() {
  const [latestVersion, setLatestVersion] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("app_config").select("mobile_version").eq("id", true).maybeSingle();
      if (cancelled) return;
      if (error || !data?.mobile_version || data.mobile_version === CURRENT_VERSION) {
        if (error) console.error("Barrow: failed to load app_config", error);
        return;
      }
      let dismissedVersion = null;
      try {
        dismissedVersion = await AsyncStorage.getItem(DISMISSED_VERSION_KEY);
      } catch (e) {
        console.error("Barrow: failed to read " + DISMISSED_VERSION_KEY, e);
      }
      if (cancelled) return;
      if (dismissedVersion !== data.mobile_version) {
        setLatestVersion(data.mobile_version);
        setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => setVisible(false);

  const dismissForever = () => {
    setVisible(false);
    if (latestVersion) {
      AsyncStorage.setItem(DISMISSED_VERSION_KEY, latestVersion).catch((e) =>
        console.error("Barrow: failed to write " + DISMISSED_VERSION_KEY, e)
      );
    }
  };

  return { visible, latestVersion, dismiss, dismissForever };
}
