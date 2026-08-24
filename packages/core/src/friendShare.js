import { buildShareLink, unwrapShareLink } from "./shareLink";

export const FRIEND_SHARE_TYPE = "barrow-friend";
export const FRIEND_SHARE_VERSION = 1;

// Turns a Profile ID into the QR payload for the friends flow — same
// build/parse split as routineShare.js, just carrying a single id instead of
// a whole routine.
export function buildFriendShare(publicId) {
  return { t: FRIEND_SHARE_TYPE, v: FRIEND_SHARE_VERSION, id: publicId };
}

// What actually goes into the QR code: buildFriendShare's payload wrapped in
// a barrow:// deep link, so scanning it with the phone's own camera app (not
// just Barrow's in-app scanner) opens the app straight to adding this friend
// — see useShareDeepLink, the receiving end.
export function buildFriendShareLink(publicId) {
  return buildShareLink("friend", buildFriendShare(publicId));
}

// Parses+validates a scanned QR payload — either a bare JSON string (an
// older QR code) or a barrow://friend?data=... link (unwrapped first).
// Throws a message fit to show the user directly.
export function parseFriendShare(raw) {
  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(unwrapShareLink(raw)) : raw;
  } catch {
    throw new Error("That doesn't look like a Barrow friend code.");
  }
  if (!data || data.t !== FRIEND_SHARE_TYPE || typeof data.id !== "string" || !data.id) {
    throw new Error("That doesn't look like a Barrow friend code.");
  }
  return data;
}
