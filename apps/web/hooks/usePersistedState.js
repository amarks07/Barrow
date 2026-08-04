"use client";

import { useEffect, useState } from "react";

// Local persistence: the app has no backend, so state round-trips through
// the browser's own storage. Loading happens in an effect (not a lazy
// initializer) so the first render matches the server-rendered default and
// avoids a hydration mismatch; `hydrated` then guards the save effect so it
// doesn't immediately overwrite real saved data with that default.
export function usePersistedState(key, initialValue, { serialize = JSON.stringify, deserialize = JSON.parse } = {}) {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) setValue(deserialize(saved));
    } catch (e) {
      console.error(`Barrow: failed to load ${key}`, e);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, serialize(value));
    } catch (e) {
      console.error(`Barrow: failed to save ${key}`, e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value, hydrated]);

  return [value, setValue, hydrated];
}
