const SHARE_LINK_SCHEME = "barrow://";

// Wraps a QR share payload (buildFriendShare/buildRoutineShare) in a
// "barrow://<path>?data=..." deep link — same literal scheme prefix as
// FocusWidget's buildFocusDeepLink — so a phone's native camera app
// recognizes the code as a link and offers to open Barrow with it, not just
// a scanner built into the app itself.
export function buildShareLink(path, payload) {
  return `${SHARE_LINK_SCHEME}${path}?data=${encodeURIComponent(JSON.stringify(payload))}`;
}

// Unwraps a share link back to its JSON payload string. Anything that isn't
// one of these links (a plain JSON string already, e.g. from a shared file
// or an old-format QR code) passes through unchanged, so parseFriendShare/
// parseRoutineShare can JSON.parse either shape without knowing which one
// they got.
export function unwrapShareLink(raw) {
  if (typeof raw !== "string" || !raw.startsWith(SHARE_LINK_SCHEME)) return raw;
  const query = raw.slice(raw.indexOf("?") + 1);
  return new URLSearchParams(query).get("data") ?? raw;
}
