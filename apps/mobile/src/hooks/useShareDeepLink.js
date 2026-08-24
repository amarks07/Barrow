import { useEffect } from "react";
import * as Linking from "expo-linking";
import { parseFriendShare, parseRoutineShare, logError } from "@barrow/core";

// Receiving end of the QR codes built by ShareFriendQRModal/ShareRoutineModal
// (buildFriendShareLink/buildRoutineShareLink) — those now encode a
// barrow://friend or barrow://routine deep link instead of bare JSON, so
// scanning one with the phone's own camera app (not just Barrow's in-app
// scanner) opens the app straight to it. Same cold-start + foreground
// pattern as useFocusWidgetDeepLink, just handed off to `onShare` instead of
// navigating directly — ScanFriendQRModal/ImportRoutineModal aren't
// navigator routes (they're local modal state deep inside Profile/Routines),
// so App.js renders them globally off `onShare`'s result instead, the same
// way ResetPasswordModal etc. already do for other deep-link-triggered UI.
// A malformed/corrupted link (or one from a future app version) is dropped
// silently — there's no in-app scanner UI here to show the error in.
function handleShareUrl(url, onShare) {
  if (!url) return;
  const { hostname } = Linking.parse(url);
  try {
    if (hostname === "friend") onShare({ type: "friend", data: parseFriendShare(url) });
    else if (hostname === "routine") onShare({ type: "routine", data: parseRoutineShare(url) });
  } catch (e) {
    logError("shareDeepLink.parse", e);
  }
}

export function useShareDeepLink(onShare) {
  useEffect(() => {
    Linking.getInitialURL().then((url) => handleShareUrl(url, onShare));
    const sub = Linking.addEventListener("url", ({ url }) => handleShareUrl(url, onShare));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
