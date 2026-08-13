import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Brightness from "expo-brightness";

// Maxes out screen brightness for as long as the caller stays mounted with
// `enabled` true, restoring whatever brightness the device had beforehand
// once it unmounts or `enabled` goes false — a QR code is otherwise often
// hard for another phone's camera to read at a dim/auto brightness level.
// `enabled` (default true) lets a caller that only sometimes shows an
// actual QR code — e.g. ShareRoutineModal's "too big to scan" fallback —
// skip the boost without having to conditionally call this hook, which
// would break the rules of hooks. This sets the current app's own screen
// brightness (no special permission needed, unlike overriding the system-
// wide setting) so it only affects Barrow's own window and never leaks into
// other apps. Skipped on web, where expo-brightness has nothing to control.
// Failures (e.g. unsupported hardware) are swallowed — this is a
// nice-to-have, not worth surfacing an error for.
export function useMaxBrightness(enabled = true) {
  const previousRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === "web" || !enabled) return undefined;
    let cancelled = false;

    Brightness.getBrightnessAsync()
      .then((value) => {
        if (cancelled) return;
        previousRef.current = value;
        return Brightness.setBrightnessAsync(1);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (previousRef.current !== null) Brightness.setBrightnessAsync(previousRef.current).catch(() => {});
    };
  }, [enabled]);
}
