import { useEffect, useState } from "react";

const SAVE_DEBOUNCE_MS = 400;

// Local persistence: the app has no backend, so state round-trips through
// a platform-supplied storage adapter ({getItem, setItem}, both possibly
// async — AsyncStorage on mobile, localStorage wrapped in a resolved Promise
// on web). Loading happens in an effect (not a lazy initializer) so the
// first render matches `initialValue` and avoids a hydration mismatch;
// `hydrated` then guards the save effect so it doesn't immediately overwrite
// real saved data with that default before the load has resolved.
export function usePersistedState(
  key,
  initialValue,
  { serialize = JSON.stringify, deserialize = JSON.parse, storage, legacyKey } = {}
) {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let saved = await storage.getItem(key);
        // One-time carry-forward from a renamed key: if nothing's under the
        // new key yet but the old key still has data, adopt it and copy it
        // to the new key. The old key is left in place (unused, harmless)
        // rather than deleted, so there's no risk of losing data on write
        // failure.
        if ((saved === null || saved === undefined) && legacyKey) {
          const legacy = await storage.getItem(legacyKey);
          if (legacy !== null && legacy !== undefined) {
            saved = legacy;
            storage.setItem(key, legacy).catch((e) => console.error(`Barrow: failed to migrate ${legacyKey} to ${key}`, e));
          }
        }
        if (!cancelled && saved !== null && saved !== undefined) setValue(deserialize(saved));
      } catch (e) {
        console.error(`Barrow: failed to load ${key}`, e);
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Debounced so rapid-fire updates (typing a weight, repeatedly tapping a
  // +1 rep stepper) coalesce into one disk write instead of one per change.
  // AsyncStorage is async/disk-backed, unlike the synchronous in-memory
  // localStorage this hook originally targeted on web, so writing the
  // entire value on every keystroke is noticeably more expensive here —
  // this was very likely the single biggest contributor to felt input lag.
  useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      storage.setItem(key, serialize(value)).catch((e) => {
        console.error(`Barrow: failed to save ${key}`, e);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value, hydrated]);

  return [value, setValue, hydrated];
}
