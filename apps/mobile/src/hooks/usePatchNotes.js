import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CURRENT_VERSION, CURRENT_PATCH_NOTES } from "../content/patchNotes";

const SEEN_VERSION_KEY = "barrow:patchNotesSeenVersion";

// Gates the "what's new" popup shown once per version bump (see
// PatchNotesModal). Compares CURRENT_VERSION against the last version the
// popup was dismissed for. A fresh install has nothing stored yet — treated
// as "no prior version to update from" and silently backfilled to
// CURRENT_VERSION so the popup only ever appears after an actual update,
// never on first launch. Dismissing persists CURRENT_VERSION so it won't
// show again until the next release bumps app.json's version and adds a
// matching entry to patchNotes.js.
export function usePatchNotes() {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;
    (async () => {
      let seenVersion = null;
      try {
        seenVersion = await AsyncStorage.getItem(SEEN_VERSION_KEY);
      } catch (e) {
        console.error("Barrow: failed to read " + SEEN_VERSION_KEY, e);
      }
      if (seenVersion === null) {
        try {
          await AsyncStorage.setItem(SEEN_VERSION_KEY, CURRENT_VERSION);
        } catch (e) {
          console.error("Barrow: failed to write " + SEEN_VERSION_KEY, e);
        }
      } else if (seenVersion !== CURRENT_VERSION && CURRENT_PATCH_NOTES) {
        setVisible(true);
      }
      setChecked(true);
    })();
  }, [checked]);

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(SEEN_VERSION_KEY, CURRENT_VERSION).catch((e) =>
      console.error("Barrow: failed to write " + SEEN_VERSION_KEY, e)
    );
  };

  return { visible, dismiss };
}
